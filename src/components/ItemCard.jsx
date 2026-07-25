import React from "react";
import { TYPE_CONFIG } from "../lib/model";
import { fmtDate } from "../lib/model";
import { StampBadge, CoverThumb, TypeIcon, StatusPill, PriorityPill, ScoreTag } from "./ui/atoms";

/* ============================================================
   ITEM CARD / ROW
   ============================================================ */

export function extraLine(item) {
  if (item.type === "game") {
    const bits = [];
    if (item.platform) bits.push(item.platform);
    if (item.hours) bits.push(`${item.hours}h`);
    return bits.join(" · ");
  }
  if (item.type === "manga") {
    const bits = [];
    if (item.currentVolume) bits.push(`Tomo ${item.currentVolume}`);
    if (item.currentChapter) bits.push(`Cap. ${item.currentChapter}`);
    return bits.join(" · ");
  }
  if (item.type === "anime" || item.type === "series") {
    const bits = [];
    if (item.season) bits.push(`T${item.season}`);
    if (item.currentEpisode) bits.push(`Ep. ${item.currentEpisode}`);
    return bits.join(" · ");
  }
  return "";
}

export function ItemCard({ item, saga, onClick }) {
  return (
    <button onClick={onClick} className="mt-card mt-item-card text-left relative">
      <StampBadge item={item} />
      <CoverThumb item={item} />
      <div className="p-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1 mt-ink-soft text-[11px] uppercase tracking-wide">
          <TypeIcon type={item.type} size={11} /> {TYPE_CONFIG[item.type].label}
          {saga && <span className="truncate">· {saga.name}</span>}
        </div>
        <div className="font-semibold leading-snug line-clamp-2 mt-display-sm">{item.title}</div>
        <div className="flex items-center gap-1 flex-wrap mt-1">
          <StatusPill item={item} />
          <PriorityPill item={item} />
        </div>
        <div className="flex items-center justify-between">
          {extraLine(item) ? <span className="text-xs mt-ink-soft mt-mono">{extraLine(item)}</span> : <span />}
          <ScoreTag score={item.score} />
        </div>
      </div>
    </button>
  );
}

export function ItemRow({ item, saga, onClick, showPriority = false }) {
  return (
    <button onClick={onClick} className="mt-row w-full text-left">
      <CoverThumb item={item} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate mt-display-sm">{item.title}</div>
        <div className="text-xs mt-ink-soft flex items-center gap-1.5 flex-wrap">
          <TypeIcon type={item.type} size={11} /> {TYPE_CONFIG[item.type].label}
          {saga && <span>· {saga.name}</span>}
          {extraLine(item) && <span className="mt-mono">· {extraLine(item)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap justify-end">
        <StatusPill item={item} />
        {showPriority && <PriorityPill item={item} />}
      </div>
      <div className="w-16 text-right"><ScoreTag score={item.score} /></div>
      <div className="w-24 text-xs mt-ink-soft text-right hidden md:block">{fmtDate(item.endDate || item.startDate)}</div>
    </button>
  );
}
