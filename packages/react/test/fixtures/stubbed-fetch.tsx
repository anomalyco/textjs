// Run in a fresh process (Yoga not loaded yet) by testing.test.tsx: a test that stubs fetch before its first render.
import { Text } from "../../src/index";
import { render } from "../../src/testing";

globalThis.fetch = (async () => Response.json([])) as unknown as typeof fetch;
const app = await render(<Text>hello</Text>, { cols: 10, rows: 1 });
console.log(app.lastFrame());
await app.unmount();
