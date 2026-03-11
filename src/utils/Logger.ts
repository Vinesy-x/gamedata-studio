export class Logger {
  private enabled: boolean;
  private logs: string[] = [];

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }

  private timestamp(): string {
    return new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    const msg = `[${this.timestamp()}] INFO: ${message}`;
    this.logs.push(msg);
    console.log(msg, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    const msg = `[${this.timestamp()}] WARN: ${message}`;
    this.logs.push(msg);
    console.warn(msg, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    const msg = `[${this.timestamp()}] ERROR: ${message}`;
    this.logs.push(msg);
    console.error(msg, ...args);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
