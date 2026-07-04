import { useEffect, useState } from "react";
import { resolvePublicPage } from "@/lib/cms-api";
import type { CmsPageResolveData } from "@/lib/cms-types";

export function useCmsPageResolve(routePath: string) {
  const [data, setData] = useState<CmsPageResolveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    resolvePublicPage({ routePath })
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [routePath]);

  return { data, loading, error };
}
