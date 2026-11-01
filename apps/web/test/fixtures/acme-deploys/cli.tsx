import { renderToTerminal } from "@textjs/app/terminal";
import { Table } from "@textjs/app";
import { DEPLOYMENTS } from "./lib/deployments";

const columns = [{ key: "commit", header: "Commit" }, { key: "project", header: "Project", width: 10 }];
const app = await renderToTerminal(<Table columns={columns} rows={DEPLOYMENTS} autoFocus />);
await app.waitUntilExit();
