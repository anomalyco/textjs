type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  data?: any
}

declare global {
  interface Window {
    logs: Logger
  }
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs: number = 40 // Keep last 20 logs

  constructor() {
    // Override console methods to capture logs
    const originalConsole = { ...console }
    console.debug = (...args: any[]) => {
      originalConsole.debug(...args)
      this.debug(args.join(" "))
    }
    console.error = (...args: any[]) => {
      originalConsole.error(...args)
      this.error(args.join(" "))
    }
    console.warn = (...args: any[]) => {
      originalConsole.warn(...args)
      this.warn(args.join(" "))
    }
  }

  private add(level: LogLevel, message: string, data?: any) {
    this.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
    })

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  debug(message: string, data?: any) {
    this.add("debug", message, data)
  }

  info(message: string, data?: any) {
    this.add("info", message, data)
  }

  warn(message: string, data?: any) {
    this.add("warn", message, data)
  }

  error(message: string, data?: any) {
    this.add("error", message, data)
  }

  clear() {
    this.logs = []
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  // Format logs for display
  formatLogs(): string {
    if (this.logs.length === 0) return ""

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    }

    const levelColors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    }

    return (
      "\n\nLogs:\n" +
      this.logs
        .map((log) => {
          const color = levelColors[log.level]
          const time = formatTime(log.timestamp)
          const data = log.data ? "\n" + JSON.stringify(log.data, null, 2) : ""
          return `${color}[${time}] ${log.level.toUpperCase()}: ${log.message}${data}\x1b[0m`
        })
        .join("\n")
    )
  }
}

// Initialize logger
window.logs = new Logger()

// Export a convenience object for importing
export const logger = window.logs
