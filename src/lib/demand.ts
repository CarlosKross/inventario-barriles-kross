import type { Inventario } from "../types";

export interface SalesRecord {
  fecha: string;
  sucursal: string;
  sku: string;
  litros_vendidos: number;
}

export interface DemandRow {
  sucursal: string;
  sku: string;
  stock_litros: number;
  demanda_diaria_litros: number;
  dias_cobertura: number;
  estado: "Falta" | "OK" | "Sobrestock" | "Sin ventas";
  barriles_sugeridos: number;
}

export interface DemandSettings {
  diasMinimos: number;
  diasMaximos: number;
}

const SALES_KEY = "inventario-barriles-kross-sales";

export function loadSales(): SalesRecord[] {
  const saved = localStorage.getItem(SALES_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as SalesRecord[];
  } catch {
    localStorage.removeItem(SALES_KEY);
    return [];
  }
}

export function saveSales(records: SalesRecord[]): void {
  localStorage.setItem(SALES_KEY, JSON.stringify(records));
}

export function parseSalesCSV(csv: string): SalesRecord[] {
  const rows = parseCSV(csv).filter((row) => row.some(Boolean));
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const dateIndex = findHeader(headers, ["fecha", "date", "dia"]);
  const branchIndex = findHeader(headers, ["sucursal", "branch", "local"]);
  const skuIndex = findHeader(headers, ["sku", "producto", "product", "nombre_producto"]);
  const litersIndex = findHeader(headers, ["litros_vendidos", "litros", "venta_litros"]);
  const barrelsIndex = findHeader(headers, ["barriles_vendidos", "barriles", "venta_barriles"]);

  if (branchIndex < 0 || skuIndex < 0 || (litersIndex < 0 && barrelsIndex < 0)) {
    throw new Error("El CSV debe incluir sucursal, SKU/producto y litros_vendidos o barriles_vendidos.");
  }

  return rows.slice(1).map((row) => {
    const liters = litersIndex >= 0 ? parseNumber(row[litersIndex]) : parseNumber(row[barrelsIndex]) * 30;
    return {
      fecha: dateIndex >= 0 ? row[dateIndex] : "",
      sucursal: row[branchIndex]?.trim() ?? "",
      sku: row[skuIndex]?.trim() ?? "",
      litros_vendidos: liters
    };
  }).filter((record) => record.sucursal && record.sku && record.litros_vendidos > 0);
}

export function calculateDemand(inventories: Inventario[], sales: SalesRecord[], settings: DemandSettings): DemandRow[] {
  const latestByBranch = new Map<string, Inventario>();
  for (const inventory of inventories) {
    const current = latestByBranch.get(inventory.sucursal_nombre);
    if (!current || new Date(inventory.fecha) > new Date(current.fecha)) {
      latestByBranch.set(inventory.sucursal_nombre, inventory);
    }
  }

  const stock = new Map<string, { sucursal: string; sku: string; litros: number }>();
  for (const inventory of latestByBranch.values()) {
    for (const item of inventory.items) {
      if (item.cluster === "vacio") continue;
      const key = keyFor(inventory.sucursal_nombre, item.producto_nombre);
      const current = stock.get(key) ?? { sucursal: inventory.sucursal_nombre, sku: item.producto_nombre, litros: 0 };
      current.litros += item.litros;
      stock.set(key, current);
    }
  }

  const salesByKey = new Map<string, { sucursal: string; sku: string; litros: number; dates: Set<string> }>();
  for (const record of sales) {
    const key = keyFor(record.sucursal, record.sku);
    const current = salesByKey.get(key) ?? { sucursal: record.sucursal, sku: record.sku, litros: 0, dates: new Set<string>() };
    current.litros += record.litros_vendidos;
    if (record.fecha) current.dates.add(record.fecha);
    salesByKey.set(key, current);
  }

  const keys = new Set([...stock.keys(), ...salesByKey.keys()]);
  return [...keys].map((key) => {
    const stockRow = stock.get(key);
    const salesRow = salesByKey.get(key);
    const stockLiters = round(stockRow?.litros ?? 0);
    const salesDays = Math.max(salesRow?.dates.size ?? 0, 1);
    const dailyDemand = salesRow ? round(salesRow.litros / salesDays) : 0;
    const coverage = dailyDemand > 0 ? round(stockLiters / dailyDemand) : 0;
    const targetLiters = dailyDemand * settings.diasMaximos;
    const suggested = Math.max(0, Math.ceil((targetLiters - stockLiters) / 30));

    return {
      sucursal: stockRow?.sucursal ?? salesRow?.sucursal ?? "",
      sku: stockRow?.sku ?? salesRow?.sku ?? "",
      stock_litros: stockLiters,
      demanda_diaria_litros: dailyDemand,
      dias_cobertura: coverage,
      estado: statusFor(dailyDemand, coverage, settings),
      barriles_sugeridos: suggested
    };
  }).sort((a, b) => a.sucursal.localeCompare(b.sucursal) || a.sku.localeCompare(b.sku));
}

function statusFor(dailyDemand: number, coverage: number, settings: DemandSettings): DemandRow["estado"] {
  if (dailyDemand <= 0) return "Sin ventas";
  if (coverage < settings.diasMinimos) return "Falta";
  if (coverage > settings.diasMaximos) return "Sobrestock";
  return "OK";
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
}

function findHeader(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) => candidates.includes(header));
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function keyFor(branch: string, sku: string): string {
  return `${branch.trim().toLowerCase()}::${sku.trim().toLowerCase()}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
