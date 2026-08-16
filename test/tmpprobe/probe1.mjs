import { chromium } from 'playwright'
import { startStatic } from '/Users/phoganuci/src/recipes/test/static-server.mjs'
const server = await startStatic('/Users/phoganuci/src/recipes/.output/public')
const BASE = server.url.replace(/\/$/,'')
const b = await chromium.launch()
const p = await b.newPage({viewport:{width:1440,height:900}})
const errs=[]; p.on('pageerror',e=>errs.push(e.message.split('\n')[0])); p.on('console',m=>m.type()==='error'&&errs.push(m.text()))

async function count(){ return (await p.locator('a[href^="/recipes/"]').count()) }

// 1. cold load with filter
await p.goto(BASE+'/search?courses=mains',{waitUntil:'networkidle'})
await p.waitForTimeout(800)
console.log('cold /search?courses=mains count text:', await p.locator('main p.text-xs').first().textContent())
console.log('  checked boxes:', await p.locator('main aside [data-state="checked"]').count())
console.log('  url:', p.url())

// 2. does the mains checkbox reflect
console.log('  mains checked:', await p.evaluate(()=>!!document.querySelector('main aside [data-facet="courses"][data-value="mains"] [data-state="checked"]')))

// 3. q param
await p.goto(BASE+'/search?q=pizza',{waitUntil:'networkidle'})
await p.waitForTimeout(800)
console.log('cold /search?q=pizza:', await p.locator('main p.text-xs').first().textContent(), 'active clear btn:', await p.locator('#clear-filters').count())

// 4. click a browse card from home -> filtered?
await p.goto(BASE+'/',{waitUntil:'networkidle'})
await p.waitForTimeout(300)
const cardHref = await p.locator('a[href*="/search?"]').first().getAttribute('href')
console.log('home card href:', cardHref)
await p.locator('a[href*="/search?"]').first().click()
await p.waitForTimeout(800)
console.log('after click url:', p.url(), 'count:', await p.locator('main p.text-xs').first().textContent())

// 5. back button behaviour after toggling filters
await p.goto(BASE+'/search',{waitUntil:'networkidle'})
await p.waitForTimeout(400)
await p.locator('main aside [data-facet="methods"][data-value="grilling"]').click()
await p.waitForTimeout(400)
console.log('after toggle url:', p.url())
await p.goBack()
await p.waitForTimeout(800)
console.log('after back url:', p.url(), 'count:', await p.locator('main p.text-xs').first().textContent())

// 6. forward
await p.goForward(); await p.waitForTimeout(800)
console.log('after forward url:', p.url(), 'count:', await p.locator('main p.text-xs').first().textContent())

console.log('errors:', errs)
await b.close(); await server.close()
