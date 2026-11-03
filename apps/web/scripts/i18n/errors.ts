#!/usr/bin/env bun
/** Prints every error page's doc as JSON (`sources.ts` runs it, so Vite's config needn't load `@textjs/core`). */
import { TX_ERRORS } from "@textjs/core";
import { TX000 } from "../../src/pages/tx000";

process.stdout.write(JSON.stringify([TX000, ...TX_ERRORS].map(({ code, title, cause, fix }) => ({ code, title, cause, fix }))));
