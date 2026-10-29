/** The preview webview document (strict CSP, nonce-gated script). */

import { randomBytes } from "node:crypto";

/** 192 bits from the system CSPRNG, base64url (CSP-safe characters). */
export function createNonce(): string {
  return randomBytes(24).toString("base64url");
}

export interface WebviewHtmlOptions {
  cspSource: string;
  scriptUri: string;
  styleUri: string;
  nonce?: string;
}

export function previewHtml({ cspSource, scriptUri, styleUri, nonce = createNonce() }: WebviewHtmlOptions): string {
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource}`,
    `img-src ${cspSource} data:`,
    `script-src 'nonce-${nonce}'`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>▼ Text.js Preview</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
`;
}
