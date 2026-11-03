import { useState, type ReactNode } from "react";
import { t } from "../i18n/t";
import { HighlightedCode } from "./highlight";
import { CheckIcon, CopyIcon } from "./icons";

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string): void => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return [copied, copy];
}

export function CopyButton({ text, className }: { text: string; className?: string }): ReactNode {
  const [copied, copy] = useCopy();
  return (
    <button type="button" className={`copy-btn ${className ?? ""}`} onClick={() => copy(text)} aria-label={copied ? t("Copied") : t("Copy code")} title={t("Copy")}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

export interface CodeBlockProps {
  code: string;
  language?: string;
  file?: string;
  lineNumbers?: boolean;
}

export function CodeBlock({ code, language, file, lineNumbers }: CodeBlockProps): ReactNode {
  return (
    <div className="codeblock" dir="ltr">
      {file ? (
        <div className="codeblock-head">
          <span>{file}</span>
          <span className="lang">{language}</span>
          <CopyButton text={code} />
        </div>
      ) : (
        <CopyButton text={code} className="floating" />
      )}
      <HighlightedCode code={code} language={language} lineNumbers={lineNumbers ?? false} />
    </div>
  );
}

export function CopyCommand({ command }: { command: string }): ReactNode {
  const [copied, copy] = useCopy();
  return (
    <button type="button" className="copy-cmd" dir="ltr" onClick={() => copy(command)} aria-label={`Copy ${command}`}>
      <span className="prompt">$</span>
      <span className="cmd">{command}</span>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
