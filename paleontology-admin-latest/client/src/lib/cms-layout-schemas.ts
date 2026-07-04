export interface LayoutSchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  default?: string | number | boolean;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface LayoutSchema {
  fields: LayoutSchemaField[];
}

export function parseLayoutSchema(json?: string | null): LayoutSchema {
  if (!json) return { fields: [] };
  try {
    const parsed = JSON.parse(json) as LayoutSchema;
    return { fields: parsed.fields ?? [] };
  } catch {
    return { fields: [] };
  }
}

export function parseLayoutParamsObject(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function buildDefaultParams(schema: LayoutSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.default !== undefined) {
      result[field.key] = field.default;
    }
  }
  return result;
}

export function mergeLayoutParams(
  schema: LayoutSchema,
  current?: string | null
): Record<string, unknown> {
  return { ...buildDefaultParams(schema), ...parseLayoutParamsObject(current) };
}

export function stringifyLayoutParams(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

/** API 不可用时的本地 Schema 兜底 */
export const FALLBACK_LAYOUT_SCHEMAS: Record<string, LayoutSchema> = {
  list: {
    fields: [
      { key: "listStyle", label: "列表样式", type: "select", default: "simple", options: [
        { value: "simple", label: "简洁列表" }, { value: "card", label: "卡片列表" },
      ]},
      { key: "showPinnedBadge", label: "显示置顶标记", type: "boolean", default: true },
      { key: "pinnedLabel", label: "置顶标签", type: "text", default: "置顶" },
      { key: "showDate", label: "显示日期", type: "boolean", default: true },
      { key: "showSummary", label: "显示摘要", type: "boolean", default: true },
    ],
  },
  "gallery-grid": {
    fields: [
      { key: "filterLabel", label: "全部筛选标签", type: "text", default: "全部瞬间" },
      { key: "columns", label: "列数", type: "number", default: 4, min: 2, max: 6 },
      { key: "showFilters", label: "显示分类筛选", type: "boolean", default: true },
    ],
  },
  "file-list": {
    fields: [
      { key: "groupByCategory", label: "按分类分组", type: "boolean", default: true },
      { key: "showFileSize", label: "显示文件大小", type: "boolean", default: true },
      { key: "showSearch", label: "显示搜索框", type: "boolean", default: false },
    ],
  },
  timeline: {
    fields: [
      { key: "alternateSides", label: "左右交替", type: "boolean", default: true },
      { key: "showCover", label: "显示配图", type: "boolean", default: true },
    ],
  },
};
