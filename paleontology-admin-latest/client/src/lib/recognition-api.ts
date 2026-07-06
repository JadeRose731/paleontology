/** 识别结果 API — 对接 paleontology-cms-backend */

import { ensureCmsAuth, handleCmsUnauthorized, CmsAuthError } from "./cms-api";

const CMS_TOKEN_KEY = "paleo_cms_token";
const API_BASE = import.meta.env.VITE_CMS_API_BASE ?? "";

function getToken(): string | null {
  return localStorage.getItem(CMS_TOKEN_KEY);
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
  rows?: T[];
  total?: number;
}

export interface ApiRecognitionRow {
  resultId: number;
  targetType: "membership" | "conference";
  targetId: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  associationId?: number | null;
  fileRole: "voucher" | "invoice";
  fileUrl: string;
  fileName?: string;
  autoStatus: "passed" | "failed" | "pending";
  autoDetail?: string | null;
  manualStatus?: "confirmed" | "disputed" | null;
  manualComment?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  createTime: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureCmsAuth();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (res.status === 401 || json.code === 401) {
    handleCmsUnauthorized();
    throw new CmsAuthError(json.msg || "未登录或 token 已过期", 401);
  }
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || "请求失败");
  }
  return json as T;
}

export interface RecognitionQuery {
  pageNum?: number;
  pageSize?: number;
  status?: string;
  targetType?: string;
  manualStatus?: string;
}

export async function fetchRecognitionList(query: RecognitionQuery = {}) {
  const params = new URLSearchParams();
  if (query.pageNum) params.set("pageNum", String(query.pageNum));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.targetType) params.set("targetType", query.targetType);
  if (query.manualStatus) params.set("manualStatus", query.manualStatus);

  const json = await request<ApiResponse<ApiRecognitionRow>>(`/paleo/recognition/list?${params}`);
  return { rows: json.rows ?? [], total: json.total ?? 0 };
}

export async function fetchRecognitionDetail(id: number) {
  const json = await request<ApiResponse<ApiRecognitionRow>>(`/paleo/recognition/${id}`);
  return json.data as ApiRecognitionRow;
}

export async function reviewRecognition(id: number, manualStatus: "confirmed" | "disputed", manualComment?: string) {
  const json = await request<ApiResponse>(`/paleo/recognition/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ manualStatus, manualComment: manualComment ?? "" }),
  });
  return json;
}

export const TARGET_TYPE_LABEL: Record<string, string> = {
  membership: "会员费",
  conference: "会议费",
};

export const FILE_ROLE_LABEL: Record<string, string> = {
  voucher: "缴费凭证",
  invoice: "电子发票",
};

export const AUTO_STATUS_LABEL: Record<string, string> = {
  passed: "识别通过",
  failed: "识别失败",
  pending: "待识别",
};

export const MANUAL_STATUS_LABEL: Record<string, string> = {
  confirmed: "确认无误",
  disputed: "存疑",
};
