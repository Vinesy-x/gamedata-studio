/* global Excel */

import { useState, useCallback, useRef } from 'react';
import { Config } from '../../types/config';
import { ConfigLoader } from '../../engine/ConfigLoader';
import { ErrorHandler } from '../../utils/ErrorHandler';

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadConfig = useCallback(async () => {
    // 首次加载才显示全屏 loading，后续刷新静默进行（避免组件卸载重置状态）
    if (!loadedRef.current) setLoading(true);
    setError(null);
    try {
      const errorHandler = new ErrorHandler();
      const loader = new ConfigLoader(errorHandler);
      const cfg = await loader.loadConfig();

      if (cfg) {
        setConfig(cfg);
        loadedRef.current = true;
      } else {
        const errors = errorHandler.getCriticalErrors();
        setError(errors.map(e => `[${e.code}] ${e.message}`).join('\n'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { config, loading, error, loadConfig };
}
