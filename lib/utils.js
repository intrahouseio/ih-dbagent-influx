/**
 *
 */
const util = require('util');

exports.recordsForTrend = recordsForTrend;
exports.formWhereQuery = formWhereQuery;

function recordsForTrend(records, dnarr) {
  // console.log('recordsForTrend start' );
  if (!dnarr || !dnarr.length || !records || !records.length) return [];

  // Свойства пока откинуть??
  const dArr = dnarr.map(item => item.split('.')[0]);
  // console.log('recordsForTrend dArr ='+util.inspect(dArr) );
  const rarr = [];
  const len = dArr.length;
  let last_ts;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    
    if (!rec || !rec.dn || !rec.time) continue;
    const dn_indx = dArr.findIndex(el=> el == rec.dn);
    if (dn_indx < 0) continue;

    let data;
    const ts = Date.parse(rec.time);
    // multiple series data combine
    if (ts != last_ts) {
      data = new Array(len + 1).fill(null);
      data[0] = ts;
      last_ts = ts;
    } else {
      data = rarr.pop();
    }
    data[1 + dn_indx] = Number(rec.val);
    rarr.push(data);
  }
  return rarr;
}


function formWhereQuery(dnarr, from, to) {
  let query = '';
  let first = true;

  if (dnarr && dnarr.length > 0) {
    if (dnarr.length == 1) {
      query += dnAndProp(dnarr[0]);
      first = false;
    } else {
      query += ' ( ';
      for (var i = 0; i < dnarr.length; i++) {
        if (dnarr[i]) {
          query += isFirst(' OR ') + ' (' + dnAndProp(dnarr[i]) + ')';
          // query += isFirst(' OR ') + " dn = '" + dnarr[i] + "'";
        }
      }
      query += ' ) ';
    }
  }

  if (from) {
    query += isFirst(' AND ') + " time > '" + from + "'";
  }

  if (to) {
    query += isFirst(' AND ') + " time < '" + to + "'";
  }

  return query ? ' WHERE ' + query : '';

  function isFirst(op) {
    return first ? ((first = false), '') : op;
  }

  function dnAndProp(dn_prop) {
    const splited = dn_prop.split('.');
    return " dn = '" + splited[0] + "' AND prop = '" + splited[1] + "' ";
  }
}