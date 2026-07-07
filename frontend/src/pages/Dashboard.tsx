import { Boxes, ClipboardList, PlusCircle, Settings } from "lucide-react";
import { Button } from "../components/Button";
import { api } from "../services/api";
import { formatDate } from "../utils/format";
import { useAsync } from "../hooks/useAsync";
import type { Page } from "../components/Layout";

const shortcuts = [
  { page: "order", label: "Nuovo Ordine", icon: PlusCircle },
  { page: "history", label: "Storico", icon: ClipboardList },
  { page: "products", label: "Prodotti", icon: Boxes },
  { page: "settings", label: "Impostazioni", icon: Settings }
] as const;

export function Dashboard({ setPage }: { setPage: (page: Page) => void }) {
  const { data } = useAsync(api.stats.dashboard, []);

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-leaf">Dashboard</p>
          <h1 className="text-2xl font-black">Ordini settimanali</h1>
        </div>
        <Button icon={<PlusCircle size={19} />} onClick={() => setPage("order")}>
          Nuova lista
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map((item) => (
          <button
            key={item.page}
            onClick={() => setPage(item.page)}
            className="tap-target flex min-h-28 flex-col items-start justify-between rounded-lg bg-white p-4 text-left shadow-soft ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
          >
            <item.icon className="text-leaf" size={30} />
            <span className="text-lg font-black">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Prodotti" value={String(data?.totalProducts ?? 0)} />
        <Metric label="Ultima lista" value={data?.lastOrder?.name ?? "Nessuna"} />
        <Metric label="Data ultimo ordine" value={formatDate(data?.lastOrder?.created_at)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}
