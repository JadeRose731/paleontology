import type { ComponentType } from "react";
import type { CmsLayoutProps } from "@/lib/cms-types";
import {
  CmsTimelineLayout,
  CmsListLayout,
  CmsGalleryLayout,
  CmsPersonnelLayout,
  CmsRichTextLayout,
  CmsRegulationsLayout,
  CmsFileListLayout,
  CmsTopicsLayout,
  CmsInternationalLayout,
  CmsListMultiColumnLayout,
} from "@/components/cms/cms-layouts";

export const LAYOUT_REGISTRY: Record<string, ComponentType<CmsLayoutProps>> = {
  timeline: CmsTimelineLayout,
  list: CmsListLayout,
  "list-multi-column": CmsListMultiColumnLayout,
  "gallery-grid": CmsGalleryLayout,
  "personnel-cards": CmsPersonnelLayout,
  "richtext-single": CmsRichTextLayout,
  "file-list": CmsFileListLayout,
  mixed: CmsRichTextLayout,
  international: CmsInternationalLayout,
};

/** 按频道编码覆盖版式（特殊页） */
export const CHANNEL_LAYOUT_OVERRIDE: Record<string, ComponentType<CmsLayoutProps>> = {
  regulations: CmsRegulationsLayout,
  party_topics: CmsTopicsLayout,
  international: CmsInternationalLayout,
};

export function resolveLayoutComponent(
  layoutType?: string | null,
  channelCode?: string
): ComponentType<CmsLayoutProps> | null {
  if (channelCode && CHANNEL_LAYOUT_OVERRIDE[channelCode]) {
    return CHANNEL_LAYOUT_OVERRIDE[channelCode];
  }
  if (layoutType && LAYOUT_REGISTRY[layoutType]) {
    return LAYOUT_REGISTRY[layoutType];
  }
  return CmsListLayout;
}
