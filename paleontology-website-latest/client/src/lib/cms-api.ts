/** 用户端 CMS 公开 API — 对接 paleontology-cms-backend */

export interface ApiCmsEntry {
  entryId?: number;
  moduleCode: string;
  columnCode?: string | null;
  scope?: string;
  title: string;
  category?: string | null;
  summary?: string | null;
  bodyContent?: string | null;
  coverUrl?: string | null;
  mediaUrl?: string | null;
  fileUrl?: string | null;
  linkUrl?: string | null;
  extraJson?: string | null;
  pinned?: string;
  sortOrder?: number;
  publishTime?: string | null;
  status?: string;
  memberOnly?: string;
}

export interface ApiCmsChannel {
  channelId?: number;
  channelCode: string;
  parentId?: number;
  routePath?: string;
  navName?: string;
  sortOrder?: number;
  visible?: string;
  title?: string;
  subtitle?: string;
  kicker?: string;
  layoutType?: string;
  contentModule?: string;
  pageType?: string;
  shellType?: string;
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = import.meta.env.VITE_CMS_API_BASE ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.code !== 200) throw new Error(json.msg || "请求失败");
  return json.data as T;
}

export async function listPublicCmsEntries(params: {
  moduleCode?: string;
  columnCode?: string;
  scope?: string;
}): Promise<ApiCmsEntry[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return get<ApiCmsEntry[]>(`/paleo/cms/public/list?${qs}`);
}

export async function listPublicChannels(): Promise<ApiCmsChannel[]> {
  return get<ApiCmsChannel[]>("/paleo/cms-channels/public/list");
}

export async function getPublicChannel(params: { routePath?: string; channelCode?: string }) {
  const qs = new URLSearchParams();
  if (params.routePath) qs.set("routePath", params.routePath);
  if (params.channelCode) qs.set("channelCode", params.channelCode);
  return get<{ channel: ApiCmsChannel; blocks: Array<{ blockType?: string; title?: string; bodyContent?: string }> }>(
    `/paleo/cms-channels/public/detail?${qs}`
  );
}

export function parseExtra<T>(json?: string | null, fallback?: T): T {
  if (!json) return fallback as T;
  try { return JSON.parse(json) as T; } catch { return fallback as T; }
}

export function isPinned(e: ApiCmsEntry): boolean {
  return e.pinned === "1";
}

export function formatDate(e: ApiCmsEntry): string {
  const t = e.publishTime ?? "";
  return t.split("T")[0] || t.split(" ")[0] || "";
}
