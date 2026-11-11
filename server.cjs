'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const host='127.0.0.1',port=Number(process.env.PORT)||18461,base=`http://${host}:${port}`,root=__dirname;
const names=['index.html','style.css','world.js','game.js','story.js','render.js','audio.js','app.js','vendor/three.min.js','assets/manifest.json'];
const routes=new Map(names.map(n=>['/'+n,n]));routes.set('/','index.html');
const server=http.createServer((req,res)=>{
 if(![`${host}:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403).end('Forbidden');return;}
 let url;try{url=new URL(req.url,base);}catch{res.writeHead(400).end('Bad request');return;}
 if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('daybreak-long-night-v1');return;}
 if(url.pathname==='/stop'&&req.method==='POST'){if(req.headers.origin&&!['http://localhost:'+port,base].includes(req.headers.origin)){res.writeHead(403).end();return;}res.writeHead(200).end('Stopped');server.close();return;}
 if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let file=routes.get(url.pathname);
 if(!file&&/^\/assets\/textures\/[a-z]+-(color|normal|roughness)\.jpg$/.test(url.pathname))file=url.pathname.slice(1);
 if(!file){res.writeHead(404).end('Not found');return;}
 const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const ext=path.extname(file),type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg'}[ext]||'application/octet-stream';
 fs.readFile(resolved,(error,data)=>{if(error){res.writeHead(503).end('Game file unavailable');return;}res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}).end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'The game port is in use. Set PORT or stop the other copy.':e.message);process.exitCode=1;});server.listen(port,host,()=>console.log(`Daybreak Long Night: ${base}/`));
