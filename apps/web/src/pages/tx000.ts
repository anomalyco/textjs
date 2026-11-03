import { getTxError, TX_ERRORS, type TxErrorDoc } from "@textjs/core";
import { ERROR_TRANSLATIONS } from "./error-docs";

export type ErrorPageDoc = Pick<TxErrorDoc, "package" | "kind" | "title" | "message" | "cause" | "fix"> & { code: string };

/** Site-only page, kept out of `TX_ERRORS`, the index, search and the sitemap. */
export const TX000: ErrorPageDoc = {
  code: "TX000",
  package: "@textjs/core",
  kind: "error",
  title: "Success",
  message: "Success.",
  cause: "No error occurred.",
  fix: "No action is needed.",
};

/** An error doc in this build's language (the runtime `message` stays English, as developers see it). */
function localize<T extends ErrorPageDoc>(doc: T): T {
  const text = ERROR_TRANSLATIONS[doc.code];
  return text ? { ...doc, ...text } : doc;
}

/** `TX_ERRORS` as the site shows them. */
export const ERROR_DOCS: readonly TxErrorDoc[] = TX_ERRORS.map(localize);

export function getErrorPageDoc(code: string): ErrorPageDoc | undefined {
  if (code === TX000.code) return localize(TX000);
  const doc = getTxError(code);
  return doc ? localize(doc) : undefined;
}
