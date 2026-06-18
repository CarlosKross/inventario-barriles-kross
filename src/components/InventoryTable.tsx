import { Pencil, Trash2 } from "lucide-react";
import type { InventarioItem } from "../types";
import { clusterLabels } from "../utils/inventory";

interface InventoryTableProps {
  items: InventarioItem[];
  onEdit: (item: InventarioItem) => void;
  onDelete: (itemId: string) => void;
}

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-neutral-600">
        Aún no hay registros agregados.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-soft">
      <div className="border-b border-neutral-200 p-4">
        <h2 className="text-lg font-bold text-neutral-950">Registros agregados</h2>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-100 text-xs uppercase text-neutral-600">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Cluster</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Medición</th>
              <th className="px-4 py-3 text-right">Litros</th>
              <th className="px-4 py-3 text-right">Barriles eq.</th>
              <th className="px-4 py-3">Observación</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-semibold">{item.producto_nombre}</td>
                <td className="px-4 py-3">{clusterLabels[item.cluster]}</td>
                <td className="px-4 py-3 text-right">{item.cantidad}</td>
                <td className="px-4 py-3 text-right">{item.medicion}</td>
                <td className="px-4 py-3 text-right">{item.litros}</td>
                <td className="px-4 py-3 text-right">{item.barriles_equivalentes}</td>
                <td className="px-4 py-3 text-neutral-600">{item.observacion ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Editar" onClick={() => onEdit(item)}>
                      <Pencil size={17} />
                    </IconButton>
                    <IconButton label="Eliminar" onClick={() => onDelete(item.id)} danger>
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ItemCard({ item, onEdit, onDelete }: { item: InventarioItem; onEdit: (item: InventarioItem) => void; onDelete: (itemId: string) => void }) {
  return (
    <article className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-neutral-950">{item.producto_nombre}</p>
          <p className="text-sm text-neutral-600">{clusterLabels[item.cluster]}</p>
        </div>
        <div className="flex gap-2">
          <IconButton label="Editar" onClick={() => onEdit(item)}>
            <Pencil size={17} />
          </IconButton>
          <IconButton label="Eliminar" onClick={() => onDelete(item.id)} danger>
            <Trash2 size={17} />
          </IconButton>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
        <SmallMetric label="Cant." value={item.cantidad} />
        <SmallMetric label="Med." value={item.medicion} />
        <SmallMetric label="Litros" value={item.litros} />
        <SmallMetric label="Eq." value={item.barriles_equivalentes} />
      </div>
      {item.observacion ? <p className="mt-3 text-sm text-neutral-600">{item.observacion}</p> : null}
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-neutral-100 p-2 text-center">
      <p className="text-[11px] font-semibold uppercase text-neutral-500">{label}</p>
      <p className="font-black text-neutral-950">{value}</p>
    </div>
  );
}

function IconButton({ label, children, danger, onClick }: { label: string; children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex size-10 items-center justify-center rounded-lg border transition ${
        danger ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
      }`}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
