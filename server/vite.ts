import { type Express } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// IMPORTANTE:
// - En producción (Cloud Run) NO debe ejecutarse setupVite.
// - Aún así, este archivo se importa; por eso NO debe haber imports estáticos a Vite ni a vite.config.
// - Usamos import() dinámico DENTRO de la función para que sólo exista en desarrollo.
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");

  const viteLogger = createLogger();

  const vite = await createViteServer({
    root: path.resolve(__dirname, ".."),
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }

  // Evita "stale SW / stale index.html" (pantalla blanca tras deploys)
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const base = path.basename(filePath);

        // Nunca cachear agresivamente el app-shell y el SW
        if (base === "sw.js" || base === "manifest.json" || base === "index.html") {
          res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
          return;
        }

        // Assets con hash de Vite: cache largo
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }
      },
    }),
  );

  // SPA fallback
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
