// The subset of the Chrome extension API this extension uses.

declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: { id?: number; url?: string };
      frameId?: number;
      url?: string;
      id?: string;
    }
    interface Event<T extends (...args: any[]) => void> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
    }
    interface Port {
      readonly name: string;
      readonly sender?: MessageSender;
      postMessage(message: unknown): void;
      disconnect(): void;
      onMessage: Event<(message: unknown, port: Port) => void>;
      onDisconnect: Event<(port: Port) => void>;
    }
    const id: string;
    const lastError: { message?: string } | undefined;
    function connect(info?: { name?: string }): Port;
    function getURL(path: string): string;
    const onConnect: Event<(port: Port) => void>;
  }
  namespace devtools {
    namespace panels {
      interface ExtensionPanel {
        onShown: runtime.Event<(window: Window) => void>;
        onHidden: runtime.Event<() => void>;
      }
      const themeName: "default" | "dark";
      function create(title: string, iconPath: string, pagePath: string, callback?: (panel: ExtensionPanel) => void): void;
    }
    namespace inspectedWindow {
      const tabId: number;
      function eval(expression: string, callback?: (result: unknown, exception?: unknown) => void): void;
    }
    namespace network {
      const onNavigated: runtime.Event<(url: string) => void>;
    }
  }
}
