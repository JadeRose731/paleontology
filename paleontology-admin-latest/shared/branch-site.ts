/** 组织机构 / 分会子站 — 前后台共用 */

import { BRANCH_IDS, BRANCH_MAP, TOTAL_SOCIETY_ID } from "./constants";

export type BranchSectionKind =
  | "news-home"
  | "page"
  | "personnel"
  | "news"
  | "announcements"
  | "timeline"
  | "gallery"
  | "science"
  | "awards"
  | "downloads";

export interface BranchSectionDef {
  id: string;
  title: string;
  icon: string;
  kind: BranchSectionKind;
  pageCode?: string;
  personnelGroup?: string;
  newsCategory?: string;
}

export const BRANCH_SITE_SECTIONS: BranchSectionDef[] = [
  { id: "home", title: "首页", icon: "home", kind: "news-home" },
  { id: "overview", title: "分会概况", icon: "info", kind: "page", pageCode: "branch_overview" },
  { id: "council", title: "理事会", icon: "groups", kind: "personnel", personnelGroup: "理事会" },
  { id: "work", title: "工作动态", icon: "newspaper", kind: "news", newsCategory: "工作动态" },
  { id: "announcements", title: "通知公告", icon: "campaign", kind: "announcements" },
  { id: "history", title: "历史沿革", icon: "history", kind: "timeline" },
  { id: "gallery", title: "历史相册", icon: "photo_library", kind: "gallery" },
  { id: "science", title: "科学传播", icon: "science", kind: "science" },
  { id: "awards", title: "获奖成果", icon: "emoji_events", kind: "awards" },
  { id: "downloads", title: "下载中心", icon: "download", kind: "downloads" },
];

export const BRANCH_SECTION_IDS = BRANCH_SITE_SECTIONS.map(s => s.id);

export const BRANCH_DOWNLOAD_CATEGORIES = [
  "会议简讯",
  "会议论文摘要集",
  "入会申请表",
  "其他",
] as const;

export const BRANCH_SCIENCE_CATEGORIES = [
  "学术专著",
  "科普读物",
  "科普文章",
  "科普视频",
  "科普基地",
  "化石保护",
] as const;

export const STRUCTURE_PANELS = [
  { id: "org-chart", title: "组织机构", pageCode: "structure_org_chart" },
  { id: "management", title: "管理系列", pageCode: "structure_management" },
] as const;

export const STRUCTURE_PAGE_CODES = STRUCTURE_PANELS.map(p => p.pageCode);

export const STRUCTURE_PAGE_LABELS: Record<string, string> = Object.fromEntries(
  STRUCTURE_PANELS.map(p => [p.pageCode, p.title]),
);

export function isStructurePageCode(code: string): boolean {
  return code.startsWith("structure_");
}

export function generateStructurePageCode(title: string, existingCodes: string[] = []): string {
  const preset = STRUCTURE_PANELS.find(p => p.title === title.trim());
  if (preset) return preset.pageCode;

  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  let base = ascii.length >= 2 ? `structure_${ascii}` : `structure_${Date.now().toString(36)}`;

  let code = base;
  let n = 2;
  while (existingCodes.includes(code)) {
    code = `${base}_${n++}`;
  }
  return code;
}

export interface BranchMeta {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
}

export const BRANCH_META: Record<string, BranchMeta> = {
  gwjzdwxfh: { id: "gwjzdwxfh", name: "古无脊椎动物学分会", shortName: "古无脊椎", icon: "pest_control", color: "#002B49" },
  kpgzwyh: { id: "kpgzwyh", name: "科普工作委员会", shortName: "科普委", icon: "science", color: "#1a5276" },
  bfxfh: { id: "bfxfh", name: "孢粉学分会", shortName: "孢粉学", icon: "local_florist", color: "#1e8449" },
  wtxfh: { id: "wtxfh", name: "微体学分会", shortName: "微体学", icon: "biotech", color: "#6c3483" },
  hszlzwyh: { id: "hszlzwyh", name: "化石藻类专业委员会", shortName: "化石藻类", icon: "grass", color: "#117a65" },
  gzwxfh: { id: "gzwxfh", name: "古植物学分会", shortName: "古植物", icon: "park", color: "#1d6a27" },
  dqswx: { id: "dqswx", name: "地球生物学分会", shortName: "地球生物", icon: "public", color: "#1a5276" },
  gst: { id: "gst", name: "古生态专业分会", shortName: "古生态", icon: "eco", color: "#196f3d" },
  gjzdw: { id: "gjzdw", name: "古脊椎动物学分会", shortName: "古脊椎", icon: "cruelty_free", color: "#784212" },
  swcj: { id: "swcj", name: "生物沉积学分会", shortName: "生物沉积", icon: "layers", color: "#5d6d7e" },
  xjsxff: { id: "xjsxff", name: "新技术新方法专业委员会", shortName: "新技术", icon: "precision_manufacturing", color: "#1b2631" },
};

export const STRUCTURE_SIDEBAR_ITEMS = [
  { id: TOTAL_SOCIETY_ID, name: "中国古生物学会", isSociety: true as const },
  ...BRANCH_IDS.map(id => ({
    id,
    name: BRANCH_MAP[id],
    isSociety: false as const,
  })),
];

export function branchSitePath(branchId: string, section: string = "home"): string {
  return `/structure/branch/${branchId}/${section}`;
}

export function isValidBranchId(id: string): boolean {
  return id in BRANCH_META;
}

export function resolveBranchSection(section?: string): BranchSectionDef {
  const found = BRANCH_SITE_SECTIONS.find(s => s.id === section);
  return found ?? BRANCH_SITE_SECTIONS[0];
}

export const LEGACY_BRANCH_ID_MAP: Record<string, string> = {
  gwjz: "gwjzdwxfh",
  kpgz: "kpgzwyh",
  hszl: "hszlzwyh",
  wtx: "wtxfh",
};

export function normalizeBranchId(id: string): string {
  return LEGACY_BRANCH_ID_MAP[id] ?? id;
}

/** 分会子栏目 → 管理后台 CMS 分区（下载中心走公开文件） */
export const BRANCH_SECTION_ADMIN_HINT: Record<string, string> = {
  home: "新闻动态：分类「重大科研进展」或勾选首页展示",
  overview: "本页：分会概况富文本",
  council: "本页：理事会人员（分组=理事会）",
  work: "新闻动态：分类「工作动态」",
  announcements: "会员公告",
  history: "学会沿革（分会归属）",
  gallery: "历史相册（分会归属）",
  science: "科学传播（分会归属）",
  awards: "获奖成果（分会归属）",
  downloads: "公开文件管理（分会下载分类）",
};
