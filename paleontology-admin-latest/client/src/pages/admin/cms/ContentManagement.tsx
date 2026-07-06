import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAdmin } from "@/contexts/AdminContext";
import { ALL_SOCIETY_UNITS } from "@shared/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Info } from "lucide-react";
import {
  type CmsArticle, type CmsBanner, type CmsDatabase, type CmsPage, type CmsPerson,
  type CmsGalleryPhoto, type CmsAward, type CmsScienceItem, type CmsInternationalItem,
  type CmsTechRewardItem, type CmsPartyArticle, type CmsPartyTopic, type CmsDownloadFile,
  type CmsTimelineNode, type CmsMediaItem, type CmsPublishArticle, type CmsPublicFile,
  CMS_STATUS_LABELS, CMS_BOARD_TYPE_LABELS, CMS_FILE_CATEGORY_LABELS,
  CMS_PUBLIC_FILE_CATEGORY_LABELS, CMS_PUBLIC_FILE_FORMAT_HINTS, CMS_PUBLIC_FILE_EXT_MAP,
  type CmsPublicFileCategory,
  GALLERY_CATEGORIES, SCIENCE_CATEGORIES, DOWNLOAD_CATEGORIES_SOCIETY, DOWNLOAD_CATEGORIES_BRANCH, DOWNLOAD_CATEGORIES_PARTY,
  generateCmsId, fetchCmsDatabase, saveCmsDatabase, DEFAULT_CMS,
} from "./cms-data";
import {
  INTRO_PERSONNEL_GROUPS,
  INTRO_SECTIONS,
  INTRO_PAGE_SECTIONS,
  generateIntroPageCode,
  isIntroPageCode,
} from "@shared/intro-sections";
import {
  BRANCH_SITE_SECTIONS,
  STRUCTURE_PAGE_CODES,
  STRUCTURE_PAGE_LABELS,
  generateStructurePageCode,
  isStructurePageCode,
  BRANCH_SECTION_ADMIN_HINT,
} from "@shared/branch-site";
import { INTL_TYPE_LABELS } from "@shared/service-content-sections";
import { BRANCH_IDS, BRANCH_MAP } from "@shared/constants";
import { CMS_SECTION_META, CMS_SECTIONS, PARTY_NAV_ITEMS } from "./cms-nav";
import {
  createCmsChannel, updateCmsChannel, deleteCmsChannel, listCmsChannelTree,
  uploadCmsMedia,
} from "@/lib/cms-api";
import {
  extractServiceCategories,
  findChannelNode,
  SERVICE_CONTENT_MODULE_OPTIONS,
  defaultWebsiteTabKey,
  categoryAllowedForBranch,
  type ServiceCategory,
  type ServiceContentModule,
} from "@/lib/services-categories";
import {
  scopeLabel, statusBadgeClass, RichTextEditor, DeleteButton, ArticleSection,
  SortButtons, MemberOnlyBadge, ImageUploadField, AttachmentEditor,
} from "./cms-ui";

type CmsSection = (typeof CMS_SECTIONS)[number];

function formatPublicFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectPublicFileMediaCategory(fileName: string): CmsPublicFileCategory {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  for (const cat of ["document", "audio", "video", "photo"] as const) {
    if (CMS_PUBLIC_FILE_EXT_MAP[cat].includes(ext)) return cat;
  }
  return "document";
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

export default function ContentManagement() {
  const [, params] = useRoute("/admin/cms/:section");
  const [, setLocation] = useLocation();
  const { adminRole, adminBranchId, canAccess } = useAdmin();
  const isBranchScope = adminRole === "branch_admin" && !!adminBranchId;

  const rawSection = params?.section || "";

  useEffect(() => {
    if (rawSection === "downloads") {
      setLocation("/admin/cms/public-files");
      return;
    }
    if (rawSection === "international" || rawSection === "science" || rawSection === "tech-rewards") {
      setLocation("/admin/cms/services");
    }
  }, [rawSection, setLocation]);

  const section = ((): CmsSection => {
    if (CMS_SECTIONS.includes(rawSection) && canAccess(`/admin/cms/${rawSection}`)) {
      return rawSection as CmsSection;
    }
    return adminRole === "branch_admin" ? "branch" : "banners";
  })();

  const [db, setDb] = useState<CmsDatabase>(() => structuredClone(DEFAULT_CMS));
  const [cmsLoading, setCmsLoading] = useState(true);
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    let cancelled = false;
    fetchCmsDatabase()
      .then(data => { if (!cancelled) setDb(data); })
      .catch(() => toast.error("CMS 数据加载失败，请确认后端已启动 (8089)"))
      .finally(() => { if (!cancelled) setCmsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const [previewArticle, setPreviewArticle] = useState<CmsArticle | null>(null);
  const [editBanner, setEditBanner] = useState<CmsBanner | null>(null);
  const [editArticle, setEditArticle] = useState<{ kind: "news" | "announcements"; item: CmsArticle | null } | null>(null);
  const [editPage, setEditPage] = useState<CmsPage | null>(null);
  const [editPageContext, setEditPageContext] = useState<"intro" | "structure" | null>(null);
  const [editPerson, setEditPerson] = useState<CmsPerson | null>(null);
  const [editGallery, setEditGallery] = useState<CmsGalleryPhoto | null>(null);
  const [editAward, setEditAward] = useState<CmsAward | null>(null);
  const [editScience, setEditScience] = useState<CmsScienceItem | null>(null);
  const [editIntl, setEditIntl] = useState<CmsInternationalItem | null>(null);
  const [editTech, setEditTech] = useState<CmsTechRewardItem | null>(null);
  const [editParty, setEditParty] = useState<CmsPartyArticle | null>(null);
  const [editTopic, setEditTopic] = useState<CmsPartyTopic | null>(null);
  const [editDownload, setEditDownload] = useState<CmsDownloadFile | null>(null);
  const [editTimeline, setEditTimeline] = useState<CmsTimelineNode | null>(null);
  const [partyColumnFilter, setPartyColumnFilter] = useState<string>("all");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaCategory, setMediaCategory] = useState("all");
  const [editPublish, setEditPublish] = useState<CmsPublishArticle | null>(null);
  const [publishBoardFilter, setPublishBoardFilter] = useState<string>("all");
  const [editPublicFile, setEditPublicFile] = useState<CmsPublicFile | null>(null);
  const [publicFileUploading, setPublicFileUploading] = useState(false);
  const [publicFileCategoryFilter, setPublicFileCategoryFilter] = useState<string>("all");
  const [branchCmsFilter, setBranchCmsFilter] = useState<string>(
    () => (adminRole === "branch_admin" && adminBranchId ? adminBranchId : BRANCH_IDS[0] ?? ""),
  );
  const [showFormatHints, setShowFormatHints] = useState<string | null>(null);
  const [servicesTab, setServicesTab] = useState<string>("");
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [servicesParentId, setServicesParentId] = useState<number | undefined>();
  const [editServiceCat, setEditServiceCat] = useState<ServiceCategory | null>(null);

  const servicesSections = new Set(["services", "science", "international", "tech-rewards"]);
  const isServicesView = servicesSections.has(section);
  const canEditIntlAndTech = adminRole === "super_admin";

  const visibleServiceCategories = useMemo(
    () => serviceCategories.filter(c => canEditIntlAndTech || categoryAllowedForBranch(c)),
    [serviceCategories, canEditIntlAndTech],
  );

  const loadServiceCategories = useCallback(async () => {
    try {
      const tree = await listCmsChannelTree();
      const cats = extractServiceCategories(tree);
      setServicesParentId(findChannelNode(tree, "services")?.channel.channelId);
      setServiceCategories(cats);
      const visible = cats.filter(c => canEditIntlAndTech || categoryAllowedForBranch(c));
      setServicesTab(prev => (prev && visible.some(c => c.channelCode === prev) ? prev : visible[0]?.channelCode ?? ""));
    } catch {
      toast.error("子栏目加载失败");
    }
  }, [canEditIntlAndTech]);

  useEffect(() => {
    if (isServicesView) loadServiceCategories();
  }, [isServicesView, loadServiceCategories]);

  useEffect(() => {
    if (!serviceCategories.length) return;
    const legacyModule: Partial<Record<string, ServiceContentModule>> = {
      science: "science",
      international: "international",
      "tech-rewards": "tech-rewards",
    };
    const mod = legacyModule[rawSection];
    if (mod) {
      const cat = serviceCategories.find(c => c.contentModule === mod);
      if (cat) setServicesTab(cat.channelCode);
    }
  }, [rawSection, serviceCategories]);

  const saveServiceCategory = async () => {
    if (!editServiceCat || !servicesParentId) return;
    if (!editServiceCat.navName.trim() || !editServiceCat.channelCode.trim()) {
      toast.error("请填写栏目名称与编码");
      return;
    }
    const payload = {
      channelId: editServiceCat.channelId,
      channelCode: editServiceCat.channelCode.trim(),
      parentId: servicesParentId,
      navName: editServiceCat.navName.trim(),
      title: editServiceCat.navName.trim(),
      subtitle: editServiceCat.subtitle ?? "",
      contentModule: editServiceCat.contentModule,
      layoutParams: JSON.stringify({
        servicesTab: true,
        websiteTabKey: editServiceCat.websiteTabKey || defaultWebsiteTabKey(editServiceCat.contentModule),
      }),
      visible: "1",
      showInAdmin: "0",
      adminSection: null,
      pageType: "CMS",
      shellType: "standard",
      status: editServiceCat.status ?? "PUBLISHED",
      sortOrder: editServiceCat.sortOrder ?? serviceCategories.length + 1,
      adminRoles: '["super_admin"]',
      locked: "0",
    };
    try {
      if (editServiceCat.channelId) {
        await updateCmsChannel(payload);
        toast.success("子栏目已更新");
      } else {
        await createCmsChannel(payload);
        toast.success("子栏目已创建");
      }
      setEditServiceCat(null);
      await loadServiceCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const removeServiceCategory = async (cat: ServiceCategory) => {
    if (!cat.channelId) return;
    if (!window.confirm(`确定删除子栏目「${cat.navName}」？该栏目下的 CMS 内容条目不会自动删除。`)) return;
    try {
      await deleteCmsChannel(cat.channelId);
      toast.success("已删除子栏目");
      await loadServiceCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const persist = useCallback((next: CmsDatabase) => {
    const prev = dbRef.current;
    setDb(next);
    saveCmsDatabase(next, prev)
      .then(refreshed => setDb(refreshed))
      .catch(() => toast.error("保存失败，请检查 CMS 后端连接"));
  }, []);

  const matchesScope = useCallback(
    (branchId: string | null) => !isBranchScope || branchId === adminBranchId,
    [isBranchScope, adminBranchId]
  );

  const scoped = {
    banners: useMemo(() => db.banners.filter(b => matchesScope(b.branchId)).sort((a, b) => a.sort - b.sort), [db.banners, matchesScope]),
    news: useMemo(() => db.news.filter(a => matchesScope(a.branchId)), [db.news, matchesScope]),
    announcements: useMemo(() => db.announcements.filter(a => matchesScope(a.branchId)), [db.announcements, matchesScope]),
    pages: useMemo(() => db.pages.filter(p => matchesScope(p.branchId)), [db.pages, matchesScope]),
    personnel: useMemo(() => db.personnel.filter(p => matchesScope(p.branchId)), [db.personnel, matchesScope]),
    gallery: useMemo(() => db.galleryPhotos.filter(g => matchesScope(g.branchId)).sort((a, b) => a.sort - b.sort), [db.galleryPhotos, matchesScope]),
    awards: useMemo(() => db.awards.filter(a => matchesScope(a.branchId)), [db.awards, matchesScope]),
    science: useMemo(() => db.scienceItems.filter(s => matchesScope(s.branchId)), [db.scienceItems, matchesScope]),
    downloads: useMemo(() => db.downloadFiles.filter(d => matchesScope(d.branchId)), [db.downloadFiles, matchesScope]),
    timeline: useMemo(() => db.timelineNodes.filter(t => matchesScope(t.branchId)).sort((a, b) => a.sort - b.sort), [db.timelineNodes, matchesScope]),
  };

  const partyDownloads = useMemo(
    () => db.downloadFiles.filter(d => d.scope === "party"),
    [db.downloadFiles]
  );

  const scopedPublicFiles = useMemo(
    () => db.publicFiles.filter(f => matchesScope(f.branchId ?? null)),
    [db.publicFiles, matchesScope]
  );

  const partyArticles = useMemo(() => {
    let list = db.partyArticles;
    if (partyColumnFilter !== "all") list = list.filter(a => a.column === partyColumnFilter);
    return list;
  }, [db.partyArticles, partyColumnFilter]);

  const regulationPages = useMemo(
    () => scoped.pages.filter(p => !p.branchId && !p.code.startsWith("intro_") && (p.code.includes("regulation") || p.code.includes("charter"))),
    [scoped.pages]
  );

  const branchPages = useMemo(
    () => scoped.pages.filter(p => p.branchId),
    [scoped.pages]
  );

  const activeBranchId = isBranchScope ? adminBranchId! : branchCmsFilter;

  const branchScoped = useMemo(() => ({
    news: db.news.filter(a => a.branchId === activeBranchId),
    announcements: db.announcements.filter(a => a.branchId === activeBranchId),
    personnel: db.personnel.filter(p => p.branchId === activeBranchId),
    timeline: db.timelineNodes.filter(t => t.branchId === activeBranchId),
    gallery: db.galleryPhotos.filter(g => g.branchId === activeBranchId),
    science: db.scienceItems.filter(s => s.branchId === activeBranchId),
    awards: db.awards.filter(a => a.branchId === activeBranchId),
    publicFiles: db.publicFiles.filter(f => f.branchId === activeBranchId && !f.deleted),
    overviewPage: db.pages.find(p => p.code === "branch_overview" && p.branchId === activeBranchId),
  }), [db, activeBranchId]);

  const introPagesList = useMemo(() => {
    const societyIntroPages = scoped.pages.filter(p => !p.branchId && isIntroPageCode(p.code));
    const knownCodes = new Set(INTRO_PAGE_SECTIONS.map(s => s.pageCode));
    const rows: { code: string; title: string; page?: CmsPage; preset: boolean }[] = [];

    for (const s of INTRO_PAGE_SECTIONS) {
      const page = societyIntroPages.find(p => p.code === s.pageCode);
      rows.push({ code: s.pageCode, title: page?.title ?? s.title, page, preset: true });
    }
    for (const p of societyIntroPages) {
      if (!knownCodes.has(p.code)) {
        rows.push({ code: p.code, title: p.title, page: p, preset: false });
      }
    }
    return rows;
  }, [scoped.pages]);

  const introPageCodes = useMemo(() => scoped.pages.filter(p => !p.branchId).map(p => p.code), [scoped.pages]);

  const structurePagesList = useMemo(() => {
    return STRUCTURE_PAGE_CODES.map(code => {
      const page = scoped.pages.find(p => p.code === code && !p.branchId);
      return {
        code,
        title: page?.title ?? STRUCTURE_PAGE_LABELS[code] ?? code,
        page,
        preset: true as const,
      };
    });
  }, [scoped.pages]);

  const filteredMedia = useMemo(() => {
    return db.media.filter(m => {
      if (mediaCategory !== "all" && m.category !== mediaCategory) return false;
      if (mediaSearch && !m.name.toLowerCase().includes(mediaSearch.toLowerCase())) return false;
      return true;
    });
  }, [db.media, mediaSearch, mediaCategory]);

  const pageMeta = CMS_SECTION_META[isServicesView ? "services" : section] ?? CMS_SECTION_META.banners;

  const handlePublicFileUpload = useCallback(async (file: File) => {
    setPublicFileUploading(true);
    try {
      const mediaCategory = detectPublicFileMediaCategory(file.name);
      const entry = await uploadCmsMedia(file, file.name, mediaCategory);
      const url = entry.mediaUrl ?? entry.fileUrl ?? "";
      if (!url) throw new Error("上传成功但未返回文件地址");
      setEditPublicFile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          category: mediaCategory,
          fileName: file.name,
          fileSize: formatPublicFileSize(file.size),
          fileUrl: url,
          title: prev.title || titleFromFileName(file.name),
        };
      });
      toast.success("文件已上传，已自动填写原始文件名、大小与地址");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "文件上传失败");
    } finally {
      setPublicFileUploading(false);
    }
  }, []);

  const articleOps = (kind: "news" | "announcements") => ({
    onTogglePin: (id: string) => {
      persist({ ...db, [kind]: db[kind].map(a => (a.id === id ? { ...a, pinned: !a.pinned } : a)) });
      toast.success("置顶状态已更新");
    },
    onPublish: (id: string) => {
      persist({ ...db, [kind]: db[kind].map(a => (a.id === id ? { ...a, status: "published" as const } : a)) });
      toast.success("已发布");
    },
    onArchive: (id: string) => {
      persist({ ...db, [kind]: db[kind].map(a => (a.id === id ? { ...a, status: "archived" as const } : a)) });
      toast.success("已下架");
    },
    onDelete: (id: string) => {
      persist({ ...db, [kind]: db[kind].filter(a => a.id !== id) });
      toast.success("已删除");
    },
  });

  const moveBanner = (id: string, dir: -1 | 1) => {
    const list = [...scoped.banners];
    const idx = list.findIndex(b => b.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const all = [...db.banners];
    const a = all.findIndex(b => b.id === list[idx].id);
    const b = all.findIndex(x => x.id === list[swap].id);
    const sortA = all[a].sort;
    all[a] = { ...all[a], sort: all[b].sort };
    all[b] = { ...all[b], sort: sortA };
    persist({ ...db, banners: all });
  };

  if (cmsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        正在从 CMS 后端加载内容…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-strata-blue-deep">{pageMeta.title}</h1>
        <p className="text-muted-foreground mt-1">{pageMeta.subtitle}</p>
      </div>

      {isBranchScope && (
        <Card className="border-accent-gold/40 bg-accent-gold/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-accent-gold shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-strata-blue-deep">{ALL_SOCIETY_UNITS[adminBranchId!]}</p>
              <p className="text-muted-foreground mt-1">当前仅显示并编辑本分会的相关内容。</p>
            </div>
          </CardContent>
        </Card>
      )}

      {section === "banners" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">轮播图列表</CardTitle>
                <CardDescription>支持排序、上传图片与设置跳转链接</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditBanner({ id: generateCmsId("banner"), title: "", imageUrl: "", linkUrl: "/", sort: scoped.banners.length + 1, branchId: isBranchScope ? adminBranchId! : null, enabled: true })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 新增
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排序</TableHead><TableHead>标题</TableHead><TableHead>归属</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoped.banners.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell><div className="flex items-center gap-1">{b.sort}<SortButtons onUp={() => moveBanner(b.id, -1)} onDown={() => moveBanner(b.id, 1)} /></div></TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{b.title}</TableCell>
                      <TableCell>{scopeLabel(b.branchId)}</TableCell>
                      <TableCell><Badge variant="outline" className={b.enabled ? "text-green-700 border-green-300 bg-green-50" : ""}>{b.enabled ? "启用" : "停用"}</Badge></TableCell>
                      <TableCell className="text-right flex justify-end gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => setEditBanner({ ...b })}><Edit className="h-3.5 w-3.5" /></Button>
                        <DeleteButton title={b.title} onConfirm={() => { persist({ ...db, banners: db.banners.filter(x => x.id !== b.id) }); toast.success("已删除"); }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

      {section === "news" && (
          <ArticleSection title="新闻列表" description="学会要闻与工作动态" items={scoped.news}
            onAdd={() => setEditArticle({ kind: "news", item: { id: generateCmsId("news"), title: "", category: "学会要闻", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0], branchId: isBranchScope ? adminBranchId! : null, scope: isBranchScope ? "branch" : "society", attachments: [], showOnHomepage: false } })}
            onEdit={i => setEditArticle({ kind: "news", item: { ...i } })} onPreview={setPreviewArticle} {...articleOps("news")} />
      )}

      {section === "announcements" && (
          <ArticleSection title="公告列表" description="发布与维护会员公告，可设置首页展示与附件下载权限" items={scoped.announcements}
            onAdd={() => setEditArticle({ kind: "announcements", item: { id: generateCmsId("ann"), title: "", category: "组织工作", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0], branchId: isBranchScope ? adminBranchId! : null, scope: isBranchScope ? "branch" : "society", attachments: [], showOnHomepage: isBranchScope } })}
            onEdit={i => setEditArticle({ kind: "announcements", item: { ...i } })} onPreview={setPreviewArticle} {...articleOps("announcements")} />
      )}

      {section === "party" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">栏目内容</CardTitle>
              <CardDescription>与前台党建文化各子栏目对应</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <Label className="text-sm">栏目筛选</Label>
              <Select value={partyColumnFilter} onValueChange={setPartyColumnFilter}>
                <SelectTrigger className="w-[200px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部栏目</SelectItem>
                  {PARTY_NAV_ITEMS.filter(c => c.code !== "party_topics" && c.code !== "party_downloads").map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="ml-auto" onClick={() => setEditParty({ id: generateCmsId("party"), column: partyColumnFilter === "all" ? "party_announcement" : partyColumnFilter, title: "", category: "", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0] })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 新建文章
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>栏目</TableHead><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partyArticles.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{PARTY_NAV_ITEMS.find(c => c.code === a.column)?.title || a.column}</TableCell>
                      <TableCell className="font-medium max-w-[220px] truncate">{a.title}</TableCell>
                      <TableCell>{a.category}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(a.status)}>{CMS_STATUS_LABELS[a.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditParty({ ...a })}><Edit className="h-3.5 w-3.5" /></Button>
                        <DeleteButton title={a.title} onConfirm={() => { persist({ ...db, partyArticles: db.partyArticles.filter(x => x.id !== a.id) }); toast.success("已删除"); }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div><CardTitle className="text-base">党建专题</CardTitle><CardDescription>创建专题并归集相关文章</CardDescription></div>
              <Button size="sm" onClick={() => setEditTopic({ id: generateCmsId("topic"), title: "", description: "", coverUrl: "", articleIds: [], status: "draft" })}><Plus className="h-3.5 w-3.5 mr-1" /> 新建专题</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>专题名称</TableHead><TableHead>文章数</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {db.partyTopics.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{t.articleIds.length}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(t.status)}>{CMS_STATUS_LABELS[t.status]}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditTopic({ ...t })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div>
                <CardTitle className="text-base">下载中心文件</CardTitle>
                <CardDescription>对应前台党建文化「下载中心」栏目，仅党建资料</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditDownload({ id: generateCmsId("dl"), title: "", category: DOWNLOAD_CATEGORIES_PARTY[0], fileName: "", fileUrl: "", memberOnly: false, branchId: null, scope: "party" })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 上传文件
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partyDownloads.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>{d.category}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditDownload({ ...d })}><Edit className="h-3.5 w-3.5" /></Button>
                        <DeleteButton title={d.title} onConfirm={() => { persist({ ...db, downloadFiles: db.downloadFiles.filter(x => x.id !== d.id) }); toast.success("已删除"); }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {(section === "pages" || section === "awards") && (
        <Tabs defaultValue={section === "awards" ? "awards" : "pages"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pages">富文本页面</TabsTrigger>
            <TabsTrigger value="personnel-intro">领导机构</TabsTrigger>
            <TabsTrigger value="awards">获奖成果</TabsTrigger>
          </TabsList>
          <TabsContent value="pages">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">学会简介页面</CardTitle>
                  <CardDescription>
                    与前台学会简介左侧目录一一对应，所有子栏目在同一页面展示。历史沿革、历史相册请在「学会沿革」「历史相册」栏目维护内容。
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditPageContext("intro");
                    setEditPage({
                    id: generateCmsId("page"),
                    code: "",
                    title: "",
                    content: "<p></p>",
                    status: "draft",
                    branchId: null,
                    updatedAt: new Date().toISOString().split("T")[0],
                    pageType: "richtext",
                  }); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> 新增子栏目
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>子栏目</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {introPagesList.map(row => (
                      <TableRow key={row.code}>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell>
                          {row.page ? (
                            <Badge variant="outline" className={statusBadgeClass(row.page.status)}>{CMS_STATUS_LABELS[row.page.status]}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">未创建</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditPageContext("intro");
                              setEditPage(row.page ?? {
                                id: generateCmsId("page"),
                                code: row.code,
                                title: row.title,
                                content: "<p></p>",
                                status: "draft",
                                branchId: null,
                                updatedAt: new Date().toISOString().split("T")[0],
                                pageType: "richtext",
                              });
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {row.page && !row.preset && (
                            <DeleteButton title={row.page.title} onConfirm={() => { persist({ ...db, pages: db.pages.filter(x => x.id !== row.page!.id) }); toast.success("已删除"); }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="mt-4 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">其他子栏目说明</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                {INTRO_SECTIONS.filter(s => s.kind === "personnel").map(s => (
                  <p key={s.id}>· <strong>{s.title}</strong>：在「领导机构」Tab 维护，前台同页展示</p>
                ))}
                {INTRO_SECTIONS.filter(s => s.kind === "timeline").map(s => (
                  <p key={s.id}>· <strong>{s.title}</strong>：在「学会沿革」栏目维护，前台同页展示</p>
                ))}
                {INTRO_SECTIONS.filter(s => s.kind === "gallery").map(s => (
                  <p key={s.id}>· <strong>{s.title}</strong>：在「历史相册」栏目维护，前台同页展示</p>
                ))}
                {INTRO_SECTIONS.filter(s => s.kind === "branches").map(s => (
                  <p key={s.id}>· <strong>{s.title}</strong>：前台同页展示分会列表，链接至组织机构分会子站</p>
                ))}
                {INTRO_SECTIONS.filter(s => s.kind === "awards").map(s => (
                  <p key={s.id}>· <strong>{s.title}</strong>：在「获奖成果」Tab 维护，前台同页展示</p>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="personnel-intro">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <div>
                  <CardTitle className="text-base">领导机构人员</CardTitle>
                  <CardDescription>现任领导、历任领导、理事会、监事会、秘书处 — 与前台学会简介及组织机构同步</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEditPerson({ id: generateCmsId("person"), name: "", title: "", group: INTRO_PERSONNEL_GROUPS[0], bio: "", photoUrl: "", sort: scoped.personnel.length + 1, branchId: null })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> 新增
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>姓名</TableHead><TableHead>职务</TableHead><TableHead>分组</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scoped.personnel
                      .filter(p => INTRO_PERSONNEL_GROUPS.includes(p.group))
                      .map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.title}</TableCell>
                        <TableCell>{p.group}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditPerson({ ...p })}><Edit className="h-3.5 w-3.5" /></Button>
                          <DeleteButton title={p.name} onConfirm={() => { persist({ ...db, personnel: db.personnel.filter(x => x.id !== p.id) }); toast.success("已删除"); }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="awards">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <div><CardTitle className="text-base">获奖记录</CardTitle><CardDescription>管理学会各类获奖成果</CardDescription></div>
                <Button size="sm" onClick={() => setEditAward({ id: generateCmsId("award"), year: new Date().getFullYear().toString(), awardName: "", winner: "", description: "", branchId: isBranchScope ? adminBranchId! : null })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>年份</TableHead><TableHead>奖项</TableHead><TableHead>获奖人</TableHead><TableHead>归属</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scoped.awards.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{a.year}</TableCell>
                        <TableCell className="font-medium">{a.awardName}</TableCell>
                        <TableCell>{a.winner}</TableCell>
                        <TableCell>{scopeLabel(a.branchId)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditAward({ ...a })}><Edit className="h-3.5 w-3.5" /></Button>
                          <DeleteButton title={a.awardName} onConfirm={() => { persist({ ...db, awards: db.awards.filter(x => x.id !== a.id) }); toast.success("已删除"); }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {section === "personnel" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">组织机构页面</CardTitle>
              <CardDescription>与前台「组织机构」右侧「组织机构」「管理系列」同步；人员信息请在「学会简介 → 领导机构」维护</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>子栏目</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structurePagesList.map(row => (
                    <TableRow key={row.code}>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell>
                        {row.page ? (
                          <Badge variant="outline" className={statusBadgeClass(row.page.status)}>{CMS_STATUS_LABELS[row.page.status]}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">未创建</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditPageContext("structure");
                            setEditPage(row.page ?? {
                              id: generateCmsId("page"),
                              code: row.code,
                              title: row.title,
                              content: "<p></p>",
                              status: "draft",
                              branchId: null,
                              updatedAt: new Date().toISOString().split("T")[0],
                              pageType: "richtext",
                            });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

      {section === "gallery" && (
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div><CardTitle className="text-base">相册照片</CardTitle><CardDescription>按分类上传与管理历史照片</CardDescription></div>
              <Button size="sm" onClick={() => setEditGallery({ id: generateCmsId("gal"), title: "", category: GALLERY_CATEGORIES[0], imageUrl: "", sort: scoped.gallery.length + 1, branchId: isBranchScope ? adminBranchId! : null })}><Plus className="h-3.5 w-3.5 mr-1" /> 上传照片</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scoped.gallery.map(g => (
                  <div key={g.id} className="border rounded-lg overflow-hidden group relative">
                    {g.imageUrl && <img src={g.imageUrl} alt={g.title} className="w-full h-32 object-cover" />}
                    <div className="p-2 text-xs">
                      <p className="font-medium truncate">{g.title}</p>
                      <p className="text-muted-foreground">{g.category}</p>
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
                      <Button size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={() => setEditGallery({ ...g })}><Edit className="h-3 w-3" /></Button>
                      <DeleteButton title={g.title} onConfirm={() => { persist({ ...db, galleryPhotos: db.galleryPhotos.filter(x => x.id !== g.id) }); toast.success("已删除"); }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
      )}


      {isServicesView && (
        <>
          {canEditIntlAndTech && (
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">子栏目配置</CardTitle>
                  <CardDescription>增删改 Tab 名称、内容类型与排序；保存后前台学会服务页同步更新</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setEditServiceCat({
                    channelCode: `svc_${Date.now()}`,
                    navName: "",
                    subtitle: "",
                    contentModule: "science",
                    websiteTabKey: "science",
                    sortOrder: serviceCategories.length + 1,
                    status: "PUBLISHED",
                  })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> 新增子栏目
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>显示名称</TableHead>
                      <TableHead>栏目标识</TableHead>
                      <TableHead>内容类型</TableHead>
                      <TableHead>前台 Tab</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceCategories.map(cat => (
                      <TableRow key={cat.channelCode}>
                        <TableCell className="font-medium">{cat.navName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cat.channelCode}</TableCell>
                        <TableCell>
                          {SERVICE_CONTENT_MODULE_OPTIONS.find(o => o.value === cat.contentModule)?.label ?? cat.contentModule}
                        </TableCell>
                        <TableCell className="text-xs">{cat.websiteTabKey}</TableCell>
                        <TableCell>{cat.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditServiceCat({ ...cat })}><Edit className="h-3.5 w-3.5" /></Button>
                          <DeleteButton title={cat.navName} onConfirm={() => removeServiceCategory(cat)} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {serviceCategories.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">暂无子栏目，请点击「新增子栏目」</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {visibleServiceCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无可管理的子栏目内容</p>
          ) : (
            <Tabs value={servicesTab} onValueChange={setServicesTab}>
              <TabsList className="mb-4 flex-wrap h-auto">
                {visibleServiceCategories.map(cat => (
                  <TabsTrigger key={cat.channelCode} value={cat.channelCode}>{cat.navName}</TabsTrigger>
                ))}
              </TabsList>

              {visibleServiceCategories.map(cat => (
                <TabsContent key={cat.channelCode} value={cat.channelCode}>
                  {cat.contentModule === "science" && (
                    <Card>
                      <CardHeader className="flex flex-row justify-between">
                        <div>
                          <CardTitle className="text-base">{cat.navName}</CardTitle>
                          <CardDescription>{cat.subtitle ?? "科普文章、视频、基地、专著与化石保护"}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setEditScience({ id: generateCmsId("sci"), title: "", format: "article", category: SCIENCE_CATEGORIES[0], summary: "", content: "<p></p>", externalUrl: "", status: "draft", branchId: isBranchScope ? adminBranchId! : null, publishDate: new Date().toISOString().split("T")[0] })}><Plus className="h-3.5 w-3.5 mr-1" /> 新建</Button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>格式</TableHead><TableHead>分类</TableHead><TableHead>归属</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {scoped.science.map(s => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">{s.title}</TableCell>
                                <TableCell className="text-xs">{s.format}</TableCell>
                                <TableCell>{s.category}</TableCell>
                                <TableCell>{scopeLabel(s.branchId)}</TableCell>
                                <TableCell><Badge variant="outline" className={statusBadgeClass(s.status)}>{CMS_STATUS_LABELS[s.status]}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => setEditScience({ ...s })}><Edit className="h-3.5 w-3.5" /></Button>
                                  <DeleteButton title={s.title} onConfirm={() => { persist({ ...db, scienceItems: db.scienceItems.filter(x => x.id !== s.id) }); toast.success("已删除"); }} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {cat.contentModule === "international" && (
                    <Card>
                      <CardHeader className="flex flex-row justify-between">
                        <div>
                          <CardTitle className="text-base">{cat.navName}</CardTitle>
                          <CardDescription>{cat.subtitle ?? "交流动态、国际会议、国际会议组织与国际会议合作机构"}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setEditIntl({ id: generateCmsId("intl"), title: "", type: "news", summary: "", content: "<p></p>", linkUrl: "", logoUrl: "", status: "draft", publishDate: new Date().toISOString().split("T")[0] })}><Plus className="h-3.5 w-3.5 mr-1" /> 新建</Button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {db.internationalItems.map(i => (
                              <TableRow key={i.id}>
                                <TableCell className="font-medium">{i.title}</TableCell>
                                <TableCell>
                                  {INTL_TYPE_LABELS[i.type] ?? i.type}
                                </TableCell>
                                <TableCell><Badge variant="outline" className={statusBadgeClass(i.status)}>{CMS_STATUS_LABELS[i.status]}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => setEditIntl({ ...i })}><Edit className="h-3.5 w-3.5" /></Button>
                                  <DeleteButton title={i.title} onConfirm={() => { persist({ ...db, internationalItems: db.internationalItems.filter(x => x.id !== i.id) }); toast.success("已删除"); }} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {cat.contentModule === "tech-rewards" && (
                    <Card>
                      <CardHeader className="flex flex-row justify-between">
                        <div>
                          <CardTitle className="text-base">{cat.navName}</CardTitle>
                          <CardDescription>{cat.subtitle ?? "奖项介绍与申报指南"}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setEditTech({ id: generateCmsId("tech"), title: "", type: "guide", content: "<p></p>", status: "draft", updatedAt: new Date().toISOString().split("T")[0] })}><Plus className="h-3.5 w-3.5 mr-1" /> 新建</Button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {db.techRewardItems.map(t => (
                              <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.title}</TableCell>
                                <TableCell>{t.type === "intro" ? "奖项介绍" : "申报指南"}</TableCell>
                                <TableCell><Badge variant="outline" className={statusBadgeClass(t.status)}>{CMS_STATUS_LABELS[t.status]}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => setEditTech({ ...t })}><Edit className="h-3.5 w-3.5" /></Button>
                                  <DeleteButton title={t.title} onConfirm={() => { persist({ ...db, techRewardItems: db.techRewardItems.filter(x => x.id !== t.id) }); toast.success("已删除"); }} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}

        {/* Timeline */}
      {section === "timeline" && (
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div><CardTitle className="text-base">学会沿革（时间线）</CardTitle><CardDescription>年份节点编辑</CardDescription></div>
              <Button size="sm" onClick={() => setEditTimeline({ id: generateCmsId("tl"), year: "", title: "", description: "", imageUrl: "", sort: scoped.timeline.length + 1, branchId: null })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增节点</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>年份</TableHead><TableHead>事件</TableHead><TableHead>描述</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scoped.timeline.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">{t.year}</TableCell>
                      <TableCell>{t.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{t.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditTimeline({ ...t })}><Edit className="h-3.5 w-3.5" /></Button>
                        <DeleteButton title={t.title} onConfirm={() => { persist({ ...db, timelineNodes: db.timelineNodes.filter(x => x.id !== t.id) }); toast.success("已删除"); }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

        {/* M3 4.3 Media */}
      {section === "media" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">媒体文件</CardTitle>
              <CardDescription>分类、搜索与上传；已被引用的文件不可删除</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input placeholder="搜索文件名…" className="max-w-xs" value={mediaSearch} onChange={e => setMediaSearch(e.target.value)} />
                <Select value={mediaCategory} onValueChange={setMediaCategory}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="分类" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {Array.from(new Set(db.media.map(m => m.category))).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="file" className="max-w-[200px] text-xs" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const item: CmsMediaItem = { id: generateCmsId("media"), name: file.name, type: file.type.startsWith("image/") ? "image" : "document", category: "未分类", url: reader.result as string, sizeLabel: `${Math.round(file.size / 1024)} KB`, uploadedAt: new Date().toISOString().split("T")[0], refCount: 0 };
                    persist({ ...db, media: [...db.media, item] });
                    toast.success("已上传到媒体库");
                  };
                  reader.readAsDataURL(file);
                }} />
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>文件名</TableHead><TableHead>分类</TableHead><TableHead>引用</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredMedia.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>{m.refCount} 处</TableCell>
                      <TableCell className="text-right">
                        {m.refCount > 0 ? (
                          <span className="text-xs text-muted-foreground mr-2">被引用，不可删</span>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { persist({ ...db, media: db.media.filter(x => x.id !== m.id) }); toast.success("已删除"); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

      {section === "settings" && (
        isBranchScope ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">站点全局配置仅学会总管理员可编辑</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">底部联系信息</CardTitle><CardDescription>配置网站底部（footer）显示的联系方式</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>版权声明</Label><Input value={db.siteConfig.copyright} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, copyright: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>地址</Label><Input value={db.siteConfig.address} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, address: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>邮编</Label><Input value={db.siteConfig.zipCode} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, zipCode: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>电话</Label><Input value={db.siteConfig.contactPhone} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, contactPhone: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>传真</Label><Input value={db.siteConfig.contactFax} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, contactFax: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>邮箱</Label><Input value={db.siteConfig.contactEmail} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, contactEmail: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>ICP备案号</Label><Input value={db.siteConfig.icpNumber} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, icpNumber: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>公安网安备号</Label><Input value={db.siteConfig.securityNumber} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, securityNumber: e.target.value } })} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">二维码配置</CardTitle><CardDescription>底部"关注我们"区域显示的二维码图片地址</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>官方微信二维码（图片URL）</Label>
                      <Input placeholder="https://..." value={db.siteConfig.qrCodeWechat} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, qrCodeWechat: e.target.value } })} />
                      {db.siteConfig.qrCodeWechat && <img src={db.siteConfig.qrCodeWechat} alt="微信" className="w-20 h-20 object-contain border rounded" />}
                    </div>
                    <div className="space-y-2">
                      <Label>会员系统二维码（图片URL）</Label>
                      <Input placeholder="https://..." value={db.siteConfig.qrCodeMember} onChange={e => persist({ ...db, siteConfig: { ...db.siteConfig, qrCodeMember: e.target.value } })} />
                      {db.siteConfig.qrCodeMember && <img src={db.siteConfig.qrCodeMember} alt="会员" className="w-20 h-20 object-contain border rounded" />}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">相关学会 / 友情链接</CardTitle><CardDescription>底部"相关学会"列表</CardDescription></div>
                  <Button size="sm" onClick={() => persist({ ...db, siteConfig: { ...db.siteConfig, friendLinks: [...db.siteConfig.friendLinks, { name: "", url: "" }] } })}><Plus className="h-3.5 w-3.5 mr-1" /> 添加</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>链接地址</TableHead><TableHead className="text-right w-20">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {db.siteConfig.friendLinks.map((link, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Input className="h-8" value={link.name} placeholder="学会名称" onChange={e => { const friendLinks = [...db.siteConfig.friendLinks]; friendLinks[idx] = { ...link, name: e.target.value }; persist({ ...db, siteConfig: { ...db.siteConfig, friendLinks } }); }} /></TableCell>
                          <TableCell><Input className="h-8" value={link.url} placeholder="https://..." onChange={e => { const friendLinks = [...db.siteConfig.friendLinks]; friendLinks[idx] = { ...link, url: e.target.value }; persist({ ...db, siteConfig: { ...db.siteConfig, friendLinks } }); }} /></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-red-600 h-7 w-7 p-0" onClick={() => { const friendLinks = db.siteConfig.friendLinks.filter((_, i) => i !== idx); persist({ ...db, siteConfig: { ...db.siteConfig, friendLinks } }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

            </div>
          )
      )}

      {section === "regulations" && (
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div><CardTitle className="text-base">条例列表</CardTitle><CardDescription>编辑规章条例正文，可在页面内容中维护附件</CardDescription></div>
              <Button size="sm" onClick={() => setEditPage({ id: generateCmsId("page"), code: "regulations_new", title: "", content: "<p></p>", status: "draft", branchId: null, updatedAt: new Date().toISOString().split("T")[0], pageType: "richtext" })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>编码</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {regulationPages.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-xs font-mono">{p.code}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(p.status)}>{CMS_STATUS_LABELS[p.status]}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditPage({ ...p })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

      {section === "branch" && (
        <div className="space-y-4">
          {!isBranchScope && (
            <Card>
              <CardContent className="pt-6 flex flex-wrap items-center gap-3">
                <Label className="text-sm font-bold shrink-0">选择分会</Label>
                <Select value={branchCmsFilter} onValueChange={setBranchCmsFilter}>
                  <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCH_IDS.map(id => (
                      <SelectItem key={id} value={id}>{BRANCH_MAP[id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">管理 {BRANCH_MAP[activeBranchId] ?? activeBranchId} 子站内容</p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {BRANCH_SITE_SECTIONS.map(s => (
                <TabsTrigger key={s.id} value={s.id} className="text-xs">{s.title}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div>
                    <CardTitle className="text-base">分会概况</CardTitle>
                    <CardDescription>{BRANCH_SECTION_ADMIN_HINT.overview}</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setEditPage(branchScoped.overviewPage ?? {
                    id: generateCmsId("page"),
                    code: "branch_overview",
                    title: "分会概况",
                    content: "<p></p>",
                    status: "draft",
                    branchId: activeBranchId,
                    updatedAt: new Date().toISOString().split("T")[0],
                    pageType: "branch",
                  })}><Edit className="h-3.5 w-3.5 mr-1" /> 编辑</Button>
                </CardHeader>
                <CardContent>
                  {branchScoped.overviewPage ? (
                    <p className="text-sm text-muted-foreground">状态：{CMS_STATUS_LABELS[branchScoped.overviewPage.status]} · 更新于 {branchScoped.overviewPage.updatedAt}</p>
                  ) : (
                    <p className="text-sm text-amber-700">尚未创建分会概况页面，点击「编辑」初始化。</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="home">
              <ArticleSection
                title="首页 · 重大科研进展"
                description={BRANCH_SECTION_ADMIN_HINT.home}
                items={branchScoped.news.filter(n => n.showOnHomepage || n.category === "重大科研进展" || n.category === "科研进展")}
                onEdit={item => setEditArticle({ kind: "news", item })}
                onPreview={setPreviewArticle}
                onAdd={() => setEditArticle({ kind: "news", item: { id: generateCmsId("news"), title: "", category: "重大科研进展", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0], branchId: activeBranchId, scope: "branch", attachments: [], showOnHomepage: true } })}
                {...articleOps("news")}
              />
            </TabsContent>

            <TabsContent value="council">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">理事会</CardTitle><CardDescription>{BRANCH_SECTION_ADMIN_HINT.council}</CardDescription></div>
                  <Button size="sm" onClick={() => setEditPerson({ id: generateCmsId("person"), name: "", title: "", group: "理事会", bio: "", photoUrl: "", sort: branchScoped.personnel.length + 1, branchId: activeBranchId })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>姓名</TableHead><TableHead>职务</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.personnel.filter(p => p.group === "理事会").map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.title}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditPerson({ ...p })}><Edit className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work">
              <ArticleSection
                title="工作动态"
                description={BRANCH_SECTION_ADMIN_HINT.work}
                items={branchScoped.news.filter(n => n.category === "工作动态")}
                onEdit={item => setEditArticle({ kind: "news", item })}
                onPreview={setPreviewArticle}
                onAdd={() => setEditArticle({ kind: "news", item: { id: generateCmsId("news"), title: "", category: "工作动态", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0], branchId: activeBranchId, scope: "branch", attachments: [], showOnHomepage: false } })}
                {...articleOps("news")}
              />
            </TabsContent>

            <TabsContent value="announcements">
              <ArticleSection
                title="通知公告"
                description={BRANCH_SECTION_ADMIN_HINT.announcements}
                items={branchScoped.announcements}
                onEdit={item => setEditArticle({ kind: "announcements", item })}
                onPreview={setPreviewArticle}
                onAdd={() => setEditArticle({ kind: "announcements", item: { id: generateCmsId("ann"), title: "", category: "组织工作", summary: "", content: "<p></p>", status: "draft", pinned: false, publishDate: new Date().toISOString().split("T")[0], branchId: activeBranchId, scope: "branch", attachments: [], showOnHomepage: false } })}
                {...articleOps("announcements")}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">历史沿革</CardTitle><CardDescription>{BRANCH_SECTION_ADMIN_HINT.history}</CardDescription></div>
                  <Button size="sm" onClick={() => setEditTimeline({ id: generateCmsId("tl"), year: "", title: "", description: "", imageUrl: "", sort: branchScoped.timeline.length + 1, branchId: activeBranchId })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增节点</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>年份</TableHead><TableHead>标题</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.timeline.sort((a, b) => a.sort - b.sort).map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{t.year}</TableCell>
                          <TableCell>{t.title}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditTimeline({ ...t })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">历史相册</CardTitle><CardDescription>{BRANCH_SECTION_ADMIN_HINT.gallery}</CardDescription></div>
                  <Button size="sm" onClick={() => setEditGallery({ id: generateCmsId("gal"), title: "", category: GALLERY_CATEGORIES[0], imageUrl: "", sort: branchScoped.gallery.length + 1, branchId: activeBranchId })}><Plus className="h-3.5 w-3.5 mr-1" /> 上传照片</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.gallery.map(g => (
                        <TableRow key={g.id}>
                          <TableCell>{g.title}</TableCell>
                          <TableCell>{g.category}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditGallery({ ...g })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="science">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">科学传播</CardTitle><CardDescription>{BRANCH_SECTION_ADMIN_HINT.science}</CardDescription></div>
                  <Button size="sm" onClick={() => setEditScience({ id: generateCmsId("sci"), title: "", format: "article", category: SCIENCE_CATEGORIES[0], summary: "", content: "<p></p>", externalUrl: "", status: "draft", branchId: activeBranchId, publishDate: new Date().toISOString().split("T")[0] })}><Plus className="h-3.5 w-3.5 mr-1" /> 新建</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.science.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.title}</TableCell>
                          <TableCell>{s.category}</TableCell>
                          <TableCell><Badge variant="outline" className={statusBadgeClass(s.status)}>{CMS_STATUS_LABELS[s.status]}</Badge></TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditScience({ ...s })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="awards">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div><CardTitle className="text-base">获奖成果</CardTitle><CardDescription>{BRANCH_SECTION_ADMIN_HINT.awards}</CardDescription></div>
                  <Button size="sm" onClick={() => setEditAward({ id: generateCmsId("award"), year: new Date().getFullYear().toString(), awardName: "", winner: "", description: "", branchId: activeBranchId })}><Plus className="h-3.5 w-3.5 mr-1" /> 新增</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>年份</TableHead><TableHead>奖项</TableHead><TableHead>获奖人</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.awards.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{a.year}</TableCell>
                          <TableCell>{a.awardName}</TableCell>
                          <TableCell>{a.winner}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditAward({ ...a })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="downloads">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <div>
                    <CardTitle className="text-base">下载中心</CardTitle>
                    <CardDescription>分类：{DOWNLOAD_CATEGORIES_BRANCH.join("、")}（{BRANCH_SECTION_ADMIN_HINT.downloads}）</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setEditPublicFile({
                    id: generateCmsId("pf"), title: "", category: "document", subjectCategory: DOWNLOAD_CATEGORIES_BRANCH[0],
                    fileName: "", fileUrl: "", fileSize: "", remark: "", downloadCount: 0,
                    uploadDate: new Date().toISOString().split("T")[0], deleted: false,
                    memberOnly: false, branchId: activeBranchId,
                  })}><Plus className="h-3.5 w-3.5 mr-1" /> 上传文件</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>分类</TableHead><TableHead>文件名</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {branchScoped.publicFiles.map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.title}</TableCell>
                          <TableCell>{f.subjectCategory}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.fileName}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditPublicFile({ ...f })}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── 公开文件下载区管理 ── */}
      {section === "public-files" && (
        <div className="space-y-4">
          {/* 格式提示面板 */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" /> 上传文件格式提示备注
                  </CardTitle>
                  <CardDescription>点击各分类查看支持格式及转换建议，上传前请确认文件格式合规</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {(["document", "audio", "video", "photo"] as const).map(cat => {
                  const hint = CMS_PUBLIC_FILE_FORMAT_HINTS[cat];
                  const isOpen = showFormatHints === cat;
                  return (
                    <div key={cat} className="border rounded-lg overflow-hidden bg-white">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-left hover:bg-slate-50 transition-colors"
                        onClick={() => setShowFormatHints(isOpen ? null : cat)}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cat === "document" ? "bg-blue-500" : cat === "audio" ? "bg-green-500" : cat === "video" ? "bg-purple-500" : "bg-amber-500"}`} />
                          {CMS_PUBLIC_FILE_CATEGORY_LABELS[cat]}
                        </span>
                        <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t">
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1">支持格式：</p>
                            <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 p-2 rounded">{hint.formats}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-600 mb-1">格式转换建议：</p>
                            <ul className="space-y-1">
                              {hint.convert.map((tip, i) => (
                                <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                <strong>注意：</strong>视频格式中「MP3」为笔误，MP3 属于音频格式；视频请使用 MP4/AVI/MOV/WMV/MKV/FLV。文件删除为逻辑删除，保留操作日志。
              </div>
            </CardContent>
          </Card>

          {/* 文件列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">公开文件列表</CardTitle>
                <CardDescription>统一管理公开文件与学会资料下载，无需登录即可下载（会员专属文件除外）</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={publicFileCategoryFilter} onValueChange={setPublicFileCategoryFilter}>
                  <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {(["document", "audio", "video", "photo"] as const).map(c => (
                      <SelectItem key={c} value={c}>{CMS_PUBLIC_FILE_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setEditPublicFile({
                  id: generateCmsId("pf"), title: "", category: "document", subjectCategory: isBranchScope ? "会议简讯" : DOWNLOAD_CATEGORIES_SOCIETY[0],
                  fileName: "", fileUrl: "", fileSize: "", remark: "", downloadCount: 0,
                  uploadDate: new Date().toISOString().split("T")[0], deleted: false,
                  memberOnly: false, branchId: isBranchScope ? adminBranchId! : null,
                })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> 上传文件
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>媒体类型</TableHead>
                    <TableHead>资料分类</TableHead>
                    <TableHead>文件名称</TableHead>
                    <TableHead>归属</TableHead>
                    <TableHead>权限</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>上传日期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedPublicFiles
                    .filter(f => !f.deleted && (publicFileCategoryFilter === "all" || f.category === publicFileCategoryFilter))
                    .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
                    .map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge variant="outline" className={
                          f.category === "document" ? "text-blue-700 border-blue-200 bg-blue-50" :
                          f.category === "audio" ? "text-green-700 border-green-200 bg-green-50" :
                          f.category === "video" ? "text-purple-700 border-purple-200 bg-purple-50" :
                          "text-amber-700 border-amber-200 bg-amber-50"
                        }>{CMS_PUBLIC_FILE_CATEGORY_LABELS[f.category]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.subjectCategory || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm max-w-[200px] truncate" title={f.title}>{f.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{f.fileName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{scopeLabel(f.branchId ?? null)}</TableCell>
                      <TableCell><MemberOnlyBadge memberOnly={!!f.memberOnly} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.fileSize || "—"}</TableCell>
                      <TableCell className="text-sm">{f.uploadDate}</TableCell>
                      <TableCell className="text-right flex justify-end gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => setEditPublicFile({ ...f })}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteButton title={f.title} onConfirm={() => {
                          persist({ ...db, publicFiles: db.publicFiles.map(x => x.id === f.id ? { ...x, deleted: true } : x) });
                          toast.success("已逻辑删除（文件记录保留于审计日志）");
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {scopedPublicFiles.filter(f => !f.deleted && (publicFileCategoryFilter === "all" || f.category === publicFileCategoryFilter)).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无文件，点击「上传文件」添加</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 公开文件编辑弹窗 ── */}
      <Dialog open={!!editPublicFile} onOpenChange={o => !o && setEditPublicFile(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPublicFile?.id && db.publicFiles.some(f => f.id === editPublicFile.id) ? "编辑文件信息" : "上传文件"}</DialogTitle>
          </DialogHeader>
          {editPublicFile && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>媒体类型 <span className="text-red-500">*</span></Label>
                <Select value={editPublicFile.category} onValueChange={v => setEditPublicFile({ ...editPublicFile, category: v as typeof editPublicFile.category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["document", "audio", "video", "photo"] as const).map(c => (
                      <SelectItem key={c} value={c}>
                        {CMS_PUBLIC_FILE_CATEGORY_LABELS[c]} — {
                          c === "document" ? ".doc/.docx/.pdf/.xls/.xlsx/.ppt/.pptx/.zip/.rar" :
                          c === "audio" ? ".mp3/.wav/.m4a" :
                          c === "video" ? ".mp4/.avi/.mov/.wmv/.mkv/.flv" :
                          ".jpeg/.jpg/.png/.gif/.tiff"
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground bg-slate-50 p-2 rounded border">
                  ✦ {CMS_PUBLIC_FILE_FORMAT_HINTS[editPublicFile.category].formats}
                </p>
              </div>
              {editPublicFile.category === "document" && (
                <div className="space-y-2">
                  <Label>资料分类</Label>
                  <Select
                    value={editPublicFile.subjectCategory || DOWNLOAD_CATEGORIES_SOCIETY[0]}
                    onValueChange={v => setEditPublicFile({ ...editPublicFile, subjectCategory: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(isBranchScope ? DOWNLOAD_CATEGORIES_BRANCH : DOWNLOAD_CATEGORIES_SOCIETY).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>文件名称（展示用） <span className="text-red-500">*</span></Label>
                <Input value={editPublicFile.title} onChange={e => setEditPublicFile({ ...editPublicFile, title: e.target.value })} placeholder="如：2026年图片大赛参赛规则" />
              </div>
              <div className="space-y-2 rounded-lg border border-dashed border-[#E5E1DA] bg-slate-50/80 p-4">
                <Label>选择本地文件上传</Label>
                <Input
                  type="file"
                  className="text-xs bg-white"
                  disabled={publicFileUploading}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handlePublicFileUpload(file);
                    e.target.value = "";
                  }}
                />
                {publicFileUploading && (
                  <p className="text-xs text-muted-foreground">上传中，请稍候…</p>
                )}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  上传成功后将自动识别媒体类型，并填写原始文件名、文件大小与文件地址。也可跳过上传，在下方手动填写 URL。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>原始文件名</Label>
                  <Input value={editPublicFile.fileName} onChange={e => setEditPublicFile({ ...editPublicFile, fileName: e.target.value })} placeholder="文件名.pdf" />
                </div>
                <div className="space-y-2">
                  <Label>文件大小</Label>
                  <Input value={editPublicFile.fileSize} onChange={e => setEditPublicFile({ ...editPublicFile, fileSize: e.target.value })} placeholder="256 KB / 128 MB" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>文件地址（URL）<span className="text-red-500">*</span></Label>
                <Input value={editPublicFile.fileUrl} onChange={e => setEditPublicFile({ ...editPublicFile, fileUrl: e.target.value })} placeholder="https://... 或 /media/文件名.pdf" />
              </div>
              <div className="space-y-2">
                <Label>备注说明</Label>
                <Textarea rows={2} value={editPublicFile.remark} onChange={e => setEditPublicFile({ ...editPublicFile, remark: e.target.value })} placeholder="适用场景或说明" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!editPublicFile.memberOnly} onCheckedChange={v => setEditPublicFile({ ...editPublicFile, memberOnly: !!v })} />
                仅有效会员可下载
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[10px] text-blue-700 space-y-1">
                <p className="font-bold mb-1">格式转换建议（{CMS_PUBLIC_FILE_CATEGORY_LABELS[editPublicFile.category]}）：</p>
                {CMS_PUBLIC_FILE_FORMAT_HINTS[editPublicFile.category].convert.map((tip, i) => (
                  <p key={i}>• {tip}</p>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPublicFile(null)}>取消</Button>
            <Button onClick={() => {
              if (!editPublicFile || !editPublicFile.title || !editPublicFile.fileUrl) {
                toast.error("请填写文件名称和文件地址");
                return;
              }
              const exists = db.publicFiles.some(f => f.id === editPublicFile.id);
              persist({ ...db, publicFiles: exists
                ? db.publicFiles.map(f => f.id === editPublicFile.id ? editPublicFile : f)
                : [...db.publicFiles, editPublicFile]
              });
              setEditPublicFile(null);
              toast.success("已保存");
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 新闻发布（会议通知 / 党务公开 / 重要新闻） ── */}
      {section === "publish" && (
        <div className="space-y-4">
          {/* 板块背景图配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">板块对外展示背景图</CardTitle>
              <CardDescription>为三个板块的对外展示窗口（首页 Banner 或板块封面）分别配置背景图片</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {(["meeting_notice", "party_public", "important_news"] as const).map(type => (
                <div key={type} className="space-y-2">
                  <Label>{CMS_BOARD_TYPE_LABELS[type]}</Label>
                  <ImageUploadField
                    label={`${CMS_BOARD_TYPE_LABELS[type]}背景图`}
                    value={db.boardCovers[type]}
                    onChange={url => persist({ ...db, boardCovers: { ...db.boardCovers, [type]: url } })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 内容列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">发布内容列表</CardTitle>
                <CardDescription>三类内容共用一套管理，按板块类型筛选</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={publishBoardFilter} onValueChange={setPublishBoardFilter}>
                  <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部板块</SelectItem>
                    {(["meeting_notice", "party_public", "important_news"] as const).map(t => (
                      <SelectItem key={t} value={t}>{CMS_BOARD_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setEditPublish({
                  id: generateCmsId("pub"), boardType: "meeting_notice", title: "", summary: "",
                  content: "<p></p>", coverUrl: "", publishDate: new Date().toISOString().split("T")[0],
                  status: "draft", originalFile: null, createdBy: "admin",
                })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> 新建内容
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>板块类型</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>原文件</TableHead>
                    <TableHead>发布时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.publishArticles
                    .filter(a => publishBoardFilter === "all" || a.boardType === publishBoardFilter)
                    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
                    .map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant="outline" className={
                          a.boardType === "meeting_notice" ? "text-blue-700 border-blue-200 bg-blue-50" :
                          a.boardType === "party_public" ? "text-red-700 border-red-200 bg-red-50" :
                          "text-amber-700 border-amber-200 bg-amber-50"
                        }>{CMS_BOARD_TYPE_LABELS[a.boardType]}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[220px] truncate" title={a.title}>{a.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.originalFile ? (
                          <span className="flex items-center gap-1">
                            <span className="text-green-600">✓</span>
                            {CMS_FILE_CATEGORY_LABELS[a.originalFile.category]}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{a.publishDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(a.status)}>
                          {CMS_STATUS_LABELS[a.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-0.5">
                        <Button variant="ghost" size="sm" onClick={() => setEditPublish({ ...a })}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {a.status !== "published" ? (
                          <Button variant="ghost" size="sm" className="text-green-700" title="发布"
                            onClick={() => { persist({ ...db, publishArticles: db.publishArticles.map(x => x.id === a.id ? { ...x, status: "published" as const } : x) }); toast.success("已发布"); }}>
                            发布
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-amber-700" title="下线"
                            onClick={() => { persist({ ...db, publishArticles: db.publishArticles.map(x => x.id === a.id ? { ...x, status: "archived" as const } : x) }); toast.success("已下线"); }}>
                            下线
                          </Button>
                        )}
                        <DeleteButton title={a.title} onConfirm={() => {
                          persist({ ...db, publishArticles: db.publishArticles.filter(x => x.id !== a.id) });
                          toast.success("已删除");
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {db.publishArticles.filter(a => publishBoardFilter === "all" || a.boardType === publishBoardFilter).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无内容，点击「新建内容」添加</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 新闻发布编辑弹窗 ── */}
      <Dialog open={!!editPublish} onOpenChange={o => !o && setEditPublish(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPublish?.id && db.publishArticles.some(a => a.id === editPublish.id) ? "编辑内容" : "新建内容"}</DialogTitle></DialogHeader>
          {editPublish && (
            <div className="space-y-3">
              {/* 板块类型 */}
              <div className="space-y-2">
                <Label>板块类型</Label>
                <Select value={editPublish.boardType} onValueChange={v => setEditPublish({ ...editPublish, boardType: v as typeof editPublish.boardType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["meeting_notice", "party_public", "important_news"] as const).map(t => (
                      <SelectItem key={t} value={t}>{CMS_BOARD_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>标题</Label><Input value={editPublish.title} onChange={e => setEditPublish({ ...editPublish, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>摘要</Label><Textarea rows={2} value={editPublish.summary} onChange={e => setEditPublish({ ...editPublish, summary: e.target.value })} /></div>
              <RichTextEditor label="正文（富文本）" value={editPublish.content} onChange={v => setEditPublish({ ...editPublish, content: v })} />
              <ImageUploadField label="封面图 / 文章背景图（可选）" value={editPublish.coverUrl} onChange={url => setEditPublish({ ...editPublish, coverUrl: url })} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>发布时间</Label>
                  <Input type="date" value={editPublish.publishDate} onChange={e => setEditPublish({ ...editPublish, publishDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>发布状态</Label>
                  <Select value={editPublish.status} onValueChange={v => setEditPublish({ ...editPublish, status: v as typeof editPublish.status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="published">已发布</SelectItem>
                      <SelectItem value="archived">已下线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 原文件下载 */}
              <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  原文件下载（发布页底部显示，选择一种格式上传）
                  {editPublish.originalFile && (
                    <Button variant="ghost" size="sm" className="h-5 text-xs text-red-500 px-1"
                      onClick={() => setEditPublish({ ...editPublish, originalFile: null })}>
                      × 清除
                    </Button>
                  )}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">文件分类</Label>
                    <Select
                      value={editPublish.originalFile?.category ?? "document"}
                      onValueChange={v => editPublish && setEditPublish({ ...editPublish, originalFile: { ...(editPublish.originalFile ?? { name: "", url: "" }), category: v as NonNullable<typeof editPublish.originalFile>["category"] } })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["document", "audio", "video", "photo"] as const).map(c => (
                          <SelectItem key={c} value={c}>{CMS_FILE_CATEGORY_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">文件名称</Label>
                    <Input className="h-8" placeholder="文件名.pdf" value={editPublish.originalFile?.name ?? ""}
                      onChange={e => setEditPublish({ ...editPublish, originalFile: { ...(editPublish.originalFile ?? { category: "document", url: "" }), name: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">文件地址（URL 或上传路径）</Label>
                  <Input placeholder="https://... 或 /media/文件名.pdf" value={editPublish.originalFile?.url ?? ""}
                    onChange={e => setEditPublish({ ...editPublish, originalFile: { ...(editPublish.originalFile ?? { category: "document", name: "" }), url: e.target.value } })} />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[10px] text-blue-700 space-y-0.5">
                  <p className="font-bold mb-1">上传格式提示备注（选其中一类上传）：</p>
                  <p>📄 文档类：.doc / .docx（Word）、.pdf（PDF）、.xls / .xlsx（Excel）、.ppt / .pptx（PPT）、.zip / .rar（压缩包）</p>
                  <p>🎵 音频类：.mp3（MP3）、.wav（WAV）、.m4a（M4A）</p>
                  <p>🎬 影视类：.mp4（MP4）、.avi（AVI）、.mov（MOV）、.wmv（WMV）、.mkv（MKV）、.flv（FLV）</p>
                  <p>🖼 照片类：.jpeg / .jpg（JPEG）、.png（PNG）、.gif（GIF）、.tiff（TIFF）</p>
                  <p className="pt-1 text-blue-500 border-t border-blue-200 mt-1">💡 格式转换：文档→PDF（Office另存为）；视频→MP4（HandBrake免费）；音频→MP3（Audacity免费）；图片→JPG（IrfanView批量）</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPublish(null)}>取消</Button>
            <Button onClick={() => {
              if (!editPublish) return;
              const exists = db.publishArticles.some(a => a.id === editPublish.id);
              persist({ ...db, publishArticles: exists
                ? db.publishArticles.map(a => a.id === editPublish.id ? editPublish : a)
                : [...db.publishArticles, editPublish]
              });
              setEditPublish(null);
              toast.success("已保存");
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs — Banner */}
      <Dialog open={!!editBanner} onOpenChange={o => !o && setEditBanner(null)}>
        <DialogContent><DialogHeader><DialogTitle>编辑 Banner</DialogTitle></DialogHeader>
          {editBanner && (<div className="space-y-3">
            <div className="space-y-2"><Label>标题</Label><Input value={editBanner.title} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })} /></div>
            <ImageUploadField label="轮播图片" value={editBanner.imageUrl} onChange={url => setEditBanner({ ...editBanner, imageUrl: url })} />
            <div className="space-y-2"><Label>链接</Label><Input value={editBanner.linkUrl} onChange={e => setEditBanner({ ...editBanner, linkUrl: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={editBanner.enabled} onCheckedChange={v => setEditBanner({ ...editBanner, enabled: !!v })} />启用</label>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditBanner(null)}>取消</Button><Button onClick={() => { if (!editBanner) return; const exists = db.banners.some(b => b.id === editBanner.id); persist({ ...db, banners: exists ? db.banners.map(b => b.id === editBanner.id ? editBanner : b) : [...db.banners, editBanner] }); setEditBanner(null); toast.success("已保存"); }}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article dialog */}
      <Dialog open={!!editArticle} onOpenChange={o => !o && setEditArticle(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>编辑内容</DialogTitle></DialogHeader>
          {editArticle?.item && (<div className="space-y-3">
            <div className="space-y-2"><Label>标题</Label><Input value={editArticle.item.title} onChange={e => setEditArticle({ ...editArticle, item: { ...editArticle.item!, title: e.target.value } })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>分类</Label><Input value={editArticle.item.category} onChange={e => setEditArticle({ ...editArticle, item: { ...editArticle.item!, category: e.target.value } })} /></div>
              <div className="space-y-2"><Label>日期</Label><Input type="date" value={editArticle.item.publishDate} onChange={e => setEditArticle({ ...editArticle, item: { ...editArticle.item!, publishDate: e.target.value } })} /></div>
            </div>
            <div className="space-y-2"><Label>摘要</Label><Textarea rows={2} value={editArticle.item.summary} onChange={e => setEditArticle({ ...editArticle, item: { ...editArticle.item!, summary: e.target.value } })} /></div>
            <RichTextEditor value={editArticle.item.content} onChange={c => setEditArticle({ ...editArticle, item: { ...editArticle.item!, content: c } })} />
            <AttachmentEditor attachments={editArticle.item.attachments} onChange={a => setEditArticle({ ...editArticle, item: { ...editArticle.item!, attachments: a } })} />
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={editArticle.item.showOnHomepage} onCheckedChange={v => setEditArticle({ ...editArticle, item: { ...editArticle.item!, showOnHomepage: !!v } })} />在首页展示</label>
          </div>)}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditArticle(null)}>取消</Button>
            <Button onClick={() => { if (!editArticle?.item) return; const k = editArticle.kind; const exists = db[k].some(a => a.id === editArticle.item!.id); persist({ ...db, [k]: exists ? db[k].map(a => a.id === editArticle.item!.id ? editArticle.item! : a) : [...db[k], editArticle.item] }); setEditArticle(null); toast.success("已保存"); }}>保存</Button>
            <Button onClick={() => { if (!editArticle?.item) return; const k = editArticle.kind; const item = { ...editArticle.item, status: "published" as const }; const exists = db[k].some(a => a.id === item.id); persist({ ...db, [k]: exists ? db[k].map(a => a.id === item.id ? item : a) : [...db[k], item] }); setEditArticle(null); toast.success("已发布"); }}>发布</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page dialog */}
      <Dialog open={!!editPage} onOpenChange={o => { if (!o) { setEditPage(null); setEditPageContext(null); } }}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editPage?.code ? "编辑子栏目" : "新增子栏目"}</DialogTitle><DialogDescription>填写标题与正文即可，系统自动处理技术标识。</DialogDescription></DialogHeader>
          {editPage && (<div className="space-y-3">
            <div className="space-y-2"><Label>子栏目标题</Label><Input value={editPage.title} onChange={e => setEditPage({ ...editPage, title: e.target.value })} placeholder="例如：学会概况" /></div>
            <RichTextEditor value={editPage.content} onChange={c => setEditPage({ ...editPage, content: c })} />
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => { setEditPage(null); setEditPageContext(null); }}>取消</Button><Button onClick={() => {
            if (!editPage) return;
            if (!editPage.title.trim()) { toast.error("请填写子栏目标题"); return; }
            const allCodes = scoped.pages.map(p => p.code);
            const isStructure = editPageContext === "structure" || isStructurePageCode(editPage.code);
            const code = editPage.code || (
              isStructure
                ? generateStructurePageCode(editPage.title, allCodes)
                : generateIntroPageCode(editPage.title, allCodes)
            );
            const page = {
              ...editPage,
              code,
              title: editPage.title.trim(),
              updatedAt: new Date().toISOString().split("T")[0],
              status: "published" as const,
              branchId: isStructure || editPageContext === "intro" ? null : editPage.branchId,
              pageType: (isStructure || editPageContext === "intro" ? "richtext" : editPage.pageType) as CmsPage["pageType"],
            };
            const pageIdx = db.pages.findIndex(p =>
              p.code === page.code || p.cmsEntryId === page.cmsEntryId || p.id === page.id,
            );
            const nextPages = pageIdx >= 0
              ? db.pages.map((p, i) => (i === pageIdx ? { ...p, ...page, cmsEntryId: page.cmsEntryId ?? p.cmsEntryId } : p))
              : [...db.pages, page];
            persist({ ...db, pages: nextPages });
            setEditPage(null);
            setEditPageContext(null);
            toast.success("已发布");
          }}>保存并发布</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Person dialog */}
      <Dialog open={!!editPerson} onOpenChange={o => !o && setEditPerson(null)}>
        <DialogContent><DialogHeader><DialogTitle>编辑人员</DialogTitle></DialogHeader>
          {editPerson && (<div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>姓名</Label><Input value={editPerson.name} onChange={e => setEditPerson({ ...editPerson, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>职务</Label><Input value={editPerson.title} onChange={e => setEditPerson({ ...editPerson, title: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>分组</Label>
              <Select value={editPerson.group} onValueChange={v => setEditPerson({ ...editPerson, group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTRO_PERSONNEL_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  {!INTRO_PERSONNEL_GROUPS.includes(editPerson.group) && editPerson.group && (
                    <SelectItem value={editPerson.group}>{editPerson.group}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <ImageUploadField label="照片" value={editPerson.photoUrl} onChange={url => setEditPerson({ ...editPerson, photoUrl: url })} />
            <div className="space-y-2"><Label>简介</Label><Textarea rows={3} value={editPerson.bio} onChange={e => setEditPerson({ ...editPerson, bio: e.target.value })} /></div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditPerson(null)}>取消</Button><Button onClick={() => { if (!editPerson) return; persist({ ...db, personnel: db.personnel.some(p => p.id === editPerson.id) ? db.personnel.map(p => p.id === editPerson.id ? editPerson : p) : [...db.personnel, editPerson] }); setEditPerson(null); toast.success("已保存"); }}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery dialog */}
      <Dialog open={!!editGallery} onOpenChange={o => !o && setEditGallery(null)}>
        <DialogContent>{editGallery && (<><DialogHeader><DialogTitle>相册照片</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>标题</Label><Input value={editGallery.title} onChange={e => setEditGallery({ ...editGallery, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>分类</Label>
              <Select value={editGallery.category} onValueChange={v => setEditGallery({ ...editGallery, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GALLERY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ImageUploadField label="照片" value={editGallery.imageUrl} onChange={url => setEditGallery({ ...editGallery, imageUrl: url })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditGallery(null)}>取消</Button><Button onClick={() => { persist({ ...db, galleryPhotos: db.galleryPhotos.some(g => g.id === editGallery.id) ? db.galleryPhotos.map(g => g.id === editGallery.id ? editGallery : g) : [...db.galleryPhotos, editGallery] }); setEditGallery(null); toast.success("已保存"); }}>保存</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Award dialog */}
      <Dialog open={!!editAward} onOpenChange={o => !o && setEditAward(null)}>
        <DialogContent>{editAward && (<><DialogHeader><DialogTitle>获奖成果</DialogTitle></DialogHeader>
          <div className="space-y-3 grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>年份</Label><Input value={editAward.year} onChange={e => setEditAward({ ...editAward, year: e.target.value })} /></div>
            <div className="space-y-2"><Label>获奖人</Label><Input value={editAward.winner} onChange={e => setEditAward({ ...editAward, winner: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>奖项名称</Label><Input value={editAward.awardName} onChange={e => setEditAward({ ...editAward, awardName: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>说明</Label><Textarea value={editAward.description} onChange={e => setEditAward({ ...editAward, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => { persist({ ...db, awards: db.awards.some(a => a.id === editAward.id) ? db.awards.map(a => a.id === editAward.id ? editAward : a) : [...db.awards, editAward] }); setEditAward(null); toast.success("已保存"); }}>保存</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Science dialog */}
      <Dialog open={!!editScience} onOpenChange={o => !o && setEditScience(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">{editScience && (<><DialogHeader><DialogTitle>科学传播</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editScience.title} onChange={e => setEditScience({ ...editScience, title: e.target.value })} placeholder="标题" />
            <Select value={editScience.format} onValueChange={v => setEditScience({ ...editScience, format: v as CmsScienceItem["format"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="article">科普文章</SelectItem><SelectItem value="video">科普视频</SelectItem><SelectItem value="base">科普基地</SelectItem><SelectItem value="book">学术专著</SelectItem><SelectItem value="fossil">化石保护</SelectItem>
              </SelectContent>
            </Select>
            <RichTextEditor value={editScience.content} onChange={c => setEditScience({ ...editScience, content: c })} />
            <Input value={editScience.externalUrl} onChange={e => setEditScience({ ...editScience, externalUrl: e.target.value })} placeholder="外链/视频地址" />
          </div>
          <DialogFooter><Button onClick={() => { const item = { ...editScience, status: "published" as const }; persist({ ...db, scienceItems: db.scienceItems.some(s => s.id === item.id) ? db.scienceItems.map(s => s.id === item.id ? item : s) : [...db.scienceItems, item] }); setEditScience(null); toast.success("已发布"); }}>发布</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Intl dialog */}
      <Dialog open={!!editIntl} onOpenChange={o => !o && setEditIntl(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">{editIntl && (<><DialogHeader><DialogTitle>国际交流</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editIntl.title} onChange={e => setEditIntl({ ...editIntl, title: e.target.value })} />
            <Select value={editIntl.type} onValueChange={v => setEditIntl({ ...editIntl, type: v as CmsInternationalItem["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="news">交流动态</SelectItem><SelectItem value="conference">国际会议</SelectItem><SelectItem value="report">国际会议组织</SelectItem><SelectItem value="partner">国际会议合作机构</SelectItem></SelectContent>
            </Select>
            <RichTextEditor value={editIntl.content} onChange={c => setEditIntl({ ...editIntl, content: c })} />
            <Input value={editIntl.linkUrl} onChange={e => setEditIntl({ ...editIntl, linkUrl: e.target.value })} placeholder="外链" />
            <ImageUploadField label="Logo" value={editIntl.logoUrl} onChange={url => setEditIntl({ ...editIntl, logoUrl: url })} />
          </div>
          <DialogFooter><Button onClick={() => { const item = { ...editIntl, status: "published" as const }; persist({ ...db, internationalItems: db.internationalItems.some(i => i.id === item.id) ? db.internationalItems.map(i => i.id === item.id ? item : i) : [...db.internationalItems, item] }); setEditIntl(null); toast.success("已发布"); }}>发布</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Tech dialog */}
      <Dialog open={!!editTech} onOpenChange={o => !o && setEditTech(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">{editTech && (<><DialogHeader><DialogTitle>科技奖励</DialogTitle></DialogHeader>
          <Input value={editTech.title} onChange={e => setEditTech({ ...editTech, title: e.target.value })} className="mb-3" />
          <Select value={editTech.type} onValueChange={v => setEditTech({ ...editTech, type: v as CmsTechRewardItem["type"] })}>
            <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="intro">奖项介绍</SelectItem><SelectItem value="guide">申报指南</SelectItem></SelectContent>
          </Select>
          <RichTextEditor value={editTech.content} onChange={c => setEditTech({ ...editTech, content: c })} />
          <DialogFooter className="mt-4"><Button onClick={() => { const item = { ...editTech, status: "published" as const, updatedAt: new Date().toISOString().split("T")[0] }; persist({ ...db, techRewardItems: db.techRewardItems.some(t => t.id === item.id) ? db.techRewardItems.map(t => t.id === item.id ? item : t) : [...db.techRewardItems, item] }); setEditTech(null); toast.success("已发布"); }}>发布</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Party dialog */}
      <Dialog open={!!editParty} onOpenChange={o => !o && setEditParty(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">{editParty && (<><DialogHeader><DialogTitle>党建文章</DialogTitle></DialogHeader>
          <Select value={editParty.column} onValueChange={v => setEditParty({ ...editParty, column: v })}>
            <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger><SelectContent>{PARTY_NAV_ITEMS.filter(c => c.code !== "party_topics" && c.code !== "party_downloads").map(c => <SelectItem key={c.code} value={c.code}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={editParty.title} onChange={e => setEditParty({ ...editParty, title: e.target.value })} className="mb-3" />
          <RichTextEditor value={editParty.content} onChange={c => setEditParty({ ...editParty, content: c })} />
          <DialogFooter className="mt-4"><Button onClick={() => { const item = { ...editParty, status: "published" as const }; persist({ ...db, partyArticles: db.partyArticles.some(a => a.id === item.id) ? db.partyArticles.map(a => a.id === item.id ? item : a) : [...db.partyArticles, item] }); setEditParty(null); toast.success("已发布"); }}>发布</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Topic dialog */}
      <Dialog open={!!editTopic} onOpenChange={o => !o && setEditTopic(null)}>
        <DialogContent>{editTopic && (<><DialogHeader><DialogTitle>党建专题</DialogTitle></DialogHeader>
          <Input value={editTopic.title} onChange={e => setEditTopic({ ...editTopic, title: e.target.value })} className="mb-2" />
          <Textarea value={editTopic.description} onChange={e => setEditTopic({ ...editTopic, description: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-2">关联文章 ID：{editTopic.articleIds.join(", ") || "无"}</p>
          <DialogFooter className="mt-4"><Button onClick={() => { persist({ ...db, partyTopics: db.partyTopics.some(t => t.id === editTopic.id) ? db.partyTopics.map(t => t.id === editTopic.id ? editTopic : t) : [...db.partyTopics, editTopic] }); setEditTopic(null); toast.success("已保存"); }}>保存</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Download dialog */}
      <Dialog open={!!editDownload} onOpenChange={o => !o && setEditDownload(null)}>
        <DialogContent>{editDownload && (<><DialogHeader><DialogTitle>党建下载文件</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editDownload.title} onChange={e => setEditDownload({ ...editDownload, title: e.target.value })} placeholder="显示标题" />
            <Select value={editDownload.category} onValueChange={v => setEditDownload({ ...editDownload, category: v })}>
              <SelectTrigger><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent>
                {DOWNLOAD_CATEGORIES_PARTY.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={editDownload.fileName} onChange={e => setEditDownload({ ...editDownload, fileName: e.target.value })} placeholder="文件名" />
            <Input value={editDownload.fileUrl} onChange={e => setEditDownload({ ...editDownload, fileUrl: e.target.value })} placeholder="文件 URL" />
          </div>
          <DialogFooter><Button onClick={() => { const item = { ...editDownload, scope: "party" as const, branchId: null }; persist({ ...db, downloadFiles: db.downloadFiles.some(d => d.id === item.id) ? db.downloadFiles.map(d => d.id === item.id ? item : d) : [...db.downloadFiles, item] }); setEditDownload(null); toast.success("已保存"); }}>保存</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Timeline dialog */}
      <Dialog open={!!editTimeline} onOpenChange={o => !o && setEditTimeline(null)}>
        <DialogContent>{editTimeline && (<><DialogHeader><DialogTitle>沿革节点</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Input value={editTimeline.year} onChange={e => setEditTimeline({ ...editTimeline, year: e.target.value })} placeholder="年份" />
            <Input value={editTimeline.title} onChange={e => setEditTimeline({ ...editTimeline, title: e.target.value })} placeholder="事件标题" />
            <Textarea className="col-span-2" value={editTimeline.description} onChange={e => setEditTimeline({ ...editTimeline, description: e.target.value })} />
          </div>
          <DialogFooter className="mt-4"><Button onClick={() => { persist({ ...db, timelineNodes: db.timelineNodes.some(t => t.id === editTimeline.id) ? db.timelineNodes.map(t => t.id === editTimeline.id ? editTimeline : t) : [...db.timelineNodes, editTimeline] }); setEditTimeline(null); toast.success("已保存"); }}>保存</Button></DialogFooter></>)}
        </DialogContent>
      </Dialog>

      {/* Service category dialog */}
      <Dialog open={!!editServiceCat} onOpenChange={o => !o && setEditServiceCat(null)}>
        <DialogContent>{editServiceCat && (<>
          <DialogHeader>
            <DialogTitle>{editServiceCat.channelId ? "编辑子栏目" : "新增子栏目"}</DialogTitle>
            <DialogDescription>配置学会服务页的 Tab 名称与内容类型</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input value={editServiceCat.navName} onChange={e => setEditServiceCat({ ...editServiceCat, navName: e.target.value })} placeholder="如：科学传播" />
            </div>
            <div className="space-y-2">
              <Label>栏目标识（英文/数字，唯一）</Label>
              <Input
                value={editServiceCat.channelCode}
                onChange={e => setEditServiceCat({ ...editServiceCat, channelCode: e.target.value })}
                disabled={!!editServiceCat.channelId}
                placeholder="svc_science"
              />
            </div>
            <div className="space-y-2">
              <Label>内容类型</Label>
              <Select
                value={editServiceCat.contentModule}
                onValueChange={v => {
                  const mod = v as ServiceContentModule;
                  setEditServiceCat({
                    ...editServiceCat,
                    contentModule: mod,
                    websiteTabKey: defaultWebsiteTabKey(mod),
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CONTENT_MODULE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>前台 Tab 标识</Label>
              <Input
                value={editServiceCat.websiteTabKey}
                onChange={e => setEditServiceCat({ ...editServiceCat, websiteTabKey: e.target.value })}
                placeholder="science / international / awards"
              />
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea rows={2} value={editServiceCat.subtitle ?? ""} onChange={e => setEditServiceCat({ ...editServiceCat, subtitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                value={editServiceCat.sortOrder}
                onChange={e => setEditServiceCat({ ...editServiceCat, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditServiceCat(null)}>取消</Button>
            <Button onClick={saveServiceCategory}>保存</Button>
          </DialogFooter>
        </>)}</DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewArticle} onOpenChange={o => !o && setPreviewArticle(null)}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>预览</DialogTitle><DialogDescription>{previewArticle?.title}</DialogDescription></DialogHeader>
          {previewArticle && (<div className="border rounded-md p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewArticle.content }} />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
