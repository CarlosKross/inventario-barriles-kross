import { Download } from "lucide-react";

interface ExportButtonProps {
  disabled: boolean;
  onExport: () => void;
}

export function ExportButton({ disabled, onExport }: ExportButtonProps) {
  return (
    <button className="action-button w-full bg-kross-amber text-white hover:bg-[#9d5d25] sm:w-auto" onClick={onExport} disabled={disabled} type="button">
      <Download size={18} />
      Exportar CSV
    </button>
  );
}
