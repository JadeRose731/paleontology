import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ensureCmsAuth, listCmsChannelTree } from "@/lib/cms-api";
import {
  fetchMemberDirectory,
  fetchPendingApplications,
  fetchPendingConferenceInvoices,
  fetchPendingConferenceVouchers,
  fetchPendingMembershipInvoices,
  fetchPendingMembershipVouchers,
  mapApiPaymentStatus,
  reviewConferenceRegistration,
  reviewMembershipApplication,
  reviewMembershipPayment,
  type ApiMemberDirectoryRow,
} from "@/lib/membership-api";
import {
  buildCmsMenuFromTree,
  buildCmsRoutePermissions,
  FALLBACK_BRANCH_CMS_MENU,
  FALLBACK_CMS_MENU,
  resolveAdminSection,
} from "@/lib/cms-channel-nav";
import {
  type MembershipStatus,
  type ConferenceStatus,
  type ConferenceFeeConfig,
  CONFERENCE_FEE_TYPE,
  type ConferenceFeeType,
  MEMBERSHIP_STATUS,
  CONFERENCE_STATUS,
  BRANCH_MAP,
  ALL_SOCIETY_UNITS,
  VALID_BRANCH_IDS,
  CONFERENCE_FEE_TYPE_LABEL,
  ACCOMMODATION_TYPE_LABEL,
  ACCOMMODATION_TYPE,
  ALL_SOCIETY_IDS,
  TOTAL_SOCIETY_ID,
  createDefaultFieldTripRoutes,
  createEmptyFieldTripSelections,
  type FieldTripSelections,
  resolveSocietyName,
  deriveFeeType,
  getFeeFromConfig,
  type UserType,
} from "@shared/constants";

// ============================================================================
// TYPES
// ============================================================================

export type AdminRole = "super_admin" | "branch_admin" | "finance_reviewer";

export interface AdminUser {
  email: string;
  name: string;
  role: AdminRole;
  branchId?: string;
  avatar?: string;
}

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
  children?: MenuItem[];
}

export interface ReviewItem {
  id: string;
  userEmail: string;
  userName: string;
  type: "society_fee" | "conference_fee";
  targetName: string;
  amount: number;
  voucherUrl: string;
  invoiceUrl?: string;
  submitTime: string;
  ocrAmount?: number;
  status: string;
  rejectReason?: string;
  invoiceDeadline?: string;
  confId?: string;
  paymentId?: number;
  registrationId?: number;
}

// Phase 6: 入会申请审核
export interface MembershipAppRecord {
  id: string;
  applicationId: number;
  userEmail: string;
  userName: string;
  applicationFileUrl: string;
  applicationFileName: string;
  submitTime: string;
  status: string;   // application_submitted
  rejectReason?: string;
}

// Phase 6: 退会申请审核
export interface WithdrawalAppRecord {
  id: string;
  applicationId: number;
  userEmail: string;
  userName: string;
  membershipStatus: string;
  expiryDate?: string;
  applicationFileUrl: string;
  applicationFileName: string;
  submitTime: string;
  status: string;   // withdrawal_submitted
  rejectReason?: string;
}

export interface MemberRecord {
  userId?: number;
  email: string;
  name: string;
  gender: string;
  unit: string;
  role: string;
  memberType?: string;
  membershipStatus: string;
  boundBranches: string[];
  boundBranchNames?: string[];
  expiryDate?: string;
  userType: string;
  disabled?: boolean;
}

export interface MemberFilter {
  search?: string;
  status?: string;
  branchId?: string;
}

export interface MemberDetail extends MemberRecord {
  paymentHistory: {
    id: string;
    type: string;
    targetName: string;
    amount: number;
    voucherUrl: string;
    invoiceUrl: string;
    submitTime: string;
    auditTime?: string;
    status: string;
  }[];
  // Phase 6: 入会/退会申请书
  membershipAppFileUrl?: string;
  membershipAppFileName?: string;
  membershipAppStatus?: string;
  membershipAppRejectReason?: string;
  withdrawalAppFileUrl?: string;
  withdrawalAppFileName?: string;
  withdrawalAppStatus?: string;
}

export interface ConferenceRecord {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  startDate: string;
  endDate: string;
  location: string;
  memberFee: number;
  nonMemberFee: number;
  // Phase 1: 四类会议费配置
  feeConfig?: ConferenceFeeConfig;
  // Phase 2: 文件管理
  publicNoticeUrl?: string;
  publicNoticeName?: string;
  stampedNoticeUrl?: string;
  stampedNoticeName?: string;
  abstractTemplateUrl?: string;
  abstractTemplateName?: string;
  paymentDeadline: string;
  abstractDeadline: string;
  // Phase 4: 住宿/野外截止时间
  accommodationDeadline?: string;
  fieldTripDeadline?: string;
  // Phase 4: 野外路线配置
  fieldTripRoutes?: { id: string; phase: "pre" | "during" | "post"; name: string; order: number }[];
  status: "draft" | "published";
  sessions: { id: string; name: string }[];
  registrations: number;
}

export interface ConferenceData {
  name: string;
  branchId: string;
  startDate: string;
  endDate: string;
  location: string;
  /** @deprecated Phase 1 起请使用 feeConfig */
  memberFee?: number;
  /** @deprecated Phase 1 起请使用 feeConfig */
  nonMemberFee?: number;
  // Phase 1: 四类会议费配置
  feeConfig?: ConferenceFeeConfig;
  // Phase 2: 文件管理
  publicNoticeUrl?: string;
  publicNoticeName?: string;
  stampedNoticeUrl?: string;
  stampedNoticeName?: string;
  abstractTemplateUrl?: string;
  abstractTemplateName?: string;
  paymentDeadline: string;
  abstractDeadline: string;
  // Phase 4: 住宿/野外截止时间
  accommodationDeadline?: string;
  fieldTripDeadline?: string;
  // Phase 4: 野外路线配置
  fieldTripRoutes?: { id: string; phase: "pre" | "during" | "post"; name: string; order: number }[];
  sessions: { id: string; name: string }[];
  status: "draft" | "published";
}

export interface BranchRecord {
  id: string;
  name: string;
  description: string;
  logo?: string;
  memberCount: number;
  disabled: boolean;
}

export interface BranchData {
  name?: string;
  description?: string;
  logo?: string;
}

// Phase 3: 统计类型

export interface FeeBreakdownEntry {
  count: number;
  amount: number;
}

export interface FeeBreakdown {
  studentMember: FeeBreakdownEntry;
  nonStudentMember: FeeBreakdownEntry;
  studentNonMember: FeeBreakdownEntry;
  nonStudentNonMember: FeeBreakdownEntry;
}

export interface GlobalStats {
  totalUsers: number;
  totalMembers: number;
  totalNonMembers: number;
  studentMembers: number;
  nonStudentMembers: number;
  studentNonMembers: number;
  nonStudentNonMembers: number;
  totalMembershipFee: number;
  studentMembershipFeeAmount: number;
  studentMembershipFeeCount: number;
  nonStudentMembershipFeeAmount: number;
  nonStudentMembershipFeeCount: number;
  totalConferenceFee: number;
  perSocietyConferenceFee: Record<string, number>;
  /** 12 学会 × 四类会议费实收矩阵 */
  perSocietyFeeBreakdown: Record<string, FeeBreakdown>;
}

export interface SocietyStats {
  societyName: string;
  /** 绑定该学会的注册用户总数（总学会含全站用户） */
  registeredTotal: number;
  registeredMembers: number;
  registeredNonMembers: number;
  registeredStudentMembers: number;
  registeredNonStudentMembers: number;
  registeredStudentNonMembers: number;
  registeredNonStudentNonMembers: number;
  /** 累计确认参会人数（按会议费类型） */
  totalAttendees: number;
  totalMembers: number;
  totalNonMembers: number;
  studentMembers: number;
  nonStudentMembers: number;
  studentNonMembers: number;
  nonStudentNonMembers: number;
  totalConferenceFee: number;
  feeBreakdown: FeeBreakdown;
}

export interface ConferenceStats {
  confName: string;
  societyName: string;
  totalAttendees: number;
  totalConferenceFee: number;
  totalReports: number;
  oralReports: number;
  posterReports: number;
  totalMembers: number;
  totalNonMembers: number;
  studentMembers: number;
  nonStudentMembers: number;
  studentNonMembers: number;
  nonStudentNonMembers: number;
  feeBreakdown: FeeBreakdown;
  accommodation: {
    totalRooms: number;
    maleSingle: number;
    maleDouble: number;
    femaleSingle: number;
    femaleDouble: number;
    selfArranged: number;
  };
  fieldTrips: Record<string, { total: number; male: number; female: number }>;
}

export interface DashboardStats {
  totalUsers: number;
  nonMemberCount: number;
  memberCount: number;
  activeMembers: number;
  pendingReviews: number;
  activeConferences: number;
  recentReviews: ReviewItem[];
  branchMemberCounts: { name: string; count: number }[];
  paymentTrend: { month: string; count: number }[];
}

export interface BranchDashboardStats {
  branchConferences: number;
  branchRegistrations: number;
  branchPendingReviews: number;
  branchUserCount: number;
  recentRegistrations: { userName: string; conferenceName: string; time: string }[];
}

export interface FinanceDashboardStats {
  pendingVoucher: number;
  pendingInvoice: number;
  processedToday: number;
  overdueCount: number;
  voucherPassRate: number;
  invoicePassRate: number;
  recentReviews: ReviewItem[];
}

// Phase 5: 参会人员详情
export interface ConferenceAttendee {
  email: string;
  name: string;
  gender: string;
  unit: string;
  role: string;
  userType: string;
  feeType: ConferenceFeeType;
  feeAmount: number;
  paymentStatus: string;
  reportType?: string;
  reportTitle?: string;
  abstractFileName?: string;
  abstractFileUrl?: string;
  accommodationType?: string;
  accommodationLabel?: string;
  fieldTripPre: boolean;
  fieldTripDuring: boolean;
  fieldTripPost: boolean;
  /** 野外路线 ID 选择（会前/会中/会后） */
  fieldTripSelections?: FieldTripSelections;
  /** 已选野外路线文字摘要（供列表展示） */
  fieldTripSummary?: string;
  voucherUrl?: string;
  invoiceUrl?: string;
}

// Phase 5: 导出选项
export interface ExportOptions {
  scope: "branch" | "conference" | "global";
  scopeId: string;
  includeCategories?: ConferenceFeeType[];
}

export interface AuditLogEntry {
  id: string;
  targetEmail: string;
  targetName: string;
  type: "society_fee" | "conference_fee";
  action: "approve_voucher" | "reject_voucher" | "approve_invoice" | "reject_invoice" | "extend_deadline";
  reviewer: string;
  reason?: string;
  time: string;
}

interface AdminContextType {
  adminUser: AdminUser | null;
  isAdminLoggedIn: boolean;
  adminLogin(email: string, password: string): boolean;
  adminLogout(): void;
  adminRole: AdminRole;
  adminBranchId: string | null;
  canAccess(path: string): boolean;
  getAllowedMenuItems(): MenuItem[];
  getDefaultCmsPath(): string;
  refreshCmsMenu(): Promise<void>;
  cmsMenuLoaded: boolean;
  pendingVoucherReviews: ReviewItem[];
  pendingInvoiceReviews: ReviewItem[];
  approveVoucher(targetEmail: string, type: "society_fee" | "conference_fee", confId?: string): void;
  rejectVoucher(targetEmail: string, type: "society_fee" | "conference_fee", reason: string, confId?: string): void;
  approveInvoice(targetEmail: string, type: "society_fee" | "conference_fee", confId?: string): void;
  rejectInvoice(targetEmail: string, type: "society_fee" | "conference_fee", reason: string, confId?: string): void;
  batchApproveVoucher(ids: string[]): void;
  batchRejectVoucher(ids: string[], reason: string): void;
  batchApproveInvoice(ids: string[]): void;
  batchRejectInvoice(ids: string[], reason: string): void;
  extendDeadline(targetEmail: string, type: "society_fee" | "conference_fee", newDeadline: string, reason: string, confId?: string): void;
  getAllMembers(filters?: MemberFilter): MemberRecord[];
  getMemberDetail(email: string): MemberDetail | null;
  toggleMemberDisabled(email: string): void;
  manualActivateMember(email: string): void;
  getAllConferences(): ConferenceRecord[];
  getBranchConferences(branchId: string): ConferenceRecord[];
  createConference(data: ConferenceData): void;
  updateConference(id: string, data: ConferenceData): void;
  getDashboardStats(): DashboardStats;
  getBranchDashboardStats(branchId: string): BranchDashboardStats;
  getFinanceDashboardStats(): FinanceDashboardStats;
  // Phase 3: 三层统计
  getGlobalStats(): GlobalStats;
  getSocietyStats(societyId: string): SocietyStats;
  getConferenceStats(confId: string): ConferenceStats;
  getAllPaymentRecords(): ReviewItem[];
  // Phase 5: 参会人员详情 & 导出
  getConferenceAttendees(confId: string): ConferenceAttendee[];
  generateExportZip(options: ExportOptions): Promise<Blob[]>;
  // Phase 6: 入会/退会审核
  pendingMembershipApps: MembershipAppRecord[];
  pendingWithdrawalApps: WithdrawalAppRecord[];
  approveMembershipApplication(applicationId: number): void;
  rejectMembershipApplication(applicationId: number, reason: string): void;
  approveWithdrawalApplication(applicationId: number): void;
  rejectWithdrawalApplication(applicationId: number, reason: string): void;
  setMembershipApplicationTemplate(fileUrl: string, fileName: string): void;
  setWithdrawalApplicationTemplate(fileUrl: string, fileName: string): void;
  getMembershipApplicationTemplateUrl(): string;
  getWithdrawalApplicationTemplateUrl(): string;
  checkMembershipExpiry(): void;

  getAllBranches(): BranchRecord[];
  updateBranch(id: string, data: Partial<BranchRecord>): void;
  toggleBranchDisabled(id: string): void;
}

// ============================================================================
// BUILT-IN ADMIN ACCOUNTS
// ============================================================================

const BUILT_IN_ADMINS: (AdminUser & { password: string })[] = [
  {
    email: "admin@paleontology.org.cn",
    password: "admin123",
    name: "学会总管理员",
    role: "super_admin" as AdminRole,
  },
  // Phase 1: 11 个分会管理员（每分会一个独立账号）
  {
    email: "branch_gwjzdwxfh@paleo.org.cn",
    password: "admin123",
    name: "古无脊椎动物学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "gwjzdwxfh",
  },
  {
    email: "branch_kpgzwyh@paleo.org.cn",
    password: "admin123",
    name: "科普工作委员会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "kpgzwyh",
  },
  {
    email: "branch_bfxfh@paleo.org.cn",
    password: "admin123",
    name: "孢粉学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "bfxfh",
  },
  {
    email: "branch_wtxfh@paleo.org.cn",
    password: "admin123",
    name: "微体学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "wtxfh",
  },
  {
    email: "branch_hszlzwyh@paleo.org.cn",
    password: "admin123",
    name: "化石藻类专业委员会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "hszlzwyh",
  },
  {
    email: "branch_gzwxfh@paleo.org.cn",
    password: "admin123",
    name: "古植物学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "gzwxfh",
  },
  {
    email: "branch_dqswx@paleo.org.cn",
    password: "admin123",
    name: "地球生物学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "dqswx",
  },
  {
    email: "branch_gst@paleo.org.cn",
    password: "admin123",
    name: "古生态专业分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "gst",
  },
  {
    email: "branch_gjzdw@paleo.org.cn",
    password: "admin123",
    name: "古脊椎动物学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "gjzdw",
  },
  {
    email: "branch_swcj@paleo.org.cn",
    password: "admin123",
    name: "生物沉积学分会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "swcj",
  },
  {
    email: "branch_xjsxff@paleo.org.cn",
    password: "admin123",
    name: "新技术新方法专业委员会管理员",
    role: "branch_admin" as AdminRole,
    branchId: "xjsxff",
  },
  {
    email: "finance@paleontology.org.cn",
    password: "admin123",
    name: "财务审核员",
    role: "finance_reviewer" as AdminRole,
  },
];

// ============================================================================
// ROUTE PERMISSION CONFIG
// ============================================================================

const ROUTE_PERMISSIONS: Record<string, AdminRole[]> = {
  "/admin/dashboard": ["super_admin", "branch_admin", "finance_reviewer"],
  "/admin/audit": ["super_admin", "finance_reviewer"],
  "/admin/users/non-members": ["super_admin"],
  "/admin/users/members": ["super_admin"],
  "/admin/conferences": ["super_admin", "branch_admin"],
  "/admin/statistics": ["super_admin", "branch_admin"],
  "/admin/finance": ["super_admin", "finance_reviewer"],
  "/admin/branches": ["super_admin"],
  "/admin/cms": ["super_admin", "branch_admin"],
  "/admin/cms/banners": ["super_admin"],
  "/admin/cms/news": ["super_admin"],
  "/admin/cms/announcements": ["super_admin", "branch_admin"],
  "/admin/cms/pages": ["super_admin"],
  "/admin/cms/personnel": ["super_admin"],
  "/admin/cms/media": ["super_admin", "branch_admin"],
  "/admin/cms/settings": ["super_admin"],
  "/admin/cms/party": ["super_admin"],
  "/admin/cms/gallery": ["super_admin", "branch_admin"],
  "/admin/cms/awards": ["super_admin", "branch_admin"],
  "/admin/cms/science": ["super_admin", "branch_admin"],
  "/admin/cms/services": ["super_admin", "branch_admin"],
  "/admin/cms/international": ["super_admin"],
  "/admin/cms/tech-rewards": ["super_admin"],
  "/admin/cms/timeline": ["super_admin"],
  "/admin/cms/downloads": ["super_admin", "branch_admin"],
  "/admin/cms/regulations": ["super_admin"],
  "/admin/cms/branch": ["branch_admin"],
  "/admin/cms/publish": ["super_admin"],
  "/admin/cms/public-files": ["super_admin", "branch_admin"],
  "/admin/cms/channels": ["super_admin"],
};

/** 分会管理员 CMS 菜单 — 仅本分站栏目，不含总学会首页/简介等 */
const BRANCH_CMS_MENU_ITEMS: MenuItem[] = [
  { path: "/admin/cms/branch", label: "分会栏目", icon: "Building2" },
  { path: "/admin/cms/announcements", label: "通知公告", icon: "Megaphone" },
  { path: "/admin/cms/gallery", label: "历史相册", icon: "Images" },
  { path: "/admin/cms/science", label: "科学传播", icon: "BookOpen" },
  { path: "/admin/cms/services", label: "学会服务", icon: "Handshake" },
  { path: "/admin/cms/awards", label: "获奖成果", icon: "Award" },
  { path: "/admin/cms/downloads", label: "资料下载", icon: "Download" },
  { path: "/admin/cms/media", label: "媒体库", icon: "FolderOpen" },
  { path: "/admin/cms/public-files", label: "公开文件管理", icon: "FolderUp" },
];

const ALL_MENU_ITEMS: MenuItem[] = [
  { path: "/admin/dashboard", label: "首页仪表盘", icon: "LayoutDashboard" },
  { path: "/admin/audit", label: "审核工作台", icon: "ClipboardCheck" },
  {
    path: "/admin/users",
    label: "用户管理",
    icon: "Users",
    children: [
      { path: "/admin/users/non-members", label: "非会员用户管理", icon: "User" },
      { path: "/admin/users/members", label: "会员用户管理", icon: "UserCheck" },
    ],
  },
  { path: "/admin/conferences", label: "会议管理", icon: "Calendar" },
  { path: "/admin/statistics", label: "数据统计", icon: "BarChart3" },
  { path: "/admin/finance", label: "财务记录", icon: "Receipt" },
  { path: "/admin/branches", label: "学会/分会管理", icon: "Building2" },
  {
    path: "/admin/cms",
    label: "内容管理",
    icon: "FileText",
    children: [
      {
        path: "/admin/cms-group/home",
        label: "首页",
        icon: "LayoutDashboard",
        children: [
          { path: "/admin/cms/banners", label: "轮播图", icon: "Image" },
          { path: "/admin/cms/news", label: "新闻动态", icon: "Newspaper" },
        ],
      },
      { path: "/admin/cms/pages", label: "学会简介", icon: "FileText" },
      {
        path: "/admin/cms-group/structure",
        label: "组织机构",
        icon: "Building2",
        children: [
          { path: "/admin/cms/personnel", label: "人员信息", icon: "Users" },
          { path: "/admin/cms/branch", label: "分会内容", icon: "Building2" },
        ],
      },
      { path: "/admin/cms/services", label: "学会服务", icon: "Handshake" },
      { path: "/admin/cms/party", label: "党建文化", icon: "Flag" },
      { path: "/admin/cms/timeline", label: "学会沿革", icon: "Clock" },
      { path: "/admin/cms/gallery", label: "历史相册", icon: "Images" },
      { path: "/admin/cms/announcements", label: "会员公告", icon: "Megaphone" },
      { path: "/admin/cms/international", label: "国际交流", icon: "Globe" },
      { path: "/admin/cms/downloads", label: "资料下载", icon: "Download" },
      { path: "/admin/cms/regulations", label: "规章条例", icon: "BookOpen" },
      { path: "/admin/cms/media", label: "媒体库", icon: "FolderOpen" },
      { path: "/admin/cms/settings", label: "站点配置", icon: "Settings" },
      { path: "/admin/cms/publish", label: "新闻发布", icon: "Newspaper" },
      { path: "/admin/cms/public-files", label: "公开文件管理", icon: "FolderUp" },
    ],
  },
];

// ============================================================================
// DEFAULT CONFERENCE DATA (seed)
// ============================================================================

const DEFAULT_CONFERENCES: ConferenceRecord[] = [
  {
    id: "conf-zgswxh-1",
    name: "中国古生物学会第32届学术年会",
    branchId: TOTAL_SOCIETY_ID,
    branchName: ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID],
    startDate: "2026-10-15",
    endDate: "2026-10-19",
    location: "江苏 · 南京",
    memberFee: 1500,
    nonMemberFee: 1800,
    feeConfig: {
      studentMember: 1000,
      nonStudentMember: 1500,
      studentNonMember: 1200,
      nonStudentNonMember: 1800,
    },
    paymentDeadline: "2026-09-15",
    abstractDeadline: "2026-09-15",
    accommodationDeadline: "2026-10-08",
    fieldTripDeadline: "2026-10-08",
    fieldTripRoutes: createDefaultFieldTripRoutes("zgs1", "南京"),
    status: "published",
    sessions: [
      { id: "zs1", name: "大会报告" },
      { id: "zs2", name: "分会场交流" },
    ],
    registrations: 0,
  },
  {
    id: "conf-zgswxh-2",
    name: "中国古生物学会国际古生物学前沿论坛",
    branchId: TOTAL_SOCIETY_ID,
    branchName: ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID],
    startDate: "2027-04-10",
    endDate: "2027-04-13",
    location: "北京 · 中国科学院",
    memberFee: 2000,
    nonMemberFee: 2400,
    feeConfig: {
      studentMember: 1500,
      nonStudentMember: 2000,
      studentNonMember: 1800,
      nonStudentNonMember: 2400,
    },
    paymentDeadline: "2027-03-15",
    abstractDeadline: "2027-03-01",
    accommodationDeadline: "2027-04-03",
    fieldTripDeadline: "2027-04-03",
    fieldTripRoutes: createDefaultFieldTripRoutes("zgs2", "北京"),
    status: "published",
    sessions: [{ id: "zs3", name: "国际前沿报告" }],
    registrations: 0,
  },
  {
    id: "conf-1", name: "第三届全国微体学学术研讨会", branchId: "wtxfh",
    branchName: "微体学分会", startDate: "2026-09-15", endDate: "2026-09-18",
    location: "南京", memberFee: 1200, nonMemberFee: 1320,
    // Phase 1: 四类会议费配置
    feeConfig: {
      studentMember: 800,
      nonStudentMember: 1200,
      studentNonMember: 900,
      nonStudentNonMember: 1500,
    },
    paymentDeadline: "2026-08-15", abstractDeadline: "2026-07-30",
    accommodationDeadline: "2026-09-08",
    fieldTripDeadline: "2026-09-08",
    fieldTripRoutes: createDefaultFieldTripRoutes("s1", "南京"),
    status: "published",
    sessions: [{ id: "s1", name: "微体化石与生物地层学" }, { id: "s2", name: "微体古生态与古环境" }],
    registrations: 0,
  },
  {
    id: "conf-2", name: "古植物学与古气候重建研讨会", branchId: "gzwxfh",
    branchName: "古植物学分会", startDate: "2026-10-10", endDate: "2026-10-13",
    location: "北京", memberFee: 800, nonMemberFee: 880,
    // Phase 1: 四类会议费配置
    feeConfig: {
      studentMember: 600,
      nonStudentMember: 800,
      studentNonMember: 700,
      nonStudentNonMember: 1000,
    },
    paymentDeadline: "2026-09-10", abstractDeadline: "2026-08-25",
    accommodationDeadline: "2026-10-03",
    fieldTripDeadline: "2026-10-03",
    fieldTripRoutes: createDefaultFieldTripRoutes("s2", "北京"),
    status: "published",
    sessions: [{ id: "s1", name: "古植物系统分类" }],
    registrations: 0,
  },
  {
    id: "conf-3", name: "古脊椎动物学前沿论坛", branchId: "gjzdw",
    branchName: "古脊椎动物学分会", startDate: "2026-11-20", endDate: "2026-11-23",
    location: "西安", memberFee: 1500, nonMemberFee: 1650,
    // Phase 1: 四类会议费配置
    feeConfig: {
      studentMember: 1000,
      nonStudentMember: 1500,
      studentNonMember: 1200,
      nonStudentNonMember: 1800,
    },
    paymentDeadline: "2026-10-20", abstractDeadline: "2026-10-05",
    accommodationDeadline: "2026-11-13",
    fieldTripDeadline: "2026-11-13",
    fieldTripRoutes: createDefaultFieldTripRoutes("s3", "西安"),
    status: "published",
    sessions: [{ id: "s1", name: "恐龙与中生代生态" }, { id: "s2", name: "早期人类演化" }],
    registrations: 0,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function addWorkdays(dateStr: string, workdays: number): string {
  const d = new Date(dateStr + "T00:00:00");
  let added = 0;
  while (added < workdays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().split("T")[0];
}

// Phase 1: 数据权限过滤 —— 分会管理员只能看到本分会的数据
function filterByBranchScope<T extends Record<string, unknown>>(
  data: T[],
  branchField: keyof T,
  adminRole: AdminRole,
  adminBranchId: string | null,
): T[] {
  if (adminRole === "branch_admin" && adminBranchId) {
    return data.filter(item => item[branchField] === adminBranchId);
  }
  return data;
}

/** 分会管理员获取可见的分会成员（boundBranches 包含该分会 ID 的用户） */
function filterMembersByBranchScope(
  members: MemberRecord[],
  adminRole: AdminRole,
  adminBranchId: string | null,
): MemberRecord[] {
  if (adminRole === "branch_admin" && adminBranchId) {
    return members.filter(m => m.boundBranches.includes(adminBranchId));
  }
  return members;
}

function buildReviewItem(
  email: string,
  user: { name?: string; email: string; role?: string },
  type: "society_fee" | "conference_fee",
  confId?: string
): ReviewItem {
  const membershipKey = `paleo_admin_society_membership_${email}`;
  const storedMembership = localStorage.getItem(membershipKey);
  const membership = storedMembership ? JSON.parse(storedMembership) : null;
  const confsKey = `paleo_admin_confs_${email}`;
  const storedConfs = localStorage.getItem(confsKey);
  const confRegs = storedConfs ? JSON.parse(storedConfs) : {};

  if (type === "society_fee" && membership) {
    const lastPayment = membership.history?.slice(-1)[0];
    return {
      id: `voucher-${email}-society`,
      userEmail: email,
      userName: user.name || email,
      type: "society_fee",
      targetName: "中国古生物学会会员费",
      amount: lastPayment?.amount || 200,
      voucherUrl: lastPayment?.voucherUrl || "",
      invoiceUrl: lastPayment?.invoiceUrl || "",
      submitTime: lastPayment?.submitTime || "",
      status: membership.status || "not_member",
      rejectReason: membership.voucherRejectReason || membership.invoiceRejectReason,
      invoiceDeadline: membership.invoiceDeadline || membership.invoiceExtendedDeadline,
      confId: undefined,
    };
  }

  if (type === "conference_fee" && confId && confRegs[confId]) {
    const reg = confRegs[confId];
    const adminConfs: ConferenceRecord[] = JSON.parse(localStorage.getItem("paleo_admin_conferences_db") || "[]");
    const conf = adminConfs.find(c => c.id === confId);
    const userType = (localStorage.getItem(`paleo_admin_user_type_${email}`) || "regular") as UserType;
    const isStudent = user.role === "学生";
    let amount = reg.lockedAmount ?? 0;
    if (!amount && conf?.feeConfig) {
      const feeType = deriveFeeType(userType, isStudent);
      amount = getFeeFromConfig(conf.feeConfig, feeType);
    }
    if (!amount && conf) {
      amount = conf.feeConfig?.nonStudentMember || conf.memberFee || 0;
    }
    return {
      id: `voucher-${email}-${confId}`,
      userEmail: email,
      userName: user.name || email,
      type: "conference_fee",
      targetName: confId,
      amount,
      voucherUrl: reg.paymentVoucher || "",
      invoiceUrl: reg.invoiceUrl || "",
      submitTime: reg.voucherSubmitTime || "",
      status: reg.status || "unpaid",
      rejectReason: reg.voucherRejectReason || reg.invoiceRejectReason,
      invoiceDeadline: reg.invoiceDeadline || reg.invoiceExtendedDeadline,
      confId,
    };
  }

  return {
    id: `voucher-${email}-unknown`,
    userEmail: email,
    userName: user.name || email,
    type,
    targetName: confId || "未知",
    amount: 0,
    voucherUrl: "",
    submitTime: "",
    status: "unknown",
    confId,
  };
}

// ── 统计聚合辅助（基于实收报名记录，非估算） ─────────────────────────────

const REVENUE_CONFERENCE_STATUSES = new Set(["confirmed", "approved_invoice", "active"]);
const MEMBERSHIP_REVENUE_STATUSES = new Set(["approved", "active", "confirmed"]);

function createEmptyFeeBreakdown(): FeeBreakdown {
  return {
    studentMember: { count: 0, amount: 0 },
    nonStudentMember: { count: 0, amount: 0 },
    studentNonMember: { count: 0, amount: 0 },
    nonStudentNonMember: { count: 0, amount: 0 },
  };
}

function accumulateFeeBreakdown(breakdown: FeeBreakdown, feeType: ConferenceFeeType, amount: number): void {
  switch (feeType) {
    case CONFERENCE_FEE_TYPE.STUDENT_MEMBER:
      breakdown.studentMember.count += 1;
      breakdown.studentMember.amount += amount;
      break;
    case CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER:
      breakdown.nonStudentMember.count += 1;
      breakdown.nonStudentMember.amount += amount;
      break;
    case CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER:
      breakdown.studentNonMember.count += 1;
      breakdown.studentNonMember.amount += amount;
      break;
    case CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER:
      breakdown.nonStudentNonMember.count += 1;
      breakdown.nonStudentNonMember.amount += amount;
      break;
  }
}

function aggregateFeeBreakdownFromAttendees(attendees: ConferenceAttendee[], revenueOnly = true): FeeBreakdown {
  const breakdown = createEmptyFeeBreakdown();
  for (const attendee of attendees) {
    if (revenueOnly && !REVENUE_CONFERENCE_STATUSES.has(attendee.paymentStatus)) continue;
    accumulateFeeBreakdown(breakdown, attendee.feeType, attendee.feeAmount);
  }
  return breakdown;
}

function buildFieldTripSummary(
  selections: FieldTripSelections | undefined,
  routes?: { id: string; name: string; phase: string }[]
): string {
  if (!selections || !routes?.length) return "—";
  const routeMap = new Map(routes.map(r => [r.id, r]));
  const parts: string[] = [];
  for (const phase of ["pre", "during", "post"] as const) {
    const ids = selections[phase] || [];
    if (!ids.length) continue;
    const phaseLabel = phase === "pre" ? "会前" : phase === "during" ? "会中" : "会后";
    const names = ids.map(id => routeMap.get(id)?.name || id).join("、");
    parts.push(`${phaseLabel}：${names}`);
  }
  return parts.length ? parts.join("；") : "—";
}

function collectConferenceAttendees(confId: string, conf?: ConferenceRecord): ConferenceAttendee[] {
  const allUsers: { email: string; name?: string; gender?: string; unit?: string; role?: string }[] =
    JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
  const attendees: ConferenceAttendee[] = [];

  for (const u of allUsers) {
    const confsKey = `paleo_admin_confs_${u.email}`;
    const storedConfs = localStorage.getItem(confsKey);
    if (!storedConfs) continue;
    const confRegs = JSON.parse(storedConfs);
    const reg = confRegs[confId];
    if (!reg || reg.status === "unpaid") continue;

    const userType = (localStorage.getItem(`paleo_admin_user_type_${u.email}`) || "regular") as UserType;
    const isStudent = u.role === "学生";
    const feeType = reg.feeType
      ? (reg.feeType as ConferenceFeeType)
      : deriveFeeType(userType, isStudent);

    let feeAmount = reg.lockedAmount ?? 0;
    if (!feeAmount && conf?.feeConfig) {
      feeAmount = getFeeFromConfig(conf.feeConfig, feeType);
    }

    const ftSelections = reg.fieldTripSelections;
    const accType = reg.accommodationType;
    const accLabel = accType ? ACCOMMODATION_TYPE_LABEL[accType] || accType : (reg.accommodation || "—");

    attendees.push({
      email: u.email,
      name: reg.name || u.name || u.email,
      gender: reg.gender || u.gender || "",
      unit: reg.unit || u.unit || "",
      role: reg.role || u.role || "",
      userType: userType === "member" ? "member" : "non_member",
      feeType,
      feeAmount,
      paymentStatus: reg.status || "unpaid",
      reportType: reg.presentationType,
      reportTitle: reg.reportTitle,
      abstractFileName: reg.abstractFileName,
      abstractFileUrl: reg.abstractFileUrl,
      accommodationType: accType,
      accommodationLabel: accLabel,
      fieldTripPre: !!(ftSelections?.pre?.length),
      fieldTripDuring: !!(ftSelections?.during?.length),
      fieldTripPost: !!(ftSelections?.post?.length),
      fieldTripSelections: ftSelections,
      fieldTripSummary: buildFieldTripSummary(ftSelections, conf?.fieldTripRoutes),
      voucherUrl: reg.paymentVoucher,
      invoiceUrl: reg.invoiceUrl,
    });
  }

  return attendees;
}

function countConfirmedAttendees(confId: string, conf?: ConferenceRecord): number {
  return collectConferenceAttendees(confId, conf).filter(a =>
    REVENUE_CONFERENCE_STATUSES.has(a.paymentStatus)
  ).length;
}

/** 管理端审核结果同步至用户端 localStorage（paleo_admin_* → paleo_*） */
function syncAdminToUserStorage(adminKey: string): void {
  const stored = localStorage.getItem(adminKey);
  if (!stored) return;
  const userKey = adminKey.replace("paleo_admin_", "paleo_");
  localStorage.setItem(userKey, stored);
}

/** 导出文件名规范：{姓名}_{身份}_{日期}_{流水号} */
function formatExportFileName(
  userName: string,
  identityLabel: string,
  date: string,
  serialId: string,
  ext: string,
): string {
  const safe = (s: string) => s.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
  return `${safe(userName)}_${safe(identityLabel)}_${safe(date.replace(/[:\s]/g, "-"))}_${safe(serialId)}.${ext}`;
}

function estimateZipEntrySize(content: string, isBase64?: boolean): number {
  if (isBase64 && content.startsWith("data:")) {
    const b64 = content.split(",")[1] || "";
    return Math.ceil(b64.length * 0.75);
  }
  return new Blob([content]).size;
}

const ZIP_MAX_BYTES = 1024 * 1024 * 1024;

class SplitZipBuilder {
  private parts: JSZip[] = [new JSZip()];
  private partSizes: number[] = [0];

  file(path: string, content: string, options?: { base64?: boolean }): void {
    const size = estimateZipEntrySize(content, options?.base64);
    const idx = this.partSizes.length - 1;
    if (this.partSizes[idx] + size > ZIP_MAX_BYTES && this.partSizes[idx] > 0) {
      this.parts.push(new JSZip());
      this.partSizes.push(0);
    }
    const targetIdx = this.partSizes.length - 1;
    this.parts[targetIdx].file(path, content, options);
    this.partSizes[targetIdx] += size;
  }

  async generateAll(): Promise<Blob[]> {
    return Promise.all(this.parts.map(p => p.generateAsync({ type: "blob" })));
  }
}

function buildPaymentTrend(): { month: string; count: number }[] {
  const monthCounts: Record<string, number> = {};
  const allUsers: { email: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");

  const addPayment = (dateStr: string | undefined) => {
    if (!dateStr || dateStr.length < 7) return;
    const month = dateStr.slice(0, 7);
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  };

  for (const u of allUsers) {
    const memStored = localStorage.getItem(`paleo_admin_society_membership_${u.email}`);
    if (memStored) {
      const membership = JSON.parse(memStored);
      for (const h of membership.history || []) {
        if (MEMBERSHIP_REVENUE_STATUSES.has(h.status)) {
          addPayment(h.auditTime || h.submitTime);
        }
      }
    }
    const confsStored = localStorage.getItem(`paleo_admin_confs_${u.email}`);
    if (confsStored) {
      const confRegs = JSON.parse(confsStored);
      for (const confId of Object.keys(confRegs)) {
        const reg = confRegs[confId];
        if (REVENUE_CONFERENCE_STATUSES.has(reg.status)) {
          addPayment(reg.invoiceAuditTime || reg.voucherAuditTime || reg.submitTime);
        }
      }
    }
  }

  return Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));
}

// ============================================================================
// DEMO DATA SEED — populates localStorage with realistic mock data on first load
// so the admin panel shows meaningful data even before the frontend is used.
// ============================================================================

interface SeedUser {
  email: string;
  password: string;
  name: string;
  gender: string;
  unit: string;
  role: string;
  title?: string;
  memberType?: string;
}

interface SeedMembership {
  status: string;
  expiryDate?: string;
  history: {
    id: string;
    type: string;
    targetName: string;
    amount: number;
    voucherUrl: string;
    invoiceUrl?: string;
    submitTime: string;
    auditTime?: string;
    status: string;
  }[];
  voucherRejectReason?: string;
  invoiceRejectReason?: string;
  invoiceDeadline?: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: "demo@paleontology.org.cn",
    password: "demo123",
    name: "演示用户",
    gender: "男",
    unit: "中国古生物学会",
    role: "教师",
    title: "高级工程师",
    memberType: "普通会员",
  },
  {
    email: "wangli@paleontology.org.cn",
    password: "password123",
    name: "王莉",
    gender: "女",
    unit: "北京大学地球与空间科学学院",
    role: "教师",
    title: "副教授",
    memberType: "普通会员",
  },
  {
    email: "zhaoqiang@paleontology.org.cn",
    password: "password123",
    name: "赵强",
    gender: "男",
    unit: "中国地质大学（武汉）",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  // ── 古脊椎动物学分会 (gjzdw) — 补充用户 ──
  {
    email: "chenming@paleontology.org.cn",
    password: "password123",
    name: "陈明",
    gender: "男",
    unit: "中国科学院古脊椎动物与古人类研究所",
    role: "教师",
    title: "副研究员",
    memberType: "普通会员",
  },
  {
    email: "liuxia@paleontology.org.cn",
    password: "password123",
    name: "刘霞",
    gender: "女",
    unit: "西北大学地质学系",
    role: "教师",
    title: "教授",
    memberType: "普通会员",
  },
  {
    email: "zhouwei@paleontology.org.cn",
    password: "password123",
    name: "周伟",
    gender: "男",
    unit: "云南大学古生物研究院",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  {
    email: "sunfang@paleontology.org.cn",
    password: "password123",
    name: "孙芳",
    gender: "女",
    unit: "北京自然博物馆",
    role: "教师",
    title: "馆员",
    memberType: "普通会员",
  },
  {
    email: "wulei@paleontology.org.cn",
    password: "password123",
    name: "吴磊",
    gender: "男",
    unit: "中国地质科学院",
    role: "学生",
    title: "硕士研究生",
    memberType: "普通会员",
  },
  // ── 微体学分会 (wtxfh) — 补充用户 ──
  {
    email: "huangjing@paleontology.org.cn",
    password: "password123",
    name: "黄静",
    gender: "女",
    unit: "南京地质古生物研究所",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  {
    email: "mayun@paleontology.org.cn",
    password: "password123",
    name: "马云",
    gender: "男",
    unit: "同济大学海洋地质国家重点实验室",
    role: "教师",
    title: "副教授",
    memberType: "普通会员",
  },
  {
    email: "linjia@paleontology.org.cn",
    password: "password123",
    name: "林佳",
    gender: "女",
    unit: "中国石油大学（华东）",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  {
    email: "zhengtao@paleontology.org.cn",
    password: "password123",
    name: "郑涛",
    gender: "男",
    unit: "北京大学地球与空间科学学院",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  // ── 古植物学分会 (gzwxfh) — 补充用户 ──
  {
    email: "heping@paleontology.org.cn",
    password: "password123",
    name: "何平",
    gender: "男",
    unit: "中国科学院植物研究所",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  {
    email: "gaoyuan@paleontology.org.cn",
    password: "password123",
    name: "高远",
    gender: "男",
    unit: "吉林大学古生物学与地层学研究中心",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  {
    email: "duanli@paleontology.org.cn",
    password: "password123",
    name: "段丽",
    gender: "女",
    unit: "兰州大学地质科学与矿产资源学院",
    role: "教师",
    title: "副教授",
    memberType: "普通会员",
  },
  // ── 孢粉学分会 (bfxfh) — 补充用户 ──
  {
    email: "xuyang@paleontology.org.cn",
    password: "password123",
    name: "徐洋",
    gender: "男",
    unit: "中国科学院植物研究所",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  {
    email: "caijie@paleontology.org.cn",
    password: "password123",
    name: "蔡洁",
    gender: "女",
    unit: "中山大学地球科学与工程学院",
    role: "教师",
    title: "教授",
    memberType: "普通会员",
  },
  {
    email: "fangyi@paleontology.org.cn",
    password: "password123",
    name: "方毅",
    gender: "男",
    unit: "中国地质科学院水文地质环境地质研究所",
    role: "教师",
    title: "高级工程师",
    memberType: "普通会员",
  },
  // ── 地球生物学分会 (dqswx) — 补充用户 ──
  {
    email: "huxue@paleontology.org.cn",
    password: "password123",
    name: "胡雪",
    gender: "女",
    unit: "中国地质大学（武汉）",
    role: "教师",
    title: "教授",
    memberType: "普通会员",
  },
  {
    email: "jiangbo@paleontology.org.cn",
    password: "password123",
    name: "江波",
    gender: "男",
    unit: "成都理工大学沉积地质研究院",
    role: "学生",
    title: "硕士研究生",
    memberType: "普通会员",
  },
  {
    email: "qinyi@paleontology.org.cn",
    password: "password123",
    name: "秦怡",
    gender: "女",
    unit: "西北大学地质学系",
    role: "教师",
    title: "讲师",
    memberType: "普通会员",
  },
  // ── 古生态专业分会 (gst) — 补充用户 ──
  {
    email: "shilei@paleontology.org.cn",
    password: "password123",
    name: "石磊",
    gender: "男",
    unit: "中国科学院南京地质古生物研究所",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  {
    email: "panshan@paleontology.org.cn",
    password: "password123",
    name: "潘珊",
    gender: "女",
    unit: "云南大学地球科学学院",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  // ── 生物沉积学分会 (swcj) — 补充用户 ──
  {
    email: "luojun@paleontology.org.cn",
    password: "password123",
    name: "罗军",
    gender: "男",
    unit: "中国矿业大学资源与地球科学学院",
    role: "教师",
    title: "副教授",
    memberType: "普通会员",
  },
  // ── 古无脊椎动物学分会 (gwjzdwxfh) ──
  {
    email: "tangwei@paleontology.org.cn",
    password: "password123",
    name: "唐伟",
    gender: "男",
    unit: "中国科学院南京地质古生物研究所",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  {
    email: "renjie@paleontology.org.cn",
    password: "password123",
    name: "任杰",
    gender: "男",
    unit: "中国地质科学院地质研究所",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
  {
    email: "yujuan@paleontology.org.cn",
    password: "password123",
    name: "于娟",
    gender: "女",
    unit: "贵州大学资源与环境工程学院",
    role: "教师",
    title: "教授",
    memberType: "普通会员",
  },
  // ── 科普工作委员会 (kpgzwyh) ──
  {
    email: "xurui@paleontology.org.cn",
    password: "password123",
    name: "许瑞",
    gender: "男",
    unit: "北京自然博物馆",
    role: "教师",
    title: "副研究馆员",
    memberType: "普通会员",
  },
  {
    email: "konglin@paleontology.org.cn",
    password: "password123",
    name: "孔琳",
    gender: "女",
    unit: "上海自然博物馆",
    role: "教师",
    title: "馆员",
    memberType: "普通会员",
  },
  // ── 化石藻类专业委员会 (hszlzwyh) ──
  {
    email: "mengfei@paleontology.org.cn",
    password: "password123",
    name: "孟菲",
    gender: "女",
    unit: "中国地质大学（北京）",
    role: "教师",
    title: "副教授",
    memberType: "普通会员",
  },
  {
    email: "songyang@paleontology.org.cn",
    password: "password123",
    name: "宋洋",
    gender: "男",
    unit: "长江大学地球科学学院",
    role: "学生",
    title: "硕士研究生",
    memberType: "普通会员",
  },
  // ── 新技术新方法专业委员会 (xjsxff) ──
  {
    email: "bailing@paleontology.org.cn",
    password: "password123",
    name: "白玲",
    gender: "女",
    unit: "中国科学院地质与地球物理研究所",
    role: "教师",
    title: "研究员",
    memberType: "普通会员",
  },
  {
    email: "guodong@paleontology.org.cn",
    password: "password123",
    name: "郭东",
    gender: "男",
    unit: "浙江大学地球科学学院",
    role: "学生",
    title: "博士研究生",
    memberType: "普通会员",
  },
];

function makeActiveMembership(amount: number, submitDate: string): SeedMembership {
  return {
    status: "active",
    expiryDate: "2026-12-31",
    history: [
      {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "society_fee",
        targetName: "中国古生物学会会员费",
        amount,
        voucherUrl: "",
        submitTime: submitDate,
        auditTime: submitDate.replace(/\d{2}:\d{2}$/, "09:00"),
        status: "active",
      },
    ],
  };
}

function makeStudentMembership(amount: number, submitDate: string): SeedMembership {
  return {
    status: "active",
    expiryDate: "2026-12-31",
    history: [
      {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "society_fee",
        targetName: "中国古生物学会会员费",
        amount,
        voucherUrl: "",
        submitTime: submitDate,
        auditTime: submitDate.replace(/\d{2}:\d{2}$/, "09:00"),
        status: "active",
      },
    ],
  };
}

const SEED_MEMBERSHIPS: Record<string, SeedMembership> = {
  // 演示用户 — 非会员（路径A）
  "demo@paleontology.org.cn": {
    status: "not_member",
    history: [],
  },
  // 王莉 — 待上传发票
  "wangli@paleontology.org.cn": {
    status: "invoice_pending",
    invoiceDeadline: "2026-06-21",
    history: [
      {
        id: "pay-wl-1",
        type: "society_fee",
        targetName: "中国古生物学会会员费",
        amount: 200,
        voucherUrl: "",
        submitTime: "2026-06-08 09:00",
        auditTime: "2026-06-10 14:00",
        status: "invoice_pending",
      },
    ],
  },
  // 赵强 — 已过期
  "zhaoqiang@paleontology.org.cn": {
    status: "expired",
    expiryDate: "2025-12-31",
    history: [
      {
        id: "pay-zq-1",
        type: "society_fee",
        targetName: "中国古生物学会会员费",
        amount: 100,
        voucherUrl: "",
        submitTime: "2025-01-10 11:00",
        auditTime: "2025-01-12 08:30",
        status: "active",
      },
    ],
  },
  // ── 古脊椎动物学分会补充 ──
  "chenming@paleontology.org.cn": makeActiveMembership(200, "2026-02-20 15:00"),
  "liuxia@paleontology.org.cn": makeActiveMembership(200, "2026-01-08 10:30"),
  "zhouwei@paleontology.org.cn": makeStudentMembership(100, "2026-04-12 16:45"),
  "sunfang@paleontology.org.cn": makeActiveMembership(200, "2026-05-03 09:15"),
  "wulei@paleontology.org.cn": makeStudentMembership(100, "2026-03-28 11:00"),
  // ── 微体学分会补充 ──
  "huangjing@paleontology.org.cn": makeActiveMembership(200, "2026-02-14 08:20"),
  "mayun@paleontology.org.cn": makeActiveMembership(200, "2026-04-01 13:10"),
  "linjia@paleontology.org.cn": makeStudentMembership(100, "2026-05-18 10:50"),
  "zhengtao@paleontology.org.cn": makeActiveMembership(200, "2026-01-22 14:00"),
  // ── 古植物学分会补充 ──
  "heping@paleontology.org.cn": makeActiveMembership(200, "2026-03-05 09:30"),
  "gaoyuan@paleontology.org.cn": makeStudentMembership(100, "2026-05-25 15:20"),
  "duanli@paleontology.org.cn": makeActiveMembership(200, "2026-02-18 11:45"),
  // ── 孢粉学分会补充 ──
  "xuyang@paleontology.org.cn": makeStudentMembership(100, "2026-04-08 10:00"),
  "caijie@paleontology.org.cn": makeActiveMembership(200, "2026-01-30 08:40"),
  "fangyi@paleontology.org.cn": makeActiveMembership(200, "2026-03-12 16:30"),
  // ── 地球生物学分会补充 ──
  "huxue@paleontology.org.cn": makeActiveMembership(200, "2026-02-22 09:50"),
  "jiangbo@paleontology.org.cn": makeStudentMembership(100, "2026-06-02 14:15"),
  "qinyi@paleontology.org.cn": makeActiveMembership(200, "2026-04-16 10:35"),
  // ── 古生态专业分会补充 ──
  "shilei@paleontology.org.cn": makeActiveMembership(200, "2026-01-15 08:10"),
  "panshan@paleontology.org.cn": makeStudentMembership(100, "2026-05-08 13:25"),
  // ── 生物沉积学分会补充 ──
  "luojun@paleontology.org.cn": makeActiveMembership(200, "2026-03-20 09:55"),
  // ── 古无脊椎动物学分会 ──
  "tangwei@paleontology.org.cn": makeActiveMembership(200, "2026-02-28 14:40"),
  "renjie@paleontology.org.cn": makeStudentMembership(100, "2026-04-22 11:05"),
  "yujuan@paleontology.org.cn": makeActiveMembership(200, "2026-01-18 15:30"),
  // ── 科普工作委员会 ──
  "xurui@paleontology.org.cn": makeActiveMembership(200, "2026-05-12 08:55"),
  "konglin@paleontology.org.cn": makeActiveMembership(200, "2026-03-08 10:15"),
  // ── 化石藻类专业委员会 ──
  "mengfei@paleontology.org.cn": makeActiveMembership(200, "2026-04-05 13:50"),
  "songyang@paleontology.org.cn": makeStudentMembership(100, "2026-06-05 09:20"),
  // ── 新技术新方法专业委员会 ──
  "bailing@paleontology.org.cn": makeActiveMembership(200, "2026-02-10 11:30"),
  "guodong@paleontology.org.cn": makeStudentMembership(100, "2026-05-30 16:00"),
};

const SEED_BRANCH_BINDINGS: Record<string, string[]> = {
  // 原有用户
  "demo@paleontology.org.cn": ["gjzdw", "wtxfh"],
  "wangli@paleontology.org.cn": ["wtxfh", "gzwxfh", "swcj"],
  "zhaoqiang@paleontology.org.cn": ["gjzdw"],
  // ── 古脊椎动物学分会 (gjzdw) — 目标 ~8 人 ──
  "chenming@paleontology.org.cn": ["gjzdw"],
  "liuxia@paleontology.org.cn": ["gjzdw", "gzwxfh"],
  "zhouwei@paleontology.org.cn": ["gjzdw"],
  "sunfang@paleontology.org.cn": ["gjzdw", "kpgzwyh"],
  "wulei@paleontology.org.cn": ["gjzdw"],
  // ── 微体学分会 (wtxfh) — 目标 ~6 人 ──
  "huangjing@paleontology.org.cn": ["wtxfh", "hszlzwyh"],
  "mayun@paleontology.org.cn": ["wtxfh"],
  "linjia@paleontology.org.cn": ["wtxfh"],
  "zhengtao@paleontology.org.cn": ["wtxfh", "dqswx"],
  // ── 古植物学分会 (gzwxfh) — 目标 ~5 人 ──
  "heping@paleontology.org.cn": ["gzwxfh"],
  "gaoyuan@paleontology.org.cn": ["gzwxfh"],
  "duanli@paleontology.org.cn": ["gzwxfh", "bfxfh"],
  // ── 孢粉学分会 (bfxfh) — 目标 ~4 人 ──
  "xuyang@paleontology.org.cn": ["bfxfh"],
  "caijie@paleontology.org.cn": ["bfxfh"],
  "fangyi@paleontology.org.cn": ["bfxfh", "wtxfh"],
  // ── 地球生物学分会 (dqswx) — 目标 ~4 人 ──
  "huxue@paleontology.org.cn": ["dqswx"],
  "jiangbo@paleontology.org.cn": ["dqswx"],
  "qinyi@paleontology.org.cn": ["dqswx", "gst"],
  // ── 古生态专业分会 (gst) — 目标 ~3 人 ──
  "shilei@paleontology.org.cn": ["gst"],
  "panshan@paleontology.org.cn": ["gst", "gjzdw"],
  // ── 生物沉积学分会 (swcj) — 目标 ~2 人 ──
  "luojun@paleontology.org.cn": ["swcj"],
  // ── 古无脊椎动物学分会 (gwjzdwxfh) — 目标 ~3 人 ──
  "tangwei@paleontology.org.cn": ["gwjzdwxfh"],
  "renjie@paleontology.org.cn": ["gwjzdwxfh"],
  "yujuan@paleontology.org.cn": ["gwjzdwxfh", "dqswx"],
  // ── 科普工作委员会 (kpgzwyh) — 目标 ~2 人 ──
  "xurui@paleontology.org.cn": ["kpgzwyh"],
  "konglin@paleontology.org.cn": ["kpgzwyh", "gjzdw"],
  // ── 化石藻类专业委员会 (hszlzwyh) — 目标 ~2 人 ──
  "mengfei@paleontology.org.cn": ["hszlzwyh"],
  "songyang@paleontology.org.cn": ["hszlzwyh"],
  // ── 新技术新方法专业委员会 (xjsxff) — 目标 ~2 人 ──
  "bailing@paleontology.org.cn": ["xjsxff"],
  "guodong@paleontology.org.cn": ["xjsxff", "wtxfh"],
};

const SEED_USER_TYPES: Record<string, string> = {
  "demo@paleontology.org.cn": "non_member",
  "wangli@paleontology.org.cn": "member",
  "zhaoqiang@paleontology.org.cn": "member",
  "chenming@paleontology.org.cn": "member",
  "liuxia@paleontology.org.cn": "member",
  "zhouwei@paleontology.org.cn": "member",
  "sunfang@paleontology.org.cn": "member",
  "wulei@paleontology.org.cn": "member",
  "huangjing@paleontology.org.cn": "member",
  "mayun@paleontology.org.cn": "member",
  "linjia@paleontology.org.cn": "member",
  "zhengtao@paleontology.org.cn": "member",
  "heping@paleontology.org.cn": "member",
  "gaoyuan@paleontology.org.cn": "member",
  "duanli@paleontology.org.cn": "member",
  "xuyang@paleontology.org.cn": "member",
  "caijie@paleontology.org.cn": "member",
  "fangyi@paleontology.org.cn": "member",
  "huxue@paleontology.org.cn": "member",
  "jiangbo@paleontology.org.cn": "member",
  "qinyi@paleontology.org.cn": "member",
  "shilei@paleontology.org.cn": "member",
  "panshan@paleontology.org.cn": "member",
  "luojun@paleontology.org.cn": "member",
  "tangwei@paleontology.org.cn": "member",
  "renjie@paleontology.org.cn": "member",
  "yujuan@paleontology.org.cn": "member",
  "xurui@paleontology.org.cn": "member",
  "konglin@paleontology.org.cn": "member",
  "mengfei@paleontology.org.cn": "member",
  "songyang@paleontology.org.cn": "member",
  "bailing@paleontology.org.cn": "member",
  "guodong@paleontology.org.cn": "member",
};

/** 演示用摘要文件（纯文本 data URL） */
const DEMO_ABSTRACT_DATA_URL =
  "data:text/plain;charset=utf-8," + encodeURIComponent("【演示摘要】本报告为系统演示数据，展示摘要上传与统计功能。");

type SeedConferenceReg = Record<string, Record<string, unknown>>;

function makeDemoConfReg(
  opts: {
    name: string;
    gender: "男" | "女";
    unit: string;
    role: string;
    feeType: ConferenceFeeType;
    lockedAmount: number;
    presentationType: "口头报告" | "展板报告" | "仅参会";
    reportTitle?: string;
    withAbstract?: boolean;
    accommodationType: string;
    fieldTripSelections?: FieldTripSelections;
  }
): Record<string, unknown> {
  return {
    status: "confirmed",
    name: opts.name,
    gender: opts.gender,
    unit: opts.unit,
    role: opts.role,
    presentationType: opts.presentationType,
    reportTitle: opts.reportTitle,
    abstractFileName: opts.withAbstract ? `${opts.name}_摘要.docx` : undefined,
    abstractFileUrl: opts.withAbstract ? DEMO_ABSTRACT_DATA_URL : undefined,
    abstractSubmitTime: opts.withAbstract ? "2026-08-20 10:00" : undefined,
    accommodationType: opts.accommodationType,
    accommodation: ACCOMMODATION_TYPE_LABEL[opts.accommodationType] || opts.accommodationType,
    session: "主会场",
    feeType: opts.feeType,
    lockedAmount: opts.lockedAmount,
    fieldTripSelections: opts.fieldTripSelections || createEmptyFieldTripSelections(),
    lastUpdated: "2026-08-22 15:30",
    paymentVoucher: "",
    invoiceUrl: "",
  };
}

/** 各用户会议报名 + 参会提交信息（报告/住宿/野外）演示数据 */
const SEED_CONFERENCE_SUBMISSIONS: SeedConferenceReg = {
  "demo@paleontology.org.cn": {
    "conf-zgswxh-1": makeDemoConfReg({
      name: "演示用户",
      gender: "男",
      unit: "中国古生物学会",
      role: "教师",
      feeType: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER,
      lockedAmount: 1800,
      presentationType: "仅参会",
      accommodationType: ACCOMMODATION_TYPE.SELF_ARRANGED,
    }),
  },
  "huangjing@paleontology.org.cn": {
    "conf-1": makeDemoConfReg({
      name: "黄静",
      gender: "女",
      unit: "中国科学院南京地质古生物研究所",
      role: "教师",
      feeType: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER,
      lockedAmount: 1200,
      presentationType: "口头报告",
      reportTitle: "西藏南部渐新世微体化石组合",
      withAbstract: true,
      accommodationType: ACCOMMODATION_TYPE.FEMALE_SINGLE,
      fieldTripSelections: { pre: ["s1-pre-1"], during: [], post: [] },
    }),
  },
  "chenming@paleontology.org.cn": {
    "conf-3": makeDemoConfReg({
      name: "陈明",
      gender: "男",
      unit: "北京大学地球与空间科学学院",
      role: "教师",
      feeType: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER,
      lockedAmount: 1500,
      presentationType: "口头报告",
      reportTitle: "辽西地区侏罗纪翼龙类新材料",
      withAbstract: true,
      accommodationType: ACCOMMODATION_TYPE.MALE_DOUBLE,
      fieldTripSelections: { pre: ["s3-pre-1"], during: ["s3-during-1"], post: ["s3-post-1"] },
    }),
  },
  "wulei@paleontology.org.cn": {
    "conf-3": makeDemoConfReg({
      name: "吴磊",
      gender: "男",
      unit: "吉林大学地球科学学院",
      role: "学生",
      feeType: CONFERENCE_FEE_TYPE.STUDENT_MEMBER,
      lockedAmount: 1000,
      presentationType: "展板报告",
      reportTitle: "陕西蓝田地区上新世哺乳动物化石",
      withAbstract: true,
      accommodationType: ACCOMMODATION_TYPE.MALE_DOUBLE,
      fieldTripSelections: { pre: [], during: ["s3-during-2"], post: [] },
    }),
  },
};

const DEMO_SUBMISSIONS_SEED_VERSION = "1";

function seedDemoConferenceSubmissions() {
  if (localStorage.getItem("paleo_admin_demo_submissions_v") === DEMO_SUBMISSIONS_SEED_VERSION) return;

  for (const [email, confRegs] of Object.entries(SEED_CONFERENCE_SUBMISSIONS)) {
    const adminKey = `paleo_admin_confs_${email}`;
    const existing = JSON.parse(localStorage.getItem(adminKey) || "{}");
    const merged = { ...existing, ...confRegs };
    localStorage.setItem(adminKey, JSON.stringify(merged));
    syncAdminToUserStorage(adminKey);
  }

  const stored = localStorage.getItem("paleo_admin_conferences_db");
  const confs: ConferenceRecord[] = stored ? JSON.parse(stored) : [...DEFAULT_CONFERENCES];
  for (const conf of confs) {
    conf.registrations = countConfirmedAttendees(conf.id, conf);
  }
  localStorage.setItem("paleo_admin_conferences_db", JSON.stringify(confs));

  localStorage.setItem("paleo_admin_demo_submissions_v", DEMO_SUBMISSIONS_SEED_VERSION);
  console.log("[Admin] Seeded demo conference submissions (reports / accommodation / field trips)");
}

function seedDemoData() {
  // Only seed if no user data exists yet
  if (localStorage.getItem("paleo_admin_all_users")) return;

  // 1. Write user DB (credentials)
  localStorage.setItem("paleo_admin_user_db", JSON.stringify(SEED_USERS));

  // 2. Write all users list (without passwords)
  const allUsers = SEED_USERS.map(({ password, ...u }) => u);
  localStorage.setItem("paleo_admin_all_users", JSON.stringify(allUsers));

  // 3. Write membership data per user
  for (const [email, membership] of Object.entries(SEED_MEMBERSHIPS)) {
    localStorage.setItem(`paleo_admin_society_membership_${email}`, JSON.stringify(membership));
  }

  // 4. Write branch bindings
  for (const [email, branches] of Object.entries(SEED_BRANCH_BINDINGS)) {
    localStorage.setItem(`paleo_admin_bound_branches_${email}`, JSON.stringify(branches));
  }

  // 5. Write user types
  for (const [email, userType] of Object.entries(SEED_USER_TYPES)) {
    localStorage.setItem(`paleo_admin_user_type_${email}`, userType);
  }

  // 6. Write choice-made flag so users don't see the choice dialog
  for (const email of Object.keys(SEED_USER_TYPES)) {
    localStorage.setItem(`paleo_admin_choice_made_${email}`, "true");
  }

  console.log(`[Admin] Seeded demo data: ${SEED_USERS.length} users across ${Object.keys(BRANCH_MAP).length} branches`);
}

function mapDirectoryRow(row: ApiMemberDirectoryRow): MemberRecord {
  return {
    userId: row.userId,
    email: row.email,
    name: row.userName || row.email,
    gender: row.gender || "",
    unit: row.unit || "",
    role: row.roleLabel || "",
    memberType: row.memberCategory,
    membershipStatus: row.membershipStatus || MEMBERSHIP_STATUS.NOT_MEMBER,
    boundBranches: Array.isArray(row.boundBranches) ? row.boundBranches : [],
    boundBranchNames: Array.isArray(row.boundBranchNames) ? row.boundBranchNames : undefined,
    expiryDate: row.validEndDate,
    userType: row.userType || "regular",
    disabled: row.membershipStatus === MEMBERSHIP_STATUS.EXPIRED,
  };
}

function sanitizeFileUrl(url?: string): string | undefined {
  if (!url || url.startsWith("data:")) return undefined;
  return url;
}

function sanitizeConferenceData(data: ConferenceData): ConferenceData {
  return {
    ...data,
    publicNoticeUrl: sanitizeFileUrl(data.publicNoticeUrl),
    stampedNoticeUrl: sanitizeFileUrl(data.stampedNoticeUrl),
    abstractTemplateUrl: sanitizeFileUrl(data.abstractTemplateUrl),
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [cmsMenuChildren, setCmsMenuChildren] = useState<MenuItem[] | null>(null);
  const [cmsRoutePermissions, setCmsRoutePermissions] = useState<Record<string, AdminRole[]>>({});
  const [cmsMenuLoaded, setCmsMenuLoaded] = useState(false);
  const adminRoleRef = useRef<AdminRole>("super_admin");

  const triggerRefresh = useCallback(() => setRefreshTrigger(t => t + 1), []);

  // Load persisted admin session
  useEffect(() => {
    const storedEmail = localStorage.getItem("paleo_admin_current_user");
    if (storedEmail) {
      const adminDb = JSON.parse(localStorage.getItem("paleo_admin_db") || JSON.stringify(BUILT_IN_ADMINS));
      const found = adminDb.find((a: AdminUser & { password?: string }) => a.email === storedEmail);
      if (found) {
        setAdminUser({ email: found.email, name: found.name, role: found.role, branchId: found.branchId });
        void ensureCmsAuth().catch(() => {
          console.warn("CMS 后端未连接，审核队列可能无法加载");
        });
      }
    }
    if (!localStorage.getItem("paleo_admin_db")) {
      localStorage.setItem("paleo_admin_db", JSON.stringify(BUILT_IN_ADMINS));
    }
    if (!localStorage.getItem("paleo_admin_conferences_db")) {
      localStorage.setItem("paleo_admin_conferences_db", JSON.stringify(DEFAULT_CONFERENCES));
    }
    // Seed demo data so admin panel has realistic data on first load
    seedDemoData();
    seedDemoConferenceSubmissions();
  }, []);

  // ==========================================
  // AUTH
  // ==========================================

  const adminLogin = useCallback((email: string, password: string): boolean => {
    const adminDb = JSON.parse(localStorage.getItem("paleo_admin_db") || JSON.stringify(BUILT_IN_ADMINS));
    const found = adminDb.find(
      (a: AdminUser & { password: string }) =>
        a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );
    if (found) {
      const user: AdminUser = { email: found.email, name: found.name, role: found.role, branchId: found.branchId };
      setAdminUser(user);
      localStorage.setItem("paleo_admin_current_user", user.email);
      void ensureCmsAuth().catch(() => {
        toast.error("无法连接 CMS 后端，审核功能可能不可用");
      });
      toast.success(`欢迎回来，${user.name}`);
      return true;
    }
    toast.error("账号或密码错误");
    return false;
  }, []);

  const adminLogout = useCallback(() => {
    setAdminUser(null);
    localStorage.removeItem("paleo_admin_current_user");
    toast.success("已安全退出");
  }, []);

  // ==========================================
  // PERMISSIONS
  // ==========================================

  const adminRole: AdminRole = adminUser?.role || "super_admin";
  const adminBranchId: string | null = adminUser?.branchId || null;
  adminRoleRef.current = adminRole;

  const refreshCmsMenu = useCallback(async () => {
    if (!adminUser) {
      setCmsMenuChildren(null);
      setCmsRoutePermissions({});
      setCmsMenuLoaded(false);
      return;
    }
    try {
      const tree = await listCmsChannelTree();
      const menu = buildCmsMenuFromTree(tree, adminRoleRef.current);
      setCmsMenuChildren(menu);
      setCmsRoutePermissions(buildCmsRoutePermissions(tree));
    } catch {
      setCmsMenuChildren(
        adminRoleRef.current === "branch_admin" ? FALLBACK_BRANCH_CMS_MENU : FALLBACK_CMS_MENU
      );
      setCmsRoutePermissions(ROUTE_PERMISSIONS);
    } finally {
      setCmsMenuLoaded(true);
    }
  }, [adminUser]);

  useEffect(() => {
    refreshCmsMenu();
  }, [refreshCmsMenu, adminRole]);

  const mergedRoutePermissions = useMemo(
    () => ({ ...ROUTE_PERMISSIONS, ...cmsRoutePermissions }),
    [cmsRoutePermissions]
  );

  const canAccess = useCallback(
    (path: string): boolean => {
      const allowed = mergedRoutePermissions[path];
      if (!allowed) return false;
      return allowed.includes(adminRole);
    },
    [adminRole, mergedRoutePermissions]
  );

  const filterMenuTree = useCallback(
    (items: MenuItem[]): MenuItem[] => {
      return items
        .map(item => {
          if (item.children && item.children.length > 0) {
            const allowedChildren = filterMenuTree(item.children);
            if (allowedChildren.length === 0) return null;
            return { ...item, children: allowedChildren };
          }
          const allowed = mergedRoutePermissions[item.path];
          if (!allowed || !allowed.includes(adminRole)) return null;
          return item;
        })
        .filter((item): item is MenuItem => item !== null);
    },
    [adminRole, mergedRoutePermissions]
  );

  const getAllowedMenuItems = useCallback((): MenuItem[] => {
    const cmsChildren = cmsMenuChildren ?? (
      adminRole === "branch_admin" ? FALLBACK_BRANCH_CMS_MENU : FALLBACK_CMS_MENU
    );
    const baseItems = ALL_MENU_ITEMS.map(item =>
      item.path === "/admin/cms" && item.children
        ? { ...item, children: cmsChildren }
        : item
    );
    return filterMenuTree(baseItems);
  }, [filterMenuTree, adminRole, cmsMenuChildren]);

  const getDefaultCmsPath = useCallback((): string => {
    const cmsChildren = cmsMenuChildren ?? (
      adminRole === "branch_admin" ? FALLBACK_BRANCH_CMS_MENU : FALLBACK_CMS_MENU
    );
    const findFirstLeaf = (items: MenuItem[]): string | null => {
      for (const item of items) {
        if (item.children?.length) {
          const leaf = findFirstLeaf(item.children);
          if (leaf) return leaf;
        } else if (item.path.startsWith("/admin/cms/") && !item.path.includes("cms-group")) {
          return item.path;
        }
      }
      return null;
    };
    return findFirstLeaf(cmsChildren) ?? (adminRole === "branch_admin" ? "/admin/cms/branch" : "/admin/cms/banners");
  }, [adminRole, cmsMenuChildren]);

  // ==========================================
  // AUDIT — Build review queues (from backend API)
  // ==========================================

  const [pendingVoucherReviews, setPendingVoucherReviews] = useState<ReviewItem[]>([]);
  const [pendingInvoiceReviews, setPendingInvoiceReviews] = useState<ReviewItem[]>([]);

  const loadReviewQueues = useCallback(async () => {
    try {
      const [membershipVouchers, membershipInvoices, conferenceVouchers, conferenceInvoices] = await Promise.all([
        fetchPendingMembershipVouchers(),
        fetchPendingMembershipInvoices(),
        fetchPendingConferenceVouchers(),
        fetchPendingConferenceInvoices(),
      ]);

      const vouchers: ReviewItem[] = [
        ...membershipVouchers.map((p) => ({
          id: `payment-${p.paymentId}`,
          paymentId: p.paymentId,
          userEmail: p.userEmail || "",
          userName: p.userName || p.userEmail || "",
          type: "society_fee" as const,
          targetName: "中国古生物学会会员费",
          amount: Number(p.amount || 0),
          voucherUrl: p.voucherUrl || "",
          invoiceUrl: p.invoiceUrl || "",
          submitTime: p.createTime || "",
          status: mapApiPaymentStatus(p.paymentStatus),
          rejectReason: p.reviewComment,
        })),
        ...conferenceVouchers.map((r) => ({
          id: `registration-${r.registrationId}`,
          registrationId: r.registrationId,
          userEmail: r.userEmail || "",
          userName: r.userName || r.userEmail || "",
          type: "conference_fee" as const,
          targetName: r.conferenceTitle || r.conferenceCode || "学术会议",
          amount: Number(r.feeAmount || 0),
          voucherUrl: r.voucherUrl || "",
          invoiceUrl: r.invoiceUrl || "",
          submitTime: r.voucherSubmitTime || "",
          status: mapApiPaymentStatus(r.paymentStatus),
          rejectReason: r.reviewComment,
          invoiceDeadline: r.invoiceDeadline,
          confId: r.conferenceCode,
        })),
      ];

      const invoices: ReviewItem[] = [
        ...membershipInvoices.map((p) => ({
          id: `payment-${p.paymentId}`,
          paymentId: p.paymentId,
          userEmail: p.userEmail || "",
          userName: p.userName || p.userEmail || "",
          type: "society_fee" as const,
          targetName: "中国古生物学会会员费",
          amount: Number(p.amount || 0),
          voucherUrl: p.voucherUrl || "",
          invoiceUrl: p.invoiceUrl || "",
          submitTime: p.updateTime || p.createTime || "",
          status: mapApiPaymentStatus(p.paymentStatus),
          rejectReason: p.reviewComment,
        })),
        ...conferenceInvoices.map((r) => ({
          id: `registration-${r.registrationId}`,
          registrationId: r.registrationId,
          userEmail: r.userEmail || "",
          userName: r.userName || r.userEmail || "",
          type: "conference_fee" as const,
          targetName: r.conferenceTitle || r.conferenceCode || "学术会议",
          amount: Number(r.feeAmount || 0),
          voucherUrl: r.voucherUrl || "",
          invoiceUrl: r.invoiceUrl || "",
          submitTime: r.invoiceSubmitTime || "",
          status: mapApiPaymentStatus(r.paymentStatus),
          rejectReason: r.reviewComment,
          confId: r.conferenceCode,
        })),
      ];

      setPendingVoucherReviews(vouchers);
      setPendingInvoiceReviews(invoices);
    } catch (e) {
      console.error("加载审核队列失败", e);
    }
  }, []);

  const [pendingMembershipApps, setPendingMembershipApps] = useState<MembershipAppRecord[]>([]);
  const [pendingWithdrawalApps, setPendingWithdrawalApps] = useState<WithdrawalAppRecord[]>([]);
  const [apiMemberRecords, setApiMemberRecords] = useState<MemberRecord[] | null>(null);

  const loadMemberDirectory = useCallback(async () => {
    try {
      const rows = await fetchMemberDirectory();
      setApiMemberRecords((rows ?? []).map(mapDirectoryRow));
    } catch (e) {
      console.error("加载用户会员目录失败", e);
    }
  }, []);

  const loadApplicationQueues = useCallback(async () => {
    try {
      const [joinApps, withdrawApps] = await Promise.all([
        fetchPendingApplications("JOIN"),
        fetchPendingApplications("WITHDRAW"),
      ]);

      setPendingMembershipApps(
        (joinApps ?? []).map((app) => ({
          id: `mem-app-${app.applicationId}`,
          applicationId: app.applicationId,
          userEmail: app.userEmail || app.applicantEmail || "",
          userName: app.userName || app.applicantName || app.userEmail || "",
          applicationFileUrl: app.applicationFileUrl || "",
          applicationFileName: "入会申请书",
          submitTime: app.createTime || "",
          status: MEMBERSHIP_STATUS.APPLICATION_SUBMITTED,
        })),
      );

      setPendingWithdrawalApps(
        (withdrawApps ?? []).map((app) => ({
          id: `wd-app-${app.applicationId}`,
          applicationId: app.applicationId,
          userEmail: app.userEmail || app.applicantEmail || "",
          userName: app.userName || app.applicantName || app.userEmail || "",
          membershipStatus: app.memberStatus || "unknown",
          expiryDate: app.validEndDate,
          applicationFileUrl: app.applicationFileUrl || "",
          applicationFileName: "退会申请书",
          submitTime: app.createTime || "",
          status: MEMBERSHIP_STATUS.WITHDRAWAL_SUBMITTED,
        })),
      );
    } catch (e) {
      console.error("加载入会/退会申请队列失败", e);
    }
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    loadReviewQueues();
    loadApplicationQueues();
    loadMemberDirectory();
    const timer = window.setInterval(() => {
      loadReviewQueues();
      loadApplicationQueues();
      loadMemberDirectory();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [adminUser, refreshTrigger, loadReviewQueues, loadApplicationQueues, loadMemberDirectory]);

  // ==========================================
  // AUDIT — Voucher actions
  // ==========================================

  const findVoucherReviewItem = (
    targetEmail: string,
    type: "society_fee" | "conference_fee",
    confId?: string,
  ) =>
    pendingVoucherReviews.find(
      (item) =>
        item.userEmail === targetEmail &&
        item.type === type &&
        (type === "society_fee" || item.confId === confId),
    );

  const findInvoiceReviewItem = (
    targetEmail: string,
    type: "society_fee" | "conference_fee",
    confId?: string,
  ) =>
    pendingInvoiceReviews.find(
      (item) =>
        item.userEmail === targetEmail &&
        item.type === type &&
        (type === "society_fee" || item.confId === confId),
    );

  const approveVoucher = useCallback(
    (targetEmail: string, type: "society_fee" | "conference_fee", confId?: string) => {
      void (async () => {
        const item = findVoucherReviewItem(targetEmail, type, confId);
        if (!item) {
          toast.error("未找到待审凭证记录");
          return;
        }
        try {
          if (item.paymentId) {
            await reviewMembershipPayment(item.paymentId, "INVOICE_PENDING");
          } else if (item.registrationId) {
            await reviewConferenceRegistration(item.registrationId, "INVOICE_PENDING");
          } else {
            toast.error("无效审核记录");
            return;
          }
          toast.success("初审已通过，已通知用户上传发票");
          triggerRefresh();
          await loadReviewQueues();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "审核失败");
        }
      })();
    },
    [triggerRefresh, pendingVoucherReviews, loadReviewQueues],
  );

  const rejectVoucher = useCallback(
    (targetEmail: string, type: "society_fee" | "conference_fee", reason: string, confId?: string) => {
      void (async () => {
        const item = findVoucherReviewItem(targetEmail, type, confId);
        if (!item) {
          toast.error("未找到待审凭证记录");
          return;
        }
        try {
          if (item.paymentId) {
            await reviewMembershipPayment(item.paymentId, "VOUCHER_REJECTED", reason);
          } else if (item.registrationId) {
            await reviewConferenceRegistration(item.registrationId, "VOUCHER_REJECTED", reason);
          } else {
            toast.error("无效审核记录");
            return;
          }
          toast.success("初审已驳回");
          triggerRefresh();
          await loadReviewQueues();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "审核失败");
        }
      })();
    },
    [triggerRefresh, pendingVoucherReviews, loadReviewQueues],
  );

  const approveInvoice = useCallback(
    (targetEmail: string, type: "society_fee" | "conference_fee", confId?: string) => {
      void (async () => {
        const item = findInvoiceReviewItem(targetEmail, type, confId);
        if (!item) {
          toast.error("未找到待审发票记录");
          return;
        }
        try {
          if (item.paymentId) {
            await reviewMembershipPayment(item.paymentId, "CONFIRMED");
          } else if (item.registrationId) {
            await reviewConferenceRegistration(item.registrationId, "CONFIRMED");
          } else {
            toast.error("无效审核记录");
            return;
          }
          toast.success("终审已通过");
          triggerRefresh();
          await loadReviewQueues();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "审核失败");
        }
      })();
    },
    [triggerRefresh, pendingInvoiceReviews, loadReviewQueues],
  );

  const rejectInvoice = useCallback(
    (targetEmail: string, type: "society_fee" | "conference_fee", reason: string, confId?: string) => {
      void (async () => {
        const item = findInvoiceReviewItem(targetEmail, type, confId);
        if (!item) {
          toast.error("未找到待审发票记录");
          return;
        }
        try {
          if (item.paymentId) {
            await reviewMembershipPayment(item.paymentId, "INVOICE_REJECTED", reason);
          } else if (item.registrationId) {
            await reviewConferenceRegistration(item.registrationId, "INVOICE_REJECTED", reason);
          } else {
            toast.error("无效审核记录");
            return;
          }
          toast.success("终审已驳回");
          triggerRefresh();
          await loadReviewQueues();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "审核失败");
        }
      })();
    },
    [triggerRefresh, pendingInvoiceReviews, loadReviewQueues],
  );

  // ==========================================
  // AUDIT — Batch operations
  // ==========================================

  const batchApproveVoucher = useCallback(
    (ids: string[]) => {
      const toApprove = pendingVoucherReviews.filter((v) => ids.includes(v.id));
      for (const item of toApprove) {
        approveVoucher(item.userEmail, item.type, item.confId);
      }
      toast.success(`已批量通过 ${toApprove.length} 条初审`);
    },
    [pendingVoucherReviews, approveVoucher],
  );

  const batchRejectVoucher = useCallback(
    (ids: string[], reason: string) => {
      const toReject = pendingVoucherReviews.filter((v) => ids.includes(v.id));
      for (const item of toReject) {
        rejectVoucher(item.userEmail, item.type, reason, item.confId);
      }
      toast.success(`已批量驳回 ${toReject.length} 条初审`);
    },
    [pendingVoucherReviews, rejectVoucher],
  );

  const batchApproveInvoice = useCallback(
    (ids: string[]) => {
      const toApprove = pendingInvoiceReviews.filter((v) => ids.includes(v.id));
      for (const item of toApprove) {
        approveInvoice(item.userEmail, item.type, item.confId);
      }
      toast.success(`已批量通过 ${toApprove.length} 条终审`);
    },
    [pendingInvoiceReviews, approveInvoice],
  );

  const batchRejectInvoice = useCallback(
    (ids: string[], reason: string) => {
      const toReject = pendingInvoiceReviews.filter((v) => ids.includes(v.id));
      for (const item of toReject) {
        rejectInvoice(item.userEmail, item.type, reason, item.confId);
      }
      toast.success(`已批量驳回 ${toReject.length} 条终审`);
    },
    [pendingInvoiceReviews, rejectInvoice],
  );

  const extendDeadline = useCallback(
    (targetEmail: string, type: "society_fee" | "conference_fee", newDeadline: string, reason: string, confId?: string) => {
      if (type === "society_fee") {
        const key = `paleo_admin_society_membership_${targetEmail}`;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        const membership = JSON.parse(stored);
        membership.status = MEMBERSHIP_STATUS.INVOICE_PENDING;
        membership.invoiceExtendedDeadline = newDeadline;
        localStorage.setItem(key, JSON.stringify(membership));
        syncAdminToUserStorage(key);
      } else if (confId) {
        const key = `paleo_admin_confs_${targetEmail}`;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        const confRegs = JSON.parse(stored);
        if (confRegs[confId]) {
          confRegs[confId].status = CONFERENCE_STATUS.INVOICE_PENDING;
          confRegs[confId].invoiceExtendedDeadline = newDeadline;
          localStorage.setItem(key, JSON.stringify(confRegs));
          syncAdminToUserStorage(key);
        }
      }
      toast.success(`已延期至 ${newDeadline}`);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  // ==========================================
  // MEMBER MANAGEMENT
  // ==========================================

  const getAllMembers = useCallback((filters?: MemberFilter): MemberRecord[] => {
    const members: MemberRecord[] = apiMemberRecords ?? (() => {
      const allUsers: { email: string; name?: string; gender?: string; unit?: string; role?: string; memberType?: string }[] =
        JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");

      return allUsers.map(u => {
        const key = `paleo_admin_society_membership_${u.email}`;
        const stored = localStorage.getItem(key);
        const membership = stored ? JSON.parse(stored) : { status: "not_member", history: [] };
        const branchesKey = `paleo_admin_bound_branches_${u.email}`;
        const storedBranches = localStorage.getItem(branchesKey);
        const boundBranches: string[] = storedBranches ? JSON.parse(storedBranches) : [];
        const typeKey = `paleo_admin_user_type_${u.email}`;
        const userType = localStorage.getItem(typeKey) || "regular";

        return {
          email: u.email,
          name: u.name || "",
          gender: u.gender || "",
          unit: u.unit || "",
          role: u.role || "",
          memberType: u.memberType,
          membershipStatus: membership.status || "not_member",
          boundBranches: Array.isArray(boundBranches) ? boundBranches : [],
          expiryDate: membership.expiryDate,
          userType,
          disabled: membership.status === MEMBERSHIP_STATUS.EXPIRED,
        };
      });
    })();

    // Phase 1: 分会管理员数据权限隔离
    let filtered = filterMembersByBranchScope(members, adminRole, adminBranchId);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(m => m.email.toLowerCase().includes(s) || m.name.includes(s));
    }
    if (filters?.status) {
      filtered = filtered.filter(m => m.membershipStatus === filters.status);
    }
    if (filters?.branchId) {
      filtered = filtered.filter(m => m.boundBranches.includes(filters.branchId!));
    }
    return filtered;
  }, [apiMemberRecords, adminRole, adminBranchId]);

  const getMemberDetail = useCallback((email: string): MemberDetail | null => {
    const members = getAllMembers();
    const member = members.find(m => m.email === email);
    if (!member) return null;
    const key = `paleo_admin_society_membership_${email}`;
    const stored = localStorage.getItem(key);
    const membership = stored ? JSON.parse(stored) : { history: [] };
    // Phase 6: 入会/退会申请书
    const appKey = `paleo_admin_membership_application_${email}`;
    const storedApp = localStorage.getItem(appKey);
    const appData = storedApp ? JSON.parse(storedApp) : null;
    const wdAppKey = `paleo_admin_withdrawal_application_${email}`;
    const storedWdApp = localStorage.getItem(wdAppKey);
    const wdAppData = storedWdApp ? JSON.parse(storedWdApp) : null;
    return {
      ...member,
      paymentHistory: membership.history || [],
      membershipAppFileUrl: appData?.applicationFileUrl,
      membershipAppFileName: appData?.applicationFileName,
      membershipAppStatus: appData?.status,
      membershipAppRejectReason: appData?.rejectReason,
      withdrawalAppFileUrl: wdAppData?.applicationFileUrl,
      withdrawalAppFileName: wdAppData?.applicationFileName,
      withdrawalAppStatus: wdAppData?.status,
    };
  }, [getAllMembers]);

  const toggleMemberDisabled = useCallback((email: string) => {
    const key = `paleo_admin_society_membership_${email}`;
    const stored = localStorage.getItem(key);
    if (!stored) { toast.error("未找到该会员记录"); return; }
    const membership = JSON.parse(stored);
    if (membership.status === MEMBERSHIP_STATUS.ACTIVE) {
      membership.status = MEMBERSHIP_STATUS.EXPIRED;
      toast.success(`已禁用 ${email} 的会员资格`);
    } else if (membership.status === MEMBERSHIP_STATUS.EXPIRED) {
      membership.status = MEMBERSHIP_STATUS.ACTIVE;
      toast.success(`已启用 ${email} 的会员资格`);
    } else {
      toast.error("只能对已开通或已过期会员执行此操作");
      return;
    }
    localStorage.setItem(key, JSON.stringify(membership));
    triggerRefresh();
  }, [triggerRefresh]);

  const manualActivateMember = useCallback((email: string) => {
    const key = `paleo_admin_society_membership_${email}`;
    const stored = localStorage.getItem(key);
    const membership = stored ? JSON.parse(stored) : { status: "not_member", history: [] };
    membership.status = MEMBERSHIP_STATUS.ACTIVE;
    membership.expiryDate = new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0];
    localStorage.setItem(key, JSON.stringify(membership));
    toast.success(`${email} 已手动开通会员`);
    triggerRefresh();
  }, [triggerRefresh]);

  // ==========================================
  // CONFERENCE MANAGEMENT
  // ==========================================

  const getAllConferences = useCallback((): ConferenceRecord[] => {
    const stored = localStorage.getItem("paleo_admin_conferences_db");
    const rawConfs: ConferenceRecord[] = stored ? JSON.parse(stored) : DEFAULT_CONFERENCES;
    // Phase 1: 分会管理员数据权限隔离
    const confs = adminRole === "branch_admin" && adminBranchId
      ? rawConfs.filter(c => c.branchId === adminBranchId)
      : rawConfs;
    return confs.map((c: ConferenceRecord) => ({
      ...c,
      registrations: countConfirmedAttendees(c.id, c),
    }));
  }, [adminRole, adminBranchId]);

  const getBranchConferences = useCallback(
    (branchId: string): ConferenceRecord[] => {
      const all = getAllConferences();
      return all.filter(c => c.branchId === branchId);
    },
    [getAllConferences]
  );

  const createConference = useCallback((data: ConferenceData) => {
    const safeData = sanitizeConferenceData(data);
    // Phase 1: 分会管理员只能为本分会创建会议
    if (adminRole === "branch_admin" && adminBranchId && safeData.branchId !== adminBranchId) {
      toast.error("您只能为本分会创建会议");
      return;
    }
    const stored = localStorage.getItem("paleo_admin_conferences_db");
    const confs: ConferenceRecord[] = stored ? JSON.parse(stored) : DEFAULT_CONFERENCES;
    const newConf: ConferenceRecord = {
      ...safeData,
      id: `conf-${Date.now()}`,
      branchName: resolveSocietyName(safeData.branchId),
      memberFee: safeData.feeConfig?.nonStudentMember || safeData.memberFee || 1000,
      nonMemberFee: safeData.feeConfig?.nonStudentNonMember || safeData.nonMemberFee || Math.round((safeData.feeConfig?.nonStudentMember || safeData.memberFee || 1000) * 1.1),
      registrations: 0,
      accommodationDeadline: safeData.accommodationDeadline,
      fieldTripDeadline: safeData.fieldTripDeadline,
      fieldTripRoutes: safeData.fieldTripRoutes,
    };
    confs.push(newConf);
    localStorage.setItem("paleo_admin_conferences_db", JSON.stringify(confs));
    // Sync fee config
    if (safeData.feeConfig) {
      const feeConfigs = JSON.parse(localStorage.getItem("paleo_admin_conference_fee_configs") || "{}");
      feeConfigs[newConf.id] = safeData.feeConfig;
      localStorage.setItem("paleo_admin_conference_fee_configs", JSON.stringify(feeConfigs));
      localStorage.setItem("paleo_conference_fee_configs", JSON.stringify(feeConfigs));
    } else {
      const feeMap = JSON.parse(localStorage.getItem("paleo_admin_conference_fee_config") || "{}");
      feeMap[newConf.id] = safeData.memberFee;
      localStorage.setItem("paleo_admin_conference_fee_config", JSON.stringify(feeMap));
    }
    toast.success("会议创建成功");
    triggerRefresh();
  }, [triggerRefresh, adminRole, adminBranchId]);

  const updateConference = useCallback((id: string, data: ConferenceData) => {
    const safeData = sanitizeConferenceData(data);
    const stored = localStorage.getItem("paleo_admin_conferences_db");
    const confs: ConferenceRecord[] = stored ? JSON.parse(stored) : DEFAULT_CONFERENCES;
    // Phase 1: 分会管理员只能修改本分会的会议
    const target = confs.find((c: ConferenceRecord) => c.id === id);
    if (target && adminRole === "branch_admin" && adminBranchId && target.branchId !== adminBranchId) {
      toast.error("您只能修改本分会的会议");
      return;
    }
    const idx = confs.findIndex((c: ConferenceRecord) => c.id === id);
    if (idx >= 0) {
      confs[idx] = { ...confs[idx], ...safeData, branchName: resolveSocietyName(safeData.branchId) };
      localStorage.setItem("paleo_admin_conferences_db", JSON.stringify(confs));
      toast.success("会议更新成功");
      triggerRefresh();
    }
  }, [triggerRefresh, adminRole, adminBranchId]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const getDashboardStats = useCallback((): DashboardStats => {
    const members = getAllMembers();
    const vouchers = pendingVoucherReviews;
    const invoices = pendingInvoiceReviews;
    const confs = getAllConferences();
    // Phase 1: 分会管理员只看本分会数据
    const branchCounts = Object.entries(ALL_SOCIETY_UNITS)
      .filter(([id]) => adminRole !== "branch_admin" || id === adminBranchId)
      .map(([id, name]) => ({
        name,
        count:
          id === TOTAL_SOCIETY_ID
            ? members.length
            : members.filter(m => m.boundBranches.includes(id)).length,
      }));
    const nonMemberUsers = members.filter(m => m.userType === "non_member");
    const memberUsers = members.filter(m => m.userType === "member");
    return {
      totalUsers: members.length,
      nonMemberCount: nonMemberUsers.length,
      memberCount: memberUsers.length,
      activeMembers: memberUsers.filter(m => m.membershipStatus === MEMBERSHIP_STATUS.ACTIVE).length,
      pendingReviews: vouchers.length + invoices.length,
      activeConferences: confs.filter(c => c.status === "published").length,
      recentReviews: [...vouchers, ...invoices].slice(0, 5),
      branchMemberCounts: branchCounts,
      paymentTrend: buildPaymentTrend(),
    };
  }, [getAllMembers, pendingVoucherReviews, pendingInvoiceReviews, getAllConferences, adminRole, adminBranchId]);

  const getBranchDashboardStats = useCallback((branchId: string): BranchDashboardStats => {
    const confs = getAllConferences().filter(c => c.branchId === branchId);
    const members = getAllMembers().filter(m => m.boundBranches.includes(branchId));
    const vouchers = pendingVoucherReviews;
    const branchConfIds = new Set(confs.map(c => c.id));

    let branchRegistrations = 0;
    const recentRegistrations: { userName: string; conferenceName: string; time: string }[] = [];

    for (const conf of confs) {
      const attendees = collectConferenceAttendees(conf.id, conf).filter(a =>
        REVENUE_CONFERENCE_STATUSES.has(a.paymentStatus)
      );
      branchRegistrations += attendees.length;
      for (const a of attendees) {
        recentRegistrations.push({
          userName: a.name,
          conferenceName: conf.name,
          time: a.paymentStatus,
        });
      }
    }

    const branchPendingReviews = vouchers.filter(v => {
      if (v.type === "conference_fee" && v.confId) {
        return branchConfIds.has(v.confId);
      }
      return false;
    }).length;

    return {
      branchConferences: confs.length,
      branchRegistrations,
      branchPendingReviews,
      branchUserCount: members.length,
      recentRegistrations: recentRegistrations.slice(0, 10),
    };
  }, [getAllConferences, getAllMembers, pendingVoucherReviews]);

  const getFinanceDashboardStats = useCallback((): FinanceDashboardStats => {
    const vouchers = pendingVoucherReviews;
    const invoices = pendingInvoiceReviews;
    const auditLog: AuditLogEntry[] = JSON.parse(localStorage.getItem("paleo_admin_audit_log") || "[]");
    const today = new Date().toISOString().split("T")[0];
    const todayActions = auditLog.filter(l => l.time.startsWith(today));
    return {
      pendingVoucher: vouchers.length,
      pendingInvoice: invoices.length,
      processedToday: todayActions.length,
      overdueCount: invoices.filter(i => i.status === "invoice_overdue").length,
      voucherPassRate: 0,
      invoicePassRate: 0,
      recentReviews: [...vouchers, ...invoices].slice(0, 10),
    };
  }, [pendingVoucherReviews, pendingInvoiceReviews]);

  // Phase 3: Global statistics（基于实收记录聚合）
  const getGlobalStats = useCallback((): GlobalStats => {
    const members = getAllMembers();
    const confs = getAllConferences();
    const memberUsers = members.filter(m => m.userType === "member");
    const nonMemberUsers = members.filter(m => m.userType === "non_member");

    const studentMembers = memberUsers.filter(m => m.role === "学生").length;
    const nonStudentMembers = memberUsers.filter(m => m.role !== "学生").length;
    const studentNonMembers = nonMemberUsers.filter(m => m.role === "学生").length;
    const nonStudentNonMembers = nonMemberUsers.filter(m => m.role !== "学生").length;

    let studentMembershipFeeCount = 0;
    let studentMembershipFeeAmount = 0;
    let nonStudentMembershipFeeCount = 0;
    let nonStudentMembershipFeeAmount = 0;

    if (!apiMemberRecords) {
      const allUsers: { email: string; role?: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
      for (const u of allUsers) {
        const stored = localStorage.getItem(`paleo_admin_society_membership_${u.email}`);
        if (!stored) continue;
        const membership = JSON.parse(stored);
        for (const h of (membership.history || [])) {
          if (!MEMBERSHIP_REVENUE_STATUSES.has(h.status)) continue;
          const isStudent = u.role === "学生" || (h.amount ?? 0) <= 100;
          if (isStudent) {
            studentMembershipFeeCount += 1;
            studentMembershipFeeAmount += h.amount || 100;
          } else {
            nonStudentMembershipFeeCount += 1;
            nonStudentMembershipFeeAmount += h.amount || 200;
          }
        }
      }
    }

    const perSocietyConferenceFee: Record<string, number> = {};
    const perSocietyFeeBreakdown: Record<string, FeeBreakdown> = {};
    for (const id of Object.keys(ALL_SOCIETY_UNITS)) {
      perSocietyFeeBreakdown[id] = createEmptyFeeBreakdown();
    }
    let totalConferenceFee = 0;

    for (const conf of confs) {
      const attendees = collectConferenceAttendees(conf.id, conf);
      for (const attendee of attendees) {
        if (!REVENUE_CONFERENCE_STATUSES.has(attendee.paymentStatus)) continue;
        perSocietyConferenceFee[conf.branchId] = (perSocietyConferenceFee[conf.branchId] || 0) + attendee.feeAmount;
        if (!perSocietyFeeBreakdown[conf.branchId]) {
          perSocietyFeeBreakdown[conf.branchId] = createEmptyFeeBreakdown();
        }
        accumulateFeeBreakdown(perSocietyFeeBreakdown[conf.branchId], attendee.feeType, attendee.feeAmount);
        totalConferenceFee += attendee.feeAmount;
      }
    }

    const totalMembershipFee = studentMembershipFeeAmount + nonStudentMembershipFeeAmount;

    return {
      totalUsers: members.length,
      totalMembers: memberUsers.length,
      totalNonMembers: nonMemberUsers.length,
      studentMembers,
      nonStudentMembers,
      studentNonMembers,
      nonStudentNonMembers,
      totalMembershipFee,
      studentMembershipFeeAmount,
      studentMembershipFeeCount,
      nonStudentMembershipFeeAmount,
      nonStudentMembershipFeeCount,
      totalConferenceFee,
      perSocietyConferenceFee,
      perSocietyFeeBreakdown,
    };
  }, [getAllMembers, getAllConferences, apiMemberRecords]);

  // Phase 3: Per-society statistics（基于实收报名记录 + 绑定注册会员）
  const getSocietyStats = useCallback((societyId: string): SocietyStats => {
    const confs = getAllConferences().filter(c => c.branchId === societyId);
    const societyName = ALL_SOCIETY_UNITS[societyId] || societyId;
    const allSiteMembers = getAllMembers();

    const boundUsers =
      societyId === TOTAL_SOCIETY_ID
        ? allSiteMembers
        : allSiteMembers.filter(m => m.boundBranches.includes(societyId));

    const regMemberUsers = boundUsers.filter(m => m.userType === "member");
    const regNonMemberUsers = boundUsers.filter(m => m.userType === "non_member");
    const registeredStudentMembers = regMemberUsers.filter(m => m.role === "学生").length;
    const registeredNonStudentMembers = regMemberUsers.filter(m => m.role !== "学生").length;
    const registeredStudentNonMembers = regNonMemberUsers.filter(m => m.role === "学生").length;
    const registeredNonStudentNonMembers = regNonMemberUsers.filter(m => m.role !== "学生").length;

    const allAttendees: ConferenceAttendee[] = [];
    for (const conf of confs) {
      allAttendees.push(...collectConferenceAttendees(conf.id, conf));
    }

    const revenueAttendees = allAttendees.filter(a => REVENUE_CONFERENCE_STATUSES.has(a.paymentStatus));
    const feeBreakdown = aggregateFeeBreakdownFromAttendees(allAttendees, true);
    const totalConferenceFee =
      feeBreakdown.studentMember.amount +
      feeBreakdown.nonStudentMember.amount +
      feeBreakdown.studentNonMember.amount +
      feeBreakdown.nonStudentNonMember.amount;

    let studentMembers = 0;
    let nonStudentMembers = 0;
    let studentNonMembers = 0;
    let nonStudentNonMembers = 0;

    for (const attendee of revenueAttendees) {
      switch (attendee.feeType) {
        case CONFERENCE_FEE_TYPE.STUDENT_MEMBER:
          studentMembers += 1;
          break;
        case CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER:
          nonStudentMembers += 1;
          break;
        case CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER:
          studentNonMembers += 1;
          break;
        case CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER:
          nonStudentNonMembers += 1;
          break;
      }
    }

    return {
      societyName,
      registeredTotal: boundUsers.length,
      registeredMembers: regMemberUsers.length,
      registeredNonMembers: regNonMemberUsers.length,
      registeredStudentMembers,
      registeredNonStudentMembers,
      registeredStudentNonMembers,
      registeredNonStudentNonMembers,
      totalAttendees: revenueAttendees.length,
      totalMembers: studentMembers + nonStudentMembers,
      totalNonMembers: studentNonMembers + nonStudentNonMembers,
      studentMembers,
      nonStudentMembers,
      studentNonMembers,
      nonStudentNonMembers,
      totalConferenceFee,
      feeBreakdown,
    };
  }, [getAllConferences, getAllMembers]);

  // Phase 3: Per-conference statistics（基于实收报名记录）
  const getConferenceStats = useCallback((confId: string): ConferenceStats => {
    const confs = getAllConferences();
    const conf = confs.find(c => c.id === confId);
    if (!conf) {
      return {
        confName: "",
        societyName: "",
        totalAttendees: 0,
        totalConferenceFee: 0,
        totalReports: 0,
        oralReports: 0,
        posterReports: 0,
        totalMembers: 0,
        totalNonMembers: 0,
        studentMembers: 0,
        nonStudentMembers: 0,
        studentNonMembers: 0,
        nonStudentNonMembers: 0,
        feeBreakdown: createEmptyFeeBreakdown(),
        accommodation: { totalRooms: 0, maleSingle: 0, maleDouble: 0, femaleSingle: 0, femaleDouble: 0, selfArranged: 0 },
        fieldTrips: {
          pre: { total: 0, male: 0, female: 0 },
          during: { total: 0, male: 0, female: 0 },
          post: { total: 0, male: 0, female: 0 },
        },
      };
    }

    const attendees = collectConferenceAttendees(confId, conf);
    const revenueAttendees = attendees.filter(a => REVENUE_CONFERENCE_STATUSES.has(a.paymentStatus));
    const feeBreakdown = aggregateFeeBreakdownFromAttendees(attendees, true);
    const totalConferenceFee =
      feeBreakdown.studentMember.amount +
      feeBreakdown.nonStudentMember.amount +
      feeBreakdown.studentNonMember.amount +
      feeBreakdown.nonStudentNonMember.amount;

    const oralReports = attendees.filter(a => a.reportType === "口头报告").length;
    const posterReports = attendees.filter(a => a.reportType === "展板报告").length;

    const accommodation = { totalRooms: 0, maleSingle: 0, maleDouble: 0, femaleSingle: 0, femaleDouble: 0, selfArranged: 0 };
    for (const attendee of attendees) {
      switch (attendee.accommodationType) {
        case ACCOMMODATION_TYPE.MALE_SINGLE:
          accommodation.maleSingle += 1;
          break;
        case ACCOMMODATION_TYPE.MALE_DOUBLE:
          accommodation.maleDouble += 1;
          break;
        case ACCOMMODATION_TYPE.FEMALE_SINGLE:
          accommodation.femaleSingle += 1;
          break;
        case ACCOMMODATION_TYPE.FEMALE_DOUBLE:
          accommodation.femaleDouble += 1;
          break;
        case ACCOMMODATION_TYPE.SELF_ARRANGED:
          accommodation.selfArranged += 1;
          break;
      }
    }
    accommodation.totalRooms =
      accommodation.maleSingle + accommodation.maleDouble + accommodation.femaleSingle + accommodation.femaleDouble;

    const fieldTrips = {
      pre: { total: 0, male: 0, female: 0 },
      during: { total: 0, male: 0, female: 0 },
      post: { total: 0, male: 0, female: 0 },
    };
    for (const attendee of attendees) {
      if (attendee.fieldTripPre) {
        fieldTrips.pre.total += 1;
        if (attendee.gender === "男") fieldTrips.pre.male += 1;
        if (attendee.gender === "女") fieldTrips.pre.female += 1;
      }
      if (attendee.fieldTripDuring) {
        fieldTrips.during.total += 1;
        if (attendee.gender === "男") fieldTrips.during.male += 1;
        if (attendee.gender === "女") fieldTrips.during.female += 1;
      }
      if (attendee.fieldTripPost) {
        fieldTrips.post.total += 1;
        if (attendee.gender === "男") fieldTrips.post.male += 1;
        if (attendee.gender === "女") fieldTrips.post.female += 1;
      }
    }

    return {
      confName: conf.name,
      societyName: conf.branchName || ALL_SOCIETY_UNITS[conf.branchId] || conf.branchId,
      totalAttendees: revenueAttendees.length,
      totalConferenceFee,
      totalReports: oralReports + posterReports,
      oralReports,
      posterReports,
      totalMembers: feeBreakdown.studentMember.count + feeBreakdown.nonStudentMember.count,
      totalNonMembers: feeBreakdown.studentNonMember.count + feeBreakdown.nonStudentNonMember.count,
      studentMembers: feeBreakdown.studentMember.count,
      nonStudentMembers: feeBreakdown.nonStudentMember.count,
      studentNonMembers: feeBreakdown.studentNonMember.count,
      nonStudentNonMembers: feeBreakdown.nonStudentNonMember.count,
      feeBreakdown,
      accommodation,
      fieldTrips,
    };
  }, [getAllConferences]);

  // ==========================================
  // FINANCE RECORDS
  // ==========================================

  const getAllPaymentRecords = useCallback((): ReviewItem[] => {
    const allUsers: { name?: string; email: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
    // Phase 1: 分会管理员只看本分会成员的支付记录
    const branchMembers = adminRole === "branch_admin" && adminBranchId
      ? new Set(getAllMembers().map(m => m.email))
      : null;
    const records: ReviewItem[] = [];
    for (const u of allUsers) {
      if (branchMembers && !branchMembers.has(u.email)) continue;
      const key = `paleo_admin_society_membership_${u.email}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const membership = JSON.parse(stored);
        if (membership.status && membership.status !== "not_member") {
          records.push(buildReviewItem(u.email, u, "society_fee"));
        }
      }
      const confsKey = `paleo_admin_confs_${u.email}`;
      const storedConfs = localStorage.getItem(confsKey);
      if (storedConfs) {
        const confRegs = JSON.parse(storedConfs);
        for (const confId of Object.keys(confRegs)) {
          if (confRegs[confId].status && confRegs[confId].status !== "unpaid") {
            records.push(buildReviewItem(u.email, u, "conference_fee", confId));
          }
        }
      }
    }
    return records;
  }, [getAllMembers, adminRole, adminBranchId]);

  // ==========================================
  // PHASE 5: CONFERENCE ATTENDEES & EXPORT
  // ==========================================

  const getConferenceAttendees = useCallback((confId: string): ConferenceAttendee[] => {
    const conf = getAllConferences().find(c => c.id === confId);
    return collectConferenceAttendees(confId, conf);
  }, [getAllConferences]);

  // Helper to normalize file names
  const sanitizeFileName = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
  };

  const generateExportZip = useCallback(async (options: ExportOptions): Promise<Blob[]> => {
    const builder = new SplitZipBuilder();
    const allUsers: { email: string; name?: string; gender?: string; unit?: string; role?: string }[] =
      JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
    const confs = getAllConferences();

    const categories: { feeType: ConferenceFeeType; folderName: string }[] = [
      { feeType: CONFERENCE_FEE_TYPE.STUDENT_MEMBER, folderName: "学生会员" },
      { feeType: CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER, folderName: "非学生会员" },
      { feeType: CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER, folderName: "学生（非会员）" },
      { feeType: CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER, folderName: "非学生（非会员）" },
    ];

    const filteredCategories = options.includeCategories
      ? categories.filter(c => options.includeCategories!.includes(c.feeType))
      : categories;

    const today = new Date().toISOString().split("T")[0];

    const getExt = (url: string) => {
      if (url.startsWith("data:")) {
        const mime = url.split(";")[0].split(":")[1] || "";
        if (mime.includes("pdf")) return "pdf";
        if (mime.includes("png")) return "png";
        return "jpg";
      }
      return url.split(".").pop()?.split("?")[0] || "jpg";
    };

    const resolveUserFeeType = (u: { role?: string; email: string }): ConferenceFeeType => {
      const userType = localStorage.getItem(`paleo_admin_user_type_${u.email}`) || "regular";
      const isStudent = u.role === "学生";
      if (userType === "member") {
        return isStudent ? CONFERENCE_FEE_TYPE.STUDENT_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER;
      }
      return isStudent ? CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER;
    };

    const branchScopes: { scopeId: string; rootFolder: string }[] =
      options.scope === "global"
        ? ALL_SOCIETY_IDS.map(societyId => ({
            scopeId: societyId,
            rootFolder: `export_global_all_${today}/${sanitizeFileName(ALL_SOCIETY_UNITS[societyId] || societyId)}`,
          }))
        : options.scope === "branch"
          ? [{
              scopeId: options.scopeId,
              rootFolder: `export_branch_${sanitizeFileName(options.scopeId)}_${today}`,
            }]
          : [];

    for (const { scopeId: branchId, rootFolder } of branchScopes) {
      for (const cat of filteredCategories) {
        const voucherFolder = `${rootFolder}/${cat.folderName}/缴费凭证`;
        const invoiceFolder = `${rootFolder}/${cat.folderName}/电子发票`;

        for (const u of allUsers) {
          const userFeeType = resolveUserFeeType(u);
          if (userFeeType !== cat.feeType) continue;
          const userName = u.name || u.email;
          const identityLabel = CONFERENCE_FEE_TYPE_LABEL[cat.feeType];

          const membershipKey = `paleo_admin_society_membership_${u.email}`;
          const storedMembership = localStorage.getItem(membershipKey);
          if (storedMembership) {
            const membership = JSON.parse(storedMembership);
            const boundBranches: string[] = JSON.parse(localStorage.getItem(`paleo_admin_bound_branches_${u.email}`) || "[]");
            if (boundBranches.includes(branchId)) {
              for (const h of (membership.history || [])) {
                const date = h.submitTime?.slice(0, 10) || today;
                if (h.voucherUrl) {
                  const ext = getExt(h.voucherUrl);
                  const fileName = formatExportFileName(userName, identityLabel, date, h.id || "voucher", ext);
                  builder.file(`${voucherFolder}/${fileName}`, h.voucherUrl, { base64: h.voucherUrl.startsWith("data:") });
                }
                if (h.invoiceUrl) {
                  const ext = getExt(h.invoiceUrl);
                  const fileName = formatExportFileName(userName, identityLabel, date, `${h.id || "invoice"}-inv`, ext);
                  builder.file(`${invoiceFolder}/${fileName}`, h.invoiceUrl, { base64: h.invoiceUrl.startsWith("data:") });
                }
              }
            }
          }

          const branchConfs = confs.filter(c => c.branchId === branchId);
          const confsKey = `paleo_admin_confs_${u.email}`;
          const storedConfs = localStorage.getItem(confsKey);
          if (storedConfs) {
            const confRegs = JSON.parse(storedConfs);
            for (const conf of branchConfs) {
              const reg = confRegs[conf.id];
              if (!reg) continue;
              const regFeeType = (reg.feeType as ConferenceFeeType) || userFeeType;
              if (regFeeType !== cat.feeType) continue;
              const date = reg.voucherAuditTime?.slice(0, 10) || reg.submitTime?.slice(0, 10) || today;
              if (reg.paymentVoucher) {
                const ext = getExt(reg.paymentVoucher);
                const fileName = formatExportFileName(userName, identityLabel, date, `${conf.id}-v`, ext);
                builder.file(`${voucherFolder}/${fileName}`, reg.paymentVoucher, { base64: reg.paymentVoucher.startsWith("data:") });
              }
              if (reg.invoiceUrl) {
                const ext = getExt(reg.invoiceUrl);
                const fileName = formatExportFileName(userName, identityLabel, date, `${conf.id}-inv`, ext);
                builder.file(`${invoiceFolder}/${fileName}`, reg.invoiceUrl, { base64: reg.invoiceUrl.startsWith("data:") });
              }
            }
          }
        }
      }

      const branchAttendees: ConferenceAttendee[] = [];
      for (const conf of confs.filter(c => c.branchId === branchId)) {
        branchAttendees.push(...collectConferenceAttendees(conf.id, conf));
      }
      if (branchAttendees.length > 0) {
        const header = "姓名,邮箱,性别,单位,身份类型,费用类型,缴费状态,报告类型,住宿,野外(会前),野外(会中),野外(会后)";
        const rows = branchAttendees.map(a =>
          `"${a.name}","${a.email}","${a.gender}","${a.unit}","${CONFERENCE_FEE_TYPE_LABEL[a.feeType]}","¥${a.feeAmount}","${a.paymentStatus}","${a.reportType || "—"}","${a.accommodationLabel || "—"}","${a.fieldTripPre ? "是" : "否"}","${a.fieldTripDuring ? "是" : "否"}","${a.fieldTripPost ? "是" : "否"}"`
        );
        builder.file(`${rootFolder}/汇总台账.csv`, "\uFEFF" + header + "\n" + rows.join("\n"));
      }
    }

    if (options.scope === "conference") {
      const rootFolder = `export_conference_${sanitizeFileName(options.scopeId)}_${today}`;

      for (const cat of filteredCategories) {
        const voucherFolder = `${rootFolder}/${cat.folderName}/缴费凭证`;
        const invoiceFolder = `${rootFolder}/${cat.folderName}/电子发票`;

        for (const u of allUsers) {
          const userFeeType = resolveUserFeeType(u);
          const userName = u.name || u.email;
          const identityLabel = CONFERENCE_FEE_TYPE_LABEL[cat.feeType];
          const confsKey = `paleo_admin_confs_${u.email}`;
          const storedConfs = localStorage.getItem(confsKey);
          if (!storedConfs) continue;
          const confRegs = JSON.parse(storedConfs);
          const reg = confRegs[options.scopeId];
          if (!reg) continue;
          const regFeeType = (reg.feeType as ConferenceFeeType) || userFeeType;
          if (regFeeType !== cat.feeType) continue;

          const date = reg.voucherAuditTime?.slice(0, 10) || reg.submitTime?.slice(0, 10) || today;
          if (reg.paymentVoucher) {
            const ext = getExt(reg.paymentVoucher);
            const fileName = formatExportFileName(userName, identityLabel, date, `${options.scopeId}-v`, ext);
            builder.file(`${voucherFolder}/${fileName}`, reg.paymentVoucher, { base64: reg.paymentVoucher.startsWith("data:") });
          }
          if (reg.invoiceUrl) {
            const ext = getExt(reg.invoiceUrl);
            const fileName = formatExportFileName(userName, identityLabel, date, `${options.scopeId}-inv`, ext);
            builder.file(`${invoiceFolder}/${fileName}`, reg.invoiceUrl, { base64: reg.invoiceUrl.startsWith("data:") });
          }
        }
      }

      const allAttendees = getConferenceAttendees(options.scopeId);
      if (allAttendees.length > 0) {
        const header = "姓名,邮箱,性别,单位,身份类型,费用类型,缴费状态,报告类型,住宿,野外(会前),野外(会中),野外(会后)";
        const rows = allAttendees.map(a =>
          `"${a.name}","${a.email}","${a.gender}","${a.unit}","${CONFERENCE_FEE_TYPE_LABEL[a.feeType]}","¥${a.feeAmount}","${a.paymentStatus}","${a.reportType || "—"}","${a.accommodationLabel || "—"}","${a.fieldTripPre ? "是" : "否"}","${a.fieldTripDuring ? "是" : "否"}","${a.fieldTripPost ? "是" : "否"}"`
        );
        builder.file(`${rootFolder}/汇总台账.csv`, "\uFEFF" + header + "\n" + rows.join("\n"));
      }
    }

    return builder.generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllConferences, getConferenceAttendees]);

  // ==========================================
  // PHASE 6: MEMBERSHIP APPLICATION & WITHDRAWAL REVIEW
  // ==========================================

  const findMembershipApp = (applicationId: number) =>
    pendingMembershipApps.find((app) => app.applicationId === applicationId);

  const findWithdrawalApp = (applicationId: number) =>
    pendingWithdrawalApps.find((app) => app.applicationId === applicationId);

  const approveMembershipApplication = useCallback((applicationId: number) => {
    void (async () => {
      const app = findMembershipApp(applicationId);
      if (!app) {
        toast.error("未找到该入会申请");
        return;
      }
      try {
        await reviewMembershipApplication(applicationId, "APPROVED");
        toast.success("入会申请已通过，用户可进入缴费阶段");
        triggerRefresh();
        await loadApplicationQueues();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "审核失败");
      }
    })();
  }, [triggerRefresh, pendingMembershipApps, loadApplicationQueues]);

  const rejectMembershipApplication = useCallback((applicationId: number, reason: string) => {
    void (async () => {
      const app = findMembershipApp(applicationId);
      if (!app) {
        toast.error("未找到该入会申请");
        return;
      }
      try {
        await reviewMembershipApplication(applicationId, "REJECTED", reason);
        toast.success("入会申请已驳回");
        triggerRefresh();
        await loadApplicationQueues();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "审核失败");
      }
    })();
  }, [triggerRefresh, pendingMembershipApps, loadApplicationQueues]);

  const approveWithdrawalApplication = useCallback((applicationId: number) => {
    void (async () => {
      const app = findWithdrawalApp(applicationId);
      if (!app) {
        toast.error("未找到该退会申请");
        return;
      }
      try {
        await reviewMembershipApplication(applicationId, "APPROVED");
        toast.success("退会申请已通过");
        triggerRefresh();
        await loadApplicationQueues();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "审核失败");
      }
    })();
  }, [triggerRefresh, pendingWithdrawalApps, loadApplicationQueues]);

  const rejectWithdrawalApplication = useCallback((applicationId: number, reason: string) => {
    void (async () => {
      const app = findWithdrawalApp(applicationId);
      if (!app) {
        toast.error("未找到该退会申请");
        return;
      }
      try {
        await reviewMembershipApplication(applicationId, "REJECTED", reason);
        toast.success("退会申请已驳回");
        triggerRefresh();
        await loadApplicationQueues();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "审核失败");
      }
    })();
  }, [triggerRefresh, pendingWithdrawalApps, loadApplicationQueues]);

  // 模板管理
  const setMembershipApplicationTemplateAction = useCallback((fileUrl: string, fileName: string) => {
    localStorage.setItem("paleo_membership_application_template", JSON.stringify({ url: fileUrl, name: fileName, updatedAt: new Date().toISOString() }));
    toast.success("入会申请书模板已更新");
  }, []);

  const setWithdrawalApplicationTemplateAction = useCallback((fileUrl: string, fileName: string) => {
    localStorage.setItem("paleo_withdrawal_application_template", JSON.stringify({ url: fileUrl, name: fileName, updatedAt: new Date().toISOString() }));
    toast.success("退会申请书模板已更新");
  }, []);

  const getMembershipApplicationTemplateUrlAction = useCallback((): string => {
    const stored = localStorage.getItem("paleo_membership_application_template");
    if (stored) {
      try {
        const url = JSON.parse(stored).url || "";
        return url.startsWith("data:") ? "" : url;
      } catch { return ""; }
    }
    return "";
  }, []);

  const getWithdrawalApplicationTemplateUrlAction = useCallback((): string => {
    const stored = localStorage.getItem("paleo_withdrawal_application_template");
    if (stored) {
      try {
        const url = JSON.parse(stored).url || "";
        return url.startsWith("data:") ? "" : url;
      } catch { return ""; }
    }
    return "";
  }, []);

  // 自动退会检查
  const checkMembershipExpiry = useCallback(() => {
    const allUsers: { email: string }[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
    const today = new Date().toISOString().split("T")[0];
    let expiredCount = 0;

    for (const u of allUsers) {
      const key = `paleo_admin_society_membership_${u.email}`;
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const membership = JSON.parse(stored);
      if (membership.status === MEMBERSHIP_STATUS.ACTIVE && membership.expiryDate && membership.expiryDate < today) {
        membership.status = MEMBERSHIP_STATUS.EXPIRED;
        localStorage.setItem(key, JSON.stringify(membership));
        // 同步用户前台
        const userKey = `paleo_society_membership_${u.email}`;
        const userStored = localStorage.getItem(userKey);
        if (userStored) {
          const userMem = JSON.parse(userStored);
          userMem.status = MEMBERSHIP_STATUS.EXPIRED;
          localStorage.setItem(userKey, JSON.stringify(userMem));
        }
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      triggerRefresh();
    }
  }, [triggerRefresh]);

  // ==========================================
  // BRANCH MANAGEMENT
  // ==========================================

  const getAllBranches = useCallback((): BranchRecord[] => {
    const stored = localStorage.getItem("paleo_admin_branches_db");
    const members = getAllMembers();
    const allBranches = Object.entries(BRANCH_MAP).map(([id, name]) => ({
      id,
      name,
      description: `${name}是中国古生物学会下属专业分会`,
      memberCount: members.filter(m => m.boundBranches.includes(id)).length,
      disabled: false,
    }));
    if (stored) {
      const parsed = JSON.parse(stored);
      // Phase 1: 分会管理员只看自己的分会
      if (adminRole === "branch_admin" && adminBranchId) {
        return parsed.filter((b: BranchRecord) => b.id === adminBranchId);
      }
      return parsed;
    }
    // Phase 1: 分会管理员只看自己的分会
    if (adminRole === "branch_admin" && adminBranchId) {
      return allBranches.filter(b => b.id === adminBranchId);
    }
    return allBranches;
  }, [getAllMembers, adminRole, adminBranchId]);

  const updateBranch = useCallback((id: string, data: Partial<BranchRecord>) => {
    const branches = getAllBranches();
    const idx = branches.findIndex(b => b.id === id);
    if (idx >= 0) {
      branches[idx] = { ...branches[idx], ...data };
      localStorage.setItem("paleo_admin_branches_db", JSON.stringify(branches));
      toast.success("分会信息已更新");
      triggerRefresh();
    }
  }, [getAllBranches, triggerRefresh]);

  const toggleBranchDisabled = useCallback((id: string) => {
    const branches = getAllBranches();
    const idx = branches.findIndex(b => b.id === id);
    if (idx >= 0) {
      branches[idx].disabled = !branches[idx].disabled;
      localStorage.setItem("paleo_admin_branches_db", JSON.stringify(branches));
      toast.success(branches[idx].disabled ? "分会已禁用" : "分会已启用");
      triggerRefresh();
    }
  }, [getAllBranches, triggerRefresh]);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const contextValue: AdminContextType = {
    adminUser,
    isAdminLoggedIn: !!adminUser,
    adminLogin,
    adminLogout,
    adminRole,
    adminBranchId,
    canAccess,
    getAllowedMenuItems,
    getDefaultCmsPath,
    refreshCmsMenu,
    cmsMenuLoaded,
    pendingVoucherReviews,
    pendingInvoiceReviews,
    approveVoucher,
    rejectVoucher,
    approveInvoice,
    rejectInvoice,
    batchApproveVoucher,
    batchRejectVoucher,
    batchApproveInvoice,
    batchRejectInvoice,
    extendDeadline,
    getAllMembers,
    getMemberDetail,
    toggleMemberDisabled,
    manualActivateMember,
    getAllConferences,
    getBranchConferences,
    createConference,
    updateConference,
    getDashboardStats,
    getBranchDashboardStats,
    getFinanceDashboardStats,
    getGlobalStats,
    getSocietyStats,
    getConferenceStats,
    getAllPaymentRecords,
    getConferenceAttendees,
    generateExportZip,
    // Phase 6: 入会/退会审核
    pendingMembershipApps,
    pendingWithdrawalApps,
    approveMembershipApplication,
    rejectMembershipApplication,
    approveWithdrawalApplication,
    rejectWithdrawalApplication,
    setMembershipApplicationTemplate: setMembershipApplicationTemplateAction,
    setWithdrawalApplicationTemplate: setWithdrawalApplicationTemplateAction,
    getMembershipApplicationTemplateUrl: getMembershipApplicationTemplateUrlAction,
    getWithdrawalApplicationTemplateUrl: getWithdrawalApplicationTemplateUrlAction,
    checkMembershipExpiry,
    getAllBranches,
    updateBranch,
    toggleBranchDisabled,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
