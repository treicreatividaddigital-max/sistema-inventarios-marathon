import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import multer from "multer";
import path from "path";
import { storage } from "./storage";

// JWT Secret and bcrypt configuration from environment
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  throw new Error("JWT_SECRET environment variable must be set for token signing");
}
const JWT_SECRET: string = JWT_SECRET_ENV;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

// File upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
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

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
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
  // Ensure uploads directory exists
  const fs = await import("fs");
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Serve static files from uploads directory
  app.use("/uploads", express.static("uploads"));

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

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // CATEGORIES ROUTES
  // =====================

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

  app.patch("/api/categories/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

  app.delete("/api/categories/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Category not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
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

  app.post("/api/garment-types", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = await storage.createGarmentType(req.body);
      res.status(201).json(type);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/garment-types/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

  app.delete("/api/garment-types/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteGarmentType(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment type not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
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

  app.post("/api/collections", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collection = await storage.createCollection(req.body);
      res.status(201).json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/collections/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

  app.delete("/api/collections/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteCollection(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Collection not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
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

  app.post("/api/lots", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lot = await storage.createLot(req.body);
      res.status(201).json(lot);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/lots/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

  app.delete("/api/lots/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteLot(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Lot not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
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

      res.json({
        ...rack,
        garments,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/racks", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, name, zone } = req.body;

      // Generate QR code for rack
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
      const rackUrl = `${baseUrl}/rack/${code}`;
      const qrUrl = await generateQRCode(rackUrl);

      const rack = await storage.createRack({
        code,
        name,
        zone,
        qrUrl,
      });

      res.status(201).json(rack);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/racks/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

  app.delete("/api/racks/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteRack(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Rack not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // GARMENTS ROUTES
  // =====================

  // GET /api/garments/search - Advanced search with multiple filters
  app.get("/api/garments/search", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        categoryId: req.query.categoryId as string,
        garmentTypeId: req.query.garmentTypeId as string,
        collectionId: req.query.collectionId as string,
        lotId: req.query.lotId as string,
        rackId: req.query.rackId as string,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        size: req.query.size as string,
        color: req.query.color as string,
        gender: req.query.gender as "MALE" | "FEMALE" | "UNISEX",
        status: req.query.status as string,
      };

      // Remove undefined values
      Object.keys(filters).forEach((key) => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const garments = await storage.searchGarments(filters);
      res.json(garments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/garments/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const garment = await storage.getGarment(req.params.id);
      if (!garment) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Get movement history
      const movements = await storage.getMovementsByGarment(req.params.id);

      res.json({
        ...garment,
        movements,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/garments",
    authMiddleware,
    upload.single("photo"),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { code, size, color, gender, status, categoryId, garmentTypeId, collectionId, lotId, rackId } = req.body;

        // Generate QR code for garment
        const baseUrl = process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";
        const garmentUrl = `${baseUrl}/garment/${code}`;
        const qrUrl = await generateQRCode(garmentUrl);

        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const garment = await storage.createGarment({
          code,
          size,
          color,
          gender,
          status: status || "IN_STOCK",
          categoryId,
          garmentTypeId,
          collectionId,
          lotId,
          rackId: rackId || null,
          photoUrl,
          qrUrl,
          createdById: req.user!.id,
        });

        res.status(201).json(garment);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/garments/:id/move - Atomic move operation with transaction
  app.patch("/api/garments/:id/move", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { toRackId, toStatus, note } = req.body;

      if (!toStatus) {
        return res.status(400).json({
          statusCode: 400,
          message: "toStatus is required",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await storage.moveGarment(req.params.id, toRackId || null, toStatus, req.user!.id, note);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/garments/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const garment = await storage.updateGarment(req.params.id, req.body);
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

  app.delete("/api/garments/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await storage.deleteGarment(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          statusCode: 404,
          message: "Garment not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // =====================
  // STATISTICS ROUTE
  // =====================

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
