// Reference: javascript_database integration blueprint
import { db } from "./db";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import {
  users,
  categories,
  garmentTypes,
  collections,
  customFields,
  customFieldOptions,
  years,
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
  type CustomField,
  type InsertCustomField,
  type CustomFieldOption,
  type InsertCustomFieldOption,
  type Year,
  type InsertYear,
  type Lot,
  type InsertLot,
  type Rack,
  type InsertRack,
  type Garment,
  type InsertGarment,
  type Movement,
  type InsertMovement,
} from "@shared/schema";

export type GarmentSearchFilters = {
  q?: string;
  code?: string;
  categoryId?: string;
  garmentTypeId?: string;
  collectionId?: string;
  yearId?: string;
  lotId?: string;
  rackId?: string;
  size?: string;
  color?: string;
  gender?: "MALE" | "FEMALE" | "UNISEX";
  status?: string;
};

export type GarmentSearchPagedFilters = GarmentSearchFilters & {
  limit: number;
  offset: number;
};

export type GarmentSearchPagedResult = {
  items: Garment[];
  total: number;
};

export interface IStorage {
  getGarments(): Promise<Garment[]>;

  // Users

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

  // Custom Fields
  getAllCustomFields(scope?: string): Promise<(CustomField & { options: CustomFieldOption[] })[]>;
  getCustomField(id: string): Promise<CustomField | undefined>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  updateCustomField(id: string, field: Partial<InsertCustomField>): Promise<CustomField | undefined>;
  deactivateCustomField(id: string): Promise<boolean>;
  createCustomFieldOption(option: InsertCustomFieldOption): Promise<CustomFieldOption>;

  // Years
  getAllYears(): Promise<Year[]>;
  getYear(id: string): Promise<Year | undefined>;
  createYear(year: InsertYear): Promise<Year>;

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
  searchGarments(filters: GarmentSearchFilters): Promise<Garment[]>;
  searchGarmentsPaged(filters: GarmentSearchPagedFilters): Promise<GarmentSearchPagedResult>;
  getGarment(id: string): Promise<Garment | undefined>;
  getGarmentByCode(code: string): Promise<Garment | undefined>;
  getGarmentsByRack(rackId: string): Promise<Garment[]>;
  createGarment(garment: InsertGarment): Promise<Garment>;
  updateGarment(id: string, garment: Partial<InsertGarment>): Promise<Garment | undefined>;
  getNextGarmentCode(prefix?: string): Promise<string>;
  deleteGarment(id: string): Promise<boolean>;

  // Movements
  getMovementsByGarment(garmentId: string): Promise<Movement[]>;
  createMovement(movement: InsertMovement): Promise<Movement>;
  moveGarment(
    garmentId: string,
    toRackId: string | null,
    toStatus: string,
    movedById: string,
    note?: string,
  ): Promise<{ garment: Garment; movement: Movement }>;
}

export class DatabaseStorage implements IStorage {
  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private buildGarmentSearchConditions(filters: GarmentSearchFilters) {
    const conditions = [] as any[];

    if (filters.q) {
      const pattern = `%${filters.q}%`;

      conditions.push(
        or(
          sql`${garments.code} ILIKE ${pattern}`,
          sql`${garments.color} ILIKE ${pattern}`,
          sql`${garments.description} ILIKE ${pattern}`,
          sql`${garments.customAttributes}::text ILIKE ${pattern}`,

          sql`exists (
            select 1
            from ${categories}
            where ${categories.id} = ${garments.categoryId}
              and ${categories.name} ILIKE ${pattern}
          )`,

          sql`exists (
            select 1
            from ${garmentTypes}
            where ${garmentTypes.id} = ${garments.garmentTypeId}
              and ${garmentTypes.name} ILIKE ${pattern}
          )`,

          sql`exists (
            select 1
            from ${collections}
            where ${collections.id} = ${garments.collectionId}
              and ${collections.name} ILIKE ${pattern}
          )`,

          sql`exists (
            select 1
            from ${lots}
            where ${lots.id} = ${garments.lotId}
              and (
                ${lots.name} ILIKE ${pattern}
                or ${lots.code} ILIKE ${pattern}
              )
          )`,

          sql`exists (
            select 1
            from ${racks}
            where ${racks.id} = ${garments.rackId}
              and (
                ${racks.name} ILIKE ${pattern}
                or ${racks.code} ILIKE ${pattern}
              )
          )`,
        ),
      );
    }

    if (filters.code) conditions.push(eq(garments.code, filters.code));
    if (filters.categoryId) conditions.push(eq(garments.categoryId, filters.categoryId));
    if (filters.garmentTypeId) conditions.push(eq(garments.garmentTypeId, filters.garmentTypeId));
    if (filters.collectionId) conditions.push(eq(garments.collectionId, filters.collectionId));
    if (filters.yearId) conditions.push(eq(garments.yearId, filters.yearId));
    if (filters.lotId) conditions.push(eq(garments.lotId, filters.lotId));
    if (filters.rackId) conditions.push(eq(garments.rackId, filters.rackId));
    if (filters.size) conditions.push(eq(garments.size, filters.size));
    if (filters.color) conditions.push(sql`${garments.color} ILIKE ${`%${filters.color}%`}`);
    if (filters.gender) conditions.push(eq(garments.gender, filters.gender));
    if (filters.status) conditions.push(eq(garments.status, filters.status as any));

    return conditions;
  }

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
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.orderIndex, categories.name);
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

  async getAllGarmentTypes(): Promise<GarmentType[]> {
    return await db.select().from(garmentTypes).orderBy(garmentTypes.name);
  }

  async getGarmentTypesByCategory(_categoryId: string): Promise<GarmentType[]> {
    // Types are now treated as independent labels. For backward compatibility,
    // this endpoint returns all active garment types regardless of category.
    return await db.select().from(garmentTypes).orderBy(garmentTypes.name);
  }

  async getGarmentType(id: string): Promise<GarmentType | undefined> {
    const [type] = await db.select().from(garmentTypes).where(eq(garmentTypes.id, id));
    return type || undefined;
  }

  async getNextGarmentCode(prefix: string = "GAR-MAR-"): Promise<string> {
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
    const payload: any = { ...type };
    if (payload.categoryId === "") payload.categoryId = null;
    const [created] = await db.insert(garmentTypes).values(payload).returning();
    return created;
  }

  async updateGarmentType(id: string, type: Partial<InsertGarmentType>): Promise<GarmentType | undefined> {
    const payload: any = { ...type };
    if (payload.categoryId === "") payload.categoryId = null;
    const [updated] = await db.update(garmentTypes).set(payload).where(eq(garmentTypes.id, id)).returning();
    return updated || undefined;
  }

  async deleteGarmentType(id: string): Promise<boolean> {
    const result = await db.delete(garmentTypes).where(eq(garmentTypes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllCollections(): Promise<Collection[]> {
    return await db.select().from(collections).orderBy(collections.name);
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

  async getAllCustomFields(scope = "GARMENT"): Promise<(CustomField & { options: CustomFieldOption[] })[]> {
    const fields = await db
      .select()
      .from(customFields)
      .where(and(eq(customFields.scope, scope), eq(customFields.isActive, true)))
      .orderBy(customFields.sortOrder, customFields.label);

    const options = await db
      .select()
      .from(customFieldOptions)
      .where(eq(customFieldOptions.isActive, true))
      .orderBy(customFieldOptions.sortOrder, customFieldOptions.label);

    const optionsByField = new Map<string, CustomFieldOption[]>();
    for (const option of options) {
      const arr = optionsByField.get(option.fieldId) ?? [];
      arr.push(option);
      optionsByField.set(option.fieldId, arr);
    }

    return fields.map((field) => ({ ...field, options: optionsByField.get(field.id) ?? [] }));
  }

  async getCustomField(id: string): Promise<CustomField | undefined> {
    const [field] = await db.select().from(customFields).where(eq(customFields.id, id));
    return field || undefined;
  }

  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    const [created] = await db.insert(customFields).values(field).returning();
    return created;
  }

  async updateCustomField(id: string, field: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    const [updated] = await db.update(customFields).set(field).where(eq(customFields.id, id)).returning();
    return updated || undefined;
  }

  async deactivateCustomField(id: string): Promise<boolean> {
    await db.update(customFieldOptions).set({ isActive: false }).where(eq(customFieldOptions.fieldId, id));
    const result = await db.update(customFields).set({ isActive: false }).where(eq(customFields.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createCustomFieldOption(option: InsertCustomFieldOption): Promise<CustomFieldOption> {
    const [created] = await db.insert(customFieldOptions).values(option).returning();
    return created;
  }

  async getAllYears(): Promise<Year[]> {
    return await db.select().from(years).orderBy(years.year);
  }

  async getYear(id: string): Promise<Year | undefined> {
    const [year] = await db.select().from(years).where(eq(years.id, id));
    return year || undefined;
  }

  async createYear(year: InsertYear): Promise<Year> {
    const [created] = await db.insert(years).values(year).returning();
    return created;
  }

  async getAllLots(): Promise<Lot[]> {
    return await db.select().from(lots).orderBy(lots.name);
  }

  async getLotsByCollection(collectionId: string): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.collectionId, collectionId)).orderBy(lots.name);
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

  async getAllRacks(): Promise<Rack[]> {
    return await db.select().from(racks).orderBy(racks.code);
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

  async searchGarments(filters: GarmentSearchFilters): Promise<Garment[]> {
    let query = db.select().from(garments);
    const conditions = this.buildGarmentSearchConditions(filters);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(garments.createdAt));
  }

  async searchGarmentsPaged(filters: GarmentSearchPagedFilters): Promise<GarmentSearchPagedResult> {
    const conditions = this.buildGarmentSearchConditions(filters);

    let itemsQuery = db.select().from(garments);
    let totalQuery = db.select({ count: sql<number>`count(*)` }).from(garments);

    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      itemsQuery = itemsQuery.where(whereClause) as any;
      totalQuery = totalQuery.where(whereClause) as any;
    }

    const [items, totalRows] = await Promise.all([
      itemsQuery
        .orderBy(desc(garments.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      totalQuery,
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    return {
      items,
      total,
    };
  }

  async getGarments(): Promise<Garment[]> {
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
    return await db.select().from(garments).where(eq(garments.rackId, rackId)).orderBy(desc(garments.createdAt));
  }

  async createGarment(garment: InsertGarment): Promise<Garment> {
    const photoUrls = Array.isArray((garment as any).photoUrls)
      ? (garment as any).photoUrls.slice(0, 4).map((x: any) => String(x))
      : [];

    const normalized: any = {
      ...garment,
      photoUrls,
      photoUrl: photoUrls[0] || (garment as any).photoUrl || null,
      yearId: (garment as any).yearId || null,
      description: (garment as any).description ?? null,
      customAttributes: (garment as any).customAttributes && typeof (garment as any).customAttributes === "object" ? (garment as any).customAttributes : {},
    };

    const [created] = await db.insert(garments).values(normalized).returning();
    return created;
  }

  async updateGarment(id: string, garment: Partial<InsertGarment>): Promise<Garment | undefined> {
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
      if (updateData.photoUrl) {
        updateData.photoUrls = [String(updateData.photoUrl)].slice(0, 4);
      } else {
        updateData.photoUrls = [];
        updateData.photoUrl = null;
      }
    }

    if (updateData.yearId === "") updateData.yearId = null;
    if (Object.prototype.hasOwnProperty.call(updateData, "customAttributes")) {
      updateData.customAttributes = updateData.customAttributes && typeof updateData.customAttributes === "object" ? updateData.customAttributes : {};
    }

    const [updated] = await db.update(garments).set(updateData).where(eq(garments.id, id)).returning();
    return updated || undefined;
  }

  async deleteGarment(id: string): Promise<boolean> {
    const result = await db.delete(garments).where(eq(garments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getMovementsByGarment(garmentId: string): Promise<Movement[]> {
    return await db.select().from(movements).where(eq(movements.garmentId, garmentId)).orderBy(desc(movements.movedAt));
  }

  async createMovement(movement: InsertMovement): Promise<Movement> {
    const [created] = await db.insert(movements).values(movement).returning();
    return created;
  }

  async moveGarment(
    garmentId: string,
    toRackId: string | null,
    toStatus: string,
    movedById: string,
    note?: string,
  ): Promise<{ garment: Garment; movement: Movement }> {
    return await db.transaction(async (tx) => {
      const [currentGarment] = await tx.select().from(garments).where(eq(garments.id, garmentId));
      if (!currentGarment) throw new Error("Garment not found");

      const [updatedGarment] = await tx
        .update(garments)
        .set({ rackId: toRackId, status: toStatus as any })
        .where(eq(garments.id, garmentId))
        .returning();

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
