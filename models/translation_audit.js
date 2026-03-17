const mongoose = require('mongoose');

const translationAuditSchema = new mongoose.Schema({
  key_id: { type: String, required: true },
  language: { type: String, required: true },

  old_version: { type: Number, default: null },
  new_version: { type: Number, default: null },

  old_text: { type: String, default: null },
  new_text: { type: String, default: null },

  change_type: {
    type: String,
    enum: ['create', 'update', 'rollback', 'delete', 'approve', 'reject'],
    required: true
  },

  changed_by: { type: String, required: true },
  change_reason: { type: String, default: '' },

  timestamp: { type: Date, default: Date.now }
}, {
  collection: 'translation_audit',
  timestamps: false
});

// Index for audit lookups by key + language, sorted by time
translationAuditSchema.index({ key_id: 1, language: 1, timestamp: -1 });

module.exports = mongoose.model('TranslationAudit', translationAuditSchema);
