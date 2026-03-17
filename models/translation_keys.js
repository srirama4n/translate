const mongoose = require('mongoose');

const translationStatusSchema = new mongoose.Schema({
  total_languages: { type: Number, required: true },
  completed: { type: Number, required: true },
  missing_languages: { type: [String], default: [] }
}, { _id: false });

const translationKeysSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // unique translation key
  source_language: { type: String, required: true, default: 'en' },
  source_text: { type: String, required: true },

  product: { type: String, required: true },
  domain: { type: String, required: true },
  screen: { type: String, required: true },
  component: { type: String, required: true },

  placeholders: { type: [String], default: [] },

  description: { type: String, default: '' },

  tags: { type: [String], default: [] },

  status: { type: String, enum: ['active', 'inactive', 'deprecated'], default: 'active' },

  translation_status: {
    type: translationStatusSchema,
    default: { total_languages: 0, completed: 0, missing_languages: [] }
  },

  created_by: { type: String, default: 'system' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'translation_keys',
  timestamps: false
});

// Indexes for performance
translationKeysSchema.index({ domain: 1 });
translationKeysSchema.index({ screen: 1 });
translationKeysSchema.index({ status: 1 });

module.exports = mongoose.model('TranslationKey', translationKeysSchema);
