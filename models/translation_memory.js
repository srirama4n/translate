const mongoose = require('mongoose');

const contextSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  screen: { type: String, required: true },
  component: { type: String, default: '' }
}, { _id: false });

const usageStatsSchema = new mongoose.Schema({
  reuse_count: { type: Number, default: 0 },
  last_used_at: { type: Date, default: null }
}, { _id: false });

const translationMemorySchema = new mongoose.Schema({
  source_text: { type: String, required: true },
  source_language: { type: String, required: true, default: 'en' },

  context: { type: contextSchema, required: true },

  placeholders: { type: [String], default: [] },

  translations: {
    type: Map,
    of: String,
    default: {}
  },

  embedding: {
    type: [Number],
    default: null
    // For MongoDB Atlas Vector Search: create index via Atlas UI or API
    // path: embedding, numDimensions: 768, similarity: cosine
  },

  usage_stats: {
    type: usageStatsSchema,
    default: { reuse_count: 0, last_used_at: null }
  },

  quality_score: { type: Number, min: 0, max: 1, default: null },

  created_by: { type: String, default: 'system' },
  created_at: { type: Date, default: Date.now }
}, {
  collection: 'translation_memory',
  timestamps: false
});

// Indexes for domain/screen lookups
translationMemorySchema.index({ 'context.domain': 1 });
translationMemorySchema.index({ 'context.screen': 1 });

module.exports = mongoose.model('TranslationMemory', translationMemorySchema);
