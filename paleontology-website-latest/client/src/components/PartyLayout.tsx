import React from "react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useMembership } from "../contexts/MembershipContext";
import { useCmsChannels } from "@/hooks/useCmsChannels";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import LoginJoinDialog from "./LoginJoinDialog";
import MembershipChoiceDialog from "./MembershipChoiceDialog";
import MembershipApplicationDialog from "./MembershipApplicationDialog";

interface PartyLayoutProps {
  children: React.ReactNode;
  currentPageTitle: string;
  breadcrumbs?: { title: string; href?: string }[];
  /** CMS 驱动：覆盖默认全宽判断 */
  fullWidth?: boolean;
  /** CMS 驱动：是否显示党建侧栏 */
  showPartySidebar?: boolean;
  routePath?: string;
}

export default function PartyLayout({ children, currentPageTitle, breadcrumbs, fullWidth, showPartySidebar }: PartyLayoutProps) {
  const [location, setLocation] = useLocation();
  const { currentUser, isLoggedIn, logout, notifications, markNotificationRead, markAllNotificationsRead, societyMembership, userType, membershipChoiceMade } = useMembership();
  const siteConfig = useSiteConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogOpenTab] = useState<"login" | "register">("login");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  const [showJoinAppDialog, setShowJoinAppDialog] = useState(false);

  // 首次登录且未做选择时，弹出决策对话框
  React.useEffect(() => {
    if (isLoggedIn && userType === "regular" && !membershipChoiceMade) {
      setShowChoiceDialog(true);
    } else {
      setShowChoiceDialog(false);
    }
  }, [isLoggedIn, userType, membershipChoiceMade]);

  const unreadNotifs = notifications.filter(n => !n.read);

  const hideJoinMemberButton = isLoggedIn && (
    societyMembership.status === "active" ||
    societyMembership.status === "application_submitted" ||
    societyMembership.status === "application_approved" ||
    societyMembership.status === "voucher_submitted" ||
    societyMembership.status === "invoice_submitted" ||
    societyMembership.status === "invoice_pending" ||
    societyMembership.status === "invoice_overdue" ||
    societyMembership.status === "pending"
  );

  // Route groupings
  const isSocietyHome = location === "/";
  const isServicesPage = location === "/services";
  
  // Party routes start with /party or match party sub-pages
  const partyPaths = [
    "/party", "/announcements", "/organizations", "/committees", "/work", 
    "/activities", "/team-building", "/theory-study", "/dynamics", 
    "/special-topics", "/exemplars", "/reporting", "/downloads"
  ];
  const isPartyPage = partyPaths.some(path => location === path || location.startsWith(path + "/"));
  const isStructurePage = location === "/structure" || location.startsWith("/structure/");

  const isFullWidthPage = fullWidth ?? (isSocietyHome || isServicesPage || location === "/intro" || isStructurePage || location === "/history" || location === "/gallery" || location === "/society-announcements" || location === "/news-publish" || location === "/public-downloads" || location === "/international" || location === "/science" || location === "/regulations" || location === "/personal-center");
  const showPartySidebarLayout = showPartySidebar ?? (isPartyPage && !isFullWidthPage);

  const { mainNavLinks, partyNavItems: navItems } = useCmsChannels();

  return (
    <div className="bg-paper-bright text-on-surface font-body-md antialiased min-h-screen flex flex-col">
      {/* TopNavBar - Perfectly matching Image 3 and pasted_content_2.txt */}
      <header className="w-full sticky top-0 z-50 bg-strata-blue-deep dark:bg-ink-dark border-b border-tertiary shadow-md">
        <div className="flex flex-col w-full max-w-7xl mx-auto px-4 lg:px-8 py-2">
          {/* Utility Bar */}
          <div className="flex justify-end gap-6 pb-2 border-b border-white/10 mb-2 relative">
            <div className="flex gap-4 items-center">
              <button className="text-white opacity-90 hover:opacity-100 font-label-caps text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">language</span> EN
              </button>
              
              {isLoggedIn && currentUser ? (
                <div className="flex items-center gap-4 relative">
                  {/* Notifications Badge */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        const opening = !showNotifMenu;
                        setShowNotifMenu(opening);
                        setShowUserMenu(false);
                        // Mark all as read when opening the panel
                        if (opening && unreadNotifs.length > 0) {
                          markAllNotificationsRead();
                        }
                      }}
                      className="text-white opacity-90 hover:opacity-100 flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">notifications</span>
                      {unreadNotifs.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {unreadNotifs.length}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifMenu && (
                      <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E1DA] rounded-lg shadow-xl py-2 z-50 text-slate-800">
                        <div className="px-4 py-2 border-b border-[#E5E1DA] flex justify-between items-center">
                          <span className="font-bold text-xs text-[#002B49]">系统消息通知</span>
                          <span className="text-[10px] text-slate-400">共 {notifications.length} 条</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-slate-400">
                              暂无通知消息
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id} className={`px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${
                                n.read ? "opacity-60 bg-slate-50/50" : "hover:bg-slate-50"
                              }`}>
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center gap-1.5">
                                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5"></span>}
                                    <span className={`text-xs font-bold ${
                                      n.type === "success" ? "text-green-600" : n.type === "warning" ? "text-amber-600" : "text-blue-600"
                                    }`}>{n.title}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 flex-shrink-0 ml-2">{n.time.split(" ")[1] || n.time}</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{n.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="px-4 py-2 border-t border-[#E5E1DA] text-center">
                          <button 
                            onClick={() => { setLocation("/services"); setShowNotifMenu(false); }}
                            className="text-[11px] text-[#002B49] font-bold hover:underline"
                          >
                            进入学会服务大厅查看全部
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
                      className="text-[#f5e0ba] font-bold text-xs flex items-center gap-1 hover:opacity-100 transition-opacity bg-white/10 px-2 py-1 rounded"
                    >
                      <span className="material-symbols-outlined text-[16px]">account_circle</span>
                      {currentUser.name} {currentUser.role === "学生" ? "同学" : "老师"}
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E1DA] rounded-lg shadow-xl py-1 z-50 text-slate-800">
                        <div className="px-4 py-2 border-b border-[#E5E1DA] text-xs">
                          <p className="font-bold text-slate-500">登录账号</p>
                          <p className="text-slate-400 truncate">{currentUser.email}</p>
                        </div>
                        <button 
                          onClick={() => { setLocation("/personal-center"); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                        >
                          <span className="material-symbols-outlined text-[16px]">account_circle</span> 个人中心
                        </button>

                        <button 
                          onClick={() => { setLocation("/personal-center?tab=branches"); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                        >
                          <span className="material-symbols-outlined text-[16px]">account_tree</span> 我的分会
                        </button>
                        <div className="border-t border-[#E5E1DA] my-1"></div>
                        <button
                          onClick={() => { logout(); setShowUserMenu(false); setLocation("/"); }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span> 安全退出
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setDialogOpenTab("login"); setDialogOpen(true); }}
                    className="text-white opacity-90 hover:opacity-100 font-label-caps text-xs flex items-center gap-1 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">login</span> 登录
                  </button>
                </>
              )}
            </div>
            {/* 加入会员按钮 - 未登录引导注册；已登录且未完成入会流程时弹窗申请 */}
            {!hideJoinMemberButton && (
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    setDialogOpenTab("register");
                    setDialogOpen(true);
                  } else if (!membershipChoiceMade || userType === "regular") {
                    setShowChoiceDialog(true);
                  } else {
                    setShowJoinAppDialog(true);
                  }
                }}
                className="flex items-center gap-1.5 bg-[#f5c842] hover:bg-[#f0bc30] text-[#002B49] font-bold text-xs px-3 py-1.5 rounded transition-colors shadow-sm whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span> 加入会员
              </button>
            )}
            <div className="relative group">
              <input 
                className="bg-white/10 border-none rounded-full px-4 py-1 text-white text-xs w-48 focus:ring-1 focus:ring-tertiary-fixed placeholder:text-white/50 transition-all group-hover:bg-white/20" 
                placeholder="搜索..." 
                type="text" 
              />
              <span className="material-symbols-outlined absolute right-3 top-1 text-white/50 text-[18px]">search</span>
            </div>
          </div>
          
          {/* Main Navigation */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4 xingkai-script">
              <Link href="/">
                <span className="text-[28px] lg:text-[32px] text-white not-italic tracking-wider cursor-pointer font-normal" style={{ textShadow: "rgba(0, 0, 0, 0.5) 2px 2px 4px" }}>
                  中国古生物学会
                </span>
              </Link>
            </div>
            <nav className="hidden lg:flex items-center h-full gap-1.5 flex-nowrap">
              {mainNavLinks.map((link, idx) => {
                // Highlighting rules:
                // - If on a party page, highlight "党建文化"
                // - Otherwise, match exact location path
                const isActive = link.path === "/party" 
                  ? isPartyPage 
                  : location === link.path;

                return (
                  <React.Fragment key={idx}>
                    <Link href={link.path}>
                      <span className={`font-label-caps text-xs not-italic whitespace-nowrap px-1 py-1 cursor-pointer transition-colors duration-200 ${isActive ? "text-tertiary-fixed border-b-2 border-tertiary-fixed pb-1 font-semibold" : "text-on-primary opacity-90 hover:opacity-100 hover:text-tertiary-fixed text-white"}`} style={isActive ? { color: '#f5e0ba', borderColor: '#f5e0ba' } : undefined}>
                        {link.title}
                      </span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </nav>
            {/* Mobile Trigger */}
            <button className="lg:hidden text-white">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner - Responsive height depending on Home or Subpage */}
      {!isSocietyHome && (
        <section
          className={`w-full flex flex-col justify-center items-center text-white text-center px-4 relative bg-cover bg-center bg-no-repeat shadow-inner transition-all duration-300 ${location === "/party" && isPartyPage ? "h-[400px]" : "h-[200px]"}`}
          style={{
            backgroundImage: `url("${
              isServicesPage || location === "/intro" || isStructurePage || location === "/history" || location === "/gallery" || location === "/society-announcements" || location === "/international" || location === "/science" || location === "/public-downloads" || location === "/regulations"
                ? "https://d2xsxph8kpxj0f.cloudfront.net/310519663722696584/gysodoNdzXEVcwP48r3Ven/services_banner-2sHLykD27n86AKuNQgfgUy.webp"
                : "https://d2xsxph8kpxj0f.cloudfront.net/310519663722696584/gysodoNdzXEVcwP48r3Ven/party_banner-jBQJTUqe4SJ4mSGKcYzD7A.webp"
            }")`,
          }}
        >
          <div className="absolute inset-0 bg-black/40 z-0"></div>
          <div className="max-w-7xl mx-auto w-full flex flex-col items-center relative z-10">
            {location === "/party" ? (
              <>
                <div className="text-[48px] lg:text-[60px] xingkai-script text-tertiary-fixed mb-4 tracking-widest drop-shadow-lg" style={{ color: '#f5e0ba' }}>
                  不忘初心 · 牢记使命
                </div>
                <h1 className="text-[32px] lg:text-[44px] font-bold mb-4 tracking-wider drop-shadow-md">
                  中国古生物学会 · 党建文化中心
                </h1>
                <p className="text-sm lg:text-lg opacity-90 max-w-2xl leading-relaxed tracking-wide">
                  坚持党建引领，传承红色基因。弘扬杰出科学家精神，以高质量党建推动古生物学与地层学研究的跨越式发展，服务国家重大战略需求。
                </p>
              </>
            ) : isServicesPage ? (
              <>
                <h1 className="text-[36px] lg:text-[40px] font-bold mb-2 tracking-wider drop-shadow-md">
                  {currentPageTitle}
                </h1>
                <p className="text-sm lg:text-base opacity-90 tracking-[0.2em] uppercase font-semibold" style={{ color: '#f5e0ba' }}>
                  服务广大会员 · 促进行业发展
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[36px] lg:text-[40px] font-bold mb-2 tracking-wider drop-shadow-md">
                  {currentPageTitle}
                </h1>
                <p className="text-sm lg:text-base opacity-90 tracking-[0.2em] uppercase font-semibold" style={{ color: '#f5e0ba' }}>
                  {isPartyPage ? "不忘初心 · 牢记使命" : "探索生命演化 · 传承地学底蕴"}
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* Container - Flexible grid based on Page */}
      <div className={`${isSocietyHome ? "w-full" : "max-w-7xl w-full mx-auto px-4 lg:px-8 py-8"} flex-grow flex flex-col gap-6`}>
        {showPartySidebarLayout ? (
          /* Two Column Subpage Layout (Party Culture subpages) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full flex-grow">
            {/* Side Navigation */}
            <aside className="lg:col-span-3">
              <nav className="bg-white border border-fossil-stone rounded shadow-sm overflow-hidden sticky top-24">
                <div className="bg-strata-blue-deep text-white px-4 py-3 font-semibold text-[16px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">menu_book</span>
                  <span>党建文化导航</span>
                </div>
                <ul className="flex flex-col">
                  {navItems.map((item) => {
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <li key={item.id} className="border-b border-fossil-stone last:border-0">
                        <Link href={item.path}>
                          <span
                            className={`flex items-center px-4 py-3 transition-colors cursor-pointer text-sm ${
                              isActive
                                ? "bg-accent text-primary font-bold border-l-4 border-party-red"
                                : "hover:bg-paper-bright text-primary"
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[20px] mr-3 ${isActive ? "text-party-red" : "opacity-70"}`}>
                              {item.icon}
                            </span>
                            {item.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-9 flex flex-col">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 bg-white px-4 py-2 border border-fossil-stone rounded shadow-sm">
                <span className="material-symbols-outlined text-[16px]">home</span>
                <Link href="/">
                  <span className="hover:text-primary transition-colors cursor-pointer">首页</span>
                </Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <Link href="/party">
                  <span className="hover:text-primary transition-colors cursor-pointer">党建文化</span>
                </Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {crumb.href ? (
                        <Link href={crumb.href}>
                          <span className="hover:text-primary transition-colors cursor-pointer">{crumb.title}</span>
                        </Link>
                      ) : (
                        <span className="text-party-red font-semibold">{crumb.title}</span>
                      )}
                      {index < breadcrumbs.length - 1 && (
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <span className="text-party-red font-semibold">{currentPageTitle}</span>
                )}
              </div>

              {/* Content Slot */}
              <div className="bg-white border border-fossil-stone rounded shadow-sm p-6 lg:p-8 flex-grow">
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col">
            {!isSocietyHome && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white px-4 py-2 border border-fossil-stone rounded shadow-sm mx-4 lg:mx-8 mb-6">
                <span className="material-symbols-outlined text-[16px]">home</span>
                <Link href="/">
                  <span className="hover:text-primary transition-colors cursor-pointer">首页</span>
                </Link>
                {location !== "/personal-center" && (
                  <>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="text-party-red font-semibold">{currentPageTitle}</span>
                  </>
                )}
                {location === "/personal-center" && (
                  <>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="text-party-red font-semibold">个人中心</span>
                  </>
                )}
              </div>
            )}
            <div className="w-full flex-grow">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full bg-strata-blue-deep dark:bg-ink-dark border-t-4 border-tertiary text-white pt-10 pb-6">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Brand & Contact */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="space-y-4 opacity-80 font-body-sm text-sm">
              {siteConfig.address && (
                <p className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed" style={{ color: '#f5e0ba' }}>location_on</span>
                  {siteConfig.address}
                </p>
              )}
              {siteConfig.zipCode && (
                <p className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed" style={{ color: '#f5e0ba' }}>mail_outline</span>
                  邮编: {siteConfig.zipCode}
                </p>
              )}
              {siteConfig.contactPhone && (
                <p className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed" style={{ color: '#f5e0ba' }}>phone</span>
                  电话: {siteConfig.contactPhone}
                </p>
              )}
              {siteConfig.contactFax && (
                <p className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed" style={{ color: '#f5e0ba' }}>fax</span>
                  传真: {siteConfig.contactFax}
                </p>
              )}
              {siteConfig.contactEmail && (
                <p className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed" style={{ color: '#f5e0ba' }}>mail</span>
                  邮箱: {siteConfig.contactEmail}
                </p>
              )}
            </div>
          </div>

          {/* Related Societies / Friend Links */}
          {siteConfig.friendLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase mb-4 border-b border-white/10 pb-2" style={{ color: '#f5e0ba' }}>
                相关学会
              </h3>
              <ul className="space-y-2 text-xs opacity-80">
                {siteConfig.friendLinks.map((link, idx) => (
                  <li key={idx} className="hover:text-tertiary-fixed transition-colors cursor-pointer">
                    {link.url ? <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a> : link.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* QR Codes */}
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase mb-4 border-b border-white/10 pb-2" style={{ color: '#f5e0ba' }}>
              关注我们
            </h3>
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-20 h-20 bg-white rounded p-1 flex items-center justify-center overflow-hidden">
                  {siteConfig.qrCodeWechat
                    ? <img src={siteConfig.qrCodeWechat} alt="官方微信" className="w-full h-full object-contain" />
                    : <span className="material-symbols-outlined text-primary text-4xl">qr_code_2</span>
                  }
                </div>
                <span className="text-[10px] opacity-70">官方微信</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-20 h-20 bg-white rounded p-1 flex items-center justify-center overflow-hidden">
                  {siteConfig.qrCodeMember
                    ? <img src={siteConfig.qrCodeMember} alt="会员系统" className="w-full h-full object-contain" />
                    : <span className="material-symbols-outlined text-primary text-4xl">qr_code_2</span>
                  }
                </div>
                <span className="text-[10px] opacity-70">会员系统</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-8 pt-6 border-t border-white/10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs opacity-60">
          <span>{siteConfig.copyright}</span>
          <div className="flex gap-4">
            {siteConfig.icpNumber && <span className="hover:underline cursor-pointer">{siteConfig.icpNumber}</span>}
            {siteConfig.icpNumber && siteConfig.securityNumber && <span>|</span>}
            {siteConfig.securityNumber && <span className="hover:underline cursor-pointer">{siteConfig.securityNumber}</span>}
          </div>
        </div>
      </footer>
      <LoginJoinDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialTab={dialogTab}
      />
      <MembershipChoiceDialog
        open={showChoiceDialog}
        onChooseMember={() => {
          setShowChoiceDialog(false);
          setShowJoinAppDialog(true);
        }}
      />
      <MembershipApplicationDialog open={showJoinAppDialog} onOpenChange={setShowJoinAppDialog} />
    </div>
  );
}
