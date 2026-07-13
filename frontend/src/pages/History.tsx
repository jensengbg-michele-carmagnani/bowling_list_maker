import { CheckCheck, Copy, Download, Edit3, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { ProductIcon } from "../components/ProductIcon";
import { SearchBar } from "../components/SearchBar";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { formatDate } from "../utils/format";
import { filterAndSortLists, type ListSortKey } from "../../../shared/orderLists";

export function History({ onEdit }: { onEdit: (orderId: number) => void }) {
  const { data: orders, refresh } = useAsync(api.orders.list, []);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ListSortKey>("created-desc");

  async function duplicate(id: number) {
    await api.orders.duplicate(id);
    refresh();
  }

  async function markReceived(id: number) {
    await api.orders.update(id, { status: "received" });
    refresh();
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Eliminare la lista "${name}"?`)) return;
    await api.orders.remove(id);
    refresh();
  }

  function exportList(id: number, format: "pdf" | "xlsx" | "csv") {
    const url = new URL(api.exportUrl(id, format), window.location.origin).toString();
    window.open(url, "_blank");
    api.orders.update(id, { status: "sent" }).then(refresh).catch(() => {});
  }

  const visibleOrders = useMemo(
    () => filterAndSortLists(orders ?? [], search, sortBy),
    [orders, search, sortBy]
  );

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-leaf">Archivio</p>
        <h1 className="text-2xl font-black">Storico liste</h1>
      </header>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca per azienda o nome lista" />
        <select
          className="h-12 rounded-xl bg-white px-4 text-sm font-semibold shadow-sm ring-1 ring-slate-200 outline-none dark:bg-slate-900 dark:ring-slate-800"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as ListSortKey)}
        >
          <option value="created-desc">Piu recenti</option>
          <option value="created-asc">Piu vecchie</option>
          <option value="company-asc">Azienda A-Z</option>
          <option value="company-desc">Azienda Z-A</option>
          <option value="name-asc">Nome lista A-Z</option>
          <option value="name-desc">Nome lista Z-A</option>
        </select>
      </div>
      <div className="space-y-2">
        {visibleOrders.map((order) => (
          <article key={order.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {order.item_count ?? 0} prodotti
                  </span>
                </div>
                <h3 className="mt-3 truncate text-lg font-black">{order.name}</h3>
                <p className="truncate text-sm font-semibold text-leaf">Azienda: {order.company_name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Creata il {formatDate(order.created_at)} · Ultimo accesso {formatDate(order.last_accessed_at)} · Quantita totale {order.total_quantity ?? 0}
                </p>
                {!!order.preview_items?.length && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {order.preview_items.slice(0, 3).map((item) => (
                        <div key={`${order.id}-${item.product_id}`} className="rounded-xl bg-white p-0.5 ring-2 ring-white dark:bg-slate-900 dark:ring-slate-900">
                          <ProductIcon src={item.icon} name={item.name} className="h-10 w-10 rounded-xl" imgClassName="h-7 w-7" />
                        </div>
                      ))}
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {order.preview_items.slice(0, 3).map((item) => item.name).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
              <Button variant="muted" icon={<Copy size={18} />} onClick={() => duplicate(order.id)}>Duplica</Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Button variant="ghost" icon={<Download size={16} />} onClick={() => exportList(order.id, "pdf")}>PDF</Button>
              <Button variant="ghost" onClick={() => exportList(order.id, "xlsx")}>Excel</Button>
              <Button variant="ghost" onClick={() => exportList(order.id, "csv")}>CSV</Button>
              <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(order.id)}>Apri</Button>
              <Button variant="muted" icon={<CheckCheck size={16} />} onClick={() => markReceived(order.id)} disabled={order.status === "received"}>Ricevuta</Button>
              <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => remove(order.id, order.name)}>Elimina</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function statusLabel(status: "draft" | "sent" | "received") {
  if (status === "received") return "Ricevuta";
  if (status === "sent") return "Inviata";
  return "Bozza";
}

function statusTone(status: "draft" | "sent" | "received") {
  if (status === "received") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200";
  if (status === "sent") return "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
}
