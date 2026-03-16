import { logger } from './Logger';

const BASES = ['https://localhost:9876', 'http://localhost:9876'];
const GITHUB_RAW = 'https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.py';

async function tryFetch(path: string, timeoutMs = 5000): Promise<Response | null> {
  for (const base of BASES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(`${base}${path}`, { signal: controller.signal }).finally(() => clearTimeout(timer));
      if (resp.ok || resp.status === 404) return resp;
    } catch { /* try next */ }
  }
  return null;
}

/**
 * 检测 file-server 是否需要更新（缺少 git-push 端点）。
 * 如果需要且 server-info 可用，自动下载新版并覆盖。
 * 返回是否需要用户手动更新。
 */
export async function checkFileServerUpdate(): Promise<{ needsManualUpdate: boolean; updated: boolean }> {
  try {
    // 1. 检测 git-push 端点是否存在
    const gitResp = await tryFetch('/api/git-push');
    if (!gitResp) return { needsManualUpdate: false, updated: false }; // file-server 不在线
    if (gitResp.status !== 404) return { needsManualUpdate: false, updated: false }; // 端点存在（400 = 参数缺失 = 端点可用）

    // 2. git-push 返回 404，说明是旧版。尝试 server-info 获取路径
    const infoResp = await tryFetch('/api/server-info');
    if (!infoResp || infoResp.status === 404) {
      // server-info 也没有，只能让用户手动更新
      logger.warn('file-server 版本过旧，需要手动更新');
      return { needsManualUpdate: true, updated: false };
    }

    // 3. 有 server-info，自动更新
    const info = await infoResp.json();
    const dataDir = info.dataDir;
    if (!dataDir) return { needsManualUpdate: true, updated: false };

    // 4. 从 GitHub 下载最新 file-server.py
    const scriptResp = await fetch(GITHUB_RAW);
    if (!scriptResp.ok) {
      logger.warn('无法从 GitHub 下载 file-server.py');
      return { needsManualUpdate: true, updated: false };
    }
    const scriptText = await scriptResp.text();
    const scriptB64 = btoa(unescape(encodeURIComponent(scriptText)));

    // 5. 通过 write-file API 写入
    for (const base of BASES) {
      try {
        const writeResp = await fetch(`${base}/api/write-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directory: dataDir, fileName: 'file-server.py', data: scriptB64 }),
        });
        if (writeResp.ok) {
          logger.info('file-server.py 已自动更新，需要重启生效');
          return { needsManualUpdate: false, updated: true };
        }
      } catch { /* try next */ }
    }

    return { needsManualUpdate: true, updated: false };
  } catch (err) {
    logger.warn('file-server 更新检测失败', err);
    return { needsManualUpdate: false, updated: false };
  }
}
