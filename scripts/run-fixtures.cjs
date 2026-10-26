const pp=require('puppeteer-core');const fs=require('fs'),path=require('path');
const list=(d)=>fs.existsSync(d)?fs.readdirSync(d).map(f=>path.join(d,f)).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)):[];
const photos=[...list('fixtures/generated').filter(f=>!/id-|sig-/.test(f)),...list('fixtures/web/photo-single'),...list('fixtures/web/photo-group'),...list('fixtures/web/photo-noface')];
const sigs=[...list('fixtures/web/sig'),...list('fixtures/generated').filter(f=>/sig-/.test(f))];const ids=list('fixtures/generated').filter(f=>/id-/.test(f));
(async()=>{const b=await pp.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const pg=await b.newPage();pg.on('pageerror',e=>console.log('PAGEERR',e.message.slice(0,200)));
await pg.goto('http://localhost:5173');await new Promise(r=>setTimeout(r,1500));
const run=async(f,kind)=>{const buf=fs.readFileSync(f);const t0=Date.now();
 const r=await pg.evaluate(async(d,name,kind)=>{try{const {processImage}=await import('/src/pipeline/index.ts');const {getSpec}=await import('/src/specs/index.ts');
  const u=Uint8Array.from(atob(d),c=>c.charCodeAt(0));const t=performance.now();
  const r=await processImage(new File([u],name),getSpec('central-recruitment'),kind);
  return {ms:Math.round(performance.now()-t),m:r.measured,c:r.checks.map(c=>c.id+':'+c.status)}}catch(e){return {err:String(e.message||e).slice(0,120)}}},buf.toString('base64'),path.basename(f),kind);
 return r};
const rows=[];
for(const [fs_,kind] of [[photos,'photo'],[sigs,'signature'],[ids,'id']])for(const f of fs_){const r=await run(f,kind);rows.push({f,kind,r});
 const bad=r.c?r.c.filter(x=>!x.endsWith(':pass')).join(' '):'';
 console.log(`${kind.padEnd(9)} ${path.basename(f).slice(0,42).padEnd(42)} ${r.err?'ERR '+r.err:(r.m.width+'x'+r.m.height+' '+Math.round(r.m.bytes/1024)+'KB '+r.ms+'ms  '+(bad||'ALL PASS'))}`)}
fs.writeFileSync('fixtures/results.json',JSON.stringify(rows));
// OCR
for(const f of ids){const buf=fs.readFileSync(f);
 const r=await pg.evaluate(async(d)=>{try{const {findIdDigits}=await import('/src/privacy/ocr.ts');
  const bm=await createImageBitmap(new Blob([Uint8Array.from(atob(d),c=>c.charCodeAt(0))]));const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);
  const t=performance.now();const boxes=await findIdDigits(c);return {ms:Math.round(performance.now()-t),boxes:boxes.map(b=>[b.x,b.y,b.w,b.h].map(Math.round))}}catch(e){return {err:String(e.message||e).slice(0,200)}}},buf.toString('base64'));
 console.log('OCR',path.basename(f).padEnd(16),JSON.stringify(r))}
await b.close()})()
