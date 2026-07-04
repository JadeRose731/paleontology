import { useState, useMemo } from "react";
import { useAdmin, type ConferenceRecord, type ConferenceData } from "@/contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, MapPin, Calendar, Users, AlertCircle } from "lucide-react";
import { ALL_SOCIETY_UNITS, type ConferenceFeeConfig, createDefaultFieldTripRoutes, FIELD_TRIP_GENDER_RESTRICTION_LABEL, type FieldTripGenderRestriction, type FieldTripRoute } from "@shared/constants";

const ALL_BRANCH_OPTIONS = Object.entries(ALL_SOCIETY_UNITS).map(([id, name]) => ({ value: id, label: name }));

const DEFAULT_SESSION = { id: `session-${Date.now()}`, name: "" };

function ConferenceForm({
  initialData,
  onSubmit,
  onCancel,
  title,
}: {
  initialData?: ConferenceRecord;
  onSubmit: (data: ConferenceData) => void;
  onCancel: () => void;
  title: string;
}) {
  const { adminRole, adminBranchId } = useAdmin();
  // Phase 1: 分会管理员只能选择本分会
  const branchOptions = useMemo(() => {
    if (adminRole === "branch_admin" && adminBranchId) {
      return ALL_BRANCH_OPTIONS.filter(opt => opt.value === adminBranchId);
    }
    return ALL_BRANCH_OPTIONS;
  }, [adminRole, adminBranchId]);

  const [name, setName] = useState(initialData?.name || "");
  const [branchId, setBranchId] = useState(initialData?.branchId || (adminRole === "branch_admin" ? adminBranchId || "" : ""));
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [feeStudentMember, setFeeStudentMember] = useState(initialData?.feeConfig?.studentMember?.toString() || "");
  const [feeNonStudentMember, setFeeNonStudentMember] = useState(initialData?.feeConfig?.nonStudentMember?.toString() || "");
  const [feeStudentNonMember, setFeeStudentNonMember] = useState(initialData?.feeConfig?.studentNonMember?.toString() || "");
  const [feeNonStudentNonMember, setFeeNonStudentNonMember] = useState(initialData?.feeConfig?.nonStudentNonMember?.toString() || "");
  const [paymentDeadline, setPaymentDeadline] = useState(initialData?.paymentDeadline || "");
  const [abstractDeadline, setAbstractDeadline] = useState(initialData?.abstractDeadline || "");
  // Phase 4: 住宿/野外截止时间
  const [accommodationDeadline, setAccommodationDeadline] = useState(initialData?.accommodationDeadline || "");
  const [fieldTripDeadline, setFieldTripDeadline] = useState(initialData?.fieldTripDeadline || "");
  // Phase 4: 野外路线配置
  const [fieldTripRoutes, setFieldTripRoutes] = useState<FieldTripRoute[]>(
    initialData?.fieldTripRoutes || []
  );
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status || "draft");
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>(
    initialData?.sessions || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Phase 2: File upload state
  const [publicNoticeFile, setPublicNoticeFile] = useState<{ name: string; dataUrl: string } | null>(
    initialData?.publicNoticeUrl ? { name: initialData.publicNoticeName || "public_notice.pdf", dataUrl: initialData.publicNoticeUrl } : null
  );
  const [stampedNoticeFile, setStampedNoticeFile] = useState<{ name: string; dataUrl: string } | null>(
    initialData?.stampedNoticeUrl ? { name: initialData.stampedNoticeName || "notice.pdf", dataUrl: initialData.stampedNoticeUrl } : null
  );
  const [abstractTemplateFile, setAbstractTemplateFile] = useState<{ name: string; dataUrl: string } | null>(
    initialData?.abstractTemplateUrl ? { name: initialData.abstractTemplateName || "template.docx", dataUrl: initialData.abstractTemplateUrl } : null
  );
  // Phase 6: 学会级别模板（入会/退会申请书）— 存储在全局 localStorage
  const [membershipAppTemplateFile, setMembershipAppTemplateFile] = useState<{ name: string; dataUrl: string } | null>(() => {
    const stored = localStorage.getItem("paleo_membership_application_template");
    if (stored) {
      try { const d = JSON.parse(stored); return { name: d.name || "入会申请书模板.docx", dataUrl: d.url || "" }; }
      catch { return null; }
    }
    return null;
  });
  const [withdrawalAppTemplateFile, setWithdrawalAppTemplateFile] = useState<{ name: string; dataUrl: string } | null>(() => {
    const stored = localStorage.getItem("paleo_withdrawal_application_template");
    if (stored) {
      try { const d = JSON.parse(stored); return { name: d.name || "退会申请书模板.docx", dataUrl: d.url || "" }; }
      catch { return null; }
    }
    return null;
  });

  const handleFileUpload = (fileType: "publicNotice" | "stampedNotice" | "abstractTemplate", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (fileType === "publicNotice") {
        setPublicNoticeFile({ name: file.name, dataUrl });
      } else if (fileType === "stampedNotice") {
        setStampedNoticeFile({ name: file.name, dataUrl });
      } else {
        setAbstractTemplateFile({ name: file.name, dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Phase 6: 模板文件上传（入会/退会申请书）
  const handleTemplateUpload = (templateType: "membershipApp" | "withdrawalApp", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const templateData = { name: file.name, url: dataUrl, updatedAt: new Date().toISOString() };
      if (templateType === "membershipApp") {
        setMembershipAppTemplateFile({ name: file.name, dataUrl });
        localStorage.setItem("paleo_membership_application_template", JSON.stringify(templateData));
      } else {
        setWithdrawalAppTemplateFile({ name: file.name, dataUrl });
        localStorage.setItem("paleo_withdrawal_application_template", JSON.stringify(templateData));
      }
    };
    reader.readAsDataURL(file);
  };

  const addSession = () => {
    setSessions([...sessions, { id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "" }]);
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const updateSessionName = (id: string, name: string) => {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  // Phase 4: Field trip route management
  const addFieldTripRoute = () => {
    if (fieldTripRoutes.length >= 15) {
      return; // Max 15 routes
    }
    setFieldTripRoutes([
      ...fieldTripRoutes,
      { id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, phase: "pre" as const, name: "", order: fieldTripRoutes.length + 1 },
    ]);
  };

  const removeFieldTripRoute = (id: string) => {
    setFieldTripRoutes(fieldTripRoutes.filter((r) => r.id !== id));
  };

  const fillDefaultFieldTripRoutes = () => {
    const prefix = `route-${branchId || "conf"}-${Date.now()}`;
    const hint = location.trim() || "当地";
    setFieldTripRoutes(createDefaultFieldTripRoutes(prefix, hint));
  };

  const updateFieldTripRoute = (id: string, updates: Partial<FieldTripRoute>) => {
    setFieldTripRoutes(fieldTripRoutes.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "请输入会议名称";
    if (!branchId) newErrors.branchId = "请选择主办学会";
    if (!startDate) newErrors.startDate = "请选择开始日期";
    if (!endDate) newErrors.endDate = "请选择结束日期";
    if (!location.trim()) newErrors.location = "请输入地点";
    if (!feeNonStudentMember || isNaN(parseFloat(feeNonStudentMember))) newErrors.feeNonStudentMember = "请输入非学生会员费";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const feeConfig: ConferenceFeeConfig = {
      studentMember: parseFloat(feeStudentMember) || 0,
      nonStudentMember: parseFloat(feeNonStudentMember) || 0,
      studentNonMember: parseFloat(feeStudentNonMember) || 0,
      nonStudentNonMember: parseFloat(feeNonStudentNonMember) || 0,
    };
    onSubmit({
      name: name.trim(),
      branchId,
      startDate,
      endDate,
      location: location.trim(),
      feeConfig,
      paymentDeadline,
      abstractDeadline,
      accommodationDeadline: accommodationDeadline || undefined,
      fieldTripDeadline: fieldTripDeadline || undefined,
      fieldTripRoutes: fieldTripRoutes.filter((r) => r.name.trim()).length > 0 ? fieldTripRoutes.filter((r) => r.name.trim()) : undefined,
      sessions: sessions.filter((s) => s.name.trim()),
      status,
      // Phase 2: Include file data
      publicNoticeUrl: publicNoticeFile?.dataUrl,
      publicNoticeName: publicNoticeFile?.name,
      stampedNoticeUrl: stampedNoticeFile?.dataUrl,
      stampedNoticeName: stampedNoticeFile?.name,
      abstractTemplateUrl: abstractTemplateFile?.dataUrl,
      abstractTemplateName: abstractTemplateFile?.name,
    });
  };

  return (
    <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="conf-name">会议名称 *</Label>
          <Input id="conf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入会议名称" />
          {errors.name && <p className="text-party-red text-xs">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-branch">主办学会/分会 *</Label>
          <Select value={branchId} onValueChange={setBranchId} disabled={adminRole === "branch_admin"}>
            <SelectTrigger id="conf-branch">
              <SelectValue placeholder="选择分会" />
            </SelectTrigger>
            <SelectContent>
              {branchOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branchId && <p className="text-party-red text-xs">{errors.branchId}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-location">地点 *</Label>
          <Input id="conf-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：北京" />
          {errors.location && <p className="text-party-red text-xs">{errors.location}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-start">开始日期 *</Label>
          <Input id="conf-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          {errors.startDate && <p className="text-party-red text-xs">{errors.startDate}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-end">结束日期 *</Label>
          <Input id="conf-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {errors.endDate && <p className="text-party-red text-xs">{errors.endDate}</p>}
        </div>
        <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
          <Label className="text-sm font-bold text-strata-blue-deep mb-3 block">四类会议费配置（置空 = 关闭该人群报名通道）</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-fee-student-member">学生会员费 (¥)</Label>
          <Input id="conf-fee-student-member" type="number" value={feeStudentMember} onChange={(e) => setFeeStudentMember(e.target.value)} placeholder="如: 800" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-fee-nonstudent-member">非学生会员费 (¥) *</Label>
          <Input id="conf-fee-nonstudent-member" type="number" value={feeNonStudentMember} onChange={(e) => setFeeNonStudentMember(e.target.value)} placeholder="如: 1200" />
          {errors.feeNonStudentMember && <p className="text-party-red text-xs">{errors.feeNonStudentMember}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-fee-student-nonmember">学生非会员费 (¥)</Label>
          <Input id="conf-fee-student-nonmember" type="number" value={feeStudentNonMember} onChange={(e) => setFeeStudentNonMember(e.target.value)} placeholder="如: 900" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-fee-nonstudent-nonmember">非学生非会员费 (¥)</Label>
          <Input id="conf-fee-nonstudent-nonmember" type="number" value={feeNonStudentNonMember} onChange={(e) => setFeeNonStudentNonMember(e.target.value)} placeholder="如: 1500" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-pay-deadline">缴费截止日期</Label>
          <Input id="conf-pay-deadline" type="date" value={paymentDeadline} onChange={(e) => setPaymentDeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-abs-deadline">摘要截止日期</Label>
          <Input id="conf-abs-deadline" type="date" value={abstractDeadline} onChange={(e) => setAbstractDeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-accommodation-deadline">住宿截止日期</Label>
          <Input id="conf-accommodation-deadline" type="date" value={accommodationDeadline} onChange={(e) => setAccommodationDeadline(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">开会前7天，逾期未提交视为自主安排</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-fieldtrip-deadline">野外报名截止日期</Label>
          <Input id="conf-fieldtrip-deadline" type="date" value={fieldTripDeadline} onChange={(e) => setFieldTripDeadline(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">开会前7天，逾期未报名视为自行联系旅游公司</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="conf-status">状态</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
            <SelectTrigger id="conf-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="published">发布</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>分会场</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSession}>
            <Plus className="h-3 w-3 mr-1" />
            添加分会场
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂未添加分会场</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2">
                <Input
                  value={session.name}
                  onChange={(e) => updateSessionName(session.id, e.target.value)}
                  placeholder="分会场名称"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-party-red hover:text-party-red-dark h-8 w-8 p-0"
                  onClick={() => removeSession(session.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 4: 野外路线配置 */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-strata-blue-deep">野外路线配置</Label>
          <span className="text-xs text-muted-foreground">{fieldTripRoutes.length} / 15 条</span>
        </div>
        {fieldTripRoutes.length > 0 ? (
          <div className="space-y-2">
            {fieldTripRoutes.map((route) => (
              <div key={route.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <Select value={route.phase} onValueChange={(v) => updateFieldTripRoute(route.id, { phase: v as "pre" | "during" | "post" })}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre">会前</SelectItem>
                    <SelectItem value="during">会中</SelectItem>
                    <SelectItem value="post">会后</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={route.name}
                  onChange={(e) => updateFieldTripRoute(route.id, { name: e.target.value })}
                  placeholder="路线名称"
                  className="flex-1 h-8 text-xs"
                />
                <Input
                  type="number"
                  value={route.order}
                  onChange={(e) => updateFieldTripRoute(route.id, { order: parseInt(e.target.value) || 1 })}
                  placeholder="序号"
                  className="w-[60px] h-8 text-xs"
                  min={1}
                  max={15}
                />
                <Select
                  value={route.genderRestriction || "any"}
                  onValueChange={(v) => updateFieldTripRoute(route.id, { genderRestriction: v as FieldTripGenderRestriction })}
                >
                  <SelectTrigger className="w-[88px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["any", "male", "female"] as const).map(g => (
                      <SelectItem key={g} value={g}>{FIELD_TRIP_GENDER_RESTRICTION_LABEL[g]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-party-red hover:text-party-red-dark h-8 w-8 p-0"
                  onClick={() => removeFieldTripRoute(route.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">暂未配置野外路线</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFieldTripRoute}
            disabled={fieldTripRoutes.length >= 15}
          >
            <Plus className="h-3 w-3 mr-1" />
            添加野外路线
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fillDefaultFieldTripRoutes}
            disabled={fieldTripRoutes.length >= 15}
          >
            填充 15 条默认路线
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">每场会议最多 15 条路线（会前/会中/会后各 5 条）；路线二限男、路线三限女，用于演示性别绑定</p>
      </div>

      {/* Phase 2: 会议资料上传 */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <Label className="text-sm font-bold text-strata-blue-deep block">会议资料上传</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Public Notice PDF (unstamped) */}
          <div className="space-y-2">
            <Label htmlFor="file-public-notice" className="text-xs">公开会议通知 PDF（不盖章）</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  id="file-public-notice"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload("publicNotice", file);
                  }}
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-strata-blue-deep transition-colors">
                  {publicNoticeFile ? (
                    <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {publicNoticeFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">点击上传 PDF</span>
                  )}
                </div>
              </label>
              {publicNoticeFile && (
                <button type="button" className="text-party-red hover:text-party-red-dark text-xs font-bold" onClick={() => setPublicNoticeFile(null)}>
                  移除
                </button>
              )}
            </div>
          </div>
          {/* Stamped Notice PDF */}
          <div className="space-y-2">
            <Label htmlFor="file-stamped-notice" className="text-xs">盖章会议通知 PDF</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  id="file-stamped-notice"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload("stampedNotice", file);
                  }}
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-strata-blue-deep transition-colors">
                  {stampedNoticeFile ? (
                    <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {stampedNoticeFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">点击上传 PDF</span>
                  )}
                </div>
              </label>
              {stampedNoticeFile && (
                <button
                  type="button"
                  className="text-party-red hover:text-party-red-dark text-xs font-bold"
                  onClick={() => setStampedNoticeFile(null)}
                >
                  移除
                </button>
              )}
            </div>
          </div>
          {/* Abstract Template Word */}
          <div className="space-y-2">
            <Label htmlFor="file-abstract-template" className="text-xs">摘要模板 Word</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  id="file-abstract-template"
                  type="file"
                  accept=".doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload("abstractTemplate", file);
                  }}
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-strata-blue-deep transition-colors">
                  {abstractTemplateFile ? (
                    <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {abstractTemplateFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">点击上传 Word</span>
                  )}
                </div>
              </label>
              {abstractTemplateFile && (
                <button
                  type="button"
                  className="text-party-red hover:text-party-red-dark text-xs font-bold"
                  onClick={() => setAbstractTemplateFile(null)}
                >
                  移除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 6: 学会级别模板上传（入会/退会申请书） */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <Label className="text-sm font-bold text-strata-blue-deep block">学会申请书模板管理</Label>
        <p className="text-xs text-muted-foreground">以下模板为全局设置，供用户申请入会/退会时下载使用。</p>
        <div className="grid grid-cols-2 gap-4">
          {/* 入会申请书模板 */}
          <div className="space-y-2">
            <Label htmlFor="file-membership-app-template" className="text-xs">入会申请书模板</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  id="file-membership-app-template"
                  type="file"
                  accept=".doc,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTemplateUpload("membershipApp", file);
                  }}
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-strata-blue-deep transition-colors">
                  {membershipAppTemplateFile ? (
                    <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {membershipAppTemplateFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">点击上传模板</span>
                  )}
                </div>
              </label>
              {membershipAppTemplateFile && (
                <button
                  type="button"
                  className="text-party-red hover:text-party-red-dark text-xs font-bold"
                  onClick={() => {
                    setMembershipAppTemplateFile(null);
                    localStorage.removeItem("paleo_membership_application_template");
                  }}
                >
                  移除
                </button>
              )}
            </div>
          </div>
          {/* 退会申请书模板 */}
          <div className="space-y-2">
            <Label htmlFor="file-withdrawal-app-template" className="text-xs">退会申请书模板</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  id="file-withdrawal-app-template"
                  type="file"
                  accept=".doc,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTemplateUpload("withdrawalApp", file);
                  }}
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-strata-blue-deep transition-colors">
                  {withdrawalAppTemplateFile ? (
                    <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {withdrawalAppTemplateFile.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">点击上传模板</span>
                  )}
                </div>
              </label>
              {withdrawalAppTemplateFile && (
                <button
                  type="button"
                  className="text-party-red hover:text-party-red-dark text-xs font-bold"
                  onClick={() => {
                    setWithdrawalAppTemplateFile(null);
                    localStorage.removeItem("paleo_withdrawal_application_template");
                  }}
                >
                  移除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} className="bg-strata-blue-deep hover:bg-strata-blue-deep/90 text-white">
          {initialData ? "保存更改" : "创建会议"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ConferenceManagement() {
  const { adminRole, adminBranchId, getAllConferences, getBranchConferences, createConference, updateConference } = useAdmin();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConf, setEditingConf] = useState<ConferenceRecord | undefined>(undefined);

  const conferences = useMemo(() => {
    if (adminRole === "branch_admin" && adminBranchId) {
      return getBranchConferences(adminBranchId);
    }
    return getAllConferences();
  }, [adminRole, adminBranchId, getAllConferences, getBranchConferences]);

  const handleCreate = () => {
    setEditingConf(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (conf: ConferenceRecord) => {
    setEditingConf(conf);
    setDialogOpen(true);
  };

  const handleSubmit = (data: ConferenceData) => {
    if (editingConf) {
      updateConference(editingConf.id, data);
    } else {
      createConference(data);
    }
    setDialogOpen(false);
    setEditingConf(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-strata-blue-deep">会议管理</h1>
          <p className="text-muted-foreground mt-1">管理学术会议和分会场设置</p>
        </div>
        <Button onClick={handleCreate} className="bg-strata-blue-deep hover:bg-strata-blue-deep/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新建会议
        </Button>
      </div>

      {conferences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <AlertCircle className="h-8 w-8" />
            <span>暂无会议数据</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conferences.map((conf: ConferenceRecord) => (
            <Card key={conf.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base pr-2">{conf.name}</CardTitle>
                  <Badge variant="outline" className={conf.status === "published" ? "text-green-600 border-green-300 bg-green-50 shrink-0" : "text-gray-500 border-gray-300 bg-gray-50 shrink-0"}>
                    {conf.status === "published" ? "已发布" : "草稿"}
                  </Badge>
                </div>
                <CardDescription>{conf.branchName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{conf.location}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{conf.startDate} 至 {conf.endDate}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>确认参会: {conf.registrations} 人</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    <span>学生会员: ¥{conf.feeConfig?.studentMember || "—"} / 非学生会员: ¥{conf.feeConfig?.nonStudentMember || "—"}</span>
                    <br />
                    <span>学生非会员: ¥{conf.feeConfig?.studentNonMember || "—"} / 非学生非会员: ¥{conf.feeConfig?.nonStudentNonMember || "—"}</span>
                    {/* Phase 2: File indicators */}
                    {(conf.stampedNoticeUrl || conf.abstractTemplateUrl || (conf.fieldTripRoutes && conf.fieldTripRoutes.length > 0)) && (
                      <>
                        <br />
                        <span className="text-strata-blue-deep font-bold">
                          {conf.stampedNoticeUrl && "📄 通知 "}
                          {conf.abstractTemplateUrl && "📝 模板 "}
                          {conf.fieldTripRoutes && conf.fieldTripRoutes.length > 0 && `🏔️ ${conf.fieldTripRoutes.length}条路线`}
                        </span>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(conf)}>
                    <Edit className="h-3 w-3 mr-1" />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingConf(undefined); }}>
        <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConf ? "编辑会议" : "新建会议"}</DialogTitle>
            <DialogDescription>
              {editingConf ? "修改会议信息" : "创建新的学术会议"}
            </DialogDescription>
          </DialogHeader>
          <ConferenceForm
            initialData={editingConf}
            onSubmit={handleSubmit}
            onCancel={() => { setDialogOpen(false); setEditingConf(undefined); }}
            title={editingConf ? "编辑会议" : "新建会议"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
