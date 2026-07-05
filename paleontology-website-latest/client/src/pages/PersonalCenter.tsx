import { useState, useEffect } from "react";
import PartyLayout from "../components/PartyLayout";
import { useMembership } from "../contexts/MembershipContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CONFERENCE_FEE_TYPE_LABEL, ALL_SOCIETY_UNITS, TOTAL_SOCIETY_ID, BRANCH_MAP, getConferenceDisplayInfo, isActiveConferenceRegistration, isKnownConferenceCode } from "@shared/constants";
import { pickFile } from "../lib/fileUpload";

export default function PersonalCenter() {
  const { currentUser, isLoggedIn, societyMembership, boundBranches, conferenceRegs, userType, logout, deleteAccount, updateProfile, withdrawalApplication, submitWithdrawalApplication, cancelWithdrawalApplication, getWithdrawalApplicationTemplateUrl } = useMembership();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "branches" | "conferences" | "payments">("profile");

  // 支持通过 ?tab= 参数直接定位到指定 tab（例如从导航栏"我的分会"跳转）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["profile", "branches", "conferences", "payments"].includes(tabParam)) {
      setActiveTab(tabParam as "profile" | "branches" | "conferences" | "payments");
    }
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Phase 6: 退会申请流程
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [wdFlowStep, setWdFlowStep] = useState(0); // 0=not started, 1=download, 2=upload, 3=submitted
  const [wdAppFile, setWdAppFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    gender: currentUser?.gender || "男",
    unit: currentUser?.unit || "",
    role: currentUser?.role || "",
    title: currentUser?.title || "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!isLoggedIn || !currentUser) {
    return (
      <PartyLayout currentPageTitle="个人中心" breadcrumbs={[{ title: "个人中心", href: "/personal-center" }]}>
        <div className="max-w-4xl mx-auto py-16 px-6 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">account_circle</span>
          <h2 className="text-2xl font-bold text-[#002B49] mb-4">请先登录</h2>
          <p className="text-slate-600 mb-6">您需要登录才能访问个人中心。</p>
          <Button onClick={() => setLocation("/services?tab=member")} className="bg-[#002B49] hover:bg-[#001f35] text-white">
            返回学会服务
          </Button>
        </div>
      </PartyLayout>
    );
  }

  const handleEditChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    if (!formData.name.trim()) { toast.error("姓名不能为空"); return; }
    if (!formData.unit.trim()) { toast.error("单位不能为空"); return; }
    // Phase 1: 同步 isStudent 到用户身份
    updateProfile({
      name: formData.name.trim(),
      gender: formData.gender as "男" | "女",
      unit: formData.unit.trim(),
      role: formData.role as "学生" | "教师" | "嘉宾",
      title: formData.title || undefined,
      isStudent: formData.role === "学生",
    });
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (!passwordData.oldPassword) { toast.error("请输入原密码"); return; }
    if (!passwordData.newPassword) { toast.error("请输入新密码"); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error("新密码与确认密码不一致"); return; }
    if (passwordData.newPassword.length < 6) { toast.error("新密码至少需要6个字符"); return; }
    toast.success("密码已修改");
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswordChange(false);
  };

  // 已绑定分会列表
  const myBoundBranches = (boundBranches || []).map((id: string) => ({
    id,
    name: BRANCH_MAP[id] || id,
  }));

  // 会议报名记录（与学会服务页共用数据源，过滤 legacy 与未开始缴费的记录）
  const myConferences = Object.entries(conferenceRegs || {})
    .filter(([confId, reg]: [string, any]) => isKnownConferenceCode(confId) && isActiveConferenceRegistration(reg.status))
    .map(([confId, reg]: [string, any]) => ({
      confId,
      confInfo: getConferenceDisplayInfo(confId, reg),
      ...reg,
    }));

  // 缴费记录（学会会费历史 + 会议费）
  // 当 history 为空但 status 已有记录时，直接构建一条显示
  const MEMBER_FEE = (() => { try { const stored = localStorage.getItem("paleo_membership_fee_config"); if (stored) { const c = JSON.parse(stored); return c.standard || 200; } } catch {} return 200; })();
  const rawHistory = societyMembership?.history || [];
  const societyPayHistory = rawHistory.length > 0
    ? rawHistory
    : (societyMembership?.status === "active"
      || societyMembership?.status === "voucher_submitted"
      || societyMembership?.status === "invoice_submitted"
      || societyMembership?.status === "invoice_pending"
      || societyMembership?.status === "invoice_overdue"
      || societyMembership?.status === "voucher_rejected"
      || societyMembership?.status === "invoice_rejected")
      ? [{
          id: "auto",
          type: "society_fee" as const,
          targetName: "中国古生物学会会员费",
          amount: societyMembership.amount || MEMBER_FEE,
          voucherUrl: societyMembership.history?.[0]?.voucherUrl || "",
          invoiceUrl: societyMembership.history?.[0]?.invoiceUrl || "",
          submitTime: societyMembership.history?.[0]?.submitTime || "-",
          status: societyMembership.status === "active"
            ? "approved" as const
            : societyMembership.status === "voucher_submitted"
              ? "voucher_submitted" as const
              : societyMembership.status === "invoice_submitted"
                ? "invoice_submitted" as const
                : "rejected" as const,
        }]
      : [];
  const confPayHistory = Object.entries(conferenceRegs || {})
    .filter(([confId, reg]: [string, any]) => isKnownConferenceCode(confId) && isActiveConferenceRegistration(reg.status))
    .map(([confId, reg]: [string, any]) => {
      const display = getConferenceDisplayInfo(confId, reg);
      const feeType = reg.feeType as keyof typeof CONFERENCE_FEE_TYPE_LABEL | undefined;
      return {
        confId,
        title: display.title,
        branchId: display.branchId,
        branchName: display.branchName,
        fee: reg.lockedAmount ?? display.fee,
        status: reg.status,
        submittedAt: reg.voucherSubmitTime || reg.lastUpdated || reg.submittedAt || "-",
        voucherUrl: reg.paymentVoucher || "",
        invoiceUrl: reg.invoiceUrl || "",
        invoiceDeadline: reg.invoiceDeadline || reg.invoiceExtendedDeadline,
        invoiceSubmitTime: reg.invoiceSubmitTime || "",
        name: reg.name || "",
        role: reg.role || "",
        feeTypeLabel: feeType ? CONFERENCE_FEE_TYPE_LABEL[feeType] : "—",
      };
    });

  const confPayBySociety = confPayHistory.reduce<Record<string, typeof confPayHistory>>((acc, record) => {
    const key = record.branchName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  const paymentSections = (() => {
    const sections: {
      id: string;
      name: string;
      societyRecords: typeof societyPayHistory;
      confRecords: typeof confPayHistory;
    }[] = [];
    const totalConfRecords = confPayHistory.filter((r) => r.branchId === TOTAL_SOCIETY_ID);
    if (societyPayHistory.length > 0 || totalConfRecords.length > 0) {
      sections.push({
        id: TOTAL_SOCIETY_ID,
        name: ALL_SOCIETY_UNITS[TOTAL_SOCIETY_ID],
        societyRecords: societyPayHistory,
        confRecords: totalConfRecords,
      });
    }
    for (const [branchName, records] of Object.entries(confPayBySociety)) {
      if (records[0]?.branchId === TOTAL_SOCIETY_ID) continue;
      sections.push({
        id: records[0]?.branchId || branchName,
        name: branchName,
        societyRecords: [],
        confRecords: records,
      });
    }
    return sections;
  })();

  const getMemberStatusBadge = (status: string) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-700 border border-green-200";
      case "application_submitted":
      case "voucher_submitted":
      case "pending": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "application_rejected":
      case "voucher_rejected": return "bg-red-50 text-red-700 border border-red-200";
      case "application_approved": return "bg-green-50 text-green-700 border border-green-200";
      case "invoice_pending": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "invoice_overdue": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "invoice_submitted": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "invoice_rejected":
      case "rejected": return "bg-red-50 text-red-700 border border-red-200";
      case "withdrawal_submitted": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "withdrawn": return "bg-slate-50 text-slate-600 border border-slate-200";
      case "expired": return "bg-gray-50 text-gray-600 border border-gray-200";
      default: return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  const getMemberStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "✓ 会员资格有效";
      case "approved": return "✓ 已审核通过";
      case "application_submitted": return "⏳ 入会申请审核中";
      case "application_rejected": return "✕ 入会申请被驳回";
      case "application_approved": return "✓ 入会申请已通过";
      case "voucher_submitted":
      case "pending": return "⏳ 凭证初审中";
      case "voucher_rejected": return "✕ 凭证被驳回";
      case "invoice_pending": return "待上传发票";
      case "invoice_overdue": return "⚠ 发票逾期";
      case "invoice_submitted": return "⏳ 发票终审中";
      case "invoice_rejected":
      case "rejected": return "✕ 发票被驳回";
      case "withdrawal_submitted": return "⏳ 退会申请审核中";
      case "withdrawn": return "已退会";
      case "expired": return "已过期";
      default: return "未缴费";
    }
  };

  const getMemberStatusBadgeByRecord = (record: any) => {
    if (societyMembership?.status === "active") return "bg-green-50 text-green-700 border border-green-200";
    return getMemberStatusBadge(societyMembership?.status || record.status);
  };

  const getMemberStatusLabelByRecord = (record: any) => {
    if (societyMembership?.status === "active") return "✓ 会员资格有效";
    return getMemberStatusLabel(societyMembership?.status || record.status);
  };

  const getConfStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "submitted":
      case "approved_unfilled":
      case "approved_invoice":
      case "active": return "bg-green-50 text-green-700 border border-green-200";
      case "voucher_submitted":
      case "pending": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "voucher_rejected": return "bg-red-50 text-red-700 border border-red-200";
      case "invoice_pending": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "invoice_overdue": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "invoice_submitted": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "invoice_rejected":
      case "rejected": return "bg-red-50 text-red-700 border border-red-200";
      default: return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  const getConfStatusLabel = (status: string) => {
    switch (status) {
      case "voucher_submitted":
      case "pending": return "⏳ 凭证初审中";
      case "voucher_rejected": return "✕ 凭证被驳回";
      case "invoice_pending": return "待上传发票";
      case "invoice_overdue": return "⚠ 发票逾期";
      case "invoice_submitted": return "⏳ 发票终审中";
      case "invoice_rejected":
      case "rejected": return "✕ 发票被驳回";
      case "confirmed": return "✓ 已确认";
      case "approved_unfilled":
      case "approved_invoice":
      case "active": return "✓ 已缴费";
      case "submitted": return "✓ 已报名";
      default: return status;
    }
  };

  const tabs = [
    { key: "profile", label: "个人信息", icon: "person" },
    { key: "branches", label: "我的分会", icon: "account_tree" },
    { key: "conferences", label: "我的会议", icon: "event" },
    { key: "payments", label: "缴费记录", icon: "receipt_long" },
  ] as const;

  return (
    <PartyLayout currentPageTitle="个人中心" breadcrumbs={[{ title: "个人中心", href: "/personal-center" }]}>
      <div className="max-w-4xl mx-auto py-12 px-6">
        {/* Tab Navigation */}
        <div className="flex gap-0 mb-8 border-b border-[#E5E1DA] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "text-[#002B49] border-b-2 border-[#002B49]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {tab.key === "branches" && myBoundBranches.length > 0 && (
                <span className="ml-1 bg-[#002B49] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {myBoundBranches.length}
                </span>
              )}
              {tab.key === "conferences" && myConferences.length > 0 && (
                <span className="ml-1 bg-[#002B49] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {myConferences.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ===== 个人信息 Tab ===== */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card className="border border-[#E5E1DA] shadow-sm">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#002B49] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {currentUser.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#002B49]">{currentUser.name}</h2>
                      <p className="text-sm text-slate-500">{currentUser.email}</p>
                      {userType === "non_member" && (
                        <span className="inline-block mt-1 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          非会员
                        </span>
                      )}
                      {userType === "regular" && (
                        <span className="inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          待选择参与方式
                        </span>
                      )}
                      {societyMembership?.status === "active" && (
                        <span className="inline-block mt-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ✓ 学会正式会员
                        </span>
                      )}
                      {(societyMembership?.status === "voucher_submitted" || societyMembership?.status === "pending") && (
                        <span className="inline-block mt-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ⏳ 凭证初审中
                        </span>
                      )}
                      {societyMembership?.status === "invoice_pending" && (
                        <span className="inline-block mt-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          待上传发票
                        </span>
                      )}
                      {societyMembership?.status === "invoice_submitted" && (
                        <span className="inline-block mt-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ⏳ 发票终审中
                        </span>
                      )}
                      {societyMembership?.status === "application_submitted" && (
                        <span className="inline-block mt-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ⏳ 入会申请审核中
                        </span>
                      )}
                      {societyMembership?.status === "application_approved" && (
                        <span className="inline-block mt-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ✓ 入会申请已通过
                        </span>
                      )}
                      {societyMembership?.status === "withdrawal_submitted" && (
                        <span className="inline-block mt-1 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ⏳ 退会申请审核中
                        </span>
                      )}
                    </div>
                  </div>
                  {!isEditing && !showPasswordChange && (
                    <Button onClick={() => setIsEditing(true)} className="bg-[#002B49] hover:bg-[#001f35] text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">edit</span> 编辑信息
                    </Button>
                  )}
                </div>

                {!showPasswordChange && (
                  <div className="space-y-5">
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">邮箱（不可编辑）</Label>
                      <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{currentUser.email}</div>
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">姓名 <span className="text-red-500">*</span></Label>
                      {isEditing ? (
                        <Input value={formData.name} onChange={(e) => handleEditChange("name", e.target.value)} className="border-[#E5E1DA]" placeholder="请输入姓名" />
                      ) : (
                        <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{formData.name}</div>
                      )}
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">性别</Label>
                      {isEditing ? (
                        <select value={formData.gender} onChange={(e) => handleEditChange("gender", e.target.value)} className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">
                          <option value="男">男</option>
                          <option value="女">女</option>
                        </select>
                      ) : (
                        <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{formData.gender}</div>
                      )}
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">工作/学习单位 <span className="text-red-500">*</span></Label>
                      {isEditing ? (
                        <Input value={formData.unit} onChange={(e) => handleEditChange("unit", e.target.value)} className="border-[#E5E1DA]" placeholder="请输入工作/学习单位" />
                      ) : (
                        <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{formData.unit}</div>
                      )}
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">职务类型（可选）</Label>
                      {isEditing ? (
                        <div className="flex gap-2 flex-wrap">
                          {["学生", "老师", "其他"].map((r) => (
                            <button key={r} onClick={() => handleEditChange("role", r)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${formData.role === r ? "bg-[#002B49] text-white" : "border border-[#002B49] text-[#002B49] hover:bg-slate-50"}`}>{r}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{formData.role || "未填写"}</div>
                      )}
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">职称（可选）</Label>
                      {isEditing ? (
                        <Input value={formData.title} onChange={(e) => handleEditChange("title", e.target.value)} className="border-[#E5E1DA]" placeholder="如：教授、博士后、硕士生等" />
                      ) : (
                        <div className="bg-slate-50 border border-[#E5E1DA] rounded-lg px-4 py-3 text-slate-700 text-sm">{formData.title || "未填写"}</div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <Button onClick={() => setIsEditing(false)} className="flex-1 border border-slate-300 text-slate-700 hover:bg-slate-50">取消</Button>
                        <Button onClick={handleSaveProfile} className="flex-1 bg-[#002B49] hover:bg-[#001f35] text-white">保存修改</Button>
                      </div>
                    )}
                  </div>
                )}

                {showPasswordChange && (
                  <div className="space-y-5">
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">原密码 <span className="text-red-500">*</span></Label>
                      <Input type="password" value={passwordData.oldPassword} onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })} className="border-[#E5E1DA]" placeholder="请输入原密码" />
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">新密码 <span className="text-red-500">*</span></Label>
                      <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="border-[#E5E1DA]" placeholder="请输入新密码（至少6位）" />
                    </div>
                    <div>
                      <Label className="font-bold text-[#002B49] mb-2 block text-sm">确认新密码 <span className="text-red-500">*</span></Label>
                      <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="border-[#E5E1DA]" placeholder="请再次输入新密码" />
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                      <Button onClick={() => setShowPasswordChange(false)} className="flex-1 border border-slate-300 text-slate-700 hover:bg-slate-50">取消</Button>
                      <Button onClick={handleChangePassword} className="flex-1 bg-[#002B49] hover:bg-[#001f35] text-white">修改密码</Button>
                    </div>
                  </div>
                )}

                {!isEditing && !showPasswordChange && (
                  <div className="pt-6 border-t border-slate-100">
                    <Button variant="outline" onClick={() => setShowPasswordChange(true)} className="border-[#002B49] text-[#002B49] hover:bg-slate-50">
                      <span className="material-symbols-outlined text-sm mr-1">lock</span> 修改密码
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border border-[#E5E1DA] shadow-sm bg-blue-50">
              <div className="p-6">
                <h3 className="font-bold text-[#002B49] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">info</span> 账户安全提示
                </h3>
                <ul className="text-sm text-slate-700 space-y-2 ml-6">
                  <li>• 邮箱地址是您的唯一登录凭证，无法修改。</li>
                  <li>• 请定期修改密码以保护账户安全。</li>
                  <li>• 修改密码时需要输入原密码进行验证。</li>
                </ul>
              </div>
            </Card>

            {/* Phase 6: 退会申请（仅有效会员可见） */}
            {societyMembership?.status === "active" && (
              <Card className="border border-orange-200 shadow-sm">
                <div className="p-6">
                  <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">exit_to_app</span> 退会申请
                  </h3>

                  {!showWithdrawal && (
                    <div>
                      <p className="text-sm text-slate-600 mb-4">申请退会后，您的学会会员资格将即时终止。已缴费的待参会订单保留，可继续以非会员身份参会，历史参会记录完整保留。</p>
                      <Button onClick={() => setShowWithdrawal(true)} className="border border-orange-400 text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">exit_to_app</span>
                        申请退会
                      </Button>
                    </div>
                  )}

                  {showWithdrawal && wdFlowStep === 0 && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs text-orange-800">
                        <p className="font-bold mb-2">⚠ 退会须知：</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>当前学会会员资格即时终止</li>
                          <li>已缴费的待参会订单保留，正常参会</li>
                          <li>可继续以非会员身份参加其他会议</li>
                          <li>历史参会记录完整保留</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setShowWithdrawal(false)} className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50">取消</Button>
                        <Button onClick={() => setWdFlowStep(1)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">继续退会申请</Button>
                      </div>
                    </div>
                  )}

                  {showWithdrawal && wdFlowStep === 1 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                        <p className="font-bold mb-1">Step 1/3：下载退会申请书模板</p>
                        <p className="text-blue-700">请下载下方的退会申请书模板，填写后上传。</p>
                      </div>
                      <button
                        onClick={() => {
                          const url = getWithdrawalApplicationTemplateUrl();
                          if (url) { window.open(url, "_blank"); toast.success("模板下载已开始"); }
                          else { toast.info("当前无可用模板，请直接上传您的退会申请书。"); }
                        }}
                        className="w-full border-2 border-dashed border-orange-400 text-orange-600 hover:bg-orange-50 px-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        下载退会申请书模板
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setWdFlowStep(0)} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">上一步</button>
                        <button onClick={() => setWdFlowStep(2)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs py-2">已下载，下一步上传</button>
                      </div>
                    </div>
                  )}

                  {showWithdrawal && wdFlowStep === 2 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                        <p className="font-bold mb-1">Step 2/3：上传退会申请书 <span className="text-red-600">【必填】</span></p>
                        <p className="text-blue-700">有效会员申请退会须提交电子版退会申请书（.doc/.docx/.pdf），经管理员审核通过后正式解除会员资格。</p>
                      </div>
                      <div onClick={() => {
                        pickFile(".doc,.docx,.pdf", 20, (file) => {
                          setWdAppFile(file);
                          toast.success("退会申请书已选择");
                        });
                      }} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${wdAppFile ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:bg-slate-50 hover:border-orange-400"}`}>
                        {wdAppFile ? (
                          <div>
                            <span className="material-symbols-outlined text-4xl text-green-600 mb-2">check_circle</span>
                            <p className="text-xs font-bold text-green-700">已上传：{wdAppFile.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">点击可重新上传</p>
                          </div>
                        ) : (
                          <div>
                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                            <p className="text-xs font-bold text-[#002B49]">点击上传退会申请书</p>
                            <p className="text-[10px] text-slate-400 mt-1">支持 .doc / .docx / .pdf 格式</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setWdFlowStep(1); setWdAppFile(null); }} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">上一步</button>
                        <button
                          onClick={async () => {
                            if (!wdAppFile) { toast.error("请先上传退会申请书"); return; }
                            const ok = await submitWithdrawalApplication(wdAppFile);
                            if (ok) setWdFlowStep(0);
                          }}
                          disabled={!wdAppFile}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs py-2"
                        >
                          确认提交退会申请
                        </button>
                      </div>
                    </div>
                  )}

                  {showWithdrawal && wdFlowStep === 3 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                      <p className="font-bold mb-1">⏳ 退会申请已提交</p>
                      <p className="text-yellow-700">您的退会申请书已提交，管理员审核通过后会员资格将即时终止。</p>
                      <button
                        onClick={() => { cancelWithdrawalApplication(); setShowWithdrawal(false); setWdFlowStep(0); setWdAppFile(null); }}
                        className="w-full border border-green-600 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs py-2"
                      >
                        撤销退会申请
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Phase 6: 退会申请审核中 / 已退会状态 */}
            {(societyMembership?.status === "withdrawal_submitted" || societyMembership?.status === "withdrawn") && (
              <Card className="border border-orange-200 shadow-sm">
                <div className="p-6">
                  <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">exit_to_app</span> 退会状态
                  </h3>
                  {societyMembership?.status === "withdrawal_submitted" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
                      <p className="font-bold mb-1">⏳ 退会申请审核中</p>
                      <p className="text-yellow-700">管理员正在审核您的退会申请书。</p>
                      {withdrawalApplication?.applicationFileName && (
                        <p className="text-yellow-600 text-[10px]">已上传：{withdrawalApplication.applicationFileName}</p>
                      )}
                      <button
                        onClick={() => { cancelWithdrawalApplication(); }}
                        className="w-full border border-green-600 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs py-2"
                      >
                        撤销退会申请
                      </button>
                    </div>
                  )}
                  {societyMembership?.status === "withdrawn" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                      <p className="font-bold mb-1">已退会</p>
                      <p>您已退出中国古生物学会。可继续以非会员身份参加学术会议。</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="border border-red-200 shadow-sm">
              <div className="p-6">
                <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">manage_accounts</span> 账户操作
                </h3>

                {/* 安全退出 */}
                <div className="pb-5 mb-5 border-b border-red-100">
                  <p className="text-sm text-slate-600 mb-3">退出当前账户，返回首页。您的所有数据已安全保存。</p>
                  <Button
                    onClick={() => { logout(); setLocation("/"); }}
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    安全退出登录
                  </Button>
                </div>

                {/* 注销账号 */}
                <div>
                  <p className="text-sm text-slate-700 mb-2 font-bold">注销账号</p>
                  <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                    注销后，您的账户将被<strong className="text-red-600">永久删除</strong>，包括个人资料、会员资格、分会绑定、会议报名记录及全部通知消息。<br />
                    此操作<strong className="text-red-600">不可撤销</strong>，请谨慎选择。
                  </p>

                  {!showDeleteConfirm ? (
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border border-red-400 text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">person_remove</span>
                      注销账号
                    </Button>
                  ) : (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-red-700 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        确认注销？此操作不可撤销！
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            deleteAccount();
                            setLocation("/");
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">done</span>
                          确认注销
                        </Button>
                        <Button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ===== 我的分会 Tab ===== */}
        {activeTab === "branches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[#002B49] flex items-center gap-2">
                <span className="material-symbols-outlined">account_tree</span>
                我的分会
              </h3>
              <span className="text-sm text-slate-500">已绑定 {myBoundBranches.length} / 11 个分会</span>
            </div>

            {/* 会员状态提示 */}
            {userType === "regular" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">lock</span>
                <div>
                  <p className="font-bold">需要先选择参与方式</p>
                  <p className="text-amber-700 mt-1">请先选择「成为正式会员」或「作为非会员继续」，两种身份均可绑定分会并报名会议。</p>
                </div>
              </div>
            )}
            {myBoundBranches.length === 0 ? (
              <Card className="border border-[#E5E1DA] shadow-sm p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">account_tree</span>
                <p className="text-slate-500 mb-4">您还未绑定任何专业分会</p>
                <Button onClick={() => setLocation("/services?tab=member")} className="bg-[#002B49] hover:bg-[#001f35] text-white">
                  前往绑定分会
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {myBoundBranches.map((branch) => (
                  <Card key={branch.id} className="border border-green-200 bg-green-50/40 shadow-sm">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#002B49] rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[16px]">account_tree</span>
                        </div>
                        <div>
                          <p className="font-bold text-[#002B49] text-sm">{branch.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">绑定后可接收该分会的会议通知与学术资讯</p>
                        </div>
                      </div>
                      <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-1 rounded-full">
                        ✓ 已绑定
                      </span>
                    </div>
                  </Card>
                ))}
                <div className="text-center pt-2">
                  <button onClick={() => setLocation("/services?tab=member")} className="text-sm text-[#002B49] font-bold hover:underline">
                    管理分会绑定 →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 我的会议 Tab ===== */}
        {activeTab === "conferences" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#002B49] flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">event</span>
              我的会议
            </h3>

            {myConferences.length === 0 ? (
              <Card className="border border-[#E5E1DA] shadow-sm p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">event_busy</span>
                <p className="text-slate-500 mb-4">您还未报名参加任何会议</p>
                <Button onClick={() => setLocation("/services?tab=conference")} className="bg-[#002B49] hover:bg-[#001f35] text-white">
                  浏览会议列表
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myConferences.map((conf) => (
                  <Card key={conf.confId} className="border border-[#E5E1DA] shadow-sm">
                    <div className="p-5 space-y-3">
                      {/* 会议标题和状态 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-[#002B49] text-sm leading-snug">{conf.confInfo.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">{conf.confInfo.branchName}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${getConfStatusBadge(conf.status)}`}>
                          {getConfStatusLabel(conf.status)}
                        </span>
                      </div>

                      {/* 会议基本信息 */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {conf.confInfo.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {conf.confInfo.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">payments</span>
                          注册费：¥{conf.confInfo.fee}
                        </div>
                        {conf.submittedAt && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            提交时间：{conf.submittedAt}
                          </div>
                        )}
                      </div>

                      {/* 发票截止日倒计时 */}
                      {conf.status === "invoice_pending" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                          {(() => {
                            const deadline = conf.invoiceDeadline;
                            if (deadline) {
                              const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              return daysLeft > 0
                                ? <span>发票上传截止：{deadline}（剩余 {daysLeft} 天）</span>
                                : <span className="text-red-600 font-bold">发票已逾期！</span>;
                            }
                            return <span>请完成发票上传</span>;
                          })()}
                        </div>
                      )}

                      {conf.status === "invoice_overdue" && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700 font-bold">
                          ⚠ 发票上传已逾期
                        </div>
                      )}

                      {/* 参会信息（已通过后显示） */}
                      {(conf.status === "confirmed" || conf.status === "invoice_pending" || conf.status === "invoice_overdue" || conf.status === "invoice_submitted" || conf.status === "submitted" || conf.status === "approved_unfilled") && conf.name && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
                          <p className="font-bold text-green-700 mb-1">参会信息</p>
                          {conf.name && <p className="text-green-700">姓名：{conf.name}</p>}
                          {conf.role && <p className="text-green-700">身份：{conf.role}</p>}
                          {conf.presentationType && <p className="text-green-700">报告类型：{conf.presentationType}</p>}
                          {conf.reportTitle && <p className="text-green-700">报告题目：{conf.reportTitle}</p>}
                          {conf.accommodation && <p className="text-green-700">住宿：{conf.accommodation}</p>}
                        </div>
                      )}

                      {/* 驳回原因 */}
                      {(conf.status === "voucher_rejected" || conf.status === "rejected") && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                          <p className="font-bold text-red-700">凭证驳回原因：</p>
                          <p className="text-red-600 mt-1">{conf.voucherRejectReason || conf.rejectReason || "—"}</p>
                        </div>
                      )}
                      {conf.status === "invoice_rejected" && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                          <p className="font-bold text-red-700">发票驳回原因：</p>
                          <p className="text-red-600 mt-1">{conf.invoiceRejectReason || "—"}</p>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      {conf.status === "invoice_pending" && (
                        <button
                          onClick={() => setLocation("/services?tab=conference")}
                          className="w-full bg-[#002B49] hover:bg-[#001f35] text-white px-4 py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          前往填写信息 / 上传发票
                        </button>
                      )}
                      {conf.status === "approved_unfilled" && (
                        <button
                          onClick={() => setLocation("/services?tab=conference")}
                          className="w-full bg-[#002B49] hover:bg-[#001f35] text-white px-4 py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          前往填写参会信息
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 缴费记录 Tab（按学会分组） ===== */}
        {activeTab === "payments" && (
          <div className="space-y-8">
            {societyMembership?.status === "application_submitted" && (
              <Card className="border border-yellow-200 bg-yellow-50/30 shadow-sm p-4">
                <p className="text-xs font-bold text-yellow-800 mb-2">⏳ 入会申请审核中</p>
                <p className="text-xs text-yellow-700 mb-3">管理员审核通过后可缴纳会费，请耐心等待。</p>
                <button
                  onClick={() => setLocation("/services?tab=member")}
                  className="border border-[#002B49] text-[#002B49] px-4 py-2 rounded font-bold text-xs hover:bg-white"
                >
                  前往会员服务 →
                </button>
              </Card>
            )}
            {paymentSections.length === 0 ? (
              <Card className="border border-[#E5E1DA] shadow-sm p-8 text-center">
                <p className="text-slate-500 text-sm">暂无缴费记录</p>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  <button onClick={() => setLocation("/services?tab=member")} className="text-sm text-[#002B49] font-bold hover:underline">
                    申请入会 →
                  </button>
                  <button onClick={() => setLocation("/services?tab=conference")} className="text-sm text-[#002B49] font-bold hover:underline">
                    浏览会议 →
                  </button>
                </div>
              </Card>
            ) : (
              paymentSections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-base font-bold text-[#002B49] flex items-center gap-2 mb-3 pb-2 border-b border-[#E5E1DA]">
                    <span className="material-symbols-outlined text-[18px]">
                      {section.id === TOTAL_SOCIETY_ID ? "account_balance" : "groups"}
                    </span>
                    {section.name}
                  </h3>
                  <div className="grid gap-3">
                    {section.societyRecords.map((record: any, idx: number) => (
                      <Card key={`soc-${idx}`} className="border border-[#E5E1DA] shadow-sm">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-500 text-[18px]">receipt</span>
                              </div>
                              <div>
                                <p className="font-bold text-[#002B49] text-sm">学会会员费</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  缴费金额：¥{record.amount || societyMembership?.amount || "-"}
                                  {record.submitTime && <span className="ml-2">· {record.submitTime}</span>}
                                </p>
                                <span className="inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {currentUser?.isStudent || currentUser?.role === "学生" ? "学生会员" : "非学生会员"} · ¥{record.amount || societyMembership?.amount || "-"}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${getMemberStatusBadgeByRecord(record)}`}>
                              {getMemberStatusLabelByRecord(record)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                            {record.voucherUrl ? (
                              <a href={record.voucherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#002B49] hover:text-[#C41E3A] transition-colors">
                                <span className="material-symbols-outlined text-[14px]">description</span>
                                查看缴费凭证
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-[14px]">description</span>
                                暂无缴费凭证
                              </span>
                            )}
                            {record.invoiceUrl ? (
                              <a href={record.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#002B49] hover:text-[#C41E3A] transition-colors">
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                查看电子发票
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                暂无电子发票
                              </span>
                            )}
                          </div>
                        </div>
                        {societyMembership?.status === "active" && idx === 0 && section.id === TOTAL_SOCIETY_ID && (
                          <div className="px-4 pb-3 text-xs text-green-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">event_available</span>
                            会员有效期至：{societyMembership?.expiryDate || "-"}
                          </div>
                        )}
                      </Card>
                    ))}
                    {section.confRecords.map((record, idx) => (
                      <Card key={`conf-${idx}`} className="border border-[#E5E1DA] shadow-sm">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
                                <span className="material-symbols-outlined text-slate-500 text-[18px]">receipt_long</span>
                              </div>
                              <div>
                                <p className="font-bold text-[#002B49] text-sm leading-snug">{record.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  注册费：¥{record.fee}
                                  {record.submittedAt && <span className="ml-2">· 提交于 {record.submittedAt}</span>}
                                </p>
                                <span className="inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {record.feeTypeLabel} · ¥{record.fee}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${getConfStatusBadge(record.status)}`}>
                              {getConfStatusLabel(record.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                            {record.voucherUrl ? (
                              <a href={record.voucherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#002B49] hover:text-[#C41E3A] transition-colors">
                                <span className="material-symbols-outlined text-[14px]">description</span>
                                查看缴费凭证
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-[14px]">description</span>
                                暂无缴费凭证
                              </span>
                            )}
                            {record.invoiceUrl ? (
                              <a href={record.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#002B49] hover:text-[#C41E3A] transition-colors">
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                查看电子发票
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                暂无电子发票
                              </span>
                            )}
                            {record.invoiceDeadline && record.status === "invoice_pending" && (
                              <span className="text-[10px] text-blue-600 font-bold ml-auto">
                                发票截止：{record.invoiceDeadline}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PartyLayout>
  );
}
