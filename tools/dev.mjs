#!/usr/bin/env node
// Iron & Ash — dev server: rebuilds dist/index.html whenever a file in src/ changes and serves the project.
//   node tools/dev.mjs [port]      then open http://localhost:5173
// No dependencies. The page reloads itself after each successful rebuild.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {watch} from 'node:fs';
import {join,dirname,extname,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from './build.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.argv[2]||process.env.PORT||5173);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
let stamp=Date.now(),lastErr='';
function rebuild(){try{const r=build({quiet:true});lastErr='';stamp=Date.now();console.log(`✓ v${r.ver} rebuilt ${new Date().toLocaleTimeString()}`+(r.warns.length?`  (${r.warns.length} warnings — run npm run build to see them)`:''))}
  catch(e){lastErr=e.message;stamp=Date.now();console.error(e.message)}}
rebuild();
let t=null;watch(join(ROOT,'src'),{recursive:true},()=>{clearTimeout(t);t=setTimeout(rebuild,120)});

const RELOAD=`<script>(()=>{let s=null;setInterval(async()=>{try{const v=await(await fetch('/__stamp')).text();if(s&&v!==s)location.reload();s=v}catch{}},700)})()</script>`;
http.createServer(async(req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  if(url==='/__stamp'){res.writeHead(200,{'cache-control':'no-store'});return res.end(String(stamp))}
  if(url==='/'||url==='/index.html'){
    if(lastErr){res.writeHead(500,{'content-type':'text/html; charset=utf-8'});return res.end(`<body style="background:#111;color:#f88;font:14px monospace;white-space:pre-wrap;padding:24px">${lastErr.replace(/</g,'&lt;')}</body>${RELOAD}`)}
    const html=await readFile(join(ROOT,'dist','index.html'),'utf8');
    res.writeHead(200,{'content-type':MIME['.html'],'cache-control':'no-store'});return res.end(html.replace('</body>',RELOAD+'</body>'))}
  const p=normalize(join(ROOT,url));
  if(!p.startsWith(ROOT)){res.writeHead(403);return res.end()}
  try{const buf=await readFile(p);res.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(buf)}
  catch{res.writeHead(404);res.end('not found')}
}).listen(PORT,()=>console.log(`Iron & Ash dev server → http://localhost:${PORT}`));
