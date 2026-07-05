export type CmsContentStatus = "draft" | "published" | "archived";

// ── 新闻发布（会议通知 / 党务公开 / 重要新闻） ─────────────────────────────

export type CmsBoardType = "meeting_notice" | "party_public" | "important_news";

export const CMS_BOARD_TYPE_LABELS: Record<CmsBoardType, string> = {
  meeting_notice: "会议通知",
  party_public: "党务公开",
  important_news: "重要新闻",
};

export type CmsOriginalFileCategory = "document" | "audio" | "video" | "photo";

export const CMS_FILE_CATEGORY_LABELS: Record<CmsOriginalFileCategory, string> = {
  document: "文档类",
  audio: "音频类",
  video: "影视类",
  photo: "照片类",
};

export interface CmsOriginalFile {
  name: string;
  url: string;
  category: CmsOriginalFileCategory;
}

export interface CmsPublishArticle {
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

export interface CmsBoardCovers {
  meeting_notice: string;
  party_public: string;
  important_news: string;
}

// ── 公开文件下载区 ─────────────────────────────────────────────────────────

export type CmsPublicFileCategory = "document" | "audio" | "video" | "photo";

export const CMS_PUBLIC_FILE_CATEGORY_LABELS: Record<CmsPublicFileCategory, string> = {
  document: "文档类",
  audio: "音频类",
  video: "影视类",
  photo: "照片类",
};

/** 支持格式清单（含格式提示，供管理端展示） */
export const CMS_PUBLIC_FILE_FORMAT_HINTS: Record<CmsPublicFileCategory, { formats: string; convert: string[] }> = {
  document: {
    formats: ".doc / .docx（Word）、.pdf（PDF）、.xls / .xlsx（Excel）、.ppt / .pptx（PowerPoint）、.zip / .rar（压缩包）",
    convert: [
      "Word/Excel/PPT → PDF：Microsoft Office / WPS →「另存为 PDF」",
      "旧格式（.doc/.xls/.ppt）→ 新格式：Microsoft Office「另存为」选择新版格式",
      "多文件打包 → ZIP：Windows 右键「发送到压缩文件夹」/ Mac「压缩」",
    ],
  },
  audio: {
    formats: ".mp3（MP3）、.wav（WAV）、.m4a（M4A）",
    convert: [
      "任意音频 → MP3：Audacity（免费）→「导出为 MP3」",
      "视频提取音频 → MP3：FFmpeg 命令 ffmpeg -i 视频.mp4 -q:a 0 音频.mp3",
      "手机录音（AAC/AMR）→ MP3：格式工厂（免费）批量转换",
    ],
  },
  video: {
    formats: ".mp4（MP4）、.avi（AVI）、.mov（MOV）、.wmv（WMV）、.mkv（MKV）、.flv（FLV）",
    convert: [
      "任意格式 → MP4：HandBrake（免费）→ 选 MP4 容器 + H.264 编码，兼容性最佳",
      "MKV/AVI → MP4：格式工厂（Windows 免费）→「视频→MP4」",
      "MOV（iPhone/Mac）→ MP4：ffmpeg -i 视频.mov -c copy 视频.mp4",
      "压缩大视频：HandBrake 降低分辨率（1080p→720p）或调整码率",
    ],
  },
  photo: {
    formats: ".jpeg / .jpg（JPEG）、.png（PNG）、.gif（GIF）、.tiff（TIFF）",
    convert: [
      "任意图片 → JPEG/PNG：Windows 画图 / Mac 预览「导出」",
      "RAW/PSD → JPG：Photoshop「存储为 Web」/ GIMP（免费）「导出为」",
      "多图批量转换：IrfanView（Windows 免费）→「批量转换」",
      "TIFF（高质量印刷原稿）→ JPEG：Photoshop / GIMP 导出时调整品质",
    ],
  },
};

export interface CmsPublicFile {
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

/** 文件分类对应的格式扩展名白名单（用于前端提示） */
export const CMS_PUBLIC_FILE_EXT_MAP: Record<CmsPublicFileCategory, string[]> = {
  document: ["doc", "docx", "pdf", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
  audio: ["mp3", "wav", "m4a"],
  video: ["mp4", "avi", "mov", "wmv", "mkv", "flv"],
  photo: ["jpeg", "jpg", "png", "gif", "tiff"],
};

export interface CmsAttachment {
  id: string;
  name: string;
  url: string;
  memberOnly: boolean;
}

export interface CmsBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sort: number;
  branchId: string | null;
  enabled: boolean;
}

export interface CmsArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  status: CmsContentStatus;
  pinned: boolean;
  publishDate: string;
  branchId: string | null;
  scope: "society" | "party" | "branch";
  attachments: CmsAttachment[];
  showOnHomepage: boolean;
}

export interface CmsPage {
  id: string;
  code: string;
  title: string;
  content: string;
  status: CmsContentStatus;
  branchId: string | null;
  updatedAt: string;
  pageType: "richtext" | "party" | "branch";
}

export interface CmsPerson {
  id: string;
  name: string;
  title: string;
  group: string;
  bio: string;
  photoUrl: string;
  sort: number;
  branchId: string | null;
}

export interface CmsGalleryPhoto {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  sort: number;
  branchId: string | null;
}

export interface CmsAward {
  id: string;
  year: string;
  awardName: string;
  winner: string;
  description: string;
  branchId: string | null;
}

export interface CmsScienceItem {
  id: string;
  title: string;
  format: "article" | "video" | "base" | "book" | "fossil";
  category: string;
  summary: string;
  content: string;
  externalUrl: string;
  status: CmsContentStatus;
  branchId: string | null;
  publishDate: string;
}

export interface CmsInternationalItem {
  id: string;
  title: string;
  type: "news" | "conference" | "report" | "partner";
  summary: string;
  content: string;
  linkUrl: string;
  logoUrl: string;
  status: CmsContentStatus;
  publishDate: string;
}

export interface CmsTechRewardItem {
  id: string;
  title: string;
  type: "intro" | "guide";
  content: string;
  status: CmsContentStatus;
  updatedAt: string;
}

export interface CmsPartyArticle {
  id: string;
  column: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  status: CmsContentStatus;
  pinned: boolean;
  publishDate: string;
}

export interface CmsPartyTopic {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  articleIds: string[];
  status: CmsContentStatus;
}

export interface CmsDownloadFile {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileUrl: string;
  memberOnly: boolean;
  branchId: string | null;
  scope: "society" | "party" | "branch";
}

export interface CmsTimelineNode {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl: string;
  sort: number;
  branchId: string | null;
}

export interface CmsMediaItem {
  id: string;
  name: string;
  type: "image" | "document" | "video";
  category: string;
  url: string;
  sizeLabel: string;
  uploadedAt: string;
  refCount: number;
}

export interface CmsQuickLink {
  id: string;
  label: string;
  path: string;
  icon: string;
  sort: number;
  enabled: boolean;
}

export interface CmsSiteConfig {
  copyright: string;
  contactPhone: string;
  contactFax: string;
  contactEmail: string;
  address: string;
  zipCode: string;
  icpNumber: string;
  securityNumber: string;
  qrCodeWechat: string;
  qrCodeMember: string;
  friendLinks: { name: string; url: string }[];
  quickLinks: CmsQuickLink[];
}

export interface CmsDatabase {
  banners: CmsBanner[];
  news: CmsArticle[];
  announcements: CmsArticle[];
  pages: CmsPage[];
  personnel: CmsPerson[];
  galleryPhotos: CmsGalleryPhoto[];
  awards: CmsAward[];
  scienceItems: CmsScienceItem[];
  internationalItems: CmsInternationalItem[];
  techRewardItems: CmsTechRewardItem[];
  partyArticles: CmsPartyArticle[];
  partyTopics: CmsPartyTopic[];
  downloadFiles: CmsDownloadFile[];
  timelineNodes: CmsTimelineNode[];
  media: CmsMediaItem[];
  siteConfig: CmsSiteConfig;
  publishArticles: CmsPublishArticle[];
  boardCovers: CmsBoardCovers;
  publicFiles: CmsPublicFile[];
}

export const CMS_STORAGE_KEY = "paleo_admin_cms_db";
export const CMS_SCHEMA_VERSION = 3;

export const PARTY_COLUMNS = [
  { code: "party_announcement", label: "通知公告" },
  { code: "party_organizations", label: "党群机构" },
  { code: "party_committees", label: "党委纪委" },
  { code: "party_work", label: "党建工作" },
  { code: "party_activities", label: "组织生活" },
  { code: "party_team", label: "党员队伍建设" },
  { code: "party_theory", label: "理论学习专栏" },
  { code: "party_dynamics", label: "工作动态" },
  { code: "party_exemplars", label: "先进典型" },
  { code: "party_reporting", label: "违法违纪举报" },
] as const;

export const GALLERY_CATEGORIES = ["早期风采", "学术会议", "野外考查", "国际交流"];
export const SCIENCE_CATEGORIES = ["科普文章", "科普视频", "科普基地", "学术专著", "化石保护"];
export const DOWNLOAD_CATEGORIES_SOCIETY = ["管理办法", "学术标准", "年报资料", "会员表格"];
export const DOWNLOAD_CATEGORIES_PARTY = ["入党申请书", "思想汇报", "转正申请", "其他模板"];

export const DEFAULT_CMS: CmsDatabase = {
  banners: [
    {
      id: "banner-1",
      title: "中国古生物学会首页主 Banner",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDlNRleNYvnVjS703omdnq4SM-S4HAx1xJVPMOPltrMf3netfsxNQud338lNFjAxAV31Qvw_etAUmU7KMW1YX2RKxA0dIotwdignl1jKI4uZFvvhgyNMpO-uro4Ld7zpIKXe2gunUiSareQKqn3BzF2YiR1c6Mo4uJK52AGT3lz9FhR7rC91LMgbBgK9PpmNDIwMww8mYPVHIhMLQCaKNLMN8lTHz0YLT_5l_2At0BlIvczBqmME2kYLxSAm1wZ1q303vtfCEZnWQ4",
      linkUrl: "/intro",
      sort: 1,
      branchId: null,
      enabled: true,
    },
    {
      id: "banner-2",
      title: "天体生物学分会成立专题",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuChZnLBVeHAiOhUffpt-k42OMSP1acoKVaF3_S1KcQKeIU9ajRgy1Biwa_GhbFtEtv3BIf3g3SS1UCngWdi7QQRF7WsxAgrOsw2piyH2v16Sm54ybLgj7z9fFIiG17FEShTbPhN1OMvZGMQbaLsdWz_cnv75r6TYAAY5JzDSqw-HmWW3Fgfe-aWHSPG6MeAeVBYUdQqVHsgo_KqtkjNf6S7vlUv8tUwJItYPeIsWCP_G-hdPIyoBkDMCFtc_gf-B5100oHhGAmC-hc",
      linkUrl: "/society-announcements",
      sort: 2,
      branchId: null,
      enabled: true,
    },
    {
      id: "banner-wtxfh",
      title: "微体学分会学术活动 Banner",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDlNRleNYvnVjS703omdnq4SM-S4HAx1xJVPMOPltrMf3netfsxNQud338lNFjAxAV31Qvw_etAUmU7KMW1YX2RKxA0dIotwdignl1jKI4uZFvvhgyNMpO-uro4Ld7zpIKXe2gunUiSareQKqn3BzF2YiR1c6Mo4uJK52AGT3lz9FhR7rC91LMgbBgK9PpmNDIwMww8mYPVHIhMLQCaKNLMN8lTHz0YLT_5l_2At0BlIvczBqmME2kYLxSAm1wZ1q303vtfCEZnWQ4",
      linkUrl: "/branches/wtxfh",
      sort: 1,
      branchId: "wtxfh",
      enabled: true,
    },
  ],
  news: [
    {
      id: "news-1",
      title: "中国古生物学会天体生物学分会在南京成立",
      category: "学会要闻",
      summary: "分会成立仪式在南京举行，学会领导及多位院士出席。",
      content: "<p>中国古生物学会天体生物学分会正式成立……</p>",
      status: "published",
      pinned: true,
      publishDate: "2026-05-20",
      branchId: null,
      scope: "society",
      attachments: [],
      showOnHomepage: true,
    },
    {
      id: "news-2",
      title: "第十五届全国微体古生物学学术研讨会筹备工作启动",
      category: "工作动态",
      summary: "微体学分会发布会议筹备通知，欢迎各会员单位关注。",
      content: "<p>会议拟定于2026年秋季召开……</p>",
      status: "published",
      pinned: false,
      publishDate: "2026-05-12",
      branchId: "wtxfh",
      scope: "branch",
      attachments: [],
      showOnHomepage: false,
    },
  ],
  announcements: [
    {
      id: "ann-1",
      title: "关于开展2026年度「中国古生物学会科学技术奖」推荐及申报工作的通知",
      category: "奖励申报",
      summary: "学会现启动2026年度科学技术奖推荐工作。",
      content: "<p>请各会员单位按要求组织申报……</p>",
      status: "published",
      pinned: true,
      publishDate: "2024-10-25",
      branchId: null,
      scope: "society",
      attachments: [{ id: "att-1", name: "申报指南.pdf", url: "/media/science-award-notice.pdf", memberOnly: false }],
      showOnHomepage: true,
    },
    {
      id: "ann-wtxfh",
      title: "微体学分会2026年会员大会通知",
      category: "组织工作",
      summary: "本分会对有效会员发布会议通知。",
      content: "<p>请本分会在籍会员查阅附件……</p>",
      status: "published",
      pinned: false,
      publishDate: "2026-06-01",
      branchId: "wtxfh",
      scope: "branch",
      attachments: [{ id: "att-w1", name: "会议通知.pdf", url: "/media/branch-notice.pdf", memberOnly: true }],
      showOnHomepage: true,
    },
  ],
  pages: [
    {
      id: "page-1",
      code: "intro_overview",
      title: "学会概况",
      content: "<p>中国古生物学会成立于1929年，是全国性学术团体……</p>",
      status: "published",
      branchId: null,
      updatedAt: "2026-06-01",
      pageType: "richtext",
    },
    {
      id: "page-2",
      code: "intro_charter",
      title: "学会章程",
      content: "<p>第一章 总则……</p>",
      status: "published",
      branchId: null,
      updatedAt: "2026-05-15",
      pageType: "richtext",
    },
    {
      id: "page-party-org",
      code: "party_organizations",
      title: "党群机构",
      content: "<p>学会党群组织体系包括党群工作处、党支部委员会、工会、共青团委员会……</p>",
      status: "published",
      branchId: null,
      updatedAt: "2026-05-10",
      pageType: "party",
    },
    {
      id: "page-3",
      code: "branch_overview",
      title: "分会概况",
      content: "<p>本分会在古植物学领域开展学术活动……</p>",
      status: "published",
      branchId: "gzwxfh",
      updatedAt: "2026-04-20",
      pageType: "branch",
    },
  ],
  personnel: [
    {
      id: "person-1",
      name: "戎嘉余",
      title: "名誉理事长",
      group: "现任领导",
      bio: "中国科学院院士，古生物学家。",
      photoUrl: "",
      sort: 1,
      branchId: null,
    },
    {
      id: "person-2",
      name: "朱敏",
      title: "理事长",
      group: "现任领导",
      bio: "中国科学院古脊椎动物与古人类研究所研究员。",
      photoUrl: "",
      sort: 2,
      branchId: null,
    },
  ],
  galleryPhotos: [
    {
      id: "gal-1",
      title: "1950年代野外考察",
      category: "早期风采",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB-5UFr7wRFX7bCPr3VibXOHMw3e8uUVrVmPFzOCBdoRlyL3NPNHbAJIVZSj4y-MeIkd4GUV0XaYScTAMWf_iehw2NL0qB3tkVYY6M-BMrIQDb6FjmNxGDjPoDIg65rYIGEyaoluRwfAF0Y8BR6IZRReFnJbM8aUWlq1gbA3W2A0snXBXXdzOfZh3Re1XjXgTY5HVg0PmrDvUYPBY0hlR1FrqiAX7yIKslZLte1jow11NpNYMfMDohzZf9BgT6cwHqUDRf0DcdG303Z",
      sort: 1,
      branchId: null,
    },
    {
      id: "gal-2",
      title: "国际古生物学大会合影",
      category: "国际交流",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDEvYlo35Mb6q9OEif5aa6iUiP_oq9priQhtcpe-0yjuaIob_LuMN0Qk_l-TGY8-vJxDv_JPbtsodY4OMnqv0GM3mpkoO_sw9xrFv8cEYcFcs3j2HI20DqGKdvyUWajysaqIpyQ4EoO7V5NZrCLude6NvtkKHx-9bZTZfsj2QCuo7cQ3_CcV2uTZVLvN2uDbwMaUEd0-3G9cmM-amGpmFxDrkYsPf1woZ7tEO3cXVENfjl3yY5jfnSHA7R7t6LBj6DqNqQ0tW-RrXzH",
      sort: 2,
      branchId: null,
    },
  ],
  awards: [
    {
      id: "award-1",
      year: "2025",
      awardName: "中国古生物学会青年科学家奖",
      winner: "张三",
      description: "在寒武纪早期生命演化研究方面取得突出成果。",
      branchId: null,
    },
    {
      id: "award-2",
      year: "2024",
      awardName: "微体古生物学优秀论文奖",
      winner: "李四",
      description: "发表于《Palaeoworld》的代表性成果。",
      branchId: "wtxfh",
    },
  ],
  scienceItems: [
    {
      id: "sci-1",
      title: "化石保护：公众如何参与",
      format: "article",
      category: "科普文章",
      summary: "介绍化石保护法规与公众参与途径。",
      content: "<p>化石是不可再生的自然资源……</p>",
      externalUrl: "",
      status: "published",
      branchId: null,
      publishDate: "2026-04-10",
    },
    {
      id: "sci-2",
      title: "南京汤山地质博物馆科普基地",
      format: "base",
      category: "科普基地",
      summary: "学会共建科普教育基地介绍。",
      content: "<p>基地位于南京市……</p>",
      externalUrl: "",
      status: "published",
      branchId: null,
      publishDate: "2026-03-20",
    },
    {
      id: "sci-wtxfh",
      title: "微体化石鉴定入门（视频）",
      format: "video",
      category: "科普视频",
      summary: "分会科普视频示例。",
      content: "<p>嵌入代码：<iframe …></iframe></p>",
      externalUrl: "https://example.com/video",
      status: "published",
      branchId: "wtxfh",
      publishDate: "2026-05-01",
    },
  ],
  internationalItems: [
    {
      id: "intl-1",
      title: "中国古生物学家参与 IPC5 国际会议",
      type: "conference",
      summary: "学会代表团赴海外参加第五届国际古生物学大会。",
      content: "<p>会议期间……</p>",
      linkUrl: "",
      logoUrl: "",
      status: "published",
      publishDate: "2026-02-15",
    },
    {
      id: "intl-2",
      title: "Paleontological Society (USA)",
      type: "partner",
      summary: "合作机构展示。",
      content: "",
      linkUrl: "https://www.paleosoc.org",
      logoUrl: "/media/partner-logo.png",
      status: "published",
      publishDate: "2026-01-01",
    },
  ],
  techRewardItems: [
    {
      id: "tech-1",
      title: "中国古生物学会科学技术奖简介",
      type: "intro",
      content: "<p>科学技术奖设立宗旨与奖项设置……</p>",
      status: "published",
      updatedAt: "2026-05-01",
    },
    {
      id: "tech-2",
      title: "2026年度科学技术奖申报指南",
      type: "guide",
      content: "<p>申报条件、材料要求与截止时间……</p>",
      status: "published",
      updatedAt: "2026-05-15",
    },
  ],
  partyArticles: [
    {
      id: "party-1",
      column: "party_announcement",
      title: "关于认真学习贯彻习近平总书记在两院院士大会上重要讲话精神的通知",
      category: "重要批示",
      summary: "学会党委发布学习贯彻通知。",
      content: "<p>请各党支部认真组织学习……</p>",
      status: "published",
      pinned: true,
      publishDate: "2026-05-28",
    },
    {
      id: "party-2",
      column: "party_dynamics",
      title: "学会党委开展主题党日活动",
      category: "党建活动",
      summary: "赴红色教育基地参观学习。",
      content: "<p>活动纪实……</p>",
      status: "published",
      pinned: false,
      publishDate: "2026-05-10",
    },
    {
      id: "party-3",
      column: "party_activities",
      title: "2026年第一季度「三会一课」开展情况",
      category: "三会一课",
      summary: "各支部组织生活开展情况通报。",
      content: "<p>详情如下……</p>",
      status: "published",
      pinned: false,
      publishDate: "2026-04-30",
    },
  ],
  partyTopics: [
    {
      id: "topic-1",
      title: "党纪学习教育专题",
      description: "2026年阶段性专题，归集相关文章与成果。",
      coverUrl: "",
      articleIds: ["party-1", "party-2"],
      status: "published",
    },
  ],
  downloadFiles: [
    {
      id: "dl-1",
      title: "中国古生物学会会员登记表",
      category: "会员表格",
      fileName: "membership-form.docx",
      fileUrl: "/downloads/membership-form.docx",
      memberOnly: false,
      branchId: null,
      scope: "society",
    },
    {
      id: "dl-party-1",
      title: "入党申请书模板",
      category: "入党申请书",
      fileName: "party-application.doc",
      fileUrl: "/downloads/party-application.doc",
      memberOnly: false,
      branchId: null,
      scope: "party",
    },
    {
      id: "dl-wtxfh",
      title: "微体学分会会议简讯",
      category: "会议简讯",
      fileName: "wtxfh-newsletter.pdf",
      fileUrl: "/downloads/wtxfh-newsletter.pdf",
      memberOnly: true,
      branchId: "wtxfh",
      scope: "branch",
    },
  ],
  timelineNodes: [
    {
      id: "tl-1",
      year: "1929",
      title: "学会成立",
      description: "中国古生物学会在北京成立。",
      imageUrl: "",
      sort: 1,
      branchId: null,
    },
    {
      id: "tl-2",
      year: "1950",
      title: "学术活动恢复",
      description: "新中国成立后学会恢复学术活动。",
      imageUrl: "",
      sort: 2,
      branchId: null,
    },
  ],
  media: [
    {
      id: "media-1",
      name: "homepage-banner.jpg",
      type: "image",
      category: "首页",
      url: "/media/homepage-banner.jpg",
      sizeLabel: "1.2 MB",
      uploadedAt: "2026-06-01",
      refCount: 2,
    },
    {
      id: "media-2",
      name: "science-award-notice.pdf",
      type: "document",
      category: "公告附件",
      url: "/media/science-award-notice.pdf",
      sizeLabel: "856 KB",
      uploadedAt: "2026-05-28",
      refCount: 1,
    },
  ],
  siteConfig: {
    copyright: "© 2026 中国古生物学会 版权所有. All Rights Reserved.",
    contactPhone: "025-83282138",
    contactFax: "025-83357026",
    contactEmail: "psc@nigpas.ac.cn",
    address: "南京市北京东路39号",
    zipCode: "210008",
    icpNumber: "苏ICP备16036686号-1",
    securityNumber: "苏公网安备 32010202010139号",
    qrCodeWechat: "",
    qrCodeMember: "",
    friendLinks: [
      { name: "中国地理学会", url: "" },
      { name: "中国地质学会", url: "" },
      { name: "国际古生物协会 (IPA)", url: "" },
      { name: "亚洲古生物学会", url: "" },
    ],
    quickLinks: [
      { id: "ql-1", label: "会员注册", path: "/services", icon: "person_add", sort: 1, enabled: true },
      { id: "ql-2", label: "会费缴纳", path: "/services", icon: "payments", sort: 2, enabled: true },
      { id: "ql-3", label: "会议报名", path: "/services", icon: "event", sort: 3, enabled: true },
    ],
  },
  publishArticles: [
    {
      id: "pub-1",
      boardType: "meeting_notice",
      title: "关于举办2026年中国古生物学会学术年会的第一轮通知",
      summary: "中国古生物学会学术年会定于2026年9月在南京召开，现发布第一轮通知，请各位会员关注。",
      content: "<p>经学会理事会审议，中国古生物学会2026年学术年会将于2026年9月18日至21日在南京举行。本次年会以【古生物学与地球生命演化】为主题，欢迎广大会员踊跃投稿与参会。</p><p>报名与投稿详情将于第二轮通知发布，敬请关注。</p>",
      coverUrl: "",
      publishDate: "2026-06-20",
      status: "published",
      originalFile: {
        name: "2026年学术年会第一轮通知.pdf",
        url: "/media/meeting-notice-2026.pdf",
        category: "document",
      },
      createdBy: "admin",
    },
    {
      id: "pub-2",
      boardType: "party_public",
      title: "中国古生物学会功能性党委2026年上半年工作总结",
      summary: "学会功能性党委认真贯彻党的方针政策，积极开展党建工作，现予以公开。",
      content: "<p>2026年上半年，学会功能性党委围绕中心工作，扎实推进党建各项任务，组织全体党员开展专题学习6次，召开组织生活会2次，发展新党员1名。</p><p>下半年将继续深入学习贯彻习近平新时代中国特色社会主义思想，持续推进学习型党组织建设。</p>",
      coverUrl: "",
      publishDate: "2026-06-15",
      status: "published",
      originalFile: {
        name: "2026年上半年党建工作总结.docx",
        url: "/media/party-summary-2026.docx",
        category: "document",
      },
      createdBy: "admin",
    },
    {
      id: "pub-3",
      boardType: "important_news",
      title: "中国古生物学会天体生物学分会正式成立",
      summary: "中国古生物学会天体生物学分会成立大会在南京召开，标志着学会学科布局进一步完善。",
      content: "<p>2026年6月10日，中国古生物学会天体生物学分会成立大会在南京地质古生物研究所隆重召开。学会理事长及多位院士出席成立仪式。天体生物学分会的成立，将有力推动我国天体生物学与古生物学的交叉融合研究。</p>",
      coverUrl: "",
      publishDate: "2026-06-10",
      status: "published",
      originalFile: null,
      createdBy: "admin",
    },
  ],
  boardCovers: {
    meeting_notice: "",
    party_public: "",
    important_news: "",
  },
  publicFiles: [
    {
      id: "pf-1",
      title: "2026年学会图片大赛参赛规则与投稿说明",
      category: "document",
      fileName: "2026图片大赛参赛规则.pdf",
      fileUrl: "/media/photo-contest-2026.pdf",
      fileSize: "256 KB",
      remark: "适用于学会年度图片大赛参赛者",
      downloadCount: 0,
      uploadDate: "2026-06-18",
      deleted: false,
    },
    {
      id: "pf-2",
      title: "科普讲解大赛选手报名表（Word版）",
      category: "document",
      fileName: "科普讲解大赛报名表.docx",
      fileUrl: "/media/kepu-signup.docx",
      fileSize: "88 KB",
      remark: "填写完毕后发送至组委会邮箱",
      downloadCount: 0,
      uploadDate: "2026-06-18",
      deleted: false,
    },
    {
      id: "pf-3",
      title: "党组织学习教育活动宣传片（示例）",
      category: "video",
      fileName: "党建学习宣传片示例.mp4",
      fileUrl: "/media/party-promo.mp4",
      fileSize: "128 MB",
      remark: "供各分会党支部参考学习使用",
      downloadCount: 0,
      uploadDate: "2026-06-15",
      deleted: false,
    },
    {
      id: "pf-4",
      title: "古生物学会2025年优秀图片合集",
      category: "photo",
      fileName: "2025优秀图片合集.zip",
      fileUrl: "/media/photo-2025.zip",
      fileSize: "512 MB",
      remark: "2025年度图片大赛优秀作品集锦",
      downloadCount: 0,
      uploadDate: "2026-01-10",
      deleted: false,
    },
  ],
};

function migrateArticle(raw: Partial<CmsArticle>): CmsArticle {
  return {
    ...raw,
    attachments: raw.attachments ?? [],
    showOnHomepage: raw.showOnHomepage ?? false,
  } as CmsArticle;
}

function migratePage(raw: Partial<CmsPage>): CmsPage {
  return {
    ...raw,
    pageType: raw.pageType ?? "richtext",
  } as CmsPage;
}

function migrateMedia(raw: Partial<CmsMediaItem>): CmsMediaItem {
  return {
    ...raw,
    category: raw.category ?? "未分类",
  } as CmsMediaItem;
}

function migrateSiteConfig(raw: Partial<CmsSiteConfig> | undefined): CmsSiteConfig {
  const base = DEFAULT_CMS.siteConfig;
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    friendLinks: raw.friendLinks ?? base.friendLinks,
    quickLinks: raw.quickLinks ?? base.quickLinks,
  };
}

export function migrateCmsDatabase(raw: Partial<CmsDatabase>): CmsDatabase {
  return {
    banners: raw.banners ?? DEFAULT_CMS.banners,
    news: (raw.news ?? DEFAULT_CMS.news).map(migrateArticle),
    announcements: (raw.announcements ?? DEFAULT_CMS.announcements).map(migrateArticle),
    pages: (raw.pages ?? DEFAULT_CMS.pages).map(migratePage),
    personnel: raw.personnel ?? DEFAULT_CMS.personnel,
    galleryPhotos: raw.galleryPhotos ?? DEFAULT_CMS.galleryPhotos,
    awards: raw.awards ?? DEFAULT_CMS.awards,
    scienceItems: raw.scienceItems ?? DEFAULT_CMS.scienceItems,
    internationalItems: raw.internationalItems ?? DEFAULT_CMS.internationalItems,
    techRewardItems: raw.techRewardItems ?? DEFAULT_CMS.techRewardItems,
    partyArticles: raw.partyArticles ?? DEFAULT_CMS.partyArticles,
    partyTopics: raw.partyTopics ?? DEFAULT_CMS.partyTopics,
    downloadFiles: raw.downloadFiles ?? DEFAULT_CMS.downloadFiles,
    timelineNodes: raw.timelineNodes ?? DEFAULT_CMS.timelineNodes,
    publishArticles: raw.publishArticles ?? DEFAULT_CMS.publishArticles,
    boardCovers: { ...DEFAULT_CMS.boardCovers, ...(raw.boardCovers ?? {}) },
    publicFiles: raw.publicFiles ?? DEFAULT_CMS.publicFiles,
    media: (raw.media ?? DEFAULT_CMS.media).map(migrateMedia),
    siteConfig: migrateSiteConfig(raw.siteConfig),
  };
}

/** @deprecated 使用 fetchCmsDatabase() 从 API 加载 */
export function loadCmsDatabase(): CmsDatabase {
  const stored = localStorage.getItem(CMS_STORAGE_KEY);
  if (stored) {
    try {
      return migrateCmsDatabase(JSON.parse(stored) as Partial<CmsDatabase>);
    } catch { /* fall through */ }
  }
  return structuredClone(DEFAULT_CMS);
}

/** 从 CMS 后端 API 加载全量数据 */
export async function fetchCmsDatabase(): Promise<CmsDatabase> {
  const { listCmsEntries, ensureCmsAuth } = await import("@/lib/cms-api");
  const { entriesToDatabase, MODULES } = await import("@/lib/cms-sync");
  await ensureCmsAuth();
  const all = (
    await Promise.all(MODULES.map(m => listCmsEntries(m)))
  ).flat();
  const db = entriesToDatabase(all);
  localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(db));
  localStorage.setItem(`${CMS_STORAGE_KEY}_version`, String(CMS_SCHEMA_VERSION));
  return db;
}

/** 同步到 CMS 后端 API */
export async function saveCmsDatabase(next: CmsDatabase, prev: CmsDatabase): Promise<CmsDatabase> {
  const { upsertCmsEntry, deleteCmsEntry, listCmsEntries } = await import("@/lib/cms-api");
  const { databaseToEntries } = await import("@/lib/cms-sync");
  const prevEntries = databaseToEntries(prev);
  const nextEntries = databaseToEntries(next);

  const existingSettings = await listCmsEntries("settings");
  for (const entry of nextEntries) {
    if (entry.moduleCode === "settings" && entry.columnCode) {
      const found = existingSettings.find(e => e.columnCode === entry.columnCode);
      if (found?.entryId) entry.entryId = found.entryId;
    }
  }

  const nextIds = new Set(nextEntries.map(e => e.entryId).filter(Boolean));
  for (const e of prevEntries) {
    if (e.entryId && !nextIds.has(e.entryId)) {
      await deleteCmsEntry(e.entryId);
    }
  }
  for (const entry of nextEntries) {
    await upsertCmsEntry(entry);
  }
  return fetchCmsDatabase();
}

export function generateCmsId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export const CMS_STATUS_LABELS: Record<CmsContentStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已下架",
};
