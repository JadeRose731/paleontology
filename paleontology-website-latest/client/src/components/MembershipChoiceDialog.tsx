import React from "react";
import { useMembership } from "../contexts/MembershipContext";
import { toast } from "sonner";

interface MembershipChoiceDialogProps {
  open: boolean;
  onChooseMember?: () => void;
}

export default function MembershipChoiceDialog({ open, onChooseMember }: MembershipChoiceDialogProps) {
  const { chooseMembershipPath, getMembershipFee } = useMembership();

  if (!open) return null;

  const handleChooseNonMember = () => {
    chooseMembershipPath("non_member");
    toast.success("已选择作为非会员使用，可直接绑定分会和报名会议。");
  };

  const handleChooseMember = () => {
    chooseMembershipPath("member");
    toast.success("已选择成为正式会员，请提交入会申请书。");
    onChooseMember?.();
  };

  const SOCIETY_FEE = getMembershipFee("standard");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E1DA] rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#002B49] text-white px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold font-serif tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
              欢迎来到中国古生物学会
            </h2>
            <p className="text-white/70 text-xs mt-1">WELCOME TO PSC DIGITAL PLATFORM</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-center text-sm text-slate-600 mb-8 leading-relaxed">
            请选择您的参与方式
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Option A: 成为正式会员 */}
            <div className="border-2 border-[#002B49] rounded-xl p-6 flex flex-col items-center text-center bg-[#FCFAF7]">
              <h3 className="text-base font-bold text-[#002B49] mb-2">成为正式会员</h3>
              <p className="text-2xl font-bold text-[#002B49] mb-1">¥{SOCIETY_FEE}<span className="text-xs font-normal text-slate-500">/年</span></p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-5 text-left w-full">
                <li>· 享受学生会员 / 非学生会员优惠价参会</li>
                <li>· 须提交入会申请书并经审核通过</li>
                <li>· 需完成缴费与身份验证，有效期一年</li>
              </ul>
              <button
                onClick={handleChooseMember}
                className="w-full bg-[#002B49] hover:bg-[#001f35] text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md"
              >
                选择此方式
              </button>
            </div>

            {/* Option B: 非会员 */}
            <div className="border-2 border-[#E5E1DA] rounded-xl p-6 flex flex-col items-center text-center bg-white hover:border-slate-300 transition-colors">
              <h3 className="text-base font-bold text-[#002B49] mb-2">作为非会员继续</h3>
              <p className="text-sm font-bold text-slate-400 mb-1">免费</p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-5 text-left w-full">
                <li>· 按学生（非会员）/ 非学生（非会员）价参会</li>
                <li>· 非学生含教师、嘉宾等身份</li>
                <li>· 无需缴费，可直接绑定分会与报名</li>
              </ul>
              <button
                onClick={handleChooseNonMember}
                className="w-full border-2 border-[#E5E1DA] hover:border-[#002B49] text-slate-600 hover:text-[#002B49] py-2.5 rounded-lg font-bold text-sm transition-all"
              >
                选择此方式
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            选择后可随时在「学会服务 - 会员服务」中变更
          </p>
        </div>
      </div>
    </div>
  );
}
