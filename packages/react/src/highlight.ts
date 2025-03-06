/**
 * A small, dependency-free syntax tokenizer for terminal code blocks.
 */

export type TokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "type"
  | "function"
  | "tag"
  | "attribute"
  | "punctuation"
  | "operator"
  | "constant"
  | "variable";

export interface Token {
  kind: TokenKind;
  text: string;
}

interface LanguageSpec {
  keywords: ReadonlySet<string>;
  constants: ReadonlySet<string>;
  lineComment: readonly string[];
  blockComment: readonly [string, string] | null;
  strings: readonly string[];
  jsx: boolean;
  /** `$VAR` variables (shell). */
  dollarVars: boolean;
  /** Treat Capitalized identifiers as types. */
  capitalTypes: boolean;
  builtinTypes: ReadonlySet<string>;
}

const set = (s: string): ReadonlySet<string> => new Set(s.split(/\s+/).filter(Boolean));

const JS_KEYWORDS =
  "as async await break case catch class const continue debugger default delete do else enum export extends finally for from function get if implements import in instanceof interface let new of package private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield keyof infer declare namespace module abstract override";
const JS_CONSTANTS = "true false null undefined NaN Infinity";
const TS_TYPES = "string number boolean any unknown never void object symbol bigint";

const LANGS: Record<string, LanguageSpec> = {
  ts: {
    keywords: set(JS_KEYWORDS),
    constants: set(JS_CONSTANTS),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"', "'", "`"],
    jsx: true,
    dollarVars: false,
    capitalTypes: true,
    builtinTypes: set(TS_TYPES),
  },
  json: {
    keywords: set(""),
    constants: set("true false null"),
    lineComment: [],
    blockComment: null,
    strings: ['"'],
    jsx: false,
    dollarVars: false,
    capitalTypes: false,
    builtinTypes: set(""),
  },
  bash: {
    keywords: set("if then else elif fi for while until do done case esac in function return export local readonly unset shift exit set source alias echo cd sudo"),
    constants: set("true false"),
    lineComment: ["#"],
    blockComment: null,
    strings: ['"', "'"],
    jsx: false,
    dollarVars: true,
    capitalTypes: false,
    builtinTypes: set("bun npm npx pnpm yarn git node opencode text"),
  },
  css: {
    keywords: set("@media @import @keyframes @font-face @supports @layer !important from to"),
    constants: set("none auto inherit initial unset"),
    lineComment: [],
    blockComment: ["/*", "*/"],
    strings: ['"', "'"],
    jsx: false,
    dollarVars: false,
    capitalTypes: false,
    builtinTypes: set(""),
  },
  python: {
    keywords: set(
      "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
    ),
    constants: set("True False None self"),
    lineComment: ["#"],
    blockComment: null,
    strings: ['"""', "'''", '"', "'"],
    jsx: false,
    dollarVars: false,
    capitalTypes: true,
    builtinTypes: set("int str float bool list dict set tuple bytes object"),
  },
  rust: {
    keywords: set(
      "as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while",
    ),
    constants: set("true false None Some Ok Err"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"'],
    jsx: false,
    dollarVars: false,
    capitalTypes: true,
    builtinTypes: set("i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box"),
  },
  go: {
    keywords: set(
      "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
    ),
    constants: set("true false nil iota"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"', "`", "'"],
    jsx: false,
    dollarVars: false,
    capitalTypes: true,
    builtinTypes: set("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any"),
  },
  markdown: {
    keywords: set(""),
    constants: set(""),
    lineComment: [],
    blockComment: null,
    strings: [],
    jsx: false,
    dollarVars: false,
    capitalTypes: false,
    builtinTypes: set(""),
  },
  plain: {
    keywords: set(""),
    constants: set(""),
    lineComment: [],
    blockComment: null,
    strings: [],
    jsx: false,
    dollarVars: false,
    capitalTypes: false,
    builtinTypes: set(""),
  },
};

const ALIASES: Record<string, string> = {
  ts: "ts",
  tsx: "ts",
  typescript: "ts",
  js: "ts",
  jsx: "ts",
  javascript: "ts",
  mjs: "ts",
  cjs: "ts",
  json: "json",
  jsonc: "json",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  css: "css",
  scss: "css",
  py: "python",
  python: "python",
  rs: "rust",
  rust: "rust",
  go: "go",
  golang: "go",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  text: "plain",
  txt: "plain",
  plain: "plain",
};

export function normalizeLanguage(language: string | undefined): string {
  if (!language) return "plain";
  return ALIASES[language.toLowerCase()] ?? "plain";
}

const IDENT_START = /[A-Za-z_$@]/;
const IDENT = /[A-Za-z0-9_$\-]/;
const PUNCT = "{}[]();,.:";
const OPERATORS = "+-*/%=<>!&|^~?";

/** Tokenize source into lines of tokens. Multi-line strings and comments are split per line. */
export function tokenize(code: string, language?: string): Token[][] {
  const langKey = normalizeLanguage(language);
  if (langKey === "markdown") return tokenizeMarkdown(code);
  const lang = LANGS[langKey] as LanguageSpec;
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string): void => {
    if (text.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === "plain") last.text += text;
    else tokens.push({ kind, text });
  };
  const n = code.length;
  let i = 0;
  let prevSignificant: Token | null = null;
  const identRe = langKey === "css" || langKey === "bash" ? IDENT : /[A-Za-z0-9_$]/;
  while (i < n) {
    const ch = code[i] as string;
    // Comments
    let matched = false;
    for (const lc of lang.lineComment) {
      if (code.startsWith(lc, i) && (lc !== "#" || i === 0 || /\s/.test(code[i - 1] as string))) {
        const end = code.indexOf("\n", i);
        const stop = end < 0 ? n : end;
        push("comment", code.slice(i, stop));
        i = stop;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (lang.blockComment && code.startsWith(lang.blockComment[0], i)) {
      const end = code.indexOf(lang.blockComment[1], i + lang.blockComment[0].length);
      const stop = end < 0 ? n : end + lang.blockComment[1].length;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }
    // Strings
    for (const q of lang.strings) {
      if (!code.startsWith(q, i)) continue;
      let k = i + q.length;
      while (k < n) {
        if (code[k] === "\\") {
          k += 2;
          continue;
        }
        if (code.startsWith(q, k)) {
          k += q.length;
          break;
        }
        if (q.length === 1 && q !== "`" && code[k] === "\n") break;
        k++;
      }
      const text = code.slice(i, Math.min(k, n));
      // JSON object keys read as attributes.
      const after = code.slice(k).match(/^\s*:/);
      push(langKey === "json" && after ? "attribute" : "string", text);
      i = Math.min(k, n);
      matched = true;
      break;
    }
    if (matched) {
      prevSignificant = tokens[tokens.length - 1] ?? null;
      continue;
    }
    // JSX tags: <Foo, </div, />
    if (lang.jsx && ch === "<") {
      const m = /^<\/?([A-Za-z][\w.-]*)/.exec(code.slice(i, i + 64));
      const prevText = prevSignificant?.text ?? "";
      const exprContext = prevSignificant === null || /[(,=:?&|{}[\];>]$|return$/.test(prevText) || prevSignificant.kind === "keyword";
      if (m && exprContext) {
        push("punctuation", m[0].startsWith("</") ? "</" : "<");
        push("tag", m[1] as string);
        i += m[0].length;
        prevSignificant = tokens[tokens.length - 1] ?? null;
        continue;
      }
    }
    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(code[i + 1] ?? ""))) {
      const m = /^(0x[0-9a-fA-F_]+|0b[01_]+|\d[\d_]*(\.\d+)?([eE][+-]?\d+)?n?|\.\d+)/.exec(code.slice(i, i + 64));
      const text = m ? m[0] : ch;
      push("number", text);
      i += text.length;
      prevSignificant = tokens[tokens.length - 1] ?? null;
      continue;
    }
    // Shell variables
    if (lang.dollarVars && ch === "$") {
      const m = /^\$(\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9@#?*!$-])/.exec(code.slice(i, i + 64));
      if (m) {
        push("variable", m[0]);
        i += m[0].length;
        continue;
      }
    }
    // Identifiers
    if (IDENT_START.test(ch)) {
      let k = i + 1;
      while (k < n && identRe.test(code[k] as string)) k++;
      const word = code.slice(i, k);
      let kind: TokenKind = "plain";
      const nextNonSpace = /^\s*(.)/.exec(code.slice(k, k + 32))?.[1];
      if (lang.keywords.has(word)) kind = "keyword";
      else if (lang.constants.has(word)) kind = "constant";
      else if (lang.builtinTypes.has(word)) kind = "type";
      else if (nextNonSpace === "(") kind = "function";
      else if (langKey === "css" && nextNonSpace === ":") kind = "attribute";
      else if (lang.jsx && nextNonSpace === "=" && code[k] === "=" && code[k + 1] !== "=" && prevSignificant?.kind === "tag") kind = "attribute";
      else if (lang.capitalTypes && /^[A-Z][A-Za-z0-9]*$/.test(word) && word.length > 1 && !/^[A-Z0-9_]+$/.test(word)) kind = "type";
      else if (/^[A-Z][A-Z0-9_]+$/.test(word)) kind = "constant";
      push(kind, word);
      i = k;
      prevSignificant = tokens[tokens.length - 1] ?? null;
      continue;
    }
    if (PUNCT.includes(ch)) {
      push("punctuation", ch);
      i++;
      prevSignificant = tokens[tokens.length - 1] ?? null;
      continue;
    }
    if (OPERATORS.includes(ch)) {
      let k = i + 1;
      while (k < n && OPERATORS.includes(code[k] as string) && k - i < 3) k++;
      const op = code.slice(i, k);
      push(op === "/>" || op === ">" ? "punctuation" : "operator", op);
      i = k;
      prevSignificant = tokens[tokens.length - 1] ?? null;
      continue;
    }
    push("plain", ch);
    if (!/\s/.test(ch)) prevSignificant = tokens[tokens.length - 1] ?? null;
    i++;
  }
  return splitLines(tokens);
}

function splitLines(tokens: readonly Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split("\n");
    for (let p = 0; p < parts.length; p++) {
      if (p > 0) lines.push([]);
      const text = parts[p] as string;
      if (text.length > 0) (lines[lines.length - 1] as Token[]).push({ kind: t.kind, text });
    }
  }
  return lines;
}

function tokenizeMarkdown(code: string): Token[][] {
  return code.split("\n").map((line) => {
    if (/^#{1,6}\s/.test(line)) return [{ kind: "keyword" as const, text: line }];
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
      const m = /^(\s*(?:[-*+]|\d+\.))(.*)$/.exec(line) as RegExpExecArray;
      return [
        { kind: "punctuation" as const, text: m[1] as string },
        { kind: "plain" as const, text: m[2] as string },
      ].filter((t) => t.text.length > 0);
    }
    if (/^\s*>/.test(line)) return [{ kind: "comment" as const, text: line }];
    if (/^```/.test(line)) return [{ kind: "string" as const, text: line }];
    const out: Token[] = [];
    const re = /(`[^`]*`|\*\*[^*]+\*\*|\[[^\]]*\]\([^)]*\))/g;
    let last = 0;
    for (let m = re.exec(line); m; m = re.exec(line)) {
      if (m.index > last) out.push({ kind: "plain", text: line.slice(last, m.index) });
      const t = m[0];
      out.push({ kind: t.startsWith("`") ? "string" : t.startsWith("[") ? "function" : "type", text: t });
      last = m.index + t.length;
    }
    if (last < line.length) out.push({ kind: "plain", text: line.slice(last) });
    return out;
  });
}
