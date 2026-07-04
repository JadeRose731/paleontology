import PartyLayout from "../components/PartyLayout";
import { useCmsEntries } from "@/hooks/useCmsEntries";
import { type ApiCmsEntry, parseExtra } from "@/lib/cms-api";

function entryByCode(entries: ApiCmsEntry[], code: string): ApiCmsEntry | undefined {
  return entries.find(e => e.columnCode === code && e.status === "published");
}

function SectionHtml({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function Intro() {
  const { items: pages } = useCmsEntries({ moduleCode: "pages" });
  const { items: awardEntries } = useCmsEntries({ moduleCode: "awards" });

  const overviewEntry = entryByCode(pages, "intro_overview");
  const charterEntry = entryByCode(pages, "intro_charter");
  const bgEntry = entryByCode(pages, "intro_background");
  const missionEntry = entryByCode(pages, "intro_mission");
  const contribEntry = entryByCode(pages, "intro_contribution");

  const awards = awardEntries.map(e => {
    const ex = parseExtra<{ awardName?: string; winner?: string }>(e.extraJson);
    return { year: e.category ?? "", awardName: ex.awardName ?? e.title, winner: ex.winner ?? e.summary ?? "", description: e.bodyContent ?? "" };
  }).sort((a, b) => b.year.localeCompare(a.year));

  return (
    <PartyLayout currentPageTitle="学会简介">
      <div className="space-y-16">
        {/* ── 学会概况 ── */}
        {overviewEntry?.bodyContent && (
          <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 relative shadow-sm" id="overview">
            <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
              {overviewEntry.title ?? "学会概况"}
            </h2>
            <SectionHtml html={overviewEntry.bodyContent} />
          </section>
        )}

        {/* ── 学会背景 ── */}
        <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 relative shadow-sm" id="background">
          <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
            {bgEntry?.title ?? "学会背景"}
          </h2>
          {bgEntry?.bodyContent ? (
            <SectionHtml html={bgEntry.bodyContent} />
          ) : (
            <div className="space-y-6 text-on-surface-variant text-sm lg:text-base leading-relaxed text-slate-700">
              <p>
                中国古生物学会由地质学及古生物界前辈丁文江、葛利普、孙云铸等学者于1929年8月在北京正式成立。作为中国最早建立的跨学科自然科学社团之一，学会始终承载着推动中国地层古生物学研究与人才培养的使命。
              </p>
              <p>
                在将近一个世纪的历程中，学会不仅见证了中国"恐龙之乡"的发现，更在澄江生物群、热河生物群以及早期人类进化研究中扮演了不可替代的协调与推动角色。
              </p>
            </div>
          )}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">1929</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">成立年份</span>
            </div>
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">12,000+</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">活跃会员</span>
            </div>
            <div className="p-6 bg-slate-50 border border-fossil-stone rounded">
              <span className="text-3xl font-bold text-primary block mb-2">25+</span>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider text-slate-500">专业委员会</span>
            </div>
          </div>
        </section>

        {/* ── 学会宗旨与任务 ── */}
        <section id="mission" className="space-y-8">
          <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold border-b-2 border-tertiary-fixed inline-block pb-1">
            {missionEntry?.title ?? "学会宗旨与任务"}
          </h2>
          {missionEntry?.bodyContent ? (
            <SectionHtml html={missionEntry.bodyContent} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-8 flex flex-col justify-between shadow-sm rounded">
                <div>
                  <span className="material-symbols-outlined text-primary text-[32px] mb-4">psychology</span>
                  <h3 className="text-xl font-bold mb-4 text-primary">学术交流</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">组织国内外学术会议，创办高水平学术期刊，促进学科交叉与前沿探讨。</p>
                </div>
              </div>
              <div className="md:col-span-2 bg-secondary text-white p-8 border-t-2 border-t-tertiary-fixed shadow-sm rounded" style={{ backgroundColor: "#715a3e" }}>
                <div>
                  <span className="material-symbols-outlined text-tertiary-fixed text-[32px] mb-4" style={{ color: "#f5e0ba" }}>school</span>
                  <h3 className="text-xl font-bold mb-4 text-tertiary-fixed" style={{ color: "#f5e0ba" }}>人才培养</h3>
                  <p className="text-sm opacity-90 leading-relaxed">设立"尹赞勋奖"、"青年古生物学奖"，激励中青年学者追求卓越，服务国家重大战略。</p>
                </div>
              </div>
              <div className="md:col-span-1 bg-slate-100 border border-fossil-stone p-6 shadow-sm rounded">
                <span className="material-symbols-outlined text-primary text-[24px] mb-2">auto_stories</span>
                <h4 className="font-bold text-base mb-2 text-primary">科学普及</h4>
                <p className="text-xs text-slate-600 leading-relaxed">推动自然博物馆建设，面向公众开展科普教育活动。</p>
              </div>
              <div className="md:col-span-3 bg-white border border-fossil-stone p-6 flex items-center gap-6 shadow-sm rounded">
                <div className="flex-1">
                  <h4 className="font-bold text-base mb-2 text-primary">学科规范与服务</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">制定古生物命名、化石保护国家标准，为相关政府部门提供决策咨询与技术支撑。</p>
                </div>
                <div className="w-24 h-24 bg-fossil-stone rounded overflow-hidden flex-shrink-0">
                  <img className="w-full h-full object-cover grayscale opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeaJCTkjZiBcSBEt7ihtma4JBTEgE_YcBp_R6-8EOFDAee65cRd10wFdYHPpM2O1ftuzZkRdvdBqOHLId9dqIbhVbTkmcZ_0GlmE3eRPYO_eWmSc-o5_ziGof4kATCcVdz48ujnYU03bA1BkdAFeuOZnzVzmbwEspzLMz6ds6qPQb9Zoxujf60cU28vlhUTXj7CbkSpbKPEnB9hKUGfkEGM78nDhUIlO_NUowPMMDnq4cW0yoC3z8U_KdC1MKy4KQKK-i5vLvsxe2Y" alt="Ancient Specimen" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 学科发展贡献 ── */}
        <section className="relative" id="contribution">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            <div className="flex-1">
              <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
                {contribEntry?.title ?? "学科发展贡献"}
              </h2>
              {contribEntry?.bodyContent ? (
                <SectionHtml html={contribEntry.bodyContent} />
              ) : (
                <div className="space-y-8">
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0 transition-all group-hover:bg-primary group-hover:text-white">01</div>
                    <div>
                      <h4 className="text-lg font-bold mb-2 text-primary">深时地球研究</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">在寒武纪大爆发、生物大灭绝等关键科学问题上保持国际领先地位，为理解全球气候变化提供地质历史参考。</p>
                    </div>
                  </div>
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0 transition-all group-hover:bg-primary group-hover:text-white">02</div>
                    <div>
                      <h4 className="text-lg font-bold mb-2 text-primary">化石遗产保护</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">推动《古生物化石保护条例》的实施，确立了数千个重要化石产地的科学价值与法律地位。</p>
                    </div>
                  </div>
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0 transition-all group-hover:bg-primary group-hover:text-white">03</div>
                    <div>
                      <h4 className="text-lg font-bold mb-2 text-primary">国际合作枢纽</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">作为国际古生物协会的重要成员，学会多次承办国际地质大会及分会，提升了中国科学界的国际话语权。</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden lg:block w-72 bg-fossil-stone/30 p-1 border-4 border-fossil-stone rotate-3 shadow-lg rounded">
              <img className="w-full h-auto rounded-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPGzLQNXplwZWnDnaylUi6gpr36tAugtK6Vrys2njJ7uUDy5B3OuDzc-Gss-6J_v-9NlWBxAIBIxzByW_y46TKA6jmV25-HamfOgFrG4KQyfot8r_hX2uVRnjJr4uC0D2-M_mJnv_dwwsJChY6NLAoQ-VlbpBT8hCt8dNWtvlk1YAf436oH_WE9mCin-o-GmvTKuFhJCws8RJKmnYEdhimQbepa_K2NycccTGFH4eajCKre2oNbzd8TvrtvQsERY1hHhEWFGcaNsHv" alt="Historical Field Work" />
              <p className="p-3 text-xs text-center italic text-slate-500">20世纪野外考察珍贵记录</p>
            </div>
          </div>
        </section>

        {/* ── 获奖成果 ── */}
        {awards.length > 0 && (
          <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 relative shadow-sm" id="awards">
            <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
              获奖成果
            </h2>
            <div className="space-y-4">
              {awards.map((a, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 border border-fossil-stone rounded hover:shadow-sm transition-shadow">
                  <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded shrink-0">{a.year}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-primary text-sm">{a.awardName}</h4>
                    <p className="text-xs text-slate-500 mt-1">获奖人：{a.winner}</p>
                    {a.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 学会章程 ── */}
        {charterEntry?.bodyContent && (
          <section className="bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-10 relative shadow-sm" id="charter">
            <h2 className="font-headline-lg text-2xl lg:text-3xl text-primary font-bold mb-8 border-b-2 border-tertiary-fixed inline-block pb-1">
              {charterEntry.title ?? "学会章程"}
            </h2>
            <SectionHtml html={charterEntry.bodyContent} />
          </section>
        )}
      </div>
    </PartyLayout>
  );
}
