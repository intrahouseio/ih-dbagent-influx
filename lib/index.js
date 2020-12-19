/**
 * dbagent - client for Influx
 */
const util = require('util');

const utils = require('./utils');

module.exports = async function(channel, opt, logger) {
  let Influx;
  try {
    Influx = require('influx');
  } catch (err) {
    processExit(0, err); // Не установлен npm модуль - больше не перезагружать
  }

  const options = getOptions(opt);
  const client = new Influx.InfluxDB(options);

  try {
    const databaseName = options.database;
    logger.log('Database: ' + databaseName);

    const names = await client.getDatabaseNames();
    if (!names.includes(databaseName)) {
      logger.log('Create new database: ' + databaseName);
      await client.createDatabase(databaseName);
    }

    channel.on('message', ({ id, type, query, payload }) => {
      if (type == 'write') return write(id, payload);
      if (type == 'read') return read(id, query);
    });
  } catch (err) {
    processExit(1, err);
  }

  async function write(id, payload) {
    const arrToWrite = payload.map(item => ({
      measurement: 'records',
      tags: { dn: item.dn },
      fields: { val: item.val, prop: item.prop },
      timestamp: item.ts
    }));

    try {
      await client.writePoints(arrToWrite, { precision: 'ms' });
    } catch (err) {
      sendError(id, err);
    }
  }

  async function read(id, queryObj) {
    logger.log('Get read query id=' + id + util.inspect(queryObj));
    const dnarr = queryObj.dn_prop.split(',');
    const queryStr = utils.getQueryStr(queryObj, dnarr);
    logger.log('Send: ' + queryStr);

    try {
      const result = await client.query(queryStr, { precision: 's' });

      logger.log('Get result ' + id + ' LEN=' + result.length);
      const payload = queryObj.target == 'trend' ? formForTrend(result) : result;
      send({ id, query: queryObj, payload });
    } catch (err) {
      sendError(id, err);
    }

    function formForTrend(res) {
      return dnarr.length == 1 ? res.map(item => [item.time, item.val]) : utils.recordsForTrend(res, dnarr);
    }
  }

  function send(message) {
    channel.send(message);
  }

  function sendError(id, err) {
    logger.log(err);
    send({ id, error: utils.getShortErrStr(err) });
  }

  function getOptions(argOpt) {
    const res = {
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
    return Object.assign(res, argOpt);
  }

  function processExit(code, err) {
    if (err) logger.log(err);

    setTimeout(() => {
      channel.exit(code);
    }, 500);
  }
};
