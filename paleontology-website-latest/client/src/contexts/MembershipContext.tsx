import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  type ConferenceStatus,
  type MembershipStatus,
  CONFERENCE_STATUS,
  MEMBERSHIP_STATUS,
  USER_TYPE,
  type UserType,
  type ConferenceFeeType,
  type ConferenceFeeConfig,
  type AccommodationType,
  type FieldTripSelections,
  createEmptyFieldTripSelections,
  getMembershipFee as getConfiguredMembershipFee,
  getConferenceFeeConfig as getConfiguredFeeConfig,
  getConferenceFeeByType,
  deriveFeeType,
  isSocietyAccessible,
  ALL_SOCIETY_UNITS,
  CONFIRMED_PAYMENT_STATUSES,
  isDeadlinePassed,
  isKnownConferenceCode,
} from "@shared/constants";
import {
  clearUserToken,
  cancelMembershipApplication,
  bindBranch,
  createConferenceRegistration,
  createMembershipApplication,
  createMembershipPayment,
  fetchMyMembershipApplications,
  fetchPublicMembershipTemplates,
  mapApiApplicationReviewStatus,
  uploadMembershipApplicationFile,
  dataUrlToFile,
  fetchAuthInfo,
  fetchMyBranchBindings,
  fetchMyConferenceRegistrations,
  fetchMyMembershipPayments,
  getUserToken,
  loginUser,
  mapApiPaymentStatus,
  mapApiRegistrationToConferenceReg,
  mapApiUserToLocal,
  registerUser,
  setUserToken,
  unbindBranch,
  updateUserTypeApi,
  uploadConferenceRegistrationFile,
  uploadMembershipPaymentFile,
  type ApiMemberProfile,
} from "@/lib/membership-api";

/** 智能审核：工作日加算（与管理端一致） */
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

/** 申请审核/提交时间，用于判断退会 vs 重新入会孰新 */
function applicationEventTime(app?: { reviewTime?: string; createTime?: string }): number {
  const raw = app?.reviewTime || app?.createTime;
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 已批准的退会是否仍应覆盖当前会员状态（重新入会且更新时返回 false） */
function withdrawalStillAuthoritative(
  joinApps: { reviewStatus?: string; reviewTime?: string; createTime?: string }[],
  withdrawApp?: { reviewStatus?: string; reviewTime?: string; createTime?: string } | null,
): boolean {
  if (!withdrawApp || withdrawApp.reviewStatus !== "APPROVED") return false;
  const approvedJoin = joinApps.find((app) => app.reviewStatus === "APPROVED");
  if (!approvedJoin) return true;
  return applicationEventTime(withdrawApp) > applicationEventTime(approvedJoin);
}

// ============================================================================
// TYPES
// ============================================================================

export type MemberType = "普通会员" | "外籍会员" | "单位会员" | "荣誉会员";

export interface User {
  email: string;
  name: string;
  gender: "男" | "女";
  unit: string;
  role: "学生" | "教师" | "嘉宾";
  title?: string;
  // Phase 0: 用户身份扩展（学生/非学生维度）
  isStudent?: boolean;
  // 会员类型预留字段（当前默认普通会员，后续迭代细化）
  memberType?: MemberType;
}

export interface PaymentRecord {
  id: string;
  type: "society_fee" | "conference_fee";
  targetName: string; // "中国古生物学会会员费" or Conference title
  amount: number;
  voucherUrl: string;
  invoiceUrl: string;
  submitTime: string;
  auditTime?: string;
  status: "pending" | "approved" | "rejected" | "voucher_submitted" | "voucher_rejected" | "invoice_submitted" | "invoice_rejected";
  rejectReason?: string;
  /** 区分是凭证驳回还是发票驳回（两阶段审核） */
  rejectPhase?: "voucher" | "invoice";
}

// 统一学会会员状态（两阶段审核）
export interface SocietyMembership {
  status: MembershipStatus | "pending" | "rejected"; // "pending"/"rejected" 为旧状态兼容，Phase 2 移除
  expiryDate?: string;
  /** @deprecated 使用 voucherRejectReason 或 invoiceRejectReason */
  rejectReason?: string;
  voucherRejectReason?: string;
  invoiceRejectReason?: string;
  applicationRejectReason?: string;
  invoiceDeadline?: string;
  invoiceExtendedDeadline?: string;
  voucherAuditTime?: string;
  invoiceAuditTime?: string;
  smartReviewNote?: string;
  frozenDueToExpiry?: boolean;
  /** @deprecated 从 PaymentRecord 中读取金额，Phase 2 移除 */
  amount?: number;
  /** 当前会员费缴费记录 ID */
  currentPaymentId?: number;
  history: PaymentRecord[];
}

export interface ConferenceReg {
  status: ConferenceStatus | "pending" | "approved_unfilled" | "submitted" | "approved_invoice" | "active" | "rejected"; // 旧状态兼容，Phase 2 移除
  // Phase 1: Voucher (凭证)
  paymentVoucher?: string;
  voucherSubmitTime?: string;
  voucherAuditTime?: string;
  voucherRejectReason?: string;
  // Phase 2: Invoice (发票)
  invoiceUrl?: string;
  invoiceSubmitTime?: string;
  invoiceAuditTime?: string;
  invoiceRejectReason?: string;
  invoiceDeadline?: string;         // 发票上传截止日（凭证初审通过 + 7工作日）
  invoiceExtendedDeadline?: string; // 手动延长期限
  // Membership expiry
  frozenDueToExpiry?: boolean;
  // Form fields (editable when status = invoice_pending)
  name: string;
  gender: "男" | "女";
  unit: string;
  role: "学生" | "教师" | "嘉宾";
  /** @deprecated Phase 4 起请使用 accommodationType */
  accommodation: "单间" | "双人间" | "自行安排";
  session: string;
  presentationType: "口头报告" | "展板报告" | "仅参会";
  reportTitle?: string;
  abstractFileName?: string;
  lastUpdated?: string;
  // Phase 4: 摘要文件
  abstractFileUrl?: string;
  abstractSubmitTime?: string;
  // Phase 4: 住宿（性别化选项）
  accommodationType?: AccommodationType;
  // Phase 4: 野外报名
  fieldTripSelections?: FieldTripSelections;
  // 报名时锁定的费用类型与金额（不受后续身份变更影响）
  feeType?: ConferenceFeeType;
  lockedAmount?: number;
  /** 后端报名记录 ID */
  registrationId?: number;
  /** 后端会议编码与标题（API 同步） */
  conferenceCode?: string;
  conferenceTitle?: string;
  /** @deprecated 旧字段兼容，Phase 2 移除 */
  conferenceForm?: any;
  /** @deprecated 旧字段兼容，Phase 2 移除 */
  reportType?: string;
  smartReviewNote?: string;
}

/** 智能审核 mock：凭证/发票自动通过（原型演示，减少人工审核队列） */
function smartApproveVoucherMembership(membership: SocietyMembership): SocietyMembership {
  return {
    ...membership,
    status: "invoice_pending",
    invoiceDeadline: addWorkdays(new Date().toISOString().split("T")[0], 7),
    voucherAuditTime: new Date().toISOString(),
    smartReviewNote: "智能审核：凭证金额与用户信息匹配，已自动通过初审",
  };
}

function smartApproveInvoiceMembership(membership: SocietyMembership): SocietyMembership {
  const expiryDate = new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0];
  return {
    ...membership,
    status: "active",
    expiryDate,
    invoiceAuditTime: new Date().toISOString(),
    smartReviewNote: "智能审核：发票信息与凭证一致，已自动通过终审",
  };
}

function smartApproveVoucherConference(reg: ConferenceReg): ConferenceReg {
  return {
    ...reg,
    status: "invoice_pending",
    invoiceDeadline: addWorkdays(new Date().toISOString().split("T")[0], 7),
    voucherAuditTime: new Date().toISOString(),
    smartReviewNote: "智能审核：凭证金额与锁定费用一致，已自动通过初审",
  };
}

function smartApproveInvoiceConference(reg: ConferenceReg): ConferenceReg {
  return {
    ...reg,
    status: "confirmed",
    invoiceAuditTime: new Date().toISOString(),
    smartReviewNote: "智能审核：发票信息与凭证一致，已自动通过终审",
  };
}

export interface SystemNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning";
}

// Phase 6: 入会/退会申请书数据
export interface MembershipApplication {
  applicationId?: number;
  status: string;          // application_submitted | application_rejected | application_approved
  applicationFileUrl: string;
  applicationFileName: string;
  submitTime: string;
  reviewTime?: string;
  rejectReason?: string;
}

export interface WithdrawalApplication {
  applicationId?: number;
  status: string;          // withdrawal_submitted | withdrawal_rejected | withdrawn
  applicationFileUrl: string;
  applicationFileName: string;
  submitTime: string;
  reviewTime?: string;
  rejectReason?: string;
}

interface MembershipContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  societyMembership: SocietyMembership;
  boundBranches: string[]; // 已绑定的分会 ID 列表
  conferenceRegs: { [confId: string]: ConferenceReg };
  notifications: SystemNotification[];
  allUsers: User[];

  // ── 双路径选择（新增） ──
  userType: UserType;
  membershipChoiceMade: boolean;
  chooseMembershipPath: (path: "member" | "non_member") => void;

  // Auth actions
  register: (user: User, password: string) => boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  deleteAccount: () => void;
  updateProfile: (user: Partial<User>) => void;
  resetPassword: (email: string) => void;

  // ── 统一学会会员费（两阶段） ──
  /** @deprecated Phase 2 将拆分为 submitMembershipVoucher + submitMembershipInvoice */
  applySocietyMembership: (voucherUrl: string, invoiceUrl: string, amount: number) => void;
  /** 阶段一：提交缴费凭证 */
  submitMembershipVoucher: (voucherUrl: string, amount: number, fileName?: string) => Promise<boolean>;
  /** 阶段二：提交电子发票 */
  submitMembershipInvoice: (invoiceUrl: string, fileName?: string) => Promise<boolean>;

  // 分会绑定/解绑（无需审核，仅需有效会员资格）
  toggleBranchBinding: (branchId: string) => Promise<void>;

  // ── Conference actions（两阶段） ──
  /** @deprecated Phase 2: 请使用 submitConferenceVoucher */
  payConference: (confId: string, voucherUrl: string, invoiceUrl: string, amount: number) => Promise<boolean>;
  /** 阶段一：提交会议费凭证 */
  submitConferenceVoucher: (confId: string, voucherUrl: string, amount: number) => Promise<boolean>;
  /** 阶段二：提交会议费发票 */
  submitConferenceInvoice: (confId: string, invoiceUrl: string) => Promise<boolean>;
  submitConferenceForm: (confId: string, formData: Omit<ConferenceReg, "status" | "paymentVoucher" | "invoiceUrl">) => void;
  deleteAbstract: (confId: string) => void;
  uploadAbstract: (confId: string, fileName: string) => void;
  // Phase 4: 摘要/住宿/野外
  uploadAbstractFile: (confId: string, fileUrl: string, fileName: string) => void;
  setAccommodation: (confId: string, type: AccommodationType) => void;
  toggleFieldTripRoute: (confId: string, phase: "pre" | "during" | "post", routeId: string) => void;

  // ── 宽限期与过期处理 ──
  /** 检查并更新逾期状态 */
  checkInvoiceOverdue: () => void;
  /** 手动延长发票上传期限 */
  extendInvoiceDeadline: (confId: string, newDeadline: string, reason?: string) => void;
  /** 会员到期时的分级处理 */
  handleMembershipExpiry: () => void;
  /** 续费后的恢复逻辑 */
  handleMembershipRenewal: () => void;

  // ── 配置读取 ──
  getMembershipFee: (memberType?: string) => number;
  /** @deprecated Phase 0 起请使用 getUserFeeType + getConferenceFeeConfig */
  getConferenceFee: (confId: string) => number;
  // Phase 0: New fee API
  getUserFeeType: () => ConferenceFeeType;
  getConferenceFeeConfig: (confId: string) => ConferenceFeeConfig;
  // Phase 2: File download helpers
  canDownloadStampedNotice: (confId: string) => boolean;
  canDownloadAbstractTemplate: (confId: string) => boolean;
  canAccessConferenceForm: (confId: string) => boolean;
  getConferenceFileUrl: (confId: string, fileType: "stampedNotice" | "abstractTemplate" | "publicNotice") => string | null;

  // Phase 6: 入会/退会申请
  membershipApplication: MembershipApplication | null;
  withdrawalApplication: WithdrawalApplication | null;
  submitMembershipApplication: (file: File) => Promise<boolean>;
  cancelMembershipApplication: () => void;
  submitWithdrawalApplication: (file: File) => Promise<boolean>;
  cancelWithdrawalApplication: () => void;
  getMembershipApplicationTemplateUrl: () => string;
  getWithdrawalApplicationTemplateUrl: () => string;

  // General Helpers
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

// ============================================================================
// DEFAULT MOCK DATA
// ============================================================================

const DEFAULT_SOCIETY_MEMBERSHIP: SocietyMembership = {
  status: "not_member",
  history: []
};

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-welcome",
    title: "欢迎加入中国古生物学会数字化平台",
        content: "您已成功注册账号。请前往【学会服务 → 会员服务】缴纳学会会员费，成为正式会员后即可绑定各专业分会、参加学术会议。",
    time: "2026-06-01 09:00",
    read: false,
    type: "info"
  }
];

const MOCK_USER_DB = [
  {
    email: "demo@paleontology.org.cn",
    password: "demo123",
    name: "演示用户",
    gender: "男" as const,
    unit: "中国古生物学会",
    role: "教师" as const,
    title: "高级工程师",
    memberType: "普通会员" as MemberType
  }
];

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [societyMembership, setSocietyMembership] = useState<SocietyMembership>(DEFAULT_SOCIETY_MEMBERSHIP);
  const [boundBranches, setBoundBranches] = useState<string[]>([]);
  const [conferenceRegs, setConferenceRegs] = useState<{ [confId: string]: ConferenceReg }>({});
  const [notifications, setNotifications] = useState<SystemNotification[]>(DEFAULT_NOTIFICATIONS);
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USER_DB.map(({ password, ...u }) => u));
  const [userType, setUserType] = useState<UserType>("regular");
  const [membershipChoiceMade, setMembershipChoiceMade] = useState(false);
  // Phase 6: 入会/退会申请书状态
  const [membershipApplication, setMembershipApplication] = useState<MembershipApplication | null>(null);
  const [withdrawalApplication, setWithdrawalApplication] = useState<WithdrawalApplication | null>(null);
  const [joinTemplateUrl, setJoinTemplateUrl] = useState("");
  const [joinTemplateName, setJoinTemplateName] = useState("");
  const [withdrawTemplateUrl, setWithdrawTemplateUrl] = useState("");
  const [withdrawTemplateName, setWithdrawTemplateName] = useState("");

  useEffect(() => {
    fetchPublicMembershipTemplates()
      .then((templates) => {
        setJoinTemplateUrl(templates.join?.fileUrl || "");
        setJoinTemplateName(templates.join?.fileName || "");
        setWithdrawTemplateUrl(templates.withdraw?.fileUrl || "");
        setWithdrawTemplateName(templates.withdraw?.fileName || "");
      })
      .catch(() => {
        // 模板未配置时不阻断页面
      });
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("paleo_current_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      // Load user-specific states
      loadUserState(user.email);
    }

    const storedAllUsers = localStorage.getItem("paleo_all_users");
    if (storedAllUsers) {
      setAllUsers(JSON.parse(storedAllUsers));
    } else {
      localStorage.setItem("paleo_all_users", JSON.stringify(MOCK_USER_DB.map(({ password, ...u }) => u)));
    }
  }, []);

  // 从后端同步会员费/会议报名状态
  useEffect(() => {
    if (!currentUser || !getUserToken()) return;
    const syncFromApi = async () => {
      try {
        await syncBusinessStateFromApi(currentUser.email);
      } catch {
        // 静默失败，避免打断用户操作
      }
    };
    syncFromApi();
    const timer = window.setInterval(syncFromApi, 5000);
    return () => window.clearInterval(timer);
  }, [currentUser?.email]);

  // 启动时恢复登录态
  useEffect(() => {
    const token = getUserToken();
    if (!token || currentUser) return;
    fetchAuthInfo()
      .then(({ user, profile }) => {
        const mapped = mapApiUserToLocal(user);
        setCurrentUser(mapped);
        saveState("paleo_current_user", mapped);
        setUserType((user.userType as UserType) || "regular");
        setMembershipChoiceMade(user.membershipChoiceMade === "1");
        loadUserState(user.email);
        return syncBusinessStateFromApi(user.email, profile);
      })
      .catch(() => {
        clearUserToken();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会员到期自动退会：超期未续费 → expired + 非会员身份
  useEffect(() => {
    if (!currentUser || userType !== "member") return;
    if (societyMembership.status !== "active" || !societyMembership.expiryDate) return;
    const expiryEnd = new Date(societyMembership.expiryDate);
    expiryEnd.setHours(23, 59, 59, 999);
    if (new Date() > expiryEnd) {
      handleMembershipExpiry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleMembershipExpiry reads latest state when invoked
  }, [currentUser?.email, userType, societyMembership.status, societyMembership.expiryDate]);

  const loadUserState = (email: string) => {
    const membershipKey = `paleo_society_membership_${email}`;
    const branchesKey = `paleo_bound_branches_${email}`;
    const confsKey = `paleo_confs_${email}`;
    const notifsKey = `paleo_notifs_${email}`;

    const storedMembership = localStorage.getItem(membershipKey);
    setSocietyMembership(storedMembership ? JSON.parse(storedMembership) : DEFAULT_SOCIETY_MEMBERSHIP);

    const storedBranches = localStorage.getItem(branchesKey);
    const parsedBranches: string[] = storedBranches ? JSON.parse(storedBranches) : [];
    // 有效的新格式分会 id（过滤掉旧的数字 id "1"~"6" 等历史残留数据）
    const VALID_BRANCH_IDS = new Set(["zgswxh","gwjzdwxfh","kpgzwyh","bfxfh","wtxfh","hszlzwyh","gzwxfh","dqswx","gst","gjzdw","swcj","xjsxff"]);
    const cleanBranches = Array.from(new Set(parsedBranches.filter((id: string) => VALID_BRANCH_IDS.has(id))));
    setBoundBranches(cleanBranches);
    // 如果数据被清理了，同步写回 localStorage
    if (cleanBranches.length !== parsedBranches.length) {
      localStorage.setItem(branchesKey, JSON.stringify(cleanBranches));
    }

    const storedConfs = localStorage.getItem(confsKey);
    setConferenceRegs(storedConfs ? JSON.parse(storedConfs) : {});

    const storedNotifs = localStorage.getItem(notifsKey);
    setNotifications(storedNotifs ? JSON.parse(storedNotifs) : DEFAULT_NOTIFICATIONS);

    const typeKey = `paleo_user_type_${email}`;
    const storedType = localStorage.getItem(typeKey);
    setUserType((storedType as UserType) || "regular");

    const choiceKey = `paleo_choice_made_${email}`;
    setMembershipChoiceMade(localStorage.getItem(choiceKey) === "true");

    // Phase 6: 加载入会/退会申请书
    const appKey = `paleo_membership_application_${email}`;
    const storedApp = localStorage.getItem(appKey);
    setMembershipApplication(storedApp ? JSON.parse(storedApp) : null);

    const wdKey = `paleo_withdrawal_application_${email}`;
    const storedWd = localStorage.getItem(wdKey);
    setWithdrawalApplication(storedWd ? JSON.parse(storedWd) : null);
  };

  const syncBusinessStateFromApi = async (email: string, profile?: ApiMemberProfile) => {
    let resolvedProfile = profile;
    if (!resolvedProfile && getUserToken()) {
      try {
        const info = await fetchAuthInfo();
        resolvedProfile = info.profile;
      } catch {
        // 忽略 profile 拉取失败，继续使用其它数据源
      }
    }

    const [payments, registrations, joinApps, withdrawApps, branchBindings] = await Promise.all([
      fetchMyMembershipPayments(),
      fetchMyConferenceRegistrations(),
      fetchMyMembershipApplications("JOIN"),
      fetchMyMembershipApplications("WITHDRAW"),
      getUserToken() ? fetchMyBranchBindings().catch(() => [] as string[]) : Promise.resolve([] as string[]),
    ]);

    const latestPayment = payments.find((p) => (p.paymentStatus || "").toUpperCase() !== "VOIDED");
    const paymentStatus = latestPayment ? mapApiPaymentStatus(latestPayment.paymentStatus) : undefined;
    const pendingJoin = joinApps.find((app) => app.reviewStatus === "PENDING");
    const latestJoin = pendingJoin ?? joinApps.find((app) => app.reviewStatus === "APPROVED") ?? joinApps[0];
    const pendingWithdraw = withdrawApps.find((app) => app.reviewStatus === "PENDING");
    const latestWithdraw = pendingWithdraw ?? withdrawApps[0];
    let membership: SocietyMembership = { ...DEFAULT_SOCIETY_MEMBERSHIP };
    let nextMembershipApp: MembershipApplication | null = null;
    let nextWithdrawalApp: WithdrawalApplication | null = null;

    const paymentActive = latestPayment && paymentStatus && paymentStatus !== "unpaid";
    const paymentInProgress = paymentActive && paymentStatus !== "confirmed";

    const profileIsActive = resolvedProfile?.memberStatus === "ACTIVE";

    if (pendingJoin) {
      const appStatus = mapApiApplicationReviewStatus(pendingJoin.reviewStatus, "JOIN");
      membership = {
        ...membership,
        status: appStatus as SocietyMembership["status"],
        applicationRejectReason: undefined,
        history: membership.history,
      };
      nextMembershipApp = {
        applicationId: pendingJoin.applicationId,
        status: appStatus,
        applicationFileUrl: pendingJoin.applicationFileUrl || "",
        applicationFileName: "入会申请书",
        submitTime: pendingJoin.createTime || "",
        reviewTime: pendingJoin.reviewTime,
        rejectReason: pendingJoin.reviewComment,
      };
    } else if (pendingWithdraw) {
      const wdStatus = mapApiApplicationReviewStatus(pendingWithdraw.reviewStatus, "WITHDRAW");
      membership = {
        ...membership,
        status: wdStatus as SocietyMembership["status"],
        history: membership.history,
      };
      nextWithdrawalApp = {
        applicationId: pendingWithdraw.applicationId,
        status: wdStatus,
        applicationFileUrl: pendingWithdraw.applicationFileUrl || "",
        applicationFileName: "退会申请书",
        submitTime: pendingWithdraw.createTime || "",
        reviewTime: pendingWithdraw.reviewTime,
        rejectReason: pendingWithdraw.reviewComment,
      };
    } else if (paymentInProgress) {
      const record: PaymentRecord = {
        id: `rec-s-${latestPayment.paymentId}`,
        type: "society_fee",
        targetName: "中国古生物学会会员费",
        amount: Number(latestPayment.amount || 0),
        voucherUrl: latestPayment.voucherUrl || "",
        invoiceUrl: latestPayment.invoiceUrl || "",
        submitTime: latestPayment.createTime || new Date().toLocaleString("zh-CN"),
        status: paymentStatus as PaymentRecord["status"],
        rejectReason: latestPayment.reviewComment,
      };
      membership = {
        ...membership,
        status: paymentStatus as SocietyMembership["status"],
        currentPaymentId: latestPayment.paymentId,
        voucherRejectReason: paymentStatus === "voucher_rejected" ? latestPayment.reviewComment : undefined,
        invoiceRejectReason: paymentStatus === "invoice_rejected" ? latestPayment.reviewComment : undefined,
        expiryDate: undefined,
        history: [record],
      };
    } else if (profileIsActive && paymentActive && paymentStatus === "confirmed") {
      const record: PaymentRecord | null = latestPayment
        ? {
            id: `rec-s-${latestPayment.paymentId}`,
            type: "society_fee",
            targetName: "中国古生物学会会员费",
            amount: Number(latestPayment.amount || 0),
            voucherUrl: latestPayment.voucherUrl || "",
            invoiceUrl: latestPayment.invoiceUrl || "",
            submitTime: latestPayment.createTime || new Date().toLocaleString("zh-CN"),
            status: "approved",
          }
        : null;
      membership = {
        ...membership,
        status: "active",
        currentPaymentId: latestPayment?.paymentId,
        expiryDate: resolvedProfile?.validEndDate || undefined,
        history: record ? [record] : membership.history,
      };
    } else if (latestJoin?.reviewStatus === "APPROVED") {
      membership = {
        ...membership,
        status: "application_approved",
        history: membership.history,
      };
      nextMembershipApp = {
        applicationId: latestJoin.applicationId,
        status: "application_approved",
        applicationFileUrl: latestJoin.applicationFileUrl || "",
        applicationFileName: "入会申请书",
        submitTime: latestJoin.createTime || "",
        reviewTime: latestJoin.reviewTime,
        rejectReason: latestJoin.reviewComment,
      };
    } else if (latestJoin && latestJoin.reviewStatus === "REJECTED") {
      const appStatus = mapApiApplicationReviewStatus(latestJoin.reviewStatus, "JOIN");
      membership = {
        ...membership,
        status: appStatus as SocietyMembership["status"],
        applicationRejectReason: latestJoin.reviewComment,
        history: membership.history,
      };
      nextMembershipApp = {
        applicationId: latestJoin.applicationId,
        status: appStatus,
        applicationFileUrl: latestJoin.applicationFileUrl || "",
        applicationFileName: "入会申请书",
        submitTime: latestJoin.createTime || "",
        reviewTime: latestJoin.reviewTime,
        rejectReason: latestJoin.reviewComment,
      };
    } else if (resolvedProfile?.memberStatus === "PENDING") {
      membership = { ...membership, status: "application_approved", history: membership.history };
    } else if (resolvedProfile?.memberStatus === "EXPIRED") {
      membership = {
        ...membership,
        status: "expired",
        expiryDate: resolvedProfile.validEndDate || membership.expiryDate,
        history: membership.history,
      };
    } else if (resolvedProfile?.memberStatus === "WITHDRAWN" && withdrawalStillAuthoritative(joinApps, latestWithdraw)) {
      membership = { ...membership, status: "withdrawn", history: membership.history };
    }

    if (latestWithdraw && !pendingWithdraw) {
      const wdStatus = mapApiApplicationReviewStatus(latestWithdraw.reviewStatus, "WITHDRAW");
      if (withdrawalStillAuthoritative(joinApps, latestWithdraw)) {
        if (wdStatus === "withdrawal_submitted") {
          membership = { ...membership, status: "withdrawal_submitted", history: membership.history };
        } else if (wdStatus === "withdrawn") {
          membership = { ...membership, status: "withdrawn", history: membership.history };
        }
      }
      nextWithdrawalApp = {
        applicationId: latestWithdraw.applicationId,
        status: wdStatus,
        applicationFileUrl: latestWithdraw.applicationFileUrl || "",
        applicationFileName: "退会申请书",
        submitTime: latestWithdraw.createTime || "",
        reviewTime: latestWithdraw.reviewTime,
        rejectReason: latestWithdraw.reviewComment,
      };
    }

    const confRegs: { [confId: string]: ConferenceReg } = {};
    for (const reg of registrations) {
      if (!reg.conferenceCode || !isKnownConferenceCode(reg.conferenceCode)) continue;
      const mapped = mapApiRegistrationToConferenceReg(reg);
      confRegs[reg.conferenceCode] = {
        ...mapped,
        registrationId: reg.registrationId,
        conferenceCode: reg.conferenceCode,
        conferenceTitle: reg.conferenceTitle,
        name: currentUser?.name || "",
        gender: currentUser?.gender || "男",
        unit: currentUser?.unit || "",
        role: currentUser?.role || "教师",
        status: mapped.status as ConferenceReg["status"],
        feeType: mapped.feeType as ConferenceReg["feeType"],
      };
    }

    const syncedBranches = Array.from(new Set(branchBindings.filter((id) => id && id !== "zgswxh")));

    setSocietyMembership(membership);
    setConferenceRegs(confRegs);
    setBoundBranches(syncedBranches);
    setMembershipApplication(nextMembershipApp);
    setWithdrawalApplication(nextWithdrawalApp);
    saveState(`paleo_society_membership_${email}`, membership);
    saveState(`paleo_confs_${email}`, confRegs);
    saveState(`paleo_bound_branches_${email}`, syncedBranches);
    if (nextMembershipApp) {
      localStorage.setItem(`paleo_membership_application_${email}`, JSON.stringify(nextMembershipApp));
    } else {
      localStorage.removeItem(`paleo_membership_application_${email}`);
    }
    if (nextWithdrawalApp) {
      localStorage.setItem(`paleo_withdrawal_application_${email}`, JSON.stringify(nextWithdrawalApp));
    } else {
      localStorage.removeItem(`paleo_withdrawal_application_${email}`);
    }

    if (getUserToken()) {
      try {
        const authInfo = await fetchAuthInfo();
        let apiUserType = (authInfo.user.userType as UserType) || "regular";
        if (membership.status === "active" && apiUserType !== "member") {
          await updateUserTypeApi("member", true);
          apiUserType = "member";
        } else if (membership.status === "application_approved" && apiUserType !== "member") {
          await updateUserTypeApi("member", true);
          apiUserType = "member";
        } else if (
          (membership.status === "expired" || membership.status === "withdrawn")
          && apiUserType !== "non_member"
        ) {
          await updateUserTypeApi("non_member", true);
          apiUserType = "non_member";
        }
        setUserType(apiUserType);
        localStorage.setItem(`paleo_user_type_${email}`, apiUserType);
        const choiceMade = membership.status === "active" || authInfo.user.membershipChoiceMade === "1";
        setMembershipChoiceMade(choiceMade);
        localStorage.setItem(`paleo_choice_made_${email}`, choiceMade ? "true" : "false");
      } catch {
        if (membership.status === "active") {
          setUserType("member");
          localStorage.setItem(`paleo_user_type_${email}`, "member");
          setMembershipChoiceMade(true);
          localStorage.setItem(`paleo_choice_made_${email}`, "true");
        }
      }
    }
  };

  /** 用户端写入时同步管理端 localStorage（Phase 1/2 双写策略） */
  const ADMIN_MIRROR_PREFIXES = ["paleo_confs_", "paleo_society_membership_", "paleo_bound_branches_"];

  const saveState = (key: string, data: unknown) => {
    localStorage.setItem(key, JSON.stringify(data));
    if (ADMIN_MIRROR_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.setItem(key.replace(/^paleo_/, "paleo_admin_"), JSON.stringify(data));
    }
  };

  const syncAdminUserRegistry = (user: User) => {
    const profile = {
      name: user.name,
      email: user.email,
      gender: user.gender,
      unit: user.unit,
      role: user.role,
      isStudent: user.isStudent ?? user.role === "学生",
      memberType: user.memberType,
    };
    const adminUsers: typeof profile[] = JSON.parse(localStorage.getItem("paleo_admin_all_users") || "[]");
    const idx = adminUsers.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) adminUsers[idx] = { ...adminUsers[idx], ...profile };
    else adminUsers.push(profile);
    localStorage.setItem("paleo_admin_all_users", JSON.stringify(adminUsers));
  };

  const addNotification = (notif: Omit<SystemNotification, "id" | "time" | "read">, email?: string) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      time: new Date().toLocaleString("zh-CN"),
      read: false,
      ...notif
    };
    const targetEmail = email || currentUser?.email;
    if (targetEmail) {
      const key = `paleo_notifs_${targetEmail}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const updated = [newNotif, ...existing];
      localStorage.setItem(key, JSON.stringify(updated));
      if (!email || email === currentUser?.email) {
        setNotifications(prev => [newNotif, ...prev]);
      }
    }
    return newNotif;
  };

  // ==========================================
  // AUTH ACTIONS
  // ==========================================

  const register = (user: User, password: string): boolean => {
    void (async () => {
      try {
        const data = await registerUser({
          email: user.email,
          name: user.name,
          gender: user.gender,
          unit: user.unit,
          role: user.role,
          isStudent: user.isStudent ?? user.role === "学生",
          title: user.title,
        }, password);
        const mapped = mapApiUserToLocal(data.user);
        setCurrentUser(mapped);
        saveState("paleo_current_user", mapped);
        loadUserState(user.email);
        await syncBusinessStateFromApi(user.email, data.profile);
        toast.success("账号注册成功！请登录后前往【学会服务 → 会员服务】完成会员路径选择。");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "注册失败");
      }
    })();
    return true;
  };

  const login = (email: string, password: string): boolean => {
    void (async () => {
      try {
        const data = await loginUser(email, password);
        const mapped = mapApiUserToLocal(data.user);
        setCurrentUser(mapped);
        saveState("paleo_current_user", mapped);
        setUserType((data.user.userType as UserType) || "regular");
        setMembershipChoiceMade(data.user.membershipChoiceMade === "1");
        loadUserState(email);
        await syncBusinessStateFromApi(email, data.profile);
        toast.success(`欢迎回来，${mapped.name}！`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "登录失败");
      }
    })();
    return true;
  };

  const logout = () => {
    if (currentUser) {
      const email = currentUser.email;
      saveState(`paleo_society_membership_${email}`, societyMembership);
      saveState(`paleo_bound_branches_${email}`, boundBranches);
      saveState(`paleo_confs_${email}`, conferenceRegs);
      saveState(`paleo_notifs_${email}`, notifications);
    }

    setCurrentUser(null);
    localStorage.removeItem("paleo_current_user");
    setSocietyMembership(DEFAULT_SOCIETY_MEMBERSHIP);
    setBoundBranches([]);
    setConferenceRegs({});
    setNotifications([]);
    setUserType("regular");
    setMembershipChoiceMade(false);
    clearUserToken();
    toast.info("您已安全退出登录。");
  };

  const deleteAccount = () => {
    if (!currentUser) return;

    const email = currentUser.email;

    // 1. 从用户数据库中删除
    const users = JSON.parse(localStorage.getItem("paleo_user_db") || JSON.stringify(MOCK_USER_DB));
    const filteredUsers = users.filter((u: any) => u.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem("paleo_user_db", JSON.stringify(filteredUsers));

    // 2. 清除该用户的所有个人数据
    localStorage.removeItem(`paleo_society_membership_${email}`);
    localStorage.removeItem(`paleo_bound_branches_${email}`);
    localStorage.removeItem(`paleo_confs_${email}`);
    localStorage.removeItem(`paleo_notifs_${email}`);
    localStorage.removeItem(`paleo_user_type_${email}`);
    localStorage.removeItem(`paleo_choice_made_${email}`);

    // 3. 从全体用户列表中删除
    const updatedAllUsers = allUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    setAllUsers(updatedAllUsers);
    saveState("paleo_all_users", updatedAllUsers);

    // 4. 清除登录状态
    localStorage.removeItem("paleo_current_user");
    setCurrentUser(null);
    setSocietyMembership(DEFAULT_SOCIETY_MEMBERSHIP);
    setBoundBranches([]);
    setConferenceRegs({});
    setNotifications([]);
    setUserType("regular");
    setMembershipChoiceMade(false);

    toast.info("您的账号已成功注销。感谢您使用中国古生物学会数字化平台。");
  };

  const updateProfile = (profileUpdates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...profileUpdates };
    setCurrentUser(updated);
    saveState("paleo_current_user", updated);

    const users = JSON.parse(localStorage.getItem("paleo_user_db") || JSON.stringify(MOCK_USER_DB));
    const updatedUsers = users.map((u: any) => u.email === currentUser.email ? { ...u, ...profileUpdates } : u);
    localStorage.setItem("paleo_user_db", JSON.stringify(updatedUsers));

    const updatedAllUsers = allUsers.map(u => u.email === currentUser.email ? { ...u, ...profileUpdates } : u);
    setAllUsers(updatedAllUsers);
    saveState("paleo_all_users", updatedAllUsers);
    syncAdminUserRegistry(updated);

    addNotification({ title: "个人资料更新成功", content: "您的实名信息和学术背景资料已成功更新。", type: "info" });
    toast.success("个人信息修改成功！");
  };

  const resetPassword = (email: string) => {
    const users = JSON.parse(localStorage.getItem("paleo_user_db") || JSON.stringify(MOCK_USER_DB));
    const exists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      toast.error("未找到该邮箱注册的账号。");
      return;
    }
    toast.success(`密码重置邮件已发送至 ${email}，请查收并按照链接修改密码。`);
  };

  // ==========================================
  // 统一学会会员费（两阶段审核）
  // ==========================================

  /** @deprecated Phase 2: 请使用 submitMembershipVoucher */
  const applySocietyMembership = (voucherUrl: string, invoiceUrl: string, amount: number) => {
    submitMembershipVoucher(voucherUrl, amount);
  };

  /** 阶段一：提交缴费凭证 → status = voucher_submitted */
  const submitMembershipVoucher = async (voucherUrl: string, amount: number, fileName?: string): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }

    const payableStatuses: (MembershipStatus | "unpaid")[] = [
      "application_approved",
      "expired",
      "voucher_rejected",
      "invoice_rejected",
      "invoice_pending",
      "invoice_overdue",
      "unpaid",
      "not_member",
    ];
    if (userType === "member" && !payableStatuses.includes(societyMembership.status as MembershipStatus)) {
      toast.error("请先提交入会申请书并通过管理员审核后，再缴纳会费。");
      return false;
    }

    try {
      const feeType = deriveFeeType(userType, currentUser.isStudent ?? (currentUser.role === "学生"));
      const payment = await createMembershipPayment(amount, feeType);
      const paymentId = payment.paymentId;
      if (!paymentId) throw new Error("创建缴费记录失败");

      await uploadMembershipPaymentFile(
        paymentId,
        "voucher",
        dataUrlToFile({ name: fileName || "voucher", dataUrl: voucherUrl }),
      );
      await syncBusinessStateFromApi(currentUser.email);

      addNotification({
        title: "会员费凭证已提交",
        content: `您提交的会员费凭证（¥${amount}）已进入审核队列，请等待管理员初审（通常 1-3 个工作日）。`,
        type: "info",
      });
      toast.success("会员费凭证已提交，请等待管理员审核。");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  /** 阶段二：提交电子发票 → status = invoice_submitted */
  const submitMembershipInvoice = async (invoiceUrl: string, fileName?: string): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }

    if (societyMembership.status !== "invoice_pending" && societyMembership.status !== "invoice_overdue") {
      toast.error("请先等待凭证初审通过后再上传发票。");
      return false;
    }
    const paymentId = societyMembership.currentPaymentId;
    if (!paymentId) {
      toast.error("未找到有效的会员费记录，请重新提交凭证。");
      return false;
    }

    try {
      await uploadMembershipPaymentFile(
        paymentId,
        "invoice",
        dataUrlToFile({ name: fileName || "invoice", dataUrl: invoiceUrl }),
      );
      await syncBusinessStateFromApi(currentUser.email);

      addNotification({
        title: "电子发票已提交，等待财务终审",
        content: "您的电子发票已提交，财务人员正在进行终审，通过后会员资格将正式生效。",
        type: "info",
      });
      toast.success("电子发票已提交，请等待管理员终审。");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  // ==========================================
  // 分会绑定/解绑
  // ==========================================

  const toggleBranchBinding = async (branchId: string) => {
    if (!currentUser) {
      toast.error("请先登录系统。");
      return;
    }

    if (branchId === "zgswxh") {
      toast.error("总学会默认已绑定，无需操作。");
      return;
    }

    const isBound = boundBranches.includes(branchId);
    const branchName = getBranchName(branchId);

    try {
      const updatedBranches = isBound
        ? await unbindBranch(branchId)
        : await bindBranch(branchId);

      const syncedBranches = Array.from(new Set(updatedBranches.filter((id) => id && id !== "zgswxh")));
      setBoundBranches(syncedBranches);
      saveState(`paleo_bound_branches_${currentUser.email}`, syncedBranches);

      if (isBound) {
        addNotification({
          title: "已解绑分会",
          content: `您已成功解绑【${branchName}】，将不再接收该分会的会议通知和学术资讯。`,
          type: "info",
        });
        toast.success(`已解绑【${branchName}】。`);
      } else {
        addNotification({
          title: "成功绑定分会",
          content: `您已成功绑定【${branchName}】！今后将自动接收该分会发布的会议通知和学术资讯。`,
          type: "success",
        });
        toast.success(`已成功绑定【${branchName}】！`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "分会绑定操作失败");
    }
  };

  // ==========================================
  // CONFERENCE ACTIONS（两阶段审核）
  // ==========================================

  /** @deprecated Phase 2: 请使用 submitConferenceVoucher */
  const payConference = async (confId: string, voucherUrl: string, _invoiceUrl: string, amount: number) => {
    return submitConferenceVoucher(confId, voucherUrl, amount);
  };

  /** 阶段一：提交会议费凭证 → status = voucher_submitted */
  const submitConferenceVoucher = async (confId: string, voucherUrl: string, amount: number): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }

    if (userType === "regular") {
      toast.error("请先选择您的参与方式（会员/非会员）后再报名会议。");
      return false;
    }
    if (userType === "member" && societyMembership.status !== "active" && societyMembership.status !== "invoice_pending" && societyMembership.status !== "invoice_submitted") {
      toast.error("您尚未完成会员缴费验证，请先前往会员服务完成入会流程后再报名会议。");
      return false;
    }

    const confTitle = getConferenceTitle(confId);
    const confBranchId = getConferenceBranchId(confId);
    if (confBranchId && !isSocietyAccessible(boundBranches, confBranchId)) {
      toast.error(`您需要先绑定该会议所属的分会（${getBranchName(confBranchId)}），才能缴纳会议注册费。`);
      return false;
    }

    const feeType = deriveFeeType(userType, currentUser.isStudent ?? (currentUser.role === "学生"));
    const lockedAmount = getConferenceFeeByType(confId, feeType);
    if (lockedAmount <= 0) {
      toast.error("当前身份暂不支持报名该会议，请联系学会管理员。");
      return false;
    }

    try {
      const reg = await createConferenceRegistration(confId, feeType, lockedAmount);
      const registrationId = reg.registrationId;
      if (!registrationId) throw new Error("创建会议报名记录失败");

      await uploadConferenceRegistrationFile(
        registrationId,
        "voucher",
        dataUrlToFile({ name: "conference-voucher", dataUrl: voucherUrl }),
      );
      await syncBusinessStateFromApi(currentUser.email);

      addNotification({
        title: "会议注册费凭证已提交",
        content: `【${confTitle}】凭证（¥${lockedAmount}）已提交，请等待管理员初审（通常 1-3 个工作日）。`,
        type: "info",
      });
      toast.success(`【${confTitle}】凭证已提交，请等待管理员审核。`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  /** 阶段二：提交会议费发票 + OCR 模拟比对 → status = invoice_submitted */
  const submitConferenceInvoice = async (confId: string, invoiceUrl: string): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }

    const currentReg = conferenceRegs[confId];
    if (!currentReg) {
      toast.error("请先提交会议注册费凭证。");
      return false;
    }

    if (currentReg.status !== "invoice_pending" && currentReg.status !== "invoice_overdue") {
      toast.error("请先等待凭证初审通过后再上传发票。");
      return false;
    }
    const registrationId = currentReg.registrationId;
    if (!registrationId) {
      toast.error("未找到有效的会议报名记录，请重新提交凭证。");
      return false;
    }

    try {
      await uploadConferenceRegistrationFile(
        registrationId,
        "invoice",
        dataUrlToFile({ name: "conference-invoice", dataUrl: invoiceUrl }),
      );
      await syncBusinessStateFromApi(currentUser.email);

      const confTitle = getConferenceTitle(confId);
      addNotification({
        title: "会议费发票已提交",
        content: `【${confTitle}】电子发票已提交，请等待管理员终审。`,
        type: "info",
      });
      toast.success("电子发票已提交，请等待管理员终审。");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  const submitConferenceForm = (confId: string, formData: Omit<ConferenceReg, "status" | "paymentVoucher" | "invoiceUrl">) => {
    if (!currentUser) return;

    const currentReg = conferenceRegs[confId];
    if (!currentReg || currentReg.status !== CONFERENCE_STATUS.CONFIRMED) {
      toast.error("请先完成会议费两阶段审核（凭证→发票→终审确认）后再填写参会信息。");
      return;
    }

    const updatedReg: ConferenceReg = {
      ...currentReg,
      ...formData,
      status: CONFERENCE_STATUS.CONFIRMED,
      lastUpdated: new Date().toLocaleString("zh-CN")
    };

    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);

    const confTitle = getConferenceTitle(confId);
    addNotification({
      title: "参会信息已更新",
      content: `您已成功提交/更新了在【${confTitle}】中的参会信息。请记得在截止日前上传电子发票完成终审。`,
      type: "success"
    });

    toast.success("参会及报告信息保存成功！");
  };

  const deleteAbstract = (confId: string) => {
    if (!currentUser) return;
    const currentReg = conferenceRegs[confId];
    if (!currentReg) return;

    const updatedReg: ConferenceReg = { ...currentReg, abstractFileName: undefined, lastUpdated: new Date().toLocaleString("zh-CN") };
    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
    toast.info("学术论文摘要文件已成功删除，请尽快上传新版摘要。");
  };

  const uploadAbstract = (confId: string, fileName: string) => {
    if (!currentUser) return;
    const currentReg = conferenceRegs[confId];
    if (!currentReg) return;

    const updatedReg: ConferenceReg = { ...currentReg, abstractFileName: fileName, lastUpdated: new Date().toLocaleString("zh-CN") };
    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
    toast.success(`新摘要【${fileName}】上传成功！`);
  };

  // Phase 4: 上传摘要文件（含 URL）
  const uploadAbstractFile = (confId: string, fileUrl: string, fileName: string) => {
    if (!currentUser) return;
    const currentReg = conferenceRegs[confId];
    if (!currentReg) return;

    const now = new Date().toLocaleString("zh-CN");
    const updatedReg: ConferenceReg = {
      ...currentReg,
      abstractFileName: fileName,
      abstractFileUrl: fileUrl,
      abstractSubmitTime: now,
      lastUpdated: now,
    };
    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
    toast.success(`论文摘要【${fileName}】上传成功！`);
  };

  // Phase 4: 设置住宿类型（性别化选项）
  const setAccommodation = (confId: string, type: AccommodationType) => {
    if (!currentUser) return;
    const currentReg = conferenceRegs[confId];
    if (!currentReg) return;

    const updatedReg: ConferenceReg = {
      ...currentReg,
      accommodationType: type,
      lastUpdated: new Date().toLocaleString("zh-CN"),
    };
    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
  };

  // Phase 4: 切换野外路线选择
  const toggleFieldTripRoute = (confId: string, phase: "pre" | "during" | "post", routeId: string) => {
    if (!currentUser) return;
    const currentReg = conferenceRegs[confId];
    if (!currentReg) return;

    const currentSelections = currentReg.fieldTripSelections || createEmptyFieldTripSelections();
    const phaseRoutes = [...currentSelections[phase]];
    const idx = phaseRoutes.indexOf(routeId);
    if (idx >= 0) {
      phaseRoutes.splice(idx, 1);
    } else {
      phaseRoutes.push(routeId);
    }

    const updatedReg: ConferenceReg = {
      ...currentReg,
      fieldTripSelections: { ...currentSelections, [phase]: phaseRoutes },
      lastUpdated: new Date().toLocaleString("zh-CN"),
    };
    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
  };

  // ── 宽限期与过期处理 ──

  /** 检查并更新所有逾期发票记录 */
  const checkInvoiceOverdue = () => {
    if (!currentUser) return;

    const today = new Date().toISOString().split("T")[0];
    let hasChanges = false;

    // 1. 检查会员费发票是否逾期
    const memberDeadline = societyMembership.invoiceExtendedDeadline || societyMembership.invoiceDeadline;
    if (memberDeadline && today > memberDeadline && societyMembership.status === "invoice_pending") {
      const updatedMembership: SocietyMembership = {
        ...societyMembership,
        status: "invoice_overdue",
        frozenDueToExpiry: true
      };
      setSocietyMembership(updatedMembership);
      saveState(`paleo_society_membership_${currentUser.email}`, updatedMembership);

      addNotification({
        title: "会员费发票上传已逾期",
        content: `发票上传截止日 ${memberDeadline} 已过，会员资格暂时锁定。请尽快上传发票以恢复会员资格。`,
        type: "warning"
      });
      hasChanges = true;
    }
    // 临近提醒（3天内）
    else if (memberDeadline && societyMembership.status === "invoice_pending") {
      const deadlineDate = new Date(memberDeadline);
      const todayDate = new Date(today);
      const daysLeft = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3 && daysLeft > 0) {
        toast.warning(`会员费发票上传截止日还有 ${daysLeft} 天`);
      }
    }

    // 2. 检查各会议费发票是否逾期
    const updatedRegs = { ...conferenceRegs };
    for (const [confId, reg] of Object.entries(updatedRegs)) {
      const confDeadline = reg.invoiceExtendedDeadline || reg.invoiceDeadline;
      if (confDeadline && today > confDeadline && reg.status === "invoice_pending") {
        updatedRegs[confId] = {
          ...reg,
          status: "invoice_overdue",
          lastUpdated: new Date().toLocaleString("zh-CN")
        };
        hasChanges = true;
        const confTitle = getConferenceTitle(confId);
        addNotification({
          title: "会议费发票上传已逾期",
          content: `【${confTitle}】的发票上传截止日 ${confDeadline} 已过。请尽快上传发票以完成报名确认。`,
          type: "warning"
        });
      } else if (confDeadline && reg.status === "invoice_pending") {
        const deadlineDate = new Date(confDeadline);
        const todayDate = new Date(today);
        const daysLeft = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3 && daysLeft > 0) {
          toast.warning(`【${getConferenceTitle(confId)}】发票上传截止日还有 ${daysLeft} 天`);
        }
      }
    }

    if (hasChanges) {
      setConferenceRegs(updatedRegs);
      saveState(`paleo_confs_${currentUser.email}`, updatedRegs);
    }
  };

  /** 手动延长发票上传期限（后台操作） */
  const extendInvoiceDeadline = (confId: string, newDeadline: string, reason?: string) => {
    if (!currentUser) return;

    const currentReg = conferenceRegs[confId];
    if (!currentReg) {
      toast.error("未找到该会议的报名记录。");
      return;
    }

    const updatedReg: ConferenceReg = {
      ...currentReg,
      invoiceExtendedDeadline: newDeadline,
      // 如果当前是逾期状态，恢复到待上传状态
      status: currentReg.status === "invoice_overdue" ? "invoice_pending" : currentReg.status,
      lastUpdated: new Date().toLocaleString("zh-CN")
    };

    const updatedRegs = { ...conferenceRegs, [confId]: updatedReg };
    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);

    const confTitle = getConferenceTitle(confId);
    const reasonNote = reason ? `（原因：${reason}）` : "";
    addNotification({
      title: "发票上传期限已延长",
      content: `【${confTitle}】的发票上传截止日已延长至 ${newDeadline}。${reasonNote}`,
      type: "info"
    });

    toast.success(`发票截止日已延长至 ${newDeadline}`);
  };

  /** 会员到期时的分级处理（§4.2） */
  const handleMembershipExpiry = () => {
    if (!currentUser) return;

    const updatedRegs = { ...conferenceRegs };
    let frozenCount = 0;
    let expiredCount = 0;

    for (const [confId, reg] of Object.entries(updatedRegs)) {
      switch (reg.status) {
        case "confirmed":
          // 资格保留，不动
          break;
        case "invoice_submitted":
          // 资格锁定
          updatedRegs[confId] = { ...reg, frozenDueToExpiry: true, lastUpdated: new Date().toLocaleString("zh-CN") };
          frozenCount++;
          break;
        case "voucher_submitted":
        case "voucher_rejected":
        case "invoice_pending":
        case "invoice_overdue":
        case "invoice_rejected":
        case "pending":
        case "approved_unfilled":
          // 自动失效
          delete updatedRegs[confId];
          expiredCount++;
          break;
      }
    }

    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);

    // 更新会员状态 → 超期视为自动退会，转为非会员身份（保留分会绑定，可继续以非会员参会）
    const updatedMembership: SocietyMembership = {
      ...societyMembership,
      status: "expired",
      frozenDueToExpiry: true
    };
    setSocietyMembership(updatedMembership);
    saveState(`paleo_society_membership_${currentUser.email}`, updatedMembership);

    setUserType("non_member");
    localStorage.setItem(`paleo_user_type_${currentUser.email}`, "non_member");
    localStorage.setItem(`paleo_admin_user_type_${currentUser.email}`, "non_member");

    addNotification({
      title: "会员资格已到期 — 已自动转为非会员",
      content: `您的学会会员已到期，系统已自动解除会员资格，您可继续以非会员身份绑定学会并参会。${frozenCount > 0 ? `${frozenCount} 个待终审的会议报名已锁定。` : ""}${expiredCount > 0 ? `${expiredCount} 个未完成报名的会议已自动取消。` : ""}`,
      type: "warning"
    });
  };

  /** 续费后的恢复逻辑（§4.3） */
  const handleMembershipRenewal = () => {
    if (!currentUser) return;

    const updatedRegs = { ...conferenceRegs };
    let restoredCount = 0;

    for (const [confId, reg] of Object.entries(updatedRegs)) {
      if (reg.frozenDueToExpiry) {
        updatedRegs[confId] = { ...reg, frozenDueToExpiry: false, lastUpdated: new Date().toLocaleString("zh-CN") };
        restoredCount++;
      }
    }

    setConferenceRegs(updatedRegs);
    saveState(`paleo_confs_${currentUser.email}`, updatedRegs);

    if (restoredCount > 0) {
      addNotification({
        title: "会议资格已恢复",
        content: `会员续费完成，${restoredCount} 个因会员到期而锁定的会议报名资格已恢复。请前往绑定分会。`,
        type: "success"
      });

      toast.info(`${restoredCount} 个会议资格已恢复。请手动重新绑定分会。`);
    }
  };

  // ==========================================
  // Phase 6: 入会/退会申请
  // ==========================================

  /** 提交入会申请书 → status = application_submitted */
  const submitMembershipApplicationAction = async (file: File): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }
    if (!file) { toast.error("请先上传入会申请书（必填）。"); return false; }

    try {
      const existing = await fetchMyMembershipApplications("JOIN");
      if (existing.some((app) => app.reviewStatus === "PENDING")) {
        await syncBusinessStateFromApi(currentUser.email);
        toast.info("您已有待审核的入会申请，请等待管理员审核。");
        return true;
      }

      const feeType = deriveFeeType(userType, currentUser.isStudent ?? (currentUser.role === "学生"));
      const created = await createMembershipApplication({
        applicationType: "JOIN",
        applicantName: currentUser.name,
        applicantEmail: currentUser.email,
        memberCategory: feeType,
      });
      if (!created.applicationId) throw new Error("创建入会申请失败");

      await uploadMembershipApplicationFile(created.applicationId, file);

      const optimisticApp: MembershipApplication = {
        applicationId: created.applicationId,
        status: "application_submitted",
        applicationFileUrl: "",
        applicationFileName: file.name,
        submitTime: new Date().toISOString(),
      };
      const optimisticMembership: SocietyMembership = {
        ...societyMembership,
        status: "application_submitted",
        history: societyMembership.history,
      };
      setMembershipApplication(optimisticApp);
      setSocietyMembership(optimisticMembership);
      saveState(`paleo_society_membership_${currentUser.email}`, optimisticMembership);

      await syncBusinessStateFromApi(currentUser.email);

      addNotification({
        title: "入会申请书已提交",
        content: "您的入会申请书已成功提交，管理员将在1-3个工作日内审核。审核通过后即可缴纳会费。",
        type: "info",
      });
      toast.success("入会申请书已提交，请等待管理员审核。");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  /** 取消入会申请（仅在审核中时可用） */
  const cancelMembershipApplicationAction = async () => {
    if (!currentUser) { toast.error("请先登录系统。"); return; }
    if (!membershipApplication?.applicationId) {
      toast.error("当前没有待审核的入会申请。");
      return;
    }

    try {
      await cancelMembershipApplication(membershipApplication.applicationId);
      setMembershipApplication(null);
      const updatedMembership: SocietyMembership = {
        ...societyMembership,
        status: "not_member",
        history: societyMembership.history,
      };
      setSocietyMembership(updatedMembership);
      saveState(`paleo_society_membership_${currentUser.email}`, updatedMembership);

      addNotification({
        title: "入会申请已取消",
        content: "您的入会申请书已取消。",
        type: "info",
      });
      toast.info("入会申请已取消。");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取消失败");
    }
  };

  /** 提交退会申请书 → status = withdrawal_submitted */
  const submitWithdrawalApplicationAction = async (file: File): Promise<boolean> => {
    if (!currentUser) { toast.error("请先登录系统。"); return false; }
    if (!getUserToken()) { toast.error("登录已过期，请重新登录。"); return false; }
    if (!file) { toast.error("请先上传退会申请书（必填）。"); return false; }
    if (societyMembership.status !== "active") {
      toast.error("仅有效会员需提交退会申请书。");
      return false;
    }

    try {
      const existing = await fetchMyMembershipApplications("WITHDRAW");
      if (existing.some((app) => app.reviewStatus === "PENDING")) {
        await syncBusinessStateFromApi(currentUser.email);
        toast.error("您已有待审核的退会申请，请勿重复提交。");
        return false;
      }

      const created = await createMembershipApplication({
        applicationType: "WITHDRAW",
        applicantName: currentUser.name,
        applicantEmail: currentUser.email,
      });
      if (!created.applicationId) throw new Error("创建退会申请失败");

      await uploadMembershipApplicationFile(created.applicationId, file);
      await syncBusinessStateFromApi(currentUser.email);

      addNotification({
        title: "退会申请已提交",
        content: "您的退会申请书已提交，管理员审核通过后会员资格将即时终止。",
        type: "warning",
      });
      toast.success("退会申请已提交，请等待管理员审核。");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
      return false;
    }
  };

  /** 取消退会申请（仅在审核中时可用） */
  const cancelWithdrawalApplicationAction = async () => {
    if (!currentUser) { toast.error("请先登录系统。"); return; }
    if (!withdrawalApplication?.applicationId) {
      toast.error("当前没有待审核的退会申请。");
      return;
    }

    try {
      await cancelMembershipApplication(withdrawalApplication.applicationId);
      setWithdrawalApplication(null);
      const updatedMembership: SocietyMembership = {
        ...societyMembership,
        status: "active",
        history: societyMembership.history,
      };
      setSocietyMembership(updatedMembership);
      saveState(`paleo_society_membership_${currentUser.email}`, updatedMembership);

      addNotification({
        title: "退会申请已取消",
        content: "您的退会申请书已取消，会员资格恢复正常。",
        type: "info",
      });
      toast.info("退会申请已取消。");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取消失败");
    }
  };

  /** 获取入会申请书模板下载 URL */
  const getMembershipApplicationTemplateUrl = (): string => {
    if (joinTemplateUrl.startsWith("data:")) return "";
    return joinTemplateUrl;
  };

  /** 获取退会申请书模板下载 URL */
  const getWithdrawalApplicationTemplateUrl = (): string => {
    if (withdrawTemplateUrl.startsWith("data:")) return "";
    return withdrawTemplateUrl;
  };

  const chooseMembershipPath = (path: "member" | "non_member") => {
    if (!currentUser) { toast.error("请先登录系统。"); return; }

    void (async () => {
      try {
        if (getUserToken()) {
          await updateUserTypeApi(path, true);
        }
      } catch {
        // 离线时仍允许本地路径选择
      }

      setUserType(path);
      setMembershipChoiceMade(true);

      const email = currentUser.email;
      localStorage.setItem(`paleo_user_type_${email}`, path);
      localStorage.setItem(`paleo_choice_made_${email}`, "true");

      if (path === "member") {
        addNotification({
          title: "已选择：成为正式会员",
          content: "请前往会员服务页面完成会费缴纳和身份验证，通过后即可享受会员价参会。",
          type: "info",
        });
      } else {
        addNotification({
          title: "已选择：作为非会员使用",
          content: "您可以直接绑定分会并注册会议，会议费将按非会员标准收取。您可随时在会员服务中升级为正式会员。",
          type: "info",
        });
      }
    })();
  };

  // ── 配置读取 ──

  const getMembershipFee = (memberType?: string): number => {
    return getConfiguredMembershipFee(memberType);
  };

  const getConferenceFeeAction = (confId: string): number => {
    const existingReg = conferenceRegs[confId];
    if (existingReg?.lockedAmount != null && existingReg.lockedAmount > 0) {
      return existingReg.lockedAmount;
    }
    const feeType = deriveFeeType(userType, currentUser?.isStudent ?? (currentUser?.role === "学生"));
    return getConferenceFeeByType(confId, feeType);
  };

  // Phase 0: New fee type API
  const getUserFeeType = (): ConferenceFeeType => {
    return deriveFeeType(userType, currentUser?.isStudent ?? (currentUser?.role === "学生"));
  };

  const getConferenceFeeConfigAction = (confId: string): ConferenceFeeConfig => {
    return getConfiguredFeeConfig(confId);
  };

  // Phase F1: File download helpers — 盖章通知和摘要模板仅在缴费终审 confirmed 后解锁
  const isConferenceConfirmed = (confId: string): boolean => {
    const reg = conferenceRegs[confId];
    if (!reg) return false;
    return CONFIRMED_PAYMENT_STATUSES.includes(reg.status as typeof CONFIRMED_PAYMENT_STATUSES[number]);
  };

  const canDownloadStampedNotice = (confId: string): boolean => isConferenceConfirmed(confId);

  const canDownloadAbstractTemplate = (confId: string): boolean => isConferenceConfirmed(confId);

  const canAccessConferenceForm = (confId: string): boolean => isConferenceConfirmed(confId);

  const getConferenceFileUrl = (confId: string, fileType: "stampedNotice" | "abstractTemplate" | "publicNotice"): string | null => {
    const confs = JSON.parse(localStorage.getItem("paleo_admin_conferences_db") || "[]");
    const conf = confs.find((c: { id: string }) => c.id === confId);
    if (!conf) return null;
    if (fileType === "stampedNotice") return conf.stampedNoticeUrl || null;
    if (fileType === "abstractTemplate") return conf.abstractTemplateUrl || null;
    return conf.publicNoticeUrl || null;
  };

  // ==========================================
  // HELPERS & GENERAL
  // ==========================================

  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    if (currentUser) {
      saveState(`paleo_notifs_${currentUser.email}`, updated);
    }
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    if (currentUser) {
      saveState(`paleo_notifs_${currentUser.email}`, updated);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (currentUser) {
      saveState(`paleo_notifs_${currentUser.email}`, []);
    }
    toast.success("消息中心已清空。");
  };

  const getBranchName = (id: string): string => {
    if (ALL_SOCIETY_UNITS[id]) return ALL_SOCIETY_UNITS[id];
    // 优先使用 shared/constants 的 BRANCH_MAP（字符串 ID，如 "wtxfh"）
    const stringMap: { [key: string]: string } = {
      "gwjzdwxfh": "古无脊椎动物学分会",
      "kpgzwyh": "科普工作委员会",
      "bfxfh": "孢粉学分会",
      "wtxfh": "微体学分会",
      "hszlzwyh": "化石藻类专业委员会",
      "gzwxfh": "古植物学分会",
      "dqswx": "地球生物学分会",
      "gst": "古生态专业分会",
      "gjzdw": "古脊椎动物学分会",
      "swcj": "生物沉积学分会",
      "xjsxff": "新技术新方法专业委员会",
    };
    if (stringMap[id]) return stringMap[id];
    // 兼容旧的数字 ID 格式
    const numericMap: { [key: string]: string } = {
      "1": "古无脊椎动物学分会",
      "2": "科普工作委员会",
      "3": "孢粉学分会",
      "4": "微体学分会",
      "5": "化石藻类专业委员会",
      "6": "古植物学分会",
      "7": "地球生物学分会",
      "8": "古生态专业分会",
      "9": "古脊椎动物学分会",
      "10": "生物沉积学分会",
      "11": "新技术新方法专业委员会"
    };
    return numericMap[id] || "学术分会";
  };

  const getConferenceTitle = (id: string): string => {
    const c: { [key: string]: string } = {
      "demo-conf": "【演示会议】古无脊椎动物学学术工作坊",
      "conf-1": "第十五届全国微体古生物学学术研讨会",
      "conf-2": "2026年度古植物学与环境演变论坛",
      "conf-3": "热河生物群国际学术研讨会",
      "conf-4": "第十二届全国古脊椎动物学学术年会",
      "conf-5": "中国孢粉学会第十届全国学术大会",
      "conf-6": "古生态学与古环境重建国际研讨会",
      "conf-7": "地球生物学前沿论坛",
      "conf-8": "古生物学新技术新方法专题研讨会",
      "conf-zgswxh-1": "中国古生物学会第32届学术年会",
      "conf-zgswxh-2": "中国古生物学会国际古生物学前沿论坛",
    };
    return c[id] || "学术会议";
  };

  const getConferenceBranchId = (confId: string): string | null => {
    // 使用 shared/constants.ts CONFERENCE_BRANCH_MAP 中的实际学会/分会 ID
    const map: { [key: string]: string } = {
      "conf-1": "wtxfh",     // 微体学分会
      "conf-2": "gzwxfh",    // 古植物学分会
      "conf-3": "gjzdw",     // 古脊椎动物学分会
      "conf-4": "gjzdw",     // 古脊椎动物学分会
      "conf-5": "bfxfh",     // 孢粉学分会
      "conf-6": "gst",       // 古生态专业分会
      "conf-7": "dqswx",     // 地球生物学分会
      "conf-8": "xjsxff",    // 新技术新方法专业委员会
      "demo-conf": "gwjzdwxfh", // 古无脊椎动物学分会
      "conf-zgswxh-1": "zgswxh", // 中国古生物学会（总学会）
      "conf-zgswxh-2": "zgswxh", // 中国古生物学会（总学会）
    };
    return map[confId] || null;
  };

  /** 获取会议费金额（用于 OCR 比对，优先使用报名时锁定的金额） */
  const getConferenceFee = (confId: string): number => getConferenceFeeAction(confId);

  return (
    <MembershipContext.Provider value={{
      currentUser,
      isLoggedIn: !!currentUser,
      societyMembership,
      boundBranches,
      conferenceRegs,
      notifications,
      allUsers,
      register,
      login,
      logout,
      deleteAccount,
      updateProfile,
      resetPassword,
      applySocietyMembership,
      submitMembershipVoucher,
      submitMembershipInvoice,
      toggleBranchBinding,
      payConference,
      submitConferenceVoucher,
      submitConferenceInvoice,
      submitConferenceForm,
      deleteAbstract,
      uploadAbstract,
      uploadAbstractFile,
      setAccommodation,
      toggleFieldTripRoute,
      checkInvoiceOverdue,
      extendInvoiceDeadline,
      handleMembershipExpiry,
      handleMembershipRenewal,
      getMembershipFee,
      getConferenceFee: getConferenceFeeAction,
      getUserFeeType,
      getConferenceFeeConfig: getConferenceFeeConfigAction,
      canDownloadStampedNotice,
      canDownloadAbstractTemplate,
      canAccessConferenceForm,
      getConferenceFileUrl,
      // Phase 6: 入会/退会申请
      membershipApplication,
      withdrawalApplication,
      submitMembershipApplication: submitMembershipApplicationAction,
      cancelMembershipApplication: cancelMembershipApplicationAction,
      submitWithdrawalApplication: submitWithdrawalApplicationAction,
      cancelWithdrawalApplication: cancelWithdrawalApplicationAction,
      getMembershipApplicationTemplateUrl,
      getWithdrawalApplicationTemplateUrl,
      userType,
      membershipChoiceMade,
      chooseMembershipPath,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications
    }}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error("useMembership must be used within a MembershipProvider");
  }
  return context;
};
