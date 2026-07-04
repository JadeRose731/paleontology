import { PartyArticleList } from "@/components/party/PartyArticleList";

export default function Activities() {
  return <PartyArticleList routePath="/activities" columnCode="party_activities" layout="card" listSuffix="纪实" />;
}
