#!/usr/bin/env node
// Iron & Ash — build: stitches src/ into ONE self-contained HTML file.
//   node tools/build.mjs            build src/ -> dist/index.html (what GitHub Pages serves)
//   node tools/build.mjs --release  also keep a versioned copy: builds/IronAndAsh_v<VERSION>.html
//   node tools/build.mjs --bump [minor|major]   bump src/VERSION first, then build
// All modules in src/js are joined in file-name order inside one strict-mode closure, so they
// share one scope: a `const` in 02-materials.js is visible in 12-damage.js. No bundler needed.
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const SRC=join(ROOT,'src');
const list=d=>readdirSync(join(SRC,d)).filter(f=>!f.startsWith('.')).sort();
const read=(...p)=>readFileSync(join(SRC,...p),'utf8');

export function build({release=false,bump=null,quiet=false}={}){
  const verFile=join(SRC,'VERSION');
  let ver=readFileSync(verFile,'utf8').trim();
  if(bump){let [a,b,c]=ver.split('.').map(Number);
    if(bump==='major'){a++;b=0;c=0}else if(bump==='minor'){b++;c=0}else c++;
    ver=`${a}.${b}.${c}`;writeFileSync(verFile,ver+'\n')}

  const jsFiles=list('js').filter(f=>f.endsWith('.js'));
  const css=list('css').filter(f=>f.endsWith('.css')).map(f=>read('css',f).replace(/\n$/,'')).join('\n');
  const js=jsFiles.map(f=>`/* ── ${f} ── */\n`+read('js',f).replace(/\n$/,'')).join('\n');

  /* lint — the silent-bug classes that have bitten this project before */
  const errs=[],warns=[];
  // 1. every module must parse on its own, and so must the joined script
  for(const f of jsFiles){try{new vm.Script(read('js',f),{filename:f})}catch(e){errs.push(`${f}: ${e.message}`)}}
  try{new vm.Script(`(()=>{'use strict';\n${js}\n})`,{filename:'game.js'})}catch(e){errs.push(`joined script: ${e.message}`)}
  // 2. CFG.x read in the code but never defined (undefined -> comparisons quietly fail)
  {const cfgSrc=read('js','00-config.js'),a=cfgSrc.indexOf('const CFG'),b=cfgSrc.indexOf('const CFG_DEFAULT');
    if(a>=0&&b>a){const body=cfgSrc.slice(a,b).replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
      const keys=new Set([...body.matchAll(/([A-Za-z_]\w*)\s*:/g)].map(x=>x[1]));
      for(const k of new Set([...js.matchAll(/CFG\.([A-Za-z_]\w*)/g)].map(x=>x[1])))if(!keys.has(k))warns.push(`CFG.${k} is used but not defined in 00-config.js`)}}
  // 3. the game lives in a closure: nothing outside it can see its functions. Catch "patch layer" code that assumes otherwise.
  for(const m of js.matchAll(/window\.(_orig_|_hook_)\w+/g))errs.push(`trampoline hook "${m[0]}" — edit the function in its module instead of hooking it through window`);
  if(errs.length){const msg='✗ build failed:\n  '+[...new Set(errs)].join('\n  ');if(quiet)throw new Error(msg);console.error(msg);process.exit(1)}

  let html=read('index.html');
  for(const k of ['/*@CSS*/','/*@JS*/'])if(!html.includes(k))throw new Error('src/index.html is missing '+k);
  html=html.replace('/*@CSS*/',()=>css).replace('/*@JS*/',()=>js).replaceAll('{{VERSION}}',ver);

  mkdirSync(join(ROOT,'dist'),{recursive:true});
  writeFileSync(join(ROOT,'dist','index.html'),html);
  let extra='';
  if(release){mkdirSync(join(ROOT,'builds'),{recursive:true});const f=`IronAndAsh_v${ver}.html`;writeFileSync(join(ROOT,'builds',f),html);extra=` + builds/${f}`}
  if(!quiet){for(const w of warns)console.warn('  ⚠ '+w);
    console.log(`✓ built v${ver}  ${(html.length/1024).toFixed(0)} KB  ${jsFiles.length} modules  ->  dist/index.html${extra}`)}
  return {ver,warns,size:html.length};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),bi=args.indexOf('--bump');
  build({release:args.includes('--release'),bump:bi>=0?(['minor','major'].includes(args[bi+1])?args[bi+1]:'patch'):null});
}
