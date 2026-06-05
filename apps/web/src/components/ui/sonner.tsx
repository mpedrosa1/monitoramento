"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      richColors
      duration={Infinity}
      visibleToasts={8}
      {...props}
    />
  );
}
