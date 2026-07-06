// ============================================================================
// 共享常量：会员费配置、会议状态枚举、分会 ID 映射
// Phase 1: 数据模型底层
// Phase 0 更新（2026-06-21）：新增总学会模型、四类会议费、用户身份扩展、入会审核状态、住宿/野外结构
// ============================================================================

// ── 会员费金额配置（前端默认值，可被后台配置覆盖） ────────────────────────────

export const MEMBERSHIP_FEE_CONFIG = {
  default: {
    standard: 200,    // 普通会员
    student: 100,     // 学生会员（预留）
    corporate: 5000,  // 单位会员（预留）
  },
  currentYear: 2026,
} as const;

/** 原型阶段从 localStorage 读取配置，fallback 到默认值 */
export function getMembershipFee(memberType: string = "standard"): number {
  const stored = localStorage.getItem("paleo_membership_fee_config");
  if (stored) {
    try {
      const config = JSON.parse(stored);
      if (config[memberType] !== undefined) {
        return config[memberType];
      }
    } catch {
      // fallback
    }
  }
  return MEMBERSHIP_FEE_CONFIG.default[memberType as keyof typeof MEMBERSHIP_FEE_CONFIG.default] ?? MEMBERSHIP_FEE_CONFIG.default.standard;
}

// ── 会议费缴纳两阶段状态枚举 ──────────────────────────────────────────────

/** 会议注册费状态（两阶段审核） */
export const CONFERENCE_STATUS = {
  UNPAID:              "unpaid",
  VOUCHER_SUBMITTED:   "voucher_submitted",   // 凭证已上传，待初审
  VOUCHER_REJECTED:    "voucher_rejected",    // 凭证初审驳回
  INVOICE_PENDING:     "invoice_pending",     // 初审通过，待上传发票（可填参会信息）
  INVOICE_OVERDUE:     "invoice_overdue",     // 发票逾期未上传
  INVOICE_SUBMITTED:   "invoice_submitted",   // 发票已上传，待终审
  INVOICE_REJECTED:    "invoice_rejected",    // 发票终审驳回
  CONFIRMED:           "confirmed",           // 终审通过，报名确认
} as const;

export type ConferenceStatus = typeof CONFERENCE_STATUS[keyof typeof CONFERENCE_STATUS];

/** 学会会员费状态（两阶段审核 + 入会审核 + 退会审核）
 *  Phase 0 新增：application_submitted, application_rejected, application_approved
 *               withdrawal_submitted, withdrawal_rejected, withdrawn */
export const MEMBERSHIP_STATUS = {
  NOT_MEMBER:             "not_member",
  APPLICATION_SUBMITTED:  "application_submitted",   // 入会申请书已提交，待审核
  APPLICATION_REJECTED:   "application_rejected",    // 入会申请被驳回（可重新提交）
  APPLICATION_APPROVED:   "application_approved",    // 入会申请通过，待缴费
  VOUCHER_SUBMITTED:      "voucher_submitted",       // 凭证已上传，待初审
  VOUCHER_REJECTED:       "voucher_rejected",        // 凭证初审驳回
  INVOICE_PENDING:        "invoice_pending",         // 初审通过，待上传发票
  INVOICE_OVERDUE:        "invoice_overdue",         // 发票逾期未上传
  INVOICE_SUBMITTED:      "invoice_submitted",       // 发票已上传，待终审
  INVOICE_REJECTED:       "invoice_rejected",        // 发票终审驳回
  ACTIVE:                 "active",                  // 正式会员
  WITHDRAWAL_SUBMITTED:   "withdrawal_submitted",    // 退会申请已提交，待审核
  WITHDRAWAL_REJECTED:    "withdrawal_rejected",     // 退会申请被驳回
  WITHDRAWN:              "withdrawn",               // 已退会
  EXPIRED:                "expired",                 // 已过期
} as const;

export type MembershipStatus = typeof MEMBERSHIP_STATUS[keyof typeof MEMBERSHIP_STATUS];

// ── 用户类型枚举（双路径选择） ───────────────────────────────────────────────

export const USER_TYPE = {
  REGULAR:      "regular",       // 普通用户，未做选择
  NON_MEMBER:   "non_member",    // 非会员（路径A）
  MEMBER:       "member",        // 正式会员（路径B）
} as const;

export type UserType = typeof USER_TYPE[keyof typeof USER_TYPE];

export const USER_TYPE_LABEL: Record<string, string> = {
  regular:     "普通用户",
  non_member:  "非会员",
  member:      "正式会员",
};

// ── 用户身份扩展（学生/非学生维度） Phase 0 新增 ──────────────────────────

export const USER_IDENTITY = {
  STUDENT:     "student",
  NON_STUDENT: "non_student",
} as const;

export type UserIdentity = typeof USER_IDENTITY[keyof typeof USER_IDENTITY];

export const USER_IDENTITY_LABEL: Record<string, string> = {
  student:     "学生",
  non_student: "非学生",
};

// ── 状态 → UI 标签映射 ────────────────────────────────────────────────────

export const CONFERENCE_STATUS_LABEL: Record<string, string> = {
  unpaid:             "未缴费",
  voucher_submitted:  "凭证初审中",
  voucher_rejected:   "凭证被驳回",
  invoice_pending:    "待上传发票",
  invoice_overdue:    "发票逾期",
  invoice_submitted:  "发票终审中",
  invoice_rejected:   "发票被驳回",
  confirmed:          "✓ 已确认",
};

export const CONFERENCE_STATUS_COLOR: Record<string, string> = {
  unpaid:             "bg-gray-50 text-gray-500 border border-gray-200",
  voucher_submitted:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
  voucher_rejected:   "bg-red-50 text-red-700 border border-red-200",
  invoice_pending:    "bg-blue-50 text-blue-700 border border-blue-200",
  invoice_overdue:    "bg-orange-50 text-orange-700 border border-orange-200",
  invoice_submitted:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
  invoice_rejected:   "bg-red-50 text-red-700 border border-red-200",
  confirmed:          "bg-green-50 text-green-700 border border-green-200",
};

export const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  not_member:           "尚未入会",
  application_submitted: "入会申请审核中",
  application_rejected:  "入会申请被驳回",
  application_approved:  "入会申请已通过",
  voucher_submitted:    "凭证初审中",
  voucher_rejected:     "凭证被驳回",
  invoice_pending:      "待上传发票",
  invoice_overdue:      "发票逾期",
  invoice_submitted:    "发票终审中",
  invoice_rejected:     "发票被驳回",
  active:               "✓ 会员资格有效",
  withdrawal_submitted:  "退会申请审核中",
  withdrawal_rejected:   "退会申请被驳回",
  withdrawn:             "已退会",
  expired:              "已过期",
};

// ── 学会/分会模型 Phase 0 更新 ──────────────────────────────────────────

/** 总学会 ID 常量 */
export const TOTAL_SOCIETY_ID = "zgswxh";

/** 总学会专业分会页顶置模块文案 */
export const TOTAL_SOCIETY_INTRO =
  "中国古生物学会（总学会）负责发布学会层级的学术活动，包括中国古生物学术年会、重要论坛及综合学术活动。总学会不发布各专业分会的会议信息；各分会学术年会请查看下方对应分会栏目。";

export const TOTAL_SOCIETY_TAGS = ["学术年会", "重要论坛", "学术活动"] as const;

/** 总学会已发布会议（展示用，与学术会议服务数据对应） */
export const TOTAL_SOCIETY_MEETINGS = [
  {
    id: "conf-zgswxh-1",
    title: "中国古生物学会第32届学术年会",
    time: "2026年10月15日 - 10月19日",
    location: "江苏 · 南京",
  },
  {
    id: "conf-zgswxh-2",
    title: "中国古生物学会国际古生物学前沿论坛",
    time: "2027年04月10日 - 04月13日",
    location: "北京 · 中国科学院",
  },
] as const;

/** 所有学会单元（总学会 + 11 个分会），总学会置顶 */
export const ALL_SOCIETY_UNITS: Record<string, string> = {
  [TOTAL_SOCIETY_ID]: "中国古生物学会（总学会）",
  gwjzdwxfh: "古无脊椎动物学分会",
  kpgzwyh:   "科普工作委员会",
  bfxfh:     "孢粉学分会",
  wtxfh:     "微体学分会",
  hszlzwyh:  "化石藻类专业委员会",
  gzwxfh:    "古植物学分会",
  dqswx:     "地球生物学分会",
  gst:       "古生态专业分会",
  gjzdw:     "古脊椎动物学分会",
  swcj:      "生物沉积学分会",
  xjsxff:    "新技术新方法专业委员会",
};

/** 分会 ID 映射（11 个分会，不含总学会） — 保持向后兼容 */
export const BRANCH_MAP: Record<string, string> = {
  gwjzdwxfh: "古无脊椎动物学分会",
  kpgzwyh:   "科普工作委员会",
  bfxfh:     "孢粉学分会",
  wtxfh:     "微体学分会",
  hszlzwyh:  "化石藻类专业委员会",
  gzwxfh:    "古植物学分会",
  dqswx:     "地球生物学分会",
  gst:       "古生态专业分会",
  gjzdw:     "古脊椎动物学分会",
  swcj:      "生物沉积学分会",
  xjsxff:    "新技术新方法专业委员会",
};

/** 仅分会 ID 列表（11 个，不含总学会） */
export const BRANCH_IDS: string[] = Object.keys(BRANCH_MAP);

export const VALID_BRANCH_IDS = new Set(BRANCH_IDS);

/** DB association_id → 前端 branch_code（与 V22 迁移一致） */
export const ASSOCIATION_ID_TO_BRANCH_CODE: Record<number, string> = {
  1: "zgswxh",
  2: "gwjzdwxfh",
  3: "gzwxfh",
  4: "kpgzwyh",
  6: "wtxfh",
  7: "hszlzwyh",
  8: "gjzdw",
  10: "gst",
  11: "bfxfh",
  12: "dqswx",
  13: "swcj",
  14: "xjsxff",
};

export const BRANCH_CODE_TO_ASSOCIATION_ID: Record<string, number> = Object.fromEntries(
  Object.entries(ASSOCIATION_ID_TO_BRANCH_CODE).map(([id, code]) => [code, Number(id)]),
) as Record<string, number>;

/** 从 CMS 条目的 associationId / branchId 字段解析 canonical 分会编码 */
export function resolveBranchCodeFromCms(
  branchId?: string | null,
  associationId?: number | null,
): string | null {
  if (branchId && VALID_BRANCH_IDS.has(branchId)) return branchId;
  if (branchId && BRANCH_CODE_TO_ASSOCIATION_ID[branchId] == null) {
    const mapped = ASSOCIATION_ID_TO_BRANCH_CODE[Number(branchId)];
    if (mapped) return mapped;
  }
  if (associationId != null) {
    return ASSOCIATION_ID_TO_BRANCH_CODE[associationId] ?? null;
  }
  return null;
}

/** 分会编码 → DB association_id */
export function resolveAssociationIdFromBranch(branchId?: string | null): number | null {
  if (!branchId) return null;
  if (BRANCH_CODE_TO_ASSOCIATION_ID[branchId]) return BRANCH_CODE_TO_ASSOCIATION_ID[branchId];
  const n = parseInt(branchId, 10);
  return Number.isNaN(n) ? null : n;
}

/** 所有学会单元 ID 列表（总学会 + 11 分会） */
export const ALL_SOCIETY_IDS: string[] = Object.keys(ALL_SOCIETY_UNITS);

/** 总学会对所有注册用户默认可访问（虚拟绑定，无需写入 boundBranches） */
export function isSocietyAccessible(boundBranchIds: string[], societyId: string): boolean {
  if (societyId === TOTAL_SOCIETY_ID) return true;
  return boundBranchIds.includes(societyId);
}

/** 会议 ID → 所属学会/分会 ID 映射 */
export const CONFERENCE_BRANCH_MAP: Record<string, string> = {
  "conf-1": "wtxfh",    // 微体学分会
  "conf-2": "gzwxfh",   // 古植物学分会
  "conf-3": "gjzdw",    // 古脊椎动物学分会
  "conf-4": "gjzdw",    // 古脊椎动物学分会
  "conf-5": "bfxfh",    // 孢粉学分会
  "conf-6": "gst",      // 古生态专业分会
  "conf-7": "dqswx",    // 地球生物学分会
  "conf-8": "xjsxff",   // 新技术新方法专业委员会
  "demo-conf": "gwjzdwxfh", // 演示会议
  "conf-zgswxh-1": "zgswxh", // 中国古生物学会（总学会）
  "conf-zgswxh-2": "zgswxh", // 中国古生物学会（总学会）
};

/** 前端公开会议展示信息（与 Services / PersonalCenter 共用） */
export const PUBLIC_CONFERENCE_DISPLAY: Record<string, {
  title: string;
  branchName: string;
  time: string;
  location: string;
  fee: number;
}> = {
  "demo-conf": { title: "【演示会议】古无脊椎动物学学术工作坊", branchName: "古无脊椎动物学分会", time: "2026年06月15日", location: "线上 · 腾讯会议", fee: 300 },
  "conf-1": { title: "第十五届全国微体古生物学学术研讨会", branchName: "微体学分会", time: "2026年11月15日 - 11月18日", location: "江苏 · 南京", fee: 1200 },
  "conf-2": { title: "2026年度古植物学与环境演变论坛", branchName: "古植物学分会", time: "2026年12月05日 - 12月07日", location: "北京 · 中国科学院", fee: 800 },
  "conf-3": { title: "热河生物群国际学术研讨会", branchName: "古脊椎动物学分会", time: "2027年03月20日 - 03月23日", location: "辽宁 · 朝阳", fee: 1500 },
  "conf-4": { title: "第十二届全国古脊椎动物学学术年会", branchName: "古脊椎动物学分会", time: "2026年09月18日 - 09月21日", location: "云南 · 昆明", fee: 1000 },
  "conf-5": { title: "中国孢粉学会第十届全国学术大会", branchName: "孢粉学分会", time: "2026年10月22日 - 10月25日", location: "广东 · 广州", fee: 900 },
  "conf-6": { title: "古生态学与古环境重建国际研讨会", branchName: "古生态专业分会", time: "2026年08月10日 - 08月13日", location: "四川 · 成都", fee: 1100 },
  "conf-7": { title: "地球生物学前沿论坛", branchName: "地球生物学分会", time: "2026年07月05日 - 07月07日", location: "湖北 · 武汉", fee: 600 },
  "conf-8": { title: "古生物学新技术新方法专题研讨会", branchName: "新技术新方法专业委员会", time: "2026年11月28日 - 11月30日", location: "湖北 · 武汉（中国地质大学）", fee: 500 },
  "conf-zgswxh-1": { title: "中国古生物学会第32届学术年会", branchName: "中国古生物学会（总学会）", time: "2026年12月10日 - 12月14日", location: "北京 · 国家会议中心", fee: 1200 },
  "conf-zgswxh-2": { title: "中国古生物学会国际古生物学前沿论坛", branchName: "中国古生物学会（总学会）", time: "2027年05月08日 - 05月10日", location: "上海 · 复旦大学", fee: 800 },
};

/** 是否为有效的前端会议编码（排除 legacy 历史数据） */
export function isKnownConferenceCode(code: string): boolean {
  if (!code || code.startsWith("legacy-")) return false;
  return code in CONFERENCE_BRANCH_MAP;
}

/** 是否已开始会议报名流程（非 unpaid） */
export function isActiveConferenceRegistration(status?: string): boolean {
  return !!status && status !== "unpaid";
}

/** 是否与学会服务页「报名完成」状态一致 */
export function isConferenceRegistrationComplete(status?: string): boolean {
  return status === "confirmed"
    || status === "submitted"
    || status === "approved_unfilled"
    || status === "approved_invoice";
}

export function getConferenceDisplayInfo(
  confId: string,
  reg?: { conferenceTitle?: string; lockedAmount?: number },
) {
  const catalog = PUBLIC_CONFERENCE_DISPLAY[confId];
  const branchId = CONFERENCE_BRANCH_MAP[confId] || "";
  const branchName = ALL_SOCIETY_UNITS[branchId] || catalog?.branchName || "未知分会";
  return {
    title: reg?.conferenceTitle || catalog?.title || `会议 #${confId}`,
    branchName,
    branchId,
    time: catalog?.time || "-",
    location: catalog?.location || "-",
    fee: reg?.lockedAmount ?? catalog?.fee ?? 0,
  };
}

// ── 四类会议费类型 Phase 0 新增 ────────────────────────────────────────

export const CONFERENCE_FEE_TYPE = {
  STUDENT_MEMBER:           "student_member",
  NON_STUDENT_MEMBER:       "non_student_member",
  STUDENT_NON_MEMBER:       "student_non_member",
  NON_STUDENT_NON_MEMBER:   "non_student_non_member",
} as const;

export type ConferenceFeeType = typeof CONFERENCE_FEE_TYPE[keyof typeof CONFERENCE_FEE_TYPE];

export const CONFERENCE_FEE_TYPE_LABEL: Record<string, string> = {
  student_member:           "学生会员",
  non_student_member:       "非学生会员",
  student_non_member:       "学生（非会员）",
  non_student_non_member:   "非学生（非会员）",
};

/** 会议费用配置（四类价格） */
export interface ConferenceFeeConfig {
  studentMember: number;           // 学生会员会议费
  nonStudentMember: number;        // 非学生会员会议费
  studentNonMember: number;        // 学生（非会员）会议费
  nonStudentNonMember: number;     // 非学生（非会员）会议费
}

/** 四类会议费字段映射（feeType → feeConfig 属性名） */
export const CONFERENCE_FEE_TYPE_TO_FIELD: Record<ConferenceFeeType, keyof ConferenceFeeConfig> = {
  student_member:           "studentMember",
  non_student_member:       "nonStudentMember",
  student_non_member:       "studentNonMember",
  non_student_non_member:   "nonStudentNonMember",
};

/** 根据用户类型和学生身份推导会议费类型 */
export function deriveFeeType(userType: UserType, isStudent: boolean): ConferenceFeeType {
  if (userType === USER_TYPE.MEMBER) {
    return isStudent ? CONFERENCE_FEE_TYPE.STUDENT_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_MEMBER;
  }
  // non_member 或 regular 都视为非会员
  return isStudent ? CONFERENCE_FEE_TYPE.STUDENT_NON_MEMBER : CONFERENCE_FEE_TYPE.NON_STUDENT_NON_MEMBER;
}

/** 从 ConferenceFeeConfig 中获取指定类型的费用
 *  返回 0 表示该人群报名通道关闭 */
export function getFeeFromConfig(config: ConferenceFeeConfig, feeType: ConferenceFeeType): number {
  const field = CONFERENCE_FEE_TYPE_TO_FIELD[feeType];
  return config[field] ?? 0;
}

/** 根据会议 ID 和费用类型获取会议费（新接口）
 *  Phase 0 新增，后续 Phase 替换旧 getConferenceFee */
export function getConferenceFeeByType(confId: string, feeType: ConferenceFeeType): number {
  const config = getConferenceFeeConfig(confId);
  return getFeeFromConfig(config, feeType);
}

/** 获取会议的四类费用配置
 *  优先从 localStorage 读取，fallback 到旧 CONFERENCE_FEE_MEMBER 兼容计算 */
function readFeeConfigStore(key: string, confId: string): ConferenceFeeConfig | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    const configs = JSON.parse(stored);
    return configs[confId] ?? null;
  } catch {
    return null;
  }
}

export function getConferenceFeeConfig(confId: string): ConferenceFeeConfig {
  const fromAdmin = readFeeConfigStore("paleo_admin_conference_fee_configs", confId);
  if (fromAdmin) return fromAdmin;
  const fromUser = readFeeConfigStore("paleo_conference_fee_configs", confId);
  if (fromUser) return fromUser;
  // fallback：从旧 CONFERENCE_FEE_MEMBER 计算四类价格（向后兼容）
  const memberFee = CONFERENCE_FEE_MEMBER[confId] ?? 1000;
  const nonMemberFee = Math.round(memberFee * 1.1);
  return {
    studentMember: Math.round(memberFee * 0.67),         // 学生会员 ≈ 会员价 × 2/3
    nonStudentMember: memberFee,                          // 非学生会员 = 会员价
    studentNonMember: Math.round(nonMemberFee * 0.67),   // 学生非会员 ≈ 非会员价 × 2/3
    nonStudentNonMember: nonMemberFee,                    // 非学生非会员 = 非会员价
  };
}

// ── 宽限期常量 ────────────────────────────────────────────────────────────

/** 发票上传宽限期（工作日） */
export const INVOICE_GRACE_PERIOD_WORKDAYS = 7;

/** 发票截止日临近提醒阈值（天） */
export const INVOICE_DEADLINE_WARNING_DAYS = 3;

// ── 会议费非会员价配置（旧接口，向后兼容，后续 Phase 逐步替换） ──────────

/** 会议 ID → 会员价映射
 *  @deprecated Phase 0 起请使用 getConferenceFeeConfig() 获取四类价格 */
export const CONFERENCE_FEE_MEMBER: Record<string, number> = {
  "demo-conf": 300,
  "conf-1": 1200,
  "conf-2": 800,
  "conf-3": 1500,
  "conf-4": 1000,
  "conf-5": 900,
  "conf-6": 1100,
  "conf-7": 600,
  "conf-8": 500,
  "conf-zgswxh-1": 1500,
  "conf-zgswxh-2": 2000,
};

/** 根据用户类型获取会议费
 *  @deprecated Phase 0 起请使用 getConferenceFeeByType(confId, feeType) */
export function getConferenceFee(confId: string, userType: string): number {
  const memberFee = CONFERENCE_FEE_MEMBER[confId] ?? 1000;
  if (userType === "non_member") {
    return Math.round(memberFee * 1.1);
  }
  return memberFee;
}

// ── 住宿类型枚举 Phase 0 新增 ────────────────────────────────────────────

export const ACCOMMODATION_TYPE = {
  MALE_SINGLE:    "male_single",
  MALE_DOUBLE:    "male_double",
  FEMALE_SINGLE:  "female_single",
  FEMALE_DOUBLE:  "female_double",
  SELF_ARRANGED:  "self_arranged",
} as const;

export type AccommodationType = typeof ACCOMMODATION_TYPE[keyof typeof ACCOMMODATION_TYPE];

export const ACCOMMODATION_TYPE_LABEL: Record<string, string> = {
  male_single:    "男单间",
  male_double:    "男双人间",
  female_single:  "女单间",
  female_double:  "女双人间",
  self_arranged:  "自主安排",
};

// ── 野外路线结构 Phase 0 新增 ────────────────────────────────────────────

/** 野外路线阶段 */
export const FIELD_TRIP_PHASE = {
  PRE:    "pre",
  DURING: "during",
  POST:   "post",
} as const;

export type FieldTripPhase = typeof FIELD_TRIP_PHASE[keyof typeof FIELD_TRIP_PHASE];

export const FIELD_TRIP_PHASE_LABEL: Record<string, string> = {
  pre:    "会前",
  during: "会中",
  post:   "会后",
};

/** 野外路线性别限制（部分路线需按性别分组报名） */
export type FieldTripGenderRestriction = "male" | "female" | "any";

export const FIELD_TRIP_GENDER_RESTRICTION_LABEL: Record<FieldTripGenderRestriction, string> = {
  any: "不限",
  male: "限男性",
  female: "限女性",
};

/** 野外路线 */
export interface FieldTripRoute {
  id: string;
  phase: FieldTripPhase;
  name: string;
  order: number;
  genderRestriction?: FieldTripGenderRestriction;
}

/** 用户野外报名选择 */
export interface FieldTripSelections {
  pre: string[];
  during: string[];
  post: string[];
}

/** 创建空的野外选择 */
export function createEmptyFieldTripSelections(): FieldTripSelections {
  return { pre: [], during: [], post: [] };
}

const FIELD_TRIP_ORDER_CN = ["一", "二", "三", "四", "五"] as const;

/** 生成 15 条默认野外路线（会前/会中/会后各 5 条） */
export function createDefaultFieldTripRoutes(
  prefix: string,
  locationHint = "当地"
): FieldTripRoute[] {
  const phases: FieldTripPhase[] = ["pre", "during", "post"];
  const phasePrefix: Record<FieldTripPhase, string> = {
    pre: "会前野外",
    during: "会中野外",
    post: "会后野外",
  };
  const genderPattern: FieldTripGenderRestriction[] = ["any", "male", "female", "any", "any"];
  const routes: FieldTripRoute[] = [];

  for (const phase of phases) {
    for (let i = 1; i <= 5; i++) {
      routes.push({
        id: `${prefix}-${phase}-${i}`,
        phase,
        name: `${phasePrefix[phase]}路线${FIELD_TRIP_ORDER_CN[i - 1]}：${locationHint}考察${i}`,
        order: i,
        genderRestriction: genderPattern[i - 1],
      });
    }
  }
  return routes;
}

/** 解析学会/分会显示名称（含总学会） */
export function resolveSocietyName(societyId: string): string {
  return ALL_SOCIETY_UNITS[societyId] || BRANCH_MAP[societyId] || societyId;
}

/** 判断用户是否可选某条野外路线（需已填写性别） */
export function canSelectFieldTripRoute(
  route: FieldTripRoute,
  userGender: string
): { allowed: boolean; reason?: string } {
  const restriction = route.genderRestriction || "any";
  if (restriction === "any") return { allowed: true };
  if (!userGender) {
    return { allowed: false, reason: "请先在基本信息中选择性别后再报名野外" };
  }
  const userSide = userGender === "男" ? "male" : userGender === "女" ? "female" : null;
  if (!userSide) {
    return { allowed: false, reason: "请先在基本信息中选择有效性别" };
  }
  if (userSide !== restriction) {
    return {
      allowed: false,
      reason: `此路线${FIELD_TRIP_GENDER_RESTRICTION_LABEL[restriction]}，与您的性别不符`,
    };
  }
  return { allowed: true };
}

/** 校验野外路线选择是否符合性别限制 */
export function validateFieldTripSelections(
  routes: FieldTripRoute[],
  selections: FieldTripSelections,
  userGender: string
): string | null {
  const routeMap = new Map(routes.map(r => [r.id, r]));
  for (const phase of ["pre", "during", "post"] as const) {
    for (const routeId of selections[phase] || []) {
      const route = routeMap.get(routeId);
      if (!route) continue;
      const check = canSelectFieldTripRoute(route, userGender);
      if (!check.allowed) return check.reason || "野外路线选择无效";
    }
  }
  return null;
}

// ── Phase F1: 截止判断与状态语义 ───────────────────────────────────────────

/** 缴费终审通过后可下载盖章通知/摘要模板、填写参会表单 */
export const CONFIRMED_PAYMENT_STATUSES = [CONFERENCE_STATUS.CONFIRMED] as const;

/** 判断截止日期是否已过（YYYY-MM-DD，含当天仍可操作） */
export function isDeadlinePassed(deadline: string | undefined | null): boolean {
  if (!deadline) return false;
  const today = new Date().toISOString().split("T")[0];
  return today > deadline;
}

/** 总学会会议置顶排序 */
export function sortConferencesSocietyFirst<T extends { branchId: string }>(confs: T[]): T[] {
  return [...confs].sort((a, b) => {
    if (a.branchId === TOTAL_SOCIETY_ID && b.branchId !== TOTAL_SOCIETY_ID) return -1;
    if (b.branchId === TOTAL_SOCIETY_ID && a.branchId !== TOTAL_SOCIETY_ID) return 1;
    return 0;
  });
}
