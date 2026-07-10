export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

export function orderName() {
  return `Ordine ${new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date())}`;
}
