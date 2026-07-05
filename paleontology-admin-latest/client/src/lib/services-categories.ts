import type { ApiCmsChannel, ApiCmsChannelTreeNode } from "@/lib/cms-api";

export type ServiceContentModule = "science" | "international" | "tech-rewards";

export interface ServiceCategory {
  channelId?: number;
  channelCode: string;
  navName: string;
  subtitle?: string | null;
  contentModule: ServiceContentModule;
  websiteTabKey: string;
  sortOrder: number;
  status?: string;
}

export const SERVICE_CONTENT_MODULE_OPTIONS: { value: ServiceContentModule; label: string; defaultTabKey: string }[] = [
  { value: "science", label: "科学传播类", defaultTabKey: "science" },
  { value: "international", label: "国际交流类", defaultTabKey: "international" },
  { value: "tech-rewards", label: "科技奖励类", defaultTabKey: "awards" },
];

const MODULE_SET = new Set<string>(SERVICE_CONTENT_MODULE_OPTIONS.map(o => o.value));

export function defaultWebsiteTabKey(module: ServiceContentModule): string {
  return SERVICE_CONTENT_MODULE_OPTIONS.find(o => o.value === module)?.defaultTabKey ?? module;
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
    channelId: channel.channelId,
    channelCode: channel.channelCode,
    navName: channel.navName ?? channel.title ?? channel.channelCode,
    subtitle: channel.subtitle,
    contentModule: mod as ServiceContentModule,
    websiteTabKey,
    sortOrder: channel.sortOrder ?? 0,
    status: channel.status,
  };
}

export function findChannelNode(
  nodes: ApiCmsChannelTreeNode[],
  channelCode: string
): ApiCmsChannelTreeNode | null {
  for (const node of nodes) {
    if (node.channel.channelCode === channelCode) return node;
    if (node.children?.length) {
      const found = findChannelNode(node.children, channelCode);
      if (found) return found;
    }
  }
  return null;
}

export function extractServiceCategories(tree: ApiCmsChannelTreeNode[]): ServiceCategory[] {
  const servicesNode = findChannelNode(tree, "services");
  if (!servicesNode?.children?.length) return [];
  return servicesNode.children
    .map(n => parseServiceCategory(n.channel))
    .filter((c): c is ServiceCategory => c !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function categoryAllowedForBranch(cat: ServiceCategory): boolean {
  return cat.contentModule === "science";
}
