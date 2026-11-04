import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// A local cloud rehearsal uses the same server-only environment as deployment.
// loadEnvFile avoids Next forwarding --env-file in NODE_OPTIONS to child processes.
const localConfig = new URL('../.env.production.local',import.meta.url);
if (existsSync(localConfig)) process.loadEnvFile(fileURLToPath(localConfig));
const cli = new URL('../node_modules/next/dist/bin/next',import.meta.url);
process.argv = [process.execPath,fileURLToPath(cli),...process.argv.slice(2)];
await import(cli.href);
