"use client";

import * as React from "react";
import { formatHora24Input, normalizeHora24 } from "@/lib/time";
import { Input } from "@/components/ui/input";

function TimeInput({
  className,
  value,
  onChange,
  onBlur,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="00:00"
      maxLength={5}
      className={className}
      value={value}
      onChange={(e) => onChange(formatHora24Input(e.target.value))}
      onBlur={(e) => {
        const normalizada = normalizeHora24(e.target.value);
        if (normalizada) onChange(normalizada);
        onBlur?.(e);
      }}
    />
  );
}

export { TimeInput };
