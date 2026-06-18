import { INITIAL_BRANCHES, INITIAL_PRODUCTS } from "../data";
import { appPath } from "../lib/routing";
import type { Branch, Cluster, DraftItem, Inventario, InventarioItem, Product, Summary } from "../types";

const STORAGE_KEY = "inventario-barriles-kross";
const INVENTORIES_KEY = "inventario-barriles-kross-list";
const PRODUCTS_KEY = "inventario-barriles-kross-products";
const BRANCHES_KEY = "inventario-barriles-kross-branches";
const ADMIN_KEY = "inventario-barriles-kross-admin";

export const clusterLabels: Record<Cluster, string> = {
  pinchado: "Barriles Pinchados",
  lleno: "Barriles Llenos",
  vacio: "Barriles Vacíos"
};

export function createInventory(sucursal: Branch, responsable = ""): Inventario {
  return {
    id: crypto.randomUUID(),
    sucursal_id: sucursal.id,
    sucursal_nombre: sucursal.name,
    fecha: new Date().toISOString(),
    responsable,
    estado: "abierto",
    items: []
  };
}

export function calculateItem(draft: DraftItem, producto: Product, existingId?: string): InventarioItem {
  if (draft.cluster === "pinchado") {
    const medicion = roundOne(draft.medicion);
    return {
      id: existingId ?? crypto.randomUUID(),
      producto_id: producto.id,
      producto_nombre: producto.name,
      cluster: draft.cluster,
      cantidad: 1,
      medicion,
      litros: roundOne(medicion * producto.format_liters),
      barriles_equivalentes: medicion,
      observacion: cleanOptional(draft.observacion)
    };
  }

  if (draft.cluster === "lleno") {
    return {
      id: existingId ?? crypto.randomUUID(),
      producto_id: producto.id,
      producto_nombre: producto.name,
      cluster: draft.cluster,
      cantidad: draft.cantidad,
      medicion: 1,
      litros: roundOne(draft.cantidad * producto.format_liters),
      barriles_equivalentes: draft.cantidad,
      observacion: cleanOptional(draft.observacion)
    };
  }

  return {
    id: existingId ?? crypto.randomUUID(),
    producto_id: producto.id,
    producto_nombre: producto.name,
    cluster: draft.cluster,
    cantidad: draft.cantidad,
    medicion: 0,
    litros: 0,
    barriles_equivalentes: 0,
    observacion: cleanOptional(draft.observacion)
  };
}

export function validateDraft(draft: DraftItem, hasSucursal: boolean): string | null {
  if (!hasSucursal) return "Selecciona una sucursal antes de agregar registros.";
  if (!draft.producto_id) return "Selecciona un producto.";

  if (draft.cluster === "pinchado") {
    if (draft.medicion < 0.1 || draft.medicion > 1) return "La medición debe estar entre 0.1 y 1.0.";
    if (Math.round(draft.medicion * 10) !== draft.medicion * 10) return "La medición debe avanzar en saltos de 0.1.";
    return null;
  }

  if (draft.cantidad < 0) return "La cantidad no puede ser negativa.";
  if (draft.cantidad === 0) return "La cantidad debe ser mayor a 0.";
  if (!Number.isInteger(draft.cantidad)) return "La cantidad debe ser un número entero.";

  return null;
}

export function addItem(inventory: Inventario, item: InventarioItem): Inventario {
  return { ...inventory, items: [item, ...inventory.items] };
}

export function updateItem(inventory: Inventario, item: InventarioItem): Inventario {
  return { ...inventory, items: inventory.items.map((current) => (current.id === item.id ? item : current)) };
}

export function deleteItem(inventory: Inventario, itemId: string): Inventario {
  return { ...inventory, items: inventory.items.filter((item) => item.id !== itemId) };
}

export function calculateSummary(items: InventarioItem[]): Summary {
  const totals = items.reduce(
    (acc, item) => {
      if (item.cluster === "pinchado") {
        acc.pinchadoEquivalente += item.barriles_equivalentes;
        acc.litrosPinchados += item.litros;
      }
      if (item.cluster === "lleno") {
        acc.barrilesLlenos += item.barriles_equivalentes;
        acc.litrosLlenos += item.litros;
      }
      if (item.cluster === "vacio") {
        acc.barrilesVacios += item.cantidad;
      }
      return acc;
    },
    {
      pinchadoEquivalente: 0,
      litrosPinchados: 0,
      barrilesLlenos: 0,
      litrosLlenos: 0,
      barrilesVacios: 0,
      stockDisponibleBarriles: 0,
      stockDisponibleLitros: 0
    }
  );

  totals.stockDisponibleBarriles = totals.barrilesLlenos + totals.pinchadoEquivalente;
  totals.stockDisponibleLitros = totals.stockDisponibleBarriles * 30;

  return {
    pinchadoEquivalente: roundOne(totals.pinchadoEquivalente),
    litrosPinchados: roundOne(totals.litrosPinchados),
    barrilesLlenos: roundOne(totals.barrilesLlenos),
    litrosLlenos: roundOne(totals.litrosLlenos),
    barrilesVacios: roundOne(totals.barrilesVacios),
    stockDisponibleBarriles: roundOne(totals.stockDisponibleBarriles),
    stockDisponibleLitros: roundOne(totals.stockDisponibleLitros)
  };
}

export function saveInventory(inventory: Inventario): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  const inventories = loadInventories().filter((item) => item.id !== inventory.id);
  localStorage.setItem(INVENTORIES_KEY, JSON.stringify([{ ...inventory, estado: "cerrado" }, ...inventories]));
}

export function loadInventory(): Inventario | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as Inventario;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function loadInventories(): Inventario[] {
  return loadJson<Inventario[]>(INVENTORIES_KEY, []);
}

export function resetInventory(sucursal: Branch, responsable: string): Inventario {
  return createInventory(sucursal, responsable);
}

export function loadProducts(): Product[] {
  return loadJson<Product[]>(PRODUCTS_KEY, INITIAL_PRODUCTS).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function loadBranches(): Branch[] {
  return loadJson<Branch[]>(BRANCHES_KEY, INITIAL_BRANCHES).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveBranches(branches: Branch[]): void {
  localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
}

export function isAdminAuthenticated(): boolean {
  return loadJson(ADMIN_KEY, { authenticated: false }).authenticated;
}

export function saveAdminSession(email: string): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ authenticated: true, email }));
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_KEY);
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function accessLink(branch: Branch): string {
  return `${window.location.origin}${appPath(`/ingreso/${branch.slug}`)}?token=${branch.access_token}`;
}

export function productHasInventory(productId: string): boolean {
  return loadInventories().some((inventory) => inventory.items.some((item) => item.producto_id === productId));
}

export function branchHasInventory(branchId: string): boolean {
  return loadInventories().some((inventory) => inventory.sucursal_id === branchId);
}

export function exportToCSV(inventory: Inventario): void {
  const headers = [
    "inventario_id",
    "sucursal",
    "fecha",
    "responsable",
    "producto",
    "cluster",
    "cantidad",
    "medicion",
    "litros",
    "barriles_equivalentes",
    "observacion"
  ];

  const rows = inventory.items.map((item) => [
    inventory.id,
    inventory.sucursal_nombre,
    formatDateTime(inventory.fecha),
    inventory.responsable,
    item.producto_nombre,
    clusterLabels[item.cluster],
    item.cantidad,
    item.medicion,
    item.litros,
    item.barriles_equivalentes,
    item.observacion ?? ""
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventario-barriles-kross-${inventory.sucursal_id}-${inventory.fecha.slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function cleanOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function csvCell(value: string | number): string {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function loadJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}
