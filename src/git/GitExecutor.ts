import { logger } from '../utils/Logger';

export interface GitExecuteResult {
  ok: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

/**
 * 通过 file-server /api/git-push 端点执行 git 命令
 * 复用 ExportJob 的 fetchWithTimeout 模式
 */
export class GitExecutor {
  private fileServerBase: string;

  constructor(fileServerBase: string) {
    this.fileServerBase = fileServerBase;
  }

  /**
   * 执行 git 命令数组
   * @param directory 工作目录
   * @param commands git 命令数组（如 ['cd "/path"', 'git add "file"', 'git commit -m "msg"', 'git push']）
   */
  async execute(directory: string, commands: string[]): Promise<GitExecuteResult> {
    if (!commands.length) {
      return { ok: false, output: '', error: 'no commands' };
    }

    const script = commands.join(' && ');
    const scriptB64 = btoa(unescape(encodeURIComponent(script)));

    const url = `${this.fileServerBase}/api/git-push?directory=${encodeURIComponent(directory)}&script=${encodeURIComponent(scriptB64)}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      const resp = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));

      const data = await resp.json();
      if (data.ok) {
        logger.info(`Git push 成功: ${data.output || '(no output)'}`);
      } else {
        logger.error(`Git push 失败 (exit ${data.exitCode}): ${data.error || data.output}`);
      }
      return {
        ok: !!data.ok,
        output: data.output || '',
        error: data.error,
        exitCode: data.exitCode,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Git push 请求失败: ${msg}`);
      return { ok: false, output: '', error: msg };
    }
  }

  /**
   * 检测 file-server 是否可用
   */
  static async detect(): Promise<string | null> {
    const bases = ['https://localhost:9876', 'http://localhost:9876'];
    for (const base of bases) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(`${base}/api/read-file?directory=.&fileName=_probe`, {
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (resp.ok || resp.status === 404) {
          return base;
        }
      } catch { /* try next */ }
    }
    return null;
  }
}
