import { useEffect, useState } from "react";
import { listPublicCmsEntries, type ApiCmsEntry } from "@/lib/cms-api";

export function useCmsEntries(params: {
  moduleCode: string;
  columnCode?: string;
  scope?: string;
}, deps: unknown[] = []) {
  const [items, setItems] = useState<ApiCmsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicCmsEntries(params)
      .then(data => { if (!cancelled) { setItems(data); setError(null); } })
      .catch(err => { if (!cancelled) { setItems([]); setError(String(err)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.moduleCode, params.columnCode, params.scope, ...deps]);

  return { items, loading, error };
}
