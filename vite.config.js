// vite.config.js
const { defineConfig } = require('vite')
const { resolve } = require('node:path')

module.exports = defineConfig({
    base: './',
    root: resolve(process.cwd(), 'src'),
    publicDir: resolve(process.cwd(), 'public'),
    appType: 'mpa',
    server: { port: 8080, hot: true },
    resolve: {
        alias: { '~bootstrap': resolve(process.cwd(), 'node_modules/bootstrap') }
    }
})