import { getTxError, TX_ERRORS, type TxErrorDoc } from "@textjs/core";
import { ERROR_TRANSLATIONS } from "./error-docs";
import { TX000, type ErrorPageDoc } from "./tx000";

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
