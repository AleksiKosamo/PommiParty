const levelMap: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configured = ((import.meta as any).env?.VITE_LOG_LEVEL || 'info').toLowerCase();
const threshold = levelMap[configured] ?? 1;

function should(l: keyof typeof levelMap) {
  return levelMap[l] >= threshold;
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
