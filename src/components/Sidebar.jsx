import React from "react";
import {
  LayoutDashboard, Library, Layers, ListChecks, History, Settings as SettingsIcon,
  Sun, Moon, LogOut,
} from "lucide-react";

/* ============================================================
   SIDEBAR
   ============================================================ */

function NavTab({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`mt-tab ${active ? "mt-tab-active" : ""}`}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

export function Sidebar({ tab, goTo, darkMode, setDarkMode, userEmail, onSignOut }) {
  const tabs = [
    { id: "dashboard", label: "Panel", icon: LayoutDashboard },
    { id: "library", label: "Biblioteca", icon: Library },
    { id: "sagas", label: "Sagas", icon: Layers },
    { id: "backlog", label: "Backlog", icon: ListChecks },
    { id: "timeline", label: "Línea temporal", icon: History },
    { id: "settings", label: "Ajustes y backup", icon: SettingsIcon },
  ];
  return (
    <div className="mt-sidebar">
      <div className="mt-brand">
        <div className="mt-brand-mark">Ar</div>
        <div>
          <div className="mt-display font-bold leading-tight">Archivario</div>
          <div className="text-[11px] mt-ink-soft">tu archivo personal</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map((t) => <NavTab key={t.id} {...t} active={tab === t.id} onClick={() => goTo({ tab: t.id })} />)}
      </nav>
      {userEmail && <div className="text-[11px] mt-ink-soft truncate px-2" title={userEmail}>{userEmail}</div>}
      <button className="mt-tab" onClick={() => setDarkMode((d) => !d)}>
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        <span>{darkMode ? "Modo claro" : "Modo oscuro"}</span>
      </button>
      {onSignOut && (
        <button className="mt-tab" onClick={onSignOut}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      )}
    </div>
  );
}
