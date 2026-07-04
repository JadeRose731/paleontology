import { Link } from "wouter";
import PartyLayout from "../components/PartyLayout";
import { useCmsChannel } from "@/hooks/useCmsChannel";
import { useCmsChannels } from "@/hooks/useCmsChannels";

const BORDER_COLORS = [
  "border-party-red",
  "border-primary",
  "border-accent-gold",
];

export default function Home() {
  const { channel } = useCmsChannel("/party");
  const { partyNavItems } = useCmsChannels();

  const pageTitle = channel?.title ?? "党建文化中心";

  return (
    <PartyLayout currentPageTitle={pageTitle}>
      <div className="bg-white border border-fossil-stone rounded shadow-sm p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="party-gradient text-white p-3 rounded">
            <span className="material-symbols-outlined text-[36px] fill-1">military_tech</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">
              {channel?.subtitle ?? channel?.kicker ?? "新时代党建引领学术腾飞"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {channel?.title ? `${channel.title} — 贯彻落实新时代党的建设总要求` : "贯彻落实新时代党的建设总要求，发挥基层党组织战斗堡垒作用和党员先锋模范作用。"}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/theory-study">
            <span className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary/90 transition-colors cursor-pointer">
              理论学习
            </span>
          </Link>
          <Link href="/announcements">
            <span className="px-4 py-2 border border-primary text-primary text-xs font-semibold rounded hover:bg-paper-bright transition-colors cursor-pointer">
              通知公告
            </span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partyNavItems.map((sec, idx) => (
          <div
            key={sec.id}
            className={`bg-white border border-fossil-stone rounded shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group border-t-4 ${BORDER_COLORS[idx % BORDER_COLORS.length]}`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-[32px] text-party-red group-hover:scale-110 transition-transform">
                  {sec.icon}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-paper-bright px-2 py-0.5 border border-fossil-stone rounded">
                  {sec.id}
                </span>
              </div>
              <h3 className="text-base font-bold text-primary mb-2 group-hover:text-party-red transition-colors">
                {sec.title}
              </h3>
            </div>
            <div className="bg-paper-bright px-6 py-3 border-t border-fossil-stone flex justify-end">
              <Link href={sec.path}>
                <span className="text-xs font-semibold text-primary hover:text-party-red transition-colors flex items-center gap-1 cursor-pointer">
                  进入栏目
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PartyLayout>
  );
}
