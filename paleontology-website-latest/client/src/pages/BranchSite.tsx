import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import PartyLayout from "../components/PartyLayout";
import StructureSidebar from "@/components/structure/StructureSidebar";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import {
  BRANCH_META,
  BRANCH_DOWNLOAD_CATEGORIES,
  BRANCH_SCIENCE_CATEGORIES,
  BRANCH_SITE_SECTIONS,
  branchSitePath,
  isValidBranchId,
  normalizeBranchId,
  resolveBranchSection,
} from "@shared/branch-site";
import {
  entryShowOnHomepage,
  filterBranchEntries,
  pageForBranch,
} from "@/lib/branch-cms";
import { formatDate, parseExtra, type ApiCmsEntry } from "@/lib/cms-api";
import NotFound from "./NotFound";

function ArticleList({ items, emptyHint }: { items: ApiCmsEntry[]; emptyHint: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">{emptyHint}</p>;
  }
  return (
    <div className="space-y-4">
      {items.map(item => (
        <article
          key={item.entryId}
          className="border border-fossil-stone p-5 rounded hover:shadow-md transition-shadow"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {item.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary px-2 py-0.5 bg-secondary/10 rounded">
                {item.category}
              </span>
            )}
            <time className="text-xs text-slate-400">{formatDate(item)}</time>
          </div>
          <h3 className="text-lg font-bold text-primary">{item.title}</h3>
          {item.summary && <p className="text-sm text-slate-600 mt-2">{item.summary}</p>}
          {item.bodyContent && (
            <CmsRichTextBody html={item.bodyContent} className="text-sm mt-3 line-clamp-4" />
          )}
        </article>
      ))}
    </div>
  );
}

function PersonnelGrid({ members }: { members: ApiCmsEntry[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">暂无人员信息。</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map(p => (
        <div
          key={p.entryId}
          className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-6 rounded shadow-sm"
        >
          {p.category && (
            <span className="text-xs font-semibold text-secondary block mb-2">{p.category}</span>
          )}
          <h4 className="text-xl font-bold text-primary">{p.title}</h4>
          {p.bodyContent && <CmsRichTextBody html={p.bodyContent} className="text-xs text-slate-600 mt-2" />}
        </div>
      ))}
    </div>
  );
}

function GalleryGrid({ photos }: { photos: ApiCmsEntry[] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">暂无相册照片。</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map(p => (
        <figure key={p.entryId} className="border border-fossil-stone rounded overflow-hidden group">
          {p.coverUrl && (
            <img src={p.coverUrl} alt={p.title} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform" />
          )}
          <figcaption className="p-3 text-sm font-bold text-primary">{p.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function TimelineSection({ nodes }: { nodes: ApiCmsEntry[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">暂无历史沿革节点。</p>;
  }
  const sorted = [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <div className="space-y-8">
      {sorted.map(node => (
        <div key={node.entryId} className="flex gap-6 border-l-2 border-primary pl-6">
          <span className="text-2xl font-bold text-primary italic shrink-0 w-20">
            {node.category ?? ""}
          </span>
          <div>
            <h3 className="font-bold text-primary">{node.summary ?? node.title}</h3>
            <CmsRichTextBody html={node.bodyContent ?? ""} className="text-sm mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScienceSection({ items }: { items: ApiCmsEntry[] }) {
  const [cat, setCat] = useState<string>("all");
  const filtered = useMemo(
    () => (cat === "all" ? items : items.filter(i => i.category === cat)),
    [items, cat],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`px-3 py-1.5 text-xs font-bold rounded border ${
            cat === "all" ? "bg-primary text-white border-primary" : "border-fossil-stone text-slate-600"
          }`}
        >
          全部
        </button>
        {BRANCH_SCIENCE_CATEGORIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 text-xs font-bold rounded border ${
              cat === c ? "bg-primary text-white border-primary" : "border-fossil-stone text-slate-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ArticleList items={filtered} emptyHint="暂无科学传播内容。" />
    </div>
  );
}

function AwardsSection({ items }: { items: ApiCmsEntry[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">暂无获奖成果。</p>;
  }
  return (
    <div className="space-y-4">
      {items.map(e => {
        const ex = parseExtra<{ awardName?: string; winner?: string }>(e.extraJson);
        return (
          <div key={e.entryId} className="border border-fossil-stone p-5 rounded flex gap-4">
            <span className="text-2xl font-bold text-secondary shrink-0">{e.category}</span>
            <div>
              <h4 className="font-bold text-primary">{ex.awardName ?? e.title}</h4>
              <p className="text-sm text-slate-600 mt-1">获奖人：{ex.winner ?? e.summary}</p>
              {e.bodyContent && <CmsRichTextBody html={e.bodyContent} className="text-sm mt-2" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DownloadsSection({ items }: { items: ApiCmsEntry[] }) {
  const [cat, setCat] = useState<string>(BRANCH_DOWNLOAD_CATEGORIES[0]);
  const files = useMemo(() => {
    const mapped = items.map(e => {
      const ex = parseExtra<{ fileName?: string; fileSize?: string }>(e.extraJson);
      return {
        id: e.entryId,
        title: e.title,
        category: e.category ?? "其他",
        fileName: ex.fileName ?? e.summary ?? "",
        fileUrl: e.fileUrl ?? "",
        fileSize: ex.fileSize ?? "",
      };
    });
    return mapped.filter(f => f.category === cat);
  }, [items, cat]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {BRANCH_DOWNLOAD_CATEGORIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 text-xs font-bold rounded border ${
              cat === c ? "bg-primary text-white border-primary" : "border-fossil-stone text-slate-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">该分类暂无下载文件。</p>
      ) : (
        <div className="space-y-3">
          {files.map(f => (
            <a
              key={f.id}
              href={f.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 border border-fossil-stone rounded hover:border-primary hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-primary">description</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary text-sm truncate">{f.title}</p>
                <p className="text-xs text-slate-400">{f.fileName}{f.fileSize ? ` · ${f.fileSize}` : ""}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">download</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BranchSite() {
  const [, params] = useRoute("/structure/branch/:branchId/:section?");
  const branchId = normalizeBranchId(params?.branchId ?? "");
  const sectionDef = resolveBranchSection(params?.section);

  const meta = BRANCH_META[branchId];
  if (!isValidBranchId(branchId) || !meta) {
    return <NotFound />;
  }

  const { items: pages } = useCmsEntries({ moduleCode: "pages" });
  const { items: news } = useCmsEntries({ moduleCode: "news" });
  const { items: announcements } = useCmsEntries({ moduleCode: "announcements" });
  const { items: personnel } = useCmsEntries({ moduleCode: "personnel" });
  const { items: timeline } = useCmsEntries({ moduleCode: "timeline" });
  const { items: gallery } = useCmsEntries({ moduleCode: "gallery" });
  const { items: science } = useCmsEntries({ moduleCode: "science" });
  const { items: awards } = useCmsEntries({ moduleCode: "awards" });
  const { items: publicFiles } = useCmsEntries({ moduleCode: "public-files" });

  const branchNews = useMemo(() => filterBranchEntries(news, branchId), [news, branchId]);
  const branchAnnouncements = useMemo(
    () => filterBranchEntries(announcements, branchId),
    [announcements, branchId],
  );
  const branchPersonnel = useMemo(() => filterBranchEntries(personnel, branchId), [personnel, branchId]);
  const branchTimeline = useMemo(() => filterBranchEntries(timeline, branchId), [timeline, branchId]);
  const branchGallery = useMemo(() => filterBranchEntries(gallery, branchId), [gallery, branchId]);
  const branchScience = useMemo(() => filterBranchEntries(science, branchId), [science, branchId]);
  const branchAwards = useMemo(() => filterBranchEntries(awards, branchId), [awards, branchId]);
  const branchDownloads = useMemo(() => filterBranchEntries(publicFiles, branchId), [publicFiles, branchId]);

  const homeNews = useMemo(
    () =>
      branchNews.filter(
        n =>
          entryShowOnHomepage(n) ||
          n.category === "重大科研进展" ||
          n.category === "科研进展",
      ),
    [branchNews],
  );

  const workNews = useMemo(
    () =>
      branchNews.filter(
        n =>
          n.category === "工作动态" ||
          (!entryShowOnHomepage(n) && n.category !== "重大科研进展" && n.category !== "科研进展"),
      ),
    [branchNews],
  );

  const councilMembers = useMemo(
    () => branchPersonnel.filter(p => (p.summary ?? "") === "理事会"),
    [branchPersonnel],
  );

  const overviewPage = useMemo(
    () => (sectionDef.pageCode ? pageForBranch(pages, branchId, sectionDef.pageCode) : undefined),
    [pages, branchId, sectionDef.pageCode],
  );

  const renderContent = () => {
    switch (sectionDef.kind) {
      case "news-home":
        return (
          <ArticleList
            items={homeNews}
            emptyHint="暂无重大科研进展，请在管理后台发布并勾选「首页展示」或分类为「重大科研进展」。"
          />
        );
      case "page":
        if (!overviewPage?.bodyContent) {
          return (
            <p className="text-sm text-slate-500 py-8 text-center">
              暂无分会概况，请在管理后台「分会栏目 → 分会概况」中维护。
            </p>
          );
        }
        return <CmsRichTextBody html={overviewPage.bodyContent} />;
      case "personnel":
        return <PersonnelGrid members={councilMembers} />;
      case "news":
        return <ArticleList items={workNews} emptyHint="暂无工作动态。" />;
      case "announcements":
        return <ArticleList items={branchAnnouncements} emptyHint="暂无通知公告。" />;
      case "timeline":
        return <TimelineSection nodes={branchTimeline} />;
      case "gallery":
        return <GalleryGrid photos={branchGallery} />;
      case "science":
        return <ScienceSection items={branchScience} />;
      case "awards":
        return <AwardsSection items={branchAwards} />;
      case "downloads":
        return <DownloadsSection items={branchDownloads} />;
      default:
        return null;
    }
  };

  return (
    <PartyLayout
      currentPageTitle={meta.name}
      breadcrumbs={[
        { title: "组织机构", href: "/structure" },
        { title: meta.name, href: branchSitePath(branchId) },
        { title: sectionDef.title },
      ]}
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <StructureSidebar activeBranchId={branchId} />

        <main className="flex-1 min-w-0 space-y-6">
          <header
            className="bg-white border border-fossil-stone border-t-2 rounded p-8 relative overflow-hidden"
            style={{ borderTopColor: meta.color }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: meta.color }}
              >
                <span className="material-symbols-outlined text-white text-3xl">{meta.icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">专业分会</p>
                <h1 className="text-2xl lg:text-3xl font-bold text-primary">{meta.name}</h1>
              </div>
            </div>
          </header>

          <nav className="flex flex-wrap gap-2">
            {BRANCH_SITE_SECTIONS.map(s => {
              const active = s.id === sectionDef.id;
              return (
                <Link
                  key={s.id}
                  href={branchSitePath(branchId, s.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded border transition-colors ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-fossil-stone text-slate-600 hover:border-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  {s.title}
                </Link>
              );
            })}
          </nav>

          <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-6 lg:p-8 rounded shadow-sm">
            <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b border-fossil-stone">
              {sectionDef.title}
            </h2>
            {renderContent()}
          </section>
        </main>
      </div>
    </PartyLayout>
  );
}
