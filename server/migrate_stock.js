/**
 * One-time migration: Remove batch-aware stock tracking
 * 
 * What this does:
 * 1. Drops ALL existing unique indexes on the stocks collection
 * 2. Merges duplicate stock records (same product+location, different batches) — summing quantities
 * 3. Creates the new simple unique index: { productId, locationId, locationType }
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rithanya-cms';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);

  const coll = mongoose.connection.collection('stocks');

  // 1. Drop all non-default indexes
  const existingIndexes = await coll.indexes();
  console.log('\n📋 Existing indexes:');
  for (const idx of existingIndexes) {
    if (idx.name !== '_id_') {
      console.log('  Dropping:', idx.name);
      try {
        await coll.dropIndex(idx.name);
        console.log('  ✅ Dropped:', idx.name);
      } catch (e) {
        console.log('  ⚠️  Could not drop:', idx.name, '-', e.message);
      }
    }
  }

  // 2. Find and merge duplicate records (same productId + locationId + locationType)
  console.log('\n🔄 Merging duplicate stock records...');
  const pipeline = [
    {
      $group: {
        _id: { productId: '$productId', locationId: '$locationId', locationType: '$locationType' },
        count: { $sum: 1 },
        docs: { $push: '$_id' },
        // Accumulate values
        totalQty: { $sum: '$quantity' },
        totalTransferQty: { $sum: '$transferQty' },
        totalSoldQty: { $sum: '$soldQty' },
        totalDamagedQty: { $sum: '$damagedQuantity' },
        firstCostPrice: { $first: '$costPrice' },
        firstPrice: { $first: '$price' },
        firstCategoryId: { $first: '$categoryId' },
        firstSourceLocationId: { $first: '$sourceLocationId' },
        firstSourceLocationType: { $first: '$sourceLocationType' },
        firstDailyStockId: { $first: '$dailyStockId' }, // Keep for reference
        firstStatus: { $first: '$status' },
      }
    },
    { $match: { count: { $gt: 1 } } }
  ];

  const duplicates = await coll.aggregate(pipeline).toArray();
  console.log(`  Found ${duplicates.length} groups with duplicates.`);

  for (const dup of duplicates) {
    const keepId = dup.docs[0]; // Keep the first record
    const removeIds = dup.docs.slice(1); // Remove rest

    // Update the keeper with summed values
    await coll.updateOne(
      { _id: keepId },
      {
        $set: {
          quantity: dup.totalQty,
          transferQty: dup.totalTransferQty,
          soldQty: dup.totalSoldQty,
          damagedQuantity: dup.totalDamagedQty,
          costPrice: dup.firstCostPrice,
          price: dup.firstPrice,
          categoryId: dup.firstCategoryId,
          sourceLocationId: dup.firstSourceLocationId,
          sourceLocationType: dup.firstSourceLocationType,
          dailyStockId: dup.firstDailyStockId,
          status: dup.firstStatus || 'onstock',
        }
      }
    );

    // Delete the duplicates
    await coll.deleteMany({ _id: { $in: removeIds } });
    console.log(`  ✅ Merged ${dup.docs.length} records for product ${dup._id.productId} at location ${dup._id.locationId}`);
  }

  // 3. Create the new simple unique index
  console.log('\n📌 Creating new unique index: { productId, locationId, locationType }...');
  await coll.createIndex(
    { productId: 1, locationId: 1, locationType: 1 },
    { unique: true, name: 'stock_product_location_unique' }
  );
  console.log('  ✅ New index created.');

  // Print final state
  const finalIndexes = await coll.indexes();
  console.log('\n📋 Final indexes on stocks collection:');
  finalIndexes.forEach(i => console.log(' -', i.name));

  const totalRecords = await coll.countDocuments();
  console.log(`\n✅ Migration complete. Total stock records: ${totalRecords}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
