// Reference: javascript_database integration blueprint
import { db } from "./db";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import {
  users,
  categories,
  garmentTypes,
  collections,
  lots,
  racks,
  garments,
  movements,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type GarmentType,
  type InsertGarmentType,
  type Collection,
  type InsertCollection,
  type Lot,
  type InsertLot,
  type Rack,
  type InsertRack,
  type Garment,
  type InsertGarment,
  type Movement,
  type InsertMovement,
} from "@shared/schema";

export interface IStorage {
  
  getGarments(): Promise<Garment[]>;
// Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Garment Types
  getAllGarmentTypes(): Promise<GarmentType[]>;
  getGarmentTypesByCategory(categoryId: string): Promise<GarmentType[]>;
  getGarmentType(id: string): Promise<GarmentType | undefined>;
  createGarmentType(type: InsertGarmentType): Promise<GarmentType>;
  updateGarmentType(id: string, type: Partial<InsertGarmentType>): Promise<GarmentType | undefined>;
  deleteGarmentType(id: string): Promise<boolean>;

  // Collections
  getAllCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;

  // Lots
  getAllLots(): Promise<Lot[]>;
  getLotsByCollection(collectionId: string): Promise<Lot[]>;
  getLot(id: string): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined>;
  deleteLot(id: string): Promise<boolean>;

  // Racks
  getAllRacks(): Promise<Rack[]>;
  getRack(id: string): Promise<Rack | undefined>;
  getRackByCode(code: string): Promise<Rack | undefined>;
  createRack(rack: InsertRack): Promise<Rack>;
  updateRack(id: string, rack: Partial<InsertRack>): Promise<Rack | undefined>;
  deleteRack(id: string): Promise<boolean>;

  // Garments
  searchGarments(filters: {
    q?: string;
    categoryId?: string;
    garmentTypeId?: string;
    collectionId?: string;
    lotId?: string;
    rackId?: string;
    year?: number;
    size?: string;
    color?: string;
    gender?: "MALE" | "FEMALE" | "UNISEX";
    status?: string;
  }): Promise<Garment[]>;
  getGarment(id: string): Promise<Garment | undefined>;
  getGarmentByCode(code: string): Promise<Garment | undefined>;
  getGarmentsByRack(rackId: string): Promise<Garment[]>;
  createGarment(garment: InsertGarment): Promise<Garment>;
  updateGarment(id: string, garment: Partial<InsertGarment>): Promise<Garment | undefined>;
  // Genera el siguiente código de prenda con un prefijo (ej: GAR-MAR-001)
  getNextGarmentCode(prefix?: string): Promise<string>;
  deleteGarment(id: string): Promise<boolean>;

  // Movements
  getMovementsByGarment(garmentId: string): Promise<Movement[]>;
  createMovement(movement: InsertMovement): Promise<Movement>;
  
  // Atomic garment move with transaction
  moveGarment(
    garmentId: string,
    toRackId: string | null,
    toStatus: string,
    movedById: string,
    note?: string
  ): Promise<{ garment: Garment; movement: Movement }>;
}

export class DatabaseStorage implements IStorage {
  // Escapa un string para usarlo dentro de una expresión regular de Postgres
  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }


async getAllUsers(): Promise<User[]> {
  // Never return passwordHash to callers (routes should strip too)
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

async deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}


  // Categories
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.orderIndex);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Garment Types
  async getAllGarmentTypes(): Promise<GarmentType[]> {
    return await db.select().from(garmentTypes);
  }

  async getGarmentTypesByCategory(categoryId: string): Promise<GarmentType[]> {
    return await db.select().from(garmentTypes).where(eq(garmentTypes.categoryId, categoryId));
  }

  async getGarmentType(id: string): Promise<GarmentType | undefined> {
    const [type] = await db.select().from(garmentTypes).where(eq(garmentTypes.id, id));
    return type || undefined;
  }


/**
 * Devuelve el siguiente código disponible para una prenda.
 * Ejemplo: prefijo GAR-MAR- -> GAR-MAR-001, GAR-MAR-002, ...
 *
 * Nota: Se calcula usando MAX numérico en la DB (no orden lexicográfico)
 * para evitar errores cuando se pasa de 999 a 1000, etc.
 */
async getNextGarmentCode(prefix: string = "GAR-MAR-"): Promise<string> {
  // Postgres regex: usamos ^<prefijo-escapado> para extraer el número
  const pattern = `^${this.escapeRegex(prefix)}`;

  const [row] = await db
    .select({
      max: sql<number | null>`max((regexp_replace(${garments.code}, ${pattern}, ''))::int)`,
    })
    .from(garments)
    .where(like(garments.code, `${prefix}%`));

  const max = Number(row?.max ?? 0);
  const next = max + 1;

  const width = Math.max(3, String(next).length);
  return `${prefix}${String(next).padStart(width, "0")}`;
}

  async createGarmentType(type: InsertGarmentType): Promise<GarmentType> {
    const [created] = await db.insert(garmentTypes).values(type).returning();
    return created;
  }

  async updateGarmentType(id: string, type: Partial<InsertGarmentType>): Promise<GarmentType | undefined> {
    const [updated] = await db.update(garmentTypes).set(type).where(eq(garmentTypes.id, id)).returning();
    return updated || undefined;
  }

  async deleteGarmentType(id: string): Promise<boolean> {
    const result = await db.delete(garmentTypes).where(eq(garmentTypes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Collections
  async getAllCollections(): Promise<Collection[]> {
    return await db.select().from(collections);
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection || undefined;
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [created] = await db.insert(collections).values(collection).returning();
    return created;
  }

  async updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db.update(collections).set(collection).where(eq(collections.id, id)).returning();
    return updated || undefined;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const result = await db.delete(collections).where(eq(collections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Lots
  async getAllLots(): Promise<Lot[]> {
    return await db.select().from(lots);
  }

  async getLotsByCollection(collectionId: string): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.collectionId, collectionId));
  }

  async getLot(id: string): Promise<Lot | undefined> {
    const [lot] = await db.select().from(lots).where(eq(lots.id, id));
    return lot || undefined;
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const [created] = await db.insert(lots).values(lot).returning();
    return created;
  }

  async updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined> {
    const [updated] = await db.update(lots).set(lot).where(eq(lots.id, id)).returning();
    return updated || undefined;
  }

  async deleteLot(id: string): Promise<boolean> {
    const result = await db.delete(lots).where(eq(lots.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Racks
  async getAllRacks(): Promise<Rack[]> {
    return await db.select().from(racks);
  }

  async getRack(id: string): Promise<Rack | undefined> {
    const [rack] = await db.select().from(racks).where(eq(racks.id, id));
    return rack || undefined;
  }

  async getRackByCode(code: string): Promise<Rack | undefined> {
    const normalized = (code ?? "").trim();
    if (!normalized) return undefined;
    const [row] = await db
      .select()
      .from(racks)
      .where(sql`trim(${racks.code}) = ${normalized}`)
      .limit(1);
    return row || undefined;
  }

  async createRack(rack: InsertRack): Promise<Rack> {
    const [created] = await db.insert(racks).values(rack).returning();
    return created;
  }

  async updateRack(id: string, rack: Partial<InsertRack>): Promise<Rack | undefined> {
    const [updated] = await db.update(racks).set(rack).where(eq(racks.id, id)).returning();
    return updated || undefined;
  }

  async deleteRack(id: string): Promise<boolean> {
    const result = await db.delete(racks).where(eq(racks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Garments
  async searchGarments(filters: {
    q?: string;
    code?: string;
    categoryId?: string;
    garmentTypeId?: string;
    collectionId?: string;
    lotId?: string;
    rackId?: string;
    year?: number;
    size?: string;
    color?: string;
    gender?: "MALE" | "FEMALE" | "UNISEX";
    status?: string;
  }): Promise<Garment[]> {
    let query = db.select().from(garments);

    const conditions = [];

    // Búsqueda genérica por código o color
    if (filters.q) {
      const pattern = `%${filters.q}%`;
      conditions.push(
        or(
          like(garments.code, pattern),
          like(garments.color, pattern)
        )
      );
    }

    if (filters.code) {
      conditions.push(eq(garments.code, filters.code));
    }
    if (filters.categoryId) {
      conditions.push(eq(garments.categoryId, filters.categoryId));
    }
    if (filters.garmentTypeId) {
      conditions.push(eq(garments.garmentTypeId, filters.garmentTypeId));
    }
    if (filters.collectionId) {
      conditions.push(eq(garments.collectionId, filters.collectionId));
    }
    if (filters.lotId) {
      conditions.push(eq(garments.lotId, filters.lotId));
    }
    if (filters.rackId) {
      conditions.push(eq(garments.rackId, filters.rackId));
    }
    if (filters.size) {
      conditions.push(eq(garments.size, filters.size));
    }
    if (filters.color) {
      conditions.push(like(garments.color, `%${filters.color}%`));
    }
    if (filters.gender) {
      conditions.push(eq(garments.gender, filters.gender));
    }
    if (filters.status) {
      conditions.push(eq(garments.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  }


  async getGarments(): Promise<Garment[]> {
    // Lista completa (para /api/garments)
    return await db.select().from(garments).orderBy(desc(garments.createdAt));
  }

  async getGarment(id: string): Promise<Garment | undefined> {
    const [garment] = await db.select().from(garments).where(eq(garments.id, id));
    return garment || undefined;
  }

  async getGarmentByCode(code: string): Promise<Garment | undefined> {
    const normalized = (code ?? "").trim();
    if (!normalized) return undefined;
    const [row] = await db
      .select()
      .from(garments)
      .where(sql`trim(${garments.code}) = ${normalized}`)
      .limit(1);
    return row || undefined;
  }

  async getGarmentsByRack(rackId: string): Promise<Garment[]> {
    return await db.select().from(garments).where(eq(garments.rackId, rackId));
  }

  async createGarment(garment: InsertGarment): Promise<Garment> {
  // Normaliza galería: máximo 4 fotos, siempre array de strings
  const photoUrls = Array.isArray((garment as any).photoUrls)
    ? (garment as any).photoUrls.slice(0, 4).map((x: any) => String(x))
    : [];

  const normalized: any = {
    ...garment,
    photoUrls,
    // Mantener compatibilidad: photoUrl = primera foto
    photoUrl: photoUrls[0] || (garment as any).photoUrl || null,
  };

  const [created] = await db.insert(garments).values(normalized).returning();
  return created;
}

async updateGarment(id: string, garment: Partial<InsertGarment>): Promise<Garment | undefined> {
  // Normalizamos photoUrl/photoUrls para que siempre queden consistentes.
  // Regla: photoUrl = primera foto de photoUrls, o null si no hay.
  const updateData: any = { ...garment };

  const hasPhotoUrls = Object.prototype.hasOwnProperty.call(updateData, "photoUrls");
  const hasPhotoUrl = Object.prototype.hasOwnProperty.call(updateData, "photoUrl");

  if (hasPhotoUrls) {
    const arr = Array.isArray(updateData.photoUrls)
      ? updateData.photoUrls.slice(0, 4).map((x: any) => String(x))
      : [];
    updateData.photoUrls = arr;
    updateData.photoUrl = arr[0] ?? null;
  } else if (hasPhotoUrl) {
    // Si llega solo photoUrl (legacy), lo convertimos a foto única.
    if (updateData.photoUrl) {
      updateData.photoUrls = [String(updateData.photoUrl)].slice(0, 4);
    } else {
      updateData.photoUrls = [];
      updateData.photoUrl = null;
    }
  }

  const [updated] = await db
    .update(garments)
    .set(updateData)
    .where(eq(garments.id, id))
    .returning();

  return updated || undefined;
}

  async deleteGarment(id: string): Promise<boolean> {
    const result = await db.delete(garments).where(eq(garments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Movements
  async getMovementsByGarment(garmentId: string): Promise<Movement[]> {
    return await db.select().from(movements).where(eq(movements.garmentId, garmentId)).orderBy(desc(movements.movedAt));
  }

  async createMovement(movement: InsertMovement): Promise<Movement> {
    const [created] = await db.insert(movements).values(movement).returning();
    return created;
  }

  // Atomic move operation with transaction
  async moveGarment(
    garmentId: string,
    toRackId: string | null,
    toStatus: string,
    movedById: string,
    note?: string
  ): Promise<{ garment: Garment; movement: Movement }> {
    return await db.transaction(async (tx) => {
      // Get current garment state
      const [currentGarment] = await tx.select().from(garments).where(eq(garments.id, garmentId));
      if (!currentGarment) {
        throw new Error("Garment not found");
      }

      // Update garment
      const [updatedGarment] = await tx
        .update(garments)
        .set({
          rackId: toRackId,
          status: toStatus as any,
        })
        .where(eq(garments.id, garmentId))
        .returning();

      // Create movement record
      const [movement] = await tx
        .insert(movements)
        .values({
          garmentId,
          fromRackId: currentGarment.rackId,
          toRackId,
          fromStatus: currentGarment.status,
          toStatus: toStatus as any,
          note,
          movedById,
        })
        .returning();

      return { garment: updatedGarment, movement };
    });
  }
}

export const storage = new DatabaseStorage();
