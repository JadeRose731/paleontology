import { useEffect, useState, useMemo } from "react";
import { listPublicChannels, type ApiCmsChannel } from "@/lib/cms-api";

/** 党建子栏目默认图标 */
const PARTY_CHANNEL_ICONS: Record<string, string> = {
  party_announcement: "campaign",
  party_organizations: "account_tree",
  party_committees: "verified_user",
  party_work: "work",
  party_activities: "groups",
  party_team: "person_add",
  party_theory: "menu_book",
  party_dynamics: "vital_signs",
  party_topics: "topic",
  party_exemplars: "military_tech",
  party_reporting: "shield",
  party_downloads: "download",
};

const FALLBACK_MAIN_NAV = [
  { title: "首页", path: "/" },
  { title: "学会简介", path: "/intro" },
  { title: "组织机构", path: "/structure" },
  { title: "学会服务", path: "/services" },
  { title: "党建文化", path: "/party" },
  { title: "学会沿革", path: "/history" },
  { title: "历史相册", path: "/gallery" },
  { title: "会员公告", path: "/society-announcements" },
  { title: "新闻发布", path: "/news-publish" },
  { title: "国际交流", path: "/international" },
  { title: "规章条例", path: "/regulations" },
  { title: "公开文件", path: "/public-downloads" },
];

const FALLBACK_PARTY_NAV = [
  { id: "announcements", title: "通知公告", icon: "campaign", path: "/announcements" },
  { id: "organizations", title: "党群机构", icon: "account_tree", path: "/organizations" },
  { id: "committees", title: "党委纪委", icon: "verified_user", path: "/committees" },
  { id: "work", title: "党建工作", icon: "work", path: "/work" },
  { id: "activities", title: "组织生活", icon: "groups", path: "/activities" },
  { id: "team-building", title: "党员队伍建设", icon: "person_add", path: "/team-building" },
  { id: "theory-study", title: "理论学习专栏", icon: "menu_book", path: "/theory-study" },
  { id: "dynamics", title: "工作动态", icon: "vital_signs", path: "/dynamics" },
  { id: "special-topics", title: "党建专题", icon: "topic", path: "/special-topics" },
  { id: "exemplars", title: "先进典型", icon: "military_tech", path: "/exemplars" },
  { id: "reporting", title: "违法违纪举报", icon: "shield", path: "/reporting" },
  { id: "downloads", title: "下载中心", icon: "download", path: "/downloads" },
];

export type MainNavLink = { title: string; path: string };
export type PartyNavItem = { id: string; title: string; icon: string; path: string };

export function useCmsChannels() {
  const [channels, setChannels] = useState<ApiCmsChannel[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listPublicChannels()
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoaded(true));
  }, []);

  const partyRoot = useMemo(
    () => channels.find(c => c.channelCode === "party"),
    [channels]
  );

  const mainNavLinks: MainNavLink[] = useMemo(() => {
    if (channels.length === 0) return FALLBACK_MAIN_NAV;
    const top = channels
      .filter(c => (c.parentId ?? 0) === 0 && c.visible !== "0" && c.routePath)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (top.length === 0) return FALLBACK_MAIN_NAV;
    return top.map(c => ({
      title: c.navName ?? c.title ?? c.channelCode,
      path: c.routePath!,
    }));
  }, [channels]);

  const partyNavItems: PartyNavItem[] = useMemo(() => {
    if (!partyRoot?.channelId || channels.length === 0) return FALLBACK_PARTY_NAV;
    const children = channels
      .filter(c => c.parentId === partyRoot.channelId && c.visible !== "0" && c.routePath)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (children.length === 0) return FALLBACK_PARTY_NAV;
    return children.map(c => ({
      id: c.channelCode,
      title: c.navName ?? c.title ?? c.channelCode,
      icon: PARTY_CHANNEL_ICONS[c.channelCode] ?? "article",
      path: c.routePath!,
    }));
  }, [channels, partyRoot]);

  return { channels, mainNavLinks, partyNavItems, loaded };
}

export { FALLBACK_MAIN_NAV, FALLBACK_PARTY_NAV };
