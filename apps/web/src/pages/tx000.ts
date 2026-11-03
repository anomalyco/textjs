import { getTxError, type TxErrorDoc } from "@textjs/core";
import { ERROR_TITLES } from "./error-titles";

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

/** An error page's title in this build's language, or `undefined` when there's no page for `code`. */
export function getErrorPageTitle(code: string): string | undefined {
  const doc = code === TX000.code ? TX000 : getTxError(code);
  return doc ? (ERROR_TITLES[doc.code] ?? doc.title) : undefined;
}
