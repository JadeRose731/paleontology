import { useState, useEffect, useRef, useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { formatDate, isPinned } from "@/lib/cms-api";
import { useLocation } from "wouter";
import {
  MEMBERSHIP_FEE_CONFIG,
  CONFERENCE_BRANCH_MAP,
  CONFERENCE_FEE_TYPE_LABEL,
  getConferenceFeeConfig,
  CONFERENCE_FEE_TYPE_TO_FIELD,
  type ConferenceFeeType,
} from "@shared/constants";

const FEE_STANDARDS_NOTICE = {
  id: 0,
  isFeatured: true,
  isFeeStandards: true as const,
  category: "组织工作",
  date: "2026-06-12",
  title: "中国古生物学会会员费及会议注册费收费标准公示",
};

const CONFERENCE_TITLES: Record<string, string> = {
  "conf-1": "第十五届全国微体古生物学学术研讨会",
  "conf-2": "2026年度古植物学与环境演变论坛",
  "conf-3": "热河生物群国际学术研讨会",
  "conf-4": "第十二届全国古脊椎动物学学术年会",
  "conf-5": "中国孢粉学会第十届全国学术大会",
  "conf-6": "古生态学与古环境重建国际研讨会",
  "conf-7": "地球生物学前沿论坛",
  "conf-8": "古生物学新技术新方法专题研讨会",
  "demo-conf": "古无脊椎动物学学术工作坊（演示会议）",
  "conf-zgswxh-1": "中国古生物学会第32届学术年会",
  "conf-zgswxh-2": "中国古生物学会国际古生物学前沿论坛",
};

const FEE_TYPE_KEYS: ConferenceFeeType[] = [
  "student_member",
  "non_student_member",
  "student_non_member",
  "non_student_non_member",
];

export default function SocietyAnnouncements() {
  const { channel } = useCmsChannel("/society-announcements");
  const { items: cmsItems, loading } = useCmsEntries({ moduleCode: "announcements" });
  const [activeCategory, setActiveFilter] = useState("全部公告");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = window.location.href;
    const qs = raw.includes("?") ? raw.split("?")[1] : "";
    const m = qs.match(/(?:^|&)highlight=(\d+)/);
    if (m) {
      const id = parseInt(m[1], 10);
      setHighlightedId(id);
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-announcement-id="${id}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, []);

  const cmsAnnouncements = useMemo(() =>
    cmsItems.map(item => {
      const d = formatDate(item);
      const [y, m, day] = d.split("-");
      return {
        id: item.entryId ?? 0,
        isFeatured: isPinned(item),
        category: item.category ?? "组织工作",
        date: d,
        title: item.title,
        desc: item.summary ?? "",
        views: "",
        day: day ?? "",
        month: y && m ? `${y}.${m}` : "",
        code: "",
      };
    }),
    [cmsItems]
  );

  const announcements = [FEE_STANDARDS_NOTICE, ...cmsAnnouncements];

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of announcements) {
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    }
    const cats = [{ name: "全部公告", count: announcements.length }];
    for (const [name, count] of Array.from(counts.entries())) {
      cats.push({ name, count });
    }
    return cats;
  }, [announcements]);

  const conferenceFeeRows = Object.keys(CONFERENCE_BRANCH_MAP)
    .filter(id => CONFERENCE_TITLES[id])
    .map(confId => ({
      confId,
      name: CONFERENCE_TITLES[confId],
      fees: getConferenceFeeConfig(confId),
    }));

  const filteredAnnouncements = activeCategory === "全部公告"
    ? announcements
    : announcements.filter(item => item.category === activeCategory);

  return (
    <PartyLayout currentPageTitle={channel?.title ?? "会员公告"}>
      <CmsPageHeader routePath="/society-announcements" fallbackTitle="会员公告" className="mb-6" />
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-1/4 space-y-6">
          <div className="bg-[#FCFAF7] border border-[#E5E1DA] p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-[#002B49] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#002B49] inline-block" /> 公告分类
            </h3>
            <ul className="space-y-1">
              {categories.map(cat => (
                <li key={cat.name}>
                  <button
                    onClick={() => setActiveFilter(cat.name)}
                    className="w-full flex items-center justify-between py-3 px-2 rounded hover:bg-slate-100 transition-all text-left"
                  >
                    <span className={activeCategory === cat.name ? "font-bold text-[#002B49]" : "text-slate-600"}>
                      {cat.name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      activeCategory === cat.name ? "bg-[#002B49] text-white" : "bg-[#E5E1DA] text-slate-600"
                    }`}>
                      {cat.count < 10 && cat.count > 0 ? `0${cat.count}` : cat.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#002B49] text-white p-6 rounded-lg relative overflow-hidden shadow-md">
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-2">加入学会</h4>
              <p className="text-xs text-white/70 mb-6 leading-relaxed">成为中国古生物学会会员，获取最新行业资讯与学术资源。</p>
              <button
                onClick={() => setLocation("/services?tab=branches")}
                className="bg-[#f5e0ba] text-[#241a03] px-6 py-2.5 rounded font-bold text-xs w-full hover:bg-[#d8c4a0] transition-all shadow-lg"
              >
                了解专业分会
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl opacity-5">account_balance</span>
          </div>
        </aside>

        <section className="w-full lg:w-3/4">
          <div className="flex items-center justify-between mb-8 border-b border-[#E5E1DA] pb-4">
            <span className="font-bold text-[#002B49] border-b-2 border-[#002B49] pb-4 relative -bottom-[17px]">最新发布</span>
            <div className="text-slate-500 text-xs">
              {loading ? "加载中…" : `共 ${filteredAnnouncements.length} 条结果`}
            </div>
          </div>

          <div ref={listRef} className="space-y-6">
            {filteredAnnouncements.map(item => {
              if ("isFeeStandards" in item && item.isFeeStandards) {
                return (
                  <div key={item.id} data-announcement-id={item.id} className={`bg-white border-l-4 border-[#C41E3A] shadow-sm border-y border-r border-[#E5E1DA] p-8 mb-6 transition-all duration-700 ${highlightedId === item.id ? "ring-2 ring-[#C41E3A] ring-offset-2 bg-red-50/30" : ""}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-red-50 text-red-600 px-3 py-1 text-[10px] font-bold tracking-wider rounded border border-red-100 uppercase">缴费标准公示</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span> {item.date}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#002B49] mb-6">{item.title}</h2>
                    <div className="mb-6">
                      <h3 className="font-bold text-sm text-[#002B49] mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">card_membership</span>
                        一、学会会员费标准
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-[#E5E1DA] rounded-lg overflow-hidden">
                          <thead className="bg-[#002B49] text-white text-xs">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-bold">会员类型</th>
                              <th className="px-4 py-2.5 text-right font-bold">年费标准</th>
                              <th className="px-4 py-2.5 text-left font-bold">说明</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E1DA]">
                            <tr className="bg-white">
                              <td className="px-4 py-3 font-bold text-[#002B49]">普通会员</td>
                              <td className="px-4 py-3 text-right font-bold text-[#002B49]">¥{MEMBERSHIP_FEE_CONFIG.default.standard}/年</td>
                              <td className="px-4 py-3 text-xs text-slate-500">适用于绝大多数古生物科技工作者</td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="px-4 py-3 font-bold text-[#002B49]">学生会员</td>
                              <td className="px-4 py-3 text-right font-bold text-[#002B49]">¥{MEMBERSHIP_FEE_CONFIG.default.student}/年</td>
                              <td className="px-4 py-3 text-xs text-slate-500">在读本科生、硕士及博士研究生</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="px-4 py-3 font-bold text-[#002B49]">单位会员</td>
                              <td className="px-4 py-3 text-right font-bold text-[#002B49]">¥{MEMBERSHIP_FEE_CONFIG.default.corporate}/年</td>
                              <td className="px-4 py-3 text-xs text-slate-500">科研院所、高校院系、企事业单位</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#002B49] mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">event</span>
                        二、学术会议注册费标准（四类）
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-[#E5E1DA] rounded-lg overflow-hidden">
                          <thead className="bg-[#002B49] text-white text-xs">
                            <tr>
                              <th className="px-3 py-2.5 text-left font-bold">会议名称</th>
                              {FEE_TYPE_KEYS.map(key => (
                                <th key={key} className="px-2 py-2.5 text-right font-bold whitespace-nowrap">
                                  {CONFERENCE_FEE_TYPE_LABEL[key]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E1DA]">
                            {conferenceFeeRows.map((row, idx) => (
                              <tr key={row.confId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                <td className="px-3 py-2.5 text-xs text-[#002B49] font-bold">{row.name}</td>
                                {FEE_TYPE_KEYS.map(key => {
                                  const val = row.fees[CONFERENCE_FEE_TYPE_TO_FIELD[key]];
                                  return (
                                    <td key={key} className="px-2 py-2.5 text-right text-xs font-bold text-[#002B49]">
                                      {val > 0 ? `¥${val}` : "--"}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              }

              const ann = item as typeof cmsAnnouncements[0];
              if (ann.isFeatured) {
                return (
                  <div key={ann.id} data-announcement-id={ann.id} className={`bg-white border-l-4 border-[#002B49] shadow-sm border-y border-r border-[#E5E1DA] p-8 hover:shadow-md transition-all group cursor-pointer ${highlightedId === ann.id ? "ring-2 ring-[#002B49] ring-offset-2 bg-blue-50/30" : ""}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-red-50 text-red-600 px-3 py-1 text-[10px] font-bold tracking-wider rounded border border-red-100 uppercase">重要通知</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span> {ann.date}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#002B49] mb-4 leading-relaxed">{ann.title}</h2>
                    {ann.desc && <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{ann.desc}</p>}
                    <span className="flex items-center gap-1 text-xs font-bold text-[#765f42] px-3 py-1 bg-[#fadab7] rounded w-fit">{ann.category}</span>
                  </div>
                );
              }

              return (
                <div key={ann.id} data-announcement-id={ann.id} className={`bg-white border border-[#E5E1DA] p-6 hover:shadow-md transition-all group cursor-pointer flex gap-8 ${highlightedId === ann.id ? "ring-2 ring-[#002B49] ring-offset-2 bg-blue-50/30" : ""}`}>
                  {ann.day && (
                    <div className="hidden md:flex flex-col items-center justify-center bg-slate-50 w-24 h-24 rounded border border-[#E5E1DA] shrink-0">
                      <span className="text-3xl font-bold text-[#002B49]">{ann.day}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{ann.month}</span>
                    </div>
                  )}
                  <div className="flex-grow">
                    <h2 className="text-lg font-bold text-[#002B49] mb-3">{ann.title}</h2>
                    {ann.desc && <p className="text-sm text-slate-600 mb-4 leading-relaxed">{ann.desc}</p>}
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{ann.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PartyLayout>
  );
}
