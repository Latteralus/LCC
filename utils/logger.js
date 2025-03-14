/**
 * logger.js
 * Centralized logging utility for the application
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const util = require('util');

/**
 * Log levels with their priority values
 * @type {Object}
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4 // No logging
};

/**
 * Logger configuration
 * @type {Object}
 */
const DEFAULT_CONFIG = {
  console: {
    enabled: true,
    level: LOG_LEVELS.DEBUG,
    colors: true
  },
  file: {
    enabled: true,
    level: LOG_LEVELS.INFO,
    path: null, // Will be set when logger is initialized
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 3
  }
};

/**
 * @type {Object} - The current logger configuration
 */
let config = { ...DEFAULT_CONFIG };

/**
 * @type {string} - Current log file path
 */
let currentLogFile = null;

/**
 * @type {Object} - Console color codes
 */
const COLORS = {
  RESET: '\x1b[0m',
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  TIME: '\x1b[35m'   // Magenta
};

/**
 * Initializes the logger
 * @param {Object} customConfig - Custom configuration to override defaults
 */
function initialize(customConfig = {}) {
  // Merge custom config with default config
  config = {
    console: { ...DEFAULT_CONFIG.console, ...customConfig.console },
    file: { ...DEFAULT_CONFIG.file, ...customConfig.file }
  };

  // Set up log directory if file logging is enabled
  if (config.file.enabled) {
    const logDirectory = config.file.path || path.join(app.getPath('userData'), 'logs');
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    // Set current log file path
    currentLogFile = path.join(logDirectory, `app-${new Date().toISOString().split('T')[0]}.log`);
    
    // Rotate logs if necessary
    rotateLogFiles(logDirectory);
  }

  // Log initialization
  info('Logger', 'Logging system initialized');
}

/**
 * Rotates log files when they exceed the configured max size
 * @param {string} logDirectory - Directory containing log files
 */
function rotateLogFiles(logDirectory) {
  // Check if current log file exists and exceeds max size
  if (currentLogFile && fs.existsSync(currentLogFile)) {
    const stats = fs.statSync(currentLogFile);
    
    if (stats.size >= config.file.maxSize) {
      // Get all log files in the directory
      const logFiles = fs.readdirSync(logDirectory)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => path.join(logDirectory, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
      
      // Remove oldest logs if we have more than maxFiles
      if (logFiles.length >= config.file.maxFiles) {
        logFiles.slice(config.file.maxFiles - 1).forEach(file => {
          try {
            fs.unlinkSync(file);
          } catch (error) {
            console.error(`Failed to delete old log file: ${file}`, error);
          }
        });
      }
      
      // Create a new log file with timestamp
      currentLogFile = path.join(logDirectory, `app-${new Date().toISOString().split('T')[0]}-${Date.now()}.log`);
    }
  }
}

/**
 * Formats a log message
 * @param {string} level - Log level
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, module, message, data) {
  const timestamp = new Date().toISOString();
  let formatted = `[${timestamp}] [${level.padEnd(5)}] [${module}] ${message}`;
  
  if (data !== undefined) {
    if (typeof data === 'object') {
      formatted += '\n' + util.inspect(data, { depth: 4, colors: false });
    } else {
      formatted += ' ' + data;
    }
  }
  
  return formatted;
}

/**
 * Writes a message to the console
 * @param {string} level - Log level
 * @param {string} levelName - Name of the log level
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function writeToConsole(level, levelName, module, message, data) {
  if (!config.console.enabled || level < config.console.level) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  let consoleMethod = console.log;
  
  // Select appropriate console method
  switch (levelName) {
    case 'ERROR':
      consoleMethod = console.error;
      break;
    case 'WARN':
      consoleMethod = console.warn;
      break;
    case 'DEBUG':
      consoleMethod = console.debug;
      break;
  }
  
  if (config.console.colors) {
    const colorCode = COLORS[levelName] || COLORS.RESET;
    const timeColor = COLORS.TIME;
    const moduleStr = module ? `[${module}]` : '';
    
    consoleMethod(`${timeColor}[${timestamp}]${COLORS.RESET} ${colorCode}[${levelName}]${COLORS.RESET} ${moduleStr} ${message}`);
    
    if (data !== undefined) {
      consoleMethod(data);
    }
  } else {
    consoleMethod(formatLogMessage(levelName, module, message, data));
  }
}

/**
 * Writes a message to the log file
 * @param {string} level - Log level
 * @param {string} levelName - Name of the log level
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function writeToFile(level, levelName, module, message, data) {
  if (!config.file.enabled || level < config.file.level || !currentLogFile) {
    return;
  }
  
  try {
    const logMessage = formatLogMessage(levelName, module, message, data) + '\n';
    
    // Append to log file
    fs.appendFileSync(currentLogFile, logMessage, 'utf8');
    
    // Check if we need to rotate logs
    const stats = fs.statSync(currentLogFile);
    if (stats.size >= config.file.maxSize) {
      const logDirectory = path.dirname(currentLogFile);
      rotateLogFiles(logDirectory);
    }
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Logs a message at the specified level
 * @param {number} level - Log level
 * @param {string} levelName - Name of the log level
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function log(level, levelName, module, message, data) {
  writeToConsole(level, levelName, module, message, data);
  writeToFile(level, levelName, module, message, data);
}

/**
 * Logs a debug message
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function debug(module, message, data) {
  log(LOG_LEVELS.DEBUG, 'DEBUG', module, message, data);
}

/**
 * Logs an info message
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function info(module, message, data) {
  log(LOG_LEVELS.INFO, 'INFO', module, message, data);
}

/**
 * Logs a warning message
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {any} [data] - Additional data to log
 */
function warn(module, message, data) {
  log(LOG_LEVELS.WARN, 'WARN', module, message, data);
}

/**
 * Logs an error message
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {Error|any} [error] - Error object or additional data
 */
function error(module, message, error) {
  // If error is an Error object, format it specially
  let formattedError = error;
  
  if (error instanceof Error) {
    formattedError = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  
  log(LOG_LEVELS.ERROR, 'ERROR', module, message, formattedError);
}

/**
 * Creates a logger instance for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {Object} - Logger instance
 */
function createLogger(moduleName) {
  return {
    debug: (message, data) => debug(moduleName, message, data),
    info: (message, data) => info(moduleName, message, data),
    warn: (message, data) => warn(moduleName, message, data),
    error: (message, error) => error(moduleName, message, error)
  };
}

// Export the logger
module.exports = {
  initialize,
  debug,
  info,
  warn,
  error,
  createLogger,
  LOG_LEVELS
};