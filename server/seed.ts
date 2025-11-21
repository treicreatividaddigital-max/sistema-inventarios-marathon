import { db } from "./db";
import { users, categories, garmentTypes, collections, lots, racks, garments, movements } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Truncate all tables in reverse dependency order for idempotent seeding
    console.log("Cleaning existing data...");
    await db.delete(garments);
    await db.delete(movements);
    await db.delete(racks);
    await db.delete(lots);
    await db.delete(collections);
    await db.delete(garmentTypes);
    await db.delete(categories);
    await db.delete(users);
    console.log("✅ Database cleaned");

    // Create users
    console.log("Creating users...");
    const adminPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
    const curatorPassword = await bcrypt.hash("curator123", SALT_ROUNDS);

    const [admin, curator] = await db
      .insert(users)
      .values([
        {
          email: "admin@inventory.com",
          passwordHash: adminPassword,
          name: "Admin User",
          role: "ADMIN",
        },
        {
          email: "curator@inventory.com",
          passwordHash: curatorPassword,
          name: "Curator User",
          role: "CURATOR",
        },
      ])
      .returning();

    console.log("✅ Users created");

    // Create categories
    console.log("Creating categories...");
    const [activewear, sportswear, accessories, footwear] = await db
      .insert(categories)
      .values([
        {
          name: "Activewear",
          description: "High-performance athletic wear",
          orderIndex: 0,
        },
        {
          name: "Sportswear",
          description: "Casual sports clothing",
          orderIndex: 1,
        },
        {
          name: "Accessories",
          description: "Sports accessories and gear",
          orderIndex: 2,
        },
        {
          name: "Footwear",
          description: "Athletic and sports footwear",
          orderIndex: 3,
        },
      ])
      .returning();

    console.log("✅ Categories created");

    // Create garment types
    console.log("Creating garment types...");
    await db.insert(garmentTypes).values([
      // Activewear types
      {
        name: "T-Shirt",
        description: "Performance t-shirts",
        categoryId: activewear.id,
      },
      {
        name: "Leggings",
        description: "Athletic leggings",
        categoryId: activewear.id,
      },
      // Sportswear types
      {
        name: "Hoodie",
        description: "Casual hoodies",
        categoryId: sportswear.id,
      },
      {
        name: "Track Pants",
        description: "Comfortable track pants",
        categoryId: sportswear.id,
      },
      // Accessories types
      {
        name: "Cap",
        description: "Sports caps",
        categoryId: accessories.id,
      },
      {
        name: "Bag",
        description: "Sports bags",
        categoryId: accessories.id,
      },
      // Footwear types
      {
        name: "Running Shoes",
        description: "Performance running shoes",
        categoryId: footwear.id,
      },
      {
        name: "Training Shoes",
        description: "Cross-training shoes",
        categoryId: footwear.id,
      },
    ])
    .onConflictDoNothing();

    console.log("✅ Garment types created");

    // Create collections
    console.log("Creating collections...");
    const [spring2024, summer2024] = await db
      .insert(collections)
      .values([
        {
          name: "Spring 2024",
          type: "Seasonal",
          year: 2024,
          description: "Spring collection 2024",
        },
        {
          name: "Summer 2024",
          type: "Seasonal",
          year: 2024,
          description: "Summer collection 2024",
        },
      ])
      .onConflictDoNothing()
      .returning();

    console.log("✅ Collections created");

    // Create lots
    console.log("Creating lots...");
    await db.insert(lots).values([
      {
        code: "LOT-SP24-001",
        name: "Spring Batch Alpha",
        description: "First spring production batch",
        collectionId: spring2024.id,
      },
      {
        code: "LOT-SP24-002",
        name: "Spring Batch Beta",
        description: "Second spring production batch",
        collectionId: spring2024.id,
      },
      {
        code: "LOT-SU24-001",
        name: "Summer Batch Alpha",
        description: "First summer production batch",
        collectionId: summer2024.id,
      },
      {
        code: "LOT-SU24-002",
        name: "Summer Batch Beta",
        description: "Second summer production batch",
        collectionId: summer2024.id,
      },
    ])
    .onConflictDoNothing();

    console.log("✅ Lots created");

    // Create racks
    console.log("Creating racks...");
    const [rackA1, rackA2, rackB1, rackB2, rackC1] = await db.insert(racks).values([
      {
        code: "R-A1",
        name: "Rack A1",
        zone: "Zone A",
      },
      {
        code: "R-A2",
        name: "Rack A2",
        zone: "Zone A",
      },
      {
        code: "R-B1",
        name: "Rack B1",
        zone: "Zone B",
      },
      {
        code: "R-B2",
        name: "Rack B2",
        zone: "Zone B",
      },
      {
        code: "R-C1",
        name: "Rack C1",
        zone: "Zone C",
      },
    ])
    .onConflictDoNothing()
    .returning();

    console.log("✅ Racks created");

    // Get garment types and lots for creating sample garments
    const [tshirtType] = await db
      .select()
      .from(garmentTypes)
      .where(eq(garmentTypes.name, 'T-Shirt'));

    const [hoodieType] = await db
      .select()
      .from(garmentTypes)
      .where(eq(garmentTypes.name, 'Hoodie'));

    const [sp24Lot1] = await db
      .select()
      .from(lots)
      .where(eq(lots.code, 'LOT-SP24-001'));

    const [su24Lot1] = await db
      .select()
      .from(lots)
      .where(eq(lots.code, 'LOT-SU24-001'));

    // Create sample garments
    console.log("Creating sample garments...");
    await db.insert(garments).values([
      {
        code: "GAR-SS24-ACT-TS-M-001",
        size: "M",
        color: "Navy Blue",
        gender: "MALE",
        status: "IN_STOCK",
        categoryId: activewear.id,
        garmentTypeId: tshirtType.id,
        collectionId: spring2024.id,
        lotId: sp24Lot1.id,
        rackId: rackA1.id,
        createdById: curator.id,
      },
      {
        code: "GAR-SS24-ACT-TS-F-002",
        size: "S",
        color: "Pink",
        gender: "FEMALE",
        status: "IN_STOCK",
        categoryId: activewear.id,
        garmentTypeId: tshirtType.id,
        collectionId: spring2024.id,
        lotId: sp24Lot1.id,
        rackId: rackA1.id,
        createdById: curator.id,
      },
      {
        code: "GAR-SU24-SPT-HD-M-003",
        size: "L",
        color: "Black",
        gender: "MALE",
        status: "IN_STOCK",
        categoryId: sportswear.id,
        garmentTypeId: hoodieType.id,
        collectionId: summer2024.id,
        lotId: su24Lot1.id,
        rackId: rackB1.id,
        createdById: curator.id,
      },
      {
        code: "GAR-SU24-SPT-HD-F-004",
        size: "M",
        color: "Grey",
        gender: "FEMALE",
        status: "IN_STOCK",
        categoryId: sportswear.id,
        garmentTypeId: hoodieType.id,
        collectionId: summer2024.id,
        lotId: su24Lot1.id,
        rackId: rackB1.id,
        createdById: curator.id,
      },
    ])
    .onConflictDoNothing();

    console.log("✅ Sample garments created");

    // Create sample movement records to show garment history
    console.log("Creating sample movements...");
    const createdGarments = await db.select().from(garments);
    
    for (const garment of createdGarments) {
      // Create an initial stock entry movement for each garment
      await db.insert(movements).values({
        garmentId: garment.id,
        fromRackId: null,
        toRackId: garment.rackId,
        fromStatus: null,
        toStatus: garment.status,
        note: "Initial stock entry",
        movedById: curator.id,
        movedAt: new Date(),
      });
    }

    console.log("✅ Sample movements created");

    console.log("🎉 Database seeded successfully!");
    console.log("\nDefault credentials:");
    console.log("Admin: admin@inventory.com / admin123");
    console.log("Curator: curator@inventory.com / curator123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✨ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
