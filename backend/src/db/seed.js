const prisma = require("./index");

async function main() {
  // Create a merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: "ABC Store",
      email: "abc@store.com",
      phone: "9876543210",
    },
  });

  console.log("Created merchant:", merchant);

  // Create 6 inventory items
  const items = await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Parle-G",
        sku: "PARLE-G-001",
        quantity: 100,
        price: 10.99,
        merchantId: merchant.id,
      },
      {
        name: "Paracetamol",
        sku: "PARA-001",
        quantity: 50,
        price: 5.99,
        merchantId: merchant.id,
      },
      {
        name: "Aspirin",
        sku: "ASPR-001",
        quantity: 75,
        price: 3.99,
        merchantId: merchant.id,
      },
      {
        name: "Cough Syrup",
        sku: "COUGH-001",
        quantity: 30,
        price: 15.99,
        merchantId: merchant.id,
      },
      {
        name: "Vitamin C",
        sku: "VITC-001",
        quantity: 200,
        price: 2.99,
        merchantId: merchant.id,
      },
      {
        name: "Bandages",
        sku: "BAND-001",
        quantity: 500,
        price: 0.99,
        merchantId: merchant.id,
      },
    ],
  });

  console.log(`Created ${items.count} inventory items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
