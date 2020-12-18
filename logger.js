/*
 *  logger.js
 */

const util = require('util');
const fs = require('fs');

module.exports = {
  fd: 0,
  start(logfileName) {
    // this.fd = fs.openSync(logfileName, 'a'); // добавляет
    this.fd = fs.openSync(logfileName, 'w'); // перезаписывает
  },

  stop() {
    if (this.fd) fs.closeSync(this.fd);
  },

  log(msg) {
    if (!this.fd) return;

    const str = typeof msg == 'object' ? getShortErrStr(msg) : msg;
    fs.write(this.fd, getDateStr() + ' ' + str + '\n', err => {
      if (err) console.log('Log error:' + util.inspect(err));
    });
  }
};

function getShortErrStr(e) {
  if (typeof e == 'object') return e.message ? getErrTail(e.message) : JSON.stringify(e);
  if (typeof e == 'string') return e.indexOf('\n') ? e.split('\n').shift() : e;
  return String(e);

  function getErrTail(str) {
    let idx = str.lastIndexOf('error:');
    return idx > 0 ? str.substr(idx + 6) : str;
  }
}

function getDateStr() {
  const dt = new Date();
  return (
    pad(dt.getDate()) +
    '.' +
    pad(dt.getMonth() + 1) +
    ' ' +
    pad(dt.getHours()) +
    ':' +
    pad(dt.getMinutes()) +
    ':' +
    pad(dt.getSeconds()) +
    '.' +
    pad(dt.getMilliseconds(), 3)
  );
}

function pad(str, len = 2) {
  return String(str).padStart(len, '0');
}
