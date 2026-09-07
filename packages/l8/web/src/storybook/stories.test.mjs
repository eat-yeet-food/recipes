/** Build first. Executes actual story render/play hooks, then axe in isolated contexts. */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { startStatic } from '../../../../../test/static-server.mjs'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const index = JSON.parse(readFileSync(join(root,'storybook-static/index.json'),'utf8'))
const stories = Object.values(index.entries).filter(entry => entry.type === 'story')
const server = await startStatic(join(root,'storybook-static'))
const browser = await chromium.launch()
const failures = [], results = []
try {
  for (const width of [1280,390]) {
    for (const story of stories) {
      const context = await browser.newContext({ viewport: { width, height:900 }, reducedMotion:'reduce' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror',error=>errors.push(error.message))
      page.on('console',message=>{ if (message.type() === 'error') errors.push(message.text()) })
      try {
        await page.goto(`${server.url}iframe.html?id=${story.id}&viewMode=story`, { waitUntil:'load' })
        await page.waitForFunction(id => document.documentElement.dataset.storyReady === id, story.id, { timeout:20000 })
        if (story.id.startsWith('recipes-dough-workbench--') && !story.id.endsWith('apply-and-close')) await page.getByRole('dialog', { name: 'Adjust recipe' }).waitFor()
        await page.evaluate(()=>document.fonts.ready)
        if (story.id === 'search-palette--results') await page.getByRole('option', { name: /New York Style Pizza/ }).waitFor()
        if (story.id === 'search-palette--keyboard-selection') await page.locator('[data-palette-all][data-selected=true]').waitFor()
        if (story.id === 'search-palette--empty-results') await page.getByText(/No recipes found for/).waitFor()
        if (story.id === 'recipes-dough-workbench--saved-formula') await page.getByRole('button', { name: 'Load Weekend batch' }).waitFor()
        if (story.id === 'recipes-dough-workbench--incomplete-flour-blend') await page.getByRole('alert').waitFor()
        if (story.id === 'recipes-dough-workbench--apply-and-close') await page.getByRole('status').filter({ hasText: 'Recipe updated' }).waitFor()

        const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()
        if (story.id.startsWith('controls-button--') || story.id.startsWith('controls-choice-group--')) {
          for (const control of await page.locator('[data-slot=button]:not(:disabled), [data-slot=choice-group] button:not(:disabled)').all()) {
            for (const state of ['hover','keyboard']) {
              if (state === 'hover') await control.hover()
              else { await page.mouse.move(0,0);await control.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab') }
              const style = await control.evaluate(el => { const s=getComputedStyle(el);return {underline:s.textDecorationLine.includes('underline'),focus:el.matches(':focus-visible'),outline:s.outlineStyle} })
              if (style.underline || (state === 'keyboard' && (!style.focus || style.outline === 'none'))) errors.push(`${state}: plain label or visible focus contract failed`)
            }
          }
          const group = page.locator('[data-slot=choice-group]')
          if (await group.count()) {
            const geometry = await group.evaluate(el => {const s=getComputedStyle(el),inner=getComputedStyle(el.querySelector('[aria-pressed=true]'));return {outer:parseFloat(s.borderTopLeftRadius),inset:parseFloat(s.paddingTop),inner:parseFloat(inner.borderTopLeftRadius)}})
            if (Math.abs(geometry.outer-geometry.inset-geometry.inner) > 0.1) errors.push('Nested selection radii are not concentric')
          }
        }
        const sheet = page.locator('[data-workbench-drawer]')
        if (await sheet.count()) {
          const corners = await sheet.evaluate(el => {const s=getComputedStyle(el); return [s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius]})
          if (corners.some(radius => parseFloat(radius) !== 0)) errors.push('Viewport sheet must have square corners')
        }
        if (await page.locator('[data-wordmark-size=nav] img').count()) errors.push('App bar must use the text-only wordmark')
        for (const field of await page.locator('[data-slot=input], [data-slot=select], [data-slot=textarea]').all()) {
          if (await field.evaluate(el => parseFloat(getComputedStyle(el).borderBottomWidth) > 0)) errors.push('Fields must not have decorative bottom edges')
        }
        const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)
        const result = {id:story.id,width,overflow,errors,violations:audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:audit.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}
        results.push(result)
        if (audit.violations.length || errors.length || overflow) failures.push(result)
        console.log(`${audit.violations.length || errors.length || overflow ? 'FAIL' : 'ok  '} ${width} ${story.id}${audit.violations.length ? ' '+audit.violations.map(v=>v.id).join(',') : ''}`)
      } catch(error) { failures.push({id:story.id,width,error:error.message});console.log(`FAIL ${width} ${story.id}: ${error.message}`) }
      finally { await context.close() }
    }
  }
} finally { await browser.close();await server.close() }
mkdirSync(join(root,'dist'),{recursive:true})
writeFileSync(join(root,'dist/storybook-a11y.json'),JSON.stringify({results,failures},null,2))
console.log(`${stories.length} stories × 2 widths; ${failures.length} failures. Details: dist/storybook-a11y.json`)
process.exitCode = failures.length ? 1 : 0
