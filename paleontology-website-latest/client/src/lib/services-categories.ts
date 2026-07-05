import type { ApiCmsChannel } from "@/lib/cms-api";

export type ServiceContentModule = "science" | "international" | "tech-rewards";

export interface ServiceCategory {
  channelCode: string;
  navName: string;
  subtitle?: string | null;
  contentModule: ServiceContentModule;
  websiteTabKey: string;
  sortOrder: number;
}

const MODULE_SET = new Set<string>(["science", "international", "tech-rewards"]);

function defaultWebsiteTabKey(module: ServiceContentModule): string {
  if (module === "tech-rewards") return "awards";
  return module;
}

export function parseServiceCategory(channel: ApiCmsChannel): ServiceCategory | null {
  const mod = channel.contentModule;
  if (!mod || !MODULE_SET.has(mod)) return null;

  let websiteTabKey = defaultWebsiteTabKey(mod as ServiceContentModule);
  if (channel.layoutParams) {
    try {
      const parsed = JSON.parse(channel.layoutParams) as { websiteTabKey?: string; servicesTab?: boolean };
      if (parsed.servicesTab === false) return null;
      if (parsed.websiteTabKey) websiteTabKey = parsed.websiteTabKey;
    } catch { /* ignore */ }
  }

  return {
    channelCode: channel.channelCode,
    navName: channel.navName ?? channel.title ?? channel.channelCode,
    subtitle: channel.subtitle,
    contentModule: mod as ServiceContentModule,
    websiteTabKey,
    sortOrder: channel.sortOrder ?? 0,
  };
}

export function extractServiceCategories(channels: ApiCmsChannel[]): ServiceCategory[] {
  const services = channels.find(c => c.channelCode === "services");
  if (!services?.channelId) return [];
  return channels
    .filter(c => c.parentId === services.channelId)
    .map(parseServiceCategory)
    .filter((c): c is ServiceCategory => c !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
