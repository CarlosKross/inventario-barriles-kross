import type { Branch } from "../types";

interface BranchSelectorProps {
  sucursales: Branch[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BranchSelector({ sucursales, selectedId, onSelect }: BranchSelectorProps) {
  return (
    <label className="grid gap-2">
      <span className="field-label">Sucursal</span>
      <select className="field-control" value={selectedId} onChange={(event) => onSelect(event.target.value)}>
        <option value="">Seleccionar sucursal</option>
        {sucursales
          .filter((sucursal) => sucursal.active)
          .map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.name}
            </option>
          ))}
      </select>
    </label>
  );
}
