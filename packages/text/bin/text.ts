#!/usr/bin/env bun
// Imported by package name (not `../src/cli`) so the CLI and the app resolve
// the same `@textjs/next` modules.
import { main } from "@textjs/next/cli";

process.exitCode = await main(process.argv.slice(2));
