const mongoose = require('mongoose');

const translationVersionsSchema = new mongoose.Schema({
  key_id: { type: String, required: true },
  language: { type: String, required: true },
  version: { type: Number, required: true },

  text: { type: String, required: true },

  status: {
    type: String,
    enum: ['draft', 'ai_generated', 'review', 'approved', 'active', 'deprecated'],
    default: 'draft'
  },

  source: { type: String, enum: ['human', 'ai'], default: 'human' },
  model: { type: String, default: null },

  review_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  placeholders_validated: { type: Boolean, default: false },
  quality_score: { type: Number, min: 0, max: 1, default: null },

  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  approved_by: { type: String, default: null },
  approved_at: { type: Date, default: null }
}, {
  collection: 'translation_versions',
  timestamps: false
});

// Critical indexes for runtime queries
translationVersionsSchema.index({ key_id: 1, language: 1, status: 1 });
translationVersionsSchema.index({ key_id: 1, language: 1, version: -1 });

module.exports = mongoose.model('TranslationVersion', translationVersionsSchema);
