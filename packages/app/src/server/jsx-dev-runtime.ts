/** Development twin of `./jsx-runtime` (aliases `react/jsx-dev-runtime`). */

import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { resolveServerType } from "./server-components";

export { Fragment };

export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStatic, source, self) =>
  reactJsxDEV(resolveServerType(type), props, key, isStatic, source, self);
