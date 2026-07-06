import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import PartyLayout from "../components/PartyLayout";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { type ApiCmsEntry, parseExtra } from "@/lib/cms-api";
import { BRANCH_IDS, BRANCH_MAP } from "@shared/constants";
import { branchSitePath } from "@shared/branch-site";
import {
  INTRO_PAGE_CODES,
  INTRO_SECTIONS,
  type IntroSectionDef,
} from "@shared/intro-sections";

function entryByCode(entries: ApiCmsEntry[], code: string): ApiCmsEntry | undefined {
  return entries.find(e => e.columnCode === code && e.status?.toLowerCase() === "published");
}

function societyEntries(items: ApiCmsEntry[]) {
  return items.filter(e => (e.scope ?? "society") === "society" && e.status?.toLowerCase() === "published");
}

function SectionHtml({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SectionShell({
  section,
  children,
}: {
  section: IntroSectionDef;
  children: React.ReactNode;
}) {
  return (
    <section
      id={section.id}
      className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-8 lg:p-10 relative shadow-sm scroll-mt-28"
    >
      <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 pb-4 border-b border-fossil-stone">
        {section.title}
      </h2>
      {children}
    </section>
  );
}

function PersonnelBlock({
  section,
  members,
}: {
  section: IntroSectionDef;
  members: ApiCmsEntry[];
}) {
  if (members.length === 0) {
    return (
      <SectionShell section={section}>
        <p className="text-sm text-slate-500 py-6 text-center">暂无人员信息，请在管理后台维护。</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell section={section}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(p => (
          <div
            key={p.entryId}
            className="border border-fossil-stone p-5 rounded shadow-sm hover:shadow-md transition-shadow"
          >
            {p.coverUrl && (
              <img
                src={p.coverUrl}
                alt={p.title}
                className="w-16 h-16 rounded-full object-cover mb-3 border border-fossil-stone"
              />
            )}
            <h4 className="text-lg font-bold text-primary">{p.title}</h4>
            {p.category && (
              <p className="text-xs font-semibold text-secondary mt-1" style={{ color: "#715a3e" }}>
                {p.category}
              </p>
            )}
            {p.bodyContent && (
              <div
                className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-4"
                dangerouslySetInnerHTML={{ __html: p.bodyContent }}
              />
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function TimelineBlock({ section, nodes }: { section: IntroSectionDef; nodes: ApiCmsEntry[] }) {
  if (nodes.length === 0) {
    return (
      <SectionShell section={section}>
        <p className="text-sm text-slate-500 py-6 text-center">暂无历史沿革节点，请在管理后台「学会沿革」中维护。</p>
      </SectionShell>
    );
  }
  const sorted = [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <SectionShell section={section}>
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
    </SectionShell>
  );
}

function GalleryBlock({ section, photos }: { section: IntroSectionDef; photos: ApiCmsEntry[] }) {
  const [filter, setFilter] = useState("全部");
  const categories = useMemo(() => {
    const cats = new Set(photos.map(p => p.category).filter(Boolean) as string[]);
    return ["全部", ...Array.from(cats)];
  }, [photos]);
  const filtered = filter === "全部" ? photos : photos.filter(p => p.category === filter);

  if (photos.length === 0) {
    return (
      <SectionShell section={section}>
        <p className="text-sm text-slate-500 py-6 text-center">暂无相册照片，请在管理后台「历史相册」中维护。</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell section={section}>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded border ${
                filter === cat ? "bg-primary text-white border-primary" : "border-fossil-stone text-slate-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(p => (
          <figure key={p.entryId} className="border border-fossil-stone rounded overflow-hidden group">
            {p.coverUrl && (
              <img
                src={p.coverUrl}
                alt={p.title}
                className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform"
              />
            )}
            <figcaption className="p-3 text-sm font-bold text-primary">{p.title}</figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export default function Intro() {
  const { items: pages } = useCmsEntries({ moduleCode: "pages" });
  const { items: personnel } = useCmsEntries({ moduleCode: "personnel" });
  const { items: awardEntries } = useCmsEntries({ moduleCode: "awards" });
  const { items: timelineEntries } = useCmsEntries({ moduleCode: "timeline" });
  const { items: galleryEntries } = useCmsEntries({ moduleCode: "gallery" });

  const extraPageSections = useMemo((): IntroSectionDef[] => {
    return societyEntries(pages)
      .filter(p => p.columnCode?.startsWith("intro_") && !INTRO_PAGE_CODES.includes(p.columnCode!))
      .map(p => ({
        id: p.columnCode!,
        title: p.title,
        kind: "page" as const,
        pageCode: p.columnCode!,
      }));
  }, [pages]);

  const allSections = useMemo(
    () => [...INTRO_SECTIONS, ...extraPageSections],
    [extraPageSections],
  );

  const [activeId, setActiveId] = useState(allSections[0]?.id ?? "overview");

  const societyPersonnel = useMemo(() => societyEntries(personnel), [personnel]);
  const societyTimeline = useMemo(() => societyEntries(timelineEntries), [timelineEntries]);
  const societyGallery = useMemo(
    () => [...societyEntries(galleryEntries)].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [galleryEntries],
  );

  const personnelByGroup = useMemo(() => {
    const map = new Map<string, ApiCmsEntry[]>();
    for (const p of societyPersonnel) {
      const g = p.summary ?? "其他";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return map;
  }, [societyPersonnel]);

  const awards = useMemo(
    () =>
      societyEntries(awardEntries)
        .map(e => {
          const ex = parseExtra<{ awardName?: string; winner?: string }>(e.extraJson);
          return {
            year: e.category ?? "",
            awardName: ex.awardName ?? e.title,
            winner: ex.winner ?? e.summary ?? "",
            description: e.bodyContent ?? "",
          };
        })
        .sort((a, b) => b.year.localeCompare(a.year)),
    [awardEntries],
  );

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      window.history.replaceState(null, "", `#${id}`);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && allSections.some(s => s.id === hash)) {
      requestAnimationFrame(() => scrollToSection(hash));
    }
  }, [allSections, scrollToSection]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    for (const s of allSections) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [allSections]);

  const renderSection = (section: IntroSectionDef) => {
    switch (section.kind) {
      case "page": {
        const entry = section.pageCode ? entryByCode(pages, section.pageCode) : undefined;
        if (!entry?.bodyContent) {
          return (
            <SectionShell key={section.id} section={section}>
              <p className="text-sm text-slate-500 py-6 text-center">
                暂无内容，请在管理后台「学会简介 → {section.title}」中维护。
              </p>
            </SectionShell>
          );
        }
        return (
          <SectionShell key={section.id} section={section}>
            <SectionHtml html={entry.bodyContent} />
          </SectionShell>
        );
      }

      case "personnel":
        return (
          <PersonnelBlock
            key={section.id}
            section={section}
            members={personnelByGroup.get(section.personnelGroup!) ?? []}
          />
        );

      case "branches":
        return (
          <SectionShell key={section.id} section={section}>
            <p className="text-sm text-slate-600 mb-6">
              中国古生物学会下设 11 个学术分会（专业委员会），各分会独立开展学术交流与科普工作。
            </p>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRANCH_IDS.map((id, idx) => (
                <li key={id}>
                  <Link
                    href={branchSitePath(id)}
                    className="flex items-center gap-3 p-4 border border-fossil-stone rounded hover:border-primary hover:bg-slate-50 transition-all group"
                  >
                    <span className="w-8 h-8 flex items-center justify-center bg-primary text-white text-xs font-bold rounded shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-bold text-primary text-sm group-hover:underline">
                      {BRANCH_MAP[id]}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-sm ml-auto group-hover:text-primary">
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-6 text-right">
              <Link
                href="/structure"
                className="text-xs font-bold text-primary inline-flex items-center gap-1 hover:underline"
              >
                查看组织机构
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </SectionShell>
        );

      case "timeline":
        return <TimelineBlock key={section.id} section={section} nodes={societyTimeline} />;

      case "gallery":
        return <GalleryBlock key={section.id} section={section} photos={societyGallery} />;

      case "awards":
        if (awards.length === 0) {
          return (
            <SectionShell key={section.id} section={section}>
              <p className="text-sm text-slate-500 py-6 text-center">暂无获奖记录，请在管理后台维护。</p>
            </SectionShell>
          );
        }
        return (
          <SectionShell key={section.id} section={section}>
            <div className="space-y-4">
              {awards.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-slate-50 border border-fossil-stone rounded hover:shadow-sm transition-shadow"
                >
                  <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded shrink-0">
                    {a.year}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-primary text-sm">{a.awardName}</h4>
                    <p className="text-xs text-slate-500 mt-1">获奖人：{a.winner}</p>
                    {a.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>
        );

      default:
        return null;
    }
  };

  return (
    <PartyLayout currentPageTitle="学会简介">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <nav className="lg:sticky lg:top-28 bg-white border border-fossil-stone p-4 rounded shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">目录导航</p>
            <ul className="space-y-1">
              {allSections.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full text-left text-sm py-2 px-3 rounded transition-colors ${
                      activeId === s.id
                        ? "bg-primary text-white font-bold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-10">
          {allSections.map(renderSection)}
        </div>
      </div>
    </PartyLayout>
  );
}
