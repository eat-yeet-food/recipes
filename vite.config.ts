/** Vite is retained only for Storybook; Next.js owns the application build. */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ACTIVE_APP } from '#site-config'
import { appBuildConfig } from './scripts/app-build-config.mjs'
const app=appBuildConfig(ACTIVE_APP)
export default defineConfig({define:app.define,resolve:{alias:app.alias},plugins:[react(),tailwindcss()],server:{host:'127.0.0.1'}})
