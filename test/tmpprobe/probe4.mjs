import { chromium } from 'playwright'
import { startStatic } from '../static-server.mjs'
const server = await startStatic('/Users/phoganuci/src/recipes/.output/public')
const BASE = server.url.replace(/\/$/,'')
const b = await chromium.launch()
const p = await b.newPage({viewport:{width:1440,height:900}})
await p.goto(BASE+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(300)
await p.locator('[data-palette-open]').first().click(); await p.waitForTimeout(300)
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
console.log('desktop focus after close:', await p.evaluate(()=>document.activeElement?.outerHTML?.slice(0,70)))
// tab trap with no results
await p.locator('[data-palette-open]').first().click(); await p.waitForTimeout(300)
const order=[]
for(let i=0;i<5;i++){ await p.keyboard.press('Tab'); order.push(await p.evaluate(()=>document.activeElement?.tagName+':'+(document.activeElement?.id||document.activeElement?.textContent?.trim().slice(0,20)))) }
console.log('tab order in palette:', order)
// type then tab
await p.locator('#palette-input').focus()
await p.keyboard.type('donut'); await p.waitForTimeout(300)
console.log('hits:', await p.locator('[data-palette-hit]').count())
const order2=[]
for(let i=0;i<4;i++){ await p.keyboard.press('Tab'); order2.push(await p.evaluate(()=>document.activeElement?.tagName+':'+(document.activeElement?.id||document.activeElement?.textContent?.trim().slice(0,25)))) }
console.log('tab order with hits:', order2)
// arrow navigation aria
await p.locator('#palette-input').focus()
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150)
console.log('activedescendant:', await p.evaluate(()=>document.getElementById('palette-input').getAttribute('aria-activedescendant')))
await b.close(); await server.close()
