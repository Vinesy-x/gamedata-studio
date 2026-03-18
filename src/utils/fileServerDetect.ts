/**
 * 检测可用的 file-server 地址（尝试 https 和 http）
 * @returns base URL（如 'https://localhost:9876'）或 null
 */
export async function detectFileServer(timeoutMs = 3000): Promise<string | null> {
  const bases = ['https://localhost:9876', 'http://localhost:9876'];
  for (const base of bases) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const resp = await fetch(`${base}/api/read-file?directory=.&fileName=_probe`, { signal: ctrl.signal })
        .finally(() => clearTimeout(timer));
      if (resp.ok || resp.status === 404) return base;
    } catch { /* try next */ }
  }
  return null;
}
