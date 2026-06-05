"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StringListField({
  label,
  items,
  onChange,
  placeholder,
  inputType = "text",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  inputType?: string;
}) {
  function updateAt(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function add() {
    onChange([...items, ""]);
  }

  function remove(index: number) {
    if (items.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type={inputType}
              value={item}
              onChange={(e) => updateAt(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(index)}
              aria-label={`Remover ${label} ${index + 1}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar
      </Button>
    </div>
  );
}
