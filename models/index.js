/**
 * Translation Models - Central Export
 *
 * Collections:
 * - translation_keys: Source text registry
 * - translation_versions: Versioned translations (runtime dataset)
 * - translation_memory: Vector similarity reuse
 * - translation_audit: Change history
 */

const TranslationKey = require('./translation_keys');
const TranslationVersion = require('./translation_versions');
const TranslationMemory = require('./translation_memory');
const TranslationAudit = require('./translation_audit');

module.exports = {
  TranslationKey,
  TranslationVersion,
  TranslationMemory,
  TranslationAudit,
};
