/**
 * CMS REST API 客户端 — 对接 paleontology-cms-backend
 * API 契约与 PaleontologicalResearch /paleo/cms 对齐
 */

const CMS_TOKEN_KEY = "paleo_cms_token";

export interface ApiCmsEntry {
  entryId?: number;
  associationId?: number | null;
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
  fileExtension?: string | null;
  fileSize?: number | null;
  refCount?: number;
  memberOnly?: string;
  pinned?: string;
  sortOrder?: number;
  publishTime?: string | null;
  status?: string;
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
  layoutType?: string;
  contentModule?: string;
  pageType?: string;
  shellType?: string;
  status?: string;
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
  rows?: T[];
  total?: number;
}

function getToken(): string | null {
  return localStorage.getItem(CMS_TOKEN_KEY);
}

export function setCmsToken(token: string) {
  localStorage.setItem(CMS_TOKEN_KEY, token);
}

export function clearCmsToken() {
  localStorage.removeItem(CMS_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || (json.code && json.code !== 200)) {
    throw new Error(json.msg || `请求失败 ${res.status}`);
  }
  return json as T;
}

/** CMS 后端登录（admin / admin123） */
export async function cmsLogin(username: string, password: string): Promise<string> {
  const json = await request<ApiResponse<{ token: string }>>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const token = (json as ApiResponse<{ token: string }>).data?.token;
  if (!token) throw new Error("登录失败：未返回 token");
  setCmsToken(token);
  return token;
}

/** 确保已登录（开发环境自动 admin 登录） */
export async function ensureCmsAuth(): Promise<void> {
  if (getToken()) return;
  await cmsLogin("admin", "admin123");
}

/** 管理端：按模块拉取条目 */
export async function listCmsEntries(moduleCode?: string): Promise<ApiCmsEntry[]> {
  await ensureCmsAuth();
  const qs = new URLSearchParams({ pageNum: "1", pageSize: "500" });
  if (moduleCode) qs.set("moduleCode", moduleCode);
  const json = await request<ApiResponse & { rows?: ApiCmsEntry[] }>(`/paleo/cms/list?${qs}`);
  return json.rows ?? [];
}

/** 公开：按模块拉取已发布条目 */
export async function listPublicCmsEntries(params: {
  moduleCode?: string;
  columnCode?: string;
  scope?: string;
  category?: string;
}): Promise<ApiCmsEntry[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const json = await request<ApiResponse<ApiCmsEntry[]>>(`/paleo/cms/public/list?${qs}`);
  return (json as ApiResponse<ApiCmsEntry[]>).data ?? [];
}

/** 公开：单条详情 */
export async function getPublicCmsEntry(entryId: number): Promise<ApiCmsEntry> {
  const json = await request<ApiResponse<ApiCmsEntry>>(`/paleo/cms/public/${entryId}`);
  const data = (json as ApiResponse<ApiCmsEntry>).data;
  if (!data) throw new Error("内容不存在");
  return data;
}

/** 公开：栏目列表 */
export async function listPublicChannels(): Promise<ApiCmsChannel[]> {
  const json = await request<ApiResponse<ApiCmsChannel[]>>("/paleo/cms-channels/public/list");
  return (json as ApiResponse<ApiCmsChannel[]>).data ?? [];
}

/** 公开：栏目详情含区块 */
export async function getPublicChannel(params: { routePath?: string; channelCode?: string }) {
  const qs = new URLSearchParams();
  if (params.routePath) qs.set("routePath", params.routePath);
  if (params.channelCode) qs.set("channelCode", params.channelCode);
  const json = await request<ApiResponse<{ channel: ApiCmsChannel; blocks: unknown[] }>>(
    `/paleo/cms-channels/public/detail?${qs}`
  );
  return (json as ApiResponse<{ channel: ApiCmsChannel; blocks: unknown[] }>).data;
}

export async function upsertCmsEntry(entry: ApiCmsEntry): Promise<ApiCmsEntry> {
  await ensureCmsAuth();
  if (entry.entryId) {
    await request("/paleo/cms", { method: "PUT", body: JSON.stringify(entry) });
    return entry;
  }
  const token = getToken();
  const res = await fetch("/paleo/cms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(entry),
  });
  const json = (await res.json()) as ApiResponse<ApiCmsEntry>;
  if (!res.ok || json.code !== 200) throw new Error(json.msg || "保存失败");
  if (json.data?.entryId) entry.entryId = json.data.entryId;
  return entry;
}

export async function updateCmsEntryStatus(entryId: number, status: string): Promise<void> {
  await ensureCmsAuth();
  await request(`/paleo/cms/${entryId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function deleteCmsEntry(entryId: number): Promise<void> {
  await ensureCmsAuth();
  await request(`/paleo/cms/${entryId}/delete`, { method: "POST" });
}

export async function uploadCmsMedia(file: File, title?: string, category?: string): Promise<ApiCmsEntry> {
  await ensureCmsAuth();
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  if (category) form.append("category", category);
  const token = getToken();
  const res = await fetch("/paleo/cms/media/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json()) as ApiResponse<ApiCmsEntry>;
  if (!res.ok || json.code !== 200) throw new Error(json.msg || "上传失败");
  return json.data as ApiCmsEntry;
}

// ── 状态映射 ──────────────────────────────────────────────────────────────

export function toApiStatus(s: string): string {
  return s.toUpperCase();
}

export function fromApiStatus(s?: string): "draft" | "published" | "archived" {
  const lower = (s ?? "DRAFT").toLowerCase();
  if (lower === "published") return "published";
  if (lower === "archived") return "archived";
  return "draft";
}

export function parseExtra<T>(json?: string | null, fallback: T = {} as T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

export function toExtra(obj: unknown): string {
  return JSON.stringify(obj ?? {});
}

export function entryIdStr(entryId?: number | null): string {
  return entryId != null ? String(entryId) : "";
}

export function parseEntryId(id: string): number | null {
  if (/^\d+$/.test(id)) return parseInt(id, 10);
  return null;
}
