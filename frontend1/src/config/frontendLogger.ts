// File path: code_tutor/frontend/src/config/frontendLogger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level: LogLevel, message: string) => 
  `[${getTimestamp()}] [${level.toUpperCase()}] ${message}`;

const shouldLog = (level: LogLevel): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return level !== 'debug';
  }
  return true;
};

const frontendLogger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message), ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
      if (process.env.NODE_ENV === 'development') {
        console.trace();
      }
    }
  },
  group: (name: string) => console.group(name),
  groupEnd: () => console.groupEnd()
};

export default frontendLogger;