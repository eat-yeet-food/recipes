import { chromium } from 'playwright'
import { startStatic } from '../static-server.mjs'
const server = await startStatic('/Users/phoganuci/src/recipes/.output/public')
const BASE = server.url.replace(/\/$/,'')
const b = await chromium.launch()
const ctx = await b.newContext({viewport:{width:1440,height:900}})
await ctx.clock.install({ time: new Date('2027-03-04T12:00:00Z') })
const p = await ctx.newPage()
const errs=[]; p.on('pageerror',e=>errs.push(e.message.split('\n')[0])); p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(BASE+'/',{waitUntil:'networkidle'})
await p.waitForTimeout(1200)
console.log('footer:', (await p.locator('footer p').last().textContent()))
console.log('errors:', errs)
await b.close(); await server.close()
