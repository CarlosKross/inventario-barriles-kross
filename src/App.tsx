import { useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  X
} from "lucide-react";
import { ClusterTabs } from "./components/ClusterTabs";
import { ExportButton } from "./components/ExportButton";
import { InventoryForm } from "./components/InventoryForm";
import { InventoryHeader } from "./components/InventoryHeader";
import { InventoryTable } from "./components/InventoryTable";
import { SummaryCards } from "./components/SummaryCards";
import type { Branch, Cluster, DraftItem, Inventario, InventarioItem, Product } from "./types";
import {
  accessLink,
  addItem,
  branchHasInventory,
  calculateSummary,
  clearAdminSession,
  createInventory,
  deleteItem,
  exportToCSV,
  generateToken,
  isAdminAuthenticated,
  productHasInventory,
  resetInventory,
  saveAdminSession,
  slugify,
  updateItem
} from "./utils/inventory";
import { isSupabaseConfigured, signInAdmin, signOutAdmin } from "./lib/supabase";
import { INITIAL_BRANCHES, INITIAL_PRODUCTS } from "./data";
import { getBranchByAccess, getBranches, getProducts, persistBranch, persistProduct, removeBranch, removeProduct } from "./lib/catalogStore";
import { getInventories, persistInventory } from "./lib/inventoryStore";
import { exportLocalBackup, importLocalBackup } from "./lib/backup";
import { appPath, routePath } from "./lib/routing";

const defaultDraft = (cluster: Cluster): DraftItem => ({
  producto_id: "",
  cluster,
  cantidad: cluster === "pinchado" ? 1 : 0,
  medicion: cluster === "pinchado" ? 0.5 : cluster === "lleno" ? 1 : 0,
  observacion: ""
});

type AdminPage = "dashboard" | "skus" | "sucursales";
type ProductDraft = Pick<Product, "name" | "family" | "format_liters" | "active" | "sort_order">;
type BranchDraft = Pick<Branch, "name" | "slug" | "active">;

function App() {
  const [path, setPath] = useState(routePath());
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [adminAuthed, setAdminAuthed] = useState(() => isAdminAuthenticated());
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    const onPop = () => setPath(routePath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    void refreshCatalogs();
  }, []);

  async function refreshCatalogs() {
    try {
      const [nextProducts, nextBranches] = await Promise.all([getProducts(), getBranches()]);
      setProducts(nextProducts);
      setBranches(nextBranches);
      setDataError("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudo cargar datos.");
    }
  }

  function navigate(nextPath: string) {
    window.history.pushState(null, "", appPath(nextPath));
    setPath(routePath());
  }

  async function saveProductRecord(product: Product) {
    const saved = await persistProduct(product);
    setProducts((current) => {
      const next = current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
      return next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    });
  }

  async function saveBranchRecord(branch: Branch) {
    const saved = await persistBranch(branch);
    setBranches((current) => {
      const next = current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  if (path === "/admin/login") {
    return (
      <AdminLogin
        onLogin={(email) => {
          saveAdminSession(email);
          setAdminAuthed(true);
          void refreshCatalogs();
          navigate("/admin/dashboard");
        }}
      />
    );
  }

  if (path.startsWith("/admin")) {
    if (!adminAuthed) {
      window.history.replaceState(null, "", appPath("/admin/login"));
      return <AdminLogin onLogin={(email) => {
        saveAdminSession(email);
        setAdminAuthed(true);
        void refreshCatalogs();
        navigate("/admin/dashboard");
      }} />;
    }

    const page: AdminPage = path.includes("/admin/skus") ? "skus" : path.includes("/admin/sucursales") ? "sucursales" : "dashboard";
    return (
      <AdminShell
        page={page}
        navigate={navigate}
        onLogout={() => {
          void signOutAdmin();
          clearAdminSession();
          setAdminAuthed(false);
          navigate("/admin/login");
        }}
      >
        {page === "dashboard" ? <AdminDashboard products={products} branches={branches} /> : null}
        {dataError ? <ErrorText text={dataError} /> : null}
        {page === "skus" ? (
          <AdminProductsPage
            products={products}
            saveProductRecord={saveProductRecord}
            deleteProductRecord={async (id) => {
              await removeProduct(id);
              setProducts((current) => current.filter((item) => item.id !== id));
            }}
          />
        ) : null}
        {page === "sucursales" ? (
          <AdminBranchesPage
            branches={branches}
            saveBranchRecord={saveBranchRecord}
            deleteBranchRecord={async (id) => {
              await removeBranch(id);
              setBranches((current) => current.filter((item) => item.id !== id));
            }}
          />
        ) : null}
      </AdminShell>
    );
  }

  const ingresoMatch = path.match(/^\/ingreso\/([^/]+)$/);
  if (ingresoMatch) {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    return <PublicInventoryGate slug={ingresoMatch[1]} token={token} branches={branches} products={products} navigate={navigate} />;
  }

  return <InventoryExperience branches={branches} products={products} navigate={navigate} />;
}

function PublicInventoryGate({ slug, token, branches, products, navigate }: { slug: string; token: string; branches: Branch[]; products: Product[]; navigate: (path: string) => void }) {
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined);

  useEffect(() => {
    void getBranchByAccess(slug, token)
      .then(setBranch)
      .catch(() => setBranch(null));
  }, [slug, token]);

  if (branch === undefined) {
    return <main className="grid min-h-screen place-items-center bg-kross-cream p-4"><section className="rounded-lg bg-white p-6 shadow-soft">Validando acceso...</section></main>;
  }

  if (!branch) {
    return <PublicAccessError navigate={navigate} />;
  }

  return <InventoryExperience branches={branches} products={products} lockedBranch={branch} />;
}

function InventoryExperience({ branches, products, lockedBranch, navigate }: { branches: Branch[]; products: Product[]; lockedBranch?: Branch; navigate?: (path: string) => void }) {
  const [inventory, setInventory] = useState<Inventario | null>(() => (lockedBranch ? createInventory(lockedBranch) : null));
  const [selectedBranchId, setSelectedBranchId] = useState(lockedBranch?.id ?? "");
  const [responsable, setResponsable] = useState("");
  const [activeCluster, setActiveCluster] = useState<Cluster>("pinchado");
  const [draft, setDraft] = useState<DraftItem>(() => defaultDraft("pinchado"));
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const activeProducts = products.filter((product) => product.active);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  const summary = useMemo(() => calculateSummary(inventory?.items ?? []), [inventory?.items]);

  function handleSelectBranch(id: string) {
    if (lockedBranch) return;
    setSelectedBranchId(id);
    setError("");
    const branch = branches.find((item) => item.id === id && item.active);
    setInventory(branch ? createInventory(branch, responsable) : null);
  }

  function handleSubmit(item: InventarioItem) {
    if (!inventory) {
      setError("Selecciona una sucursal antes de agregar registros.");
      return;
    }
    setInventory(editingItem ? updateItem(inventory, item) : addItem(inventory, item));
    setDraft(defaultDraft(activeCluster));
    setEditingItem(null);
    setError("");
  }

  async function handleSave() {
    if (!inventory) {
      setError("Selecciona una sucursal antes de guardar.");
      return;
    }
    try {
      await persistInventory({ ...inventory, responsable });
      setSavedMessage(isSupabaseConfigured ? "Inventario guardado en Supabase." : "Inventario guardado localmente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el inventario.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,164,65,0.18),transparent_34%),linear-gradient(180deg,#f7f3e8_0%,#ece7db_100%)]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-lg bg-kross-black p-5 text-white shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-lg bg-kross-gold text-kross-black">
              <ClipboardList size={28} />
            </span>
            <div>
              <p className="text-sm font-semibold text-kross-gold">{lockedBranch ? lockedBranch.name : "Kross Bar"}</p>
              <h1 className="text-2xl font-black sm:text-3xl">Inventario Barriles Kross</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {navigate ? (
              <button className="action-button border border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/admin/login")} type="button">
                <KeyRound size={18} />
                Admin
              </button>
            ) : null}
            <ExportButton disabled={!inventory || inventory.items.length === 0} onExport={() => (inventory ? exportToCSV({ ...inventory, responsable }) : setError("Agrega registros antes de exportar."))} />
          </div>
        </header>

        <InventoryHeader
          inventory={inventory}
          sucursales={lockedBranch ? [lockedBranch] : branches}
          selectedBranchId={selectedBranchId}
          responsable={responsable}
          savedMessage={savedMessage}
          onSelectBranch={handleSelectBranch}
          onResponsableChange={(value) => {
            setResponsable(value);
            setInventory((current) => (current ? { ...current, responsable: value } : current));
          }}
          onSave={handleSave}
          onReset={() => {
            const branch = branches.find((item) => item.id === selectedBranchId);
            if (!branch) return;
            setInventory(resetInventory(branch, responsable));
            setDraft(defaultDraft(activeCluster));
            setEditingItem(null);
            setError("");
          }}
        />

        <SummaryCards summary={summary} />

        <section className="grid gap-4 lg:grid-cols-[25rem_1fr] lg:items-start">
          <div className="grid gap-4">
            <ClusterTabs
              active={activeCluster}
              onChange={(cluster) => {
                setActiveCluster(cluster);
                setDraft(defaultDraft(cluster));
                setEditingItem(null);
                setError("");
              }}
            />
            <InventoryForm
              draft={draft}
              activeCluster={activeCluster}
              productos={activeProducts}
              hasSucursal={Boolean(inventory)}
              editingItem={editingItem}
              error={error}
              onDraftChange={(nextDraft) => {
                setDraft(nextDraft);
                setError("");
              }}
              onSubmit={handleSubmit}
              onCancelEdit={() => {
                setEditingItem(null);
                setDraft(defaultDraft(activeCluster));
                setError("");
              }}
              onError={setError}
            />
          </div>

          <InventoryTable
            items={inventory?.items ?? []}
            onEdit={(item) => {
              setActiveCluster(item.cluster);
              setEditingItem(item);
              setDraft({
                producto_id: item.producto_id,
                cluster: item.cluster,
                cantidad: item.cantidad,
                medicion: item.medicion,
                observacion: item.observacion ?? ""
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={(itemId) => inventory && setInventory(deleteItem(inventory, itemId))}
          />
        </section>
      </div>
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-kross-cream px-4">
      <form
        className="grid w-full max-w-md gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError("");
          const result = await signInAdmin(email, password);
          setLoading(false);
          if (result.error) {
            setError(result.error);
            return;
          }
          onLogin(result.email);
        }}
      >
        <span className="inline-flex size-12 items-center justify-center rounded-lg bg-kross-black text-kross-gold">
          <KeyRound size={26} />
        </span>
        <div>
          <p className="text-sm font-bold uppercase text-kross-amber">Panel administrador</p>
          <h1 className="text-2xl font-black">Inventario Barriles Kross</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {isSupabaseConfigured ? "Autenticación conectada a Supabase Auth." : "Modo demo local. Configura Supabase en .env para login real."}
          </p>
        </div>
        <label className="grid gap-2">
          <span className="field-label">Email administrador</span>
          <input className="field-control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@kross.cl" />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Contraseña</span>
          <input className="field-control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button className="action-button bg-kross-black text-white" type="submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
      </form>
    </main>
  );
}

function AdminShell({ page, navigate, onLogout, children }: { page: AdminPage; navigate: (path: string) => void; onLogout: () => void; children: React.ReactNode }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { id: "skus", label: "SKU", icon: Package, path: "/admin/skus" },
    { id: "sucursales", label: "Sucursales", icon: Store, path: "/admin/sucursales" }
  ] as const;

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-[17rem_1fr]">
        <aside className="bg-kross-black p-4 text-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-lg bg-kross-gold text-kross-black">
              <ClipboardList size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-kross-gold">Admin</p>
              <h1 className="text-lg font-black">Kross Barriles</h1>
            </div>
          </div>
          <nav className="grid gap-2">
            {items.map(({ id, label, icon: Icon, path }) => (
              <button key={id} className={`action-button justify-start ${page === id ? "bg-white text-kross-black" : "bg-white/5 text-white hover:bg-white/10"}`} onClick={() => navigate(path)} type="button">
                <Icon size={18} />
                {label}
              </button>
            ))}
            <button className="action-button mt-3 justify-start border border-white/20 text-white hover:bg-white/10" onClick={onLogout} type="button">
              <LogOut size={18} />
              Salir
            </button>
          </nav>
        </aside>
        <section className="p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  );
}

function AdminDashboard({ products, branches }: { products: Product[]; branches: Branch[] }) {
  const [inventoriesCount, setInventoriesCount] = useState(0);
  const [backupMessage, setBackupMessage] = useState("");

  useEffect(() => {
    void getInventories()
      .then((items) => setInventoriesCount(items.length))
      .catch(() => setInventoriesCount(0));
  }, []);

  return (
    <div className="grid gap-5">
      <PageTitle title="Dashboard" action="Catálogo y accesos por sucursal" />
      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric label="SKU activos" value={products.filter((item) => item.active).length} />
        <AdminMetric label="SKU inactivos" value={products.filter((item) => !item.active).length} />
        <AdminMetric label="Sucursales activas" value={branches.filter((item) => item.active).length} />
        <AdminMetric label="Inventarios guardados" value={inventoriesCount} />
      </div>
      <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-soft md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <h2 className="text-lg font-black">Respaldo local gratuito</h2>
          <p className="text-sm text-neutral-600">Exporta o importa catálogos, sucursales e inventarios sin usar backend.</p>
          {backupMessage ? <p className="mt-2 text-sm font-semibold text-kross-green">{backupMessage}</p> : null}
        </div>
        <button className="action-button bg-kross-black text-white" onClick={exportLocalBackup} type="button">
          Exportar respaldo
        </button>
        <label className="action-button cursor-pointer border border-neutral-300 bg-white text-neutral-800">
          Importar respaldo
          <input
            className="hidden"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void importLocalBackup(file)
                .then(() => {
                  setBackupMessage("Respaldo importado. Recarga la página para ver los datos.");
                })
                .catch((error) => {
                  setBackupMessage(error instanceof Error ? error.message : "No se pudo importar.");
                });
            }}
          />
        </label>
      </section>
    </div>
  );
}

function AdminProductsPage({
  products,
  saveProductRecord,
  deleteProductRecord
}: {
  products: Product[];
  saveProductRecord: (product: Product) => Promise<void>;
  deleteProductRecord: (productId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const visible = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()) && (filter === "todos" || String(product.active) === filter));

  async function saveProduct(draft: ProductDraft, id?: string) {
    const now = new Date().toISOString();
    const duplicate = products.some((product) => product.active && draft.active && product.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && product.id !== id);
    if (duplicate) throw new Error("No se puede tener dos SKU activos con el mismo nombre.");
    if (!draft.name.trim()) throw new Error("Nombre obligatorio.");
    if (!draft.family.trim()) throw new Error("Familia obligatoria.");
    if (draft.format_liters <= 0) throw new Error("Formato litros debe ser mayor a 0.");

    const current = products.find((product) => product.id === id);
    await saveProductRecord(current ? { ...current, ...draft, updated_at: now } : { id: crypto.randomUUID(), ...draft, created_at: now, updated_at: now });
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className="grid gap-5">
      <PageTitle title="SKU" action="Mantención de catálogo">
        <button className="action-button bg-kross-black text-white" onClick={() => setCreating(true)} type="button"><Plus size={18} />Nuevo SKU</button>
      </PageTitle>
      <Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} />
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-soft">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-neutral-100 text-xs uppercase text-neutral-600">
            <tr><th className="px-4 py-3">Nombre SKU</th><th className="px-4 py-3">Familia</th><th className="px-4 py-3">Formato litros</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Fecha creación</th><th className="px-4 py-3 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {visible.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-bold">{product.name}</td>
                <td className="px-4 py-3">{product.family}</td>
                <td className="px-4 py-3">{product.format_liters}</td>
                <td className="px-4 py-3"><StatusBadge active={product.active} /></td>
                <td className="px-4 py-3">{product.sort_order}</td>
                <td className="px-4 py-3">{new Date(product.created_at).toLocaleDateString("es-CL")}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Editar" onClick={() => setEditing(product)}><Pencil size={17} /></IconButton>
                    <IconButton label={product.active ? "Desactivar" : "Activar"} onClick={() => void saveProductRecord({ ...product, active: !product.active, updated_at: new Date().toISOString() })}><RefreshCw size={17} /></IconButton>
                    {!productHasInventory(product.id) ? <IconButton label="Eliminar" danger onClick={() => confirm("Eliminar SKU sin histórico?") && void deleteProductRecord(product.id)}><Trash2 size={17} /></IconButton> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(creating || editing) ? <ProductFormModal product={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={saveProduct} /> : null}
    </div>
  );
}

function AdminBranchesPage({
  branches,
  saveBranchRecord,
  deleteBranchRecord
}: {
  branches: Branch[];
  saveBranchRecord: (branch: Branch) => Promise<void>;
  deleteBranchRecord: (branchId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const [inventories, setInventories] = useState<Inventario[]>([]);

  useEffect(() => {
    void getInventories()
      .then(setInventories)
      .catch(() => setInventories([]));
  }, []);

  const visible = branches.filter((branch) => branch.name.toLowerCase().includes(query.toLowerCase()) && (filter === "todos" || String(branch.active) === filter));

  async function saveBranch(draft: BranchDraft, id?: string) {
    const now = new Date().toISOString();
    const slug = slugify(draft.slug);
    if (!draft.name.trim()) throw new Error("Nombre obligatorio.");
    if (!slug) throw new Error("Slug obligatorio.");
    if (branches.some((branch) => branch.slug === slug && branch.id !== id)) throw new Error("El slug debe ser único.");

    const current = branches.find((branch) => branch.id === id);
    await saveBranchRecord(current ? { ...current, ...draft, slug, updated_at: now } : { id: crypto.randomUUID(), ...draft, slug, access_token: uniqueToken(branches), created_at: now, updated_at: now });
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className="grid gap-5">
      <PageTitle title="Sucursales" action="Links de acceso e inventario por token">
        <button className="action-button bg-kross-black text-white" onClick={() => setCreating(true)} type="button"><Plus size={18} />Nueva sucursal</button>
      </PageTitle>
      <Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} />
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-soft">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-neutral-100 text-xs uppercase text-neutral-600">
            <tr><th className="px-4 py-3">Nombre sucursal</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Link de acceso</th><th className="px-4 py-3">Última toma</th><th className="px-4 py-3">Fecha creación</th><th className="px-4 py-3 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {visible.map((branch) => {
              const lastInventory = inventories.find((inventory) => inventory.sucursal_id === branch.id);
              return (
                <tr key={branch.id}>
                  <td className="px-4 py-3 font-bold">{branch.name}</td>
                  <td className="px-4 py-3">{branch.slug}</td>
                  <td className="px-4 py-3"><StatusBadge active={branch.active} /></td>
                  <td className="px-4 py-3">
                    <div className="grid max-w-md gap-2">
                      <a className="break-all text-sm font-semibold text-kross-green underline underline-offset-2" href={accessLink(branch)} target="_blank" rel="noreferrer">
                        {accessLink(branch)}
                      </a>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100" onClick={() => navigator.clipboard?.writeText(accessLink(branch))} type="button">
                          Copiar
                        </button>
                        <a className="inline-flex items-center gap-1 rounded-md bg-kross-black px-3 py-2 text-xs font-bold text-white" href={accessLink(branch)} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} />
                          Abrir
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{lastInventory ? new Date(lastInventory.fecha).toLocaleDateString("es-CL") : "-"}</td>
                  <td className="px-4 py-3">{new Date(branch.created_at).toLocaleDateString("es-CL")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton label="Editar" onClick={() => setEditing(branch)}><Pencil size={17} /></IconButton>
                      <IconButton label={branch.active ? "Desactivar" : "Activar"} onClick={() => void saveBranchRecord({ ...branch, active: !branch.active, updated_at: new Date().toISOString() })}><RefreshCw size={17} /></IconButton>
                      <IconButton label="Regenerar token" onClick={() => confirm("El link anterior dejará de funcionar. Regenerar token?") && void saveBranchRecord({ ...branch, access_token: uniqueToken(branches), updated_at: new Date().toISOString() })}><Clipboard size={17} /></IconButton>
                      {!branchHasInventory(branch.id) ? <IconButton label="Eliminar" danger onClick={() => confirm("Eliminar sucursal sin histórico?") && void deleteBranchRecord(branch.id)}><Trash2 size={17} /></IconButton> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(creating || editing) ? <BranchFormModal branch={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={saveBranch} /> : null}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (draft: ProductDraft, id?: string) => Promise<void> }) {
  const [draft, setDraft] = useState<ProductDraft>(() => product ?? { name: "", family: "", format_liters: 30, active: true, sort_order: 0 });
  const [error, setError] = useState("");
  return <Modal title={product ? "Editar SKU" : "Nuevo SKU"} onClose={onClose} onSubmit={async () => {
    try {
      await onSave(draft, product?.id);
    } catch (modalError) {
      setError(modalError instanceof Error ? modalError.message : "No se pudo guardar.");
    }
  }}>
    <Input label="Nombre del SKU" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
    <Input label="Familia" value={draft.family} onChange={(family) => setDraft({ ...draft, family })} />
    <Input label="Formato litros" type="number" value={draft.format_liters} onChange={(value) => setDraft({ ...draft, format_liters: Number(value) })} />
    <Input label="Orden de aparición" type="number" value={draft.sort_order} onChange={(value) => setDraft({ ...draft, sort_order: Number(value) })} />
    <Toggle label="Activo" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
    {error ? <ErrorText text={error} /> : null}
  </Modal>;
}

function BranchFormModal({ branch, onClose, onSave }: { branch: Branch | null; onClose: () => void; onSave: (draft: BranchDraft, id?: string) => Promise<void> }) {
  const [draft, setDraft] = useState<BranchDraft>(() => branch ?? { name: "", slug: "", active: true });
  const [error, setError] = useState("");
  return <Modal title={branch ? "Editar sucursal" : "Nueva sucursal"} onClose={onClose} onSubmit={async () => {
    try {
      await onSave({ ...draft, slug: slugify(draft.slug || draft.name) }, branch?.id);
    } catch (modalError) {
      setError(modalError instanceof Error ? modalError.message : "No se pudo guardar.");
    }
  }}>
    <Input label="Nombre sucursal" value={draft.name} onChange={(name) => setDraft({ ...draft, name, slug: branch ? draft.slug : slugify(name) })} />
    <Input label="Slug" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug: slugify(slug) })} />
    <Toggle label="Activo" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
    {error ? <ErrorText text={error} /> : null}
  </Modal>;
}

function Modal({ title, children, onClose, onSubmit }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: () => void | Promise<void> }) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4">
      <div className="grid w-full max-w-lg gap-4 rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-neutral-100" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        <div className="grid gap-3">{children}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="action-button bg-kross-green text-white" onClick={onSubmit} type="button">Guardar</button>
          <button className="action-button border border-neutral-300" onClick={onClose} type="button">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function PageTitle({ title, action, children }: { title: string; action: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold uppercase text-kross-amber">{action}</p><h1 className="text-3xl font-black">{title}</h1></div>{children}</div>;
}

function Toolbar({ query, setQuery, filter, setFilter }: { query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void }) {
  return <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-soft sm:grid-cols-[1fr_14rem]"><input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" /><select className="field-control" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="todos">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></div>;
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-soft"><p className="text-sm font-semibold text-neutral-600">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-green-50 text-kross-green" : "bg-neutral-100 text-neutral-600"}`}>{active ? "Activo" : "Inactivo"}</span>;
}

function IconButton({ label, children, danger, onClick }: { label: string; children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return <button className={`inline-flex size-10 items-center justify-center rounded-lg border ${danger ? "border-red-200 bg-red-50 text-red-700" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"}`} type="button" title={label} aria-label={label} onClick={onClick}>{children}</button>;
}

function Input({ label, value, type = "text", onChange }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="field-label">{label}</span><input className="field-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"><input className="size-5 accent-kross-green" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="font-semibold">{label}</span></label>;
}

function ErrorText({ text }: { text: string }) {
  return <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{text}</p>;
}

function PublicAccessError({ navigate }: { navigate: (path: string) => void }) {
  return <main className="grid min-h-screen place-items-center bg-kross-cream p-4"><section className="grid max-w-md gap-4 rounded-lg bg-white p-6 text-center shadow-soft"><h1 className="text-2xl font-black">Link no válido</h1><p className="text-neutral-600">La sucursal está inactiva o el token de acceso no corresponde.</p><button className="action-button bg-kross-black text-white" onClick={() => navigate("/admin/login")} type="button">Ir a admin</button></section></main>;
}

function uniqueToken(branches: Branch[]): string {
  let token = generateToken();
  while (branches.some((branch) => branch.access_token === token)) token = generateToken();
  return token;
}

export default App;
