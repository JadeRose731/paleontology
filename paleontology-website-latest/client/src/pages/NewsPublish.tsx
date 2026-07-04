import { useState, useMemo, useEffect } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader, CmsRichTextBody } from "@/components/CmsPageHeader";
import { listPublicCmsEntries, parseExtra, formatDate, type ApiCmsEntry } from "@/lib/cms-api";
import { useCmsChannel } from "@/hooks/useCmsChannel";

type CmsBoardType = "meeting_notice" | "party_public" | "important_news";
type CmsContentStatus = "draft" | "published" | "archived";
type CmsOriginalFileCategory = "document" | "audio" | "video" | "photo";

interface CmsOriginalFile {
  name: string;
  url: string;
  category: CmsOriginalFileCategory;
}

interface CmsPublishArticle {
  id: string;
  boardType: CmsBoardType;
  title: string;
  summary: string;
  content: string;
  coverUrl: string;
  publishDate: string;
  status: CmsContentStatus;
  originalFile: CmsOriginalFile | null;
  createdBy: string;
}

const BOARD_TYPES: CmsBoardType[] = ["meeting_notice", "party_public", "important_news"];

const BOARD_TYPE_LABELS: Record<CmsBoardType, string> = {
  meeting_notice: "会议通知",
  party_public: "党务公开",
  important_news: "重要新闻",
};

const BOARD_TYPE_DESC: Record<CmsBoardType, string> = {
  meeting_notice: "学术会议相关通知公告，包括会议征文、报名信息等。",
  party_public: "党务活动、党建文化公开信息，践行党务公开要求。",
  important_news: "学会动态、重要公告等新闻发布，及时传递学会最新信息。",
};

const FILE_CATEGORY_LABELS: Record<CmsOriginalFileCategory, string> = {
  document: "文档类",
  audio: "音频类",
  video: "影视类",
  photo: "照片类",
};

const FILE_CATEGORY_ICONS: Record<CmsOriginalFileCategory, string> = {
  document: "description",
  audio: "music_note",
  video: "videocam",
  photo: "photo_library",
};

function mapPublishEntry(e: ApiCmsEntry): CmsPublishArticle {
  const ex = parseExtra<{ originalFile?: CmsOriginalFile; createdBy?: string }>(e.extraJson);
  return {
    id: String(e.entryId),
    boardType: (e.columnCode as CmsBoardType) ?? "meeting_notice",
    title: e.title,
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    coverUrl: e.coverUrl ?? "",
    publishDate: formatDate(e),
    status: (e.status?.toLowerCase() ?? "published") as CmsContentStatus,
    originalFile: ex?.originalFile ?? null,
    createdBy: ex?.createdBy ?? "admin",
  };
}

export default function NewsPublish() {
  const { channel } = useCmsChannel("/news-publish");
  const [activeBoard, setActiveBoard] = useState<CmsBoardType>("meeting_notice");
  const [selectedArticle, setSelectedArticle] = useState<CmsPublishArticle | null>(null);
  const [articles, setArticles] = useState<CmsPublishArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicCmsEntries({ moduleCode: "publish" })
      .then(rows => setArticles(rows.map(mapPublishEntry)))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const published = useMemo(
    () => articles.filter(a => a.status === "published"),
    [articles]
  );

  const boardCounts = useMemo(() => {
    const c: Record<CmsBoardType, number> = { meeting_notice: 0, party_public: 0, important_news: 0 };
    published.forEach(a => { c[a.boardType]++; });
    return c;
  }, [published]);

  const filteredArticles = useMemo(
    () => published
      .filter(a => a.boardType === activeBoard)
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate)),
    [published, activeBoard]
  );

  const pageTitle = channel?.title ?? "新闻发布";

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <CmsPageHeader
        routePath="/news-publish"
        fallbackTitle="新闻发布"
        fallbackSubtitle="会议通知 · 党务公开 · 重要新闻"
        className="mb-6"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-1/4 space-y-6">
          <div className="bg-[#FCFAF7] border border-[#E5E1DA] p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-[#002B49] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#002B49] inline-block" /> 发布栏目
            </h3>
            <ul className="space-y-1">
              {BOARD_TYPES.map(type => (
                <li key={type}>
                  <button
                    onClick={() => { setActiveBoard(type); setSelectedArticle(null); }}
                    className="w-full flex items-center justify-between py-3 px-2 rounded hover:bg-slate-100 transition-all text-left"
                  >
                    <span className={activeBoard === type ? "font-bold text-[#002B49]" : "text-slate-600"}>
                      {BOARD_TYPE_LABELS[type]}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      activeBoard === type ? "bg-[#002B49] text-white" : "bg-[#E5E1DA] text-slate-600"
                    }`}>
                      {boardCounts[type] < 10 ? `0${boardCounts[type]}` : boardCounts[type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#002B49] text-white p-6 rounded-lg relative overflow-hidden shadow-md">
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-2">公开文件下载</h4>
              <p className="text-xs text-white/70 mb-6 leading-relaxed">
                图片大赛、科普讲解等活动的公开资料，无需登录即可下载。
              </p>
              <a
                href="/public-downloads"
                className="inline-block bg-[#f5e0ba] text-[#241a03] px-6 py-2.5 rounded font-bold text-xs w-full text-center hover:bg-[#d8c4a0] transition-all shadow-lg"
              >
                前往下载区
              </a>
            </div>
            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl opacity-5">folder_open</span>
          </div>
        </aside>

        <section className="w-full lg:w-3/4">
          {selectedArticle ? (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#002B49] transition-colors mb-6"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                返回{BOARD_TYPE_LABELS[activeBoard]}列表
              </button>
              <article className="bg-white border border-[#E5E1DA] shadow-sm overflow-hidden">
                {selectedArticle.coverUrl && (
                  <img src={selectedArticle.coverUrl} alt={selectedArticle.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-8">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 mb-3 inline-block">
                    {BOARD_TYPE_LABELS[selectedArticle.boardType]}
                  </span>
                  <h1 className="text-xl font-bold text-[#002B49] mb-2 leading-snug">{selectedArticle.title}</h1>
                  <p className="text-xs text-slate-400 mb-6 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {selectedArticle.publishDate}
                    </span>
                    <span>发布人：{selectedArticle.createdBy}</span>
                  </p>
                  <CmsRichTextBody html={selectedArticle.content} />
                  {selectedArticle.originalFile && (
                    <div className="mt-10 pt-6 border-t border-[#E5E1DA]">
                      <h3 className="text-sm font-bold text-[#002B49] mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        原文件下载
                      </h3>
                      <a
                        href={selectedArticle.originalFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={selectedArticle.originalFile.name}
                        className="inline-flex items-center gap-3 border border-[#E5E1DA] rounded-lg px-4 py-3 hover:bg-[#002B49] hover:text-white transition-all group"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {FILE_CATEGORY_ICONS[selectedArticle.originalFile.category]}
                        </span>
                        <div>
                          <p className="text-sm font-bold leading-tight">{selectedArticle.originalFile.name}</p>
                          <p className="text-[10px] opacity-70 mt-0.5">
                            {FILE_CATEGORY_LABELS[selectedArticle.originalFile.category]} · 点击下载
                          </p>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </article>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 border-b border-[#E5E1DA] pb-4">
                <div>
                  <span className="font-bold text-[#002B49] border-b-2 border-[#002B49] pb-4 relative -bottom-[17px] inline-block">
                    {BOARD_TYPE_LABELS[activeBoard]}
                  </span>
                  <p className="text-xs text-slate-500 mt-4">{BOARD_TYPE_DESC[activeBoard]}</p>
                </div>
                <div className="text-slate-500 text-xs">
                  {loading ? "加载中…" : `共 ${filteredArticles.length} 条结果`}
                </div>
              </div>

              {!loading && filteredArticles.length === 0 && (
                <p className="text-sm text-slate-500 py-12 text-center bg-white border border-[#E5E1DA] rounded-lg">
                  暂无已发布的{BOARD_TYPE_LABELS[activeBoard]}内容
                </p>
              )}

              <div className="space-y-6">
                {filteredArticles.map(article => (
                  <div
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="bg-white border border-[#E5E1DA] p-6 hover:shadow-md transition-all group cursor-pointer flex gap-6"
                  >
                    {article.coverUrl ? (
                      <img src={article.coverUrl} alt="" className="w-24 h-20 object-cover rounded border border-[#E5E1DA] shrink-0 hidden sm:block" />
                    ) : (
                      <div className="hidden sm:flex w-24 h-20 bg-[#002B49] rounded items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-2xl">article</span>
                      </div>
                    )}
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {BOARD_TYPE_LABELS[article.boardType]}
                        </span>
                        {article.originalFile && (
                          <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
                            附原文件
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-[#002B49] group-hover:text-blue-800 mb-2 leading-relaxed">
                        {article.title}
                      </h2>
                      {article.summary && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">{article.summary}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {article.publishDate}
                        </span>
                        <span className="text-[#002B49] font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          阅读全文 <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </PartyLayout>
  );
}
