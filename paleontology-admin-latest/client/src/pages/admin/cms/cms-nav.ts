/** 与前台 paleontology-website 顶栏/侧栏一致的 CMS 导航结构 */

export interface CmsSectionMeta {
  title: string;
  subtitle: string;
}

export const CMS_SECTION_META: Record<string, CmsSectionMeta> = {
  banners: { title: "轮播图", subtitle: "管理首页轮播大图及跳转链接" },
  news: { title: "新闻动态", subtitle: "发布学会要闻与工作动态" },
  pages: { title: "学会简介", subtitle: "维护学会概况、章程等富文本页面" },
  personnel: { title: "人员信息", subtitle: "管理理事会、常务理事会及秘书处成员" },
  awards: { title: "获奖成果", subtitle: "维护获奖年份、奖项与获奖人信息" },
  announcements: { title: "会员公告", subtitle: "发布、编辑学会及分会公告" },
  timeline: { title: "学会沿革", subtitle: "编辑历史时间线节点" },
  gallery: { title: "历史相册", subtitle: "按分类上传与管理历史照片" },
  services: { title: "学会服务", subtitle: "统一管理科学传播、国际交流与科技奖励内容" },
  international: { title: "国际交流", subtitle: "维护交流动态、国际会议与合作机构" },
  downloads: { title: "资料下载", subtitle: "上传资料文件，可设置会员下载权限" },
  regulations: { title: "规章条例", subtitle: "编辑规章条例正文与附件" },
  science: { title: "科学传播", subtitle: "科普文章、视频、基地与化石保护等内容" },
  "tech-rewards": { title: "科技奖励", subtitle: "奖项介绍与申报指南" },
  party: { title: "党建文化", subtitle: "维护党建各子栏目的文章与专题" },
  branch: { title: "分会栏目", subtitle: "维护本分站概况、工作动态等页面内容" },
  media: { title: "媒体库", subtitle: "统一管理图片与附件" },
  settings: { title: "站点配置", subtitle: "版权信息、联系方式与首页快捷入口" },
  publish: { title: "新闻发布", subtitle: "会议通知、党务公开、重要新闻三类内容管理，支持背景图与原文件下载" },
  "public-files": { title: "公开文件管理", subtitle: "管理公开文件下载区（文档/音频/影视/照片），无需登录即可下载" },
};

export const CMS_SECTIONS = Object.keys(CMS_SECTION_META);

/** 党建子栏目 — 与前台 PartyLayout navItems 一致 */
export const PARTY_NAV_ITEMS = [
  { code: "party_announcement", title: "通知公告" },
  { code: "party_organizations", title: "党群机构" },
  { code: "party_committees", title: "党委纪委" },
  { code: "party_work", title: "党建工作" },
  { code: "party_activities", title: "组织生活" },
  { code: "party_team", title: "党员队伍建设" },
  { code: "party_theory", title: "理论学习专栏" },
  { code: "party_dynamics", title: "工作动态" },
  { code: "party_topics", title: "党建专题" },
  { code: "party_exemplars", title: "先进典型" },
  { code: "party_reporting", title: "违法违纪举报" },
  { code: "party_downloads", title: "下载中心" },
] as const;
