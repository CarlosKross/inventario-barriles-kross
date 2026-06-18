import { INITIAL_BRANCHES, INITIAL_PRODUCTS } from "../data";
import type { Branch, Inventario, Product } from "../types";
import { loadBranches, loadInventories, loadProducts, saveBranches, saveProducts } from "../utils/inventory";

const BACKUP_VERSION = 1;
const INVENTORIES_KEY = "inventario-barriles-kross-list";

interface LocalBackup {
  version: number;
  exported_at: string;
  products: Product[];
  branches: Branch[];
  inventories: Inventario[];
}

export function exportLocalBackup(): void {
  const backup: LocalBackup = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    products: loadProducts(),
    branches: loadBranches(),
    inventories: loadInventories()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `respaldo-inventario-kross-${backup.exported_at.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importLocalBackup(file: File): Promise<void> {
  const text = await file.text();
  const backup = JSON.parse(text) as Partial<LocalBackup>;

  if (backup.version !== BACKUP_VERSION || !Array.isArray(backup.products) || !Array.isArray(backup.branches) || !Array.isArray(backup.inventories)) {
    throw new Error("El archivo de respaldo no tiene el formato esperado.");
  }

  saveProducts(backup.products.length > 0 ? backup.products : INITIAL_PRODUCTS);
  saveBranches(backup.branches.length > 0 ? backup.branches : INITIAL_BRANCHES);
  localStorage.setItem(INVENTORIES_KEY, JSON.stringify(backup.inventories));
}
