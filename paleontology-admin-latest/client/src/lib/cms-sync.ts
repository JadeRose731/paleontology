/**
 * CmsDatabase ↔ API Entry 双向映射
 */
import type {
  CmsDatabase, CmsBanner, CmsArticle, CmsPage, CmsPerson, CmsGalleryPhoto,
  CmsAward, CmsScienceItem, CmsInternationalItem, CmsTechRewardItem,
  CmsPartyArticle, CmsPartyTopic, CmsDownloadFile, CmsTimelineNode,
  CmsMediaItem, CmsPublishArticle, CmsPublicFile, CmsSiteConfig, CmsBoardCovers,
} from "../pages/admin/cms/cms-data";
import {
  type ApiCmsEntry, fromApiStatus, parseExtra, toApiStatus, toExtra,
  entryIdStr, parseEntryId,
} from "./cms-api";

const MODULES = [
  "banners", "news", "announcements", "pages", "personnel", "gallery", "awards",
  "science", "international", "tech-rewards", "party", "downloads", "timeline",
  "media", "settings", "publish", "public-files",
] as const;

export function entriesToDatabase(entries: ApiCmsEntry[]): CmsDatabase {
  const db: CmsDatabase = {
    banners: [], news: [], announcements: [], pages: [], personnel: [],
    galleryPhotos: [], awards: [], scienceItems: [], internationalItems: [],
    techRewardItems: [], partyArticles: [], partyTopics: [], downloadFiles: [],
    timelineNodes: [], media: [], siteConfig: defaultSiteConfig(),
    publishArticles: [], boardCovers: { meeting_notice: "", party_public: "", important_news: "" },
    publicFiles: [],
  };

  for (const e of entries) {
    switch (e.moduleCode) {
      case "banners":
        db.banners.push(mapBanner(e));
        break;
      case "news":
        db.news.push(mapArticle(e));
        break;
      case "announcements":
        db.announcements.push(mapArticle(e));
        break;
      case "pages":
        db.pages.push(mapPage(e));
        break;
      case "personnel":
        db.personnel.push(mapPerson(e));
        break;
      case "gallery":
        db.galleryPhotos.push(mapGallery(e));
        break;
      case "awards":
        db.awards.push(mapAward(e));
        break;
      case "science":
        db.scienceItems.push(mapScience(e));
        break;
      case "international":
        db.internationalItems.push(mapIntl(e));
        break;
      case "tech-rewards":
        db.techRewardItems.push(mapTech(e));
        break;
      case "party":
        if (e.columnCode === "party_topic") db.partyTopics.push(mapTopic(e));
        else db.partyArticles.push(mapPartyArticle(e));
        break;
      case "downloads":
        db.downloadFiles.push(mapDownload(e));
        break;
      case "timeline":
        db.timelineNodes.push(mapTimeline(e));
        break;
      case "media":
        db.media.push(mapMedia(e));
        break;
      case "settings":
        if (e.columnCode === "site_config") {
          db.siteConfig = parseExtra<CmsSiteConfig>(e.extraJson, defaultSiteConfig());
        } else if (e.columnCode?.startsWith("board_cover_")) {
          const key = e.columnCode.replace("board_cover_", "") as keyof CmsBoardCovers;
          if (key in db.boardCovers) db.boardCovers[key] = e.coverUrl ?? "";
        }
        break;
      case "publish":
        db.publishArticles.push(mapPublish(e));
        break;
      case "public-files":
        db.publicFiles.push(mapPublicFile(e));
        break;
    }
  }

  db.banners.sort((a, b) => a.sort - b.sort);
  db.galleryPhotos.sort((a, b) => a.sort - b.sort);
  db.timelineNodes.sort((a, b) => a.sort - b.sort);
  db.personnel.sort((a, b) => a.sort - b.sort);
  return db;
}

export function databaseToEntries(db: CmsDatabase): ApiCmsEntry[] {
  const out: ApiCmsEntry[] = [];
  db.banners.forEach(b => out.push(bannerToEntry(b)));
  db.news.forEach(a => out.push(articleToEntry(a, "news")));
  db.announcements.forEach(a => out.push(articleToEntry(a, "announcements")));
  db.pages.forEach(p => out.push(pageToEntry(p)));
  db.personnel.forEach(p => out.push(personToEntry(p)));
  db.galleryPhotos.forEach(g => out.push(galleryToEntry(g)));
  db.awards.forEach(a => out.push(awardToEntry(a)));
  db.scienceItems.forEach(s => out.push(scienceToEntry(s)));
  db.internationalItems.forEach(i => out.push(intlToEntry(i)));
  db.techRewardItems.forEach(t => out.push(techToEntry(t)));
  db.partyArticles.forEach(p => out.push(partyArticleToEntry(p)));
  db.partyTopics.forEach(t => out.push(topicToEntry(t)));
  db.downloadFiles.forEach(d => out.push(downloadToEntry(d)));
  db.timelineNodes.forEach(t => out.push(timelineToEntry(t)));
  db.media.forEach(m => out.push(mediaToEntry(m)));
  out.push(siteConfigToEntry(db.siteConfig));
  (["meeting_notice", "party_public", "important_news"] as const).forEach(k => {
    if (db.boardCovers[k]) out.push(boardCoverToEntry(k, db.boardCovers[k]));
  });
  db.publishArticles.forEach(p => out.push(publishToEntry(p)));
  db.publicFiles.forEach(f => out.push(publicFileToEntry(f)));
  return out;
}

function defaultSiteConfig(): CmsSiteConfig {
  return {
    copyright: "© 2026 中国古生物学会 版权所有",
    contactPhone: "", contactEmail: "", address: "",
    friendLinks: [], quickLinks: [],
  };
}

function mapBanner(e: ApiCmsEntry): CmsBanner {
  const ex = parseExtra<{ enabled?: boolean; branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `banner-${e.entryId}`,
    title: e.title,
    imageUrl: e.coverUrl ?? "",
    linkUrl: e.linkUrl ?? "/",
    sort: e.sortOrder ?? 0,
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
    enabled: ex.enabled !== false && e.status === "PUBLISHED",
  };
}

function bannerToEntry(b: CmsBanner): ApiCmsEntry {
  return {
    entryId: parseEntryId(b.id) ?? undefined,
    associationId: b.branchId ? parseInt(b.branchId, 10) || null : null,
    moduleCode: "banners",
    title: b.title,
    coverUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    sortOrder: b.sort,
    status: b.enabled ? "PUBLISHED" : "ARCHIVED",
    scope: b.branchId ? "branch" : "society",
    extraJson: toExtra({ enabled: b.enabled, branchId: b.branchId }),
  };
}

function mapArticle(e: ApiCmsEntry): CmsArticle {
  const ex = parseExtra<{ attachments?: CmsArticle["attachments"]; showOnHomepage?: boolean; scope?: string; branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `art-${e.entryId}`,
    title: e.title,
    category: e.category ?? "",
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    status: fromApiStatus(e.status),
    pinned: e.pinned === "1",
    publishDate: e.publishTime?.split("T")[0] ?? e.publishTime?.split(" ")[0] ?? "",
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
    scope: (ex.scope as CmsArticle["scope"]) ?? (e.scope as CmsArticle["scope"]) ?? "society",
    attachments: ex.attachments ?? [],
    showOnHomepage: ex.showOnHomepage ?? false,
  };
}

function articleToEntry(a: CmsArticle, moduleCode: string): ApiCmsEntry {
  return {
    entryId: parseEntryId(a.id) ?? undefined,
    associationId: a.branchId ? parseInt(a.branchId, 10) || null : null,
    moduleCode,
    title: a.title,
    category: a.category,
    summary: a.summary,
    bodyContent: a.content,
    status: toApiStatus(a.status),
    pinned: a.pinned ? "1" : "0",
    publishTime: a.publishDate,
    scope: a.scope,
    extraJson: toExtra({ attachments: a.attachments, showOnHomepage: a.showOnHomepage, scope: a.scope, branchId: a.branchId }),
  };
}

function mapPage(e: ApiCmsEntry): CmsPage {
  const ex = parseExtra<{ pageType?: CmsPage["pageType"]; branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `page-${e.entryId}`,
    code: e.columnCode ?? "",
    title: e.title,
    content: e.bodyContent ?? "",
    status: fromApiStatus(e.status),
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
    updatedAt: e.publishTime?.split("T")[0] ?? "",
    pageType: ex.pageType ?? "richtext",
  };
}

function pageToEntry(p: CmsPage): ApiCmsEntry {
  return {
    entryId: parseEntryId(p.id) ?? undefined,
    associationId: p.branchId ? parseInt(p.branchId, 10) || null : null,
    moduleCode: "pages",
    columnCode: p.code,
    title: p.title,
    bodyContent: p.content,
    status: toApiStatus(p.status),
    publishTime: p.updatedAt,
    scope: p.branchId ? "branch" : "society",
    extraJson: toExtra({ pageType: p.pageType, branchId: p.branchId }),
  };
}

function mapPerson(e: ApiCmsEntry): CmsPerson {
  const ex = parseExtra<{ name?: string; bio?: string; photoUrl?: string; group?: string; branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `person-${e.entryId}`,
    name: ex.name ?? e.title,
    title: e.category ?? "",
    group: ex.group ?? e.summary ?? "",
    bio: ex.bio ?? e.bodyContent ?? "",
    photoUrl: ex.photoUrl ?? e.coverUrl ?? "",
    sort: e.sortOrder ?? 0,
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
  };
}

function personToEntry(p: CmsPerson): ApiCmsEntry {
  return {
    entryId: parseEntryId(p.id) ?? undefined,
    associationId: p.branchId ? parseInt(p.branchId, 10) || null : null,
    moduleCode: "personnel",
    title: p.name,
    category: p.title,
    summary: p.group,
    bodyContent: p.bio,
    coverUrl: p.photoUrl,
    sortOrder: p.sort,
    status: "PUBLISHED",
    scope: p.branchId ? "branch" : "society",
    extraJson: toExtra({ name: p.name, bio: p.bio, photoUrl: p.photoUrl, group: p.group, branchId: p.branchId }),
  };
}

function mapGallery(e: ApiCmsEntry): CmsGalleryPhoto {
  const ex = parseExtra<{ branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `gal-${e.entryId}`,
    title: e.title,
    category: e.category ?? "",
    imageUrl: e.coverUrl ?? e.mediaUrl ?? "",
    sort: e.sortOrder ?? 0,
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
  };
}

function galleryToEntry(g: CmsGalleryPhoto): ApiCmsEntry {
  return {
    entryId: parseEntryId(g.id) ?? undefined,
    moduleCode: "gallery",
    title: g.title,
    category: g.category,
    coverUrl: g.imageUrl,
    sortOrder: g.sort,
    status: "PUBLISHED",
    extraJson: toExtra({ branchId: g.branchId }),
    associationId: g.branchId ? parseInt(g.branchId, 10) || null : null,
  };
}

function mapAward(e: ApiCmsEntry): CmsAward {
  const ex = parseExtra<{ branchId?: string | null; awardName?: string; winner?: string }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `award-${e.entryId}`,
    year: e.category ?? "",
    awardName: ex.awardName ?? e.title,
    winner: ex.winner ?? e.summary ?? "",
    description: e.bodyContent ?? "",
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
  };
}

function awardToEntry(a: CmsAward): ApiCmsEntry {
  return {
    entryId: parseEntryId(a.id) ?? undefined,
    moduleCode: "awards",
    title: a.awardName,
    category: a.year,
    summary: a.winner,
    bodyContent: a.description,
    status: "PUBLISHED",
    extraJson: toExtra({ awardName: a.awardName, winner: a.winner, branchId: a.branchId }),
    associationId: a.branchId ? parseInt(a.branchId, 10) || null : null,
  };
}

function mapScience(e: ApiCmsEntry): CmsScienceItem {
  const ex = parseExtra<{ format?: CmsScienceItem["format"]; branchId?: string | null }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `sci-${e.entryId}`,
    title: e.title,
    format: ex.format ?? (e.columnCode as CmsScienceItem["format"]) ?? "article",
    category: e.category ?? "",
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    externalUrl: e.linkUrl ?? "",
    status: fromApiStatus(e.status),
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
    publishDate: e.publishTime?.split("T")[0] ?? "",
  };
}

function scienceToEntry(s: CmsScienceItem): ApiCmsEntry {
  return {
    entryId: parseEntryId(s.id) ?? undefined,
    moduleCode: "science",
    columnCode: s.format,
    title: s.title,
    category: s.category,
    summary: s.summary,
    bodyContent: s.content,
    linkUrl: s.externalUrl,
    status: toApiStatus(s.status),
    publishTime: s.publishDate,
    extraJson: toExtra({ format: s.format, branchId: s.branchId }),
    associationId: s.branchId ? parseInt(s.branchId, 10) || null : null,
  };
}

function mapIntl(e: ApiCmsEntry): CmsInternationalItem {
  return {
    id: entryIdStr(e.entryId) || `intl-${e.entryId}`,
    title: e.title,
    type: (e.columnCode as CmsInternationalItem["type"]) ?? "news",
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    linkUrl: e.linkUrl ?? "",
    logoUrl: e.coverUrl ?? "",
    status: fromApiStatus(e.status),
    publishDate: e.publishTime?.split("T")[0] ?? "",
  };
}

function intlToEntry(i: CmsInternationalItem): ApiCmsEntry {
  return {
    entryId: parseEntryId(i.id) ?? undefined,
    moduleCode: "international",
    columnCode: i.type,
    title: i.title,
    summary: i.summary,
    bodyContent: i.content,
    linkUrl: i.linkUrl,
    coverUrl: i.logoUrl,
    status: toApiStatus(i.status),
    publishTime: i.publishDate,
  };
}

function mapTech(e: ApiCmsEntry): CmsTechRewardItem {
  return {
    id: entryIdStr(e.entryId) || `tech-${e.entryId}`,
    title: e.title,
    type: (e.columnCode as CmsTechRewardItem["type"]) ?? "guide",
    content: e.bodyContent ?? "",
    status: fromApiStatus(e.status),
    updatedAt: e.publishTime?.split("T")[0] ?? "",
  };
}

function techToEntry(t: CmsTechRewardItem): ApiCmsEntry {
  return {
    entryId: parseEntryId(t.id) ?? undefined,
    moduleCode: "tech-rewards",
    columnCode: t.type,
    title: t.title,
    bodyContent: t.content,
    status: toApiStatus(t.status),
    publishTime: t.updatedAt,
  };
}

function mapPartyArticle(e: ApiCmsEntry): CmsPartyArticle {
  return {
    id: entryIdStr(e.entryId) || `party-${e.entryId}`,
    column: e.columnCode ?? "party_announcement",
    title: e.title,
    category: e.category ?? "",
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    status: fromApiStatus(e.status),
    pinned: e.pinned === "1",
    publishDate: e.publishTime?.split("T")[0] ?? "",
  };
}

function partyArticleToEntry(p: CmsPartyArticle): ApiCmsEntry {
  return {
    entryId: parseEntryId(p.id) ?? undefined,
    moduleCode: "party",
    columnCode: p.column,
    title: p.title,
    category: p.category,
    summary: p.summary,
    bodyContent: p.content,
    status: toApiStatus(p.status),
    pinned: p.pinned ? "1" : "0",
    publishTime: p.publishDate,
    scope: "party",
  };
}

function mapTopic(e: ApiCmsEntry): CmsPartyTopic {
  const ex = parseExtra<{ articleIds?: string[] }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `topic-${e.entryId}`,
    title: e.title,
    description: e.summary ?? "",
    coverUrl: e.coverUrl ?? "",
    articleIds: ex.articleIds ?? [],
    status: fromApiStatus(e.status),
  };
}

function topicToEntry(t: CmsPartyTopic): ApiCmsEntry {
  return {
    entryId: parseEntryId(t.id) ?? undefined,
    moduleCode: "party",
    columnCode: "party_topic",
    title: t.title,
    summary: t.description,
    coverUrl: t.coverUrl,
    status: toApiStatus(t.status),
    extraJson: toExtra({ articleIds: t.articleIds }),
    scope: "party",
  };
}

function mapDownload(e: ApiCmsEntry): CmsDownloadFile {
  const ex = parseExtra<{ fileName?: string; branchId?: string | null; scope?: string }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `dl-${e.entryId}`,
    title: e.title,
    category: e.category ?? "",
    fileName: ex.fileName ?? e.summary ?? "",
    fileUrl: e.fileUrl ?? "",
    memberOnly: e.memberOnly === "1",
    branchId: ex.branchId ?? (e.associationId != null ? String(e.associationId) : null),
    scope: (ex.scope as CmsDownloadFile["scope"]) ?? "society",
  };
}

function downloadToEntry(d: CmsDownloadFile): ApiCmsEntry {
  return {
    entryId: parseEntryId(d.id) ?? undefined,
    moduleCode: "downloads",
    title: d.title,
    category: d.category,
    fileUrl: d.fileUrl,
    memberOnly: d.memberOnly ? "1" : "0",
    summary: d.fileName,
    status: "PUBLISHED",
    scope: d.scope,
    extraJson: toExtra({ fileName: d.fileName, branchId: d.branchId, scope: d.scope }),
    associationId: d.branchId ? parseInt(d.branchId, 10) || null : null,
  };
}

function mapTimeline(e: ApiCmsEntry): CmsTimelineNode {
  return {
    id: entryIdStr(e.entryId) || `tl-${e.entryId}`,
    year: e.category ?? e.title,
    title: e.summary ?? "",
    description: e.bodyContent ?? "",
    imageUrl: e.coverUrl ?? "",
    sort: e.sortOrder ?? 0,
    branchId: e.associationId != null ? String(e.associationId) : null,
  };
}

function timelineToEntry(t: CmsTimelineNode): ApiCmsEntry {
  return {
    entryId: parseEntryId(t.id) ?? undefined,
    moduleCode: "timeline",
    title: t.year,
    category: t.year,
    summary: t.title,
    bodyContent: t.description,
    coverUrl: t.imageUrl,
    sortOrder: t.sort,
    status: "PUBLISHED",
  };
}

function mapMedia(e: ApiCmsEntry): CmsMediaItem {
  return {
    id: entryIdStr(e.entryId) || `media-${e.entryId}`,
    name: e.title,
    type: e.columnCode === "video" ? "video" : e.columnCode === "image" ? "image" : "document",
    category: e.category ?? "未分类",
    url: e.mediaUrl ?? e.fileUrl ?? "",
    sizeLabel: e.fileSize ? `${Math.round(Number(e.fileSize) / 1024)} KB` : "",
    uploadedAt: e.publishTime?.split("T")[0] ?? "",
    refCount: e.refCount ?? 0,
  };
}

function mediaToEntry(m: CmsMediaItem): ApiCmsEntry {
  return {
    entryId: parseEntryId(m.id) ?? undefined,
    moduleCode: "media",
    columnCode: m.type === "video" ? "video" : m.type === "image" ? "image" : "document",
    title: m.name,
    category: m.category,
    mediaUrl: m.url,
    fileUrl: m.url,
    refCount: m.refCount,
    status: "PUBLISHED",
  };
}

function mapPublish(e: ApiCmsEntry): CmsPublishArticle {
  const ex = parseExtra<{ originalFile?: CmsPublishArticle["originalFile"]; createdBy?: string }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `pub-${e.entryId}`,
    boardType: (e.columnCode as CmsPublishArticle["boardType"]) ?? "meeting_notice",
    title: e.title,
    summary: e.summary ?? "",
    content: e.bodyContent ?? "",
    coverUrl: e.coverUrl ?? "",
    publishDate: e.publishTime?.split("T")[0] ?? "",
    status: fromApiStatus(e.status),
    originalFile: ex.originalFile ?? null,
    createdBy: ex.createdBy ?? "admin",
  };
}

function publishToEntry(p: CmsPublishArticle): ApiCmsEntry {
  return {
    entryId: parseEntryId(p.id) ?? undefined,
    moduleCode: "publish",
    columnCode: p.boardType,
    title: p.title,
    summary: p.summary,
    bodyContent: p.content,
    coverUrl: p.coverUrl,
    status: toApiStatus(p.status),
    publishTime: p.publishDate,
    extraJson: toExtra({ originalFile: p.originalFile, createdBy: p.createdBy }),
  };
}

function mapPublicFile(e: ApiCmsEntry): CmsPublicFile {
  const ex = parseExtra<{ fileName?: string; fileSize?: string; remark?: string; downloadCount?: number; uploadDate?: string; deleted?: boolean }>(e.extraJson);
  return {
    id: entryIdStr(e.entryId) || `pf-${e.entryId}`,
    title: e.title,
    category: (e.columnCode as CmsPublicFile["category"]) ?? "document",
    fileName: ex.fileName ?? "",
    fileUrl: e.fileUrl ?? "",
    fileSize: ex.fileSize ?? "",
    remark: ex.remark ?? "",
    downloadCount: ex.downloadCount ?? 0,
    uploadDate: ex.uploadDate ?? e.publishTime?.split("T")[0] ?? "",
    deleted: ex.deleted ?? false,
  };
}

function publicFileToEntry(f: CmsPublicFile): ApiCmsEntry {
  return {
    entryId: parseEntryId(f.id) ?? undefined,
    moduleCode: "public-files",
    columnCode: f.category,
    title: f.title,
    fileUrl: f.fileUrl,
    status: f.deleted ? "ARCHIVED" : "PUBLISHED",
    extraJson: toExtra({
      fileName: f.fileName, fileSize: f.fileSize, remark: f.remark,
      downloadCount: f.downloadCount, uploadDate: f.uploadDate, deleted: f.deleted,
    }),
  };
}

function siteConfigToEntry(cfg: CmsSiteConfig): ApiCmsEntry {
  return {
    moduleCode: "settings",
    columnCode: "site_config",
    title: "站点配置",
    bodyContent: "",
    status: "PUBLISHED",
    extraJson: toExtra(cfg),
  };
}

function boardCoverToEntry(key: keyof CmsBoardCovers, url: string): ApiCmsEntry {
  return {
    moduleCode: "settings",
    columnCode: `board_cover_${key}`,
    title: `板块背景-${key}`,
    coverUrl: url,
    status: "PUBLISHED",
  };
}

export { MODULES };
