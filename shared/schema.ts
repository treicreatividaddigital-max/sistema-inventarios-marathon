import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  uuid, 
  timestamp, 
  pgEnum,
  integer,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CURATOR", "USER"]);
export const garmentStatusEnum = pgEnum("garment_status", [
  "IN_STOCK",
  "IN_TRANSIT",
  "SOLD",
  "RESERVED",
  "DAMAGED"
]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "UNISEX"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
});

// Garment Types table
export const garmentTypes = pgTable("garment_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
});

// Collections table
export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }),
  year: integer("year"),
  description: text("description"),
});

// Lots table (related to collections)
export const lots = pgTable("lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
});

// Racks table
export const racks = pgTable("racks", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  zone: varchar("zone", { length: 100 }),
  qrUrl: text("qr_url"),
});

// Garments table with optimized indexes
export const garments = pgTable(
  "garments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    size: varchar("size", { length: 50 }).notNull(),
    color: varchar("color", { length: 100 }).notNull(),
    gender: genderEnum("gender").notNull(),
    status: garmentStatusEnum("status").notNull().default("IN_STOCK"),
    photoUrl: text("photo_url"),
    photoUrls: jsonb("photo_urls").default([]).notNull(),
    qrUrl: text("qr_url"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    garmentTypeId: uuid("garment_type_id")
      .notNull()
      .references(() => garmentTypes.id, { onDelete: "restrict" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "restrict" }),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id, { onDelete: "restrict" }),
    rackId: uuid("rack_id").references(() => racks.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("garment_code_idx").on(table.code),
    rackIdx: index("garment_rack_idx").on(table.rackId),
    statusIdx: index("garment_status_idx").on(table.status),
    compositeIdx: index("garment_composite_idx").on(
      table.categoryId,
      table.garmentTypeId,
      table.collectionId
    ),
  })
);

// Movements table
export const movements = pgTable("movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  garmentId: uuid("garment_id")
    .notNull()
    .references(() => garments.id, { onDelete: "cascade" }),
  fromRackId: uuid("from_rack_id").references(() => racks.id, {
    onDelete: "set null",
  }),
  toRackId: uuid("to_rack_id").references(() => racks.id, {
    onDelete: "set null",
  }),
  fromStatus: garmentStatusEnum("from_status"),
  toStatus: garmentStatusEnum("to_status").notNull(),
  note: text("note"),
  movedById: uuid("moved_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  movedAt: timestamp("moved_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  garmentsCreated: many(garments),
  movements: many(movements),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  garmentTypes: many(garmentTypes),
  garments: many(garments),
}));

export const garmentTypesRelations = relations(garmentTypes, ({ one, many }) => ({
  category: one(categories, {
    fields: [garmentTypes.categoryId],
    references: [categories.id],
  }),
  garments: many(garments),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  lots: many(lots),
  garments: many(garments),
}));

export const lotsRelations = relations(lots, ({ one, many }) => ({
  collection: one(collections, {
    fields: [lots.collectionId],
    references: [collections.id],
  }),
  garments: many(garments),
}));

export const racksRelations = relations(racks, ({ many }) => ({
  garments: many(garments),
  movementsFrom: many(movements, { relationName: "fromRack" }),
  movementsTo: many(movements, { relationName: "toRack" }),
}));

export const garmentsRelations = relations(garments, ({ one, many }) => ({
  category: one(categories, {
    fields: [garments.categoryId],
    references: [categories.id],
  }),
  garmentType: one(garmentTypes, {
    fields: [garments.garmentTypeId],
    references: [garmentTypes.id],
  }),
  collection: one(collections, {
    fields: [garments.collectionId],
    references: [collections.id],
  }),
  lot: one(lots, {
    fields: [garments.lotId],
    references: [lots.id],
  }),
  rack: one(racks, {
    fields: [garments.rackId],
    references: [racks.id],
  }),
  createdBy: one(users, {
    fields: [garments.createdById],
    references: [users.id],
  }),
  movements: many(movements),
}));

export const movementsRelations = relations(movements, ({ one }) => ({
  garment: one(garments, {
    fields: [movements.garmentId],
    references: [garments.id],
  }),
  fromRack: one(racks, {
    fields: [movements.fromRackId],
    references: [racks.id],
    relationName: "fromRack",
  }),
  toRack: one(racks, {
    fields: [movements.toRackId],
    references: [racks.id],
    relationName: "toRack",
  }),
  movedBy: one(users, {
    fields: [movements.movedById],
    references: [users.id],
  }),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1),
  passwordHash: z.string().min(8),
}).omit({ id: true, createdAt: true });

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertGarmentTypeSchema = createInsertSchema(garmentTypes).omit({
  id: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
});

export const insertLotSchema = createInsertSchema(lots).omit({ id: true });

export const insertRackSchema = createInsertSchema(racks).omit({ id: true });

export const insertGarmentSchema = createInsertSchema(garments).omit({
  id: true,
  createdAt: true,
});

export const insertMovementSchema = createInsertSchema(movements).omit({
  id: true,
  movedAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type GarmentType = typeof garmentTypes.$inferSelect;
export type InsertGarmentType = z.infer<typeof insertGarmentTypeSchema>;

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;

export type Rack = typeof racks.$inferSelect;
export type InsertRack = z.infer<typeof insertRackSchema>;

export type Garment = typeof garments.$inferSelect;
export type InsertGarment = z.infer<typeof insertGarmentSchema>;

export type Movement = typeof movements.$inferSelect;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
