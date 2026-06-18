import { CalendarDays, Save, Trash2 } from "lucide-react";
import type { Inventario } from "../types";
import { formatDateTime } from "../utils/inventory";
import { BranchSelector } from "./BranchSelector";
import type { Branch } from "../types";

interface InventoryHeaderProps {
  inventory: Inventario | null;
  sucursales: Branch[];
  selectedBranchId: string;
  responsable: string;
  savedMessage: string;
  onSelectBranch: (id: string) => void;
  onResponsableChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

export function InventoryHeader({
  inventory,
  sucursales,
  selectedBranchId,
  responsable,
  savedMessage,
  onSelectBranch,
  onResponsableChange,
  onSave,
  onReset
}: InventoryHeaderProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-soft md:grid-cols-[1fr_1fr_auto] md:items-end">
      <BranchSelector sucursales={sucursales} selectedId={selectedBranchId} onSelect={onSelectBranch} />

      <label className="grid gap-2">
        <span className="field-label">Responsable</span>
        <input
          className="field-control"
          value={responsable}
          placeholder="Nombre del responsable"
          onChange={(event) => onResponsableChange(event.target.value)}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2 md:min-w-64">
        <button className="action-button bg-kross-black text-white hover:bg-neutral-800" onClick={onSave} disabled={!inventory}>
          <Save size={18} />
          Guardar
        </button>
        <button className="action-button border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50" onClick={onReset} disabled={!inventory}>
          <Trash2 size={18} />
          Reiniciar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600 md:col-span-3">
        <CalendarDays size={16} />
        <span>{inventory ? formatDateTime(inventory.fecha) : "La fecha se crea al seleccionar sucursal"}</span>
        {savedMessage ? <span className="font-semibold text-kross-green">{savedMessage}</span> : null}
      </div>
    </section>
  );
}
