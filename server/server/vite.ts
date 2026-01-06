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

  const NO_STORE = "no-store, max-age=0, must-revalidate";

  const setNoStore = (res: any, tag: string) => {
    res.setHeader("Cache-Control", NO_STORE);
    // Header de diagnóstico para confirmar en curl que este código corre
    res.setHeader("X-MSINV-Cache", tag);
  };

  const indexPath = path.resolve(distPath, "index.html");
  const swPath = path.resolve(distPath, "sw.js");
  const manifestPath = path.resolve(distPath, "manifest.json");

  // Pre-cargamos index para evitar que sendFile/serve-static reescriban Cache-Control
  const indexHtml = fs.readFileSync(indexPath, "utf-8");

  // App shell + SW: SIEMPRE no-store
  app.get("/sw.js", (_req, res) => {
    setNoStore(res, "sw-nostore");
    res.type("application/javascript").send(fs.readFileSync(swPath, "utf-8"));
  });

  app.get("/manifest.json", (_req, res) => {
    setNoStore(res, "manifest-nostore");
    res.type("application/json").send(fs.readFileSync(manifestPath, "utf-8"));
  });

  app.get("/index.html", (_req, res) => {
    setNoStore(res, "index-nostore");
    res.type("text/html").send(indexHtml);
  });

  // Hashed assets: cache largo
  const assetsPath = path.resolve(distPath, "assets");
  if (fs.existsSync(assetsPath)) {
    app.use(
      "/assets",
      express.static(assetsPath, {
        maxAge: "1y",
        immutable: true,
      }),
    );
  }

  // Otros estáticos (íconos, etc.) sin Cache-Control automático (seguro)
  app.use(
    express.static(distPath, {
      cacheControl: false,
      setHeaders: (res) => {
        res.setHeader("X-MSINV-Cache", "static-nocache");
      },
    }),
  );

  // SPA fallback: siempre index fresco
    app.use("*", (req: any, res: any) => {
      // Nunca devuelvas el index.html para rutas API: eso rompe curl/login y clientes.
      if (req.path?.startsWith("/api/")) {
        return res.status(404).json({
          statusCode: 404,
          message: "API route not found",
          timestamp: new Date().toISOString(),
        });
      }

      setNoStore(res, "spa-fallback");
      res.type("text/html").send(indexHtml);
    });
}
