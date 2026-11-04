import { renderToStaticMarkup } from "react-dom/server";
import { ConsoleMirror } from "../../../src/dom/index";

console.log(renderToStaticMarkup(<ConsoleMirror frame={null} />));
