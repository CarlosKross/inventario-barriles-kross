import { Check, X } from "lucide-react";
import type { Cluster, DraftItem, InventarioItem, Product } from "../types";
import { calculateItem, clusterLabels, validateDraft } from "../utils/inventory";

interface InventoryFormProps {
  draft: DraftItem;
  activeCluster: Cluster;
  productos: Product[];
  hasSucursal: boolean;
  editingItem: InventarioItem | null;
  error: string;
  onDraftChange: (draft: DraftItem) => void;
  onSubmit: (item: InventarioItem) => void;
  onCancelEdit: () => void;
  onError: (message: string) => void;
}

export function InventoryForm({
  draft,
  activeCluster,
  productos,
  hasSucursal,
  editingItem,
  error,
  onDraftChange,
  onSubmit,
  onCancelEdit,
  onError
}: InventoryFormProps) {
  const selectedProduct = productos.find((producto) => producto.id === draft.producto_id);
  const preview = selectedProduct ? calculateItem(draft, selectedProduct, editingItem?.id) : null;

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateDraft(draft, hasSucursal);
    if (validation) {
      onError(validation);
      return;
    }
    if (!selectedProduct) {
      onError("Selecciona un producto.");
      return;
    }
    onSubmit(calculateItem(draft, selectedProduct, editingItem?.id));
  }

  return (
    <form className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-soft" onSubmit={submitForm}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-kross-amber">{clusterLabels[activeCluster]}</p>
        <h2 className="text-xl font-bold text-neutral-950">{editingItem ? "Editar registro" : "Agregar registro"}</h2>
      </div>

      <label className="grid gap-2">
        <span className="field-label">Producto</span>
        <select
          className="field-control"
          value={draft.producto_id}
          onChange={(event) => onDraftChange({ ...draft, producto_id: event.target.value })}
        >
          <option value="">Seleccionar producto</option>
          {productos
            .filter((producto) => producto.active)
            .map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.name}
              </option>
            ))}
        </select>
      </label>

      {activeCluster === "pinchado" ? (
        <div className="grid gap-2">
          <label className="field-label" htmlFor="medicion">
            Medición del barril
          </label>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <input
              id="medicion"
              className="accent-kross-amber"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={draft.medicion}
              onChange={(event) => onDraftChange({ ...draft, cantidad: 1, medicion: Number(event.target.value) })}
            />
            <input
              className="field-control text-center"
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={draft.medicion}
              onChange={(event) => onDraftChange({ ...draft, cantidad: 1, medicion: Number(event.target.value) })}
            />
          </div>
        </div>
      ) : (
        <label className="grid gap-2">
          <span className="field-label">{activeCluster === "lleno" ? "Cantidad de barriles completos" : "Cantidad de barriles vacíos"}</span>
          <input
            className="field-control"
            type="number"
            min="0"
            step="1"
            value={draft.cantidad}
            onChange={(event) => onDraftChange({ ...draft, cantidad: Number(event.target.value) })}
          />
        </label>
      )}

      <label className="grid gap-2">
        <span className="field-label">Observación</span>
        <textarea
          className="field-control min-h-20 py-3"
          value={draft.observacion}
          placeholder="Opcional"
          onChange={(event) => onDraftChange({ ...draft, observacion: event.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-neutral-100 p-3 text-sm">
        <Metric label="Litros" value={`${preview?.litros ?? 0} L`} />
        <Metric label="Barriles eq." value={`${preview?.barriles_equivalentes ?? 0}`} />
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <button className="action-button bg-kross-green text-white hover:bg-[#265840]" type="submit">
          <Check size={18} />
          {editingItem ? "Actualizar" : "Agregar"}
        </button>
        {editingItem ? (
          <button className="action-button border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50" type="button" onClick={onCancelEdit}>
            <X size={18} />
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
      <p className="text-lg font-black text-neutral-950">{value}</p>
    </div>
  );
}
