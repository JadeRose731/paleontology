import { useState, useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { parseExtra, formatDate, type ApiCmsEntry } from "@/lib/cms-api";

type CmsPublicFileCategory = "document" | "audio" | "video" | "photo";

interface CmsPublicFile {
  id: string;
  title: string;
  category: CmsPublicFileCategory;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  remark: string;
  downloadCount: number;
  uploadDate: string;
  deleted: boolean;
}

const CATEGORIES: CmsPublicFileCategory[] = ["document", "audio", "video", "photo"];

const CATEGORY_LABELS: Record<CmsPublicFileCategory, string> = {
  document: "文档类",
  audio: "音频类",
  video: "影视类",
  photo: "照片类",
};

const CATEGORY_FORMATS: Record<CmsPublicFileCategory, string> = {
  document: "Word · PDF · Excel · PPT · 压缩包",
  audio: "MP3 · WAV · M4A",
  video: "MP4 · AVI · MOV · WMV · MKV · FLV",
  photo: "JPEG · PNG · GIF · TIFF",
};

const CATEGORY_ICONS: Record<CmsPublicFileCategory, string> = {
  document: "description",
  audio: "music_note",
  video: "videocam",
  photo: "photo_library",
};

const FILE_EXT_ICONS: Record<string, string> = {
  pdf: "picture_as_pdf",
  doc: "article", docx: "article",
  xls: "table_chart", xlsx: "table_chart",
  ppt: "slideshow", pptx: "slideshow",
  zip: "folder_zip", rar: "folder_zip",
  mp3: "music_note", wav: "music_note", m4a: "music_note",
  mp4: "videocam", avi: "videocam", mov: "videocam",
  jpeg: "image", jpg: "image", png: "image", gif: "gif_box", tiff: "image",
};

function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_EXT_ICONS[ext] ?? "attach_file";
}

function mapPublicFile(e: ApiCmsEntry): CmsPublicFile {
  const ex = parseExtra<{
    fileName?: string; fileSize?: string; remark?: string;
    downloadCount?: number; uploadDate?: string; deleted?: boolean;
  }>(e.extraJson);
  return {
    id: String(e.entryId),
    title: e.title,
    category: (e.columnCode as CmsPublicFileCategory) ?? "document",
    fileName: ex?.fileName ?? e.summary ?? "",
    fileUrl: e.fileUrl ?? "",
    fileSize: ex?.fileSize ?? "",
    remark: ex?.remark ?? "",
    downloadCount: ex?.downloadCount ?? 0,
    uploadDate: ex?.uploadDate ?? formatDate(e),
    deleted: ex?.deleted ?? false,
  };
}

export default function PublicDownloads() {
  const { channel } = useCmsChannel("/public-downloads");
  const { items: rawItems, loading } = useCmsEntries({ moduleCode: "public-files" });
  const [activeCategory, setActiveCategory] = useState<CmsPublicFileCategory>("document");
  const [searchText, setSearchText] = useState("");

  const allFiles = useMemo(() => rawItems.map(mapPublicFile).filter(f => !f.deleted), [rawItems]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    allFiles.forEach(f => { c[f.category] = (c[f.category] ?? 0) + 1; });
    return c;
  }, [allFiles]);

  const filtered = useMemo(() =>
    allFiles
      .filter(f => f.category === activeCategory)
      .filter(f =>
        !searchText
        || f.title.toLowerCase().includes(searchText.toLowerCase())
        || f.fileName.toLowerCase().includes(searchText.toLowerCase())
      )
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)),
    [allFiles, activeCategory, searchText]
  );

  const pageTitle = channel?.title ?? "公开文件下载";

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <CmsPageHeader
        routePath="/public-downloads"
        fallbackTitle="公开文件下载区"
        fallbackSubtitle="学会举办图片大赛、短视频大赛、科普讲解大赛及党组织学习教育宣传活动相关资料，无需登录即可下载。"
        className="mb-6"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-1/4 space-y-6">
          <div className="bg-[#FCFAF7] border border-[#E5E1DA] p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-[#002B49] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#002B49] inline-block" /> 文件分类
            </h3>
            <ul className="space-y-1">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => { setActiveCategory(cat); setSearchText(""); }}
                    className="w-full flex items-center justify-between py-3 px-2 rounded hover:bg-slate-100 transition-all text-left"
                  >
                    <span className={`flex items-center gap-2 ${activeCategory === cat ? "font-bold text-[#002B49]" : "text-slate-600"}`}>
                      <span className="material-symbols-outlined text-[16px]">{CATEGORY_ICONS[cat]}</span>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      activeCategory === cat ? "bg-[#002B49] text-white" : "bg-[#E5E1DA] text-slate-600"
                    }`}>
                      {String(counts[cat] ?? 0).padStart(2, "0")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FCFAF7] border border-[#E5E1DA] p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-bold text-[#002B49] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">search</span>
              搜索文件
            </h3>
            <input
              className="w-full px-3 py-2 border border-[#E5E1DA] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#002B49]"
              placeholder="搜索文件名称…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          <div className="bg-slate-100 border-l-4 border-[#002B49] p-4 rounded text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-[#002B49] mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-green-600">lock_open</span>
              全部公开下载，无需注册
            </p>
            <p>{CATEGORY_FORMATS[activeCategory]}</p>
          </div>
        </aside>

        <section className="w-full lg:w-3/4">
          <div className="flex items-center justify-between mb-8 border-b border-[#E5E1DA] pb-4">
            <span className="font-bold text-[#002B49] border-b-2 border-[#002B49] pb-4 relative -bottom-[17px]">
              {CATEGORY_LABELS[activeCategory]}
            </span>
            <div className="text-slate-500 text-xs">
              {loading ? "加载中…" : `共 ${filtered.length} 个文件`}
            </div>
          </div>

          {loading && (
            <p className="text-sm text-slate-500 py-12 text-center">加载文件列表…</p>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-white border border-[#E5E1DA] p-12 text-center text-slate-500 rounded-lg">
              <span className="material-symbols-outlined text-4xl mb-3 block opacity-40">{CATEGORY_ICONS[activeCategory]}</span>
              <p className="text-sm">
                {searchText
                  ? `未找到包含「${searchText}」的${CATEGORY_LABELS[activeCategory]}文件`
                  : `暂无${CATEGORY_LABELS[activeCategory]}文件`}
              </p>
              {searchText && (
                <button onClick={() => setSearchText("")} className="mt-3 text-xs text-[#002B49] underline">
                  清除搜索
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {filtered.map(file => {
              const ext = file.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
              return (
                <div
                  key={file.id}
                  className="bg-white border border-[#E5E1DA] p-6 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 group"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl text-[#002B49]">
                      {getFileIcon(file.fileName)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{ext}</span>
                      <h3 className="font-bold text-[#002B49] text-sm">{file.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{file.fileName}</p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 mt-1">
                      {file.fileSize && <span>{file.fileSize}</span>}
                      <span>上传于 {file.uploadDate}</span>
                      <span>已下载 {file.downloadCount} 次</span>
                    </div>
                    {file.remark && <p className="text-[10px] text-slate-400 mt-1">{file.remark}</p>}
                  </div>
                  <a
                    href={file.fileUrl}
                    download={file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-2 bg-[#002B49] hover:bg-[#001f35] text-white px-5 py-2.5 rounded text-xs font-bold transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    下载
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PartyLayout>
  );
}
