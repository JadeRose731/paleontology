import type { ApiCmsChannel, ApiCmsChannelTreeNode } from "@/lib/cms-api";
import type { AdminRole, MenuItem } from "@/contexts/AdminContext";

/** 已合并到父级Tab中的section，不再单独显示为菜单项 */
const MERGED_INTO_PARENT: Set<string> = new Set(["awards"]);

/** section → 侧边栏子菜单显示名（避免与父菜单重名） */
const SECTION_DISPLAY_LABELS: Record<string, string> = {
  pages: "学会简介",
  banners: "轮播图",
  news: "新闻动态",
  personnel: "人员信息",
  awards: "获奖成果",
  announcements: "会员公告",
  timeline: "学会沿革",
  gallery: "历史相册",
  international: "国际交流",
  services: "学会服务",
  downloads: "资料下载",
  regulations: "规章条例",
  science: "科学传播",
  "tech-rewards": "科技奖励",
  party: "党建文化",
  branch: "分会内容",
  media: "媒体库",
  settings: "站点配置",
  publish: "新闻发布",
  "public-files": "公开文件",
};

/** content_module → 管理后台 section 默认映射 */
const MODULE_TO_SECTION: Record<string, string> = {
  banners: "banners",
  news: "news",
  pages: "pages",
  personnel: "personnel",
  awards: "awards",
  announcements: "announcements",
  timeline: "timeline",
  gallery: "gallery",
  international: "international",
  downloads: "downloads",
  regulations: "regulations",
  science: "science",
  "tech-rewards": "tech-rewards",
  party: "party",
  branch: "branch",
  media: "media",
  settings: "settings",
  publish: "publish",
  "public-files": "public-files",
};

const DEFAULT_CHANNEL_ICON = "FileText";

const CHANNEL_ICON_MAP: Record<string, string> = {
  home: "LayoutDashboard",
  intro: "FileText",
  structure: "Building2",
  services: "Handshake",
  party: "Flag",
  history: "Clock",
  gallery: "Images",
  announcements: "Megaphone",
  news_publish: "Newspaper",
  international: "Globe",
  downloads: "Download",
  regulations: "BookOpen",
  public_files: "FolderUp",
  admin_media: "FolderOpen",
  admin_settings: "Settings",
  Image: "Image",
  Newspaper: "Newspaper",
  Award: "Award",
  BookOpen: "BookOpen",
  Trophy: "Trophy",
};

export const LAYOUT_TYPE_OPTIONS = [
  { value: "list", label: "文章列表" },
  { value: "list-multi-column", label: "多栏文章列表" },
  { value: "timeline", label: "时间线" },
  { value: "gallery-grid", label: "相册网格" },
  { value: "personnel-cards", label: "人员卡片" },
  { value: "richtext-single", label: "单页富文本" },
  { value: "file-list", label: "文件列表" },
  { value: "hybrid-home", label: "首页混合" },
  { value: "party-hub", label: "党建首页" },
  { value: "mixed", label: "混合内容" },
] as const;

export const PAGE_TYPE_OPTIONS = [
  { value: "CMS", label: "内容生成页" },
  { value: "CUSTOM", label: "定制页" },
  { value: "HYBRID", label: "混合页" },
] as const;

export const SHELL_TYPE_OPTIONS = [
  { value: "home", label: "首页外壳" },
  { value: "standard", label: "标准外壳" },
  { value: "party", label: "党建双栏外壳" },
] as const;

export const CONTENT_MODULE_OPTIONS = Object.keys(MODULE_TO_SECTION).map(key => ({
  value: key,
  label: key,
}));

export function resolveAdminSection(channel: ApiCmsChannel): string | null {
  return channel.adminSection || null;
}

export function resolveChannelIcon(channel: ApiCmsChannel): string {
  if (channel.navIcon && CHANNEL_ICON_MAP[channel.navIcon]) {
    return CHANNEL_ICON_MAP[channel.navIcon];
  }
  if (channel.channelCode && CHANNEL_ICON_MAP[channel.channelCode]) {
    return CHANNEL_ICON_MAP[channel.channelCode];
  }
  return DEFAULT_CHANNEL_ICON;
}

export function parseAdminRoles(raw?: string | null): AdminRole[] {
  if (!raw) return ["super_admin"];
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((r): r is AdminRole =>
      r === "super_admin" || r === "branch_admin" || r === "finance_reviewer"
    );
  } catch {
    return ["super_admin"];
  }
}

export function channelAllowedForRole(channel: ApiCmsChannel, role: AdminRole): boolean {
  if (role === "super_admin") return true;
  return parseAdminRoles(channel.adminRoles).includes(role);
}

function groupPath(channel: ApiCmsChannel): string {
  return `/admin/cms-group/${channel.channelCode}`;
}

function contentPath(section: string): string {
  return `/admin/cms/${section}`;
}

function buildMenuNode(node: ApiCmsChannelTreeNode, role: AdminRole): MenuItem | null {
  const channel = node.channel;
  if (channel.showInAdmin === "0") return null;
  if (!channelAllowedForRole(channel, role)) return null;

  const section = resolveAdminSection(channel);
  if (section && MERGED_INTO_PARENT.has(section)) return null;

  const childItems = (node.children ?? [])
    .map(child => buildMenuNode(child, role))
    .filter((item): item is MenuItem => item !== null);

  const icon = resolveChannelIcon(channel);
  const label = channel.navName ?? channel.title ?? channel.channelCode;

  const items: MenuItem[] = [...childItems];

  if (section) {
    const sectionLabel = SECTION_DISPLAY_LABELS[section] ?? "内容管理";
    items.unshift({
      path: contentPath(section),
      label: sectionLabel,
      icon,
    });
  }

  if (items.length > 1) {
    return {
      path: groupPath(channel),
      label,
      icon,
      children: items,
    };
  }

  if (items.length === 1) {
    return items[0];
  }

  return null;
}

/** 从频道树构建管理后台「内容管理」子菜单 */
export function buildCmsMenuFromTree(
  tree: ApiCmsChannelTreeNode[],
  role: AdminRole
): MenuItem[] {
  const items = tree
    .map(node => buildMenuNode(node, role))
    .filter((item): item is MenuItem => item !== null);

  if (role === "super_admin") {
    items.unshift({
      path: "/admin/cms/channels",
      label: "栏目管理",
      icon: "SlidersHorizontal",
    });
  }

  return items;
}

/** 从频道树提取动态路由权限 */
export function buildCmsRoutePermissions(
  tree: ApiCmsChannelTreeNode[]
): Record<string, AdminRole[]> {
  const permissions: Record<string, AdminRole[]> = {
    "/admin/cms": ["super_admin", "branch_admin"],
    "/admin/cms/channels": ["super_admin"],
  };

  const walk = (nodes: ApiCmsChannelTreeNode[]) => {
    for (const node of nodes) {
      const channel = node.channel;
      if (channel.showInAdmin !== "0") {
        const roles = parseAdminRoles(channel.adminRoles);
        const section = resolveAdminSection(channel);
        if (section) {
          permissions[contentPath(section)] = roles;
        }
      }
      if (node.children?.length) walk(node.children);
    }
  };

  walk(tree);
  return permissions;
}

/** API 不可用时的静态兜底菜单 */
export const FALLBACK_CMS_MENU: MenuItem[] = [
  {
    path: "/admin/cms-group/home",
    label: "首页",
    icon: "LayoutDashboard",
    children: [
      { path: "/admin/cms/banners", label: "轮播图", icon: "Image" },
      { path: "/admin/cms/news", label: "新闻动态", icon: "Newspaper" },
    ],
  },
  { path: "/admin/cms/party", label: "党建文化", icon: "Flag" },
  { path: "/admin/cms/timeline", label: "学会沿革", icon: "Clock" },
  { path: "/admin/cms/gallery", label: "历史相册", icon: "Images" },
  { path: "/admin/cms/announcements", label: "会员公告", icon: "Megaphone" },
  { path: "/admin/cms/downloads", label: "资料下载", icon: "Download" },
  { path: "/admin/cms/media", label: "媒体库", icon: "FolderOpen" },
];

export const FALLBACK_BRANCH_CMS_MENU: MenuItem[] = [
  { path: "/admin/cms/branch", label: "分会栏目", icon: "Building2" },
  { path: "/admin/cms/announcements", label: "通知公告", icon: "Megaphone" },
  { path: "/admin/cms/gallery", label: "历史相册", icon: "Images" },
  { path: "/admin/cms/downloads", label: "资料下载", icon: "Download" },
  { path: "/admin/cms/media", label: "媒体库", icon: "FolderOpen" },
];
