/**
 * An in-memory Terminal (API + a stand-in OpenAuth server that approves at once) for
 * running /terminal locally without touching terminal.shop:
 *
 *   bun scripts/terminal-mock.ts --port 8790
 *   bunx wrangler pages dev dist --port 8788 \
 *     --binding TERMINAL_API_URL=http://127.0.0.1:8790 --binding TERMINAL_AUTH_URL=http://127.0.0.1:8790/auth
 */

import { startMockTerminal } from "../../terminal-shop/test/mock-terminal";

const i = process.argv.indexOf("--port");
const port = i >= 0 ? Number(process.argv[i + 1]) : 0;
const api = startMockTerminal({ port });
console.log(api.url);
