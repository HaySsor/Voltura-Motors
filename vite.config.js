import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    base: './',
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'public'),
    appType: 'mpa',
    server: { port: 8080, hot: true },
    resolve: { alias: { '~bootstrap': resolve(__dirname, 'node_modules/bootstrap') } }
})