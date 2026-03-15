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
      return {
        ok: !!data.ok,
        output: data.output || '',
        error: data.error,
        exitCode: data.exitCode,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, output: '', error: msg };
    }
  }

}
