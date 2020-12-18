/**
 * dbagent.js
 * Точка входа при запуске дочернего процесса
 * Входной параметр - путь к файлу конфигурации или сама конфигурация как строка JSON
 * В данном случае ожидается JSON
 * 
 */

// const util = require('util');
const path = require('path');

const dbagent = require('./lib/index');
const logger = require('./logger');


// Извлечь имя log или писать в /var/log
let opt;
try {
  opt = JSON.parse(process.argv[2]);
} catch (e) {
  console.log('WARN: dbagent influx - NO argv!')
}

const logfile = opt && opt.logfile ? opt.logfile : path.join(__dirname,'ih_influx.log');

logger.start(logfile);
logger.log('Start dbagent influx');

dbagent(process, opt, logger);



