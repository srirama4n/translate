#!/usr/bin/env node
/**
 * Initialize MongoDB indexes for translation collections
 *
 * Run: node scripts/init-indexes.js
 *
 * For translation_memory vector index on Atlas:
 * Create via Atlas UI → Search → Create Index
 * path: embedding, numDimensions: 768, similarity: cosine
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function initIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/translate';
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  console.log('Creating indexes...');

  await db.collection('translation_keys').createIndexes([
    { key: { domain: 1 }, name: 'domain_1' },
    { key: { screen: 1 }, name: 'screen_1' },
    { key: { status: 1 }, name: 'status_1' },
    { key: { 'translation_status.total_languages': 1 }, name: 'translation_status_1' },
  ]);

  await db.collection('translation_versions').createIndexes([
    { key: { key_id: 1, language: 1, status: 1 }, name: 'key_language_status' },
    { key: { key_id: 1, language: 1, version: -1 }, name: 'key_language_version' },
  ]);

  await db.collection('translation_memory').createIndexes([
    { key: { 'context.domain': 1 }, name: 'context_domain_1' },
    { key: { 'context.screen': 1 }, name: 'context_screen_1' },
    { key: { source_language: 1 }, name: 'source_language_1' },
  ]);

  await db.collection('translation_audit').createIndexes([
    { key: { key_id: 1, language: 1, timestamp: -1 }, name: 'key_language_timestamp' },
  ]);

  console.log('Indexes created successfully');
  await mongoose.disconnect();
}

initIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});
