import type { Metadata } from "next";
import "../frontend/src/index.css";

export const metadata: Metadata = {
  title: "Bowling List Maker",
  description: "Gestione ordini di magazzino con struttura Next.js ispirata a bowlingverona."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
