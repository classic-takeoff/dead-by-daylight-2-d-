import { defineConfig } from 'vite';
export default defineConfig({base:'./',server:{host:'0.0.0.0',port:5186,strictPort:true},build:{rollupOptions:{output:{manualChunks:{phaser:['phaser']}}}}});

