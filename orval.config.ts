import { defineConfig } from 'orval';

export default defineConfig({
  edcraft: {
    input: {
      target: process.env.EDCRAFT_OPENAPI_FILE || 'http://localhost:8000/openapi.json',
      override: { transformer: './orval-input.cjs' },
    },
    output: {
      target: 'src/api/edcraftClient.ts',
      schemas: 'src/api/models',
      client: 'axios',
      override: {
        operations: {
          retrieve_material_evidence_ai_authoring_materials_retrieve_post: {
            mutator: {
              path: './src/api/axiosInstance.ts',
              name: 'materialRetrievalAxiosInstance',
            },
          },
        },
        mutator: {
          path: './src/api/axiosInstance.ts',
          name: 'axiosInstance',
        },
      },
    },
  },
});
