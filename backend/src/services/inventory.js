const prisma = require('../db');

function slugifySkuPart(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 18);
}

function randomSuffix(len = 4) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

async function listInventory(merchantId) {
  return await prisma.inventoryItem.findMany({ where: { merchantId } });
}

async function getInventoryItem(id) {
  return await prisma.inventoryItem.findUnique({ where: { id: Number(id) } });
}

async function getInventoryItemBySku(sku) {
  return await prisma.inventoryItem.findUnique({ where: { sku: String(sku) } });
}

async function createInventoryItem(data) {
  const base = slugifySkuPart(data?.name) || 'ITEM';
  const inputSku = data?.sku ? String(data.sku) : null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const sku = inputSku || `${base}-${randomSuffix(4)}`;

    try {
      return await prisma.inventoryItem.create({
        data: {
          ...data,
          sku,
        },
      });
    } catch (err) {
      // Prisma unique constraint violation
      if (err?.code === 'P2002') {
        // If caller supplied sku and it collided, bubble it.
        if (inputSku) throw err;
        continue;
      }
      throw err;
    }
  }

  // Last resort if collisions keep happening
  return await prisma.inventoryItem.create({
    data: {
      ...data,
      sku: inputSku || `${base}-${Date.now().toString(36).toUpperCase()}`,
    },
  });
}

async function updateInventoryItem(id, data) {
  return await prisma.inventoryItem.update({ where: { id: Number(id) }, data });
}

async function deleteInventoryItem(id) {
  return await prisma.inventoryItem.delete({ where: { id: Number(id) } });
}

module.exports = { listInventory, getInventoryItem, getInventoryItemBySku, createInventoryItem, updateInventoryItem, deleteInventoryItem };
