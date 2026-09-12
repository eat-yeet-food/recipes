import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,cpSync,mkdirSync,symlinkSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {sourceContent} from '../scripts/content-source.mjs'
test('complete source validation catches duplicate identities and broken publication references before writes',()=>{
 const root=mkdtempSync(join(tmpdir(),'eatyeet-sources-'))
 cpSync('apps/eatyeet/fixtures',join(root,'fixtures'),{recursive:true});cpSync('apps/eatyeet/site.yaml',join(root,'site.yaml'));mkdirSync(join(root,'public'));symlinkSync(resolve('apps/eatyeet/public/images'),join(root,'public/images'),'dir')
 const valid=sourceContent({root});assert.equal(valid.records.filter(r=>r.collection==='recipes').length,15);assert.equal(valid.records[0].collection,'articles')
 const recipe=join(root,'fixtures/recipes/new-york-style-pizza.yaml'),duplicate=join(root,'fixtures/recipes/duplicate.yaml')
 cpSync(recipe,duplicate);assert.throws(()=>sourceContent({root}),/Duplicate sourceId/);unlinkSync(duplicate)
 const article=join(root,'fixtures/articles/mixing-dough-and-gluten-development.yaml'),original=readFileSync(article,'utf8')
 writeFileSync(article,original.replace('status: published','status: draft'));assert.throws(()=>sourceContent({root}),/Missing article reference/)
 writeFileSync(article,original);const source=readFileSync(recipe,'utf8');writeFileSync(recipe,source.replace('id: pizza','id: executable'));assert.throws(()=>sourceContent({root}),/Unknown workbench/)
 writeFileSync(recipe,source.replace('title: New York Style Pizza','title: 42'));assert.throws(()=>sourceContent({root}),/title and blocks/)
})
