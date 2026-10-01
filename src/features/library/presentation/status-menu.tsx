"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { statuses, type Status } from "../domain/model";
import { statusLabel } from "./format";

// Menú propio en lugar del <select> nativo: se ve igual en todos los sistemas
// y la lista respeta los colores de la app.
export function StatusMenu({
  label,
  status,
  disabled,
  onChange,
}: {
  label: string;
  status: Status;
  disabled?: boolean;
  onChange: (status: Status) => void;
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={
          "status-badge status-trigger status-" + status.replace(" ", "-")
        }
        aria-label={label + ": " + statusLabel(status)}
        data-status={status}
        disabled={disabled}
      >
        <i aria-hidden="true" />
        {statusLabel(status)}
        <ChevronDown size={12} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="status-menu" sideOffset={6} align="start">
          <Menu.RadioGroup
            value={status}
            onValueChange={(value) => {
              if (value !== status) onChange(value as Status);
            }}
          >
            {statuses.map((s) => (
              <Menu.RadioItem
                key={s}
                value={s}
                className={"status-menu-item status-" + s.replace(" ", "-")}
              >
                <i aria-hidden="true" />
                {statusLabel(s)}
                <Menu.ItemIndicator className="status-menu-check">
                  <Check size={14} />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
