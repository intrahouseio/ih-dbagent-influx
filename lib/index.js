/**
 * dbagent - client for Influx
 */
const util = require('util');

const Influx = require('influx');

const utils = require('./utils');

// let fd_log;

module.exports = function(channel, argv2) {
  let client;

  const options = {
    host: 'localhost',
    database: 'ihdb',
    schema: [
      {
        measurement: 'records',
        fields: {
          prop: Influx.FieldType.STRING,
          val: Influx.FieldType.FLOAT
        },
        tags: ['dn']
      }
    ]
  };

  try {
    if (argv2) {
      Object.assign(options, JSON.parse(argv2));
    }
    const databaseName = options.database;
    client = new Influx.InfluxDB(options);

    client.getDatabaseNames().then(names => {
      if (!names.includes(databaseName)) {
        return client.createDatabase(databaseName);
      }
    });

    channel.on('message', message => {
      const { id, type, query, payload } = message;

      switch (type) {
        case 'write':
          return write(id, payload);

        case 'read':
          return read(id, query);

        default:
      }
    });
  } catch (err) {
    console.log('Invalid dbagent options: ' + argv2+' Error: '+util.inspect(err));
    processExit(err);
  }

  function processExit(err) {
    if (err) sendError('', err);
    setTimeout(() => {
      channel.exit();
    }, 100);
  }

  function read(id, query) {
    const dnarr = query.dn_prop.split(',');
    // const splited = query.dn_prop.split('.');
    // where dn = ${Influx.escape.stringLit('DN002')} and time >= "${startNanoDate.toNanoISOString()}"
    // time > "${myNanoDate.toNanoISOString()}"
    // Время и значения должны быть в одинарных скобках, имена полей в двойных!!

    const from = new Date(Number(query.start)).toISOString();
    const to = new Date(Number(query.end)).toISOString();
    // const qStr = `select * from records 
    // where dn ='${splited[0]}' AND prop = '${splited[1]}' AND time > '${from}' AND time < '${to}'
    // order by time`;

    const qStr1 = `select * from records 
    ${utils.formWhereQuery(dnarr, from, to)}
    order by time`;

    // console.log('qStr=' + qStr);
    console.log('qSt1=' + qStr1);
    console.time('READ_' + from);
    client
      .query(qStr1, { precision: 's' })
      .then(result => {
        // console.log('FIRST RESULT' + util.inspect(result));
        console.log('FIRST RESULT LEN=' + result.length);
        console.timeEnd('READ_' + from);
        console.time('PROCESS_' + from);
        let res;
        if (dnarr.length == 1) {
          res = [];
          result.forEach(item => {
            // const ts = Date.parse(item.time);
            res.push([item.time, item.val]);
          });
        } else {
          res = utils.recordsForTrend(result, dnarr);
        }
        // console.log('SEC RESULT' + util.inspect(res));
        // sendParsedResult(id, query, res);
        console.timeEnd('PROCESS_' + from);
        send({ id, query, payload: res });
      })
      .catch(err => {
        console.log('ERROR ' + util.inspect(err));
        sendError(id, err);
      });
  }

  //   `SELECT mean("cpu") AS "CPU" FROM "serverstat" WHERE time >= now() - 1d AND "serverid" = '${server_id}' GROUP BY time(1m), "serverid" fill(0)`,

  function write(id, payload) {
    const arrToWrite = [];
    payload.forEach(item => {
      arrToWrite.push({
        measurement: 'records',
        tags: { dn: item.dn },
        fields: { val: Math.round(item.val), prop: item.prop },
        timestamp: item.ts
      });
    });

    client
      .writePoints(arrToWrite, { precision: 'ms' }) // "s" ??
      .then(() => {
        console.log('WRITE ' + util.inspect(arrToWrite));
      })
      .catch(err => {
        console.error(`Error saving data to InfluxDB! ${err.stack}`);
      });
  }

  function send(message) {
    // console.log('CHILD SEND ' + util.inspect(message));
    channel.send(message);
  }

  

  function sendError(id, err) {
    // console.log(`ERROR ${id} ${err || ''}`);
    // send({ id, error: utils.getShortErrStr(err) });
    send({ id, error: util.inspect(err) });
  }

  /*
  function sendLog(text) {
    send({ log: text });
  }
  
  function getDbwLogFile() {
    const name = 'dbw_' + utils.dateToISOString(new Date()) + '.log';
    return path.join(workingDir, name);
  }

  function writeLog(str) {
    fs.write(fd_log, '\n' + str, err => {
      if (err) sendLog('Error write log: ' + util.inspect(err));
    });
  }
  */
};

// curl -G 'http://localhost:8086/query?db=ihdb' --data-urlencode 'q=SELECT * FROM "records"'
