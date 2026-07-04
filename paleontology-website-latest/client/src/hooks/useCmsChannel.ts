import { useEffect, useState } from "react";
import { getPublicChannel, type ApiCmsChannel } from "@/lib/cms-api";

export function useCmsChannel(routePath: string) {
  const [channel, setChannel] = useState<ApiCmsChannel | null>(null);
  const [blocks, setBlocks] = useState<Array<{ blockType?: string; title?: string; bodyContent?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicChannel({ routePath })
      .then(data => {
        if (!cancelled) {
          setChannel(data.channel);
          setBlocks(data.blocks ?? []);
        }
      })
      .catch(() => { if (!cancelled) { setChannel(null); setBlocks([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [routePath]);

  return { channel, blocks, loading };
}
