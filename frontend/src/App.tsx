import { useEffect, useState } from "react";
import { Layout, type Page } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { OrderBuilder } from "./pages/OrderBuilder";
import { Products } from "./pages/Products";
import { SettingsPage } from "./pages/SettingsPage";
import { StatsPage } from "./pages/StatsPage";
import { useAsync } from "./hooks/useAsync";
import { api } from "./services/api";

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const settings = useAsync(api.settings.get, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  function editOrder(orderId: number) {
    setEditOrderId(orderId);
    setPage("order");
  }

  return (
    <Layout page={page} setPage={setPage} dark={dark} setDark={setDark}>
      {page === "dashboard" && (
        <div className="space-y-6">
          <Dashboard setPage={setPage} />
          <StatsPage />
        </div>
      )}
      {page === "products" && <Products settings={settings.data} />}
      {page === "order" && <OrderBuilder settings={settings.data} editOrderId={editOrderId} clearEditOrder={() => setEditOrderId(null)} />}
      {page === "history" && <History onEdit={editOrder} />}
      {page === "settings" && <SettingsPage settings={settings.data} refresh={settings.refresh} dark={dark} setDark={setDark} />}
    </Layout>
  );
}
