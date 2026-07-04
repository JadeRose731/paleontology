import { useEffect, useState } from "react";
import { listPublicCmsEntries, parseExtra, type ApiCmsEntry } from "@/lib/cms-api";

export interface SiteConfig {
  copyright: string;
  contactPhone: string;
  contactFax: string;
  contactEmail: string;
  address: string;
  zipCode: string;
  icpNumber: string;
  securityNumber: string;
  qrCodeWechat: string;
  qrCodeMember: string;
  friendLinks: { name: string; url: string }[];
}

const FALLBACK: SiteConfig = {
  copyright: "© 2026 中国古生物学会 版权所有. All Rights Reserved.",
  contactPhone: "025-83282138",
  contactFax: "025-83357026",
  contactEmail: "psc@nigpas.ac.cn",
  address: "南京市北京东路39号",
  zipCode: "210008",
  icpNumber: "苏ICP备16036686号-1",
  securityNumber: "苏公网安备 32010202010139号",
  qrCodeWechat: "",
  qrCodeMember: "",
  friendLinks: [
    { name: "中国地理学会", url: "" },
    { name: "中国地质学会", url: "" },
    { name: "国际古生物协会 (IPA)", url: "" },
    { name: "亚洲古生物学会", url: "" },
  ],
};

let cached: SiteConfig | null = null;

export function useSiteConfig(): SiteConfig {
  const [config, setConfig] = useState<SiteConfig>(cached ?? FALLBACK);

  useEffect(() => {
    if (cached) return;
    listPublicCmsEntries({ moduleCode: "settings", columnCode: "site_config" })
      .then((entries: ApiCmsEntry[]) => {
        const entry = entries[0];
        if (entry?.extraJson) {
          const parsed = parseExtra<Partial<SiteConfig>>(entry.extraJson, {});
          const merged: SiteConfig = { ...FALLBACK, ...parsed };
          cached = merged;
          setConfig(merged);
        }
      })
      .catch(() => {});
  }, []);

  return config;
}
