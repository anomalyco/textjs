import { renderToTerminal } from "@textjs/next/terminal";
import { Table } from "@textjs/next";
import { DEPLOYMENTS } from "./lib/deployments";

const columns = [{ key: "commit", header: "Commit" }, { key: "project", header: "Project", width: 10 }];
const app = await renderToTerminal(<Table columns={columns} rows={DEPLOYMENTS} autoFocus />);
await app.waitUntilExit();
