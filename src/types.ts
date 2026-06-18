export type Cluster = "pinchado" | "lleno" | "vacio";

export interface Branch {
  id: string;
  name: string;
  slug: string;
  access_token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  family: string;
  format_liters: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InventarioItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  cluster: Cluster;
  cantidad: number;
  medicion: number;
  litros: number;
  barriles_equivalentes: number;
  observacion?: string;
}

export interface Inventario {
  id: string;
  sucursal_id: string;
  sucursal_nombre: string;
  fecha: string;
  responsable: string;
  estado: "abierto" | "cerrado";
  items: InventarioItem[];
}

export interface Summary {
  pinchadoEquivalente: number;
  litrosPinchados: number;
  barrilesLlenos: number;
  litrosLlenos: number;
  barrilesVacios: number;
  stockDisponibleBarriles: number;
  stockDisponibleLitros: number;
}

export interface DraftItem {
  producto_id: string;
  cluster: Cluster;
  cantidad: number;
  medicion: number;
  observacion: string;
}

export interface AdminSession {
  authenticated: boolean;
  email: string;
}
