import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCatalog } from "./catalog";
const app = express();
app.disable("x-powered-by");
const catalog = createCatalog({
  directory: path.resolve(process.env.DATA_DIR ?? "./data"),
  passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  secure: process.env.NODE_ENV === "production",
});
app.use("/api", catalog.router);
const here = path.dirname(fileURLToPath(import.meta.url));
const root =
  process.env.NODE_ENV === "production"
    ? path.join(here, "public")
    : path.resolve("dist/public");
app.use(express.static(root));
app.get("*", (_req, res) => res.sendFile(path.join(root, "index.html")));
const server = app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0", () =>
  console.log("School server ready")
);
process.on("SIGTERM", () =>
  server.close(() => {
    catalog.close();
    process.exit(0);
  })
);
