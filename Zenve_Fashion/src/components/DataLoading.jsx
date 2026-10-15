import React, { createContext, useCallback, useContext, useLayoutEffect, useId, useState } from "react";
import "../styles/DataLoading.css";

const LoadingContext = createContext(null);
const LoadingStateContext = createContext(false);

export function useDataLoading(loading) {
  const update = useContext(LoadingContext);
  const id = useId();
  useLayoutEffect(() => {
    if (!update || !loading) return;
    update(id, true);
    return () => update(id, false);
  }, [id, loading, update]);
}

export function DataLoadingProvider({ children }) {
  const [pending, setPending] = useState(() => new Set());
  const update = useCallback((id, loading) => {
    setPending((previous) => {
      if (previous.has(id) === loading) return previous;
      const next = new Set(previous);
      if (loading) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const busy = pending.size > 0;
  return <LoadingContext.Provider value={update}>
    <LoadingStateContext.Provider value={busy}>{children}</LoadingStateContext.Provider>
  </LoadingContext.Provider>;
}

export function DataLoadingBody({ children }) {
  const busy = useContext(LoadingStateContext);
  return <div className="zenve-data-body" aria-busy={busy}>
    <div hidden={busy} style={busy ? { display: "none" } : undefined}>{children}</div>
    {busy && <div className="zenve-data-loading-stage"><div className="zenve-data-loading" role="status" aria-live="polite">
      <span className="zenve-data-loading-spinner" aria-hidden="true" />
      <span><strong>Loading your data</strong><small>Please wait a moment…</small></span>
      <span className="zenve-data-loading-track" aria-hidden="true" />
    </div></div>}
  </div>;
}
