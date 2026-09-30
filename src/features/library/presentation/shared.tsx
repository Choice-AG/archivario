"use client";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Command, Game } from "../domain/model";

export type Execute = (command: Command) => Promise<void>;
export type ApiRequest = (url: string, init?: RequestInit) => Promise<Response>;
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-2xl font-semibold tracking-tight pr-8">
          {title}
        </DialogTitle>
        <DialogDescription className="dialog-description">
          {description ?? "Tu biblioteca personal, a tu ritmo."}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Cover({
  game,
  className = "",
}: {
  game: Game;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return game.cover && !failed ? (
    <img
      src={game.cover}
      alt={game.title}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      width={264}
      height={374}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={"cover-fallback " + className}>
      <Gamepad2 size={44} />
      <span>{game.title}</span>
    </div>
  );
}
