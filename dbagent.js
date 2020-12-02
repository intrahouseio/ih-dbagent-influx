/**
 * dbagent.js
 * Точка входа при запуске дочернего процесса
 * Входной параметр - путь к файлу конфигурации или сама конфигурация как строка JSON
 * В данном случае ожидается JSON
 * 
 */
const dbagent = require('./lib/index');


dbagent(process, process.argv[2]);

