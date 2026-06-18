import type { Branch, Product } from "./types";

const now = new Date().toISOString();

export const INITIAL_BRANCHES: Branch[] = [
  branch("Kross Bar Bellavista", "bellavista"),
  branch("Kross Bar Borderío", "borderio"),
  branch("Kross Bar Patio Bellavista", "patio-bellavista"),
  branch("Kross Bar Orrego Luco", "orrego-luco"),
  branch("Kross Bar Viña del Mar", "vina-del-mar")
];

export const INITIAL_PRODUCTS: Product[] = [
  "Kross Golden",
  "Kross Pilsner",
  "Kross Stout",
  "Kross Maibock",
  "Kross K5",
  "Kross IPA",
  "Kross IPA Pomelo",
  "Kross Hazy Lager",
  "Kross Berry",
  "Odissea Hoppy Ale",
  "Imperial Stout",
  "Coffee Twist"
].map((name, index) => ({
  id: slugify(name),
  name,
  family: name.startsWith("Kross") ? "Kross" : "Especiales",
  format_liters: 30,
  active: true,
  sort_order: index + 1,
  created_at: now,
  updated_at: now
}));

function branch(name: string, slug: string): Branch {
  return {
    id: slug,
    name,
    slug,
    access_token: `kross-${slug}-demo-token`,
    active: true,
    created_at: now,
    updated_at: now
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
