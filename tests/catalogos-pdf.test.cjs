const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const groq = require('groq-js');
// Compile only the modules under test; no extra runner or runtime dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};
const rules = require('../src/lib/catalogosPdf.ts');
const { saveCatalog, hideCatalog, deleteCatalog, mergeCatalogs, repairCatalogPublication } = require('../sanity/tools/interactiveView/catalogosPdf/catalogService.ts');
// Queries are literal constants: extract them without initializing the production client.
const source = fs.readFileSync(require.resolve('../src/lib/catalogosPdfQueries.ts'), 'utf8');
const publicFilter = source.match(/export const publicCatalogFilter = `([^`]+)`/)[1];
const projection = source.match(/export const catalogProjection = `([^`]+)`/)[1];
const pdf = { _id:'file-one-pdf',_type:'sanity.fileAsset',url:'https://cdn.sanity.io/files/test/production/one.pdf',originalFilename:'campaña.pdf',mimeType:'application/pdf',size:1234 };
const catalog = (extra={}) => ({_id:'catalogoPdf-test',_type:'catalogoPdf',titulo:'Halloween',slug:{_type:'slug',current:'halloween'},orden:0,visible:false,archivo:{_type:'file',asset:{_type:'reference',_ref:pdf._id}},...extra});
function mockClient(initial=[]) {
  const docs = new Map([pdf,...initial].map(d=>[d._id,structuredClone(d)])); let rev=0;
  const client = {
    docs, withConfig(){return this;}, async getDocument(id){return structuredClone(docs.get(id));},
    async getDocuments(ids){return Promise.all(ids.map(id=>this.getDocument(id)));},
    async fetch(query,params){return [...docs.values()].filter(d=>d._type==='catalogoPdf' && d.slug.current===params.slug && ![params.id,params.draft].includes(d._id)).length;},
    patch(id){return this.transaction().patch(id);},
    transaction(){
      const ops=[]; const trx={
        create(doc){ops.push(['create',doc]);return this;},
        patch(id,callback){let revision, values;const patch={ifRevisionId(v){revision=v;return this;},set(v){values=v;return this;},async commit(){return trx.commit();}};if(callback){callback(patch);ops.push(['patch',id,()=>revision,()=>values]);return this;}ops.push(['patch',id,()=>revision,()=>values]);return patch;},
        delete(id){ops.push(['delete',id]);return this;},
        async commit(){const next=new Map(docs);for(const [op,id,revision,values] of ops){if(op==='create'){if(next.has(id._id))throw Error('conflict');next.set(id._id,{...structuredClone(id),_rev:String(++rev)});}if(op==='patch'){if(!next.has(id)||revision()!==next.get(id)._rev)throw Error('revision conflict');next.set(id,{...next.get(id),...values(),_rev:String(++rev)});}if(op==='delete')next.delete(id);}docs.clear();for(const [id,doc]of next)docs.set(id,doc);return {};}
      };return trx;
    }
  };return client;
}
test('PDF validation rejects disguised, empty, oversized and wrong MIME uploads',async()=>{
  await rules.validatePdfFile(new File(['%PDF-1.7\ncontent'],'catalogo.pdf',{type:'application/pdf'}));
  for(const file of [new File(['<html>'],'catalogo.pdf',{type:'application/pdf'}),new File(['%PDF-1.7'],'catalogo.txt',{type:'application/pdf'}),new File(['%PDF-1.7'],'catalogo.pdf',{type:'text/plain'}),new File([],'catalogo.pdf',{type:'application/pdf'})]) await assert.rejects(rules.validatePdfFile(file));
  assert.throws(()=>rules.validatePdfMetadata({...pdf,size:rules.PDF_MAX_BYTES+1}));
});
test('slugs and WhatsApp text handle accents, reserved paths and special characters',()=>{
  assert.equal(rules.catalogSlug('Campaña Escolar 2026'),'campana-escolar-2026');
  for(const slug of ['studio','api','a/b','UPPER','-bad','bad-','a'.repeat(97)]) assert.equal(rules.validCatalogSlug(slug),false);
  const url='https://example.com/catalogos/navidad'; const share=new URL(rules.catalogWhatsapp('Navidad & año nuevo',url));
  assert.match(share.searchParams.get('text'),/Navidad & año nuevo/);assert.ok(share.searchParams.get('text').endsWith(url));
});
test('public GROQ excludes drafts, releases, hidden, missing PDF and exact expiration; ordering stays stable',async()=>{
  const timestamp=new Date('2026-10-19T12:00:00Z');
  const dataset=[pdf,catalog({_id:'b',visible:true}),catalog({_id:'a',visible:true}),catalog({_id:'drafts.d',visible:true}),catalog({_id:'versions.release.x',visible:true}),catalog({_id:'hidden'}),catalog({_id:'missing',visible:true,archivo:undefined}),catalog({_id:'expired',visible:true,fechaCaducidad:timestamp.toISOString()}),catalog({_id:'future',visible:true,orden:1,fechaCaducidad:'2026-10-19T12:00:01Z'})];
  const result=await groq.evaluate(groq.parse(`*[${publicFilter}] | order(coalesce(orden,0) asc, _id asc) ${projection}`),{dataset,timestamp});
  const rows=await result.get(); assert.deepEqual(rows.map(r=>r._id),['a','b','future']);assert.equal(rows[0].pdf.url,pdf.url);
  const after=await groq.evaluate(groq.parse(`*[${publicFilter}]{_id}`),{dataset,timestamp:new Date('2026-10-19T12:00:02Z')});
  assert.deepEqual((await after.get()).map(r=>r._id).sort(),['a','b']);
});
test('draft without PDF is saved but cannot publish; publishing locks the slug and replacing PDF keeps URL',async()=>{
  const client=mockClient(); const form=catalog({archivo:undefined});
  await saveCatalog(client,form,false);assert.ok(client.docs.has('drafts.catalogoPdf-test'));assert.ok(!client.docs.has(form._id));
  await assert.rejects(saveCatalog(client,form,true),/PDF válido/);
  await saveCatalog(client,catalog(),true); let live=client.docs.get(form._id);assert.equal(live.publicadoSlug,'halloween');assert.ok(!client.docs.has('drafts.catalogoPdf-test'));
  const nextPdf={...pdf,_id:'file-two-pdf',url:pdf.url.replace('one','two')}; client.docs.set(nextPdf._id,nextPdf);
  await saveCatalog(client,{...live,titulo:'Halloween actualizado',archivo:{_type:'file',asset:{_type:'reference',_ref:nextPdf._id}}},true);
  const replaced=client.docs.get(form._id);assert.equal(replaced.slug.current,'halloween');assert.equal(replaced.archivo.asset._ref,nextPdf._id);
  await assert.rejects(saveCatalog(client,{...replaced,slug:{current:'otro'}},true),/no puede cambiar/);
  await hideCatalog(client,{...replaced,published:replaced});live=client.docs.get(form._id);assert.equal(live.visible,false);assert.equal(live.publicadoSlug,'halloween');
  await deleteCatalog(client,{...live,published:live});assert.ok(!client.docs.has(form._id));assert.ok(client.docs.has(pdf._id));assert.ok(client.docs.has(nextPdf._id));
});
test('editing draft preserves public version; duplicate slugs, stale edits and expired publication are rejected',async()=>{
  const client=mockClient();await saveCatalog(client,catalog(),true);const live=client.docs.get('catalogoPdf-test');
  await saveCatalog(client,{...live,titulo:'Edición pendiente'},false);assert.equal(client.docs.get(live._id).titulo,'Halloween');
  const merged=mergeCatalogs([...client.docs.values()].filter(d=>d._type==='catalogoPdf'));assert.equal(merged.length,1);assert.equal(merged[0].titulo,'Edición pendiente');assert.equal(merged[0].published.titulo,'Halloween');
  await assert.rejects(saveCatalog(client,catalog({_id:'another'}),true),/pertenece/);
  await assert.rejects(saveCatalog(client,{...live,_rev:'stale'},true),/Otra persona/);
  await assert.rejects(saveCatalog(client,{...live,fechaCaducidad:'2020-01-01T00:00:00Z'},true),/caducidad ya pasó/);
  await hideCatalog(client,{...live,published:live});
  await assert.rejects(saveCatalog(client,merged[0],true),/Otra persona/);
});
test('atomic slug reservation prevents simultaneous duplicate creation',async()=>{
  const client=mockClient();const results=await Promise.allSettled([saveCatalog(client,catalog({_id:'one'}),true),saveCatalog(client,catalog({_id:'two'}),true)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal([...client.docs.values()].filter(d=>d._type==='catalogoPdf').length,1);
});


test('new catalog IDs allow anonymous reads in Sanity',()=>{
  for(let i=0;i<10;i++) {
    const id=rules.createCatalogId();
    assert.match(id,/^catalogoPdf-[a-f0-9-]+$/);
    assert.equal(rules.hasPrivateCatalogId(id),false);
    assert.equal(rules.hasPrivateCatalogId(`drafts.${id}`),false);
  }
  assert.equal(rules.hasPrivateCatalogId('drafts.catalogoPdf.legacy'),true);
});

test('repair preserves the published PDF, URL, visibility and separate draft; transfers reservations',async()=>{
  const id='catalogoPdf.legacy';
  const live=catalog({_id:id,_rev:'live',visible:true,publicadoSlug:'halloween'});
  const draft={...live,_id:`drafts.${id}`,_rev:'draft',titulo:'Pendiente',visible:false};
  const client=mockClient([live,draft,{_id:'catalogoPdfSlug.halloween',_type:'catalogoPdfSlug',_rev:'reservation',catalogId:id}]);
  const [row]=mergeCatalogs([live,draft]);
  await repairCatalogPublication(client,row);
  assert.equal(client.docs.has(id),false);assert.equal(client.docs.has(draft._id),false);
  const newId=client.docs.get('catalogoPdfSlug.halloween').catalogId;
  assert.equal(rules.hasPrivateCatalogId(newId),false);
  const repaired=client.docs.get(newId);
  assert.equal(repaired.visible,true);assert.equal(repaired.titulo,live.titulo);
  assert.deepEqual(repaired.archivo,live.archivo);assert.deepEqual(repaired.slug,live.slug);
  assert.equal(repaired.publicadoSlug,live.publicadoSlug);
  assert.equal(client.docs.get(`drafts.${newId}`).titulo,'Pendiente');
  assert.equal(client.docs.get(`drafts.${newId}`).visible,false);
  assert.ok(client.docs.has(pdf._id));
  await saveCatalog(client,{...repaired,titulo:'Reemplazo'},true);
});

test('repair handles draft-only catalogs and rejects stale edits and conflicting reservations atomically',async()=>{
  const draft=catalog({_id:'drafts.catalogoPdf.legacy',_rev:'draft'});
  const client=mockClient([draft]);const [row]=mergeCatalogs([draft]);
  await assert.rejects(saveCatalog(client,draft,true),/Reparar publicaci/);
  await assert.rejects(repairCatalogPublication(client,{...row,_rev:'stale'}),/Otra persona/);
  await repairCatalogPublication(client,row);
  const newId=client.docs.get('catalogoPdfSlug.halloween').catalogId;
  assert.equal(client.docs.has(newId),false);assert.ok(client.docs.has(`drafts.${newId}`));
  const live=catalog({_id:'catalogoPdf.conflict',_rev:'live',visible:true});
  const conflict=mockClient([live,{_id:'catalogoPdfSlug.halloween',_rev:'r',catalogId:'another'}]);
  await assert.rejects(repairCatalogPublication(conflict,mergeCatalogs([live])[0]),/pertenece/);
  assert.ok(conflict.docs.has(live._id));
  assert.equal([...conflict.docs.values()].filter(d=>d._type==='catalogoPdf').length,1);
});

test('repaired catalogs reach the public queries only when visible and unexpired',async()=>{
  for (const extra of [{visible:true},{visible:false},{visible:true,fechaCaducidad:'2020-01-01T00:00:00Z'}]) {
    const live=catalog({_id:'catalogoPdf.legacy',_rev:'live',...extra});
    const client=mockClient([live]);
    await repairCatalogPublication(client,mergeCatalogs([live])[0]);
    // Model Sanity's anonymous access: dotted document IDs are inaccessible.
    const dataset=[...client.docs.values()].filter(d=>!d._id.includes('.'));
    const result=await groq.evaluate(groq.parse(`*[${publicFilter} && slug.current == $slug] ${projection}`),{dataset,params:{slug:'halloween'}});
    const rows=await result.get();
    assert.equal(rows.length,extra.visible && !extra.fechaCaducidad ? 1 : 0);
    if(rows.length) assert.equal(rows[0].pdf.url,pdf.url);
  }
});
