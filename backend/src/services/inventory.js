const prisma = require('../db');

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
  return await prisma.inventoryItem.create({ data });
}

async function updateInventoryItem(id, data) {
  return await prisma.inventoryItem.update({ where: { id: Number(id) }, data });
}

async function deleteInventoryItem(id) {
  return await prisma.inventoryItem.delete({ where: { id: Number(id) } });
}

module.exports = { listInventory, getInventoryItem, getInventoryItemBySku, createInventoryItem, updateInventoryItem, deleteInventoryItem };
