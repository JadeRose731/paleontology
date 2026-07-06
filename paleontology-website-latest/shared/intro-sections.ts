/** 学会简介页子栏目定义 — 前后台共用 */

export type IntroSectionKind = "page" | "personnel" | "branches" | "awards" | "timeline" | "gallery";

export interface IntroSectionDef {
  id: string;
  title: string;
  kind: IntroSectionKind;
  /** pages 模块 column_code */
  pageCode?: string;
  /** personnel 分组（对应 summary 字段） */
  personnelGroup?: string;
  /** 跳转已有独立页面 */
  linkHref?: string;
  linkHint?: string;
}

export const INTRO_SECTIONS: IntroSectionDef[] = [
  { id: "overview", title: "学会概况", kind: "page", pageCode: "intro_overview" },
  { id: "charter", title: "学会章程", kind: "page", pageCode: "intro_charter" },
  { id: "current-leaders", title: "现任领导", kind: "personnel", personnelGroup: "现任领导" },
  { id: "former-leaders", title: "历任领导", kind: "personnel", personnelGroup: "历任领导" },
  { id: "council", title: "理事会", kind: "personnel", personnelGroup: "理事会" },
  { id: "supervisory", title: "监事会", kind: "personnel", personnelGroup: "监事会" },
  { id: "secretariat", title: "秘书处", kind: "personnel", personnelGroup: "秘书处" },
  { id: "branches", title: "专业分会", kind: "branches" },
  { id: "history", title: "历史沿革", kind: "timeline" },
  { id: "gallery", title: "历史相册", kind: "gallery" },
  { id: "planning", title: "发展规划", kind: "page", pageCode: "intro_planning" },
  { id: "awards", title: "获奖成果", kind: "awards" },
];

export const INTRO_PAGE_CODES = INTRO_SECTIONS
  .filter((s): s is IntroSectionDef & { pageCode: string } => !!s.pageCode)
  .map(s => s.pageCode);

export const INTRO_PAGE_LABELS: Record<string, string> = Object.fromEntries(
  INTRO_SECTIONS.filter(s => s.pageCode).map(s => [s.pageCode!, s.title]),
);

export const INTRO_PERSONNEL_GROUPS = Array.from(
  new Set(
    INTRO_SECTIONS.filter(s => s.personnelGroup).map(s => s.personnelGroup!),
  ),
);

/** personnel 分组 → URL hash（组织机构页锚点） */
export function personnelGroupAnchor(group: string): string {
  return `group-${encodeURIComponent(group)}`;
}

/** 学会简介富文本子栏目（固定配置） */
export const INTRO_PAGE_SECTIONS = INTRO_SECTIONS.filter(
  (s): s is IntroSectionDef & { pageCode: string } => s.kind === "page" && !!s.pageCode,
);

/** 根据标题自动生成 intro 页面编码（客户无需手填） */
export function generateIntroPageCode(title: string, existingCodes: string[] = []): string {
  const preset = INTRO_PAGE_SECTIONS.find(s => s.title === title.trim());
  if (preset?.pageCode) return preset.pageCode;

  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  let base = ascii.length >= 2 ? `intro_${ascii}` : `intro_${Date.now().toString(36)}`;

  let code = base;
  let n = 2;
  while (existingCodes.includes(code)) {
    code = `${base}_${n++}`;
  }
  return code;
}

export function isIntroPageCode(code: string): boolean {
  return code.startsWith("intro_");
}
