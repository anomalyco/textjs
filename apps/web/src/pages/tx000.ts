import { getTxError, type TxErrorDoc } from "@textjs/core";

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

export function getErrorPageDoc(code: string): ErrorPageDoc | undefined {
  return code === TX000.code ? TX000 : getTxError(code);
}
