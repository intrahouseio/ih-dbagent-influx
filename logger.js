/*
 *  logger.js
 */

const util = require('util');
const fs = require('fs');

const utils = require('./lib/utils');

module.exports = {
  fd: 0,
  start(logfileName) {
    // this.fd = fs.openSync(logfileName, 'a'); // добавляет
    this.fd = fs.openSync(logfileName, 'w'); // перезаписывает
  },

  log(msg) {
    if (!this.fd) return;

    const str = typeof msg == 'object' ? 'ERROR: ' + utils.getShortErrStr(msg) : msg;
    fs.write(this.fd, utils.getDateStr() + ' ' + str + '\n', err => {
      if (err) console.log('Log error:' + str + util.inspect(err));
    });
  }
};

