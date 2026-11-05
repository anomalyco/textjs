#!/usr/bin/env bun
/**
 * Prints every error page's doc as JSON (`sources.ts` runs it, so Vite's config needn't load `@textjs/core`). Codes in
 * `TX_ERRORS` carry their package; TX000, the site-only page, has none.
 */
import { TX_ERRORS } from "@textjs/core";
import { TX000 } from "../../src/pages/tx000";

const doc = ({ code, title, cause, fix }: typeof TX000) => ({ code, title, cause, fix });
process.stdout.write(JSON.stringify([doc(TX000), ...TX_ERRORS.map((e) => ({ ...doc(e), package: e.package }))]));
