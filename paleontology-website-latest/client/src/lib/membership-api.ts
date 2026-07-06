/** 用户端会员/会议业务 API — 对接 paleontology-cms-backend */

import type { UploadedFile } from "@/lib/fileUpload";

const API_BASE = import.meta.env.VITE_CMS_API_BASE ?? "";
const TOKEN_KEY = "paleo_user_token";

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
  url?: string;
  fileName?: string;
  registration?: ApiConferenceRegistration;
}

export interface ApiPaleoUser {
  userId?: number;
  email: string;
  userName?: string;
  gender?: string;
  unit?: string;
  roleLabel?: string;
  title?: string;
  isStudent?: string;
  userType?: string;
  membershipChoiceMade?: string;
}

export interface ApiMemberProfile {
  profileId?: number;
  userId?: number;
  memberStatus?: string;
  memberCategory?: string;
  validEndDate?: string;
}

/** 与后台 PaleoMembershipStatusService 对齐的会员状态解析 */
export function resolveMembershipStatusFromApi(parts: {
  membershipStatus?: string | null;
  profile?: ApiMemberProfile | null;
  joinApps?: ApiMembershipApplication[];
  withdrawApps?: ApiMembershipApplication[];
  payments?: ApiMembershipPayment[];
}): string {
  if (parts.membershipStatus) {
    return parts.membershipStatus;
  }

  const joinApps = parts.joinApps ?? [];
  const withdrawApps = parts.withdrawApps ?? [];
  const payments = parts.payments ?? [];
  const profile = parts.profile;

  const pendingJoin = joinApps.find((a) => normalizeReviewStatus(a.reviewStatus) === "PENDING");
  if (pendingJoin) return "application_submitted";

  const pendingWithdraw = withdrawApps.find((a) => normalizeReviewStatus(a.reviewStatus) === "PENDING");
  if (pendingWithdraw) return "withdrawal_submitted";

  if (profile?.memberStatus === "WITHDRAWN") return "withdrawn";
  if (profile?.memberStatus === "PENDING") return "application_approved";
  if (profile?.memberStatus === "EXPIRED") return "expired";

  const latestPayment = pickLatestMembershipPayment(payments);
  const paymentMapped = latestPayment ? mapApiPaymentStatus(latestPayment.paymentStatus) : undefined;
  if (latestPayment && paymentMapped && paymentMapped !== "unpaid" && paymentMapped !== "voided") {
    if (paymentMapped === "confirmed") {
      if (profile?.memberStatus === "ACTIVE") return "active";
    } else {
      return paymentMapped;
    }
  }

  const approvedJoin = joinApps.find((a) => normalizeReviewStatus(a.reviewStatus) === "APPROVED");
  if (approvedJoin) return "application_approved";

  const authoritativeJoin = pickAuthoritativeJoinApplication(joinApps);
  if (authoritativeJoin && normalizeReviewStatus(authoritativeJoin.reviewStatus) === "REJECTED") {
    return "application_rejected";
  }

  if (profile?.memberStatus === "ACTIVE") return "active";
  return "not_member";
}

export interface ApiMembershipPayment {
  paymentId?: number;
  userId?: number;
  memberCategory?: string;
  amount?: number;
  paymentStatus?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
  reviewComment?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ApiConferenceRegistration {
  registrationId?: number;
  conferenceId?: number;
  conferenceCode?: string;
  conferenceTitle?: string;
  userId?: number;
  feeType?: string;
  feeAmount?: number;
  paymentStatus?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
  reviewComment?: string;
  voucherSubmitTime?: string;
  voucherAuditTime?: string;
  invoiceSubmitTime?: string;
  invoiceAuditTime?: string;
  invoiceDeadline?: string;
}

export function getUserToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setUserToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearUserToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function mapApiPaymentStatus(status?: string): string {
  const map: Record<string, string> = {
    UNPAID: "unpaid",
    VOUCHER_REVIEW: "voucher_submitted",
    VOUCHER_REJECTED: "voucher_rejected",
    INVOICE_PENDING: "invoice_pending",
    INVOICE_REVIEW: "invoice_submitted",
    INVOICE_REJECTED: "invoice_rejected",
    CONFIRMED: "confirmed",
    VOIDED: "voided",
    PENDING: "unpaid",
  };
  return status ? (map[status] || status.toLowerCase()) : "unpaid";
}

/** 选取当前有效的会员费记录（跳过 VOIDED 与空 UNPAID 草稿） */
export function pickLatestMembershipPayment(payments: ApiMembershipPayment[]): ApiMembershipPayment | undefined {
  const sorted = [...payments].sort((a, b) => (b.paymentId ?? 0) - (a.paymentId ?? 0));
  return sorted.find((p) => {
    const status = (p.paymentStatus || "").toUpperCase();
    if (status === "VOIDED") return false;
    if (status === "UNPAID" && !p.voucherUrl) return false;
    return true;
  });
}

export function normalizeReviewStatus(status?: string | null): string {
  return (status || "").trim().toUpperCase();
}

/** 入会申请：优先最新待审，否则最新已通过，否则最新一条 */
export function pickAuthoritativeJoinApplication(
  apps: ApiMembershipApplication[],
): ApiMembershipApplication | undefined {
  const sorted = [...apps].sort((a, b) => (b.applicationId ?? 0) - (a.applicationId ?? 0));
  const pending = sorted.find((a) => normalizeReviewStatus(a.reviewStatus) === "PENDING");
  if (pending) return pending;
  const approved = sorted.find((a) => normalizeReviewStatus(a.reviewStatus) === "APPROVED");
  if (approved) return approved;
  return sorted[0];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getUserToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || "请求失败");
  }
  return json.data as T;
}

async function requestRaw(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getUserToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || `请求失败 (${res.status})`);
  }
  return json;
}

export function dataUrlToFile(uploaded: UploadedFile): File {
  const [meta, base64] = uploaded.dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const mimeExtMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  let name = uploaded.name || "upload";
  if (!/\.[a-z0-9]+$/i.test(name)) {
    const ext = mimeExtMap[mime] || mime.split("/").pop() || "bin";
    name = `${name}.${ext}`;
  }
  return new File([bytes], name, { type: mime });
}

export interface ApiMembershipApplication {
  applicationId?: number;
  userId?: number;
  applicationType?: string;
  memberCategory?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicationFileUrl?: string;
  reviewStatus?: string;
  reviewComment?: string;
  createTime?: string;
  reviewTime?: string;
}

export function mapApiApplicationReviewStatus(reviewStatus?: string, applicationType?: string): string {
  if (reviewStatus === "PENDING") {
    return applicationType === "WITHDRAW" ? "withdrawal_submitted" : "application_submitted";
  }
  if (reviewStatus === "APPROVED") {
    return applicationType === "WITHDRAW" ? "withdrawn" : "application_approved";
  }
  if (reviewStatus === "REJECTED") {
    return applicationType === "WITHDRAW" ? "withdrawal_rejected" : "application_rejected";
  }
  return "not_member";
}

export async function fetchMyMembershipApplications(applicationType?: "JOIN" | "WITHDRAW") {
  const qs = applicationType ? `?applicationType=${applicationType}` : "";
  return request<ApiMembershipApplication[]>(`/paleo/membership/applications/mine${qs}`);
}

export async function createMembershipApplication(payload: {
  applicationType: "JOIN" | "WITHDRAW";
  applicantName?: string;
  applicantEmail?: string;
  memberCategory?: string;
}) {
  return request<ApiMembershipApplication>("/paleo/membership/applications/mine", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadMembershipApplicationFile(applicationId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return requestRaw(`/paleo/membership/applications/mine/${applicationId}/file`, {
    method: "POST",
    body: form,
  });
}

export interface ApiTemplateInfo {
  fileName?: string | null;
  fileUrl?: string | null;
  updateTime?: string | null;
}

export interface ApiMembershipTemplates {
  join: ApiTemplateInfo;
  withdraw: ApiTemplateInfo;
}

export async function fetchPublicMembershipTemplates(): Promise<ApiMembershipTemplates> {
  const res = await fetch(`${API_BASE}/paleo/membership/templates/public`);
  const json = (await res.json()) as ApiResponse<ApiMembershipTemplates>;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || "获取模板失败");
  }
  return json.data as ApiMembershipTemplates;
}

export async function cancelMembershipApplication(applicationId: number) {
  return request<unknown>(`/paleo/membership/applications/mine/${applicationId}/cancel`, {
    method: "POST",
  });
}

export async function loginUser(email: string, password: string) {
  const data = await request<{
    token: string;
    user: ApiPaleoUser;
    profile: ApiMemberProfile;
    membershipStatus?: string;
  }>("/paleo/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setUserToken(data.token);
  return data;
}

export async function registerUser(payload: Record<string, unknown>, password: string) {
  const data = await request<{
    token: string;
    user: ApiPaleoUser;
    profile: ApiMemberProfile;
    membershipStatus?: string;
  }>("/paleo/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...payload, password }),
  });
  setUserToken(data.token);
  return data;
}

export async function fetchAuthInfo() {
  return request<{ user: ApiPaleoUser; profile: ApiMemberProfile; membershipStatus?: string }>("/paleo/auth/info");
}

export async function updateUserTypeApi(userType: string, membershipChoiceMade: boolean) {
  return request<ApiPaleoUser>("/paleo/auth/user-type", {
    method: "PUT",
    body: JSON.stringify({ userType, membershipChoiceMade }),
  });
}

export async function fetchMyMembershipPayments() {
  return request<ApiMembershipPayment[]>("/paleo/membership/payments/mine");
}

export async function createMembershipPayment(amount: number, memberCategory: string) {
  return request<ApiMembershipPayment>("/paleo/membership/payments/mine", {
    method: "POST",
    body: JSON.stringify({ amount, memberCategory }),
  });
}

export async function uploadMembershipPaymentFile(paymentId: number, role: "voucher" | "invoice", file: File) {
  const form = new FormData();
  form.append("file", file);
  return requestRaw(`/paleo/membership/payments/mine/${paymentId}/files/${role}`, {
    method: "POST",
    body: form,
  });
}

export async function fetchMyConferenceRegistrations() {
  return request<ApiConferenceRegistration[]>("/paleo/conferences/registrations/mine");
}

export async function fetchMyBranchBindings() {
  return request<string[]>("/paleo/user-bindings/mine");
}

export async function bindBranch(branchCode: string) {
  return request<string[]>("/paleo/user-bindings/mine/bind", {
    method: "POST",
    body: JSON.stringify({ branchCode }),
  });
}

export async function unbindBranch(branchCode: string) {
  return request<string[]>("/paleo/user-bindings/mine/unbind", {
    method: "POST",
    body: JSON.stringify({ branchCode }),
  });
}

export async function createConferenceRegistration(conferenceCode: string, feeType: string, feeAmount: number) {
  return request<ApiConferenceRegistration>("/paleo/conferences/registrations/mine", {
    method: "POST",
    body: JSON.stringify({ conferenceCode, feeType, feeAmount }),
  });
}

export async function uploadConferenceRegistrationFile(
  registrationId: number,
  role: "voucher" | "invoice",
  file: File,
) {
  const form = new FormData();
  form.append("file", file);
  return requestRaw(`/paleo/conferences/registrations/mine/${registrationId}/files/${role}`, {
    method: "POST",
    body: form,
  });
}

export function mapApiUserToLocal(user: ApiPaleoUser) {
  return {
    email: user.email,
    name: user.userName || user.email,
    gender: (user.gender === "女" ? "女" : "男") as "男" | "女",
    unit: user.unit || "",
    role: (user.roleLabel === "学生" ? "学生" : user.roleLabel === "嘉宾" ? "嘉宾" : "教师") as "学生" | "教师" | "嘉宾",
    title: user.title,
    isStudent: user.isStudent === "1",
  };
}

export function mapApiRegistrationToConferenceReg(reg: ApiConferenceRegistration) {
  const status = mapApiPaymentStatus(reg.paymentStatus);
  return {
    status: status as "unpaid" | "voucher_submitted" | "voucher_rejected" | "invoice_pending" | "invoice_submitted" | "invoice_rejected" | "confirmed",
    conferenceCode: reg.conferenceCode,
    conferenceTitle: reg.conferenceTitle,
    paymentVoucher: reg.voucherUrl,
    invoiceUrl: reg.invoiceUrl,
    voucherSubmitTime: reg.voucherSubmitTime,
    voucherAuditTime: reg.voucherAuditTime,
    invoiceSubmitTime: reg.invoiceSubmitTime,
    invoiceAuditTime: reg.invoiceAuditTime,
    invoiceDeadline: reg.invoiceDeadline,
    voucherRejectReason: status === "voucher_rejected" ? reg.reviewComment : undefined,
    invoiceRejectReason: status === "invoice_rejected" ? reg.reviewComment : undefined,
    feeType: reg.feeType,
    lockedAmount: reg.feeAmount ? Number(reg.feeAmount) : undefined,
    name: "",
    gender: "男" as const,
    unit: "",
    role: "教师" as const,
    accommodation: "自行安排" as const,
    session: "待选择",
    presentationType: "仅参会" as const,
  };
}
