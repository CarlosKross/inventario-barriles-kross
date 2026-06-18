import { Beer, Circle, PackageCheck } from "lucide-react";
import type { Cluster } from "../types";
import { clusterLabels } from "../utils/inventory";

interface ClusterTabsProps {
  active: Cluster;
  onChange: (cluster: Cluster) => void;
}

const tabs: Array<{ id: Cluster; icon: typeof Beer }> = [
  { id: "pinchado", icon: Beer },
  { id: "lleno", icon: PackageCheck },
  { id: "vacio", icon: Circle }
];

export function ClusterTabs({ active, onChange }: ClusterTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-neutral-200 p-1">
      {tabs.map(({ id, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-bold transition sm:flex-row sm:text-sm ${
              isActive ? "bg-kross-black text-white shadow" : "text-neutral-700 hover:bg-white/70"
            }`}
            onClick={() => onChange(id)}
            type="button"
          >
            <Icon size={18} />
            <span className="leading-tight">{clusterLabels[id].replace("Barriles ", "")}</span>
          </button>
        );
      })}
    </div>
  );
}
