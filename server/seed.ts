import { db } from "./db";
import { users, categories, garmentTypes, collections, lots, racks } from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
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
    ]);

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
    ]);

    console.log("✅ Lots created");

    // Create racks
    console.log("Creating racks...");
    await db.insert(racks).values([
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
    ]);

    console.log("✅ Racks created");

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
