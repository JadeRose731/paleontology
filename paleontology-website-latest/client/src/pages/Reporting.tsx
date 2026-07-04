import { useState } from "react";
import PartyLayout from "@/components/PartyLayout";
import { CmsRichTextBody } from "@/components/CmsPageHeader";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsEntries } from "@/hooks/useCmsEntries";

export default function Reporting() {
  const { channel } = useCmsChannel("/reporting");
  const { items: guideArticles } = useCmsEntries({ moduleCode: "party", columnCode: "party_reporting" });

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reportedName: "",
    reportedDept: "",
    violationType: "科研经费违规",
    description: "",
    reporterName: "",
    reporterContact: "",
    isAnonymous: true,
  });

  const pageTitle = channel?.title ?? "违法违纪举报";
  const guideArticle = guideArticles.find(a => a.pinned === "1") ?? guideArticles[0];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reportedName || !formData.description) {
      alert("请填写被举报人姓名和具体违纪违法事实。");
      return;
    }
    setSubmitted(true);
  };

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="flex flex-col gap-6">
        <div className="border-b border-fossil-stone pb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="w-1 h-6 bg-party-red inline-block" />
            {pageTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {channel?.subtitle ?? channel?.kicker ?? "公示监督举报渠道、举报须知、规范监督程序，畅通党内监督与群众监督渠道。"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-red-50 border border-red-200 p-5 rounded flex flex-col gap-3">
              <h3 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                举报须知
              </h3>
              {guideArticle?.bodyContent ? (
                <CmsRichTextBody html={guideArticle.bodyContent} className="text-[11px] text-red-800" />
              ) : (
                <ul className="flex flex-col gap-2.5 text-[11px] text-red-800 leading-relaxed list-decimal pl-4">
                  <li>举报人应当遵守国家法律法规，反映问题要客观真实，不得捏造事实、制造假证、诬告陷害他人。</li>
                  <li>提倡实名举报（请提供真实姓名、联系电话等，以便核实与反馈，我们将严格保密）。</li>
                  <li>举报内容应尽量详实，包括被举报人、违纪违法事实发生的时间、地点、具体情节及相关证据。</li>
                </ul>
              )}
            </div>

            {guideArticles.length > 1 && (
              <div className="flex flex-col gap-3">
                {guideArticles.slice(1).map(article => (
                  <div key={article.entryId} className="bg-paper-bright border border-fossil-stone p-4 rounded">
                    <h4 className="text-xs font-bold text-primary mb-2">{article.title}</h4>
                    {article.summary && <p className="text-[11px] text-muted-foreground mb-2">{article.summary}</p>}
                    {article.bodyContent && <CmsRichTextBody html={article.bodyContent} className="text-[11px]" />}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-paper-bright border border-fossil-stone p-5 rounded flex flex-col gap-4">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 pb-2 border-b border-fossil-stone">
                <span className="material-symbols-outlined text-[18px] text-party-red">contact_phone</span>
                其他举报渠道
              </h3>
              <div className="flex flex-col gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-party-red">mail</span>
                  <span>邮寄信箱：江苏省南京市北京东路39号纪委办公室</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-party-red">call</span>
                  <span>举报电话：025-83282125（工作日 9:00 - 17:00）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-party-red">forward_to_inbox</span>
                  <span>举报邮箱：jiwei@nigpas.ac.cn</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 p-8 rounded text-center flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-[48px] text-green-600 block">check_circle</span>
                <h3 className="text-base font-bold text-green-900">举报提交成功</h3>
                <p className="text-xs text-green-800 leading-relaxed max-w-md">
                  您的举报材料已安全提交至中国古生物学会纪律检查委员会信箱。我们将按照有关规定依规依纪认真办理并严格保密。
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                >
                  继续提交
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-fossil-stone p-6 rounded shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 pb-2 border-b border-fossil-stone mb-2">
                  <span className="material-symbols-outlined text-[18px] text-party-red">rate_review</span>
                  在线监督举报信箱
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-primary">被举报人姓名 <span className="text-party-red">*</span></label>
                    <input
                      type="text"
                      name="reportedName"
                      value={formData.reportedName}
                      onChange={handleInputChange}
                      placeholder="请填写姓名"
                      className="border border-fossil-stone rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-primary">被举报人部门/支部</label>
                    <input
                      type="text"
                      name="reportedDept"
                      value={formData.reportedDept}
                      onChange={handleInputChange}
                      placeholder="如：第一党支部"
                      className="border border-fossil-stone rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-primary">违纪违法类型 <span className="text-party-red">*</span></label>
                  <select
                    name="violationType"
                    value={formData.violationType}
                    onChange={handleInputChange}
                    className="border border-fossil-stone rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="科研经费违规">科研经费违规使用</option>
                    <option value="学术诚信问题">学术不端与诚信问题</option>
                    <option value="作风纪律问题">违反中央八项规定精神</option>
                    <option value="其他违纪违法">其他违纪违法行为</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-primary">具体违纪违法事实与证据说明 <span className="text-party-red">*</span></label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={5}
                    placeholder="请详述时间、地点、涉及人员、具体事实经过及证据线索（限1000字）"
                    className="border border-fossil-stone rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="border-t border-fossil-stone pt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isAnonymous"
                      name="isAnonymous"
                      checked={formData.isAnonymous}
                      onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                      className="rounded text-party-red focus:ring-party-red border-fossil-stone"
                    />
                    <label htmlFor="isAnonymous" className="text-xs font-semibold text-primary select-none cursor-pointer">
                      匿名举报（勾选此项将不显示您的个人信息）
                    </label>
                  </div>

                  {!formData.isAnonymous && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-primary">您的姓名</label>
                        <input
                          type="text"
                          name="reporterName"
                          value={formData.reporterName}
                          onChange={handleInputChange}
                          className="border border-fossil-stone rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-primary">联系电话/邮箱</label>
                        <input
                          type="text"
                          name="reporterContact"
                          value={formData.reporterContact}
                          onChange={handleInputChange}
                          className="border border-fossil-stone rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full bg-party-red hover:bg-party-red-dark text-white font-bold py-2.5 rounded transition-colors text-xs tracking-wider"
                >
                  安全提交举报
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}
