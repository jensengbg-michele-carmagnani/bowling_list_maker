import { Copy, Download, Edit3 } from "lucide-react";
import { Button } from "../components/Button";
import { ProductIcon } from "../components/ProductIcon";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { formatDate } from "../utils/format";

export function History({ onEdit }: { onEdit: (orderId: number) => void }) {
  const { data: orders, refresh } = useAsync(api.orders.list, []);

  async function duplicate(id: number) {
    await api.orders.duplicate(id);
    refresh();
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-leaf">Archivio</p>
        <h1 className="text-2xl font-black">Storico liste</h1>
      </header>
      <div className="space-y-2">
        {(orders ?? []).map((order) => (
          <article key={order.id} className="rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{order.name}</h3>
                <p className="text-sm text-slate-500">{formatDate(order.created_at)} · {order.item_count ?? 0} prodotti</p>
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
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button variant="ghost" icon={<Download size={16} />} onClick={() => window.open(api.exportUrl(order.id, "pdf"), "_blank")}>PDF</Button>
              <Button variant="ghost" onClick={() => window.open(api.exportUrl(order.id, "xlsx"), "_blank")}>Excel</Button>
              <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(order.id)}>Apri</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
