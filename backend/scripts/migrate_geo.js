const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  console.log('Connecting to MongoDB Atlas...');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in environment');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const issuesCol = db.collection('issues');

  // Step 1: Remove all existing indexes on geo to prevent conflict during cleanup
  try {
    const indexes = await issuesCol.indexes();
    for (const idx of indexes) {
      if (idx.key && idx.key.geo === '2dsphere') {
        console.log('Dropping existing 2dsphere index:', idx.name);
        await issuesCol.dropIndex(idx.name);
      }
    }
  } catch (err) {
    console.log('Note on dropping indexes:', err.message);
  }

  // Step 2: Unset geo on ALL documents first
  const clearRes = await issuesCol.updateMany({}, { $unset: { geo: '' } });
  console.log('Cleared legacy geo fields on:', clearRes.modifiedCount, 'documents');

  // Step 3: Populate geo ONLY for documents with valid numeric coordinates
  const cursor = issuesCol.find({
    'coordinates.lat': { $exists: true, $ne: null },
    'coordinates.lng': { $exists: true, $ne: null }
  });

  let syncedCount = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const lat = Number(doc.coordinates?.lat);
    const lng = Number(doc.coordinates?.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      await issuesCol.updateOne(
        { _id: doc._id },
        {
          $set: {
            geo: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        }
      );
      syncedCount++;
    }
  }
  console.log('Synchronized valid GeoJSON coordinates for:', syncedCount, 'documents');

  // Step 4: Recreate 2dsphere index as sparse
  try {
    console.log('Creating sparse 2dsphere index on geo...');
    await issuesCol.createIndex({ geo: '2dsphere' }, { sparse: true, background: true });
    console.log('Sparse 2dsphere index created successfully!');
  } catch (idxErr) {
    console.error('Error creating 2dsphere index:', idxErr.message);
  }

  await mongoose.disconnect();
  console.log('Migration Completed Successfully!');
}

migrate().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
