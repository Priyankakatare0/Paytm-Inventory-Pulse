const prisma = require("./db");

async function testDatabase() {
  try {
    console.log("🔍 Fetching all merchants...");
    const merchants = await prisma.merchant.findMany();
    console.log("✅ Merchants:", merchants);

    console.log("\n📦 Fetching all inventory items...");
    const items = await prisma.inventoryItem.findMany();
    console.log("✅ Inventory Items:", items);

    console.log("\n💳 Creating a test transaction...");
    const transaction = await prisma.transaction.create({
      data: { 
        merchantId: merchants[0].id, 
        type: "sale", 
        amount: 500,
        description: "Test transaction"
      },
    });
    console.log("✅ Transaction created:", transaction);

    console.log("\n📋 All transactions:");
    const allTransactions = await prisma.transaction.findMany();
    console.log("✅ Transactions:", allTransactions);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
