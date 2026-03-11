/* global Excel */

import { useState, useCallback } from 'react';
import { Config } from '../../types/config';
import { ConfigLoader } from '../../engine/ConfigLoader';
import { ErrorHandler } from '../../utils/ErrorHandler';

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const errorHandler = new ErrorHandler();
      const loader = new ConfigLoader(errorHandler);
      const cfg = await loader.loadConfig();

      if (cfg) {
        setConfig(cfg);
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
