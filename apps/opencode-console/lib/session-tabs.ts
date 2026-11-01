/** Navigation among *open* sessions, never all sessions from the server.
 * Closing a tab is local: it does not archive/delete/interrupt the session. */
export class SessionTabs {
  private open: string[] = [];
  private closed: { id: string; index: number }[] = [];

  visit(id: string) {
    if (!this.open.includes(id)) this.open = [...this.open,id];
  }

  list(): readonly string[] { return this.open; }

  at(index: number) { return this.open[index]; }

  cycle(id: string | null, direction: 1 | -1) {
    if (!this.open.length) return undefined;
    const index = id === null ? -1 : this.open.indexOf(id);
    if (index < 0) return direction > 0 ? this.open[0] : this.open.at(-1);
    return this.open[(index + direction + this.open.length) % this.open.length];
  }

  close(id: string) {
    const index = this.open.indexOf(id);
    if (index < 0) return undefined;
    this.closed = [...this.closed.filter((v) => v.id !== id), { id, index }].slice(-25);
    this.open = this.open.filter((s) => s !== id);
    return this.open[index] ?? this.open[index - 1];
  }

  reopen() {
    while (this.closed.length) {
      const entry = this.closed.pop()!;
      if (this.open.includes(entry.id)) continue;
      this.open = [...this.open.slice(0,entry.index),entry.id,...this.open.slice(entry.index)];
      return entry.id;
    }
    return undefined;
  }

  clear() { this.open = []; this.closed = []; }
}
