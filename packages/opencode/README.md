# ▼ @textjs/opencode

A local bridge that lets [textjs.org/opencode](https://textjs.org/opencode) talk to the [OpenCode](https://opencode.ai) server on your machine. It has no dependencies and runs on Node 22+ or Bun.

```bash
bunx @textjs/opencode proxy    # or: npx @textjs/opencode proxy
```

Leave it running, open [textjs.org/opencode](https://textjs.org/opencode), enter `http://127.0.0.1:4096` and press **Connect**. Allow local network access if Chrome asks. Stop the bridge with Ctrl+C.

Browsers block a public page from reading `http://127.0.0.1` unless the server answers CORS and Private Network Access preflights, and the OpenCode service also requires a password. The bridge adds the headers and the password, and forwards each request to OpenCode.

## Options

| Flag | Description |
| :-- | :-- |
| `-p, --port <port>` | Port to listen on (default `4096`) |
| `--target <url>` | OpenCode server URL. Skips discovery. |
| `--allow-origin <origin>` | Allow another browser origin, such as `https://example.com` or `http://localhost:*`. Repeatable. |
| `-v, --version` | Print the version |
| `-h, --help` | Show help |

Without `--target`, the bridge asks `opencode service status` for the managed service and reads its password with `opencode service get password`. It caches the result for 30 seconds and looks again when OpenCode answers `401` or can't be reached, so it follows a service that restarts with a new port or password.

For a foreground server, pass its URL. If the server already uses port 4096, run the bridge on another port and connect the page to that port:

```bash
bunx @textjs/opencode proxy --port 4097 --target http://127.0.0.1:4096
```

For a password-protected foreground server, export `OPENCODE_PASSWORD` in the bridge's shell. `OPENCODE_SERVER_URL` works in place of `--target`.

## Security

- **Loopback only.** The bridge listens on `127.0.0.1` and answers only requests whose `Host` is `localhost`, `127.0.0.1` or `[::1]`, which blocks DNS rebinding.
- **Origin allowlist.** Browser requests must come from `https://textjs.org`, `https://www.textjs.org`, Text.js preview deployments or `http://localhost`, `127.0.0.1` and `[::1]` on any port. Other origins get a `403`. Add your own with `--allow-origin`.
- **The password stays on your machine.** The bridge keeps it in memory and adds it to requests it forwards to OpenCode. It isn't logged, written to disk or sent to the browser.
- **Writes need a custom header.** Requests other than `GET`, `HEAD` and `OPTIONS` must send `x-opencode-client: 1`, a header HTML forms can't set. Request bodies are capped at 4 MB.
- **Passwords apply to loopback targets only.** `OPENCODE_PASSWORD` is never sent to a non-loopback `--target`, and `--target` rejects URLs that contain credentials, a path, a query or a hash ([TX021](https://textjs.org/errors/TX021)).

## Text.js projects

`@textjs/app` runs the same bridge as `text proxy`, with the same flags.

## Errors

| Code | Meaning |
| :-- | :-- |
| [TX021](https://textjs.org/errors/TX021) | `--target` isn't a bare HTTP(S) origin |
| [TX022](https://textjs.org/errors/TX022) | `--port` is the OpenCode server's own port |
| [TX023](https://textjs.org/errors/TX023) | A bridge is already running on that port |
| [TX024](https://textjs.org/errors/TX024) | Something else is using that port |
