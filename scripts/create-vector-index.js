#!/usr/bin/env node
/**
 * Create MongoDB Atlas Vector Search index for translation_memory
 *
 * Run this AFTER deploying to MongoDB Atlas.
 * Vector indexes cannot be created via Mongoose - use Atlas UI or Admin API.
 *
 * Option 1: Atlas UI
 * - Go to your cluster → Search → Create Search Index
 * - JSON Editor → paste the definition below
 *
 * Option 2: Atlas Admin API
 * - Use the script below with your Atlas API key
 */

const vectorIndexDefinition = {
  name: 'translation_memory_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 768,
        similarity: 'cosine',
      },
    ],
  },
};

console.log('Vector index definition for translation_memory:');
console.log(JSON.stringify(vectorIndexDefinition, null, 2));
console.log('\nCreate this index in MongoDB Atlas → Search → Create Search Index');
