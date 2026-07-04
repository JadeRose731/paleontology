/** layout_params 解析与用户端版式参数类型 */

import { parseExtra, type ApiCmsChannel } from "@/lib/cms-api";

export interface ListLayoutParams {
  listStyle?: "simple" | "card";
  showPinnedBadge?: boolean;
  pinnedLabel?: string;
  showDate?: boolean;
  showCategory?: boolean;
  showSummary?: boolean;
}

export interface GalleryLayoutParams {
  filterLabel?: string;
  columns?: number;
  showFilters?: boolean;
}

export interface FileListLayoutParams {
  groupByCategory?: boolean;
  showFileSize?: boolean;
  showSearch?: boolean;
}

export interface TimelineLayoutParams {
  alternateSides?: boolean;
  showCover?: boolean;
}

export interface PersonnelLayoutParams {
  columns?: number;
  groupBySummary?: boolean;
}

export function getLayoutParams<T extends object>(
  channel: ApiCmsChannel,
  defaults?: T
): T {
  return { ...defaults, ...parseExtra<Partial<T>>(channel.layoutParams) } as T;
}
