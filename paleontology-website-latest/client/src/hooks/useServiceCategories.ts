import { useMemo } from "react";
import { useCmsChannels } from "@/hooks/useCmsChannels";
import { extractServiceCategories, type ServiceCategory } from "@/lib/services-categories";

export function useServiceCategories(): { categories: ServiceCategory[]; loaded: boolean } {
  const { channels, loaded } = useCmsChannels();
  const categories = useMemo(() => extractServiceCategories(channels), [channels]);
  return { categories, loaded };
}
