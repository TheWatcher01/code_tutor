/**
 * @file frontendLogger.ts
 * @description Custom logger with TypeScript support and environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Define a type for log arguments
type LogArgs = unknown[];

// Define environment check
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level: LogLevel, message: string) => 
  `[${getTimestamp()}] [${level.toUpperCase()}] ${message}`;

const shouldLog = (level: LogLevel): boolean => {
  if (isProduction) {
    return level !== 'debug';
  }
  return true;
};

interface Logger {
  debug(message: string, ...args: LogArgs): void;
  info(message: string, ...args: LogArgs): void;
  warn(message: string, ...args: LogArgs): void;
  error(message: string, ...args: LogArgs): void;
  group(name: string): void;
  groupEnd(): void;
}

const frontendLogger: Logger = {
  debug: (message: string, ...args: LogArgs) => {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message), ...args);
    }
  },
  info: (message: string, ...args: LogArgs) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },
  warn: (message: string, ...args: LogArgs) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },
  error: (message: string, ...args: LogArgs) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
      if (isDevelopment) {
        console.trace();
      }
    }
  },
  group: (name: string) => console.group(name),
  groupEnd: () => console.groupEnd()
};

export default frontendLogger;
