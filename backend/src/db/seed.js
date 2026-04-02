const prisma = require("./index");
const bcrypt = require("bcrypt");

const DEMO = {
  name: "ABC Store",
  email: "demo@store.com",
  phone: "9876543210",
  pin: "4321",
};

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, days) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

async function main() {
  // Idempotent: if demo merchant exists, remove its related rows and recreate.
  const existing = await prisma.merchant.findFirst({ where: { email: DEMO.email } });
  if (existing) {
    await prisma.transaction.deleteMany({ where: { merchantId: existing.id } });
    await prisma.udhaarEntry.deleteMany({ where: { merchantId: existing.id } });
    await prisma.inventoryItem.deleteMany({ where: { merchantId: existing.id } });
    await prisma.merchant.delete({ where: { id: existing.id } });
  }

  const pinHash = await bcrypt.hash(DEMO.pin, 10);
  const merchant = await prisma.merchant.create({
    data: {
      name: DEMO.name,
      email: DEMO.email,
      phone: DEMO.phone,
      pinHash,
    },
  });

  console.log("✅ Created demo merchant:", { id: merchant.id, email: merchant.email, phone: merchant.phone });

  // Inventory: include a few low-stock items (daysLeft < 3)
  const demoSkus = [
    "PARLE-G-001",
    "ATTA-005",
    "MILK-500",
    "MAGGI-001",
    "SHAMP-001",
    "BISC-010",
  ];

  // SKU is globally unique in schema, so clear any previous demo SKUs first.
  await prisma.inventoryItem.deleteMany({ where: { sku: { in: demoSkus } } });

  const items = await prisma.inventoryItem.createMany({
    data: [
      { name: "Parle-G", sku: "PARLE-G-001", quantity: 18, price: 10, dailyRate: 10, merchantId: merchant.id },
      { name: "Atta 5kg", sku: "ATTA-005", quantity: 4, price: 320, dailyRate: 3, merchantId: merchant.id },
      { name: "Milk 500ml", sku: "MILK-500", quantity: 6, price: 28, dailyRate: 4, merchantId: merchant.id },
      { name: "Maggi", sku: "MAGGI-001", quantity: 45, price: 14, dailyRate: 12, merchantId: merchant.id },
      { name: "Shampoo Sachet", sku: "SHAMP-001", quantity: 120, price: 2, dailyRate: 20, merchantId: merchant.id },
      { name: "Biscuits (Assorted)", sku: "BISC-010", quantity: 30, price: 20, dailyRate: 6, merchantId: merchant.id },
    ],
  });
  console.log(`✅ Created ${items.count} inventory items`);

  // Transactions: spread over last 7 days with payment types that match UI split
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);

  const names = ["Dinesh Patel", "Sunita Devi", "Ramesh Kumar", "Anita Bai", "Mohan Lal", "Priya Singh", "Suresh Yadav", "Kavita Sharma"]; 
  const payTypes = ["Cash", "UPI", "Card", "Udhaar"]; 
  const amounts = [120, 450, 85, 1200, 320, 560, 90, 298, 294, 557, 107, 566, 505, 571];

  const txData = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const base = addDays(weekStart, dayOffset);
    for (let j = 0; j < 3; j++) {
      const createdAt = new Date(base);
      createdAt.setHours(9 + j * 2, 15 + j * 3, 0, 0);
      const type = payTypes[(dayOffset + j) % payTypes.length];
      const amount = amounts[(dayOffset * 3 + j) % amounts.length];
      const name = names[(dayOffset * 2 + j) % names.length];
      txData.push({
        merchantId: merchant.id,
        type,
        amount,
        description: name,
        createdAt,
      });
    }
  }

  const tx = await prisma.transaction.createMany({ data: txData });
  console.log(`✅ Created ${tx.count} transactions`);

  // Udhaar entries (pending)
  const udhaar = await prisma.udhaarEntry.createMany({
    data: [
      {
        merchantId: merchant.id,
        amount: 3200,
        creditorName: "Local Customer",
        upiId: "customer@upi",
        status: "pending",
        dueDate: addDays(today, 7),
        createdAt: new Date(today.getTime() + 1000 * 60 * 10),
      },
      {
        merchantId: merchant.id,
        amount: 1500,
        creditorName: "Ramesh Kumar",
        upiId: "ramesh@upi",
        status: "pending",
        dueDate: addDays(today, 3),
        createdAt: new Date(today.getTime() + 1000 * 60 * 20),
      },
    ],
  });
  console.log(`✅ Created ${udhaar.count} udhaar entries`);

  console.log("\nDemo login:");
  console.log(`Phone: ${DEMO.phone}`);
  console.log(`PIN:   ${DEMO.pin}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
