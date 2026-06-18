import type { Branch, Product } from "../types";
import {
  loadBranches,
  loadProducts,
  saveBranches,
  saveProducts
} from "../utils/inventory";
import { isSupabaseConfigured, supabase } from "./supabase";

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return loadProducts();

  const { data, error } = await supabase.from("products").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function persistProduct(product: Product): Promise<Product> {
  if (!isSupabaseConfigured || !supabase) {
    const products = loadProducts();
    const next = products.some((item) => item.id === product.id)
      ? products.map((item) => (item.id === product.id ? product : item))
      : [product, ...products];
    saveProducts(next);
    return product;
  }

  const { data, error } = await supabase.from("products").upsert(product).select("*").single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function removeProduct(productId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    saveProducts(loadProducts().filter((item) => item.id !== productId));
    return;
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
}

export async function getBranches(): Promise<Branch[]> {
  if (!isSupabaseConfigured || !supabase) return loadBranches();

  const { data, error } = await supabase.from("branches").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Branch[];
}

export async function getBranchByAccess(slug: string, token: string): Promise<Branch | null> {
  if (!isSupabaseConfigured || !supabase) {
    return loadBranches().find((branch) => branch.slug === slug && branch.access_token === token && branch.active) ?? null;
  }

  const { data, error } = await supabase.rpc("get_branch_by_access", { p_slug: slug, p_token: token }).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Branch;
}

export async function persistBranch(branch: Branch): Promise<Branch> {
  if (!isSupabaseConfigured || !supabase) {
    const branches = loadBranches();
    const next = branches.some((item) => item.id === branch.id)
      ? branches.map((item) => (item.id === branch.id ? branch : item))
      : [branch, ...branches];
    saveBranches(next);
    return branch;
  }

  const { data, error } = await supabase.from("branches").upsert(branch).select("*").single();
  if (error) throw new Error(error.message);
  return data as Branch;
}

export async function removeBranch(branchId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    saveBranches(loadBranches().filter((item) => item.id !== branchId));
    return;
  }

  const { error } = await supabase.from("branches").delete().eq("id", branchId);
  if (error) throw new Error(error.message);
}
