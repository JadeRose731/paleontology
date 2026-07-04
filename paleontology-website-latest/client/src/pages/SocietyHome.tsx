import React, { useMemo } from "react";
import { Link } from "wouter";
import PartyLayout from "../components/PartyLayout";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { formatDate, isPinned, parseExtra } from "@/lib/cms-api";

const FALLBACK_BANNER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlNRleNYvnVjS703omdnq4SM-S4HAx1xJVPMOPltrMf3netfsxNQud338lNFjAxAV31Qvw_etAUmU7KMW1YX2RKxA0dIotwdignl1jKI4uZFvvhgyNMpO-uro4Ld7zpIKXe2gunUiSareQKqn3BzF2YiR1c6Mo4uJK52AGT3lz9FhR7rC91LMgbBgK9PpmNDIwMww8mYPVHIhMLQCaKNLMN8lTHz0YLT_5l_2At0BlIvczBqmME2kYLxSAm1wZ1q303vtfCEZnWQ4";

function splitDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return { y: y ?? "", md: m && d ? `${m}-${d}` : dateStr };
}

export default function SocietyHome() {
  const { channel } = useCmsChannel("/");
  const { items: banners } = useCmsEntries({ moduleCode: "banners" });
  const { items: news } = useCmsEntries({ moduleCode: "news" });
  const { items: announcements } = useCmsEntries({ moduleCode: "announcements" });

  const heroBanner = banners[0];
  const featuredNews = useMemo(() => {
    const pinned = news.filter(isPinned);
    return pinned[0] ?? news[0];
  }, [news]);

  const newsList = useMemo(() =>
    news.filter(n => n.entryId !== featuredNews?.entryId).slice(0, 3),
  [news, featuredNews]);

  const workNews = useMemo(() =>
    news.filter(n => n.category === "工作动态").slice(0, 4),
  [news]);

  const annList = useMemo(() => {
    const sorted = [...announcements].sort((a, b) => {
      if (isPinned(a) !== isPinned(b)) return isPinned(a) ? -1 : 1;
      return formatDate(b).localeCompare(formatDate(a));
    });
    return sorted.slice(0, 4);
  }, [announcements]);

  const pageTitle = channel?.title ?? "中国古生物学会";
  const pageSubtitle = channel?.subtitle ?? "探索生命的起源与演化";

  return (
    <PartyLayout currentPageTitle="首页">
      <div className="flex flex-col w-full">
        <section className="relative w-full h-[500px] flex items-center overflow-hidden mb-0">
          <div className="absolute inset-0 z-0">
            <img
              alt={heroBanner?.title ?? "中国古生物学会首页横幅"}
              className="w-full h-full object-cover"
              src={heroBanner?.coverUrl || FALLBACK_BANNER}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#002B49]/90 via-[#002B49]/40 to-transparent" />
          </div>
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8 text-white">
            <div className="space-y-6 max-w-2xl">
              <div className="inline-block px-4 py-1 bg-[#f5e0ba]/20 border border-[#f5e0ba] text-[#f5e0ba] font-bold text-xs tracking-widest rounded-sm">
                ESTABLISHED 1929
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-widest xingkai-script text-[#f5e0ba]" style={{ textShadow: "rgba(0, 0, 0, 0.5) 2px 2px 4px" }}>
                {pageTitle}
              </h1>
              <p className="text-xl lg:text-2xl text-slate-200">{pageSubtitle}</p>
              <p className="text-sm lg:text-base opacity-90 leading-relaxed">
                {channel?.kicker ?? "致力于古生物学及其相关学科的发展，推动科学研究与科普教育，连结全球学术智慧。"}
              </p>
              <div className="flex gap-4 pt-4">
                <Link href="/intro">
                  <button className="bg-[#003358] text-white px-6 py-3 rounded text-xs font-bold hover:bg-[#004a7c] transition-all flex items-center gap-2 cursor-pointer">
                    了解更多 <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </Link>
                <Link href="/services">
                  <button className="border border-white text-white px-6 py-3 rounded text-xs font-bold hover:bg-white/10 transition-all cursor-pointer">
                    加入我们
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-12 border-b border-[#E5E1DA] mb-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { href: "/intro", icon: "account_balance", label: "学会简介" },
                { href: "/structure", icon: "hub", label: "组织机构" },
                { href: "/services", icon: "handshake", label: "学会服务" },
                { href: "/party", icon: "flag", label: "党建文化" },
              ].map(item => (
                <Link key={item.href} href={item.href} className="group flex flex-col items-center p-4 transition-all cursor-pointer">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-[#002b49] text-white group-hover:bg-[#004a7c] transition-colors shadow-md">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{item.icon}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-1">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12 w-full">
          <div className="grid grid-cols-12 gap-8 items-stretch">
            <div className="col-span-12 lg:col-span-8 space-y-8 flex flex-col justify-between">
              {featuredNews && (
                <div className="relative w-full overflow-hidden rounded-lg shadow-sm border border-[#E5E1DA] group min-h-[350px] flex-grow">
                  {featuredNews.coverUrl && (
                    <img alt={featuredNews.title} className="w-full h-full object-cover absolute inset-0" src={featuredNews.coverUrl} />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <h2 className="text-xl font-bold">{featuredNews.title}</h2>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                <div className="bg-white border border-[#E5E1DA] border-t-2 border-t-[#D9C5A0] p-6 shadow-sm rounded hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-[#003358] flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-500">science</span>
                      学术动态
                    </h3>
                    <Link href="/news-publish" className="text-xs text-slate-500 hover:text-[#003358]">更多+</Link>
                  </div>
                  <ul className="space-y-4">
                    {newsList.length === 0 && (
                      <li className="text-xs text-slate-400">暂无新闻，请在管理后台发布</li>
                    )}
                    {newsList.map((item, idx) => {
                      const dt = splitDate(formatDate(item));
                      return (
                        <li key={item.entryId} className={`flex gap-4 group ${idx > 0 ? "border-t border-slate-100 pt-4" : ""}`}>
                          <div className="flex-none w-14 h-14 bg-slate-50 flex flex-col items-center justify-center rounded border border-[#E5E1DA]">
                            <span className="text-sm font-bold text-[#003358]">{dt.md}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{dt.y}</span>
                          </div>
                          <div className="flex-grow">
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#003358] transition-colors cursor-pointer line-clamp-1">{item.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1">{item.summary}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="bg-white border border-[#E5E1DA] border-t-2 border-t-[#D9C5A0] p-6 shadow-sm rounded hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-[#003358] flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-500">work_history</span>
                      工作进展
                    </h3>
                    <Link href="/news-publish" className="text-xs text-slate-500 hover:text-[#003358]">更多+</Link>
                  </div>
                  <ul className="space-y-4">
                    {(workNews.length ? workNews : news.slice(0, 4)).map((item, idx) => (
                      <li key={item.entryId} className={`group ${idx > 0 ? "border-t border-slate-50 pt-3" : ""}`}>
                        <span className="text-[10px] text-slate-400 mb-1 block">{formatDate(item)}</span>
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#003358] transition-colors cursor-pointer border-l-2 border-[#003358] pl-3">{item.title}</h4>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <aside className="col-span-12 lg:col-span-4 flex flex-col justify-between space-y-8 lg:space-y-0">
              <div className="bg-slate-50 border border-[#E5E1DA] p-6 rounded">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[#003358]" style={{ fontVariationSettings: '"FILL" 1' }}>campaign</span>
                  <h3 className="font-bold text-lg text-slate-800">通知公告</h3>
                </div>
                <div className="space-y-4">
                  {annList.map((item, idx) => {
                    const pinned = isPinned(item);
                    const ex = parseExtra<{ showOnHomepage?: boolean }>(item.extraJson);
                    if (idx === 0 && (pinned || ex.showOnHomepage)) {
                      return (
                        <Link key={item.entryId} href="/society-announcements" className="block bg-white p-4 border-l-4 border-red-700 hover:bg-red-50 transition-colors rounded-r shadow-sm cursor-pointer">
                          <p className="text-xs text-red-700 font-bold mb-1">[置顶] {item.title}</p>
                          <span className="text-[10px] text-slate-400">{formatDate(item)}</span>
                        </Link>
                      );
                    }
                    return (
                      <Link key={item.entryId} href="/society-announcements" className="block hover:bg-white p-2 transition-colors border-b border-[#E5E1DA] cursor-pointer">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</p>
                        <span className="text-[10px] text-slate-400">{formatDate(item)}</span>
                      </Link>
                    );
                  })}
                </div>
                <Link href="/society-announcements">
                  <button className="w-full mt-6 py-2 bg-white border border-slate-300 text-xs font-bold hover:bg-slate-100 transition-all rounded cursor-pointer">
                    查看全部公告
                  </button>
                </Link>
              </div>

              <div className="bg-white border border-[#E5E1DA] overflow-hidden rounded">
                <div className="p-4 bg-[#002B49] text-white">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span className="material-symbols-outlined">library_books</span>
                    学术资源
                  </h3>
                </div>
                <div className="flex flex-col divide-y divide-[#E5E1DA]">
                  {[
                    { href: "/party", icon: "account_balance", label: "党建文化" },
                    { href: "/services?tab=branches", icon: "account_tree", label: "专业分会" },
                    { href: "/services", icon: "card_membership", label: "学会服务" },
                  ].map(item => (
                    <Link key={item.href} href={item.href} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[#003358]">{item.icon}</span>
                        <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-[#003358] transition-colors">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}
