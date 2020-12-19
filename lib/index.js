/**
 * dbagent - client for Influx
 */
const util = require('util');

const utils = require('./utils');

module.exports = function(channel, opt, logger) {
  let Influx;

  try {
    Influx = require('influx');
  } catch (err) {
    logger.log(err);
    processExit(0);
  }

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
    if (opt) Object.assign(options, opt);

    const databaseName = options.database;
    client = new Influx.InfluxDB(options);
    logger.log('Use database name: ' + databaseName);

    client.getDatabaseNames().then(names => {
      logger.log('ALL INFLUX Databases: ' + names.join(','));
      if (!names.includes(databaseName)) {
        logger.log('Create new database: ' + databaseName);
        return client.createDatabase(databaseName);
      }
    }).catch (err => {
      logger.log(err);
      processExit(1);
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
  } catch (e) {
    logger.log(e);
    processExit(1);
  }

  function processExit(code) {
    logger.stop();
    setTimeout(() => {
      channel.exit(code);
    }, 100);
  }

  function read(id, query) {
    logger.log('Get read query id=' + id + util.inspect(query));
    const dnarr = query.dn_prop.split(',');
    // Время и значения должны быть в одинарных скобках, имена полей в двойных!!

    const from = new Date(Number(query.start)).toISOString();
    const to = new Date(Number(query.end)).toISOString();

    const qStr1 = `select * from records 
    ${utils.formWhereQuery(dnarr, from, to)}
    order by time`;

    logger.log('Send: ' + qStr1);
    client
      .query(qStr1, { precision: 's' })
      .then(result => {
        logger.log('Get result ' + id + ' LEN=' + result.length);
        const payload = query.target == 'trend' ? formForTrend(result) : result;
        send({ id, query, payload });
      })
      .catch(err => {
        logger.log('ERROR ' + util.inspect(err));
        sendError(id, err);
      });

    function formForTrend(res) {
      return dnarr.length == 1 ? res.map(item => [item.time, item.val]) : utils.recordsForTrend(res, dnarr);
    }
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
      .catch(err => {
        logger.log(`Error saving data to InfluxDB! ${err.stack}`);
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
};

// curl -G 'http://localhost:8086/query?db=ihdb' --data-urlencode 'q=SELECT * FROM "records"'
