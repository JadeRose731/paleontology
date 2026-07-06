import { useMemo, useState } from "react";
import PartyLayout from "../components/PartyLayout";
import { CmsPageHeader } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { parseExtra, formatDate, type ApiCmsEntry } from "@/lib/cms-api";

type CmsPublicFileCategory = "document" | "audio" | "video" | "photo";

interface CmsPublicFile {
  id: string;
  title: string;
  mediaCategory: CmsPublicFileCategory;
  subjectCategory: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  remark: string;
  downloadCount: number;
  uploadDate: string;
  deleted: boolean;
}

const MEDIA_CATEGORIES: CmsPublicFileCategory[] = ["document", "audio", "video", "photo"];

const MEDIA_CATEGORY_LABELS: Record<CmsPublicFileCategory, string> = {
  document: "文档类",
  audio: "音频类",
  video: "影视类",
  photo: "照片类",
};

const MEDIA_CATEGORY_FORMATS: Record<CmsPublicFileCategory, string> = {
  document: "Word · PDF · Excel · PPT · 压缩包",
  audio: "MP3 · WAV · M4A",
  video: "MP4 · AVI · MOV · WMV · MKV · FLV",
  photo: "JPEG · PNG · GIF · TIFF",
};

const MEDIA_CATEGORY_ICONS: Record<CmsPublicFileCategory, string> = {
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
    mediaCategory: (e.columnCode as CmsPublicFileCategory) ?? "document",
    subjectCategory: e.category ?? "其他资料",
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
  const [activeMediaCategory, setActiveMediaCategory] = useState<CmsPublicFileCategory>("document");
  const [activeSubjectCategory, setActiveSubjectCategory] = useState("全部资源");
  const [searchText, setSearchText] = useState("");

  const allFiles = useMemo(() => rawItems.map(mapPublicFile).filter(f => !f.deleted), [rawItems]);

  const mediaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allFiles.forEach(f => { c[f.mediaCategory] = (c[f.mediaCategory] ?? 0) + 1; });
    return c;
  }, [allFiles]);

  const subjectCategories = useMemo(() => {
    const docs = allFiles.filter(f => f.mediaCategory === "document");
    const cats = new Set(docs.map(f => f.subjectCategory).filter(Boolean));
    return ["全部资源", ...Array.from(cats)];
  }, [allFiles]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allFiles
      .filter(f => f.mediaCategory === activeMediaCategory)
      .filter(f => {
        if (activeMediaCategory !== "document" || activeSubjectCategory === "全部资源") return true;
        return f.subjectCategory === activeSubjectCategory;
      })
      .filter(f =>
        !q
        || f.title.toLowerCase().includes(q)
        || f.fileName.toLowerCase().includes(q)
        || f.subjectCategory.toLowerCase().includes(q)
      )
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [allFiles, activeMediaCategory, activeSubjectCategory, searchText]);

  const grouped = useMemo(() => {
    if (activeMediaCategory !== "document" || activeSubjectCategory !== "全部资源") return [];
    const map = new Map<string, CmsPublicFile[]>();
    for (const item of filtered) {
      const cat = item.subjectCategory || "其他资料";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered, activeMediaCategory, activeSubjectCategory]);

  const pageTitle = channel?.title ?? channel?.navName ?? "公开文件";

  const renderFileRow = (file: CmsPublicFile) => {
    const ext = file.fileName.split(".").pop()?.toUpperCase() ?? (file.fileUrl.split(".").pop()?.toUpperCase() ?? "FILE");
    return (
      <div
        key={file.id}
        className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group/item"
      >
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-lg text-[#002B49] shrink-0">
            <span className="material-symbols-outlined">{getFileIcon(file.fileName)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800">{file.title}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-xs text-slate-400">发布日期: {file.uploadDate}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100">{ext}</span>
              {file.fileSize && <span className="text-xs text-slate-400">{file.fileSize}</span>}
              {file.downloadCount > 0 && <span className="text-xs text-slate-400">已下载 {file.downloadCount} 次</span>}
            </div>
            {file.fileName && <p className="text-xs text-slate-500 font-mono truncate mt-1">{file.fileName}</p>}
            {file.remark && <p className="text-[10px] text-slate-400 mt-1">{file.remark}</p>}
          </div>
        </div>
        <a
          className="flex items-center gap-2 px-4 py-2 border border-[#002B49] text-[#002B49] hover:bg-[#002B49] hover:text-white transition-all text-xs font-bold rounded justify-center shrink-0"
          href={file.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={file.fileName || undefined}
        >
          <span className="material-symbols-outlined text-sm">download</span> 点击下载
        </a>
      </div>
    );
  };

  return (
    <PartyLayout currentPageTitle={pageTitle} fullWidth routePath="/public-downloads">
      <CmsPageHeader
        routePath="/public-downloads"
        fallbackTitle="公开文件"
        fallbackSubtitle="学会公开资料与文件下载，无需登录即可下载。"
        className="mb-6"
      />

      <div className="bg-slate-100 border border-[#E5E1DA] p-6 rounded-lg mb-6 flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MEDIA_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveMediaCategory(cat); setActiveSubjectCategory("全部资源"); setSearchText(""); }}
              className={`px-5 py-2 text-sm font-bold whitespace-nowrap rounded transition-colors flex items-center gap-2 ${
                activeMediaCategory === cat
                  ? "bg-[#002B49] text-white"
                  : "bg-white border border-[#E5E1DA] text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{MEDIA_CATEGORY_ICONS[cat]}</span>
              {MEDIA_CATEGORY_LABELS[cat]}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeMediaCategory === cat ? "bg-white/20" : "bg-[#E5E1DA]"
              }`}>
                {String(mediaCounts[cat] ?? 0).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>

        {activeMediaCategory === "document" && subjectCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 border-t border-[#E5E1DA] pt-4">
            {subjectCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveSubjectCategory(cat)}
                className={`px-5 py-1.5 text-xs font-bold whitespace-nowrap rounded transition-colors ${
                  activeSubjectCategory === cat
                    ? "bg-[#002B49] text-white"
                    : "bg-white border border-[#E5E1DA] text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="relative w-full md:max-w-md md:ml-auto">
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
          {loading && <p className="text-sm text-slate-500 py-8 text-center">加载文件列表…</p>}

          {!loading && filtered.length === 0 && (
            <div className="bg-white border border-[#E5E1DA] p-12 text-center text-slate-500 rounded-lg">
              <span className="material-symbols-outlined text-4xl mb-3 block opacity-40">
                {MEDIA_CATEGORY_ICONS[activeMediaCategory]}
              </span>
              <p className="text-sm">
                {searchText
                  ? `未找到包含「${searchText}」的文件`
                  : `暂无${MEDIA_CATEGORY_LABELS[activeMediaCategory]}文件`}
              </p>
            </div>
          )}

          {!loading && grouped.length > 0 && grouped.map(([category, files]) => (
            <div key={category} className="bg-white border border-[#E5E1DA] p-6 relative rounded shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002B49] rounded-l" />
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#E5E1DA]">
                <h2 className="text-xl font-bold text-slate-800">{category}</h2>
                <span className="text-slate-400 font-bold text-[10px] tracking-wider">{files.length} 个文件</span>
              </div>
              <div className="divide-y divide-[#E5E1DA]">
                {files.map(renderFileRow)}
              </div>
            </div>
          ))}

          {!loading && (grouped.length === 0 && filtered.length > 0) && (
            <div className="bg-white border border-[#E5E1DA] p-6 rounded shadow-sm">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#E5E1DA]">
                <h2 className="text-xl font-bold text-slate-800">
                  {activeMediaCategory === "document" && activeSubjectCategory !== "全部资源"
                    ? activeSubjectCategory
                    : MEDIA_CATEGORY_LABELS[activeMediaCategory]}
                </h2>
                <span className="text-slate-400 font-bold text-[10px] tracking-wider">{filtered.length} 个文件</span>
              </div>
              <div className="divide-y divide-[#E5E1DA]">
                {filtered.map(renderFileRow)}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-100 border-l-4 border-[#002B49] p-4 rounded text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-[#002B49] mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-green-600">lock_open</span>
              全部公开下载，无需注册
            </p>
            <p>{MEDIA_CATEGORY_FORMATS[activeMediaCategory]}</p>
          </div>

          <div className="bg-white border border-[#E5E1DA] p-6 rounded shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 tracking-wider mb-6">资源库概况</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 border border-[#E5E1DA] rounded">
                <p className="text-2xl font-bold text-[#002B49]">{allFiles.length}</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1">文件总量</p>
              </div>
              <div className="text-center p-4 bg-slate-50 border border-[#E5E1DA] rounded">
                <p className="text-2xl font-bold text-[#002B49]">{subjectCategories.length - 1}</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1">资料分类</p>
              </div>
            </div>
          </div>

          <div className="bg-[#002B49] p-6 text-white rounded shadow-lg">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">bolt</span> 快速通道
            </h3>
            <div className="space-y-4">
              {[
                { label: "学会章程", href: "/regulations" },
                { label: "会员服务", href: "/services" },
                { label: "规章条例", href: "/regulations" },
              ].map(link => (
                <a key={link.label} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded" href={link.href}>
                  <span className="text-sm">{link.label}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PartyLayout>
  );
}
