import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { ACTIVE_APP } from '#site-config'
const out = resolve('packages/l8/web/public')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const file of ['fonts', 'donut-icon.svg'])
  cpSync(resolve(ACTIVE_APP.paths.publicDir, file), resolve(out, file), {
    recursive: true,
  })

// Preserve Latin-1, combining marks, punctuation, fractions and
// mathematical symbols independently of today's content (sync needs no rebuild).
const { default: subsetFont } = await import('subset-font')
const { readdirSync, readFileSync, writeFileSync } = await import('node:fs')
const characters = [[0x20,0xff],[0x300,0x36f],[0x2000,0x206f],[0x2150,0x219f],[0x2212,0x2212]].flatMap(([start,end])=>Array.from({length:end-start+1},(_,i)=>String.fromCodePoint(start+i))).join('')
const report=[]
async function fonts(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const file=resolve(dir,entry.name)
 if(entry.isDirectory())await fonts(file)
 else if(entry.name.endsWith('.woff2')){
  const source=readFileSync(file),subset=await subsetFont(source,characters,{targetFormat:'woff2',keepFeatures:['kern','liga','clig','calt','locl','mark','mkmk','tnum','lnum','pnum','onum','frac','sups','subs']})
  if(subset.length<source.length)writeFileSync(file,subset)
  report.push({file:file.slice(out.length+1),sourceBytes:source.length,deliveredBytes:Math.min(source.length,subset.length)})
 }
}}
await fonts(resolve(out,'fonts'))
mkdirSync('dist',{recursive:true});writeFileSync('dist/font-sizes.json',JSON.stringify(report,null,2))
