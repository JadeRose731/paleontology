import { PartyArticleList } from "@/components/party/PartyArticleList";

export default function Dynamics() {
  return (
    <PartyArticleList
      routePath="/dynamics"
      columnCode="party_dynamics"
      layout="card"
      listSuffix=""
      defaultSubtitle="常态化报道学会各党支部、各部门开展的党建活动、支部共建及交流实践动态。"
      headerBadge="图文报道 · 实时更新"
      emptyMessage="暂无工作动态"
    />
  );
}
