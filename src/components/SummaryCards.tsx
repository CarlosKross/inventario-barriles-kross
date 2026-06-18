import { Beer, Droplets, PackageCheck, Recycle } from "lucide-react";
import type { Summary } from "../types";

interface SummaryCardsProps {
  summary: Summary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: "Barriles pinchados equivalentes", value: summary.pinchadoEquivalente, icon: Beer, tone: "bg-amber-50 text-kross-amber" },
    { label: "Litros pinchados", value: `${summary.litrosPinchados} L`, icon: Droplets, tone: "bg-blue-50 text-blue-700" },
    { label: "Barriles llenos", value: summary.barrilesLlenos, icon: PackageCheck, tone: "bg-green-50 text-kross-green" },
    { label: "Litros llenos", value: `${summary.litrosLlenos} L`, icon: Droplets, tone: "bg-cyan-50 text-cyan-700" },
    { label: "Barriles vacíos", value: summary.barrilesVacios, icon: Recycle, tone: "bg-neutral-100 text-neutral-700" },
    { label: "Stock disponible barriles eq.", value: summary.stockDisponibleBarriles, icon: Beer, tone: "bg-kross-black text-white" },
    { label: "Stock disponible litros", value: `${summary.stockDisponibleLitros} L`, icon: Droplets, tone: "bg-kross-gold text-neutral-950" }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article key={label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-600">{label}</p>
              <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
            </div>
            <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon size={22} />
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
