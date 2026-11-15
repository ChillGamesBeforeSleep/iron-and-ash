#!/usr/bin/env node
// Iron & Ash — publish: builds the game and pushes dist/ to the gh-pages branch (what GitHub Pages serves).
//   npm run deploy
import {execFileSync} from 'node:child_process';
import {mkdtempSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {build} from './build.mjs';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const git=(cwd,...a)=>execFileSync('git',a,{cwd,encoding:'utf8'}).trim();
const {ver}=build();
const remote=git(ROOT,'remote','get-url','origin'),sha=git(ROOT,'rev-parse','--short','HEAD');
const name=git(ROOT,'config','user.name'),email=git(ROOT,'config','user.email');
const tmp=mkdtempSync(join(tmpdir(),'ironash-pages-'));
try{
  copyFileSync(join(ROOT,'dist','index.html'),join(tmp,'index.html'));
  writeFileSync(join(tmp,'.nojekyll'),'');
  git(tmp,'init','-q','-b','gh-pages');git(tmp,'add','-A');
  git(tmp,'-c',`user.name=${name}`,'-c',`user.email=${email}`,'commit','-q','-m',`Deploy v${ver} (${sha})`);
  // same credentials as this repo (GitHub CLI), whatever the machine-wide git login is
  git(tmp,'-c','credential.https://github.com.helper=','-c','credential.https://github.com.helper=!gh auth git-credential','push','-q','-f',remote,'gh-pages');
  console.log(`✓ deployed v${ver} (${sha}) to gh-pages`);
}finally{rmSync(tmp,{recursive:true,force:true})}
