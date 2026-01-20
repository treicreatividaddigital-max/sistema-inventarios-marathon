import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import multer from "multer";
import { Storage as GCSStorage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";
import { storage } from "./storage";
import { insertGarmentSchema } from "../shared/schema";


// Hydrate garments for list/search responses (avoid "missing rack/lot" false positives in UI)
async function hydrateGarmentList(garments: any[]) {
  const categoryCache = new Map<string, any | null>();
  const garmentTypeCache = new Map<string, any | null>();
  const collectionCache = new Map<string, any | null>();
  const lotCache = new Map<string, any | null>();
  const rackCache = new Map<string, any | null>();

  const getCached = async (
    cache: Map<string, any | null>,
    id: string | null | undefined,
    getter: (id: string) => Promise<any | undefined>
  ) => {
    if (!id) return null;
    if (cache.has(id)) return cache.get(id)!;
    const v = (await getter(id)) ?? null;
    cache.set(id, v);
    return v;
  };

  return await Promise.all(
    garments.map(async (g) => ({
      ...g,
      category: await getCached(categoryCache, g.categoryId, storage.getCategory.bind(storage)),
      garmentType: await getCached(garmentTypeCache, g.garmentTypeId, storage.getGarmentType.bind(storage)),
      collection: await getCached(collectionCache, g.collectionId, storage.getCollection.bind(storage)),
      lot: await getCached(lotCache, g.lotId, storage.getLot.bind(storage)),
      rack: await getCached(rackCache, g.rackId ?? null, storage.getRack.bind(storage)),
    }))
  );
}


// Hydrate movements for garment details (avoid "Added to undefined" and hide sensitive fields)
async function hydrateMovementsList(movements: any[]) {
  const rackCache = new Map<string, any | null>();
  const userCache = new Map<string, any | null>();

  const getCached = async (
    cache: Map<string, any | null>,
    id: string | null | undefined,
    getter: (id: string) => Promise<any | undefined>
  ) => {
    if (!id) return null;
    if (cache.has(id)) return cache.get(id)!;
    const v = (await getter(id)) ?? null;
    cache.set(id, v);
    return v;
  };

  const getUserSafe = async (id: string | null | undefined) => {
    const u = await getCached(userCache, id, storage.getUser.bind(storage));
    if (!u) return null;
    // IMPORTANT: never send password hashes to client
    return { id: u.id, email: u.email, role: u.role };
  };

  return await Promise.all(
    movements.map(async (m) => ({
      ...m,
      fromRack: await getCached(rackCache, m.fromRackId, storage.getRack.bind(storage)),
      toRack: await getCached(rackCache, m.toRackId, storage.getRack.bind(storage)),
      movedBy: await getUserSafe(m.movedById),
    }))
  );
}

// JWT Secret and bcrypt configuration from environment
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  throw new Error("JWT_SECRET environment variable must be set for token signing");
}
const JWT_SECRET: string = JWT_SECRET_ENV;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

// File upload configuration
const GCS_BUCKET_NAME = process.env.GCS_BUCKET;
const gcsBucket = GCS_BUCKET_NAME ? new GCSStorage().bucket(GCS_BUCKET_NAME) : null;

function extFromMime(mime: string, originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  if (ext) return ext;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return "";
}

async function uploadToGCS(file: Express.Multer.File): Promise<string> {
  if (!gcsBucket) throw new Error("GCS_BUCKET is not configured");
  const ext = extFromMime(file.mimetype, file.originalname);
  const objectName = `photo-${Date.now()}-${randomUUID()}${ext}`;
  await gcsBucket.file(objectName).save(file.buffer, {
    resumable: false,
    contentType: file.mimetype,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  return objectName;
}

const upload = multer({
  // Cloud Run: evitar DiskStorage/fs. Siempre usar memoryStorage.
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});



/**
 * Middleware de subida de fotos (hasta 4).
 * - Si el request viene como multipart/form-data, aplica multer.
 * - Acepta:
 *    - photos (hasta 4 archivos)  ✅ nuevo
 *    - photo  (1 archivo)         ✅ retro-compatibilidad
 *
 * Nota: preferimos "photos" en el frontend.
 */
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.is("multipart/form-data")) return next();

  // Soporta ambos nombres de campo: photos[] (nuevo) y photo (legacy)
  const handler = upload.fields([
    { name: "photos", maxCount: 4 },
    { name: "photos[]", maxCount: 4 },
    { name: "photo", maxCount: 1 },
  ]);

  return handler(req, res, next);
};


/**
 * Extrae los archivos subidos por multer.
 * Con upload.fields(), req.files puede venir como objeto por nombre de campo.
 */
const extractUploadedPhotos = (req: Request): Express.Multer.File[] => {
  const filesAny: any = (req as any).files;
  if (!filesAny) return [];
  if (Array.isArray(filesAny)) return filesAny;
  const photos: Express.Multer.File[] = Array.isArray(filesAny.photos) ? filesAny.photos : [];
  const photosBracket: Express.Multer.File[] = Array.isArray(filesAny["photos[]"]) ? filesAny["photos[]"] : [];
  const photo: Express.Multer.File[] = Array.isArray(filesAny.photo) ? filesAny.photo : [];
  return [...photos, ...photosBracket, ...photo];
};



// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many login attempts, please try again later.",
});

// Global exception filter type
interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// Global error handler middleware
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  const response: ErrorResponse = {
    statusCode: err.statusCode || 500,
    message: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(response.statusCode).json(response);
};

// Auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    // true si el usuario es el Curador Master (PRIMARY_CURATOR_EMAIL)
    isMasterCurator?: boolean;
  };
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        statusCode: 401,
        message: "No token provided",
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    const isMasterCurator = !!(
      user.role === "CURATOR" &&
      process.env.PRIMARY_CURATOR_EMAIL &&
      user.email === process.env.PRIMARY_CURATOR_EMAIL
    );

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isMasterCurator,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      statusCode: 401,
      message: "Invalid token",
      timestamp: new Date().toISOString(),
    });
  }
};


// =====================
// Roles & permisos
// =====================
// Reglas del negocio:
// - CURATOR (Curador): crea/edita catálogo e inventario, pero NO gestiona usuarios ni elimina garments.
// - Curador Master: es un CURATOR cuyo email coincide con PRIMARY_CURATOR_EMAIL. Puede TODO (incluye usuarios y borrar garments).
// - ADMIN y USER: solo lectura (ver inventario).
const isReadOnlyRole = (role?: string) => role === "ADMIN" || role === "USER";
const isCuratorRole = (role?: string) => role === "CURATOR";
const isMasterCurator = (req: AuthRequest) => !!req.user?.isMasterCurator;

const requireCurator = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.sendStatus(401), false;
  if (!isCuratorRole(req.user.role)) return res.sendStatus(403), false;
  return true;
};

const requireMaster = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.sendStatus(401), false;
  if (!isMasterCurator(req)) return res.sendStatus(403), false;
  return true;
};


// QR code generation utility
const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataUrl;
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
};

export async function registerRoutes(app: Express): Promise<Server> {

// Debug/version endpoint (helps validate deployments quickly)
app.get("/api/version", (_req, res) => {
  res.json({
    name: process.env.npm_package_name ?? "ms-inv",
    env: process.env.NODE_ENV ?? "unknown",
    commit: process.env.GIT_SHA ?? process.env.K_REVISION ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

  // Uploads:
// - Local dev: store files in ./uploads and serve at /uploads
// - Cloud Run: store files in Google Cloud Storage (GCS_BUCKET) and serve via /api/photos/:name
if (!gcsBucket) {
  const fs = await import("fs");
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }
  app.use("/uploads", express.static("uploads"));
} else {
  app.get("/api/photos/:name", async (req, res, next) => {
    try {
      const name = req.params.name;
      const file = gcsBucket.file(name);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).send("Not found");

      const [meta] = await file.getMetadata();
      if (meta.contentType) res.setHeader("Content-Type", meta.contentType);
      if (meta.cacheControl) res.setHeader("Cache-Control", meta.cacheControl);

      file.createReadStream()
        .on("error", next)
        .pipe(res);
    } catch (err) {
      next(err);
    }
  });
}

  // CORS configuration
  app.use((req, res, next) => {
    const allowedOrigins = [
      "http://localhost:5000",
      "http://localhost:5173",
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "",
    ].filter(Boolean);

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });

  // =====================
  // AUTH ROUTES
  // =====================

  // POST /api/auth/register
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          statusCode: 400,
          message: "Email, password, and name are required",
          timestamp: new Date().toISOString(),
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          statusCode: 409,
          message: "User already exists",
          timestamp: new Date().toISOString(),
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        role: role || "USER",
      });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          statusCode: 400,
          message: "Email and password are required",
          timestamp: new Date().toISOString(),
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          statusCode: 401,
          message: "Invalid credentials",
          timestamp: new Date().toISOString(),
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          statusCode: 401,
          message: "Invalid credentials",
          timestamp: new Date().toISOString(),
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({
          statusCode: 404,
          message: "User not found",
          timestamp: new Date().toISOString(),
        });
      }

      const primaryEmail = (process.env.PRIMARY_CURATOR_EMAIL || "").toLowerCase();
      const isMasterCurator = user.role === "CURATOR" && !!primaryEmail && user.email.toLowerCase() === primaryEmail;

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isMasterCurator,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/users - Create new user (CURATOR only)
  
// List users (admin only)

// USERS

app.get("/api/users", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Solo curadores pueden ver usuarios
    if (!requireCurator(req, res)) return;

    const users = await storage.getAllUsers();

    // Nunca devolver passwordHash al frontend
    res.json(
      users.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Solo Curador Master puede crear usuarios
    if (!requireMaster(req, res)) return;

    const { email, password, name, role } = req.body as any;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email, password, name, and role are required",
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        statusCode: 400,
        message: "Password must be at least 6 characters",
        timestamp: new Date().toISOString(),
      });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        statusCode: 400,
        message: "User with this email already exists",
        timestamp: new Date().toISOString(),
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await storage.createUser({
      email,
      name,
      role,
      passwordHash: hashedPassword,
    } as any);

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Solo Curador Master puede eliminar usuarios
    if (!requireMaster(req, res)) return;

    const deleted = await storage.deleteUser(req.params.id);
    if (!deleted) return res.sendStatus(404);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/categories", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({
          statusCode: 404,
          message: "Category not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(category);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/categories", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/categories/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({
          statusCode: 404,
          message: "Category not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(category);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/categories/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if category has garments
      const garmentsWithCategory = await storage.searchGarments({ categoryId: req.params.id });
      if (garmentsWithCategory.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: `Cannot delete category: ${garmentsWithCategory.length} garment(s) are using this category`,
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Category not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // GARMENT TYPES ROUTES
  // =====================

  app.get("/api/garment-types", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await storage.getAllGarmentTypes();
      res.json(types);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/garment-types/by-category/:categoryId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await storage.getGarmentTypesByCategory(req.params.categoryId);
      res.json(types);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/garment-types/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = await storage.getGarmentType(req.params.id);
      if (!type) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment type not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(type);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/garment-types", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const type = await storage.createGarmentType(req.body);
      res.status(201).json(type);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/garment-types/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const type = await storage.updateGarmentType(req.params.id, req.body);
      if (!type) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment type not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(type);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/garment-types/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if type has garments
      const garmentsWithType = await storage.searchGarments({ garmentTypeId: req.params.id });
      if (garmentsWithType.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: `Cannot delete garment type: ${garmentsWithType.length} garment(s) are using this type`,
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await storage.deleteGarmentType(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment type not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // COLLECTIONS ROUTES
  // =====================

  app.get("/api/collections", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collections = await storage.getAllCollections();
      res.json(collections);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/collections/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collection = await storage.getCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({
          statusCode: 404,
          message: "Collection not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/collections", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const collection = await storage.createCollection(req.body);
      res.status(201).json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/collections/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const collection = await storage.updateCollection(req.params.id, req.body);
      if (!collection) {
        return res.status(404).json({
          statusCode: 404,
          message: "Collection not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/collections/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if collection has garments
      const garmentsWithCollection = await storage.searchGarments({ collectionId: req.params.id });
      if (garmentsWithCollection.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: `Cannot delete collection: ${garmentsWithCollection.length} garment(s) are using this collection`,
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await storage.deleteCollection(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Collection not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // LOTS ROUTES
  // =====================

  app.get("/api/lots", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lots = await storage.getAllLots();
      res.json(lots);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/lots/by-collection/:collectionId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lots = await storage.getLotsByCollection(req.params.collectionId);
      res.json(lots);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/lots/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({
          statusCode: 404,
          message: "Lot not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(lot);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lots", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lot = await storage.createLot(req.body);
      res.status(201).json(lot);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/lots/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lot = await storage.updateLot(req.params.id, req.body);
      if (!lot) {
        return res.status(404).json({
          statusCode: 404,
          message: "Lot not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(lot);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/lots/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if lot has garments
      const garmentsWithLot = await storage.searchGarments({ lotId: req.params.id });
      if (garmentsWithLot.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: `Cannot delete lot: ${garmentsWithLot.length} garment(s) are using this lot`,
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await storage.deleteLot(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Lot not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // RACKS ROUTES
  // =====================

  app.get("/api/racks", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const racks = await storage.getAllRacks();
      res.json(racks);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/racks/by-code/:code", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rack = await storage.getRackByCode(req.params.code);
      if (!rack) {
        return res.status(404).json({
          statusCode: 404,
          message: "Rack not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Get garments in this rack
      const garments = await storage.getGarmentsByRack(rack.id);
      const hydratedGarments = await hydrateGarmentList(garments);

      res.json({
        ...rack,
        garments: hydratedGarments,
      });
    } catch (error) {
      next(error);
    }
  });

  
  app.get("/api/racks/by-code/:code/qr", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rack = await storage.getRackByCode(req.params.code);
      if (!rack) {
        return res.status(404).json({ statusCode: 404, message: "Rack not found", timestamp: new Date().toISOString() });
      }

      const proto = req.get("x-forwarded-proto") || req.protocol;
      const baseUrl = `${proto}://${req.get("host")}`;
      const rackUrl = `${baseUrl}/rack/${encodeURIComponent(rack.code)}`;
      const qrUrl = await generateQRCode(rackUrl);

      // Persist refreshed QR so UI shows the correct one
      if (rack.qrUrl !== qrUrl) {
        await storage.updateRack(rack.id, { qrUrl });
      }

      res.json({ rackId: rack.id, code: rack.code, rackUrl, qrUrl });
    } catch (error) {
      next(error);
    }
  });

app.get("/api/racks/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rack = await storage.getRack(req.params.id);
      if (!rack) {
        return res.status(404).json({
          statusCode: 404,
          message: "Rack not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Get garments in this rack
      const garments = await storage.getGarmentsByRack(req.params.id);
      const hydratedGarments = await hydrateGarmentList(garments);

      res.json({
        ...rack,
        garments: hydratedGarments,
      });
    } catch (error) {
      next(error);
    }
  });

  
  app.post("/api/racks/:id/move-garments", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "CURATOR")) {
        return res.status(403).json({ statusCode: 403, message: "Forbidden", timestamp: new Date().toISOString() });
      }

      const fromRackId = req.params.id;
      const { toRackId, garmentIds, note } = req.body ?? {};

      if (!toRackId) {
        return res.status(400).json({ statusCode: 400, message: "toRackId is required", timestamp: new Date().toISOString() });
      }
      if (toRackId === fromRackId) {
        return res.status(400).json({ statusCode: 400, message: "Destination rack must be different", timestamp: new Date().toISOString() });
      }

      const [fromRack, toRack] = await Promise.all([
        storage.getRack(fromRackId),
        storage.getRack(toRackId),
      ]);

      if (!fromRack) {
        return res.status(404).json({ statusCode: 404, message: "Source rack not found", timestamp: new Date().toISOString() });
      }
      if (!toRack) {
        return res.status(404).json({ statusCode: 404, message: "Destination rack not found", timestamp: new Date().toISOString() });
      }

      let garments = await storage.getGarmentsByRack(fromRackId);

      if (Array.isArray(garmentIds) && garmentIds.length > 0) {
        const setIds = new Set(garmentIds);
        garments = garments.filter((g) => setIds.has(g.id));
      }

      const moved = [];
      for (const g of garments) {
        const result = await storage.moveGarment(
          g.id,
          toRackId,
          g.status, // keep same status
          req.user.id,
          note || `Moved from rack ${fromRack.code} to ${toRack.code}`
        );
        moved.push(result.garment.id);
      }

      res.json({
        fromRackId,
        toRackId,
        movedCount: moved.length,
        garmentIds: moved,
      });
    } catch (error) {
      next(error);
    }
  });

app.post("/api/racks", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, name, zone } = req.body;

      const codeNormalized = String(code ?? "").trim();
      if (!codeNormalized) {
        return res.status(400).json({ statusCode: 400, message: "code is required", timestamp: new Date().toISOString() });
      }

      // Generate QR code for rack (use real host in Cloud Run)
      const proto = req.get("x-forwarded-proto") || req.protocol;
      const baseUrl = `${proto}://${req.get("host")}`;
      const rackUrl = `${baseUrl}/rack/${encodeURIComponent(codeNormalized)}`;
      const qrUrl = await generateQRCode(rackUrl);
const rack = await storage.createRack({
        code: codeNormalized,
        name,
        zone,
        qrUrl,
      });

      res.status(201).json(rack);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/racks/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rack = await storage.updateRack(req.params.id, req.body);
      if (!rack) {
        return res.status(404).json({
          statusCode: 404,
          message: "Rack not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json(rack);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/racks/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if rack has garments
      const garmentsWithRack = await storage.searchGarments({ rackId: req.params.id });
      if (garmentsWithRack.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: `Cannot delete rack: ${garmentsWithRack.length} garment(s) are currently in this rack`,
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await storage.deleteRack(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Rack not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // =====================

// GARMENTS

// Devuelve el siguiente código sugerido para acelerar la creación (ej: GAR-MAR-001)
app.get("/api/garments/next-code", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!requireCurator(req, res)) return;
    const prefix = typeof req.query.prefix === "string" && req.query.prefix.trim() ? req.query.prefix.trim() : "GAR-MAR-";
    const code = await storage.getNextGarmentCode(prefix);
    res.json({ code });
  } catch (error) {
    next(error);
  }
});

app.get("/api/garments", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const garments = await storage.getGarments();
    res.json(garments);
  } catch (error) {
    next(error);
  }
});

app.get("/api/garments/search", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, status, categoryId, garmentTypeId, collectionId, lotId, rackId } = req.query as any;
    const garments = await storage.searchGarments({
      q: typeof query === "string" ? query : undefined,
      status: typeof status === "string" ? status : undefined,
      categoryId: typeof categoryId === "string" ? categoryId : undefined,
      garmentTypeId: typeof garmentTypeId === "string" ? garmentTypeId : undefined,
      collectionId: typeof collectionId === "string" ? collectionId : undefined,
      lotId: typeof lotId === "string" ? lotId : undefined,
      rackId: typeof rackId === "string" ? rackId : undefined,
    });
    res.json(garments);
  } catch (error) {
    next(error);
  }
});

app.get("/api/garments/by-code/:code", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const garment = await storage.getGarmentByCode(req.params.code);
    if (!garment) return res.sendStatus(404);
    res.json(garment);
  } catch (error) {
    next(error);
  }
});

app.get("/api/garments/by-code/:code/qr", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const garment = await storage.getGarmentByCode(req.params.code);
    if (!garment) return res.sendStatus(404);

    // Generar (o re-generar) QR on-demand
    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.get("host")}`;
    const garmentUrl = `${baseUrl}/garment/${encodeURIComponent(garment.code)}`;
    const qrDataUrl = await generateQRCode(garmentUrl);
    res.json({ qrDataUrl, garmentUrl });
  } catch (error) {
    next(error);
  }
});

app.get("/api/garments/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const garment = await storage.getGarment(req.params.id);
    if (!garment) return res.sendStatus(404);
    res.json(garment);
  } catch (error) {
    next(error);
  }
});

// Crear prenda + subir hasta 4 fotos (field "photos")
app.post(
  "/api/garments",
  authMiddleware,
  uploadMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!requireCurator(req, res)) return;

      const { code: bodyCode, size, color, gender, status, categoryId, garmentTypeId, collectionId, lotId, rackId } =
        req.body as any;

      // photoUrls puede llegar como JSON (string) o array
      const rawBodyPhotoUrls: any = (req.body as any).photoUrls;
      let photoUrls: string[] = [];
      if (typeof rawBodyPhotoUrls === "string") {
        try { photoUrls = JSON.parse(rawBodyPhotoUrls) || []; } catch { photoUrls = []; }
      } else if (Array.isArray(rawBodyPhotoUrls)) {
        photoUrls = rawBodyPhotoUrls;
      }

      // Auto-código si no llega uno
      const code =
        typeof bodyCode === "string" && bodyCode.trim() ? bodyCode.trim() : await storage.getNextGarmentCode("GAR-MAR-");

      const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.get("host")}`;
      const garmentUrl = `${baseUrl}/garment/${encodeURIComponent(code)}`;
      const qrUrl = await generateQRCode(garmentUrl);

      // Archivos subidos en multipart
      const files = extractUploadedPhotos(req);
      if (files.length) {
        for (const f of files.slice(0, 4)) {
          if (gcsBucket) {
            const objectName = await uploadToGCS(f);
            photoUrls.push(`/api/photos/${encodeURIComponent(objectName)}`);
          } else {
            photoUrls.push(`/uploads/${(f as any).filename}`);
          }
        }
      }

      photoUrls = photoUrls.filter(Boolean).slice(0, 4);
      const photoUrl = photoUrls[0] || null;

      // createdById: viene del token (no confiamos en req.body)
      const createdById = req.user!.id;

      const parsed = insertGarmentSchema.parse({
        code: code,
        size,
        color,
        gender,
        status,
        categoryId: categoryId,
        garmentTypeId: garmentTypeId,
        collectionId: collectionId,
        lotId: lotId,
        rackId: rackId || null,
        photoUrl,
        photoUrls,
        qrUrl,
        createdById,
      });

      const garment = await storage.createGarment(parsed);
      res.status(201).json(garment);
    } catch (error) {
      next(error);
    }
  },
);

// Editar prenda + (opcional) subir nuevas fotos y/o reordenar/eliminar (enviando photoUrls "kept")
app.patch(
  "/api/garments/:id",
  authMiddleware,
  uploadMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!requireCurator(req, res)) return;

      const current = await storage.getGarment(req.params.id);
      if (!current) return res.sendStatus(404);

      const updateData: any = { ...req.body };

      // photoUrls puede venir como JSON (string) con las URLs que el usuario "mantiene"
      const rawKept: any = updateData.photoUrls;
      let kept: string[] | undefined = undefined;
      if (typeof rawKept === "string") {
        try { kept = JSON.parse(rawKept); } catch { kept = undefined; }
      } else if (Array.isArray(rawKept)) {
        kept = rawKept;
      }

      let finalPhotoUrls: string[] = kept ?? (Array.isArray((current as any).photoUrls) ? (current as any).photoUrls : []);
      const files = extractUploadedPhotos(req);

      if (files.length) {
        for (const f of files.slice(0, 4)) {
          if (gcsBucket) {
            const objectName = await uploadToGCS(f);
            finalPhotoUrls.push(`/api/photos/${encodeURIComponent(objectName)}`);
          } else {
            finalPhotoUrls.push(`/uploads/${(f as any).filename}`);
          }
        }
      }

      finalPhotoUrls = finalPhotoUrls.filter(Boolean).slice(0, 4);

      updateData.photoUrls = finalPhotoUrls;
      updateData.photoUrl = finalPhotoUrls[0] || null;

      // Campos que NO deberían actualizarse desde el cliente
      delete updateData.createdById;
      delete updateData.createdAt;
      delete updateData.qrUrl; // solo se cambia si cambia el code (no soportado aquí)
      delete updateData.code;  // code se controla en creación (y QR ligado al code)

      // Normaliza IDs opcionales
      for (const k of ["rackId"]) {
        if (updateData[k] === "") updateData[k] = null;
      }

      const garment = await storage.updateGarment(req.params.id, updateData);
      if (!garment) return res.sendStatus(404);
      res.json(garment);
    } catch (error) {
      next(error);
    }
  },
);

app.patch("/api/garments/:id/move", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!requireCurator(req, res)) return;

    const { rackId, status } = req.body as any;
    const garment = await storage.updateGarment(req.params.id, {
      rackId: rackId || null,
      status,
    });

    if (!garment) {
      return res.status(404).json({
        statusCode: 404,
        message: "Garment not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json(garment);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/garments/:id", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Solo Curador Master puede eliminar garments
    if (!requireMaster(req, res)) return;

    const garment = await storage.deleteGarment(req.params.id);
    if (!garment) return res.sendStatus(404);
    res.json(garment);
  } catch (error) {
    next(error);
  }
});
  app.get("/api/stats", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get all garments to calculate stats
      const allGarments = await storage.searchGarments({});
      const categories = await storage.getAllCategories();
      const collections = await storage.getAllCollections();
      const racks = await storage.getAllRacks();

      // Calculate garments by status
      const garmentsByStatus: Record<string, number> = {};
      allGarments.forEach((garment) => {
        garmentsByStatus[garment.status] = (garmentsByStatus[garment.status] || 0) + 1;
      });

      res.json({
        totalGarments: allGarments.length,
        totalCategories: categories.length,
        totalCollections: collections.length,
        totalRacks: racks.length,
        garmentsByStatus,
      });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // QR GENERATION ROUTE
  // =====================

  app.post("/api/qr/generate", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({
          statusCode: 400,
          message: "Data is required",
          timestamp: new Date().toISOString(),
        });
      }

      const qrCode = await generateQRCode(data);
      res.json({ qrCode });
    } catch (error) {
      next(error);
    }
  });

  // Apply global error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}