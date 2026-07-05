/** 管理端会员/会议审核 API — 对接 paleontology-cms-backend */

import { ensureCmsAuth } from "./cms-api";

const CMS_TOKEN_KEY = "paleo_cms_token";
const API_BASE = import.meta.env.VITE_CMS_API_BASE ?? "";

function getToken(): string | null {
  return localStorage.getItem(CMS_TOKEN_KEY);
}

interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export interface ApiReviewPayment {
  paymentId: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  memberCategory?: string;
  amount?: number;
  paymentStatus?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
  reviewComment?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ApiReviewRegistration {
  registrationId: number;
  conferenceId?: number;
  conferenceCode?: string;
  conferenceTitle?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  feeType?: string;
  feeAmount?: number;
  paymentStatus?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
  reviewComment?: string;
  voucherSubmitTime?: string;
  invoiceSubmitTime?: string;
  invoiceDeadline?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureCmsAuth();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || "请求失败");
  }
  return json.data as T;
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
    PENDING: "unpaid",
  };
  return status ? (map[status] || status.toLowerCase()) : "unpaid";
}

/** Hide empty UNPAID drafts that were never submitted with a voucher. */
export function filterVisibleMembershipPayments(rows: ApiMembershipPaymentRow[]): ApiMembershipPaymentRow[] {
  return rows.filter((p) => {
    const status = (p.paymentStatus || "").toUpperCase();
    if (status === "UNPAID" && !p.voucherUrl) return false;
    return true;
  });
}

export interface ApiMemberDirectoryRow {
  userId: number;
  email: string;
  userName?: string;
  gender?: string;
  unit?: string;
  roleLabel?: string;
  userType?: string;
  memberStatus?: string;
  memberCategory?: string;
  membershipStatus?: string;
  validEndDate?: string;
  boundBranches?: string[];
  boundBranchNames?: string[];
}

export interface ApiReviewApplication {
  applicationId: number;
  userId?: number;
  userEmail?: string;
  userName?: string;
  applicantEmail?: string;
  applicantName?: string;
  applicationType?: string;
  applicationFileUrl?: string;
  reviewStatus?: string;
  reviewComment?: string;
  createTime?: string;
  memberStatus?: string;
  validEndDate?: string;
}

export async function fetchMemberDirectory() {
  return request<ApiMemberDirectoryRow[]>("/paleo/membership/admin/directory");
}

export interface ApiMembershipPaymentRow {
  paymentId: number;
  userId?: number;
  userEmail?: string;
  userName?: string;
  memberCategory?: string;
  amount?: number;
  paymentStatus?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
  reviewComment?: string;
  createTime?: string;
  updateTime?: string;
  validStartDate?: string;
  validEndDate?: string;
}

export async function fetchUserMembershipPayments(userId: number) {
  return request<ApiMembershipPaymentRow[]>(`/paleo/membership/admin/users/${userId}/payments`);
}

export async function fetchPendingApplications(applicationType: "JOIN" | "WITHDRAW") {
  return request<ApiReviewApplication[]>(`/paleo/membership/applications/reviews/pending?applicationType=${applicationType}`);
}

export async function reviewMembershipApplication(
  applicationId: number,
  reviewStatus: "APPROVED" | "REJECTED",
  reviewComment?: string,
) {
  return request<unknown>(`/paleo/membership/applications/${applicationId}/review`, {
    method: "POST",
    body: JSON.stringify({ reviewStatus, reviewComment: reviewComment || "" }),
  });
}

export async function fetchPendingMembershipVouchers() {
  return request<ApiReviewPayment[]>("/paleo/membership/payments/reviews/pending-vouchers");
}

export async function fetchPendingMembershipInvoices() {
  return request<ApiReviewPayment[]>("/paleo/membership/payments/reviews/pending-invoices");
}

export async function fetchPendingConferenceVouchers() {
  return request<ApiReviewRegistration[]>("/paleo/conferences/registrations/reviews/pending-vouchers");
}

export async function fetchPendingConferenceInvoices() {
  return request<ApiReviewRegistration[]>("/paleo/conferences/registrations/reviews/pending-invoices");
}

export async function reviewMembershipPayment(paymentId: number, paymentStatus: string, reviewComment?: string) {
  return request<unknown>(`/paleo/membership/payments/${paymentId}/review`, {
    method: "POST",
    body: JSON.stringify({ paymentStatus, reviewComment: reviewComment || "" }),
  });
}

export async function reviewConferenceRegistration(
  registrationId: number,
  paymentStatus: string,
  reviewComment?: string,
) {
  return request<unknown>(`/paleo/conferences/registrations/${registrationId}/review`, {
    method: "POST",
    body: JSON.stringify({ paymentStatus, reviewComment: reviewComment || "" }),
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

export async function fetchMembershipTemplates(): Promise<ApiMembershipTemplates> {
  return request<ApiMembershipTemplates>("/paleo/membership/templates");
}

export async function uploadMembershipTemplate(templateType: "JOIN" | "WITHDRAW", file: File) {
  await ensureCmsAuth();
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/paleo/membership/templates/${templateType}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json()) as ApiResponse;
  if (!res.ok || json.code !== 200) {
    throw new Error(json.msg || "模板上传失败");
  }
  return json.data;
}
