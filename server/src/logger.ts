const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configured = (process.env.LOG_LEVEL || 'info').toLowerCase();
const threshold = LEVELS[configured] ?? 1;

function should(level: keyof typeof LEVELS) {
  return LEVELS[level] >= threshold;
}

export const logger = {
  debug: (...args: any[]) => {
    if (should('debug')) console.debug(...args);
  },
  info: (...args: any[]) => {
    if (should('info')) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (should('warn')) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (should('error')) console.error(...args);
  },
};

export default logger;
