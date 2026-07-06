/** 审计追溯 API — 对接 paleontology-cms-backend */

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

export interface ApiAuditLogRow {
  logId: number;
  operatorId: number;
  operatorEmail: string;
  operatorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  associationId?: number | null;
  summary: string;
  detailJson?: string | null;
  ip?: string | null;
  createTime: string;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  MEMBERSHIP_VOUCHER_APPROVE: "会员费凭证通过",
  MEMBERSHIP_VOUCHER_REJECT: "会员费凭证驳回",
  MEMBERSHIP_INVOICE_APPROVE: "会员费发票通过",
  MEMBERSHIP_INVOICE_REJECT: "会员费发票驳回",
  JOIN_APPLICATION_APPROVE: "入会申请通过",
  JOIN_APPLICATION_REJECT: "入会申请驳回",
  WITHDRAW_APPLICATION_APPROVE: "退会申请通过",
  WITHDRAW_APPLICATION_REJECT: "退会申请驳回",
  CONFERENCE_VOUCHER_APPROVE: "会议费凭证通过",
  CONFERENCE_VOUCHER_REJECT: "会议费凭证驳回",
  CONFERENCE_INVOICE_APPROVE: "会议费发票通过",
  CONFERENCE_INVOICE_REJECT: "会议费发票驳回",
  ABSTRACT_ADMIN_EDIT: "摘要代改",
  ACCOMMODATION_ADMIN_EDIT: "住宿代改",
  INVOICE_DEADLINE_EXTEND: "发票期限延长",
  CMS_PUBLISH: "内容发布",
  CMS_UNPUBLISH: "内容下线",
  ADMIN_BINDING_CREATE: "管理员分会绑定",
  ADMIN_BINDING_REMOVE: "管理员分会解绑",
  RECOGNITION_MANUAL_REVIEW: "识别结果人工复核",
};

export const AUDIT_ROLE_LABEL: Record<string, string> = {
  super: "总管理员",
  branch: "分会管理员",
  finance: "财务审核员",
};

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

export interface AuditLogQuery {
  pageNum?: number;
  pageSize?: number;
  action?: string;
  operatorEmail?: string;
  associationId?: number;
  startTime?: string;
  endTime?: string;
  targetType?: string;
}

export async function fetchAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams();
  if (query.pageNum) params.set("pageNum", String(query.pageNum));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.action) params.set("action", query.action);
  if (query.operatorEmail) params.set("operatorEmail", query.operatorEmail);
  if (query.associationId != null) params.set("associationId", String(query.associationId));
  if (query.startTime) params.set("startTime", query.startTime);
  if (query.endTime) params.set("endTime", query.endTime);
  if (query.targetType) params.set("targetType", query.targetType);

  const json = await request<ApiResponse<ApiAuditLogRow>>(`/paleo/audit/logs?${params}`);
  return { rows: json.rows ?? [], total: json.total ?? 0 };
}

export async function fetchAuditActions() {
  const json = await request<ApiResponse<string[]>>("/paleo/audit/actions");
  return json.data ?? [];
}
