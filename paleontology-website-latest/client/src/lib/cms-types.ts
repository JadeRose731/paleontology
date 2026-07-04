import type { ApiCmsChannel, ApiCmsEntry } from "@/lib/cms-api";

export interface CmsBlock {
  blockId?: number;
  blockType?: string;
  title?: string;
  bodyContent?: string;
}

export interface CmsPageResolveData {
  channel: ApiCmsChannel;
  blocks: CmsBlock[];
  entries: ApiCmsEntry[];
  children: ApiCmsChannel[];
}

export interface CmsLayoutProps {
  channel: ApiCmsChannel;
  entries: ApiCmsEntry[];
  blocks: CmsBlock[];
  children: ApiCmsChannel[];
  routePath: string;
}
