import type { Inventario } from "../types";
import { loadInventories, saveInventory } from "../utils/inventory";
import { isSupabaseConfigured, supabase } from "./supabase";

export async function getInventories(): Promise<Inventario[]> {
  if (!isSupabaseConfigured || !supabase) return loadInventories();

  const { data, error } = await supabase
    .from("inventories")
    .select("*, inventory_items(*)")
    .order("inventory_date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((inventory) => ({
    id: inventory.id,
    sucursal_id: inventory.branch_id,
    sucursal_nombre: inventory.branch_name,
    fecha: inventory.inventory_date,
    responsable: inventory.responsible ?? "",
    estado: inventory.status,
    items: (inventory.inventory_items ?? []).map((item: RemoteInventoryItem) => ({
      id: item.id,
      producto_id: item.product_id ?? "",
      producto_nombre: item.product_name,
      cluster: item.cluster,
      cantidad: Number(item.quantity),
      medicion: Number(item.measurement),
      litros: Number(item.liters),
      barriles_equivalentes: Number(item.barrel_equivalents),
      observacion: item.observation ?? undefined
    }))
  }));
}

interface RemoteInventoryItem {
  id: string;
  product_id: string | null;
  product_name: string;
  cluster: "pinchado" | "lleno" | "vacio";
  quantity: number | string;
  measurement: number | string;
  liters: number | string;
  barrel_equivalents: number | string;
  observation: string | null;
}

export async function persistInventory(inventory: Inventario): Promise<void> {
  saveInventory(inventory);

  if (!isSupabaseConfigured || !supabase) return;

  const { error: inventoryError } = await supabase.from("inventories").upsert({
    id: inventory.id,
    branch_id: inventory.sucursal_id,
    branch_name: inventory.sucursal_nombre,
    responsible: inventory.responsable,
    status: "cerrado",
    inventory_date: inventory.fecha
  });
  if (inventoryError) throw new Error(inventoryError.message);

  const { error: deleteError } = await supabase.from("inventory_items").delete().eq("inventory_id", inventory.id);
  if (deleteError) throw new Error(deleteError.message);

  if (inventory.items.length === 0) return;

  const { error: itemsError } = await supabase.from("inventory_items").insert(
    inventory.items.map((item) => ({
      id: item.id,
      inventory_id: inventory.id,
      product_id: item.producto_id || null,
      product_name: item.producto_nombre,
      cluster: item.cluster,
      quantity: item.cantidad,
      measurement: item.medicion,
      liters: item.litros,
      barrel_equivalents: item.barriles_equivalentes,
      observation: item.observacion ?? null
    }))
  );
  if (itemsError) throw new Error(itemsError.message);
}
