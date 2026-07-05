import React, { useEffect, useState } from "react";
import { useMembership } from "@/contexts/MembershipContext";
import { pickAndReadFile, type UploadedFile } from "@/lib/fileUpload";
import { toast } from "sonner";

interface MembershipApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MembershipApplicationDialog({ open, onOpenChange }: MembershipApplicationDialogProps) {
  const {
    userType,
    membershipChoiceMade,
    societyMembership,
    membershipApplication,
    chooseMembershipPath,
    submitMembershipApplication,
    cancelMembershipApplication,
    getMembershipApplicationTemplateUrl,
  } = useMembership();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [memberAppFile, setMemberAppFile] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAppSubmitted = societyMembership?.status === "application_submitted";
  const isAppRejected = societyMembership?.status === "application_rejected";
  const isAppApproved = societyMembership?.status === "application_approved";

  useEffect(() => {
    if (!open) return;
    if (isAppSubmitted || isAppApproved) {
      setStep(0);
      setMemberAppFile(null);
    } else if (isAppRejected) {
      setStep(1);
    } else {
      setStep(0);
    }
  }, [open, isAppSubmitted, isAppApproved, isAppRejected]);

  if (!open) return null;

  const ensureMemberPath = () => {
    if (userType !== "member") {
      chooseMembershipPath("member");
    }
  };

  const handleStart = () => {
    if (!membershipChoiceMade || userType === "regular") {
      toast.info("请先在弹窗中选择「成为正式会员」。");
      return;
    }
    ensureMemberPath();
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!memberAppFile) {
      toast.error("请先上传入会申请书");
      return;
    }
    ensureMemberPath();
    setSubmitting(true);
    try {
      const ok = await submitMembershipApplication(memberAppFile.dataUrl, memberAppFile.name);
      if (ok) {
        setMemberAppFile(null);
        setStep(0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelApplication = async () => {
    await cancelMembershipApplication();
    setMemberAppFile(null);
    setStep(0);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E1DA] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold font-serif">加入中国古生物学会</h2>
            <p className="text-white/70 text-[10px] mt-0.5">正式会员入会申请</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-white/80 hover:text-white p-1"
            aria-label="关闭"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isAppSubmitted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800 space-y-3">
              <p className="font-bold mb-1">⏳ 入会申请已提交</p>
              <p className="text-yellow-700 leading-relaxed">
                您的入会申请书已提交，管理员将在1-3个工作日内审核。审核通过后即可进入缴费环节。
              </p>
              {membershipApplication?.applicationFileName && (
                <p className="text-yellow-600 text-[10px]">已上传：{membershipApplication.applicationFileName}</p>
              )}
              <button
                type="button"
                onClick={() => void handleCancelApplication()}
                className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs py-2"
              >
                撤销申请
              </button>
            </div>
          )}

          {isAppApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs text-green-800">
              <p className="font-bold mb-1">✓ 入会申请已通过</p>
              <p className="text-green-700">请前往「学会服务 → 会员服务」缴纳会费完成入会。</p>
            </div>
          )}

          {!isAppSubmitted && !isAppApproved && step === 0 && (
            <div className="text-center py-4 space-y-4">
              <span className="material-symbols-outlined text-5xl text-amber-400">card_membership</span>
              <p className="text-sm text-slate-700 font-bold">成为正式会员</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                请先提交入会申请书，经管理员审核通过后方可缴纳会费。
              </p>
              <button
                type="button"
                onClick={handleStart}
                className="w-full bg-[#002B49] hover:bg-[#001f35] text-white px-6 py-2.5 rounded-lg font-bold text-xs shadow-md"
              >
                开始申请入会
              </button>
            </div>
          )}

          {!isAppSubmitted && !isAppApproved && step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                <p className="font-bold mb-1">Step 1/2：下载入会申请书模板</p>
                <p className="text-blue-700">请下载模板，填写后进入下一步上传。</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = getMembershipApplicationTemplateUrl();
                  if (url) {
                    window.open(url, "_blank");
                    toast.success("模板下载已开始");
                  } else {
                    toast.info("当前无可用模板，请直接上传您的入会申请书。");
                  }
                }}
                className="w-full border-2 border-dashed border-[#002B49] text-[#002B49] hover:bg-slate-50 px-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                下载入会申请书模板
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(0)} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">返回</button>
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-[#002B49] text-white rounded-lg font-bold text-xs py-2">已下载，下一步上传</button>
              </div>
            </div>
          )}

          {!isAppSubmitted && !isAppApproved && step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                <p className="font-bold mb-1">Step 2/2：上传入会申请书</p>
                <p className="text-blue-700">请上传填写完整的入会申请书（.doc/.docx/.pdf）。</p>
              </div>
              <div
                onClick={() => {
                  pickAndReadFile(".doc,.docx,.pdf", 10, (file) => {
                    setMemberAppFile(file);
                    toast.success("入会申请书上传成功！");
                  });
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${memberAppFile ? "border-green-500 bg-green-50/20" : "border-slate-300 hover:bg-slate-50 hover:border-[#002B49]"}`}
              >
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
                <button type="button" onClick={() => { setStep(1); setMemberAppFile(null); }} className="flex-1 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs py-2">上一步</button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!memberAppFile || submitting}
                  className="flex-1 bg-[#002B49] hover:bg-[#001f35] disabled:opacity-40 text-white rounded-lg font-bold text-xs py-2"
                >
                  {submitting ? "提交中..." : "提交申请，等待审核"}
                </button>
              </div>
            </div>
          )}

          {isAppRejected && !isAppSubmitted && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-3">
              <p className="font-bold">✗ 入会申请被驳回</p>
              <p className="text-red-700">驳回原因：{membershipApplication?.rejectReason || "申请书不符合要求"}</p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-xs w-full"
              >
                重新提交申请
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
