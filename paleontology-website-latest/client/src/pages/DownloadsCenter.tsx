import React, { useMemo, useState } from "react";
import PartyLayout from "../components/PartyLayout";
import { useCmsPageResolve } from "@/hooks/useCmsPageResolve";
import { formatDate, parseExtra } from "@/lib/cms-api";

const DEFAULT_CATEGORIES = ["全部资源", "管理办法", "学术标准", "年报资料"];

export default function DownloadsCenter() {
  const { data, loading } = useCmsPageResolve("/downloads-center");
  const channel = data?.channel;
  const entries = data?.entries ?? [];

  const [activeCategory, setActiveCategory] = useState("全部资源");
  const [searchText, setSearchText] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(entries.map(e => e.category).filter(Boolean));
    if (cats.size === 0) return DEFAULT_CATEGORIES;
    return ["全部资源", ...Array.from(cats) as string[]];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchCat = activeCategory === "全部资源" || e.category === activeCategory;
      const q = searchText.trim().toLowerCase();
      const matchSearch = !q || e.title.toLowerCase().includes(q) || (e.summary ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [entries, activeCategory, searchText]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const item of filtered) {
      const cat = item.category ?? "其他资料";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const pageTitle = channel?.title ?? "资料下载";

  return (
    <PartyLayout currentPageTitle={pageTitle} fullWidth routePath="/downloads-center">
      <div className="bg-slate-100 border border-[#E5E1DA] p-6 rounded-lg mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 text-sm font-bold whitespace-nowrap rounded transition-colors ${
                activeCategory === cat
                  ? "bg-[#002B49] text-white"
                  : "bg-white border border-[#E5E1DA] text-slate-700 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-96">
          <input
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E1DA] rounded focus:ring-1 focus:ring-[#002B49] text-sm"
            placeholder="输入关键词搜索资料..."
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {loading && <p className="text-sm text-slate-500 py-8 text-center">加载资料列表…</p>}

          {!loading && grouped.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">暂无资料，请在管理后台维护。</p>
          )}

          {grouped.map(([category, files]) => (
            <div key={category} className="bg-white border border-[#E5E1DA] p-6 relative rounded shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002B49] rounded-l" />
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#E5E1DA]">
                <h2 className="text-xl font-bold text-slate-800">{category}</h2>
                <span className="text-slate-400 font-bold text-[10px] tracking-wider">{files.length} 个文件</span>
              </div>
              <div className="divide-y divide-[#E5E1DA]">
                {files.map(file => {
                  const ex = parseExtra<{ fileName?: string; fileSize?: string }>(file.extraJson);
                  const ext = (file.fileExtension ?? ex.fileName?.split(".").pop() ?? "FILE").toUpperCase();
                  return (
                    <div key={file.entryId} className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group/item">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-lg text-[#002B49]">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{file.title}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-slate-400">发布日期: {formatDate(file)}</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100">{ext}</span>
                            {ex.fileSize && <span className="text-xs text-slate-400">{ex.fileSize}</span>}
                          </div>
                        </div>
                      </div>
                      <a
                        className="flex items-center gap-2 px-4 py-2 border border-[#002B49] text-[#002B49] hover:bg-[#002B49] hover:text-white transition-all text-xs font-bold rounded justify-center"
                        href={file.fileUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <span className="material-symbols-outlined text-sm">download</span> 点击下载
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-[#002B49] p-6 text-white rounded shadow-lg">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">bolt</span> 快速通道
            </h3>
            <div className="space-y-4">
              {[
                { label: "学会章程", href: "/regulations" },
                { label: "会员服务", href: "/services" },
                { label: "公开文件", href: "/public-downloads" },
              ].map(link => (
                <a key={link.label} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded" href={link.href}>
                  <span className="text-sm">{link.label}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E1DA] p-6 rounded shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 tracking-wider mb-6">资源库概况</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 border border-[#E5E1DA] rounded">
                <p className="text-2xl font-bold text-[#002B49]">{entries.length}</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1">文件总量</p>
              </div>
              <div className="text-center p-4 bg-slate-50 border border-[#E5E1DA] rounded">
                <p className="text-2xl font-bold text-[#002B49]">{categories.length - 1}</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1">资源分类</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PartyLayout>
  );
}
