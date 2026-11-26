import 'server-only';

// Minimal structured logger (design doc §18.2). One JSON line per event; never log request bodies or PII.
type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

function write(level: Level, msg: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, f?: Fields) => process.env.NODE_ENV !== 'production' && write('debug', msg, f),
  info: (msg: string, f?: Fields) => write('info', msg, f),
  warn: (msg: string, f?: Fields) => write('warn', msg, f),
  error: (msg: string, f?: Fields) => write('error', msg, f),
};
