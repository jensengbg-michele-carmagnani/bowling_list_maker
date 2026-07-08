import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, registerErrorHandler } from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = createApp();
const port = Number(process.env.PORT ?? 4000);

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

registerErrorHandler(app);

app.listen(port, () => {
  console.log(`Warehouse Orders API pronta su http://localhost:${port}`);
});
