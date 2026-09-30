"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/75 backdrop-blur-sm" />
      <DialogPrimitive.Content className="dialog-panel">
        <DialogPrimitive.Close
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10"
        >
          <X size={20} />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
