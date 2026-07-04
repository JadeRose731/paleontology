import { PartyArticleList } from "@/components/party/PartyArticleList";

export default function Announcements() {
  return (
    <PartyArticleList
      routePath="/announcements"
      columnCode="party_announcement"
      pinnedLabel="置顶重要"
      countLabel={n => `共 ${n} 条公告`}
      emptyMessage="暂无公告内容"
    />
  );
}
