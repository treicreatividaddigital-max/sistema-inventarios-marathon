// Reference: javascript_database integration blueprint
import { db } from "./db";
import { eq, and, or, like, sql } from "drizzle-orm";
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
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
    const [rack] = await db.select().from(racks).where(eq(racks.code, code));
    return rack || undefined;
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

  async getGarment(id: string): Promise<Garment | undefined> {
    const [garment] = await db.select().from(garments).where(eq(garments.id, id));
    return garment || undefined;
  }

  async getGarmentByCode(code: string): Promise<Garment | undefined> {
    const [garment] = await db.select().from(garments).where(eq(garments.code, code));
    return garment || undefined;
  }

  async getGarmentsByRack(rackId: string): Promise<Garment[]> {
    return await db.select().from(garments).where(eq(garments.rackId, rackId));
  }

  async createGarment(garment: InsertGarment): Promise<Garment> {
    const [created] = await db.insert(garments).values(garment).returning();
    return created;
  }

  async updateGarment(id: string, garment: Partial<InsertGarment>): Promise<Garment | undefined> {
    const [updated] = await db.update(garments).set(garment).where(eq(garments.id, id)).returning();
    return updated || undefined;
  }

  async deleteGarment(id: string): Promise<boolean> {
    const result = await db.delete(garments).where(eq(garments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Movements
  async getMovementsByGarment(garmentId: string): Promise<Movement[]> {
    return await db.select().from(movements).where(eq(movements.garmentId, garmentId)).orderBy(movements.movedAt);
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
