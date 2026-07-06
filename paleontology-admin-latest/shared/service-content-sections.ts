/** 学会服务 — 国际交流 / 科学传播 分类（前后台共用） */

export const INTL_SECTION_NAV = [
  { code: "news", label: "交流动态" },
  { code: "conference", label: "国际会议" },
  { code: "report", label: "国际会议组织" },
  { code: "partner", label: "国际会议合作机构" },
] as const;

export type IntlSectionCode = (typeof INTL_SECTION_NAV)[number]["code"];

export const INTL_TYPE_LABELS: Record<string, string> = {
  news: "交流动态",
  conference: "国际会议",
  report: "国际会议组织",
  partner: "国际会议合作机构",
};

export const INTL_TYPE_ICONS: Record<string, string> = {
  news: "public",
  report: "groups",
  conference: "event",
  partner: "handshake",
};

export const SCIENCE_FORMAT_LABELS: Record<string, string> = {
  work: "工作动态",
  book: "期刊服务",
  base: "科普基地",
  article: "科普文章",
  video: "科普视频",
  fossil: "化石保护",
};

export const SCIENCE_FORMAT_ORDER = ["work", "book", "base", "article", "video", "fossil"] as const;

export function serviceModuleRoute(module: string): string | null {
  if (module === "international") return "/international";
  if (module === "science") return "/science";
  return null;
}
