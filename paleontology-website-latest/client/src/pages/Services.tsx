import React, { useState, useEffect, useMemo } from "react";
import PartyLayout from "../components/PartyLayout";
import { Link, useLocation } from "wouter";
import { useMembership } from "../contexts/MembershipContext";
import { toast } from "sonner";
import LoginJoinDialog from "../components/LoginJoinDialog";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { formatDate, type ApiCmsEntry } from "@/lib/cms-api";
import type { ServiceContentModule } from "@/lib/services-categories";
import { pickAndReadFile, type UploadedFile } from "../lib/fileUpload";
import { CONFERENCE_STATUS_LABEL, CONFERENCE_STATUS_COLOR, CONFERENCE_STATUS, getConferenceFeeConfig as getConfiguredFeeConfig, type ConferenceFeeConfig, CONFERENCE_FEE_TYPE_LABEL, type ConferenceFeeType, ALL_SOCIETY_UNITS, TOTAL_SOCIETY_ID, TOTAL_SOCIETY_INTRO, TOTAL_SOCIETY_TAGS, TOTAL_SOCIETY_MEETINGS, isSocietyAccessible, isDeadlinePassed, sortConferencesSocietyFirst, ACCOMMODATION_TYPE_LABEL, type AccommodationType, FIELD_TRIP_PHASE_LABEL, type FieldTripRoute, type FieldTripSelections, createEmptyFieldTripSelections, createDefaultFieldTripRoutes, canSelectFieldTripRoute, validateFieldTripSelections, FIELD_TRIP_GENDER_RESTRICTION_LABEL } from "@shared/constants";

const SCIENCE_FORMAT_LABELS: Record<string, string> = {
  article: "科普动态",
  video: "科普视频",
  base: "科普基地",
  book: "科普期刊",
  fossil: "化石保护与利用",
};

const SCIENCE_FORMAT_ORDER = ["article", "video", "base", "book", "fossil"] as const;

const INTL_NAV = [
  { code: "news", label: "交流动态" },
  { code: "conference", label: "国际会议" },
  { code: "report", label: "重要报告" },
  { code: "partner", label: "合作机构" },
] as const;

const INTL_TYPE_LABELS: Record<string, string> = {
  news: "交流动态",
  conference: "国际会议",
  report: "重要报告",
  partner: "合作机构",
};

const INTL_TYPE_ICONS: Record<string, string> = {
  news: "public",
  report: "description",
  conference: "groups",
  partner: "handshake",
};

const AWARD_CARD_STYLES = [
  { icon: "star", color: "bg-yellow-50 border-yellow-200" },
  { icon: "trending_up", color: "bg-blue-50 border-blue-200" },
  { icon: "description", color: "bg-green-50 border-green-200" },
  { icon: "campaign", color: "bg-purple-50 border-purple-200" },
];

const CMS_TAB_ICONS: Record<ServiceContentModule, string> = {
  science: "campaign",
  international: "public",
  "tech-rewards": "workspace_premium",
};

const FALLBACK_CMS_SERVICE_TABS = [
  { navName: "国际交流", websiteTabKey: "international", contentModule: "international" as ServiceContentModule, subtitle: "外事手续指导、国际会议组织申报及国际合作机构联络。" },
  { navName: "科学传播", websiteTabKey: "science", contentModule: "science" as ServiceContentModule, subtitle: "科普文章、视频、基地与化石保护等内容。" },
  { navName: "科技奖励", websiteTabKey: "awards", contentModule: "tech-rewards" as ServiceContentModule, subtitle: "奖项介绍与申报指南。" },
];

const BRANCH_SERVICES_ID_MAP: Record<string, string> = {
  gwjz: "gwjzdwxfh",
  kpgz: "kpgzwyh",
  hszl: "hszlzwyh",
  wtx: "wtxfh",
};

export default function Services() {
  const [location, setLocation] = useLocation();
  const {
    currentUser,
    isLoggedIn,
    societyMembership,
    boundBranches,
    conferenceRegs,
    applySocietyMembership,
    submitMembershipVoucher,
    submitMembershipInvoice,
    toggleBranchBinding,
    payConference,
    submitConferenceVoucher,
    submitConferenceInvoice,
    submitConferenceForm,
    deleteAbstract,
    uploadAbstract,
    getMembershipFee,
    userType,
    membershipChoiceMade,
    chooseMembershipPath,
    getConferenceFee,
    getUserFeeType,
    getConferenceFeeConfig,
    canDownloadStampedNotice,
    canDownloadAbstractTemplate,
    canAccessConferenceForm,
    getConferenceFileUrl,
    // Phase 4: 摘要/住宿/野外
    uploadAbstractFile,
    setAccommodation,
    toggleFieldTripRoute,
    // Phase 6: 入会/退会申请
    membershipApplication,
    submitMembershipApplication,
    cancelMembershipApplication,
    getMembershipApplicationTemplateUrl,
  } = useMembership();

  // Parse URL query parameter for tab selection (e.g. /services?tab=member)
  const [activeTab, setActiveTab] = useState<string>("main");
  const [conferenceBranchFilter, setConferenceBranchFilter] = useState<string | null>(null);
  const [noticePreviewConfId, setNoticePreviewConfId] = useState<string | null>(null);
  const [scienceFormat, setScienceFormat] = useState<string>("all");
  const [intlTypeFilter, setIntlTypeFilter] = useState<string>("all");

  const { items: scienceCmsItems, loading: scienceLoading } = useCmsEntries({ moduleCode: "science" });
  const { items: intlCmsItems, loading: intlLoading } = useCmsEntries({ moduleCode: "international" });
  const { items: techCmsItems, loading: techLoading } = useCmsEntries({ moduleCode: "tech-rewards" });

  const filteredScienceItems = useMemo(() => {
    if (scienceFormat === "all") return scienceCmsItems;
    return scienceCmsItems.filter(i => (i.columnCode ?? "article") === scienceFormat);
  }, [scienceCmsItems, scienceFormat]);

  const filteredIntlItems = useMemo(() => {
    if (intlTypeFilter === "all") return intlCmsItems;
    return intlCmsItems.filter(i => (i.columnCode ?? "news") === intlTypeFilter);
  }, [intlCmsItems, intlTypeFilter]);

  const intlPartnerItems = useMemo(
    () => intlCmsItems.filter(i => (i.columnCode ?? "news") === "partner"),
    [intlCmsItems],
  );

  const techIntroItems = useMemo(
    () => techCmsItems.filter(i => (i.columnCode ?? "intro") === "intro"),
    [techCmsItems],
  );

  const techGuideItems = useMemo(
    () => techCmsItems.filter(i => (i.columnCode ?? "guide") === "guide"),
    [techCmsItems],
  );

  const { categories: cmsServiceCategories } = useServiceCategories();
  const cmsServiceTabs = cmsServiceCategories.length > 0 ? cmsServiceCategories : FALLBACK_CMS_SERVICE_TABS;

  const activeCmsCategory = cmsServiceTabs.find(c => c.websiteTabKey === activeTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const cmsTabKeys = cmsServiceTabs.map(c => c.websiteTabKey);
    const validTabs = ["branches", "member", "conference", "main", ...cmsTabKeys];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const branchParam = params.get("branch");
    if (branchParam) {
      setConferenceBranchFilter(branchParam);
    }
  }, [location, cmsServiceTabs]);

  // Dialog & Flow States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogOpenTab] = useState<"login" | "register">("login");
  const [showFeePayment, setShowFeePayment] = useState<string | null>(null); // branch ID
  const [paymentStep, setPaymentStep] = useState<number>(1);
  
  // Voucher upload local files mocks
  const [voucherFile, setVoucherFile] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);

  // Conference details flow states
  const [selectedConference, setSelectedConference] = useState<string | null>(null);
  const [confPaymentTarget, setConfPaymentTarget] = useState<string | null>(null);
  const [confPaymentStep, setConfPaymentStep] = useState<number>(1);
  const [confVoucher, setConfVoucher] = useState<UploadedFile | null>(null);
  const [confInvoice, setConfInvoice] = useState<UploadedFile | null>(null);
  const [editingReg, setEditingReg] = useState<string | null>(null);

  // Form state for conference registration
  const [regForm, setRegForm] = useState<any>({
    name: "",
    gender: "男",
    unit: "",
    role: "教师",
    accommodation: "自行安排",
    accommodationType: undefined as AccommodationType | undefined,
    session: "古脊椎动物演化与环境专场",
    presentationType: "仅参会",
    reportTitle: "",
    abstractFileName: "",
    abstractFileUrl: "",
    fieldTripSelections: createEmptyFieldTripSelections(),
  });

  // Simulator state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  // Member fee payment flow
  const [memberPayStep, setMemberPayStep] = useState(1);
  const [memberVoucher, setMemberVoucher] = useState<UploadedFile | null>(null);
  const [memberInvoice, setMemberInvoice] = useState<UploadedFile | null>(null);
  // Phase 6: 入会申请流程
  const [appFlowStep, setAppFlowStep] = useState(0); // 0=not started, 1=download template, 2=upload, 3=submitted
  const [memberAppFile, setMemberAppFile] = useState<UploadedFile | null>(null);

  // Sync profile data when editing conference form
  useEffect(() => {
    if (currentUser) {
      const existingReg = editingReg ? conferenceRegs[editingReg] : null;
      setRegForm((prev: any) => ({
        ...prev,
        name: prev.name || existingReg?.name || currentUser.name,
        gender: prev.gender || existingReg?.gender || currentUser.gender,
        unit: prev.unit || existingReg?.unit || currentUser.unit,
        role: prev.role || existingReg?.role || currentUser.role,
        accommodationType: prev.accommodationType || existingReg?.accommodationType || undefined,
        fieldTripSelections: prev.fieldTripSelections || existingReg?.fieldTripSelections || createEmptyFieldTripSelections(),
        abstractFileName: prev.abstractFileName || existingReg?.abstractFileName || "",
        abstractFileUrl: prev.abstractFileUrl || existingReg?.abstractFileUrl || "",
      }));
    }
  }, [currentUser, editingReg, conferenceRegs]);

  // Academic branches
  const branches = [
    { id: "gwjzdwxfh", name: "古无脊椎动物学分会", desc: "中国古生物学会古无脊椎动物学分会是中国古生物学会下的一个二级组织，2016年12月18日在贵州贵阳成立，致力于联合国内各单位相关专家，组织学术交流，强化科学普及活动。" },
    { id: "kpgzwyh", name: "科普工作委员会", desc: "团结全国广大地质古生物科普工作者，开展卓有成效的科普工作，扩大中国古生物学会在社会上的影响，提高全民科学素质。" },
    { id: "bfxfh", name: "孢粉学分会", desc: "从事孢粉学理论研究及其在生物地层、古生态、第四纪古环境中的应用，1979年于天津正式成立，中国是国际孢粉学会联合会的发起国之一。" },
    { id: "wtxfh", name: "微体学分会", desc: "1979年3月在长沙成立，在推动我国微体古生物学学术交流及学科发展、服务我国矿产能源勘探开发等方面做出了重要贡献。" },
    { id: "hszlzwyh", name: "化石藻类专业委员会", desc: "成立于1981年12月，是我国化石藻类专业科学技术工作组跨行业、跨部门自愿结合依法登记成立的公益性非营利社会学术团体。" },
    { id: "gzwxfh", name: "古植物学分会", desc: "1983年于西安成立，在古植物系统演化、古气候与古环境变化、碳循环等领域做出卓越贡献，在早期陆生植物演化等领域跻身世界前列。" },
    { id: "dqswx", name: "地球生物学分会", desc: "2018年9月18日在南京成立，旨在团结地球生物学科技工作者，推动国内地球生物学的发展与提升学科领域整体研究水平。" },
    { id: "gst", name: "古生态专业分会", desc: "1988年10月成立，旨在团结、组织全国古生态学工作者，研究化石记录中的生物与其当时生活物理、化学环境之间的相互制约关系。" },
    { id: "gjzdw", name: "古脊椎动物学分会", desc: "1984年10月17日在山东莱阳成立，团结全国古脊椎动物学工作者积极开展学术交流，提高古脊椎动物学研究的科学水平。" },
    { id: "swcj", name: "生物沉积学分会", desc: "2024年10月26日在中国地质大学（武汉）成立，旨在揭示生物参与发生在地球上各种沉积过程和化学循环的机制。" },
    { id: "xjsxff", name: "新技术新方法专业委员会", desc: "2024年12月7日成立，旨在搭建古生物新技术新方法的交流合作平台，推动古生物学研究与新技术、新方法的深度融合。" },
  ];

  // Conferences
  const conferences = [
    {
      id: "demo-conf",
      branchId: "gwjzdwxfh",
      title: "【演示会议】古无脊椎动物学学术工作坊",
      branchName: "古无脊椎动物学分会",
      time: "2026年06月15日",
      location: "线上 · 腾讯会议",
      fee: 300,
      status: "演示",
      feeDeadline: "2026-12-31",
      abstractDeadline: "2026-12-31",
      accommodationDeadline: "2026-12-31",
      fieldTripDeadline: "2026-12-31",
      fieldTripRoutes: createDefaultFieldTripRoutes("demo", "澄江"),
      desc: "这是一个演示会议，用于展示参会信息填写流程。会议费已审核通过，您可以直接点击'填写参会与报告信息'按钮体验完整的参会流程，包括选择报告类型、上传摘要、选择住宿等功能。"
    },
    {
      id: "conf-1",
      branchId: "wtxfh",
      title: "第十五届全国微体古生物学学术研讨会",
      branchName: "微体学分会",
      time: "2026年11月15日 - 11月18日",
      location: "江苏 · 南京",
      fee: 1200,
      status: "正在报名",
      feeDeadline: "2026-10-31",
      abstractDeadline: "2026-10-15",
      accommodationDeadline: "2026-11-08",
      fieldTripDeadline: "2026-11-08",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf1", "南京"),
      desc: "本次大会由中国古生物学会微体学分会主办，围绕'微体古生物与能源勘探、环境演变及精细生物地层学'开展广泛学术交流，热忱欢迎广大古生物学、地层学及石油地质领域的科研人员、高校师生及行业代表参会。"
    },
    {
      id: "conf-2",
      branchId: "gzwxfh",
      title: "2026年度古植物学与环境演变论坛",
      branchName: "古植物学分会",
      time: "2026年12月05日",
      location: "北京 · 中国科学院",
      fee: 800,
      status: "即将开启",
      feeDeadline: "2026-11-15",
      abstractDeadline: "2026-11-01",
      accommodationDeadline: "2026-11-28",
      fieldTripDeadline: "2026-11-28",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf2", "北京"),
      desc: "探讨陆地植物的多样性起源、古生代至新生代植被演替以及重大气候事件对陆地生态系统的重塑。会议将邀请多位国际知名学者作大会特邀报告。"
    },
    {
      id: "conf-3",
      branchId: "gjzdw",
      title: "热河生物群国际学术研讨会",
      branchName: "古脊椎动物学分会",
      time: "2027年03月20日",
      location: "辽宁 · 朝阳",
      fee: 1500,
      status: "预告通知",
      feeDeadline: "2027-02-28",
      abstractDeadline: "2027-02-10",
      accommodationDeadline: "2027-03-13",
      fieldTripDeadline: "2027-03-13",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf3", "朝阳"),
      desc: "纪念热河生物群发现百周年国际盛会，聚焦中生代陆相生态系统的辐射演化，包括羽毛恐龙、早期鸟类及被子植物的起源等世界级科学难题。"
    },
    {
      id: "conf-4",
      branchId: "gjzdw",
      title: "第十二届全国古脊椎动物学学术年会",
      branchName: "古脊椎动物学分会",
      time: "2026年09月18日 - 09月21日",
      location: "云南 · 昆明",
      fee: 1000,
      status: "正在报名",
      feeDeadline: "2026-08-31",
      abstractDeadline: "2026-08-15",
      accommodationDeadline: "2026-09-11",
      fieldTripDeadline: "2026-09-11",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf4", "昆明"),
      desc: "全国古脊椎动物学领域最重要的年度学术盛会，聚焦脊椎动物起源与演化、恐龙与鸟类关系、哺乳动物辐射演化等核心议题，欢迎国内外相关领域学者踊跃参会。"
    },
    {
      id: "conf-5",
      branchId: "bfxfh",
      title: "中国孢粉学会第十届全国学术大会",
      branchName: "孢粉学分会",
      time: "2026年10月22日 - 10月25日",
      location: "广东 · 广州",
      fee: 900,
      status: "正在报名",
      feeDeadline: "2026-09-30",
      abstractDeadline: "2026-09-15",
      accommodationDeadline: "2026-10-15",
      fieldTripDeadline: "2026-10-15",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf5", "广州"),
      desc: "汇聚全国孢粉学研究力量，围绕孢粉化石与古气候重建、第四纪环境演变、生物地层精细划分等热点议题开展深入交流，并设有孢粉鉴定技术培训专场。"
    },
    {
      id: "conf-6",
      branchId: "gst",
      title: "古生态学与古环境重建国际研讨会",
      branchName: "古生态专业分会",
      time: "2026年08月10日 - 08月13日",
      location: "四川 · 成都",
      fee: 1100,
      status: "正在报名",
      feeDeadline: "2026-07-20",
      abstractDeadline: "2026-07-05",
      accommodationDeadline: "2026-08-01",
      fieldTripDeadline: "2026-08-01",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf6", "成都"),
      desc: "聚焦化石记录中生物与古环境的相互关系，探讨古生态系统对重大地质事件的响应机制，涵盖群落古生态、功能形态学及古食物网重建等前沿方向。"
    },
    {
      id: "conf-7",
      branchId: "dqswx",
      title: "地球生物学前沿论坛",
      branchName: "地球生物学分会",
      time: "2026年07月05日 - 07月07日",
      location: "湖北 · 武汉",
      fee: 600,
      status: "即将开启",
      feeDeadline: "2026-06-20",
      abstractDeadline: "2026-06-10",
      accommodationDeadline: "2026-06-28",
      fieldTripDeadline: "2026-06-28",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf7", "武汉"),
      desc: "聚焦生物与地球系统的协同演化，探讨生物成矿、碳循环与生命起源等重大科学问题，是地球生物学分会成立以来规模最大的年度学术活动。"
    },
    {
      id: "conf-8",
      branchId: "xjsxff",
      title: "古生物学新技术新方法专题研讨会",
      branchName: "新技术新方法专业委员会",
      time: "2026年11月28日 - 11月30日",
      location: "湖北 · 武汉（中国地质大学）",
      fee: 500,
      status: "即将开启",
      feeDeadline: "2026-11-10",
      abstractDeadline: "2026-11-01",
      accommodationDeadline: "2026-11-21",
      fieldTripDeadline: "2026-11-21",
      fieldTripRoutes: createDefaultFieldTripRoutes("conf8", "武汉"),
      desc: "专注于CT扫描、三维重建、同步辐射、人工智能识别等新技术在古生物学研究中的最新应用，设有技术演示与实操培训环节，欢迎对新技术感兴趣的研究人员参加。"
    },
    // Phase 2: 总学会会议
    {
      id: "conf-zgswxh-1",
      branchId: "zgswxh",
      title: "中国古生物学会第32届学术年会",
      branchName: "中国古生物学会（总学会）",
      time: "2026年10月15日 - 10月19日",
      location: "江苏 · 南京",
      fee: 1500,
      status: "正在报名",
      feeDeadline: "2026-09-15",
      abstractDeadline: "2026-08-30",
      accommodationDeadline: "2026-10-08",
      fieldTripDeadline: "2026-10-08",
      fieldTripRoutes: createDefaultFieldTripRoutes("zgs1", "南京"),
      desc: "中国古生物学会主办的最高级别全国性学术年会，涵盖古无脊椎动物、古脊椎动物、古植物、孢粉、微体、地球生物学等全部分支学科。大会将邀请多位院士和国际知名学者作大会特邀报告，设有全部分会场的学术交流环节，是古生物学界两年一度的学术盛会。"
    },
    {
      id: "conf-zgswxh-2",
      branchId: "zgswxh",
      title: "中国古生物学会国际古生物学前沿论坛",
      branchName: "中国古生物学会（总学会）",
      time: "2027年04月10日 - 04月13日",
      location: "北京 · 中国科学院",
      fee: 2000,
      status: "预告通知",
      feeDeadline: "2027-03-15",
      abstractDeadline: "2027-03-01",
      accommodationDeadline: "2027-04-03",
      fieldTripDeadline: "2027-04-03",
      fieldTripRoutes: createDefaultFieldTripRoutes("zgs2", "北京"),
      desc: "由总学会主办的国际性高端学术论坛，聚焦古生物学领域最新前沿进展，包括早期生命演化、关键演化转折期、古环境与古气候重建等重大科学议题。邀请Nature、Science等顶刊近期发表成果的作者进行专题报告，促进国际学术合作与交流。"
    }
  ];

  const mockVoucherUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuCYIKxophjI9VUuetJuvkK5GcwQg2Yx4mJ6ad4thQyAGyXg_aJDk8e6Pqsg_WjOL9LtO7UbUlGghcpyhwbvGagEsopXe-xqv4bzd2K9b4nmSyIIjSnUGX0E7hCfWWyovFuLLGrcmbFHTdTvRvOWx_9rVuc9AJcscqZNQq5wj1Jfg6V4QDrOrL-Rdx8NywF5ELn7lY4rzQHwhGRxrq3gBIUZscn5alwj4Ep09ZvZY_jZP8MSsqxALmnA_YG9MZikpA497cfcoKNoS38";

  const getMemberFeeOnly = (confId: string) => getConferenceFeeConfig(confId).nonStudentMember;
  const getNonMemberFeeOnly = (confId: string) => getConferenceFeeConfig(confId).nonStudentNonMember;

  const openConferenceForm = (confId: string) => {
    if (!canAccessConferenceForm(confId)) {
      toast.error("缴费终审确认（confirmed）后方可填写参会信息。");
      return;
    }
    setEditingReg(confId);
  };

  // ==========================================================================
  // RENDER: MAIN PORTAL (code3)
  // ==========================================================================
  const renderMainPortal = () => (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-white border-b border-[#E5E1DA] py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-30 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <span className="font-bold text-xs tracking-widest text-[#715a3e] block mb-4 uppercase">SOCIETY SERVICE PORTAL</span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#002B49] mb-6 leading-tight font-serif" style={{ fontFamily: "Georgia, serif" }}>
              为古生物学研究<br />注入科学与数字力量
            </h1>
            <p className="text-base text-slate-600 mb-8 leading-relaxed">
              中国古生物学会学术服务门户，为您提供便捷的在线会员申请、学术会议报名、国际交流项目合作、科普教育传播及国家科技奖励申报一站式数字化服务。
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setActiveTab("branches")} className="bg-[#002B49] hover:bg-[#001f35] text-white px-8 py-3 rounded-lg font-bold text-sm transition-all shadow-md flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">account_tree</span> 专业分会
              </button>
              <button onClick={() => setActiveTab(cmsServiceTabs[0]?.websiteTabKey ?? "international")} className="border border-[#002B49] text-[#002B49] hover:bg-slate-50 px-8 py-3 rounded-lg font-bold text-sm transition-all">
                {cmsServiceTabs[0]?.navName ?? "国际交流"}
              </button>
            </div>
          </div>
          <div className="hidden md:block w-1/3 aspect-square relative">
            <div className="absolute inset-0 bg-[#f5e0ba] opacity-20 rounded-full blur-3xl"></div>
            <img alt="Fossil" className="w-full h-full object-contain mix-blend-multiply filter contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYIKxophjI9VUuetJuvkK5GcwQg2Yx4mJ6ad4thQyAGyXg_aJDk8e6Pqsg_WjOL9LtO7UbUlGghcpyhwbvGagEsopXe-xqv4bzd2K9b4nmSyIIjSnUGX0E7hCfWWyovFuLLGrcmbFHTdTvRvOWx_9rVuc9AJcscqZNQq5wj1Jfg6V4QDrOrL-Rdx8NywF5ELn7lY4rzQHwhGRxrq3gBIUZscn5alwj4Ep09ZvZY_jZP8MSsqxALmnA_YG9MZikpA497cfcoKNoS38" />
          </div>
        </div>

        {/* Quick Services Grid */}
        <div className="max-w-7xl mx-auto px-6 mt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 专业分会 */}
            <div onClick={() => setActiveTab("branches")} className="bg-white border-t-4 border-[#002B49] border-x border-b border-[#E5E1DA] p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group rounded-b-lg">
              <div className="bg-slate-100 w-12 h-12 flex items-center justify-center rounded-lg mb-4 group-hover:bg-[#002B49] transition-colors">
                <span className="material-symbols-outlined text-[#002B49] group-hover:text-white">account_tree</span>
              </div>
              <h3 className="font-bold text-lg text-[#002B49] mb-2">专业分会</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">下耆11个专业分会（委员会），覆盖古生物学各主要研究领域，点击了解各分会详情。</p>
              <span className="flex items-center text-[#715a3e] font-bold text-xs tracking-widest">了解分会 <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span></span>
            </div>
            {/* 会员服务 */}
            <div onClick={() => setActiveTab("member")} className="bg-white border-t-4 border-[#002B49] border-x border-b border-[#E5E1DA] p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group rounded-b-lg">
              <div className="bg-slate-100 w-12 h-12 flex items-center justify-center rounded-lg mb-4 group-hover:bg-[#002B49] transition-colors">
                <span className="material-symbols-outlined text-[#002B49] group-hover:text-white">card_membership</span>
              </div>
              <h3 className="font-bold text-lg text-[#002B49] mb-2">会员服务</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">在线申请入会、缴纳会费、绑定专业分会，享受正式会员专属权益与学术会议优惠。</p>
              <span className="flex items-center text-[#715a3e] font-bold text-xs tracking-widest">申请入会 <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span></span>
            </div>
            {/* 学术会议 */}
            <div onClick={() => setActiveTab("conference")} className="bg-white border-t-4 border-[#002B49] border-x border-b border-[#E5E1DA] p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group rounded-b-lg">
              <div className="bg-slate-100 w-12 h-12 flex items-center justify-center rounded-lg mb-4 group-hover:bg-[#002B49] transition-colors">
                <span className="material-symbols-outlined text-[#002B49] group-hover:text-white">event</span>
              </div>
              <h3 className="font-bold text-lg text-[#002B49] mb-2">学术会议</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">浏览各分会发布的学术会议，在线报名、缴纳注册费、上传摘要并填写参会信息。</p>
              <span className="flex items-center text-[#715a3e] font-bold text-xs tracking-widest">浏览会议 <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span></span>
            </div>
            {cmsServiceTabs.map(cat => (
              <div
                key={cat.websiteTabKey}
                onClick={() => setActiveTab(cat.websiteTabKey)}
                className="bg-white border-t-4 border-[#002B49] border-x border-b border-[#E5E1DA] p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group rounded-b-lg"
              >
                <div className="bg-slate-100 w-12 h-12 flex items-center justify-center rounded-lg mb-4 group-hover:bg-[#002B49] transition-colors">
                  <span className="material-symbols-outlined text-[#002B49] group-hover:text-white">{CMS_TAB_ICONS[cat.contentModule]}</span>
                </div>
                <h3 className="font-bold text-lg text-[#002B49] mb-2">{cat.navName}</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{cat.subtitle ?? "了解详情与服务内容。"}</p>
                <span className="flex items-center text-[#715a3e] font-bold text-xs tracking-widest">了解更多 <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News & Notifications Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Latest News */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#002B49] flex items-center gap-3 font-serif">
                最新学术动态 <span className="bg-[#715a3e] h-[2px] w-12 rounded-full"></span>
              </h2>
              <button className="text-xs font-bold text-[#715a3e] hover:underline">浏览全部</button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 group cursor-pointer">
                <div className="flex-shrink-0 w-32 h-20 bg-slate-100 overflow-hidden rounded-lg border border-[#E5E1DA]">
                  <img alt="News" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwBlYTJn5H-3flv59YIjLgJvKRVGDGSKdV2RBMtHlU_VE_8YLzBZtY7husS1CyRbGwgD8P-61mYr8qm0_etQEb70qOzzZqEGIrExcAlO76g5NQZhpB0mNrx4SpzYld71GxSVHWlfND4vzyXkUZY4DsQKoo1MsMkw4IEzQt8qgtjGlL2-vZpeq0Fc3n89-jMlX3MBzFb3ShAMzOY3AJ8BMabc1_6H3LzePpbkMEiJt3Aol0iBy1g-SqTX74AvnM4m7TZTPIB6DVsRw" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#715a3e]">2026.05.28</span>
                  <h4 className="text-sm font-bold text-[#002B49] group-hover:text-[#715a3e] transition-colors mb-1">中国古生物学会微体古生物学分会理事会顺利召开</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">理事会确定了第十五届全国学术研讨会的具体日程及特邀专家人选，并对分会会费收缴工作进行了统一部署...</p>
                </div>
              </div>
              <div className="flex gap-4 group cursor-pointer">
                <div className="flex-shrink-0 w-32 h-20 bg-slate-100 overflow-hidden rounded-lg border border-[#E5E1DA]">
                  <img alt="News" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWsU2kYBHrnG-GqB9moVKqDOO7ltmqvZqCJeCWgkojEoYZ223lqsbCHoNVNwvZLTLn_Aj2asB4rl7DayvXNv4nzC6d63sK7FLJxHBEgSiRgn2tcCkPXQ5fl4_1Y9YtY7F8Le4UR2_ofxW2Lj8rqAXagLDzRsyb_ZKU6NB6LVEIHRViw215TIkNUlvO7nxwZjXXBxTNirTKhYiIRrN5dg3WCz11aJpNguI8WAh5zSQ_NaF93_Y76ftO4D_yILrJ3o93eESSQ-Rgpl8" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#715a3e]">2026.05.15</span>
                  <h4 className="text-sm font-bold text-[#002B49] group-hover:text-[#715a3e] transition-colors mb-1">孢粉学分会在澄江科普基地开展"探索生命演化"研学活动</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">活动吸引了来自全国50余名中学生参与，通过显微镜观察化石孢粉，激发了青少年对地球生命科学的浓厚兴趣...</p>
                </div>
              </div>
            </div>
          </div>
          {/* Notifications */}
          <div className="bg-slate-50 p-8 rounded-xl border border-[#E5E1DA]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#002B49] flex items-center gap-3 font-serif">
                最新通知公告 <span className="bg-[#002B49] h-[2px] w-12 rounded-full"></span>
              </h2>
              <Link href="/society-announcements">
                <span className="text-xs font-bold text-[#002B49] hover:underline cursor-pointer">查看列表</span>
              </Link>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 p-4 bg-white border-l-4 border-[#715a3e] rounded-r-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("branches")}>
                <div className="flex flex-col items-center justify-center bg-slate-100 w-12 h-12 rounded-lg flex-shrink-0">
                  <span className="font-bold text-[#002B49] text-sm">01</span>
                  <span className="text-[9px] text-slate-500 font-bold">JUN</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#002B49] hover:text-[#715a3e] transition-colors">关于开展2026年度学会分会会费收缴工作的通知</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">请各分会、专业委员会及全体会员登录服务门户及时缴纳2026年度会费...</p>
                </div>
              </li>
              <li className="flex items-start gap-4 p-4 bg-white border-l-4 border-[#002B49] rounded-r-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("branches")}>
                <div className="flex flex-col items-center justify-center bg-slate-100 w-12 h-12 rounded-lg flex-shrink-0">
                  <span className="font-bold text-[#002B49] text-sm">15</span>
                  <span className="text-[9px] text-slate-500 font-bold">MAY</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#002B49] hover:text-[#715a3e] transition-colors">第十五届全国微体古生物学学术研讨会一号通知</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">研讨会将于2026年11月在南京召开，摘要提交及早期注册现已开放...</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );

  // ==========================================================================
  // RENDER: MEMBER SERVICES (code2 + code7 + code10)
  // ==========================================================================
  // RENDER: MEMBER SERVICES -- 统一学会会费 + 分会绑定
  // ==========================================================================
  const renderMemberServices = () => {
    if (!isLoggedIn) {
      return (
        <div className="max-w-md mx-auto py-20 px-6 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">lock</span>
          <h2 className="text-xl font-bold text-[#002B49] mb-2">请先登录</h2>
          <p className="text-xs text-slate-500 mb-6">登录后可申请成为中国古生物学会会员，并自由绑定您感兴趣的专业分会。</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setDialogOpenTab("login"); setDialogOpen(true); }} className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md">
              登录账号
            </button>
            <button onClick={() => { setDialogOpenTab("register"); setDialogOpen(true); }} className="border border-[#002B49] text-[#002B49] hover:bg-slate-50 px-6 py-2 rounded font-bold text-xs">
              注册账号
            </button>
          </div>
        </div>
      );
    }

    const isMemberActive = societyMembership?.status === "active";
    const isMemberPending = societyMembership?.status === "voucher_submitted" || societyMembership?.status === "invoice_submitted" || societyMembership?.status === "pending";
    const isMemberRejected = societyMembership?.status === "voucher_rejected" || societyMembership?.status === "invoice_rejected" || societyMembership?.status === "rejected";
    const isMemberInvoicePending = societyMembership?.status === "invoice_pending";
    const isMemberInvoiceOverdue = societyMembership?.status === "invoice_overdue";
    const isMemberExpired = societyMembership?.status === "expired";
    // Phase 6: 入会申请状态
    const isAppSubmitted = societyMembership?.status === "application_submitted";
    const isAppRejected = societyMembership?.status === "application_rejected";
    const isAppApproved = societyMembership?.status === "application_approved";
    const isWithdrawalSubmitted = societyMembership?.status === "withdrawal_submitted";
    const isWithdrawn = societyMembership?.status === "withdrawn";
    const hasApplied = isMemberActive || isMemberPending || isMemberRejected || isMemberInvoicePending || isMemberInvoiceOverdue || isMemberExpired || isAppSubmitted || isAppRejected || isAppApproved || isWithdrawalSubmitted || isWithdrawn;
    const isNonMember = userType === "non_member";
    const isRegular = userType === "regular";

    // ── 缴费流程 ──────────────────────────────────────────────────────────────
    if (showFeePayment === "society") {
      const SOCIETY_FEE = getMembershipFee("standard");

      const handleVoucherUpload = () => {
        pickAndReadFile(".jpg,.jpeg,.png,.pdf", 5, (file) => {
          setMemberVoucher(file);
          toast.success("缴费凭证上传成功！");
        });
      };
      const handleInvoiceUpload = async () => {
        if (societyMembership?.status !== "invoice_pending" && societyMembership?.status !== "invoice_overdue") {
          toast.error("请先等待凭证初审通过后再上传发票。");
          return;
        }
        if (!memberInvoice) {
          toast.error("请先点击上方区域选择电子发票文件");
          return;
        }
        const ok = await submitMembershipInvoice(memberInvoice.dataUrl, memberInvoice.name);
        if (ok) {
          setMemberPayStep(1);
          setMemberVoucher(null);
          setMemberInvoice(null);
          setShowFeePayment(null);
        }
      };
      const handlePaymentSubmit = async () => {
        if (!memberVoucher) {
          toast.error("请先上传银行转账/汇款凭证截图或照片！");
          return;
        }
        const ok = await submitMembershipVoucher(memberVoucher.dataUrl, SOCIETY_FEE, memberVoucher.name);
        if (ok) {
          setMemberPayStep(1);
          setMemberVoucher(null);
          setMemberInvoice(null);
          setShowFeePayment(null);
        }
      };

      return (
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="mb-8 text-xs text-slate-500 flex items-center gap-2">
            <button onClick={() => { setShowFeePayment(null); setMemberPayStep(1); }} className="hover:text-[#002B49] transition-colors">会员服务</button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">缴纳学会会费</span>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-2xl font-bold text-[#002B49] mb-2 font-serif">中国古生物学会 · 会费缴纳</h1>
            <p className="text-xs text-slate-600 max-w-2xl mx-auto">缴纳一次统一会费，即成为中国古生物学会正式会员，可自由绑定任意专业分会，享受分会推送的会议通知与学术资讯。</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-12 relative max-w-2xl mx-auto">
            <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-200 -z-10"></div>
            {[
              { num: 1, label: "确认账户与金额" },
              { num: 2, label: "银行汇款/转账" },
              { num: 3, label: "上传凭证提交" },
              { num: 4, label: "上传发票" }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 bg-white px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors border-2 ${
                  memberPayStep >= step.num ? "bg-[#002B49] text-white border-[#002B49]" : "bg-white text-slate-400 border-slate-200"
                }`}>{step.num}</div>
                <span className={`text-[10px] font-bold ${memberPayStep >= step.num ? "text-[#002B49]" : "text-slate-400"}`}>{step.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {memberPayStep === 1 && (
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="p-6 rounded-lg bg-slate-50 border border-[#E5E1DA]">
                  <div className="flex items-center space-x-2 mb-6">
                    <span className="material-symbols-outlined text-[#002B49]">account_balance</span>
                    <h2 className="text-base font-bold text-[#002B49]">缴费项目明细</h2>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">缴费项目</span>
                      <span className="font-bold text-[#002B49]">中国古生物学会会费</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">会员类型</span>
                      <span className="font-bold">个人会员（普通）</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">有效期</span>
                      <span className="font-bold">1 年（自审核通过之日起算）</span>
                    </div>
                    <div className="flex justify-between items-center bg-white border border-[#E5E1DA] p-3 rounded-lg mt-4">
                      <span className="font-bold text-[#002B49]">应缴会费金额</span>
                      <span className="text-xl font-bold text-[#002B49]">¥ {SOCIETY_FEE} 元</span>
                    </div>
                  </div>
                </section>

                <section className="p-6 rounded-lg bg-slate-50 border border-[#E5E1DA]">
                  <div className="flex items-center space-x-2 mb-6">
                    <span className="material-symbols-outlined text-[#002B49]">payments</span>
                    <h2 className="text-base font-bold text-[#002B49]">学会收款银行账户</h2>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-bold mb-1">户名</p>
                      <div className="font-bold text-[#002B49] flex justify-between items-center bg-white p-2 rounded border border-[#E5E1DA]">
                        <span>中国古生物学会</span>
                        <button onClick={() => { navigator.clipboard.writeText("中国古生物学会"); toast.success("户名已复制！"); }} className="text-[#715a3e] hover:underline text-[10px]">复制</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold mb-1">开户银行</p>
                      <p className="font-bold text-slate-700 bg-white p-2 rounded border border-[#E5E1DA]">中国工商银行南京成贤街支行</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold mb-1">银行账号</p>
                      <div className="font-bold text-[#002B49] flex justify-between items-center bg-white p-2 rounded border border-[#E5E1DA]">
                        <span>4301 0108 0900 1146 512</span>
                        <button onClick={() => { navigator.clipboard.writeText("4301 0108 0900 1146 512"); toast.success("银行账号已复制！"); }} className="text-[#715a3e] hover:underline text-[10px]">复制</button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg mt-6 text-xs text-amber-800 leading-relaxed">
                <span className="material-symbols-outlined align-middle text-sm mr-1">info</span>
                <strong>重要提示：</strong>请通过手机银行或柜台进行线下汇款转账，备注填写：<strong>"{currentUser?.name} 学会会费"</strong>，以便财务快速认领。
              </div>

              <div className="flex justify-center space-x-4 mt-10">
                <button onClick={() => { setShowFeePayment(null); setMemberPayStep(1); }} className="px-8 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all">
                  取消返回
                </button>
                <button onClick={() => setMemberPayStep(2)} className="px-8 py-2.5 bg-[#002B49] hover:bg-[#001f35] text-white rounded-lg font-bold text-xs transition-all shadow-md">
                  已完成汇款，下一步上传凭证
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {memberPayStep === 2 && (
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm text-center">
              <span className="material-symbols-outlined text-5xl text-[#002B49] mb-4">account_balance_wallet</span>
              <h2 className="text-lg font-bold text-[#002B49] mb-4">汇款转账确认</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                请确认已向学会账户汇入 <strong>¥ {SOCIETY_FEE} 元</strong> 会费。<br />
                汇出后请点击下方按钮，上传汇款成功的电子回单截图或手机银行截图。
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setMemberPayStep(1)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs">上一步</button>
                <button onClick={() => setMemberPayStep(3)} className="px-6 py-2 bg-[#002B49] text-white rounded-lg font-bold text-xs shadow-md">汇款已完成，去上传凭证</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {memberPayStep === 3 && (
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
              <h2 className="text-base font-bold text-[#002B49] mb-6 text-center">阶段一：上传汇款回单凭证</h2>
              <div className="max-w-lg mx-auto space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>提示：</strong>先上传汇款凭证等待初审，初审通过后再上传电子发票（阶段二）。
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">汇款/转账凭证回单（必传）*</label>
                  <div onClick={handleVoucherUpload} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${memberVoucher ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:bg-slate-50 hover:border-[#002B49]"}`}>
                    {memberVoucher ? (
                      <div>
                        <span className="material-symbols-outlined text-4xl text-green-600 mb-2">check_circle</span>
                        <p className="text-xs font-bold text-green-700">已上传：{memberVoucher.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">点击可重新上传</p>
                      </div>
                    ) : (
                      <div>
                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                        <p className="text-xs font-bold text-[#002B49]">点击上传转账电子回单</p>
                        <p className="text-[10px] text-slate-400 mt-1">支持 JPG/PNG 格式，单张 ≤ 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center space-x-4 pt-6 border-t border-slate-100">
                  <button onClick={() => setMemberPayStep(2)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs">上一步</button>
                  <button onClick={handlePaymentSubmit} className="px-8 py-2 bg-[#002B49] hover:bg-[#001f35] text-white rounded-lg font-bold text-xs shadow-md">提交凭证，等待初审</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: 上传电子发票（凭证初审通过后） */}
          {memberPayStep === 4 && (
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
              <h2 className="text-base font-bold text-[#002B49] mb-6 text-center">上传电子发票</h2>
              <div className="max-w-lg mx-auto space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                  <p className="font-bold mb-1">凭证初审已通过</p>
                  <p>请于 <strong>{societyMembership?.invoiceDeadline || "--"}</strong> 前上传电子发票（JPG/PNG/PDF ≤10MB）。</p>
                  {societyMembership?.invoiceExtendedDeadline && (
                    <p className="mt-1 text-blue-600">截止日已延期至：{societyMembership.invoiceExtendedDeadline}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">电子发票（必传）*</label>
                  <div onClick={() => {
                    pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => {
                      setMemberInvoice(file);
                      toast.success("电子发票上传成功！");
                    });
                  }} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${memberInvoice ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:bg-slate-50 hover:border-[#002B49]"}`}>
                    {memberInvoice ? (
                      <div>
                        <span className="material-symbols-outlined text-4xl text-green-600 mb-2">check_circle</span>
                        <p className="text-xs font-bold text-green-700">已上传：{memberInvoice.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">点击可重新上传</p>
                      </div>
                    ) : (
                      <div>
                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">receipt_long</span>
                        <p className="text-xs font-bold text-[#002B49]">点击上传电子发票</p>
                        <p className="text-[10px] text-slate-400 mt-1">支持 JPG/PNG/PDF 格式，单张 ≤ 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center space-x-4 pt-6 border-t border-slate-100">
                  <button onClick={() => setMemberPayStep(3)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs">上一步</button>
                  <button onClick={handleInvoiceUpload} disabled={!memberInvoice} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs shadow-md">
                    提交发票，等待终审
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── 会员主页面 ────────────────────────────────────────────────────────────
    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: 个人信息 + 会员状态 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 个人信息卡 */}
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#f5e0ba] opacity-10 rounded-full translate-x-8 -translate-y-8"></div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#002B49] text-white flex items-center justify-center font-bold text-2xl font-serif">
                  {currentUser?.name?.[0] || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002B49]">{currentUser?.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{currentUser?.unit}</p>
                  {isNonMember && (
                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">非会员</span>
                  )}
                  {isRegular && (
                    <span className="inline-block bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">待选择参与方式</span>
                  )}
                  {isMemberActive && (
                    <span className="inline-block bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">✓ 学会正式会员</span>
                  )}
                  {societyMembership?.status === "voucher_submitted" && (
                    <span className="inline-block bg-yellow-100 text-yellow-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">⏳ 凭证初审中</span>
                  )}
                  {societyMembership?.status === "invoice_pending" && (
                    <span className="inline-block bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">待上传发票</span>
                  )}
                  {societyMembership?.status === "invoice_overdue" && (
                    <span className="inline-block bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">发票逾期</span>
                  )}
                  {societyMembership?.status === "invoice_submitted" && (
                    <span className="inline-block bg-yellow-100 text-yellow-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">⏳ 发票终审中</span>
                  )}
                  {isMemberRejected && (
                    <span className="inline-block bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">✗ 凭证/发票被驳回</span>
                  )}
                  {isMemberExpired && (
                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">会员已过期</span>
                  )}
                  {isAppSubmitted && (
                    <span className="inline-block bg-yellow-100 text-yellow-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">⏳ 入会申请审核中</span>
                  )}
                  {isAppRejected && (
                    <span className="inline-block bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">✗ 入会申请被驳回</span>
                  )}
                  {isAppApproved && (
                    <span className="inline-block bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">✓ 入会申请已通过</span>
                  )}
                  {isWithdrawalSubmitted && (
                    <span className="inline-block bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">退会申请审核中</span>
                  )}
                  {isWithdrawn && (
                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">已退会</span>
                  )}
                  {!hasApplied && (
                    <span className="inline-block bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full mt-2">尚未入会</span>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">姓名</span>
                  <span className="font-bold text-slate-700">{currentUser?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">单位</span>
                  <span className="font-bold text-slate-700">{currentUser?.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">电子邮箱</span>
                  <span className="font-bold text-slate-500">{currentUser?.email}</span>
                </div>
              </div>
            </div>

            {/* 学会会员状态卡 */}
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#002B49] border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">card_membership</span> 学会会员状态
              </h3>

              {/* 非会员状态 */}
              {isNonMember && (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person</span>
                  <p className="text-xs text-slate-600 mb-1 font-bold">您当前为非会员</p>
                  <p className="text-xs text-slate-500 mb-4">会议注册费将按非会员标准收取。<br />升级为正式会员可享受优惠价。</p>
                  <button
                    onClick={() => {
                      chooseMembershipPath("member");
                      setAppFlowStep(1);
                    }}
                    className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md w-full"
                  >
                    升级为正式会员（¥{getMembershipFee("standard")}/年）
                  </button>
                </div>
              )}

              {/* Phase 6: 入会申请流程（含退会后重新申请路径） */}
              {((!isNonMember && !isRegular && !hasApplied) || (isWithdrawn && appFlowStep > 0)) && (
                <div className="space-y-4 py-2">
                  {appFlowStep === 0 && (
                    <div className="text-center py-6 space-y-4">
                      <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">card_membership</span>
                      <p className="text-xs text-slate-600 mb-1 font-bold">您已选择成为正式会员</p>
                      <p className="text-xs text-slate-500">请先提交入会申请书，经管理员审核通过后方可缴纳会费。</p>
                      <button
                        onClick={() => setAppFlowStep(1)}
                        className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md w-full"
                      >
                        开始申请入会
                      </button>
                    </div>
                  )}
                  {appFlowStep === 1 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                        <p className="font-bold mb-1">Step 1/3：下载入会申请书模板</p>
                        <p className="text-blue-700">请下载下方的入会申请书模板，填写后上传。</p>
                      </div>
                      <button
                        onClick={() => {
                          const url = getMembershipApplicationTemplateUrl();
                          if (url) { window.open(url, "_blank"); toast.success("模板下载已开始"); }
                          else { toast.info("当前无可用模板，请直接上传您的入会申请书。"); }
                        }}
                        className="w-full border-2 border-dashed border-[#002B49] text-[#002B49] hover:bg-slate-50 px-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        下载入会申请书模板
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setAppFlowStep(0)} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">返回</button>
                        <button onClick={() => setAppFlowStep(2)} className="flex-1 bg-[#002B49] text-white rounded-lg font-bold text-xs py-2">已下载，下一步上传</button>
                      </div>
                    </div>
                  )}
                  {appFlowStep === 2 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                        <p className="font-bold mb-1">Step 2/3：上传入会申请书</p>
                        <p className="text-blue-700">请上传填写完整的入会申请书（.doc/.docx/.pdf）。</p>
                      </div>
                      <div onClick={() => {
                        pickAndReadFile(".doc,.docx,.pdf", 10, (file) => {
                          setMemberAppFile(file);
                          toast.success("入会申请书上传成功！");
                        });
                      }} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${memberAppFile ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:bg-slate-50 hover:border-[#002B49]"}`}>
                        {memberAppFile ? (
                          <div>
                            <span className="material-symbols-outlined text-4xl text-green-600 mb-2">check_circle</span>
                            <p className="text-xs font-bold text-green-700">已上传：{memberAppFile.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">点击可重新上传</p>
                          </div>
                        ) : (
                          <div>
                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                            <p className="text-xs font-bold text-[#002B49]">点击上传入会申请书</p>
                            <p className="text-[10px] text-slate-400 mt-1">支持 .doc / .docx / .pdf 格式</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setAppFlowStep(1); setMemberAppFile(null); }} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">上一步</button>
                        <button
                          onClick={async () => {
                            if (!memberAppFile) { toast.error("请先上传入会申请书"); return; }
                            chooseMembershipPath("member");
                            const ok = await submitMembershipApplication(memberAppFile.dataUrl, memberAppFile.name);
                            if (ok) {
                              setMemberAppFile(null);
                              setAppFlowStep(0);
                            }
                          }}
                          disabled={!memberAppFile}
                          className="flex-1 bg-[#002B49] hover:bg-[#001f35] disabled:opacity-40 text-white rounded-lg font-bold text-xs py-2"
                        >
                          提交申请，等待审核
                        </button>
                      </div>
                    </div>
                  )}
                  {appFlowStep === 3 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                      <p className="font-bold mb-1">⏳ 入会申请已提交</p>
                      <p className="text-yellow-700 leading-relaxed">您的入会申请书已提交，管理员将在1-3个工作日内审核。审核通过后即可进入缴费环节。</p>
                      <button
                        onClick={() => { cancelMembershipApplication(); setAppFlowStep(0); setMemberAppFile(null); }}
                        className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs py-2"
                      >
                        撤销申请
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 6: 入会申请已提交 / 审核中 */}
              {isAppSubmitted && !appFlowStep && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                  <p className="font-bold mb-1">⏳ 入会申请已提交</p>
                  <p className="text-yellow-700 leading-relaxed">您的入会申请书已提交，管理员将在1-3个工作日内审核。审核通过后即可进入缴费环节。</p>
                  {membershipApplication?.applicationFileName && (
                    <p className="text-yellow-600 text-[10px]">已上传：{membershipApplication.applicationFileName}</p>
                  )}
                  <button
                    onClick={() => { cancelMembershipApplication(); setAppFlowStep(0); }}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs py-2"
                  >
                    撤销申请
                  </button>
                </div>
              )}

              {/* Phase 6: 入会申请被驳回 */}
              {isAppRejected && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-3">
                  <p className="font-bold">✗ 入会申请被驳回</p>
                  <p className="text-red-700 leading-relaxed">驳回原因：{membershipApplication?.rejectReason || "申请书不符合要求"}</p>
                  <button
                    onClick={() => { setAppFlowStep(1); setMemberAppFile(null); }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-xs w-full"
                  >
                    重新提交申请
                  </button>
                </div>
              )}

              {/* Phase 6: 入会申请已通过 → 进入缴费 */}
              {isAppApproved && (
                <div className="space-y-3 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-bold text-green-700 mb-1">✓ 入会申请已通过</p>
                    <p className="text-green-600">您的入会申请书已审核通过，请缴纳会费完成入会。</p>
                  </div>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(1); }}
                    className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md w-full"
                  >
                    立即缴纳会费（¥{getMembershipFee("standard")}/年）
                  </button>
                </div>
              )}

              {/* Phase 6: 退会申请审核中 */}
              {isWithdrawalSubmitted && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs text-orange-800 space-y-3">
                  <p className="font-bold mb-1">⏳ 退会申请审核中</p>
                  <p className="text-orange-700 leading-relaxed">您的退会申请书已提交，管理员审核通过后会员资格将即时终止。</p>
                  <p className="text-orange-600 text-[10px]">⚠ 退会后已缴费的待参会订单保留，可继续以非会员身份参会。</p>
                </div>
              )}

              {/* Phase 6: 已退会 */}
              {isWithdrawn && appFlowStep === 0 && (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="font-bold text-slate-600 mb-1">已退会</p>
                    <p className="text-slate-500">您已退出中国古生物学会，可继续以非会员身份参加学术会议。</p>
                    <p className="text-slate-400 text-[10px] mt-1">如需重新成为会员，点击下方按钮开始重新申请流程。</p>
                  </div>
                  <button
                    onClick={() => {
                      chooseMembershipPath("member");
                      setAppFlowStep(1);
                    }}
                    className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md w-full"
                  >
                    重新申请入会
                  </button>
                </div>
              )}

              {isRegular && !hasApplied && (
                <div className="text-center py-6 space-y-4">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_add</span>
                  <p className="text-xs text-slate-500">您尚未申请成为学会会员。<br />提交入会申请书经审核通过后，缴纳会费即可成为正式会员。</p>
                  <button
                    onClick={() => {
                      chooseMembershipPath("member");
                      setAppFlowStep(1);
                    }}
                    className="bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2 rounded font-bold text-xs shadow-md w-full"
                  >
                    开始申请入会
                  </button>
                </div>
              )}

              {/* 凭证初审中 */}
              {societyMembership?.status === "voucher_submitted" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                  <p className="font-bold mb-1">⏳ 凭证初审中</p>
                  <p className="text-yellow-700 leading-relaxed">您的汇款凭证已提交，请等待学会财务人工审核（通常 1-3 个工作日）。</p>
                </div>
              )}

              {/* 待上传发票 + 可绑定分会 */}
              {isMemberInvoicePending && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-3">
                  <p className="font-bold mb-1">凭证初审已通过！</p>
                  <p className="text-blue-700 leading-relaxed">请于 <strong>{societyMembership?.invoiceDeadline}</strong> 前上传电子发票。您现在可以绑定专业分会。</p>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(4); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-xs"
                  >
                    上传电子发票
                  </button>
                </div>
              )}

              {/* 发票逾期 */}
              {isMemberInvoiceOverdue && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs text-orange-800 space-y-3">
                  <p className="font-bold mb-1">⚠ 发票上传已逾期</p>
                  <p className="text-orange-700 leading-relaxed">发票上传截止日 {societyMembership?.invoiceDeadline} 已过，会员资格暂时锁定。请尽快上传发票。</p>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(4); }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-bold text-xs"
                  >
                    立即上传发票
                  </button>
                </div>
              )}

              {/* 发票终审中 */}
              {societyMembership?.status === "invoice_submitted" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                  <p className="font-bold mb-1">⏳ 发票终审中</p>
                  <p className="text-yellow-700 leading-relaxed">电子发票已提交，财务人员正在进行终审。终审通过后会员资格正式生效。</p>
                </div>
              )}

              {/* 驳回（凭证或发票） */}
              {isMemberRejected && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-3">
                  <p className="font-bold">✗ {societyMembership?.status === "invoice_rejected" ? "发票终审被驳回" : "凭证初审被驳回"}</p>
                  <p className="text-red-700 leading-relaxed">驳回原因：{societyMembership?.voucherRejectReason || societyMembership?.invoiceRejectReason || societyMembership?.rejectReason || "凭证不清晰，请重新上传"}</p>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(societyMembership?.status === "invoice_rejected" ? 4 : 3); }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-xs w-full"
                  >
                    {societyMembership?.status === "invoice_rejected" ? "重新上传发票" : "重新上传凭证"}
                  </button>
                </div>
              )}

              {isMemberActive && (
                <div className="space-y-3 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-bold text-green-700 mb-1">✓ 会员资格有效</p>
                    <p className="text-green-600">有效期至：<strong>{societyMembership?.expiryDate}</strong></p>
                    <p className="text-green-600 mt-1">缴费金额：¥ {getMembershipFee("standard")} 元</p>
                  </div>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(1); }}
                    className="w-full text-xs text-[#002B49] font-bold hover:underline border border-slate-200 py-2 rounded-lg hover:bg-slate-50"
                  >
                    提前续费
                  </button>
                </div>
              )}

              {isMemberExpired && (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="font-bold text-slate-600 mb-1">会员资格已过期</p>
                    <p className="text-slate-500">过期日期：{societyMembership?.expiryDate}</p>
                  </div>
                  <button
                    onClick={() => { setShowFeePayment("society"); setMemberPayStep(1); }}
                    className="bg-[#002B49] hover:bg-[#001f35] text-white px-4 py-2 rounded font-bold text-xs w-full"
                  >
                    立即续费（¥{getMembershipFee("standard")}/年）
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: 分会绑定管理 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#002B49]">会议绑定管理</h2>
                  <p className="text-slate-400 text-[10px] mt-1">
                    {isWithdrawn
                      ? "您已退会，原有分会绑定关系保留，仍可以非会员身份接收会议通知并参加学术会议。"
                      : userType === "regular"
                      ? "请先选择「会员」或「非会员」参与方式，即可绑定任意专业分会；总学会会议对所有注册用户可见。"
                      : userType === "member"
                      ? "您是学会正式会员，可自由绑定或解绑任意专业分会；绑定后接收该分会会议通知与学术资讯。"
                      : "您是注册非会员，可直接绑定任意专业分会并按非会员标准报名会议；总学会会议无需绑定即可查看。"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-[#D9C5A0]/20 text-[#715a3e] text-[10px] font-bold px-2 py-0.5 rounded">
                    总学会：默认已绑定
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                    分会：已绑定 {boundBranches.length} / 11
                  </span>
                </div>
              </div>

              {userType === "regular" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-xs text-amber-800 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
                  <div>
                    <p className="font-bold">请先选择参与方式</p>
                    <p className="mt-1">登录后选择「成为正式会员」或「作为非会员继续」，两种身份均可绑定分会并报名会议（按各自标准缴费）。</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* 总学会模块 -- 默认绑定、不可解绑 */}
                <div className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all border-green-300 bg-green-50/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[#002B49] text-sm">中国古生物学会（总学会）</h4>
                      <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">已绑定</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{TOTAL_SOCIETY_INTRO}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setConferenceBranchFilter("zgswxh");
                        setActiveTab("conference");
                        setSelectedConference(null);
                        setEditingReg(null);
                      }}
                      className="px-3 py-1.5 rounded font-bold text-xs border border-[#002B49] text-[#002B49] hover:bg-[#002B49] hover:text-white transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">event</span>查看会议
                    </button>
                    <button disabled className="px-4 py-1.5 rounded font-bold text-xs bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200">
                      无需解绑
                    </button>
                  </div>
                </div>

                {branches.map((b) => {
                  const isBound = boundBranches.includes(b.id);
                  return (
                    <div key={b.id} className={`border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${isBound ? "border-green-300 bg-green-50/30" : "border-[#E5E1DA] bg-white"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-[#002B49] text-sm">{b.name}</h4>
                          {isBound && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">已绑定</span>}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{b.desc}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {isBound && (
                          <button
                            onClick={() => {
                              setConferenceBranchFilter(b.id);
                              setActiveTab("conference");
                              setSelectedConference(null);
                              setEditingReg(null);
                            }}
                            className="px-3 py-1.5 rounded font-bold text-xs border border-[#002B49] text-[#002B49] hover:bg-[#002B49] hover:text-white transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">event</span>查看会议
                          </button>
                        )}
                        {/* Phase 2: 所有注册用户均可绑定任意学会/分会 */}
                        {isLoggedIn ? (
                          <button
                            onClick={() => {
                              toggleBranchBinding(b.id);
                              toast.success(isBound ? `已解绑"${b.name}"` : `已绑定"${b.name}"，将接收该分会推送`);
                            }}
                            className={`px-4 py-1.5 rounded font-bold text-xs transition-all ${
                              isBound
                                ? "border border-red-300 text-red-600 hover:bg-red-50"
                                : "bg-[#002B49] hover:bg-[#001f35] text-white shadow-sm"
                            }`}
                          >
                            {isBound ? "解绑分会" : "绑定分会"}
                          </button>
                        ) : (
                          <button disabled className="px-4 py-1.5 rounded font-bold text-xs bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200">
                            请先登录
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // RENDER: CONFERENCE SERVICES (code9 + code8 + code5)
  // ==========================================================================
  const renderConferenceServices = () => {
    // 1. CONFERENCE REGISTRATION FORM (code5 style)
    if (editingReg) {
      const conf = conferences.find(c => c.id === editingReg);
      const reg = conferenceRegs[editingReg] || { status: "unpaid" };

      if (!canAccessConferenceForm(editingReg)) {
        return (
          <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-amber-600 mb-3 block">lock</span>
              <p className="font-bold text-amber-800 text-sm mb-2">参会表单尚未开放</p>
              <p className="text-xs text-amber-700 mb-4">
                当前状态：{CONFERENCE_STATUS_LABEL[reg.status] || reg.status}。请完成凭证→发票两阶段缴费并经终审确认后再填写。
              </p>
              <button onClick={() => setEditingReg(null)} className="px-6 py-2 border border-amber-300 text-amber-800 rounded-lg font-bold text-xs">
                返回
              </button>
            </div>
          </div>
        );
      }

      const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const routes = (conf as { fieldTripRoutes?: FieldTripRoute[] })?.fieldTripRoutes;
        if (routes?.length && regForm.fieldTripSelections) {
          const tripErr = validateFieldTripSelections(routes, regForm.fieldTripSelections, regForm.gender);
          if (tripErr) {
            toast.error(tripErr);
            return;
          }
        }
        const now = new Date().toLocaleString("zh-CN");
        submitConferenceForm(editingReg, {
          name: regForm.name,
          gender: regForm.gender,
          unit: regForm.unit,
          role: regForm.role,
          accommodation: regForm.accommodation,
          accommodationType: regForm.accommodationType,
          session: regForm.session,
          presentationType: regForm.presentationType,
          reportTitle: regForm.reportTitle || undefined,
          abstractFileName: regForm.abstractFileName || undefined,
          abstractFileUrl: regForm.abstractFileUrl || undefined,
          abstractSubmitTime: regForm.abstractFileName ? now : undefined,
          fieldTripSelections: regForm.fieldTripSelections,
          lastUpdated: now,
        });
        // Also sync the non-form fields via context actions
        if (regForm.accommodationType) {
          setAccommodation(editingReg, regForm.accommodationType);
        }
        if (regForm.fieldTripSelections) {
          const currentReg = conferenceRegs[editingReg];
          if (currentReg) {
            const updatedReg = { ...currentReg, fieldTripSelections: regForm.fieldTripSelections, lastUpdated: now };
            const key = `paleo_confs_${currentUser?.email || ""}`;
            const allRegs = { ...conferenceRegs, [editingReg]: updatedReg };
            localStorage.setItem(key, JSON.stringify(allRegs));
            localStorage.setItem(key.replace(/^paleo_/, "paleo_admin_"), JSON.stringify(allRegs));
          }
        }
        setEditingReg(null);
      };

      const handleAbstractUpload = () => {
        if (isDeadlinePassed(conf?.abstractDeadline)) {
          toast.error(`摘要上传已截止（截止日期：${conf?.abstractDeadline}）`);
          return;
        }
        pickAndReadFile(".doc,.docx", 10, (file) => {
          setRegForm((prev: any) => ({ ...prev, abstractFileName: file.name, abstractFileUrl: file.dataUrl }));
          uploadAbstractFile(editingReg!, file.dataUrl, file.name);
          toast.success("学术论文摘要文件上传成功！");
        });
      };

      const handleAbstractDelete = () => {
        setRegForm((prev: any) => ({ ...prev, abstractFileName: "", abstractFileUrl: "" }));
        deleteAbstract(editingReg!);
        toast.info("摘要已删除，可重新上传。");
      };

      const isAbstractDeadlineExceeded = () => isDeadlinePassed(conf?.abstractDeadline);
      const isAccommodationDeadlineExceeded = () => isDeadlinePassed(conf?.accommodationDeadline);
      const isFieldTripDeadlineExceeded = () => isDeadlinePassed(conf?.fieldTripDeadline);

      return (
        <div className="max-w-3xl mx-auto py-12 px-6">
          <div className="mb-8 text-xs text-slate-500 flex items-center gap-2">
            <button onClick={() => setEditingReg(null)} className="hover:text-[#002B49] transition-colors">会议服务中心</button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">填写参会及报告信息</span>
          </div>

          <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">报名已确认 · 可填写参会信息</span>
              <h2 className="text-lg font-bold text-[#002B49] mt-2">{conf?.title}</h2>
              <p className="text-xs text-slate-400 mt-1">请在下方填报您的具体参会形式、学术报告意向及酒店住宿代订信息。</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 text-xs">
              {/* Profile Sync Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">参会人姓名 *</label>
                  <input 
                    type="text" 
                    value={regForm.name} 
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">工作/学习单位 *</label>
                  <input 
                    type="text" 
                    value={regForm.unit} 
                    onChange={(e) => setRegForm({ ...regForm, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">性别 *</label>
                  <select 
                    value={regForm.gender} 
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">参会人职务身份 *</label>
                  <select 
                    value={regForm.role} 
                    onChange={(e) => setRegForm({ ...regForm, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                  >
                    <option value="教师">老师 / 科研人员</option>
                    <option value="学生">在读学生</option>
                    <option value="嘉宾">社会公众</option>
                  </select>
                </div>
              </div>

              {/* Presentation Form */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-sm text-[#002B49] mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">mic</span> 学术报告与论文摘要
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">报告交流形式 *</label>
                    <select 
                      value={regForm.presentationType} 
                      onChange={(e) => setRegForm({ ...regForm, presentationType: e.target.value as any })}
                      className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                    >
                      <option value="仅参会">仅列席参会 (Attendee Only)</option>
                      <option value="口头报告">大会口头报告 (Oral Presentation)</option>
                      <option value="展板报告">学术展板交流 (Poster)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">意向报告专场/分会场 *</label>
                    <select 
                      value={regForm.session} 
                      onChange={(e) => setRegForm({ ...regForm, session: e.target.value })}
                      className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                    >
                      <option value="古脊椎动物演化与环境专场">专题1：中生代陆相脊椎动物演化与重大环境事件</option>
                      <option value="微体古生物与能源油气勘探专场">专题2：微体古生物高精度生物地层与油气勘探</option>
                      <option value="早期生命辐射与澄江化石库专题">专题3：寒武纪大爆发与澄江生物群研究进展</option>
                    </select>
                  </div>
                </div>

                {regForm.presentationType !== "仅参会" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">报告论文题目 *</label>
                      <input 
                        type="text" 
                        value={regForm.reportTitle} 
                        onChange={(e) => setRegForm({ ...regForm, reportTitle: e.target.value })}
                        placeholder="请输入您的学术报告英文/中文完整题目"
                        className="w-full bg-slate-50 border border-[#E5E1DA] rounded-lg px-3 py-2 text-slate-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 mb-1">上传学术摘要文档 (.doc/.docx, ≤10MB) *</label>
                      <div className="space-y-2">
                        {!isAbstractDeadlineExceeded() ? (
                          <div className="flex gap-4 items-center">
                            <button 
                              type="button"
                              onClick={handleAbstractUpload}
                              className="px-4 py-2 border border-[#002B49] text-[#002B49] rounded font-bold hover:bg-slate-50 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">upload_file</span> 上传摘要
                            </button>
                            {regForm.abstractFileName && (
                              <div className="flex items-center gap-1.5 text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded border border-green-200">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>{regForm.abstractFileName}</span>
                                <button type="button" onClick={() => setRegForm({ ...regForm, abstractFileName: "" })} className="text-red-500 hover:text-red-700 font-bold ml-2">删除</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <span className="material-symbols-outlined text-sm text-red-600 mt-0.5">error</span>
                            <div>
                              <p className="text-xs font-bold text-red-700">摘要上传已截止</p>
                              <p className="text-xs text-red-600 mt-1">截止日期：{conf?.abstractDeadline}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 4 — Module A: Abstract Submission */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-sm text-[#002B49] mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">article</span> 会议论文摘要提交
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    截止时间：<strong className="text-[#002B49]">{(conf as any)?.abstractDeadline || "--"}</strong>
                    {isAbstractDeadlineExceeded() && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">已截止</span>
                    )}
                  </div>
                  {regForm.presentationType !== "仅参会" ? (
                    !isAbstractDeadlineExceeded() ? (
                      <div className="space-y-2">
                        {regForm.abstractFileName ? (
                          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                            <span className="material-symbols-outlined text-green-600">description</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-green-700 truncate">{regForm.abstractFileName}</p>
                              <p className="text-[10px] text-green-500">已上传</p>
                            </div>
                            <button type="button" onClick={handleAbstractUpload} className="text-xs text-[#002B49] font-bold hover:underline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">refresh</span>重新上传
                            </button>
                            <button type="button" onClick={handleAbstractDelete} className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">delete</span>删除
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAbstractUpload}
                            className="px-4 py-3 border-2 border-dashed border-slate-300 hover:border-[#002B49] rounded-lg font-bold text-xs text-slate-500 hover:text-[#002B49] transition-colors w-full flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">upload_file</span> 上传摘要文档 (.doc / .docx)
                          </button>
                        )}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          截止后不可修改，系统只保留最后一次提交
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm text-red-600 mt-0.5">error</span>
                        <div>
                          <p className="text-xs font-bold text-red-700">摘要上传已截止</p>
                          <p className="text-xs text-red-600 mt-1">截止日期：{(conf as any)?.abstractDeadline}</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">仅参会模式无需提交摘要。如需提交摘要，请在上方选择"口头报告"或"展板报告"。</p>
                  )}
                </div>
              </div>

              {/* Phase 4 — Module B: Accommodation */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-sm text-[#002B49] mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">hotel</span> 住宿信息
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    截止时间：<strong className="text-[#002B49]">{(conf as any)?.accommodationDeadline || "--"}</strong>（开会前7天）
                    {isAccommodationDeadlineExceeded() && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">已截止</span>
                    )}
                  </div>
                  {!isAccommodationDeadlineExceeded() ? (
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: "male_single" as AccommodationType, label: "男单间（¥450/晚）", gender: "男", icon: "person" },
                        { value: "male_double" as AccommodationType, label: "男双人间（¥240/晚）", gender: "男", icon: "group" },
                        { value: "female_single" as AccommodationType, label: "女单间（¥450/晚）", gender: "女", icon: "person" },
                        { value: "female_double" as AccommodationType, label: "女双人间（¥240/晚）", gender: "女", icon: "group" },
                        { value: "self_arranged" as AccommodationType, label: "自主安排", gender: null, icon: "home" },
                      ].map(opt => {
                        const isUserGender = opt.gender === regForm.gender;
                        const isSelected = regForm.accommodationType === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#002B49] bg-[#002B49]/5"
                                : isUserGender && !regForm.accommodationType
                                  ? "border-[#D9C5A0] bg-[#D9C5A0]/10"
                                  : "border-[#E5E1DA] bg-white hover:border-slate-300"
                            } ${isAccommodationDeadlineExceeded() ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            <input
                              type="radio"
                              name="accommodationType"
                              value={opt.value}
                              checked={isSelected}
                              onChange={() => {
                                setRegForm({ ...regForm, accommodationType: opt.value });
                                setAccommodation(editingReg!, opt.value);
                              }}
                              className="sr-only"
                            />
                            <span className={`material-symbols-outlined text-lg ${isSelected ? "text-[#002B49]" : "text-slate-400"}`}>
                              {opt.icon}
                            </span>
                            <span className={`text-xs font-bold flex-1 ${isSelected ? "text-[#002B49]" : "text-slate-600"}`}>
                              {opt.label}
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[#002B49] text-sm">check_circle</span>
                            )}
                            {isUserGender && !regForm.accommodationType && !isSelected && (
                              <span className="text-[10px] text-[#D9C5A0] font-bold bg-[#D9C5A0]/20 px-1.5 py-0.5 rounded-full">推荐</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-red-600 mt-0.5">error</span>
                      <div>
                        <p className="text-xs font-bold text-red-700">住宿信息修改已截止</p>
                        <p className="text-xs text-red-600 mt-1">
                          {regForm.accommodationType
                            ? `您的选择：${ACCOMMODATION_TYPE_LABEL[regForm.accommodationType] || "--"}`
                            : "未提交，已视为自主安排"}
                        </p>
                      </div>
                    </div>
                  )}
                  {!isAccommodationDeadlineExceeded() && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      截止后未提交视为自主安排
                    </p>
                  )}
                </div>
              </div>

              {/* Phase 4 — Module C: Field Trip Registration */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-sm text-[#002B49] mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">hiking</span> 会议野外报名
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    截止时间：<strong className="text-[#002B49]">{(conf as any)?.fieldTripDeadline || "--"}</strong>（开会前7天）
                    {isFieldTripDeadlineExceeded() && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">已截止</span>
                    )}
                  </div>
                  {(() => {
                    const routes = (conf as any)?.fieldTripRoutes as FieldTripRoute[] | undefined;
                    if (!routes || routes.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">本会议暂无野外路线安排。</p>
                      );
                    }
                    const phases = ["pre", "during", "post"] as const;
                    const phaseLabel: Record<string, string> = { pre: "会前野外路线", during: "会中野外路线", post: "会后野外路线" };
                    const selections = regForm.fieldTripSelections || createEmptyFieldTripSelections();
                    const disabled = isFieldTripDeadlineExceeded();

                    return phases.map(phase => {
                      const phaseRoutes = routes.filter(r => r.phase === phase);
                      if (phaseRoutes.length === 0) return null;
                      return (
                        <div key={phase} className="space-y-2">
                          <p className="text-xs font-bold text-slate-600">{phaseLabel[phase]}（可多选）：</p>
                          {phaseRoutes.map(route => {
                            const isChecked = selections[phase]?.includes(route.id) || false;
                            const genderCheck = canSelectFieldTripRoute(route, regForm.gender);
                            const routeLocked = disabled || (!isChecked && !genderCheck.allowed);
                            return (
                              <label
                                key={route.id}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                                  routeLocked && !disabled
                                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                                    : isChecked
                                    ? "border-[#002B49] bg-[#002B49]/5 cursor-pointer"
                                    : "border-[#E5E1DA] bg-white hover:border-slate-300 cursor-pointer"
                                } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (!genderCheck.allowed) {
                                      toast.error(genderCheck.reason || "无法选择该野外路线");
                                      return;
                                    }
                                    const newSelections = { ...selections };
                                    const arr = [...(newSelections[phase] || [])];
                                    const idx = arr.indexOf(route.id);
                                    if (idx >= 0) arr.splice(idx, 1);
                                    else arr.push(route.id);
                                    newSelections[phase] = arr;
                                    setRegForm({ ...regForm, fieldTripSelections: newSelections });
                                    toggleFieldTripRoute(editingReg!, phase, route.id);
                                  }}
                                  disabled={disabled || routeLocked}
                                  className="sr-only"
                                />
                                <span className={`material-symbols-outlined text-sm mt-0.5 ${isChecked ? "text-[#002B49]" : "text-slate-400"}`}>
                                  {isChecked ? "check_box" : "check_box_outline_blank"}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className={`text-xs block ${isChecked ? "font-bold text-[#002B49]" : "text-slate-600"}`}>
                                    {route.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-2">
                                    {route.genderRestriction && route.genderRestriction !== "any" && (
                                      <span className="text-[#715a3e]">{FIELD_TRIP_GENDER_RESTRICTION_LABEL[route.genderRestriction]}</span>
                                    )}
                                    {!genderCheck.allowed && !disabled && (
                                      <span className="text-red-600">{genderCheck.reason}</span>
                                    )}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                    野外报名将绑定您在基本信息中填写的性别，部分路线限男/限女；请先填写性别后再选择路线。
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                    <div>
                      <p className="font-bold">野外费用由旅游公司收取，不纳入学会会议费</p>
                      <p className="mt-1">截止后未报名视为自行联系旅游公司</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setEditingReg(null)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold">
                  取消返回
                </button>
                <button type="submit" className="px-8 py-2 bg-[#002B49] hover:bg-[#001f35] text-white rounded-lg font-bold shadow-md">
                  提交参会信息
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // 2. CONFERENCE REGISTRATION PAYMENT (code7/11 style)
    if (confPaymentTarget) {
      const conf = conferences.find(c => c.id === confPaymentTarget);

      const handleConfVoucherUpload = () => {
        pickAndReadFile(".jpg,.jpeg,.png,.pdf", 5, (file) => {
          setConfVoucher(file);
          toast.success("会议注册费汇款凭证上传成功！");
        });
      };

      const handleConfInvoiceUpload = () => {
        pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => {
          setConfInvoice(file);
          toast.success("电子发票上传成功！");
        });
      };

      const handleConfPaymentSubmit = async () => {
        if (!confVoucher) {
          toast.error("请先上传会议费银行转账汇款回单！");
          return;
        }
        const feeAmount = getConferenceFee(confPaymentTarget);
        const ok = await payConference(confPaymentTarget, confVoucher.dataUrl, confInvoice?.dataUrl || "", feeAmount);
        if (!ok) return;

        setConfPaymentTarget(null);
        setConfVoucher(null);
        setConfInvoice(null);
        setConfPaymentStep(1);
      };

      return (
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="mb-8 text-xs text-slate-500 flex items-center gap-2">
            <button onClick={() => setConfPaymentTarget(null)} className="hover:text-[#002B49] transition-colors">会议服务中心</button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">缴纳会议注册费</span>
          </div>

          <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
            <div className="text-center mb-8 border-b border-slate-100 pb-4">
              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">第一步：线下汇款转账 ➔ 第二步：在此提交回单凭证</span>
              <h2 className="text-lg font-bold text-[#002B49] mt-2">缴纳会议注册费：{conf?.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-xs">
              <div className="bg-slate-50 p-5 rounded-lg border border-[#E5E1DA]">
                <h3 className="font-bold text-[#002B49] mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-sm">receipt</span> 收费明细（四类注册费）</h3>
                <div className="space-y-2">
                  {(() => {
                    const feeConfig = getConferenceFeeConfig(conf!.id);
                    const userFeeType = isLoggedIn ? getUserFeeType() : null;
                    const feeTypes: { key: ConferenceFeeType; label: string; value: number }[] = [
                      { key: "student_member", label: CONFERENCE_FEE_TYPE_LABEL["student_member"], value: feeConfig.studentMember },
                      { key: "non_student_member", label: CONFERENCE_FEE_TYPE_LABEL["non_student_member"], value: feeConfig.nonStudentMember },
                      { key: "student_non_member", label: CONFERENCE_FEE_TYPE_LABEL["student_non_member"], value: feeConfig.studentNonMember },
                      { key: "non_student_non_member", label: CONFERENCE_FEE_TYPE_LABEL["non_student_non_member"], value: feeConfig.nonStudentNonMember },
                    ];
                    return feeTypes.map(ft => {
                      const isUserType = userFeeType === ft.key;
                      return (
                        <div key={ft.key} className={`flex justify-between items-center px-3 py-2 rounded border ${isUserType ? "bg-green-50 border-green-300 font-bold" : "bg-white border-[#E5E1DA]"}`}>
                          <span className="text-slate-600 text-xs">
                            {ft.label}
                            {isUserType && <span className="ml-2 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">您的类型</span>}
                          </span>
                          <span className={`text-sm font-bold ${ft.value > 0 ? "text-[#002B49]" : "text-slate-400"}`}>
                            {ft.value > 0 ? `¥${ft.value}` : "--（关闭）"}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-4 p-3 bg-white rounded border border-[#E5E1DA] text-xs text-slate-500 leading-relaxed">
                  <strong>当前身份：</strong>
                  {isLoggedIn ? (
                    <>
                      {userType === "member" ? "正式会员" : "非会员"}
                      {currentUser?.isStudent ? "（学生）" : "（非学生）"}
                      <span className="ml-1"> -- 应缴</span>
                      <span className="font-bold text-red-600 ml-1">¥{getConferenceFee(conf!.id)} 元</span>
                    </>
                  ) : (
                    <span className="text-slate-400">请先登录以确定您的费用类型</span>
                  )}
                </div>
                {userType === "non_member" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mt-3">
                    提示：升级为正式会员（¥200/年）后，本次会议可节省 ¥{getNonMemberFeeOnly(confPaymentTarget!) - getMemberFeeOnly(confPaymentTarget!)}。
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-lg border border-[#E5E1DA]">
                <h3 className="font-bold text-[#002B49] mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-sm">account_balance</span> 学会收款银行账户</h3>
                <div className="space-y-2">
                  <p className="text-slate-500">户名：<strong>中国古生物学会</strong></p>
                  <p className="text-slate-500">开户行：<strong>中国工商银行南京成贤街支行</strong></p>
                  <p className="text-slate-500">账号：<strong>4301 0108 0900 1146 512</strong></p>
                  <p className="text-red-700 font-bold mt-2">汇款备注附言：{currentUser?.name} + {conf?.branchName}会议费</p>
                </div>
              </div>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">1. 会议费线下转账/汇款成功电子回单 *</label>
                <div 
                  onClick={handleConfVoucherUpload}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    confVoucher ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:border-[#002B49]"
                  }`}
                >
                  {confVoucher ? (
                    <div className="text-green-700 font-bold text-xs flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined">check_circle</span>
                      已上传：{confVoucher.name}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">cloud_upload</span>
                      <p className="font-bold text-[#002B49]">点击上传会议费银行汇款回单</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">2. 增值税电子普通发票开票抬头与税号 (选填)</label>
                <div 
                  onClick={handleConfInvoiceUpload}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    confInvoice ? "border-[#715a3e] bg-[#f5e0ba]/10" : "border-slate-300 hover:border-[#002B49]"
                  }`}
                >
                  {confInvoice ? (
                    <div className="text-[#715a3e] font-bold text-xs flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined">receipt</span>
                      已上传发票税号资料：{confInvoice.name}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">receipt_long</span>
                      <p className="font-bold">点击上传开票税号信息或单位证明</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center space-x-4 pt-6 border-t border-slate-100">
                <button onClick={() => setConfPaymentTarget(null)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs">
                  取消返回
                </button>
                <button 
                  onClick={handleConfPaymentSubmit}
                  className="px-8 py-2 bg-[#002B49] text-white rounded-lg font-bold text-xs shadow-md"
                >
                  提交会议费审核
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. CONFERENCE DETAILS MODAL (code8 style)
    if (selectedConference) {
      const conf = conferences.find(c => c.id === selectedConference);
      const reg = conferenceRegs[selectedConference] || { status: "unpaid" };
      
      // Check if payment deadline has passed
      const today = new Date().toISOString().split('T')[0];
      const isPaymentDeadlineExceeded = conf && today > conf.feeDeadline;

      return (
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="mb-8 text-xs text-slate-500 flex items-center gap-2">
            <button onClick={() => setSelectedConference(null)} className="hover:text-[#002B49] transition-colors">会议服务中心</button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">会议详细通知</span>
          </div>

          <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-6 mb-6">
              <span className="bg-[#f5e0ba] text-[#241a03] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">PSC ACADEMIC CONFERENCE</span>
              <h1 className="text-2xl font-bold text-[#002B49] mt-3 font-serif">{conf?.title}</h1>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {conf?.time}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> {conf?.location}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">sell</span> 注册费：
                  {(() => {
                    const fc = getConferenceFeeConfig(conf!.id);
                    if (isLoggedIn) {
                      const uft = getUserFeeType();
                      const fieldMap: Record<ConferenceFeeType, number> = {
                        student_member: fc.studentMember,
                        non_student_member: fc.nonStudentMember,
                        student_non_member: fc.studentNonMember,
                        non_student_non_member: fc.nonStudentNonMember,
                      };
                      return <span>¥ {fieldMap[uft] || fc.nonStudentMember} 元（{CONFERENCE_FEE_TYPE_LABEL[uft]}）</span>;
                    }
                    return <span>¥ {fc.nonStudentMember} 元起</span>;
                  })()}
                </span>
              </div>
            </div>

            {isPaymentDeadlineExceeded && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
                <div>
                  <p className="text-xs font-bold text-red-700">缴费已截止</p>
                  <p className="text-xs text-red-600 mt-1">截止日期：{conf?.feeDeadline}</p>
                </div>
              </div>
            )}

            <div className="prose max-w-none text-xs text-slate-600 leading-relaxed space-y-4 mb-8">
              <h3 className="text-sm font-bold text-[#002B49] border-b border-slate-100 pb-2">一、会议主题与内容</h3>
              <p>{conf?.desc}</p>
              <h3 className="text-sm font-bold text-[#002B49] border-b border-slate-100 pb-2">二、会议缴费说明</h3>
              <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg p-4 mb-4 text-xs space-y-1">
                <p className="font-bold text-[#002B49] mb-2">四类收费标准</p>
                {(() => {
                  const feeConfig = getConferenceFeeConfig(conf!.id);
                  const userFeeType = isLoggedIn ? getUserFeeType() : null;
                  const feeTypes: { key: ConferenceFeeType; label: string; value: number }[] = [
                    { key: "student_member", label: CONFERENCE_FEE_TYPE_LABEL["student_member"], value: feeConfig.studentMember },
                    { key: "non_student_member", label: CONFERENCE_FEE_TYPE_LABEL["non_student_member"], value: feeConfig.nonStudentMember },
                    { key: "student_non_member", label: CONFERENCE_FEE_TYPE_LABEL["student_non_member"], value: feeConfig.studentNonMember },
                    { key: "non_student_non_member", label: CONFERENCE_FEE_TYPE_LABEL["non_student_non_member"], value: feeConfig.nonStudentNonMember },
                  ];
                  return feeTypes.map(ft => {
                    const isUserType = userFeeType === ft.key;
                    return (
                      <div key={ft.key} className={`flex justify-between items-center px-3 py-1.5 rounded border ${isUserType ? "bg-green-50 border-green-300 font-bold" : "bg-white border-[#E5E1DA]"}`}>
                        <span className="text-slate-600 text-xs">
                          {ft.label}
                          {isUserType && <span className="ml-2 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">您的类型</span>}
                        </span>
                        <span className={`text-sm font-bold ${ft.value > 0 ? "text-[#002B49]" : "text-slate-400"}`}>
                          {ft.value > 0 ? `¥${ft.value}` : "--（关闭）"}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p>请各参会代表于大会召开前通过银行线下汇款缴纳会议注册费，并在学会服务门户提交汇款成功凭证截图。初审通过后，即可在线填报详细的学术报告（口头报告/展板交流）题目、上传论文摘要并选择由学会统一代订周边协议酒店。</p>
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">缴费截止日期：<strong>{conf?.feeDeadline}</strong>，学术摘要截止日期：<strong>{conf?.abstractDeadline}</strong></p>
            </div>

            {/* Phase 2: 会议资料下载区域 */}
            <div className="border-t border-slate-100 pt-6 mb-6">
              <h3 className="font-bold text-sm text-[#002B49] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span> 会议资料下载
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 未盖章通知 — 始终可见 */}
                <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg p-4 text-center">
                  <span className="material-symbols-outlined text-2xl text-slate-400 mb-2 block">description</span>
                  <p className="text-xs font-bold text-slate-600 mb-1">会议通知（不盖章）</p>
                  <p className="text-[10px] text-slate-400 mb-3">查看会议通知全文</p>
                  <button
                    onClick={() => setNoticePreviewConfId(conf!.id)}
                    className="w-full px-3 py-1.5 border border-slate-300 text-slate-600 rounded font-bold text-xs hover:bg-white transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span> 查看通知
                  </button>
                </div>
                {/* 盖章通知 PDF — 缴费确认后解锁 */}
                <div className={`border rounded-lg p-4 text-center transition-all ${
                  canDownloadStampedNotice(conf!.id)
                    ? "bg-green-50/30 border-green-300"
                    : "bg-slate-50 border-[#E5E1DA] opacity-60"
                }`}>
                  <span className={`material-symbols-outlined text-2xl mb-2 block ${
                    canDownloadStampedNotice(conf!.id) ? "text-green-600" : "text-slate-400"
                  }`}>verified</span>
                  <p className="text-xs font-bold text-slate-600 mb-1">盖章会议通知 PDF</p>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {canDownloadStampedNotice(conf!.id)
                      ? "盖中国古生物学会电子章的正式通知"
                      : "缴费确认后解锁下载"}
                  </p>
                  {canDownloadStampedNotice(conf!.id) ? (
                    (() => {
                      const fileUrl = getConferenceFileUrl(conf!.id, "stampedNotice");
                      return fileUrl ? (
                        <a
                          href={fileUrl}
                          download={`会议通知_${conf?.title || conf?.id}.pdf`}
                          className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span> 下载 PDF
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full px-3 py-1.5 bg-slate-200 text-slate-400 rounded font-bold text-xs cursor-not-allowed"
                        >
                          管理员尚未上传
                        </button>
                      );
                    })()
                  ) : (
                    <button disabled className="w-full px-3 py-1.5 bg-slate-200 text-slate-400 rounded font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> 需缴费确认
                    </button>
                  )}
                </div>
                {/* 摘要模板 Word — 缴费确认后解锁 */}
                <div className={`border rounded-lg p-4 text-center transition-all ${
                  canDownloadAbstractTemplate(conf!.id)
                    ? "bg-green-50/30 border-green-300"
                    : "bg-slate-50 border-[#E5E1DA] opacity-60"
                }`}>
                  <span className={`material-symbols-outlined text-2xl mb-2 block ${
                    canDownloadAbstractTemplate(conf!.id) ? "text-green-600" : "text-slate-400"
                  }`}>article</span>
                  <p className="text-xs font-bold text-slate-600 mb-1">会议论文摘要模板</p>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {canDownloadAbstractTemplate(conf!.id)
                      ? "论文摘要格式模板 Word 文档"
                      : "缴费确认后解锁下载"}
                  </p>
                  {canDownloadAbstractTemplate(conf!.id) ? (
                    (() => {
                      const fileUrl = getConferenceFileUrl(conf!.id, "abstractTemplate");
                      return fileUrl ? (
                        <a
                          href={fileUrl}
                          download={`摘要模板_${conf?.title || conf?.id}.docx`}
                          className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span> 下载 Word
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full px-3 py-1.5 bg-slate-200 text-slate-400 rounded font-bold text-xs cursor-not-allowed"
                        >
                          管理员尚未上传
                        </button>
                      );
                    })()
                  ) : (
                    <button disabled className="w-full px-3 py-1.5 bg-slate-200 text-slate-400 rounded font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> 需缴费确认
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-between items-center flex-wrap gap-4">
              <button onClick={() => setSelectedConference(null)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs">
                返回会议列表
              </button>

              <div className="flex gap-3">
                {/* UNPAID */}
                {reg.status === "unpaid" && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        toast.error("请先登录系统再报名会议。");
                        setDialogOpenTab("login");
                        setDialogOpen(true);
                        return;
                      }
                      if (userType === "regular") {
                        toast.error("请先选择您的参与方式（会员/非会员）后再报名会议。");
                        return;
                      }
                      if (userType === "member" && societyMembership.status !== "active" && societyMembership.status !== "invoice_pending" && societyMembership.status !== "invoice_submitted") {
                        toast.error("您尚未完成会员缴费验证，请先前往会员服务完成入会流程。");
                        return;
                      }
                      if (isPaymentDeadlineExceeded) {
                        toast.error(`缴费已截止（截止日期：${conf?.feeDeadline}）`);
                        return;
                      }
                      setConfPaymentTarget(conf!.id);
                    }}
                    disabled={isPaymentDeadlineExceeded}
                    className={`px-6 py-2 rounded-lg font-bold text-xs shadow-md ${
                      isPaymentDeadlineExceeded
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-[#002B49] hover:bg-[#001f35] text-white"
                    }`}
                  >
                    {isPaymentDeadlineExceeded ? "缴费已截止" : "立即缴纳注册费报名"}
                  </button>
                )}

                {/* VOUCHER SUBMITTED -- 凭证初审中 */}
                {(reg.status === "voucher_submitted" || reg.status === "pending") && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-2 w-full">
                    <p className="font-bold">⏳ 凭证初审中</p>
                    <p className="text-yellow-600">汇款凭证已提交，财务初审中（通常 1-3 个工作日）。</p>
                  </div>
                )}

                {/* VOUCHER REJECTED -- 凭证被驳回 */}
                {reg.status === "voucher_rejected" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 space-y-2 w-full">
                    <p className="font-bold">✗ 凭证初审被驳回</p>
                    {reg.voucherRejectReason && <p className="text-red-600">原因：{reg.voucherRejectReason}</p>}
                    <button onClick={() => setConfPaymentTarget(conf!.id)} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded font-bold text-xs">
                      重新上传凭证
                    </button>
                  </div>
                )}

                {/* INVOICE PENDING -- 待上传发票（可填参会信息） */}
                {reg.status === "invoice_pending" && (
                  <div className="space-y-2 w-full">
                    {/* 倒计时 */}
                    {(() => {
                      const deadline = reg.invoiceExtendedDeadline || reg.invoiceDeadline;
                      if (deadline) {
                        const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const isUrgent = daysLeft <= 3;
                        return (
                          <div className={`rounded-lg p-2 text-xs font-bold text-center ${isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                            <span className="material-symbols-outlined text-[13px] align-middle mr-1">schedule</span>
                            {daysLeft > 0 ? `发票上传截止：${deadline}（剩余 ${daysLeft} 天）` : `发票上传已逾期！截止日：${deadline}`}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex gap-2">
                      <button onClick={() => {
                        pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => {
                          setConfInvoice(file);
                          submitConferenceInvoice(conf!.id, file.dataUrl);
                        });
                      }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">receipt_long</span> 上传发票
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">缴费终审确认后可填写参会信息并下载盖章通知</p>
                  </div>
                )}

                {/* INVOICE OVERDUE -- 发票逾期 */}
                {reg.status === "invoice_overdue" && (
                  <div className="space-y-2 w-full">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                      <p className="font-bold">⚠ 发票上传已逾期</p>
                      <p className="text-orange-700 mt-1">截止日：{reg.invoiceDeadline || "--"}。请尽快上传发票完成报名确认。</p>
                    </div>
                    <button onClick={() => {
                      pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => {
                        setConfInvoice(file);
                        submitConferenceInvoice(conf!.id, file.dataUrl);
                      });
                    }} className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs">
                      立即上传发票
                    </button>
                  </div>
                )}

                {/* INVOICE SUBMITTED -- 发票终审中 */}
                {reg.status === "invoice_submitted" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-2 w-full">
                    <p className="font-bold">⏳ 发票终审中</p>
                    <p className="text-yellow-600">电子发票已提交，财务终审中。已填写的参会信息已锁定。</p>
                  </div>
                )}

                {/* INVOICE REJECTED -- 发票被驳回 */}
                {reg.status === "invoice_rejected" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 space-y-2 w-full">
                    <p className="font-bold">✗ 发票终审被驳回</p>
                    {reg.invoiceRejectReason && <p className="text-red-600">原因：{reg.invoiceRejectReason}</p>}
                    <button onClick={() => {
                      pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => {
                        setConfInvoice(file);
                        submitConferenceInvoice(conf!.id, file.dataUrl);
                      });
                    }} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded font-bold text-xs">
                      重新上传发票
                    </button>
                  </div>
                )}

                {/* CONFIRMED -- 报名确认 */}
                {(reg.status === "confirmed" || reg.status === "submitted" || reg.status === "approved_unfilled" || reg.status === "approved_invoice") && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-green-600 font-bold text-xs flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {reg.status === "confirmed" ? "✓ 报名已确认" : "已成功报名"}
                    </span>
                    {reg.status === "confirmed" && (
                      <button
                        onClick={() => openConferenceForm(conf!.id)}
                        className="text-xs bg-[#002B49] text-white px-3 py-1.5 rounded font-bold hover:bg-[#001f35] flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit_note</span>
                        {reg.name ? "查看/修改参会信息" : "填写参会信息"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 4. GENERAL CONFERENCE LIST (code9 style)
    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="mb-8 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-[#002B49]">学术会议服务中心</h2>
          <p className="text-slate-400 text-xs mt-1">您可以在线报名参加中国古生物学会及各学术分会主办的全国及国际学术大会。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {conferences.map((c) => {
            const reg = conferenceRegs[c.id] || { status: "unpaid" };

            return (
              <div key={c.id} className="bg-white border border-[#E5E1DA] hover:border-slate-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <div className="bg-[#002B49] text-white p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none"></div>
                  <span className="bg-[#f5e0ba] text-[#241a03] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {c.branchName}
                  </span>
                  <h3 className="font-bold text-sm mt-3 leading-snug h-12 line-clamp-2">{c.title}</h3>
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between text-xs text-slate-600">
                  <div className="space-y-2 mb-6">
                    <p className="flex items-center gap-1"><span className="material-symbols-outlined text-slate-400 text-sm">schedule</span> {c.time}</p>
                    <p className="flex items-center gap-1"><span className="material-symbols-outlined text-slate-400 text-sm">location_on</span> {c.location}</p>
                    <p className="flex items-center gap-1"><span className="material-symbols-outlined text-slate-400 text-sm">sell</span> 注册费：<strong>¥ {(() => {
                      const fc = getConferenceFeeConfig(c.id);
                      if (isLoggedIn) {
                        const uft = getUserFeeType();
                        const fieldMap: Record<ConferenceFeeType, number> = {
                          student_member: fc.studentMember,
                          non_student_member: fc.nonStudentMember,
                          student_non_member: fc.studentNonMember,
                          non_student_non_member: fc.nonStudentNonMember,
                        };
                        return fieldMap[uft] || fc.nonStudentMember;
                      }
                      return fc.nonStudentMember;
                    })()} 元</strong></p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedConference(c.id)}
                      className="text-[#715a3e] font-bold hover:underline flex items-center gap-0.5"
                    >
                      详细通知 <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>

                    {/* STATUS BUTTONS -- 8种状态 */}
                    <div>
                      {reg.status === "unpaid" && (
                        <button
                          onClick={() => {
                            if (!isLoggedIn) {
                              toast.error("请先登录系统再报名会议。");
                              setDialogOpenTab("login");
                              setDialogOpen(true);
                              return;
                            }
                            if (userType === "regular") {
                              toast.error("请先选择您的参与方式（会员/非会员）后再报名会议。");
                              return;
                            }
                            if (userType === "member" && societyMembership.status !== "active" && societyMembership.status !== "invoice_pending" && societyMembership.status !== "invoice_submitted") {
                              toast.error("您尚未完成会员缴费验证，请先前往会员服务完成入会流程。");
                              return;
                            }
                            setConfPaymentTarget(c.id);
                          }}
                          className="bg-[#002B49] hover:bg-[#001f35] text-white px-4 py-1.5 rounded font-bold text-[10px] shadow-sm"
                        >
                          报名参会
                        </button>
                      )}

                      {(reg.status === "voucher_submitted" || reg.status === "pending") && (
                        <span className="text-yellow-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">hourglass_top</span> 凭证初审中
                        </span>
                      )}

                      {reg.status === "voucher_rejected" && (
                        <span className="text-red-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">error</span> 凭证被驳回
                        </span>
                      )}

                      {reg.status === "invoice_pending" && (
                        <span className="text-blue-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">receipt_long</span> 待上传发票
                        </span>
                      )}

                      {reg.status === "invoice_overdue" && (
                        <span className="text-orange-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">warning</span> 发票逾期
                        </span>
                      )}

                      {reg.status === "invoice_submitted" && (
                        <span className="text-yellow-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">hourglass_top</span> 发票终审中
                        </span>
                      )}

                      {reg.status === "invoice_rejected" && (
                        <span className="text-red-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">error</span> 发票被驳回
                        </span>
                      )}

                      {(reg.status === "confirmed" || reg.status === "submitted" || reg.status === "approved_unfilled" || reg.status === "approved_invoice") && (
                        <span className="text-green-600 font-bold flex items-center gap-0.5 text-[10px]">
                          <span className="material-symbols-outlined text-sm">check_circle</span> {reg.status === "confirmed" ? "已确认" : "已报名"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER: CONFERENCE LIST (filtered by bound branches)
  // ==========================================================================
  const renderConferenceList = () => {
    const isActiveMember = societyMembership.status === "active";
    // Find the name of the currently filtered branch
    const filteredBranchName = conferenceBranchFilter
      ? (ALL_SOCIETY_UNITS as Record<string, string>)[conferenceBranchFilter] || branches.find(b => b.id === conferenceBranchFilter)?.name || conferenceBranchFilter
      : null;
    // Filter logic: if conferenceBranchFilter is set, show only that branch's conferences;
    // otherwise show all bound-branch conferences (or all if not a member)
    const visibleConfs = sortConferencesSocietyFirst(
      conferenceBranchFilter
        ? conferences.filter(c => c.branchId === conferenceBranchFilter)
        : isActiveMember
          ? conferences.filter(c => isSocietyAccessible(boundBranches, c.branchId))
          : conferences
    );

    const statusColor: Record<string, string> = {
      "演示": "bg-blue-50 text-blue-700",
      "正在报名": "bg-green-50 text-green-700",
      "即将开启": "bg-amber-50 text-amber-700",
      "预告通知": "bg-slate-100 text-slate-500",
    };

    return (
      <div className="max-w-7xl mx-auto py-10 px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#002B49] mb-2" style={{ fontFamily: "Georgia, serif" }}>学术会议</h2>
            <p className="text-slate-500 text-xs">
              {conferenceBranchFilter
                ? `当前显示「${filteredBranchName}」的会议。`
                : userType === "non_member"
                  ? "您作为非会员可直接报名会议（按非会员价），绑定分会后可接收该分会的会议通知。以下展示全部公开会议。"
                  : isActiveMember
                    ? `显示您已绑定分会的会议（已绑定 ${boundBranches.length} 个分会）。绑定更多分会可见更多会议。`
                    : userType === "member"
                      ? "请先完成入会缴费验证，通过后即可绑定分会并缴纳注册费。以下展示全部公开会议。"
                      : "请先选择参与方式（会员/非会员）后再报名会议。以下展示全部公开会议。"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {conferenceBranchFilter && (
              <button
                onClick={() => setConferenceBranchFilter(null)}
                className="text-xs font-bold text-slate-600 border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                清除筛选
              </button>
            )}
            {isActiveMember && (
              <button
                onClick={() => setActiveTab("member")}
                className="text-xs font-bold text-[#002B49] border border-[#002B49] px-3 py-1.5 rounded hover:bg-[#002B49] hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">hub</span>
                管理分会绑定
              </button>
            )}
          </div>
        </div>

        {/* Branch filter indicator banner */}
        {conferenceBranchFilter && (
          <div className="mb-6 bg-[#002B49]/5 border border-[#002B49]/20 rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-[#002B49] text-[18px]">filter_list</span>
              <span className="text-slate-600">当前筛选：</span>
              <span className="font-bold text-[#002B49] bg-[#002B49]/10 px-2.5 py-0.5 rounded-full">{filteredBranchName}</span>
              {visibleConfs.length === 0 && (
                <span className="text-slate-400 ml-2">该分会暂无公开会议</span>
              )}
              {visibleConfs.length > 0 && (
                <span className="text-slate-400 ml-2">共 {visibleConfs.length} 场会议</span>
              )}
            </div>
            <button
              onClick={() => setConferenceBranchFilter(null)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5 font-bold"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>查看全部分会会议
            </button>
          </div>
        )}

        {visibleConfs.length === 0 && (
          <div className="bg-white border border-[#E5E1DA] rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">event_busy</span>
            {conferenceBranchFilter ? (
              <>
                <p className="text-slate-500 font-bold text-sm mb-1">「{filteredBranchName}」暂无公开会议</p>
                <p className="text-slate-400 text-xs mb-4">该分会目前没有已发布的学术会议，请关注分会动态。</p>
                <button
                  onClick={() => setConferenceBranchFilter(null)}
                  className="bg-[#002B49] text-white px-4 py-2 rounded font-bold text-xs hover:bg-[#003d6b] transition-colors"
                >
                  查看全部分会会议
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-500 font-bold text-sm mb-1">暂无可查看的会议</p>
                <p className="text-slate-400 text-xs mb-4">请先前往「会员服务」绑定您感兴趣的专业分会，即可接收对应分会的会议通知。</p>
                <button
                  onClick={() => setActiveTab("member")}
                  className="bg-[#002B49] text-white px-4 py-2 rounded font-bold text-xs hover:bg-[#003d6b] transition-colors"
                >
                  前往绑定分会
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-4">
          {visibleConfs.map(c => {
            const reg = conferenceRegs[c.id];
            const isBound = isSocietyAccessible(boundBranches, c.branchId);
            const fc = getConferenceFeeConfig(c.id);
            const userFeeType = isLoggedIn ? getUserFeeType() : null;
            const feeFieldMap: Record<ConferenceFeeType, number> = {
              student_member: fc.studentMember,
              non_student_member: fc.nonStudentMember,
              student_non_member: fc.studentNonMember,
              non_student_non_member: fc.nonStudentNonMember,
            };
            const userFee = userFeeType ? feeFieldMap[userFeeType] : fc.nonStudentNonMember;
            const channelClosed = isLoggedIn && userFeeType !== null && userFee <= 0;
            return (
              <div key={c.id} className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[c.status] || "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#002B49]/8 text-[#002B49] ${c.branchId === TOTAL_SOCIETY_ID ? "bg-[#D9C5A0]/30 text-[#715a3e]" : ""}`}>
                        {c.branchId === TOTAL_SOCIETY_ID ? "★ " : ""}{c.branchName}
                      </span>
                      {channelClosed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          当前身份通道关闭
                        </span>
                      )}
                      {reg && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          CONFERENCE_STATUS_COLOR[reg.status] ||
                          (reg.status === "active" ? "bg-green-50 text-green-700" :
                           reg.status === "pending" ? "bg-amber-50 text-amber-700" :
                           reg.status === "submitted" ? "bg-blue-50 text-blue-700" :
                           "bg-slate-50 text-slate-600")
                        }`}>
                          {CONFERENCE_STATUS_LABEL[reg.status] ||
                           (reg.status === "active" ? "✓ 已缴费" : reg.status === "pending" ? "⏳ 审核中" : reg.status === "submitted" ? "✓ 已报名" : reg.status)}
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-bold text-[#002B49] text-base mb-2 cursor-pointer hover:text-[#715a3e] transition-colors"
                      onClick={() => setNoticePreviewConfId(c.id)}
                    >
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{c.desc}</p>
                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_month</span>{c.time}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{c.location}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span>
                        {channelClosed ? (
                          <span className="text-amber-600 font-bold">报名通道已关闭（{CONFERENCE_FEE_TYPE_LABEL[userFeeType!]}）</span>
                        ) : (
                          <>注册费 ¥{userFee}</>
                        )}
                      </span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>缴费截止 {c.feeDeadline}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => setNoticePreviewConfId(c.id)}
                      className="bg-[#002B49] text-white px-4 py-2 rounded font-bold text-xs hover:bg-[#001f35] transition-colors text-center flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">description</span>
                      查看会议通知
                    </button>
                    <button
                      onClick={() => setSelectedConference(c.id)}
                      disabled={channelClosed}
                      className={`text-[#715a3e] font-bold flex items-center gap-0.5 text-[10px] justify-end ${channelClosed ? "opacity-40 cursor-not-allowed" : "hover:underline"}`}
                    >
                      {channelClosed ? "当前身份不可报名" : "报名与详情"} <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                    {/* Regular users need to choose membership path first */}
                    {userType === "regular" && (
                      <button
                        onClick={() => setActiveTab("member")}
                        className="bg-[#002B49] text-white px-4 py-2 rounded font-bold text-xs hover:bg-[#003d6b] transition-colors text-center"
                      >
                        先选择参与方式
                      </button>
                    )}
                    {/* Member-path users who haven't completed payment verification */}
                    {userType === "member" && !isActiveMember &&
                      societyMembership.status !== "invoice_pending" &&
                      societyMembership.status !== "invoice_submitted" && (
                      <button
                        onClick={() => setActiveTab("member")}
                        className="bg-[#002B49] text-white px-4 py-2 rounded font-bold text-xs hover:bg-[#003d6b] transition-colors text-center"
                      >
                        需先完成入会缴费
                      </button>
                    )}
                    {/* Non-members and verified members: can register but need to bind branch first */}
                    {(userType === "non_member" || isActiveMember ||
                      (userType === "member" && (societyMembership.status === "invoice_pending" || societyMembership.status === "invoice_submitted"))) &&
                      !isBound && (
                      <button
                        onClick={() => setActiveTab("member")}
                        className="border border-[#002B49] text-[#002B49] px-4 py-2 rounded font-bold text-xs hover:bg-[#002B49] hover:text-white transition-colors text-center"
                      >
                        绑定该分会后可报名
                      </button>
                    )}
                    {/* Non-members and verified members with bound branch: can pay */}
                    {(userType === "non_member" || isActiveMember ||
                      (userType === "member" && (societyMembership.status === "invoice_pending" || societyMembership.status === "invoice_submitted"))) &&
                      isBound && !reg && (
                      <button
                        onClick={() => { setConfPaymentTarget(c.id); setConfPaymentStep(1); setConfVoucher(null); setConfInvoice(null); }}
                        className="bg-[#c8a96e] hover:bg-[#b8956a] text-white px-4 py-2 rounded font-bold text-xs transition-colors text-center"
                      >
                        缴纳注册费
                      </button>
                    )}
                    {/* 凭证初审中 */}
                    {(reg?.status === "voucher_submitted" || reg?.status === "pending") && (
                      <span className="text-amber-600 font-bold text-[10px] text-center">⏳ 凭证初审中</span>
                    )}
                    {/* 凭证被驳回 → 可重新提交 */}
                    {reg?.status === "voucher_rejected" && (
                      <>
                        <span className="text-red-600 font-bold text-[10px] text-center">✕ 凭证被驳回</span>
                        <button
                          onClick={() => { setConfPaymentTarget(c.id); setConfPaymentStep(1); setConfVoucher(null); setConfInvoice(null); }}
                          className="bg-[#c8a96e] hover:bg-[#b8956a] text-white px-4 py-2 rounded font-bold text-xs transition-colors text-center"
                        >
                          重新提交凭证
                        </button>
                      </>
                    )}
                    {/* 待上传发票 */}
                    {reg?.status === "invoice_pending" && (
                      <>
                        {reg.invoiceDeadline && (
                          <span className="text-blue-600 font-bold text-[10px] text-center">发票截止：{reg.invoiceDeadline}</span>
                        )}
                        <button
                          onClick={() => { setConfPaymentTarget(c.id); setConfPaymentStep(3); }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-xs transition-colors text-center"
                        >
                          上传发票
                        </button>
                      </>
                    )}
                    {/* 发票逾期 */}
                    {reg?.status === "invoice_overdue" && (
                      <span className="text-orange-600 font-bold text-[10px] text-center">⚠ 发票已逾期</span>
                    )}
                    {/* 发票终审中 */}
                    {reg?.status === "invoice_submitted" && (
                      <span className="text-amber-600 font-bold text-[10px] text-center">⏳ 发票终审中</span>
                    )}
                    {/* 发票被驳回 → 可重新上传 */}
                    {reg?.status === "invoice_rejected" && (
                      <>
                        <span className="text-red-600 font-bold text-[10px] text-center">✕ 发票被驳回</span>
                        <button
                          onClick={() => { setConfPaymentTarget(c.id); setConfPaymentStep(3); setConfVoucher(null); setConfInvoice(null); }}
                          className="bg-[#c8a96e] hover:bg-[#b8956a] text-white px-4 py-2 rounded font-bold text-xs transition-colors text-center"
                        >
                          重新上传发票
                        </button>
                      </>
                    )}
                    {/* 已确认 */}
                    {reg?.status === "confirmed" && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-green-600 font-bold text-[10px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>报名完成
                        </span>
                        <button
                          onClick={() => openConferenceForm(c.id)}
                          className="text-[10px] text-[#002B49] font-bold hover:underline flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit_note</span>参会信息
                        </button>
                        <button
                          onClick={() => setSelectedConference(c.id)}
                          className="text-[10px] text-[#002B49] font-bold hover:underline flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">download</span>资料下载
                        </button>
                      </div>
                    )}
                    {/* 旧状态兼容 */}
                    {reg?.status === "active" && !reg.conferenceForm && canAccessConferenceForm(c.id) && (
                      <button
                        onClick={() => openConferenceForm(c.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-xs transition-colors text-center"
                      >
                        填写参会信息
                      </button>
                    )}
                    {reg?.status === "submitted" && (
                      <span className="text-green-600 font-bold text-[10px] text-center flex items-center gap-1 justify-center">
                        <span className="material-symbols-outlined text-sm">check_circle</span>报名完成
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline conference payment dialog */}
        {confPaymentTarget && (() => {
          const c = conferences.find(x => x.id === confPaymentTarget)!;
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-[#E5E1DA] flex items-center justify-between">
                  <h3 className="font-bold text-[#002B49] text-base">缴纳会议注册费</h3>
                  <button onClick={() => setConfPaymentTarget(null)} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-[#FCFAF7] rounded-lg p-4 text-xs space-y-2">
                    <p className="font-bold text-[#002B49]">{c.title}</p>
                    <p className="text-slate-500">{c.time} · {c.location}</p>
                    <p className="text-lg font-bold text-[#c8a96e]">¥{(() => {
                      const fc = getConferenceFeeConfig(c.id);
                      if (isLoggedIn) {
                        const uft = getUserFeeType();
                        const fieldMap: Record<ConferenceFeeType, number> = {
                          student_member: fc.studentMember,
                          non_student_member: fc.nonStudentMember,
                          student_non_member: fc.studentNonMember,
                          non_student_non_member: fc.nonStudentNonMember,
                        };
                        return fieldMap[uft] || fc.nonStudentMember;
                      }
                      return fc.nonStudentMember;
                    })()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-xs">
                    <p className="font-bold text-blue-800 mb-1">收款账户信息</p>
                    <p className="text-blue-700">开户名称：中国古生物学会</p>
                    <p className="text-blue-700">开户行：中国工商银行南京分行</p>
                    <p className="text-blue-700">账号：3210 0000 0000 0000</p>
                    <p className="text-blue-700">汇款备注：{c.title}注册费</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">上传缴费凭证 *</label>
                    <div
                      className="border-2 border-dashed border-[#E5E1DA] rounded-lg p-4 text-center cursor-pointer hover:border-[#c8a96e] transition-colors"
                      onClick={() => pickAndReadFile(".jpg,.jpeg,.png,.pdf", 5, (file) => { setConfVoucher(file); toast.success("凭证上传成功"); })}
                    >
                      {confVoucher ? (
                        <p className="text-green-600 font-bold text-xs">✓ {confVoucher.name}</p>
                      ) : (
                        <p className="text-slate-400 text-xs">点击上传凭证图片（JPG/PNG/PDF ≤5MB）</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">上传电子发票（可选）</label>
                    <div
                      className="border-2 border-dashed border-[#E5E1DA] rounded-lg p-4 text-center cursor-pointer hover:border-[#c8a96e] transition-colors"
                      onClick={() => pickAndReadFile(".jpg,.jpeg,.png,.pdf", 10, (file) => { setConfInvoice(file); toast.success("发票上传成功"); })}
                    >
                      {confInvoice ? (
                        <p className="text-green-600 font-bold text-xs">✓ {confInvoice.name}</p>
                      ) : (
                        <p className="text-slate-400 text-xs">点击上传发票（JPG/PNG/PDF ≤10MB）</p>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={!confVoucher}
                    onClick={async () => {
                      if (!confVoucher) return;
                      const ok = await payConference(
                        confPaymentTarget,
                        confVoucher.dataUrl,
                        confInvoice?.dataUrl || "",
                        getConferenceFee(confPaymentTarget),
                      );
                      if (ok) setConfPaymentTarget(null);
                    }}
                    className="w-full bg-[#002B49] hover:bg-[#003d6b] disabled:opacity-40 text-white py-3 rounded-lg font-bold text-sm transition-colors"
                  >
                    提交凭证，等待审核
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Inline conference form dialog — 仅 legacy active 状态快捷入口 */}
        {editingReg && !canAccessConferenceForm(editingReg) && (() => {
          const c = conferences.find(x => x.id === editingReg);
          if (!c) return null;
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-[#E5E1DA] flex items-center justify-between">
                  <h3 className="font-bold text-[#002B49] text-base">填写参会信息</h3>
                  <button onClick={() => setEditingReg(null)} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-xs text-slate-500 mb-4">{c.title} — 此页面为快速提交，完整表单请前往会议详情页填写。</p>
                  <div className="space-y-3 text-xs">
                    <div><label className="font-bold text-slate-700 block mb-1">报告类型</label>
                      <select className="w-full border border-[#E5E1DA] rounded px-3 py-2" defaultValue="口头报告">
                        <option>口头报告</option><option>展板报告</option><option>仅参会</option>
                      </select>
                    </div>
                    <div><label className="font-bold text-slate-700 block mb-1">住宿需求</label>
                      <select className="w-full border border-[#E5E1DA] rounded px-3 py-2" defaultValue="self_arranged">
                        <option value="male_single">男单间（¥450/晚）</option>
                        <option value="male_double">男双人间（¥240/晚）</option>
                        <option value="female_single">女单间（¥450/晚）</option>
                        <option value="female_double">女双人间（¥240/晚）</option>
                        <option value="self_arranged">自主安排</option>
                      </select>
                    </div>
                    <div><label className="font-bold text-slate-700 block mb-1">报告标题（可选）</label>
                      <input type="text" placeholder="请输入报告标题" className="w-full border border-[#E5E1DA] rounded px-3 py-2" />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      submitConferenceForm(editingReg, { name: currentUser?.name || "", gender: currentUser?.gender || "男", unit: currentUser?.unit || "", role: currentUser?.role || "教师", accommodation: "自行安排", session: "古脊椎动物演化与环境专场", presentationType: "口头报告", reportTitle: undefined, abstractFileName: undefined });
                      setEditingReg(null);
                    }}
                    className="w-full mt-4 bg-[#002B49] hover:bg-[#003d6b] text-white py-3 rounded-lg font-bold text-sm transition-colors"
                  >
                    提交参会信息
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // ==========================================================================
  // RENDER: SCIENCE COMMUNICATION (CMS-driven)
  // ==========================================================================
  const renderScienceListItem = (item: ApiCmsEntry) => (
    <article key={item.entryId} className="py-4 flex flex-col gap-2 border-b border-[#E5E1DA] last:border-0 px-1 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 font-bold text-[10px] rounded-sm bg-blue-50 text-blue-700">
          {item.category ?? SCIENCE_FORMAT_LABELS[item.columnCode ?? "article"] ?? "科学传播"}
        </span>
        <time className="text-xs text-slate-500 font-medium">{formatDate(item)}</time>
      </div>
      <h4 className="font-bold text-[#002B49] text-sm">{item.title}</h4>
      {item.summary && <p className="text-slate-500 leading-relaxed">{item.summary}</p>}
      {item.bodyContent && (
        <CmsRichTextBody html={item.bodyContent} className="text-xs text-slate-600 line-clamp-3" />
      )}
      {item.linkUrl && (
        <a
          className="text-[#002B49] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all w-fit"
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          查看详情 <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
        </a>
      )}
    </article>
  );

  const renderScienceComm = () => {
    const bookItems = filteredScienceItems.filter(i => (i.columnCode ?? "article") === "book");
    const baseItems = filteredScienceItems.filter(i => (i.columnCode ?? "article") === "base");
    const listItems = filteredScienceItems.filter(i => {
      const fmt = i.columnCode ?? "article";
      return fmt !== "book" && fmt !== "base";
    });

    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/4 space-y-2">
            <h2 className="text-base font-bold text-[#002B49] mb-4 border-b border-[#E5E1DA] pb-2">科学传播大纲</h2>
            <button
              type="button"
              onClick={() => setScienceFormat("all")}
              className={`w-full text-left px-4 py-2 rounded font-bold flex justify-between items-center text-xs ${
                scienceFormat === "all" ? "bg-[#002B49] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              全部内容
              <span className="material-symbols-outlined text-sm">{scienceFormat === "all" ? "arrow_right_alt" : "chevron_right"}</span>
            </button>
            {SCIENCE_FORMAT_ORDER.map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setScienceFormat(fmt)}
                className={`w-full text-left px-4 py-2 rounded font-bold flex justify-between items-center text-xs ${
                  scienceFormat === fmt ? "bg-[#002B49] text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {SCIENCE_FORMAT_LABELS[fmt]}
                <span className="material-symbols-outlined text-sm">{scienceFormat === fmt ? "arrow_right_alt" : "chevron_right"}</span>
              </button>
            ))}
          </div>

          <div className="w-full md:w-3/4 space-y-8 text-xs">
            {scienceLoading && <p className="text-sm text-slate-500">加载中…</p>}

            {!scienceLoading && filteredScienceItems.length === 0 && (
              <p className="text-sm text-slate-500 py-8 text-center">暂无科学传播内容，请在管理后台「科学传播」模块维护并发布。</p>
            )}

            {!scienceLoading && bookItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bookItems.map(item => (
                  <div key={item.entryId} className="bg-white border border-[#E5E1DA] p-6 rounded-lg">
                    <h3 className="text-sm font-bold text-[#002B49] mb-2">{item.title}</h3>
                    <p className="text-slate-500 mb-4 min-h-16 leading-relaxed">{item.summary ?? ""}</p>
                    {item.category && (
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">{item.category}</span>
                    )}
                    {item.linkUrl && (
                      <a className="mt-3 block text-[#002B49] font-bold text-[10px] hover:underline" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                        访问链接
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!scienceLoading && baseItems.length > 0 && (
              <div className="border-t border-[#E5E1DA] pt-6">
                <h3 className="font-bold text-[#002B49] text-sm mb-4">科普基地工作动态</h3>
                <div className="space-y-4">
                  {baseItems.map(item => (
                    <div key={item.entryId} className="bg-white border border-[#E5E1DA] p-5 rounded-lg flex gap-4 items-start">
                      <span className="material-symbols-outlined text-4xl text-[#715a3e] shrink-0">explore</span>
                      <div>
                        <h4 className="font-bold text-[#002B49] text-xs">{item.title}</h4>
                        {item.summary && <p className="text-slate-500 mt-1 leading-relaxed">{item.summary}</p>}
                        {item.bodyContent && <CmsRichTextBody html={item.bodyContent} className="mt-2 text-slate-600" />}
                        {item.linkUrl && (
                          <a className="mt-2 inline-flex text-[#002B49] font-bold text-[10px] hover:underline" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                            了解更多
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!scienceLoading && listItems.length > 0 && (
              <div className={bookItems.length > 0 || baseItems.length > 0 ? "border-t border-[#E5E1DA] pt-6" : ""}>
                {(scienceFormat === "all" && (bookItems.length > 0 || baseItems.length > 0)) && (
                  <h3 className="font-bold text-[#002B49] text-sm mb-4">更多内容</h3>
                )}
                {listItems.map(renderScienceListItem)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER: INTERNATIONAL EXCHANGE (CMS-driven)
  // ==========================================================================
  const renderInternational = () => (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
        <div className="lg:col-span-1">
          <div className="sticky top-40 space-y-6">
            <div className="bg-white border border-[#E5E1DA] rounded-lg overflow-hidden shadow-sm">
              <div className="bg-[#002B49] text-white px-6 py-4 font-bold">栏目导航</div>
              <nav className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setIntlTypeFilter("all")}
                  className={`px-6 py-3 border-b border-[#E5E1DA] hover:bg-slate-50 transition-colors flex items-center justify-between group text-left ${
                    intlTypeFilter === "all" ? "bg-slate-50" : ""
                  }`}
                >
                  <span className="text-sm">全部动态</span>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#002B49] text-xs">arrow_forward_ios</span>
                </button>
                {INTL_NAV.map(nav => (
                  <button
                    key={nav.code}
                    type="button"
                    onClick={() => setIntlTypeFilter(nav.code)}
                    className={`px-6 py-3 border-b border-[#E5E1DA] last:border-b-0 hover:bg-slate-50 transition-colors flex items-center justify-between group text-left ${
                      intlTypeFilter === nav.code ? "bg-slate-50" : ""
                    }`}
                  >
                    <span className="text-sm">{nav.label}</span>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-[#002B49] text-xs">arrow_forward_ios</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6 bg-slate-50 border-l-4 border-[#002B49] rounded-lg">
              <h4 className="font-bold text-[#002B49] mb-3 text-sm">联系国际合作处</h4>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">如有国际会议、学术访问或合作咨询，欢迎联系我们。</p>
              <a className="text-[#002B49] font-bold text-xs flex items-center gap-2 hover:underline" href="mailto:intl@chinapsc.cn">
                <span className="material-symbols-outlined text-base">mail</span> intl@chinapsc.cn
              </a>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="mb-8 flex justify-between items-center border-b-2 border-[#002B49] pb-4">
            <h2 className="text-2xl font-bold text-[#002B49]">国际交流动态</h2>
          </div>

          {intlLoading && <p className="text-sm text-slate-500">加载中…</p>}

          {!intlLoading && filteredIntlItems.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">暂无国际交流动态，请在管理后台「国际交流」模块维护并发布。</p>
          )}

          <div className="space-y-0 divide-y divide-[#E5E1DA] border-t border-[#E5E1DA]">
            {filteredIntlItems.map(item => {
              const type = item.columnCode ?? "news";
              const label = INTL_TYPE_LABELS[type] ?? item.category ?? "国际交流";
              const icon = INTL_TYPE_ICONS[type] ?? "public";
              return (
                <article key={item.entryId} className="py-6 flex gap-6 items-start hover:bg-slate-50 transition-all duration-200 group px-2">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#002B49] rounded-lg flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-0.5 font-bold text-[10px] rounded-sm bg-[#f5e0ba] text-[#241a03]">{label}</span>
                      <time className="text-xs text-slate-500 font-medium">{formatDate(item)}</time>
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-slate-800 group-hover:text-[#002B49] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>
                    )}
                    {item.bodyContent && (
                      <div className="mt-3 hidden lg:block">
                        <CmsRichTextBody html={item.bodyContent} className="text-xs line-clamp-3" />
                      </div>
                    )}
                    {item.linkUrl && (
                      <div className="mt-4">
                        <a
                          className="text-[#002B49] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all"
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看全文 <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                        </a>
                      </div>
                    )}
                  </div>
                  {item.coverUrl && (
                    <img src={item.coverUrl} alt={item.title} className="w-24 h-24 object-cover rounded border border-[#E5E1DA] shrink-0 hidden md:block" />
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <section className="bg-[#002B49] py-12 rounded-lg mt-12">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-8">全球学术伙伴</h2>
          {intlPartnerItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-90 hover:opacity-100 transition-opacity items-center justify-items-center max-w-4xl mx-auto px-4">
              {intlPartnerItems.map(item => (
                item.linkUrl ? (
                  <a
                    key={item.entryId}
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                  >
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="h-12 object-contain max-w-full" />
                    ) : (
                      <div className="text-sm font-bold border border-white/20 px-4 py-2 rounded">{item.title}</div>
                    )}
                  </a>
                ) : (
                  <div key={item.entryId} className="flex flex-col items-center gap-2">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="h-12 object-contain max-w-full" />
                    ) : (
                      <div className="text-sm font-bold border border-white/20 px-4 py-2 rounded">{item.title}</div>
                    )}
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">合作机构信息请在管理后台「国际交流 → 合作机构」中维护。</p>
          )}
        </div>
      </section>
    </div>
  );

  // ==========================================================================
  // RENDER: SCIENCE & TECHNOLOGY AWARDS (CMS-driven)
  // ==========================================================================
  const renderAwards = () => {
    const primaryGuide = techGuideItems[0];

    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        {techLoading && <p className="text-sm text-slate-500 mb-8">加载中…</p>}

        {!techLoading && techIntroItems.length === 0 && techGuideItems.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center mb-8">暂无科技奖励内容，请在管理后台「科技奖励」模块维护并发布。</p>
        )}

        {techIntroItems.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#002B49] mb-8 border-b-2 border-[#002B49] pb-4">奖项体系</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {techIntroItems.map((item, idx) => {
                const style = AWARD_CARD_STYLES[idx % AWARD_CARD_STYLES.length];
                return (
                  <div key={item.entryId} className={`p-6 rounded-lg border-2 transition-all hover:shadow-lg ${style.color}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="material-symbols-outlined text-3xl text-[#002B49]">{style.icon}</span>
                      <h3 className="font-bold text-[#002B49] text-lg">{item.title}</h3>
                    </div>
                    {item.summary && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{item.summary}</p>
                    )}
                    {item.bodyContent && (
                      <CmsRichTextBody html={item.bodyContent} className="text-sm text-slate-600 leading-relaxed line-clamp-4" />
                    )}
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full py-2 bg-[#002B49] text-white font-bold text-xs rounded hover:bg-[#001f35] transition-colors flex items-center justify-center gap-1"
                      >
                        了解详情 <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {techGuideItems.length > 0 && (
          <div className="bg-white border border-[#E5E1DA] rounded-lg p-8 mb-12 shadow-sm">
            <h3 className="text-xl font-bold text-[#002B49] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span> 申报指南
            </h3>
            {techGuideItems.length === 1 ? (
              <>
                {primaryGuide.title && primaryGuide.title !== "申报指南" && (
                  <h4 className="font-bold text-[#002B49] mb-4">{primaryGuide.title}</h4>
                )}
                {primaryGuide.bodyContent && (
                  <CmsRichTextBody html={primaryGuide.bodyContent} className="text-sm text-slate-600 leading-relaxed prose-sm max-w-none" />
                )}
              </>
            ) : (
              <div className="space-y-8">
                {techGuideItems.map(item => (
                  <div key={item.entryId} className="border-b border-[#E5E1DA] last:border-0 pb-6 last:pb-0">
                    <h4 className="font-bold text-[#002B49] mb-3">{item.title}</h4>
                    {item.bodyContent && (
                      <CmsRichTextBody html={item.bodyContent} className="text-sm text-slate-600 leading-relaxed" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-4">
              {techGuideItems.some(g => g.fileUrl) && (
                techGuideItems.filter(g => g.fileUrl).map(g => (
                  <a
                    key={g.entryId}
                    href={g.fileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#002B49] text-white font-bold text-xs rounded hover:bg-[#001f35] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span> 下载{g.title.includes("申报") ? "申报表" : "附件"}
                  </a>
                ))
              )}
              {techGuideItems.some(g => g.linkUrl) && (
                techGuideItems.filter(g => g.linkUrl).map(g => (
                  <a
                    key={`link-${g.entryId}`}
                    href={g.linkUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 border-2 border-[#002B49] text-[#002B49] font-bold text-xs rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">open_in_new</span> 在线申报
                  </a>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // RENDER: PROFESSIONAL BRANCHES (专业分会)
  // ==========================================================================
  const renderBranches = () => {
    const branchesData = [
      { id: "gwjz", name: "古无脊椎动物学分会", shortName: "古无脊椎", icon: "pest_control", color: "#002B49", founded: "2016年12月18日", location: "贵州贵阳", intro: "中国古生物学会古无脊椎动物学分会是中国古生物学会下的一个二级组织，2016年12月18日在贵州贵阳成立。成立古无脊椎动物学分会，是中国古生物学会发展历程中具有里程碑式的大事，不仅可以有效联合国内各单位相关专家，组织学术交流，而且利于这一重要学科领域的人才培养、强化科学普及活动，并积极促进本学科的发展，力争和保持在国际上的学科优势地位，为我国古生物学事业发展作出新贡献。", tags: ["无脊椎化石", "学术交流", "人才培养"] },
      { id: "kpgz", name: "科普工作委员会", shortName: "科普委", icon: "science", color: "#1a5276", founded: "不详", location: "南京", intro: "科普工作委员会是中国古生物学会最年轻的分支机构之一，自成立以来，在中国古生物学会的领导下，在各位委员大力支持下，委员会团结全国广大地质古生物科普工作者、特别是自然类博物馆及文创系统的同志们，开展了一系列卓有成效的科普工作，为扩大中国古生物学会在社会上影响，发挥地质古生物学科在科学传播和提高全民科学素质，动员和鼓励科研人员参与科普工作做出了积极努力和贡献。", tags: ["科学传播", "博物馆", "全民科普"] },
      { id: "bfxfh", name: "孢粉学分会", shortName: "孢粉学", icon: "local_florist", color: "#1e8449", founded: "1979年", location: "天津", intro: "1979年，约300名孢粉学家在天津举行会议，正式成立中国孢粉学会（PSC）。作为中国孢粉学的奠基人，徐仁教授当选为理事长。此后，孢粉学在中国得到了更加快速的发展，1988年在册会员已超过510名。现在仍有250多位孢粉工作者活跃在孢粉学各个研究领域。中国是国际孢粉学会联合会的发起国之一，2000年学会成功地在中国南京组织召开了第十届国际孢粉学大会，约300名代表出席了这次盛会。", tags: ["孢粉化石", "古生态", "生物地层"] },
      { id: "wtx", name: "微体学分会", shortName: "微体学", icon: "biotech", color: "#6c3483", founded: "1979年3月", location: "长沙", intro: "中国微体古生物学会成立大会及第一次学术会议于1979年3月21日至27日在长沙召开。微体学分会自成立以来，在推动我国微体古生物学学术交流及学科发展、服务我国矿产能源勘探开发等方面做出了重要贡献。", tags: ["微体化石", "有孔虫", "能源勘探"] },
      { id: "hszl", name: "化石藻类专业委员会", shortName: "化石藻类", icon: "grass", color: "#117a65", founded: "1981年12月", location: "南京", intro: "中国古生物学会化石藻类专业委员会成立于1981年12月，发起人为朱浩然、邢裕盛、曹瑞骥、刘志礼。是中国古生物学会的组成部分，是我国化石藻类专业科学技术工作组跨行业、跨部门自愿结合依法登记成立，具有公益性和科学性的非营利性的社会学术团体。", tags: ["藻类化石", "跨行业合作", "公益学术"] },
      { id: "gzwxfh", name: "古植物学分会", shortName: "古植物", icon: "park", color: "#1d6a27", founded: "1983年", location: "西安", intro: "中国古生物学会古植物学分会自1983年于西安成立以来，不断发展壮大，来自中国的古植物学者们在古植物系统演化、古气候与古环境变化、碳循环与大气二氧化碳浓度变化等领域做出了卓越贡献，在早期陆生植物演化、银杏类演化、被子植物起源与演化等领域建树颇丰，跻身世界前列。", tags: ["古植物演化", "古气候", "被子植物起源"] },
      { id: "dqswx", name: "地球生物学分会", shortName: "地球生物", icon: "public", color: "#1a5276", founded: "2018年9月18日", location: "南京", intro: "中国古生物学会地球生物学分会成立于2018年9月18日，发起人为谢树成等，是中国古生物学会重要组成部分，具有公益性和科学性的非营利性的社会学术团体。地球生物学分会旨在团结地球生物学科技工作者，推动国内地球生物学的发展与提升学科领域整体研究水平。", tags: ["地球生物学", "学科交叉", "研究水平"] },
      { id: "gst", name: "古生态专业分会", shortName: "古生态", icon: "eco", color: "#196f3d", founded: "1988年10月", location: "山东临朐", intro: "1988年10月29日至11月2日，中国古生物学会古生态专业委员会第一届学术年会在山东临朐召开，并选举杨式溥为中国古生物学会古生态专业委员会主任。古生态专业委员会旨在团结、组织全国古生态学工作者，发扬学术民主，贯彻百花齐放的方针，坚持实事求是的科学态度和优良学风，面向现代化，面向世界，面向未来。", tags: ["古生态", "学术民主", "生物环境"] },
      { id: "gjzdw", name: "古脊椎动物学分会", shortName: "古脊椎", icon: "cruelty_free", color: "#784212", founded: "1984年10月17日", location: "山东莱阳", intro: "中国古脊椎动物学会是中国古生物学会下的一个二级组织，1984年10月17日在山东莱阳成立。本会定名为古脊椎动物学会，是中国古生物学会的二级学会，是我国古脊椎动物学界群众性的学术团体。宗旨是团结全国古脊椎动物学工作者积极开展学术交流，提高古脊椎动物学研究的科学水平，为推动我国古脊椎动物学事业的发展，为本门学科领域出成果、出人才作出贡献。", tags: ["脊椎动物", "恐龙", "哺乳动物"] },
      { id: "swcj", name: "生物沉积学分会", shortName: "生物沉积", icon: "layers", color: "#5d6d7e", founded: "2024年10月26日", location: "中国地质大学（武汉）", intro: "中国古生物学会生物沉积学分会是中国古生物学会下的一个二级组织。2024年10月26日，中国古生物学会生物沉积学分会成立大会在中国地质大学（武汉）未来城校区召开。生物沉积学是一门现代生物学、古生物学、沉积学和地球化学高度交叉的学科分支，旨在揭示生物参与发生在地球上各种沉积过程和化学循环的机制。", tags: ["生物沉积", "地球化学", "学科交叉"] },
      { id: "xjsxff", name: "新技术新方法专业委员会", shortName: "新技术", icon: "precision_manufacturing", color: "#1b2631", founded: "2024年12月7日", location: "中国地质大学（武汉）", intro: "专委会旨在搭建古生物新技术新方法的交流、合作平台，推动古生物学研究与新技术、新方法的深度融合，进而解决古生物学中的难题，提升我国古生物学研究的国际竞争力。中国古生物学会新技术新方法专业委员会于2024年12月7日在中国地质大学（武汉）召开第一届会员代表大会暨第一届一次学术年会。", tags: ["新技术", "数字化", "国际竞争力"] },
    ];

    const selectedId = selectedBranchId;
    const setSelectedId = setSelectedBranchId;
    const selected = branchesData.find(b => b.id === selectedId);

    if (selectedId === TOTAL_SOCIETY_ID) {
      return (
        <div className="max-w-7xl mx-auto py-10 px-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <button onClick={() => setSelectedId(null)} className="hover:text-[#002B49] transition-colors flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>专业分会列表
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">{ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID]}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border-2 border-[#D9C5A0] rounded-xl overflow-hidden shadow-sm">
                <div className="h-2 bg-gradient-to-r from-[#D9C5A0] via-[#c8a96e] to-[#D9C5A0]" />
                <div className="p-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D9C5A0] to-[#c8a96e] flex items-center justify-center mb-4 shadow-md">
                    <span className="material-symbols-outlined text-[28px] text-white">account_balance</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#002B49] mb-1" style={{ fontFamily: "Georgia, serif" }}>{ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID]}</h2>
                  <p className="text-xs text-slate-400 mb-5">总学会 · 学术年会与重要论坛发布</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TOTAL_SOCIETY_TAGS.map(tag => (
                      <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D9C5A0]/10 text-[#715a3e] border border-[#D9C5A0]/30">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[#715a3e]">info</span>
                  <h3 className="text-lg font-bold text-[#002B49]" style={{ fontFamily: "Georgia, serif" }}>模块说明</h3>
                </div>
                <p className="text-sm text-slate-700 leading-8 tracking-wide">{TOTAL_SOCIETY_INTRO}</p>
              </div>
              <div className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-[#002B49] text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    已发布的会议与活动
                  </h4>
                  <button
                    onClick={() => {
                      setConferenceBranchFilter(TOTAL_SOCIETY_ID);
                      setActiveTab("conference");
                      setSelectedId(null);
                    }}
                    className="text-xs font-bold text-[#002B49] hover:text-[#715a3e] transition-colors flex items-center gap-1"
                  >
                    查看全部会议
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {TOTAL_SOCIETY_MEETINGS.map(meeting => (
                    <button
                      key={meeting.id}
                      onClick={() => {
                        setConferenceBranchFilter(TOTAL_SOCIETY_ID);
                        setActiveTab("conference");
                        setSelectedId(null);
                      }}
                      className="w-full text-left border border-[#E5E1DA] rounded-lg p-4 hover:border-[#D9C5A0] hover:bg-[#D9C5A0]/5 transition-all"
                    >
                      <p className="font-bold text-[#002B49] text-sm mb-1">{meeting.title}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">schedule</span>{meeting.time}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">location_on</span>{meeting.location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedId && selected) {
      return (
        <div className="max-w-7xl mx-auto py-10 px-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <button onClick={() => setSelectedId(null)} className="hover:text-[#002B49] transition-colors flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>专业分会列表
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002B49] font-bold">{selected.name}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-[#E5E1DA] rounded-xl overflow-hidden shadow-sm">
                <div className="h-2" style={{ backgroundColor: selected.color }} />
                <div className="p-6">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: selected.color + "15" }}>
                    <span className="material-symbols-outlined text-[28px]" style={{ color: selected.color }}>{selected.icon}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#002B49] mb-1" style={{ fontFamily: "Georgia, serif" }}>{selected.name}</h2>
                  <p className="text-xs text-slate-400 mb-5">中国古生物学会下属专业分会</p>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#715a3e] mt-0.5">event</span>
                      <div><p className="text-slate-400 font-bold mb-0.5">成立时间</p><p className="font-bold text-slate-700">{selected.founded}</p></div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#715a3e] mt-0.5">location_on</span>
                      <div><p className="text-slate-400 font-bold mb-0.5">成立地点</p><p className="font-bold text-slate-700">{selected.location}</p></div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="material-symbols-outlined text-[16px] text-[#715a3e] mt-0.5">account_balance</span>
                      <div><p className="text-slate-400 font-bold mb-0.5">上级单位</p><p className="font-bold text-slate-700">中国古生物学会</p></div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">研究方向</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: selected.color + "12", color: selected.color }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E5E1DA] rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">其他分会</p>
                <div className="space-y-1">
                  {branchesData.filter(b => b.id !== selected.id).slice(0, 6).map(b => (
                    <button key={b.id} onClick={() => setSelectedId(b.id)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:text-[#002B49] hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: b.color }}>{b.icon}</span>{b.name}
                    </button>
                  ))}
                  {branchesData.filter(b => b.id !== selected.id).length > 6 && (
                    <button onClick={() => setSelectedId(null)} className="w-full text-left px-3 py-2 text-xs font-bold text-[#715a3e] hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">expand_more</span>查看全部分会
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[#715a3e]">info</span>
                  <h3 className="text-lg font-bold text-[#002B49]" style={{ fontFamily: "Georgia, serif" }}>分会简介</h3>
                </div>
                <p className="text-sm text-slate-700 leading-8 tracking-wide">{selected.intro}</p>
              </div>
              <div className="bg-[#f5f8fb] border border-[#002B49]/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#002B49]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#002B49] text-[20px]">link</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#002B49] text-sm mb-1">了解更多</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">如需了解该分会的最新动态、会议通知及学术资源，请在本站查看该分会发布的学术会议。</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setConferenceBranchFilter(BRANCH_SERVICES_ID_MAP[selected.id] || selected.id);
                        setActiveTab("conference");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002B49] hover:text-[#715a3e] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">event</span>查看该分会会议
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E5E1DA] rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-[#002B49] text-sm mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>全部专业分会
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {branchesData.map(b => (
                    <button key={b.id} onClick={() => setSelectedId(b.id)} className={`text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${ b.id === selected.id ? "border-[#002B49] bg-[#002B49] text-white" : "border-[#E5E1DA] text-slate-600 hover:border-[#002B49]/30 hover:bg-slate-50" }`}>
                      {b.shortName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto py-10 px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#002B49] mb-2" style={{ fontFamily: "Georgia, serif" }}>专业分会</h2>
          <p className="text-slate-500 text-xs">总学会 + 11个专业分会（委员会），点击任意卡片查看详细介绍。</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 总学会卡片 — 点击进入总学会会议模块 */}
          <div
            onClick={() => setSelectedId(TOTAL_SOCIETY_ID)}
            className="bg-white border-2 border-[#D9C5A0] rounded-xl p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden sm:col-span-2 lg:col-span-3"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D9C5A0] via-[#c8a96e] to-[#D9C5A0]" />
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D9C5A0] to-[#c8a96e] flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[28px] text-white">account_balance</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#002B49] text-base group-hover:text-[#715a3e] transition-colors">{ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID]}</h3>
                  <span className="text-[9px] font-bold bg-[#D9C5A0]/20 text-[#715a3e] px-2 py-0.5 rounded-full">总学会</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{TOTAL_SOCIETY_INTRO}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {TOTAL_SOCIETY_TAGS.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D9C5A0]/10 text-[#715a3e] border border-[#D9C5A0]/30">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">已发布 {TOTAL_SOCIETY_MEETINGS.length} 场活动</span>
                  <span className="flex items-center text-xs font-bold gap-1 text-[#715a3e] group-hover:text-[#002B49] transition-colors">
                    查看详情<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          {branchesData.map((branch, idx) => (
            <div key={branch.id} onClick={() => setSelectedId(branch.id)} className="bg-white border border-[#E5E1DA] rounded-xl p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: branch.color }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: branch.color + "15" }}>
                  <span className="material-symbols-outlined text-[24px]" style={{ color: branch.color }}>{branch.icon}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: branch.color + "12", color: branch.color }}>{String(idx + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="font-bold text-[#002B49] text-base mb-1 group-hover:text-[#715a3e] transition-colors">{branch.name}</h3>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed line-clamp-3">{branch.intro}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {branch.tags.map(tag => (<span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{tag}</span>))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">成立：{branch.founded}</span>
                <span className="flex items-center text-xs font-bold gap-1 transition-colors" style={{ color: branch.color }}>查看详情<span className="material-symbols-outlined text-[14px]">arrow_forward</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <PartyLayout currentPageTitle="学会服务" breadcrumbs={[{ title: "学会服务", href: "/services" }]}>
      <div className="flex flex-col">
        {/* Navigation Tabs Bar */}
        <div className="bg-white border-b border-[#E5E1DA] sticky top-[60px] z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-2">
            <button onClick={() => { setActiveTab("main"); setShowFeePayment(null); setSelectedConference(null); setEditingReg(null); }} className={`px-4 py-3 font-bold text-xs transition-all flex items-center gap-2 border-b-2 -mb-[1px] ${activeTab === "main" ? "border-[#002B49] text-[#002B49]" : "border-transparent text-slate-500 hover:text-[#002B49]"}`}>
              <span className="material-symbols-outlined text-[18px]">home</span> 服务大厅
            </button>
            <button onClick={() => { setActiveTab("branches"); setShowFeePayment(null); setSelectedConference(null); setEditingReg(null); }} className={`px-4 py-3 font-bold text-xs transition-all flex items-center gap-2 border-b-2 -mb-[1px] ${activeTab === "branches" ? "border-[#002B49] text-[#002B49]" : "border-transparent text-slate-500 hover:text-[#002B49]"}`}>
              <span className="material-symbols-outlined text-[18px]">account_tree</span> 专业分会
            </button>
            <button onClick={() => { setActiveTab("member"); setShowFeePayment(null); setSelectedConference(null); setEditingReg(null); }} className={`px-4 py-3 font-bold text-xs transition-all flex items-center gap-2 border-b-2 -mb-[1px] ${activeTab === "member" ? "border-[#002B49] text-[#002B49]" : "border-transparent text-slate-500 hover:text-[#002B49]"}`}>
              <span className="material-symbols-outlined text-[18px]">card_membership</span> 会员服务
            </button>
            <button onClick={() => { setActiveTab("conference"); setShowFeePayment(null); setSelectedConference(null); setEditingReg(null); }} className={`px-4 py-3 font-bold text-xs transition-all flex items-center gap-2 border-b-2 -mb-[1px] ${activeTab === "conference" ? "border-[#002B49] text-[#002B49]" : "border-transparent text-slate-500 hover:text-[#002B49]"}`}>
              <span className="material-symbols-outlined text-[18px]">event</span> 学术会议
            </button>
            {cmsServiceTabs.map(cat => (
              <button
                key={cat.websiteTabKey}
                onClick={() => { setActiveTab(cat.websiteTabKey); setShowFeePayment(null); setSelectedConference(null); setEditingReg(null); }}
                className={`px-4 py-3 font-bold text-xs transition-all flex items-center gap-2 border-b-2 -mb-[1px] ${activeTab === cat.websiteTabKey ? "border-[#002B49] text-[#002B49]" : "border-transparent text-slate-500 hover:text-[#002B49]"}`}
              >
                <span className="material-symbols-outlined text-[18px]">{CMS_TAB_ICONS[cat.contentModule]}</span> {cat.navName}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow bg-[#FCFAF7] min-h-[60vh]">
          {activeTab === "main" && renderMainPortal()}
          {activeTab === "branches" && renderBranches()}
          {activeTab === "member" && renderMemberServices()}
          {activeTab === "conference" && (selectedConference || editingReg ? renderConferenceServices() : renderConferenceList())}
          {activeCmsCategory?.contentModule === "science" && renderScienceComm()}
          {activeCmsCategory?.contentModule === "international" && renderInternational()}
          {activeCmsCategory?.contentModule === "tech-rewards" && renderAwards()}
        </div>
      </div>
      <LoginJoinDialog open={dialogOpen} onOpenChange={setDialogOpen} initialTab={dialogTab} />

      {/* 未盖章会议通知预览 */}
      {noticePreviewConfId && (() => {
        const previewConf = conferences.find(c => c.id === noticePreviewConfId);
        if (!previewConf) return null;
        const feeConfig = getConferenceFeeConfig(previewConf.id);
        const publicUrl = getConferenceFileUrl(previewConf.id, "publicNotice");
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNoticePreviewConfId(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[#E5E1DA] flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">未盖章通知预览</span>
                  <h3 className="font-bold text-[#002B49] text-base mt-1">{previewConf.title}</h3>
                </div>
                <button onClick={() => setNoticePreviewConfId(null)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs text-slate-600">
                {publicUrl ? (
                  <iframe src={publicUrl} title="会议通知" className="w-full h-96 border border-[#E5E1DA] rounded-lg" />
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-sm">info</span>
                      <p className="text-amber-800">本通知未加盖学会电子章，仅供查阅。缴费终审确认后可下载盖章版 PDF。</p>
                    </div>
                    <p><strong>主办：</strong>{previewConf.branchName}</p>
                    <p><strong>时间：</strong>{previewConf.time}</p>
                    <p><strong>地点：</strong>{previewConf.location}</p>
                    <p><strong>会议简介：</strong>{previewConf.desc}</p>
                    <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg p-4 space-y-1">
                      <p className="font-bold text-[#002B49] mb-2">四类注册费标准</p>
                      {([
                        ["student_member", feeConfig.studentMember],
                        ["non_student_member", feeConfig.nonStudentMember],
                        ["student_non_member", feeConfig.studentNonMember],
                        ["non_student_non_member", feeConfig.nonStudentNonMember],
                      ] as [ConferenceFeeType, number][]).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{CONFERENCE_FEE_TYPE_LABEL[key]}</span>
                          <span className="font-bold">{val > 0 ? `¥${val}` : "--"}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-500">缴费截止：{previewConf.feeDeadline} · 摘要截止：{previewConf.abstractDeadline}</p>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-[#E5E1DA] bg-slate-50 flex flex-wrap gap-2 justify-end sticky bottom-0">
                <button
                  onClick={() => setNoticePreviewConfId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    const confId = previewConf.id;
                    setNoticePreviewConfId(null);
                    setSelectedConference(confId);
                  }}
                  className="px-4 py-2 bg-[#002B49] text-white rounded-lg font-bold text-xs hover:bg-[#001f35]"
                >
                  前往报名
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </PartyLayout>
  );
}
