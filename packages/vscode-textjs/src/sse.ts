/** Incremental `text/event-stream` parser. */

export interface SseEvent {
  event: string;
  data: string;
}

/** Largest pending (incomplete) event accepted before the stream is considered broken. */
export const MAX_SSE_BUFFER = 4 * 1024 * 1024;

export class SseParser {
  private buf = "";
  /** The previous chunk ended with `\r`: a leading `\n` in the next one completes that CRLF. */
  private cr = false;

  constructor(private readonly maxBuffer = MAX_SSE_BUFFER) {}

  /** Parse a chunk. Throws when an incomplete event grows past the buffer limit. */
  push(chunk: string): SseEvent[] {
    let text = chunk;
    if (this.cr && text.startsWith("\n")) text = text.slice(1);
    if (text.length > 0) this.cr = text.endsWith("\r");
    this.buf += text.replace(/\r\n?/g, "\n");
    const out: SseEvent[] = [];
    let i: number;
    while ((i = this.buf.indexOf("\n\n")) >= 0) {
      const block = this.buf.slice(0, i);
      this.buf = this.buf.slice(i + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line === "" || line.startsWith(":")) continue;
        const c = line.indexOf(":");
        const field = c < 0 ? line : line.slice(0, c);
        const value = c < 0 ? "" : line.slice(c + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
      }
      if (data.length > 0) out.push({ event, data: data.join("\n") });
    }
    if (this.buf.length > this.maxBuffer) {
      this.buf = "";
      throw new Error("event stream buffer overflow");
    }
    return out;
  }
}
