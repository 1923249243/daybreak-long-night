'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),required=['index.html','style.css','world.js','game.js','story.js','render.js','audio.js','app.js','server.cjs','start.ps1','启动游戏.cmd','停止本地服务.cmd','LICENSE','THIRD_PARTY_NOTICES.md','vendor/three.min.js','vendor/three.LICENSE.txt','assets/manifest.json'];
for(const file of required)if(!fs.existsSync(path.join(root,file)))throw Error('Missing runtime file: '+file);
for(const file of ['world.js','game.js','story.js','render.js','audio.js','app.js','server.cjs']){const r=cp.spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});if(r.status!==0)throw Error(file+': '+r.stderr);}
const asset=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));
for(const file of asset.files){const rel=file.relative_path,p=path.resolve(root,'assets',rel);if(!p.startsWith(path.join(root,'assets')+path.sep))throw Error('Invalid asset path');const data=fs.readFileSync(p),sha=crypto.createHash('sha256').update(data).digest('hex');if(sha!==file.sha256)throw Error('Asset checksum mismatch: '+rel);}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(m[1].startsWith('http'))throw Error('Online runtime dependency: '+m[1]);if(!fs.existsSync(path.join(root,m[1])))throw Error('Missing HTML resource: '+m[1]);}
const stages=require(path.join(root,'game.js')).missionStages;if(Object.keys(stages).length!==8)throw Error('Campaign must contain eight stages');
console.log(JSON.stringify({runtimeFiles:required.length,chapters:8,textures:asset.files.length,syntax:'passed',assetIntegrity:'passed',onlineRuntimeDependencies:0}));
