import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parsePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
}

/** Reads the env set by run.sh; https is on only when HTTPS_PORT, TLS_CERT and TLS_KEY are all set. */
export function loadConfig(env = process.env) {
  const pkg = JSON.parse(readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const currency = String(env.CURRENCY ?? '').trim().toUpperCase();

  return Object.freeze({
    version: pkg.version,
    port: parsePort(env.PORT) ?? 3400,
    host: env.HOST || '0.0.0.0',
    httpsPort: parsePort(env.HTTPS_PORT),
    tlsCert: env.TLS_CERT || null,
    tlsKey: env.TLS_KEY || null,
    stateFile: env.STATE_FILE || path.join(ROOT_DIR, 'data', 'workouts.json'),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'EUR',
    publicDir: path.join(ROOT_DIR, 'public'),
  });
}
