import express from "express";
import path from "path";
import apiApp from "./artifacts/api-server/src/app";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

// Mount the API router and middleware
app.use(apiApp);

if (!isProduction) {
  // Development mode: Mount Vite dev server middleware
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: path.resolve(import.meta.dirname, "artifacts/campus-bus"),
    server: {
      middlewareMode: true,
      host: "0.0.0.0",
      port: PORT,
    },
    appType: "spa",
  });

  app.use(vite.middlewares);
} else {
  // Production mode: Serve built static files
  const distPath = path.resolve(import.meta.dirname, "artifacts/campus-bus/dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[UniRoute] Server running on http://0.0.0.0:${PORT} (${isProduction ? "production" : "development"})`);
});
