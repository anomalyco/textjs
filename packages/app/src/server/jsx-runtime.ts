/**
 * Server-side `react/jsx-runtime` used for server-rendered console routes:
 * identical to React's, except `async function` components are wrapped by
 * {@link serverComponent} so they can suspend on the console reconciler.
 */

import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { resolveServerType } from "./server-components";

export { Fragment };

export const jsx: typeof reactJsx = (type, props, key) => reactJsx(resolveServerType(type), props, key);
export const jsxs: typeof reactJsxs = (type, props, key) => reactJsxs(resolveServerType(type), props, key);
