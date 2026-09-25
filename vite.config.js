import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  // Die Simulationstests spielen ganze Matches durch – auf CI-Runnern dauert das länger als 5 s.
  test: { testTimeout: 20000 },
});
