import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type LayoutSchema,
  type LayoutSchemaField,
  parseLayoutSchema,
  mergeLayoutParams,
  stringifyLayoutParams,
  FALLBACK_LAYOUT_SCHEMAS,
} from "@/lib/cms-layout-schemas";
import { listCmsLayouts, type ApiCmsLayout } from "@/lib/cms-api";

interface LayoutParamsEditorProps {
  layoutType?: string | null;
  value?: string | null;
  onChange: (json: string) => void;
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: LayoutSchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={v => onChange(!!v)}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Select value={String(value ?? field.default ?? "")} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={value != null ? String(value) : String(field.default ?? "")}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      <Input
        value={value != null ? String(value) : String(field.default ?? "")}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export default function LayoutParamsEditor({ layoutType, value, onChange }: LayoutParamsEditorProps) {
  const [layouts, setLayouts] = useState<ApiCmsLayout[]>([]);

  useEffect(() => {
    listCmsLayouts()
      .then(setLayouts)
      .catch(() => setLayouts([]));
  }, []);

  const schema: LayoutSchema = useMemo(() => {
    if (!layoutType) return { fields: [] };
    const fromApi = layouts.find(l => l.layoutCode === layoutType);
    if (fromApi?.schemaJson) return parseLayoutSchema(fromApi.schemaJson);
    return FALLBACK_LAYOUT_SCHEMAS[layoutType] ?? { fields: [] };
  }, [layoutType, layouts]);

  const params = useMemo(() => mergeLayoutParams(schema, value), [schema, value]);

  const updateField = (key: string, fieldValue: unknown) => {
    const next = { ...params, [key]: fieldValue };
    onChange(stringifyLayoutParams(next));
  };

  if (!layoutType || schema.fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground col-span-2">
        选择页面样式后可进一步调整展示效果
      </p>
    );
  }

  return (
    <div className="col-span-2 space-y-4 border rounded-lg p-4 bg-slate-50">
      <div>
        <h4 className="text-sm font-semibold text-strata-blue-deep">展示效果设置</h4>
        <p className="text-xs text-muted-foreground mt-1">
          以下选项控制此栏目在网站上的展示方式
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {schema.fields.map(field => (
          <FieldControl
            key={field.key}
            field={field}
            value={params[field.key]}
            onChange={v => updateField(field.key, v)}
          />
        ))}
      </div>
    </div>
  );
}
