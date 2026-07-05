/**
 * CMS REST API 客户端 — 对接 paleontology-cms-backend
 * API 契约与 PaleontologicalResearch /paleo/cms 对齐
 */

const CMS_TOKEN_KEY = "paleo_cms_token";
const CMS_LOGIN_EMAIL_KEY = "paleo_cms_login_email";
const CMS_LOGIN_PASSWORD_KEY = "paleo_cms_login_password";

export interface CmsLoginResult {
  token: string;
  role: string;
  branchCode?: string | null;
  branchId?: string | null;
  displayName?: string;
  email?: string;
}

export interface CmsUserInfo {
  username: string;
  displayName?: string;
  role: string;
  branchId?: string | null;
  branchCode?: string | null;
}

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
  routePath?: string | null;
  navName?: string;
  sortOrder?: number;
  visible?: string;
  showInAdmin?: string;
  adminSection?: string | null;
  navIcon?: string | null;
  adminRoles?: string | null;
  title?: string;
  subtitle?: string;
  kicker?: string;
  breadcrumbName?: string;
  layoutType?: string | null;
  layoutParams?: string | null;
  contentModule?: string | null;
  contentFilter?: string | null;
  pageType?: string;
  shellType?: string | null;
  status?: string;
  locked?: string;
  remark?: string | null;
}

export interface ApiCmsChannelTreeNode {
  channel: ApiCmsChannel;
  children?: ApiCmsChannelTreeNode[];
}

export interface ApiCmsLayout {
  layoutCode: string;
  layoutName: string;
  description?: string | null;
  schemaJson?: string | null;
  sortOrder?: number;
  status?: string;
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
  rows?: T[];
  total?: number;
}

export class CmsAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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

export function setCmsLoginCredentials(email: string, password: string) {
  localStorage.setItem(CMS_LOGIN_EMAIL_KEY, email);
  sessionStorage.setItem(CMS_LOGIN_PASSWORD_KEY, password);
}

export function clearCmsLoginCredentials() {
  localStorage.removeItem(CMS_LOGIN_EMAIL_KEY);
  sessionStorage.removeItem(CMS_LOGIN_PASSWORD_KEY);
}

function getStoredLoginCredentials(): { email: string; password: string } | null {
  const email = localStorage.getItem(CMS_LOGIN_EMAIL_KEY) || localStorage.getItem("paleo_admin_current_user");
  const password = sessionStorage.getItem(CMS_LOGIN_PASSWORD_KEY);
  if (email && password) {
    return { email, password };
  }
  return null;
}

export function handleCmsUnauthorized(): void {
  clearCmsToken();
  if (typeof window !== "undefined" && !window.location.hash.includes("/admin/login")) {
    window.location.hash = "#/admin/login";
  }
}

async function request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (res.status === 401 || json.code === 401) {
    clearCmsToken();
    if (retryOn401) {
      const creds = getStoredLoginCredentials();
      if (creds) {
        try {
          await cmsLogin(creds.email, creds.password);
          return request<T>(path, options, false);
        } catch {
          handleCmsUnauthorized();
        }
      } else {
        handleCmsUnauthorized();
      }
    }
    throw new CmsAuthError(json.msg || "未登录或 token 已过期", 401);
  }

  if (!res.ok || (json.code && json.code !== 200)) {
    throw new Error(json.msg || `请求失败 ${res.status}`);
  }
  return json as T;
}

/** CMS 后端登录（支持邮箱） */
export async function cmsLogin(emailOrUsername: string, password: string): Promise<CmsLoginResult> {
  const json = await request<ApiResponse<CmsLoginResult>>(
    "/login",
    {
      method: "POST",
      body: JSON.stringify({ email: emailOrUsername, username: emailOrUsername, password }),
    },
    false
  );
  const data = (json as ApiResponse<CmsLoginResult>).data;
  if (!data?.token) throw new Error("登录失败：未返回 token");
  setCmsToken(data.token);
  setCmsLoginCredentials(emailOrUsername, password);
  return data;
}

/** 获取当前 JWT 用户信息 */
export async function fetchCmsUserInfo(): Promise<CmsUserInfo> {
  const json = await request<ApiResponse<CmsUserInfo>>("/getInfo");
  const data = (json as ApiResponse<CmsUserInfo>).data;
  if (!data) throw new Error("无法获取用户信息");
  return data;
}

/** 确保已登录：复用有效 token，失效时用当前管理员邮箱重新登录 */
export async function ensureCmsAuth(): Promise<void> {
  if (getToken()) return;
  const creds = getStoredLoginCredentials();
  if (creds) {
    await cmsLogin(creds.email, creds.password);
    return;
  }
  throw new CmsAuthError("CMS 未登录，请先登录管理后台", 401);
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

/** 管理端：栏目列表 */
export async function listCmsChannels(): Promise<ApiCmsChannel[]> {
  await ensureCmsAuth();
  const json = await request<ApiResponse & { rows?: ApiCmsChannel[] }>(
    "/paleo/cms-channels/list?pageNum=1&pageSize=500"
  );
  return json.rows ?? [];
}

/** 管理端：栏目树 */
export async function listCmsChannelTree(): Promise<ApiCmsChannelTreeNode[]> {
  await ensureCmsAuth();
  const json = await request<ApiResponse<ApiCmsChannelTreeNode[]>>("/paleo/cms-channels/tree");
  return (json as ApiResponse<ApiCmsChannelTreeNode[]>).data ?? [];
}

/** 管理端：栏目详情 */
export async function getCmsChannel(channelId: number): Promise<ApiCmsChannel> {
  await ensureCmsAuth();
  const json = await request<ApiResponse<ApiCmsChannel>>(`/paleo/cms-channels/${channelId}`);
  const data = (json as ApiResponse<ApiCmsChannel>).data;
  if (!data) throw new Error("栏目不存在");
  return data;
}

/** 管理端：新增栏目 */
export async function createCmsChannel(channel: ApiCmsChannel): Promise<void> {
  await ensureCmsAuth();
  await request("/paleo/cms-channels", { method: "POST", body: JSON.stringify(channel) });
}

/** 管理端：更新栏目 */
export async function updateCmsChannel(channel: ApiCmsChannel): Promise<void> {
  await ensureCmsAuth();
  await request("/paleo/cms-channels", { method: "PUT", body: JSON.stringify(channel) });
}

/** 管理端：更新栏目状态 */
export async function updateCmsChannelStatus(channelId: number, status: string): Promise<void> {
  await ensureCmsAuth();
  await request(`/paleo/cms-channels/${channelId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

/** 管理端：删除栏目 */
export async function deleteCmsChannel(channelId: number): Promise<void> {
  await ensureCmsAuth();
  await request(`/paleo/cms-channels/${channelId}/delete`, { method: "POST" });
}

/** 管理端：版式注册表列表 */
export async function listCmsLayouts(): Promise<ApiCmsLayout[]> {
  await ensureCmsAuth();
  const json = await request<ApiResponse<ApiCmsLayout[]>>("/paleo/cms-layouts/list");
  return (json as ApiResponse<ApiCmsLayout[]>).data ?? [];
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
  if (res.status === 401 || json.code === 401) {
    handleCmsUnauthorized();
    throw new CmsAuthError(json.msg || "未登录", 401);
  }
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
  if (res.status === 401 || json.code === 401) {
    handleCmsUnauthorized();
    throw new CmsAuthError(json.msg || "未登录", 401);
  }
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

// ── 仪表盘统计 API ──────────────────────────────────────────────────────────

export interface ApiDashboardStats {
  totalUsers: number;
  memberCount: number;
  nonMemberCount: number;
  activeMembers: number;
  studentMembers: number;
  nonStudentMembers: number;
  studentNonMembers: number;
  nonStudentNonMembers: number;
  totalMembershipFee: number;
  studentMembershipFeeAmount?: number;
  nonStudentMembershipFeeAmount?: number;
  totalConferenceFee: number;
  activeConferences: number;
  branchMemberCounts: { name: string; count: number }[];
  perSocietyConferenceFee: Record<string, number>;
}

export async function fetchDashboardStats(): Promise<ApiDashboardStats | null> {
  try {
    await ensureCmsAuth();
    const res = await fetch("/paleo/dashboard/stats", {
      headers: {
        Authorization: `Bearer ${getToken() || ""}`,
      },
    });
    if (res.status === 401) {
      handleCmsUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== 200) return null;
    return json.data as ApiDashboardStats;
  } catch {
    return null;
  }
}
