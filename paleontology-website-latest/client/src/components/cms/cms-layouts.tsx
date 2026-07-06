import { useMemo, useState } from "react";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import InternationalExchangePanel from "@/components/services/InternationalExchangePanel";
import ScienceCommunicationPanel from "@/components/services/ScienceCommunicationPanel";
import { PartyTopicsList } from "@/components/party/PartyTopicsList";
import type { CmsLayoutProps } from "@/lib/cms-types";
import { formatDate, isPinned, parseExtra, type ApiCmsEntry } from "@/lib/cms-api";
import {
  getLayoutParams,
  type ListLayoutParams,
  type GalleryLayoutParams,
  type FileListLayoutParams,
} from "@/lib/cms-layout-params";

function PageHeader({ channel, routePath }: { channel: CmsLayoutProps["channel"]; routePath: string }) {
  const title = channel.title ?? channel.navName ?? routePath;
  const subtitle = channel.subtitle ?? channel.kicker;
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
      <div className="h-1 w-24 mb-4" style={{ backgroundColor: "#d8c49f" }} />
      {subtitle && <p className="text-base text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>}
    </header>
  );
}

function PartySectionHeader({ channel }: { channel: CmsLayoutProps["channel"] }) {
  const title = channel.title ?? channel.navName ?? "";
  return (
    <div className="border-b border-fossil-stone pb-4 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <span className="w-1 h-6 bg-party-red inline-block" />
          {title}
        </h2>
        {(channel.subtitle ?? channel.kicker) && (
          <p className="text-xs text-muted-foreground mt-1">{channel.subtitle ?? channel.kicker}</p>
        )}
      </div>
    </div>
  );
}

export function CmsTimelineLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const nodes = useMemo(
    () => [...entries].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [entries]
  );
  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      <PageHeader channel={channel} routePath={routePath} />
      {nodes.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">暂无内容</p>}
      <section className="relative space-y-12 py-6 before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:bg-slate-200 before:hidden md:before:block">
        {nodes.map((node, idx) => {
          const reverse = idx % 2 === 1;
          const year = node.category ?? node.title;
          return (
            <div key={node.entryId} className={`relative flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center justify-between w-full`}>
              <div className="w-full md:w-[45%] bg-white p-6 border border-fossil-stone border-t-2 border-t-tertiary-fixed rounded shadow-sm">
                <span className="text-3xl font-bold text-primary italic">{year}</span>
                {node.summary && <h3 className="text-lg font-bold text-primary mt-3 mb-2">{node.summary}</h3>}
                <CmsRichTextBody html={node.bodyContent ?? ""} className="text-sm" />
              </div>
              {node.coverUrl && (
                <div className="w-full md:w-[45%] mt-6 md:mt-0">
                  <img alt={node.title} className="rounded-lg border border-fossil-stone w-full object-cover" src={node.coverUrl} />
                </div>
              )}
            </div>
          );
        })}
      </section>
    </CmsPageShell>
  );
}

export function CmsListLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const params = getLayoutParams<ListLayoutParams>(channel, {
    listStyle: "simple",
    showPinnedBadge: true,
    pinnedLabel: "置顶",
    showDate: true,
    showCategory: false,
    showSummary: true,
  });
  const isParty = channel.shellType === "party";
  const items = useMemo(
    () => [...entries].sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [entries]
  );

  const inner = (
    <>
      {isParty ? <PartySectionHeader channel={channel} /> : <PageHeader channel={channel} routePath={routePath} />}
      {items.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">暂无内容</p>}
      <div className={params.listStyle === "card" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
        {items.map(item => (
          <article
            key={item.entryId}
            className={`bg-white border border-fossil-stone p-5 rounded shadow-sm ${params.listStyle === "card" ? "hover:shadow-md transition-shadow" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-primary">{item.title}</h3>
              {params.showPinnedBadge && isPinned(item) && (
                <span className="text-[10px] bg-party-red text-white px-2 py-0.5 rounded shrink-0">
                  {params.pinnedLabel ?? "置顶"}
                </span>
              )}
            </div>
            {params.showCategory && item.category && (
              <span className="text-xs text-slate-500 mt-1 inline-block">{item.category}</span>
            )}
            {params.showSummary && item.summary && <p className="text-sm text-slate-600 mt-2">{item.summary}</p>}
            {params.showDate && <div className="text-xs text-slate-400 mt-2">{formatDate(item)}</div>}
            <CmsRichTextBody html={item.bodyContent ?? ""} className="text-sm mt-3" />
          </article>
        ))}
      </div>
    </>
  );

  return <CmsPageShell channel={channel} routePath={routePath}>{inner}</CmsPageShell>;
}

export function CmsGalleryLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const params = getLayoutParams<GalleryLayoutParams>(channel, {
    filterLabel: "全部瞬间",
    columns: 4,
    showFilters: true,
  });
  const [activeFilter, setActiveFilter] = useState(params.filterLabel ?? "全部瞬间");
  const photos = useMemo(() => [...entries].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [entries]);
  const filters = useMemo(() => {
    const cats = new Set(photos.map(p => p.category).filter(Boolean));
    return [params.filterLabel ?? "全部瞬间", ...Array.from(cats) as string[]];
  }, [photos, params.filterLabel]);
  const filtered = activeFilter === params.filterLabel ? photos : photos.filter(p => p.category === activeFilter);
  const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 md:grid-cols-4", 5: "grid-cols-2 md:grid-cols-5", 6: "grid-cols-2 md:grid-cols-6" }[params.columns ?? 4] ?? "grid-cols-2 md:grid-cols-4";

  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      <PageHeader channel={channel} routePath={routePath} />
      {params.showFilters && filters.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-8">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 text-sm rounded ${activeFilter === f ? "bg-primary text-white" : "bg-slate-100"}`}>{f}</button>
          ))}
        </div>
      )}
      <div className={`grid ${colClass} gap-4`}>
        {filtered.map(p => (
          <figure key={p.entryId} className="bg-white border border-fossil-stone rounded overflow-hidden">
            {p.coverUrl && <img src={p.coverUrl} alt={p.title} className="w-full aspect-square object-cover" />}
            <figcaption className="p-3 text-sm font-medium">{p.title}</figcaption>
          </figure>
        ))}
      </div>
    </CmsPageShell>
  );
}

function groupPersonnel(items: ApiCmsEntry[]) {
  const groups = new Map<string, ApiCmsEntry[]>();
  for (const p of items) {
    const g = p.summary ?? "其他";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  return Array.from(groups.entries());
}

export function CmsPersonnelLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const grouped = groupPersonnel(entries);
  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      <PageHeader channel={channel} routePath={routePath} />
      {grouped.map(([group, members]) => (
        <section key={group} className="mb-12">
          <h2 className="text-xl font-bold text-primary mb-6">{group}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map(m => {
              const ex = parseExtra<{ name?: string; bio?: string }>(m.extraJson);
              return (
                <div key={m.entryId} className="bg-white border border-fossil-stone p-5 rounded">
                  <h3 className="font-bold text-primary">{ex?.name ?? m.title}</h3>
                  <CmsRichTextBody html={ex?.bio ?? m.bodyContent ?? ""} className="text-sm mt-2" />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </CmsPageShell>
  );
}

export function CmsRichTextLayout({ channel, entries, blocks, routePath }: CmsLayoutProps) {
  const page = entries[0];
  const isParty = channel.shellType === "party";
  const inner = (
    <>
      {isParty ? <PartySectionHeader channel={channel} /> : <PageHeader channel={channel} routePath={routePath} />}
      {blocks.map((block, i) => (
        <section key={i} className="bg-white border border-fossil-stone rounded p-6 shadow-sm mb-4">
          {block.title && <h3 className="text-base font-bold text-primary mb-4">{block.title}</h3>}
          <CmsRichTextBody html={block.bodyContent ?? ""} />
        </section>
      ))}
      {page && (
        <section className="bg-white border border-fossil-stone rounded p-6 shadow-sm">
          <CmsRichTextBody html={page.bodyContent ?? ""} />
        </section>
      )}
      {!page && blocks.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">暂无页面内容</p>}
    </>
  );
  return <CmsPageShell channel={channel} routePath={routePath}>{inner}</CmsPageShell>;
}

function isRegulationPage(code?: string | null) {
  if (!code) return false;
  return code.includes("regulation") || code.includes("charter");
}

export function CmsRegulationsLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const pages = useMemo(() => entries.filter(p => isRegulationPage(p.columnCode)), [entries]);
  const [activeTab, setActiveTab] = useState<string>(() => pages[0]?.columnCode ?? "");
  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      <PageHeader channel={channel} routePath={routePath} />
      {pages.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">暂无规章条例内容</p>}
      {pages.length > 0 && (
        <div className="grid grid-cols-12 gap-10">
          <aside className="col-span-12 lg:col-span-3">
            <ul className="divide-y divide-[#E5E1DA] bg-white border border-[#E5E1DA] rounded overflow-hidden">
              {pages.map(page => {
                const id = page.columnCode ?? String(page.entryId);
                return (
                  <li key={page.entryId}>
                    <button
                      onClick={() => { setActiveTab(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}
                      className={`w-full px-6 py-4 text-left ${activeTab === id ? "bg-slate-100 font-bold text-[#001d36]" : "text-slate-700"}`}
                    >
                      {page.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          <section className="col-span-12 lg:col-span-9 space-y-10">
            {pages.map(page => {
              const id = page.columnCode ?? String(page.entryId);
              return (
                <article key={page.entryId} id={id} className="bg-white border border-[#E5E1DA] p-8 rounded">
                  <h2 className="text-xl font-bold text-[#001d36] mb-4">{page.title}</h2>
                  <CmsRichTextBody html={page.bodyContent ?? ""} />
                </article>
              );
            })}
          </section>
        </div>
      )}
    </CmsPageShell>
  );
}

export function CmsFileListLayout({ channel, entries, routePath }: CmsLayoutProps) {
  const params = getLayoutParams<FileListLayoutParams>(channel, {
    groupByCategory: true,
    showFileSize: true,
    showSearch: false,
  });
  const [searchText, setSearchText] = useState("");
  const filteredEntries = useMemo(() => {
    if (!params.showSearch || !searchText.trim()) return entries;
    const q = searchText.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q) || (e.summary ?? "").toLowerCase().includes(q));
  }, [entries, searchText, params.showSearch]);

  const grouped = useMemo(() => {
    if (!params.groupByCategory) return [["全部", filteredEntries] as const];
    const map = new Map<string, typeof entries>();
    for (const item of filteredEntries) {
      const cat = item.category ?? "其他资料";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredEntries, params.groupByCategory]);

  const isParty = channel.shellType === "party";
  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      {isParty ? <PartySectionHeader channel={channel} /> : <PageHeader channel={channel} routePath={routePath} />}
      {params.showSearch && (
        <div className="mb-6">
          <input
            className="w-full max-w-md px-3 py-2 border border-fossil-stone rounded text-sm"
            placeholder="搜索文件..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      )}
      {entries.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">暂无下载资源</p>}
      <div className="space-y-8">
        {grouped.map(([category, files]) => (
          <section key={category}>
            <h3 className="text-sm font-bold text-primary mb-4">{category}</h3>
            <div className="space-y-3">
              {files.map(file => {
                const ex = parseExtra<{ fileName?: string; fileSize?: string }>(file.extraJson);
                return (
                  <a
                    key={file.entryId}
                    href={file.fileUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-white border border-fossil-stone p-4 rounded hover:border-primary transition-all"
                  >
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{file.title}</p>
                      <p className="text-xs text-slate-500">
                        {ex.fileName ?? file.summary}
                        {params.showFileSize && ex.fileSize && ` · ${ex.fileSize}`}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">download</span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </CmsPageShell>
  );
}

export function CmsTopicsLayout({ routePath }: CmsLayoutProps) {
  return <PartyTopicsList routePath={routePath} />;
}

export function CmsInternationalLayout({ channel, routePath }: CmsLayoutProps) {
  return (
    <CmsPageShell
      channel={channel}
      routePath={routePath}
    >
      <InternationalExchangePanel />
    </CmsPageShell>
  );
}

export function CmsScienceLayout({ channel, routePath }: CmsLayoutProps) {
  return (
    <CmsPageShell channel={channel} routePath={routePath}>
      <ScienceCommunicationPanel />
    </CmsPageShell>
  );
}

export function CmsListMultiColumnLayout(props: CmsLayoutProps) {
  return <CmsListLayout {...props} />;
}
