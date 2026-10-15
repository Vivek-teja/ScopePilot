/**
 * useAsync – generic hook for async data fetching.
 *
 * Returns { data, loading, error, reload }
 * Automatically re-runs when `fn` identity changes (use useCallback to control).
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFn = useCallback(fn, deps);

  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    memoFn()
      .then((data) => {
        if (mountedRef.current) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (mountedRef.current)
          setState({ data: null, loading: false, error: err.message ?? 'Unknown error' });
      });
  }, [memoFn]);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
  }, [run]);

  return { ...state, reload: run };
}
