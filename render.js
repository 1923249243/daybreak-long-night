/* 白昼之前·长夜行动 — original procedural first-person renderer. MIT. */
(function(global){
'use strict';
const T=global.THREE;if(!T)throw new Error('Three.js must load before render.js');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const palettes={
1:[0x101f31,0x172a37,0x9ab7dc,0xa2bfda,1.04,.010,1.15],
2:[0x8598aa,0x768e9c,0xffdcb2,0xccdeef,1.02,.006,2.4],
3:[0x16272b,0x203637,0xc3ded0,0xb0d4cd,1.07,.014,.45],
4:[0x829aa7,0x98afb8,0xdae6ed,0xcddde3,1.08,.008,1.8],
5:[0x667e8a,0x819ca8,0xe9e4d5,0xc6dae3,1.02,.011,1.5],
6:[0x100f0d,0x191d20,0xe8b474,0x899eac,1.09,.019,.35],
7:[0x6e899f,0x91a6b4,0xffd7a1,0xc3d7ee,1.05,.006,2.5],
8:[0xb1a0a0,0xb3a4a2,0xffd7a1,0xb8c9d6,1.12,.006,2.5]};
class DaybreakRenderer{
constructor(canvas){
 this.canvas=canvas;this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
 this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
 this.scene=new T.Scene();this.scene.background=new T.Color(0x172a37);this.camera=new T.PerspectiveCamera(92,1,.06,460);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
 this.hemi=new T.HemisphereLight(0xb1c8e2,0x30302b,1.6);this.scene.add(this.hemi);
 this.sun=new T.DirectionalLight(0xffd6a6,2);this.sun.position.set(-28,52,20);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
 Object.assign(this.sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:.5,far:145});this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.055;this.scene.add(this.sun,this.sun.target);
 this.geometry={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12),sphere:new T.SphereGeometry(1,14,10),cone:new T.ConeGeometry(1,1,10),plane:new T.PlaneGeometry(1,1),torus:new T.TorusGeometry(1,.14,6,16)};
 this.materials=new Map();this.textures=new Map();this.owned=new Set();this.actors=new Map();this.props=new Map();this.chapter=0;this.time=0;this.recoil=0;this.lastAmmo=null;this.lastShot=-100;this.quality='medium';this._fps=0;this._frames=0;this._fpsClock=0;
 this._makeEnvironment();this._makeWeapon();this.resize();this._loadSurfaces();
}
random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
texture(kind){
 if(this.textures.has(kind))return this.textures.get(kind);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=this.random(2718+kind.length*731);
 const base={brick:[100,86,76],concrete:[112,119,117],road:[43,49,52],snow:[211,223,225],rock:[76,79,77],metal:[86,92,91],wood:[97,79,56],tile:[149,166,158],cloth:[71,81,72]}[kind]||[120,125,120],im=g.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=(r()-.5)*(kind==='snow'?18:37)+Math.sin(x*.038+Math.sin(y*.034))*6,i=(y*256+x)*4;im.data[i]=base[0]+n;im.data[i+1]=base[1]+n;im.data[i+2]=base[2]+n;im.data[i+3]=255;}g.putImageData(im,0,0);
 if(kind==='brick'){for(let y=0;y<256;y+=32)for(let x=-(y%64?32:0);x<256;x+=64){g.fillStyle='rgba(39,40,38,.66)';g.fillRect(x,y,64,3);g.fillRect(x,y,3,32);g.strokeStyle='rgba(180,166,142,.26)';g.strokeRect(x+4,y+4,56,23);}}
 else if(kind==='tile'){g.strokeStyle='#596e69';g.lineWidth=2;for(let v=0;v<=256;v+=64){g.beginPath();g.moveTo(v,0);g.lineTo(v,256);g.moveTo(0,v);g.lineTo(256,v);g.stroke();}}
 else if(kind==='wood'){for(let i=0;i<100;i++){g.strokeStyle=`rgba(36,25,17,${r()*.3})`;const x=r()*256;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+15,90,x-9,180,x+3,256);g.stroke();}}
 else if(kind==='metal'){for(let i=0;i<320;i++){g.fillStyle=r()>.4?'rgba(210,219,213,.23)':'rgba(33,32,28,.4)';g.fillRect(r()*256,r()*256,r()*18+1,1);}for(let i=0;i<30;i++){g.fillStyle='rgba(123,65,34,.25)';g.fillRect(r()*256,r()*256,r()*12,r()*8);}}
 else{for(let i=0;i<45;i++){g.strokeStyle=`rgba(12,20,21,${r()*.16})`;const x=r()*256,y=r()*256;g.beginPath();g.moveTo(x,y);g.lineTo(x+r()*36-18,y+r()*70);g.stroke();}}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;tex.repeat.set(kind==='metal'?1:3,kind==='metal'?1:3);this.textures.set(kind,tex);return tex;
}
mat(kind='concrete',color=0xffffff,roughness,metalness){
 const key=`${kind}|${color}|${roughness}|${metalness}`;
 if(!this.materials.has(key)){const map=kind==='plain'?null:this.texture(kind),m=new T.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='brick'?.045:kind==='metal'?.006:.025,roughness:roughness==null?kind==='metal'?.42:kind==='road'?.3:.88:roughness,metalness:metalness==null?kind==='metal'?.75:.015:metalness});m.userData.surface=kind;this.materials.set(key,m);this._applySurface(m);}
 return this.materials.get(key);
}
_loadSurfaces(){this.surfaceMaps={};const loader=new T.TextureLoader();for(const[kind,file]of[['brick','brick'],['concrete','concrete'],['road','asphalt']]){const maps={};this.surfaceMaps[kind]=maps;for(const channel of['color','normal','roughness'])loader.load(`assets/textures/${file}-${channel}.jpg`,tex=>{if(this.disposed){tex.dispose();return;}tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(kind==='concrete'?2:3,kind==='concrete'?2:3);tex.anisotropy=4;if(channel==='color')tex.colorSpace=T.SRGBColorSpace;maps[channel]=tex;for(const m of this.materials.values())if(m.userData.surface===kind)this._applySurface(m);},undefined,()=>{});}}
_applySurface(m){const maps=this.surfaceMaps?.[m.userData.surface];if(!maps)return;if(maps.color)m.map=maps.color;if(maps.normal){m.normalMap=maps.normal;m.normalScale.set(.55,.55);m.bumpMap=null;}if(maps.roughness)m.roughnessMap=maps.roughness;m.needsUpdate=true;}
glow(color,power=2){return this.special(new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:power,roughness:.35}));}
special(m){this.owned.add(m);if(this.root)this.worldMaterials?.add(m);return m;}
mesh(shape,mat,x,y,z,w,h,d,parent=this.root,yaw=0){const m=new T.Mesh(this.geometry[shape],mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.y=yaw;m.castShadow=shape!=='plane';m.receiveShadow=true;parent.add(m);return m;}
box(mat,x,y,z,w,h,d,parent,yaw){return this.mesh('box',mat,x,y,z,w,h,d,parent,yaw);}
batch(shape,mat,x,y,z,w,h,d,yaw=0,rx=0,rz=0){const key=shape+'|'+mat.uuid;if(!this.batches.has(key))this.batches.set(key,{shape,mat,items:[]});this.batches.get(key).items.push([x,y,z,w,h,d,yaw,rx,rz]);}
b(mat,x,y,z,w,h,d,yaw=0){this.batch('box',mat,x,y,z,w,h,d,yaw);}
cy(mat,x,y,z,radius,h){this.batch('cylinder',mat,x,y,z,radius,h,radius);}
flush(){const o=new T.Object3D();for(const e of this.batches.values()){const mesh=new T.InstancedMesh(this.geometry[e.shape],e.mat,e.items.length);e.items.forEach((v,i)=>{o.position.set(v[0],v[1],v[2]);o.scale.set(v[3],v[4],v[5]);o.rotation.set(v[7],v[6],v[8]);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}this.batches=null;}
_makeEnvironment(){
 const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#9bafc9');grad.addColorStop(.48,'#e0d8cb');grad.addColorStop(.51,'#687780');grad.addColorStop(1,'#222b31');g.fillStyle=grad;g.fillRect(0,0,512,256);g.fillStyle='#f9dfb2';g.fillRect(55,101,44,9);g.fillStyle='#b8d9e9';g.fillRect(270,100,80,6);
 this.envSource=new T.CanvasTexture(c);this.envSource.mapping=T.EquirectangularReflectionMapping;this.envSource.colorSpace=T.SRGBColorSpace;const gen=new T.PMREMGenerator(this.renderer);this.envTarget=gen.fromEquirectangular(this.envSource);gen.dispose();this.scene.environment=this.envTarget.texture;this.scene.environmentIntensity=.5;
 this.sky=new T.Mesh(new T.SphereGeometry(400,24,16),this.special(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x101e32)},bottom:{value:new T.Color(0x374a59)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(vP).y*.8+.25,0.,1.);gl_FragColor=vec4(mix(bottom,top,h),1.);}'})));this.scene.add(this.sky);
}
_makeWeapon(){
 this.weaponScene=new T.Scene();this.weaponCamera=new T.PerspectiveCamera(67,1,.01,8);this.weaponScene.environment=this.envTarget.texture;this.weaponScene.add(new T.HemisphereLight(0xdce4ed,0x4d493b,2.1));const key=new T.DirectionalLight(0xffd9ab,3.1);key.position.set(-2,4,2);this.weaponScene.add(key);const rim=new T.DirectionalLight(0x8cb7dd,1.4);rim.position.set(2,1,-2);this.weaponScene.add(rim);
 const g=this.weapon=new T.Group();this.weaponScene.add(g);const steel=this.mat('metal',0x545957,.36,.84),dark=this.mat('metal',0x242a2b,.47,.75),polymer=this.mat('plain',0x333c39,.8),edge=this.mat('metal',0x8c928c,.37,.83),tan=this.mat('cloth',0xaca287,.96),part=(m,x,y,z,w,h,d)=>this.box(m,x,y,z,w,h,d,g);
 part(dark,0,0,-.28,.105,.115,.35);part(steel,0,.048,-.3,.09,.035,.34);part(polymer,0,-.004,-.54,.115,.102,.245);part(dark,0,.059,-.51,.092,.018,.27);
 for(let i=0;i<15;i++)part(edge,0,.074,-.64+i*.033,.107,.012,.012);for(let i=0;i<8;i++)for(const s of[-1,1])part(dark,s*.058,-.002,-.65+i*.027,.006,.034,.016);
 const barrel=this.mesh('cylinder',steel,0,.004,-.84,.018,.36,.018,g);barrel.rotation.x=Math.PI/2;const muzzle=this.mesh('cylinder',dark,0,.004,-1.031,.027,.07,.027,g);muzzle.rotation.x=Math.PI/2;for(let i=0;i<4;i++)part(edge,0,.027,-1.055+i*.014,.032,.007,.005);const bore=this.mesh('cylinder',this.mat('plain',0x080b0c),0,.004,-1.068,.013,.002,.013,g);bore.rotation.x=Math.PI/2;
 part(polymer,0,-.064,-.086,.095,.105,.17);part(polymer,0,-.033,.055,.12,.12,.22);part(dark,0,-.03,.173,.13,.17,.042);const grip=part(polymer,0,-.138,-.21,.067,.19,.075);grip.rotation.x=-.2;part(steel,.057,.013,-.29,.007,.05,.11);part(dark,.062,.018,-.28,.004,.028,.075);part(edge,.078,.025,-.26,.039,.012,.02);part(edge,-.06,.012,-.16,.014,.025,.037);
 const mag=part(dark,0,-.18,-.39,.077,.25,.105);mag.rotation.x=.12;this.magazine=mag;for(let i=0;i<4;i++)part(steel,.04,-.09-i*.041,-.392,.004,.018,.085);const guard=this.mesh('torus',dark,0,-.115,-.23,.047,.043,.02,g);guard.rotation.y=Math.PI/2;part(edge,0,-.088,-.245,.008,.044,.01).rotation.x=-.35;
 part(dark,0,.096,-.35,.069,.046,.09);const optic=this.mesh('cylinder',dark,0,.145,-.36,.043,.18,.043,g);optic.rotation.x=Math.PI/2;for(const z of[-.45,-.27])this.mesh('torus',edge,0,.145,z,.037,.037,.026,g);
 const lens=this.special(new T.MeshPhysicalMaterial({color:0x6a9fa5,metalness:.15,roughness:.08,transparent:true,opacity:.7,clearcoat:1})),glass=this.mesh('cylinder',lens,0,.145,-.265,.033,.004,.033,g);glass.rotation.x=Math.PI/2;part(dark,.046,.145,-.35,.035,.027,.039);part(edge,0,.191,-.36,.031,.02,.035);
 for(const s of[-1,1])for(const z of[-.58,-.39,-.19])this.mesh('cylinder',edge,s*.057,.026,z,.008,.003,.008,g).rotation.z=Math.PI/2;
 const rnd=this.random(108);for(let i=0;i<32;i++)part(edge,(rnd()-.5)*.09,.068,-.17-rnd()*.49,.003+rnd()*.012,.002,.003+rnd()*.009);
 const sleeve=this.mat('cloth',0x758079),glove=this.mat('plain',0x4c5148,.9),skin=this.mat('plain',0xb9997f,.94),limb=(x,y,z,sx,sy,sz,rx,rz)=>{const a=this.mesh('cylinder',sleeve,x,y,z,sx,sy,sz,g);a.rotation.set(rx,0,rz);return a;};limb(.12,-.29,.03,.075,.36,.07,-.5,-.28);limb(-.135,-.255,-.38,.068,.35,.065,.7,.6);part(glove,.031,-.145,-.193,.095,.12,.085).rotation.x=-.16;part(glove,-.043,-.077,-.54,.09,.07,.13).rotation.z=-.3;
 for(let i=0;i<4;i++){part(glove,.008+i*.017,-.1,-.247,.014,.028,.05).rotation.x=-.4;part(glove,-.072+i*.016,-.045,-.572,.012,.04,.048);}part(skin,.044,-.082,-.254,.014,.013,.041);part(tan,-.171,-.355,-.24,.022,.025,.12);
 this.muzzleFlash=new T.Group();g.add(this.muzzleFlash);this.muzzleFlash.position.set(0,0,-1.09);const fm=this.special(new T.MeshBasicMaterial({color:0xffd58a,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));for(let i=0;i<2;i++){const f=this.mesh('plane',fm,0,0,0,.19,.3,1,this.muzzleFlash);f.rotation.z=i*Math.PI/2;f.rotation.x=.55;}this.muzzleFlash.visible=false;g.position.set(.24,-.245,-.28);g.rotation.set(.015,-.045,0);
}
disposeWorld(){if(!this.root)return;this.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownGeometry)o.geometry?.dispose();if(o.userData.ownMaterial){o.material.map?.dispose();o.material.dispose();}});this.scene.remove(this.root);this.root=null;for(const m of this.worldMaterials||[]){m.dispose();this.owned.delete(m);}this.worldMaterials=new Set();this.actors.clear();this.props.clear();this.fxPool=[];this.weather=null;this.train=null;this.medicalTrain=null;this.militaryBridge=null;this.civilianBridge=null;this.entryBridge=null;this.targetMarker=null;this.lampCount=0;}
loadWorld(state){
 this.disposeWorld();this.worldMaterials=new Set();this.chapter=state.chapter||1;this.world=state.world;this.root=new T.Group();this.scene.add(this.root);this.batches=new Map();
 const p=palettes[this.chapter]||palettes[1],w=this.world,b=w.bounds;this.floorY=Number(w.floorY)||0;this.bounds=b;
 this.scene.fog=new T.FogExp2(p[1],p[5]);this.scene.background.setHex(p[0]);this.sky.material.uniforms.top.value.setHex(p[0]);this.sky.material.uniforms.bottom.value.setHex(p[1]);this.sky.visible=this.chapter!==3&&this.chapter!==6;this.sun.color.setHex(p[2]);this.sun.intensity=p[6];this.hemi.color.setHex(p[3]);this.hemi.intensity=this.chapter===6?.75:this.chapter===3?1.3:1.6;this.renderer.toneMappingExposure=p[4];
 const cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,ww=b.maxX-b.minX,dd=b.maxZ-b.minZ,ground=this.chapter===3?this.mat('tile'):[4,5,7].includes(this.chapter)?this.mat('snow'):this.chapter===6?this.mat('rock'):this.mat('road');
 if(this.chapter!==8)this.b(ground,cx,this.floorY-.18,cz,ww+5,.35,dd+5);
 this.theme(this.chapter,b,cx,cz,ww,dd);for(const o of w.obstacles||[])this.obstacle(o);for(const d of w.decor||[])this.decoration(d);this.flush();
 for(const s of w.supplies||[])this.supply(s);for(const p0 of w.interactables||[])this.interactive(p0);this.actors.set('buddy',this.robot());this.actors.set('doctor',this.human('doctor'));this.actors.set('boss',this.human('boss'));
 const mm=this.special(new T.MeshBasicMaterial({color:0xe9bc62,transparent:true,opacity:.6,depthWrite:false}));this.targetMarker=this.mesh('torus',mm,0,this.floorY+.045,0,.55,.55,.09);this.targetMarker.rotation.x=Math.PI/2;this.targetMarker.castShadow=false;
 if([1,4,5,7].includes(this.chapter))this.makeWeather(this.chapter===1?'rain':'snow');this.lastAmmo=null;
 if(this.chapter===8&&!this.medicalTrain){this.medicalTrain=this.platformTrain(-35,-21,3,Math.PI/2,'medical');}
}
theme(id,b,cx,cz,ww,dd){
 const y=this.floorY,con=this.mat('concrete'),metal=this.mat('metal',0x8b989b),stone=this.mat('rock'),snow=this.mat('snow');
 if(id===1||id===2){
  for(let z=b.minZ+4,n=0;z<b.maxZ+5;z+=11,n++)for(const side of[-1,1]){const x=side<0?b.minX-6:b.maxX+6,h=10+(n*7+side+1)%17;this.building(x,y,z,10,h,9,n);if(n%2===0)this.lamp(x-side*5.5,z,y);}
  for(let z=b.minZ;z<b.maxZ;z+=7)this.b(this.mat('plain',0xc0b99a),cx,y+.008,z,.12,.018,2.5);for(const side of[-1,1])this.b(con,cx+side*(ww*.5+.2),y+.09,cz,.5,.25,dd+2);
  if(id===1)for(let i=0;i<20;i++){const r=this.random(i+83);this.puddle(b.minX+r()*ww,b.minZ+r()*dd,1+r()*2.5,.35+r());}
  if(id===2){for(const side of[-1,1])for(let z=b.minZ;z<=b.maxZ;z+=4){const x=side<0?b.minX-.2:b.maxX+.2;this.b(metal,x,y+.6,z,.09,1.2,.09);this.b(metal,x,y+1.13,z+1.9,.08,.08,4.1);}for(let z=b.minZ+5;z<b.maxZ;z+=16){this.b(con,b.minX+3,y*.5-.2,z,1.8,y,2);this.b(con,b.maxX-3,y*.5-.2,z,1.8,y,2);}this.b(this.mat('road'),cx,-.15,cz,ww+100,.3,dd+70);for(let z=b.minZ-10;z<b.maxZ+20;z+=14){this.building(b.minX-30,0,z,12,15+Math.abs(z%5),10,3);this.building(b.maxX+32,0,z+5,15,22,11,5);}}
 }else if(id===3){
  this.b(con,cx,y+3.7,cz,ww+2,.28,dd+2);for(const side of[-1,1])this.b(this.mat('concrete',0x9cafa4),side<0?b.minX-.15:b.maxX+.15,y+1.8,cz,.3,3.6,dd);
  for(let z=b.minZ+3;z<b.maxZ;z+=6){this.ceilingLight(cx,z,y+3.45,0xd7ebdb);this.pipe(b.minX+.5,z,y+3.1,5.8);this.b(this.mat('plain',0x547d78),cx,y+.018,z,2.8,.025,5.8);}this.wallSign('地下医疗站 / EMERGENCY',cx,y+2.45,b.minZ+.25,5.8);
 }else if(id===4){
  for(const z of[-4,4,11])this.rails(z,b.minX,b.maxX,y,true);this.rails(cx+8,b.minZ,b.maxZ,y,false);for(let z=b.minZ;z<b.maxZ;z+=9)this.lamp(b.minX+1,z,y);for(let z=b.minZ-7;z<b.maxZ+6;z+=6){this.pine(b.maxX+8,z,5+Math.abs(z%3),y);this.pine(b.minX-12,z+3,6,y);}
 }else if(id===5){
  for(let i=0;i<65;i++){const r=this.random(500+i),x=i%2?b.minX-2-r()*16:b.maxX+2+r()*16;this.pine(x,b.minZ-10+r()*(dd+20),4+r()*5,y);}for(let i=0;i<18;i++){const r=this.random(i+928);this.batch('sphere',snow,b.minX+r()*ww,y+.05,b.minZ+r()*dd,1.5,.18,1.1);}
 }else if(id===6){
  this.b(stone,cx,y+4.3,cz,ww+8,2,dd+8);for(const side of[-1,1])this.b(stone,side<0?b.minX-2:b.maxX+2,y+1.7,cz,4,5,dd+6);const wood=this.mat('wood');for(let z=b.minZ;z<b.maxZ+1;z+=5.7){for(const x of[b.minX+.7,b.maxX-.7])this.b(wood,x,y+1.7,z,.27,3.4,.35);this.b(wood,cx,y+3.4,z,ww-1,.3,.38);}this.wallSign('06 / 工业避难矿道',cx,y+2.7,b.minZ+.4,5.3);
 }else if(id===7){
  for(const side of[-1,1]){const x=side<0?b.minX-2:b.maxX+2;this.b(this.mat('brick',0x899196),x,y+2,cz,3,4,dd+6);for(let z=b.minZ-2;z<b.maxZ+3;z+=2.5)this.b(con,x,y+4.4,z,3,.8,1.2);}this.building(cx,y,b.minZ-6,ww+6,7,7,6);for(let i=0;i<15;i++){const r=this.random(i+1121);this.batch('cone',snow,b.minX-40+r()*(ww+80),y-4,b.minZ-26-r()*30,12+r()*19,26+r()*27,12+r()*20);}
 }else if(id===8){
  this.b(this.mat('plain',0x354a55,.3,.25),cx,y-20,cz,ww+260,.3,dd+180);for(let z=b.minZ-20;z<b.maxZ+30;z+=23)for(const side of[-1,1])this.batch('cone',stone,side<0?b.minX-35:b.maxX+35,y-12,z,20,32,20);
  this.b(this.mat('metal',0x7f8c86),0,y-.14,-21,46,.27,2.5);for(const z of[-22.3,-19.7]){this.b(metal,0,y+.85,z,46,.06,.06);for(let x=-22;x<=22;x+=3)this.b(metal,x,y+.42,z,.06,.9,.06);}this.b(con,17,y-.3,-21,8,.6,6);
 }
}
building(x,y,z,w,h,d,n=0){
 const wall=this.mat(n%2?'brick':'concrete',n%2?0xc0b8aa:0xa4adb0),metal=this.mat('metal',0x707978),glass=this.mat('plain',0x182b39,.2,.35),warm=this.mat('plain',0xd4a95e,.48,.05);this.b(wall,x,y+h/2,z,w,h,d);this.b(metal,x,y+h+.12,z,w+.25,.24,d+.25);this.b(this.mat('concrete',0xa3a398),x,y+.25,z,w+.14,.5,d+.14);
 for(let xx=x-w/2+.8,k=0;xx<x+w/2-.4;xx+=1.6,k++)for(let yy=1.8;yy<h-.6;yy+=2.6){const m=(k+Math.round(yy)+n)%7===0?warm:glass;for(const s of[-1,1]){this.b(m,xx,y+yy,z+s*(d/2+.025),.69,1.05,.035);this.b(metal,xx,y+yy-.6,z+s*(d/2+.08),.87,.09,.23);this.b(metal,xx,y+yy,z+s*(d/2+.05),.033,1.05,.035);}}
 for(let zz=z-d/2+.9;zz<z+d/2-.4;zz+=1.9)for(let yy=1.8;yy<h-.6;yy+=2.6)for(const s of[-1,1])this.b(glass,x+s*(w/2+.025),y+yy,zz,.035,1.05,.77);
 this.b(metal,x-w*.25,y+1.1,z+d/2+.04,1,2.2,.07);this.b(this.mat('plain',0xb2aea0),x-w*.25+.35,y+1,z+d/2+.09,.05,.2,.04);this.b(metal,x+w/2+.13,y+h*.5,z-d*.28,.18,h,.18);this.b(metal,x,y+h+.5,z,2.2,.8,1.4);
}
lamp(x,z,y=this.floorY,height=5){const m=this.mat('metal',0x69716d);this.cy(m,x,y+height/2,z,.065,height);this.b(m,x+.45,y+height-.1,z,.96,.08,.09);this.b(m,x+.85,y+height-.2,z,.52,.13,.3);this.b(this.glow(0xffd08d,2.6),x+.85,y+height-.28,z,.43,.03,.23);if(!this.lampCount)this.lampCount=0;if(this.lampCount++%3===0){const l=new T.PointLight(this.chapter===6?0xffb766:0xffc78e,16,11,2);l.position.set(x+.8,y+height-.5,z);this.root.add(l);}if(this.chapter===1)this.puddle(x+.8,z,1.4,2.5);}
ceilingLight(x,z,y,color){this.b(this.mat('metal'),x,y,z,1.8,.08,.35);this.b(this.glow(color,2),x,y-.05,z,1.6,.025,.23);if((this.lampCount=(this.lampCount||0)+1)%2){const l=new T.PointLight(color,10,12,2);l.position.set(x,y-.2,z);this.root.add(l);}}
pipe(x,z,y,len){this.batch('cylinder',this.mat('metal',0x73786f),x,y,z,.065,len,.065,0,Math.PI/2);}
puddle(x,z,w,d){const m=this.special(new T.MeshPhysicalMaterial({color:0x647c87,roughness:.075,metalness:.35,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.42}));this.mesh('sphere',m,x,this.floorY+.015,z,w,.009,d).castShadow=false;}
pine(x,z,h=6,y=this.floorY){this.cy(this.mat('wood'),x,y+h*.3,z,.12,h*.6);for(let i=0;i<3;i++){const yy=y+h*(.39+i*.2),rr=h*(.28-i*.055);this.batch('cone',this.mat('cloth',0x3b5550),x,yy,z,rr,h*.49,rr);if(this.chapter!==1)this.batch('cone',this.mat('snow'),x,yy+h*.09,z,rr*.86,h*.36,rr*.86);}}
rails(center,a,b,y=this.floorY,alongX=false){const wood=this.mat('wood',0xa8a299),metal=this.mat('metal',0x999d97);for(let v=a;v<b;v+=1.1)this.b(wood,alongX?v:center,y+.045,alongX?center:v,alongX?.24:2.35,.13,alongX?2.35:.24);for(const side of[-1,1])this.b(metal,alongX?(a+b)/2:center+side*.76,y+.17,alongX?center+side*.76:(a+b)/2,alongX?b-a:.095,.13,alongX?.095:b-a);}
antenna(x,z,y){const m=this.mat('metal',0x858c87);this.cy(m,x,y+6,z,.1,12);for(const dx of[-1,1])this.b(m,x+dx*.7,y+9,z,.9,.06,.1);for(let h=3;h<11;h+=2)this.b(m,x,y+h,z,.9,.05,.05);this.mesh('sphere',this.mat('plain',0x9daca9),x,y+8,z-.3,.8,.8,.13).rotation.x=.3;}
wallSign(text,x,y,z,w=4){const c=document.createElement('canvas');c.width=768;c.height=160;const g=c.getContext('2d');g.fillStyle='#182a30';g.fillRect(0,0,768,160);g.strokeStyle='#b2a882';g.lineWidth=7;g.strokeRect(8,8,752,144);g.fillStyle='#eee5c8';g.textAlign='center';g.textBaseline='middle';g.font='500 42px "Microsoft YaHei",sans-serif';g.fillText(text,384,81,722);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),p=this.mesh('plane',m,x,y,z,w,w*160/768,1);p.userData.ownMaterial=true;p.castShadow=false;return p;}
obstacle(o){
 const x=o.x||0,z=o.z||0,y=o.y==null?this.floorY:o.y,w=o.w||2,d=o.d||2,h=o.h||2,type=String(o.type||'').toLowerCase();if(/void|trigger/.test(type))return;
 if(/build|house|apartment|station|shed|fort|bunker|warehouse/.test(type)){this.building(x,y,z,w,h,d,Math.round(Math.abs(x+z)));return;}
 if(/truck|car|vehicle|recon|bus|wreck/.test(type)){this.vehicle(x,z,y,w,d,o.color||0x738075,/truck|vehicle|bus/.test(type));return;}
 if(/tree|pine/.test(type)){this.pine(x,z,h,y);return;}if(/rock|rubble/.test(type)){this.batch('sphere',this.mat('rock'),x,y+h*.4,z,w*.6,h*.6,d*.6,.4);return;}
 if(/sandbag|barricade/.test(type)){const m=this.mat('cloth',0xb2ac91);for(let yy=.18;yy<h;yy+=.32)for(let xx=-w/2+.35;xx<w/2;xx+=.66)this.batch('sphere',m,x+xx+(Math.round(yy*3)%2?.12:0),y+yy,z,.4,.21,d*.5);return;}
 const kind=/crate|wood|cover/.test(type)?'wood':/steel|container|train|metal|wagon/.test(type)?'metal':this.chapter===3?'tile':'concrete',m=this.mat(kind,o.color||0xffffff);this.b(m,x,y+h/2,z,w,h,d,o.yaw||0);this.b(this.mat('metal',0x747b75),x,y+h+.035,z,w+.04,.07,d+.04,o.yaw||0);
 if(/wall|partition/.test(type)&&this.chapter===3)this.b(this.mat('plain',0x4f7971),x,y+.9,z,w+.025,.3,d+.025);if(/crate|box|container/.test(type))for(const side of[-1,1])this.b(this.mat('metal',0x8a8a7d),x+side*w*.34,y+h*.5,z,.06,h+.03,d+.035);
}
vehicle(x,z,y,w=2,d=4.7,color=0x727e6c,truck=false){
 const m=this.mat('metal',color),rubber=this.mat('plain',0x1e2527,.95),glass=this.mat('plain',0x283f48,.16,.4);this.b(m,x,y+.75,z,w,.6,d);this.b(m,x,y+1.3,z-d*.25,w*.93,.9,d*.32);this.b(glass,x,y+1.46,z-d*.42,w*.79,.48,.04);
 if(truck){this.b(this.mat('cloth',0x969988),x,y+1.5,z+d*.21,w*.95,1.25,d*.48);this.b(m,x,y+1.05,z+d*.44,w,.4,.1);}else{this.b(m,x,y+1.23,z,w*.9,.55,d*.51);this.b(glass,x,y+1.32,z+d*.255,w*.8,.36,.04);}
 for(const side of[-1,1])for(const zz of[-d*.31,d*.31]){this.batch('cylinder',rubber,x+side*w*.51,y+.5,z+zz,.38,.24,.38,0,0,Math.PI/2);this.batch('cylinder',this.mat('metal',0x9ba39b),x+side*w*.54,y+.5,z+zz,.18,.25,.18,0,0,Math.PI/2);}for(const side of[-1,1])this.b(this.mat('plain',0xc7c1a0),x+side*w*.31,y+.82,z-d*.5-.03,.3,.18,.05);this.b(this.mat('metal',0x8b9290),x,y+.5,z-d*.5-.1,w+.16,.14,.19);
}
bed(x,z,y){const m=this.mat('metal',0x9daaa4);this.b(m,x,y+.54,z,1.1,.12,2.2);this.b(this.mat('cloth',0xe3e7dd),x,y+.7,z,1.02,.23,2.1);this.b(this.mat('cloth',0x6c9993),x,y+.83,z+.25,1.04,.12,1.3);this.b(this.mat('cloth',0xf1f0dc),x,y+.9,z-.74,.8,.2,.4);for(const dx of[-.46,.46])for(const dz of[-.89,.89])this.cy(m,x+dx,y+.3,z+dz,.03,.5);}
decoration(d){
 const t=String(d.type||'').toLowerCase(),x=d.x||0,z=d.z||0,y=d.y==null?this.floorY:d.y,w=d.w||4,dd=d.d||8;
 if(/street|floortile|platform/.test(t))return;
 if(/militarybridge|civilianbridge|^bridge$/.test(t)){this.bridge(d,t);return;}
 if(/train/.test(t)){const kind=d.kind||([1,7,8].includes(this.chapter)?'armored':'medical'),model=this.platformTrain(x,z,y,d.yaw==null?(w>dd?Math.PI/2:0):d.yaw,kind);if(kind==='medical')this.medicalTrain=model;else this.train=model;return;}
 if(/rail/.test(t)){const alongX=d.alongX==null?w>dd:!!d.alongX;this.rails(alongX?z:x,alongX?x-w/2:z-dd/2,alongX?x+w/2:z+dd/2,y,alongX);return;}
 if(/pine|tree/.test(t)){this.pine(x,z,d.h||6,y);return;}
 if(/lamp/.test(t)){if(this.chapter===3)this.ceilingLight(x,z,y+3.4,0xd7ebdb);else this.lamp(x,z,y,this.chapter===6?2.7:d.h||4.5);return;}
 if(/hospitalbed|stretcher|bed/.test(t)){this.bed(x,z,y);return;}
 if(/vehicle|car|truck/.test(t)){this.vehicle(x,z,y,d.w||2.2,d.d||4.8,d.color||0x7e8a7b,true);return;}
 if(/barricade/.test(t)){this.obstacle({...d,type:'sandbag',h:d.h||1});return;}
 if(/antenna/.test(t)){this.antenna(x,z,y);return;}
 if(/minecart/.test(t)){const m=this.mat('metal',0x838373);this.b(m,x,y+.7,z,1.2,.8,1.6);this.b(this.mat('rock'),x,y+1.12,z,1.07,.2,1.4);for(const side of[-1,1])for(const dz of[-.5,.5])this.batch('cylinder',m,x+side*.62,y+.24,z+dz,.2,.15,.2,0,0,Math.PI/2);return;}
 if(/sign/.test(t)){this.wallSign(d.text||d.label||'撤离路线 / EVACUATION',x,y+(d.h||2.2),z,w);return;}
 if(/turret/.test(t)){this.turret(x,z,y);return;}
 if(/water/.test(t)){this.b(this.mat('plain',0x354b59,.15,.2),x,y-.05,z,w,.08,dd);return;}
 if(/cable/.test(t)){this.pipe(x,z,y+(d.h||3),Math.max(w,dd));return;}
 if(/medical/.test(t)){this.b(this.mat('metal',0xc7d7cd),x,y+.5,z,1,.95,.7);return;}
 if(/drone/.test(t)){const model=new T.Group();model.position.set(x,y,z);this.root.add(model);this.box(this.mat('metal',0x566a6c),0,0,0,.5,.2,.6,model);for(const s of[-1,1])for(const s2 of[-1,1]){this.box(this.mat('metal'),s*.43,0,s2*.36,.75,.04,.05,model);this.mesh('torus',this.mat('metal'),s*.57,.03,s2*.4,.2,.025,.2,model).rotation.x=Math.PI/2;}this.props.set(d.id||'drone:'+x,model);return;}
 if(/helicopter/.test(t)){this.helicopter(x,z,y);return;}
 if(/allies/.test(t)){const m=this.human('ally');m.position.set(x,y,z);m.userData.staticActor=true;return;}
}
bridge(d,type){
 const x=d.x||0,z=d.z||0,y=d.y==null?this.floorY:d.y,w=d.w||7,dd=d.d||30,g=new T.Group();g.position.set(x,y,z);this.root.add(g);const metal=this.mat('metal',type==='militarybridge'?0x717c7d:0x8c9690),deck=this.mat('concrete');this.box(deck,0,-.27,0,w,.55,dd,g);
 const alongX=w>dd,span=alongX?w:dd,half=(alongX?dd:w)/2-.15;
 for(const s of[-1,1]){for(let v=-span/2;v<=span/2;v+=4){this.box(metal,alongX?v:s*half,1.8,alongX?s*half:v,.15,3.7,.16,g);if(v<span/2){const a=this.box(metal,alongX?v+2:s*half,1.8,alongX?s*half:v+2,alongX?5.3:.12,.12,alongX?.12:5.3,g);if(alongX)a.rotation.z=.73;else a.rotation.x=-.73;}}for(const yy of[.55,3.6])this.box(metal,alongX?0:s*half,yy,alongX?s*half:0,alongX?span:.16,.16,alongX?.16:span,g);}
 for(let v=-span/2;v<=span/2;v+=12)this.box(metal,alongX?v:0,-5,alongX?0:v,.9,10,1.1,g);g.userData={type,baseY:y};if(type==='militarybridge')this.militaryBridge=g;if(type==='civilianbridge')this.civilianBridge=g;if(type==='bridge'&&this.chapter===1)this.entryBridge=g;
}
platformTrain(x,z,y,yaw=0,kind='armored'){
 const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;this.root.add(g);const shell=this.mat('metal',kind==='medical'?0xc4d3ca:0x63706a),dark=this.mat('metal',0x363e3d),glass=this.mat('plain',0x25424b,.21,.3);
 if(this.chapter===8&&kind==='armored'){
  for(let zz=-24;zz<=20;zz+=10){this.box(dark,0,-.65,zz,8.4,.6,9.6,g);this.box(shell,0,-.14,zz,8.6,.25,9.8,g);for(const s of[-1,1]){this.box(shell,s*4.1,.57,zz,.22,1.15,9.2,g);this.box(dark,s*3.2,-.72,zz-3.3,.4,.85,1.5,g);this.box(dark,s*3.2,-.72,zz+3.3,.4,.85,1.5,g);for(let j=0;j<3;j++)this.box(dark,s*4.22,.6,zz-3+j*3,.02,.5,1.1,g);}}
 }else for(let c=0;c<(kind==='medical'?3:2);c++){
  const zz=c*10.6;this.box(dark,0,.46,zz,3,.45,9.9,g);this.box(shell,0,1.92,zz,2.9,2.45,9.8,g);this.box(shell,0,3.17,zz,3.02,.22,10.05,g);
  for(const s of[-1,1]){for(let i=0;i<5;i++)this.box(glass,s*1.46,2.25,zz-3.55+i*1.64,.03,.7,.96,g);this.box(dark,s*1.47,1.95,zz-4.3,.05,1.88,.65,g);for(const dz of[-3.4,3.4])this.mesh('cylinder',dark,s*1.13,.38,zz+dz,.47,.2,.47,g).rotation.z=Math.PI/2;}
  if(kind==='medical'){this.box(this.mat('plain',0x9c4f46),1.49,1.8,zz,.035,.78,.21,g);this.box(this.mat('plain',0x9c4f46),1.5,1.8,zz,.035,.21,.78,g);}else for(const s of[-1,1])for(let i=0;i<4;i++)this.box(dark,s*1.49,1.1,zz-3+i*2,.03,.28,1.4,g);
 }
 g.userData={kind,base:{x,y,z}};return g;
}
turret(x,z,y){const m=this.mat('metal',0x717a69);this.cy(m,x,y+.6,z,.5,1.2);this.b(m,x,y+1.2,z,1.2,.7,1.3);this.batch('cylinder',m,x,y+1.35,z-1.7,.09,3,.09,0,Math.PI/2);}
helicopter(x,z,y){const g=new T.Group();g.position.set(x,y,z);this.root.add(g);const m=this.mat('metal',0x76816e);this.mesh('sphere',m,0,0,0,1.35,1.1,2.3,g);this.box(m,0,.12,3,.35,.4,4.1,g);this.box(m,0,2.4,4.6,.13,2.3,.7,g);this.box(m,0,1.2,0,8,.06,.17,g);for(const s of[-1,1])this.box(m,s*1,-1,0,.11,.1,4.2,g);this.props.set('helicopter',g);}
supply(p){const g=new T.Group();g.position.set(p.x,p.y==null?this.floorY:p.y,p.z);this.root.add(g);this.box(this.mat('metal',0x617d67),0,.35,0,.8,.7,.62,g);this.box(this.mat('metal',0x97aa85),0,.73,0,.85,.09,.67,g);this.box(this.mat('plain',0xe6dabc),0,.38,.32,.4,.22,.025,g);this.props.set('supply:'+p.id,g);}
interactive(p){const t=String(p.type||p.id||''),x=p.x||0,z=p.z||0,y=p.y==null?this.floorY:p.y,g=new T.Group();g.position.set(x,y,z);this.root.add(g);const m=this.mat('metal',/battery|equipment/.test(t)?0xbaa66e:0x7d9285);this.box(m,0,.65,0,.8,1.3,.65,g);this.box(this.mat('plain',0x243d41),0,.93,.34,.55,.32,.03,g);this.box(this.glow(0x9cd3b4,1),.19,1.22,.35,.06,.045,.02,g);for(let i=0;i<4;i++)this.box(this.mat('metal',0x303c3b),-.2+i*.13,.45,.34,.06,.04,.02,g);this.props.set('interact:'+p.id,g);}
human(kind='enemy'){
 const g=new T.Group();this.root.add(g);const coat=this.mat('cloth',kind==='doctor'?0xf4f1de:kind==='boss'?0x505b5b:kind==='ally'?0x6f8781:0x87907a),pants=this.mat('cloth',kind==='doctor'?0xa8bab3:0x64716c),boots=this.mat('plain',0x282e2e),skin=this.mat('plain',0xc2a18c,.92),vest=this.mat('cloth',kind==='boss'?0x4d4f4b:0x626d5b),limb=(x,y,z,w,h,d,m,parent=g)=>this.box(m,x,y,z,w,h,d,parent);
 const legs=[];for(const s of[-1,1]){const p=new T.Group();p.position.set(s*.125,.88,0);g.add(p);limb(0,-.22,0,.18,.44,.23,pants,p);limb(0,-.59,0,.16,.38,.2,pants,p);limb(0,-.8,-.045,.2,.16,.32,boots,p);legs.push(p);}
 this.mesh('sphere',coat,0,1.2,0,.25,.36,.16,g);limb(0,1.17,0,.44,.55,.28,coat);
 if(kind==='doctor'){limb(0,.93,.01,.49,.52,.31,coat);limb(0,1.2,-.155,.1,.25,.025,this.mat('plain',0x994b46));limb(0,1.2,-.17,.25,.085,.025,this.mat('plain',0x994b46));}
 else{limb(0,1.18,-.15,.4,.47,.1,vest);for(let i=0;i<3;i++)limb(-.13+i*.13,1.05,-.225,.1,.17,.07,vest);limb(0,1.46,0,.34,.05,.25,vest);}
 const head=this.mesh('sphere',skin,0,1.65,-.01,.135,.18,.13,g);this.mesh('sphere',this.mat('plain',kind==='doctor'?0x3b3631:0x3b4039),0,1.75,.025,.143,.105,.14,g);
 for(const s of[-1,1]){this.mesh('sphere',skin,s*.135,1.65,-.01,.025,.045,.025,g);limb(s*.05,1.68,-.125,.032,.014,.01,this.mat('plain',0x282b28));limb(s*.05,1.705,-.125,.05,.01,.013,this.mat('plain',0x51483b));}
 this.mesh('sphere',skin,0,1.645,-.134,.025,.038,.026,g);limb(0,1.59,-.12,.061,.008,.012,this.mat('plain',0x765952));
 if(kind!=='doctor'){this.mesh('sphere',coat,0,1.79,0,.158,.087,.15,g);limb(0,1.76,-.08,.3,.025,.2,coat);}
 const arms=[];for(const s of[-1,1]){const a=new T.Group();a.position.set(s*.29,1.41,0);g.add(a);limb(0,-.18,0,.15,.36,.19,coat,a);limb(0,-.43,-.08,.14,.25,.16,coat,a);limb(0,-.56,-.12,.13,.11,.13,skin,a);arms.push(a);}
 let gun=null,warning=null;if(kind!=='doctor'){gun=new T.Group();g.add(gun);gun.position.set(.19,1.02,-.29);limb(0,0,-.12,.07,.08,.48,this.mat('metal',0x343d3d),gun);this.mesh('cylinder',this.mat('metal',0x48514b),0,.015,-.47,.015,.3,.015,gun).rotation.x=Math.PI/2;limb(0,-.1,-.12,.05,.17,.07,this.mat('metal'),gun);warning=this.mesh('sphere',this.glow(0xe98763,1.8),0,.015,-.63,.035,.035,.035,gun);warning.visible=false;}
 g.userData={kind,legs,arms,gun,warning,head,lastX:null,lastZ:null,phase:0};return g;
}
robot(){
 const g=new T.Group();this.root.add(g);const shell=this.mat('metal',0xb4a16a,.47,.62),dark=this.mat('metal',0x404e50),amber=this.glow(0xf6c471,1.4),legs=[];
 for(const s of[-1,1]){const p=new T.Group();p.position.set(s*.17,.86,0);g.add(p);this.box(dark,0,-.3,0,.17,.6,.2,p);this.mesh('sphere',shell,0,-.04,0,.15,.15,.15,p);this.box(shell,0,-.4,-.05,.19,.25,.23,p);this.box(dark,0,-.77,-.07,.25,.18,.35,p);legs.push(p);}
 this.box(shell,0,1.18,0,.57,.64,.35,g);this.box(dark,0,1.21,-.19,.43,.32,.035,g);for(let i=0;i<4;i++)this.box(shell,-.13+i*.085,1.13,-.213,.036,.16,.025,g);this.box(shell,0,1.73,0,.46,.34,.33,g);this.box(dark,0,1.75,-.18,.39,.16,.03,g);this.box(amber,0,1.76,-.204,.26,.045,.02,g);
 const arms=[];for(const s of[-1,1]){const a=new T.Group();a.position.set(s*.37,1.42,0);g.add(a);this.mesh('sphere',dark,0,0,0,.13,.13,.13,a);this.box(shell,0,-.24,0,.16,.4,.2,a);this.mesh('sphere',dark,0,-.46,0,.1,.1,.1,a);this.box(shell,0,-.61,-.03,.18,.23,.2,a);for(const dx of[-.055,.055])this.box(dark,dx,-.8,-.045,.037,.17,.08,a);arms.push(a);}
 this.box(amber,0,1.38,-.192,.16,.07,.025,g);g.userData={kind:'robot',legs,arms,lastX:null,lastZ:null,phase:0};return g;
}
makeWeather(type){const count=type==='rain'?600:280,a=new Float32Array(count*3),rnd=this.random(this.chapter*176);for(let i=0;i<count;i++){a[i*3]=(rnd()-.5)*54;a[i*3+1]=rnd()*25;a[i*3+2]=(rnd()-.5)*54;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(a,3));const mat=new T.PointsMaterial({color:type==='rain'?0x9eb6c7:0xebf1f0,size:type==='rain'?.047:.09,transparent:true,opacity:type==='rain'?.33:.73,depthWrite:false});this.weather=new T.Points(geo,mat);this.weather.userData={ownGeometry:true,ownMaterial:true,type};this.root.add(this.weather);}
actor(key,data,kind,dt){
 let m=this.actors.get(key);if(!m){m=kind==='robot'?this.robot():this.human(kind);this.actors.set(key,m);}if(!data){m.visible=false;return;}m.visible=data.visible!==false;if(!m.visible)return;
 const y=data.y==null?this.floorY:data.y;m.position.set(data.x||0,y,data.z||0);m.rotation.y=data.yaw||0;const dead=data.hp!=null&&data.hp<=0,u=m.userData,dx=u.lastX==null?0:m.position.x-u.lastX,dz=u.lastZ==null?0:m.position.z-u.lastZ,speed=Math.sqrt(dx*dx+dz*dz)/Math.max(dt,.001);u.phase+=speed>.15?Math.min(speed,5)*dt*2.2:0;const swing=speed>.15?Math.sin(u.phase)*.45:0;
 if(u.legs){u.legs[0].rotation.x=swing;u.legs[1].rotation.x=-swing;}if(u.arms){u.arms[0].rotation.x=-swing*.5;u.arms[1].rotation.x=kind==='doctor'?swing*.5:-.5;}
 if(u.kind==='robot'&&u.arms[1])u.arms[1].visible=!data.armLost&&!this._flags.buddyArmLost;
 if(data.captured){m.rotation.x=-.12;m.position.y=y-.45;if(u.arms)u.arms.forEach(a=>a.rotation.x=-2);}else if(dead){m.rotation.x=-Math.PI/2;m.position.y=y+.2;}else{m.rotation.x=data.wounded?-.22:0;if(data.wounded)m.position.y-=.25;}
 if(u.gun)u.gun.visible=!data.captured&&!dead;if(u.warning)u.warning.visible=!!data.warning&&!dead;u.lastX=m.position.x;u.lastZ=m.position.z;
}
effects(state){
 const list=(state.effects||[]).filter(e=>/tracer|explosion|impact|alliedFire/.test(e.type)).slice(-24);if(!this.fxPool)this.fxPool=[];
 for(let i=0;i<Math.max(list.length,this.fxPool.length);i++){let mesh=this.fxPool[i];const e=list[i];if(!e){if(mesh)mesh.visible=false;continue;}if(!mesh){mesh=this.mesh('sphere',this.special(new T.MeshBasicMaterial({color:0xffd99c,transparent:true,depthWrite:false,blending:T.AdditiveBlending})),0,0,0,1,1,1);mesh.castShadow=false;this.fxPool[i]=mesh;}mesh.visible=true;mesh.position.set(e.x||0,e.y==null?this.floorY+1:e.y,e.z||0);mesh.rotation.set(0,0,0);const age=clamp((e.life||.05)/(e.maxLife||.2),0,1);mesh.material.opacity=age;
 if(e.type==='tracer'&&e.x2!=null){const delta=new T.Vector3(e.x2,e.y2==null?e.y:e.y2,e.z2).sub(mesh.position),len=delta.length();mesh.position.addScaledVector(delta,.5);mesh.scale.set(.018,.018,len);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());}else{const s=e.type==='explosion'?(1-age)*3+.2:.06;mesh.scale.set(s,s,s);mesh.material.color.setHex(e.type==='explosion'?0xee9b50:0xffdeab);}}
}
render(state,dt=.016){
 if(!state||!state.world)return;dt=clamp(dt||.016,.001,.1);this.time+=dt;this._flags=state.flags||{};if(this.chapter!==state.chapter||this.world!==state.world)this.loadWorld(state);const p=state.player||{};
 this.camera.position.set(p.x||0,(p.y==null?this.floorY:p.y)+1.68,p.z||0);this.camera.rotation.set(p.pitch||0,p.yaw||0,0,'YXZ');this.sky.position.copy(this.camera.position);this.sun.position.set(this.camera.position.x-28,this.camera.position.y+52,this.camera.position.z+20);this.sun.target.position.copy(this.camera.position);
 this.actor('buddy',state.buddy,'robot',dt);this.actor('doctor',state.doctor,'doctor',dt);this.actor('boss',state.boss,'boss',dt);const visible=new Set(['buddy','doctor','boss']);for(const e of state.enemies||[]){const k='enemy:'+e.id;visible.add(k);this.actor(k,e,'enemy',dt);}for(const a of state.allies||[]){const k='ally:'+a.id;visible.add(k);this.actor(k,a,'ally',dt);}for(const p0 of state.patients||[]){const k='patient:'+p0.id;visible.add(k);this.actor(k,{...p0,visible:p0.visible!==false&&!p0.saved},'doctor',dt);const m=this.actors.get(k);if(m){m.rotation.x=-Math.PI/2;m.position.y=(p0.y==null?this.floorY:p0.y)+.65;}}
 for(const[k,m]of this.actors)if(!visible.has(k))m.visible=false;
 for(const[k,m]of this.props){if(k.startsWith('supply:')){const s=(state.supplies||[]).find(p0=>'supply:'+p0.id===k);m.visible=!s||(!s.taken&&!s.used);}if(k.startsWith('drone'))m.visible=!this._flags.reconDisabled;}
 if(this.militaryBridge){const broken=!!this._flags.militaryBridgeDestroyed;this.militaryBridge.position.y=this.militaryBridge.userData.baseY-(broken?10:0);this.militaryBridge.rotation.x=broken?.28:0;}if(this.entryBridge){this.entryBridge.visible=!this._flags.entryBridgeDestroyed;}if(this.civilianBridge)this.civilianBridge.visible=true;
 if(this.train&&state.train&&this.chapter!==1&&this.chapter!==7){this.train.position.set(state.train.x??this.train.userData.base.x,state.train.y??this.floorY,state.train.z??this.train.userData.base.z);if(this.chapter===8){this.train.visible=!this._flags.militaryBridgeDestroyed;}}
 if(this.medicalTrain){const mt=state.medicalTrain;this.medicalTrain.visible=this.chapter!==8||!!mt?.visible;if(mt)this.medicalTrain.position.set(mt.x||0,mt.y??this.floorY,mt.z||0);else if(state.train?.moving&&this.chapter===4)this.medicalTrain.position.x=state.train.x;}
 const target=state.mission?.target;this.targetMarker.visible=!!target;if(target){this.targetMarker.position.set(target.x,(target.y==null?this.floorY:target.y)+.06,target.z);this.targetMarker.material.opacity=.4+Math.sin(this.time*3)*.16;}
 if(this.weather){this.weather.position.set(p.x||0,this.floorY,p.z||0);const a=this.weather.geometry.attributes.position.array,rain=this.weather.userData.type==='rain';for(let i=0;i<a.length;i+=3){a[i+1]-=dt*(rain?19:1.3);a[i]+=(rain?-.8:.16)*dt;if(a[i+1]<0){a[i+1]=25;a[i]=(a[i]+27)%54-27;}}this.weather.geometry.attributes.position.needsUpdate=true;}
 this.effects(state);const shot=(p.lastShot!=null&&p.lastShot!==this.lastShot&&p.lastShot>0)||(this.lastAmmo!=null&&p.ammo<this.lastAmmo&&!p.reload);if(shot)this.recoil=1;this.lastShot=p.lastShot;this.lastAmmo=p.ammo;this.recoil=Math.max(0,this.recoil-dt*8);
 const reload=p.reload?Math.sin(clamp(typeof p.reload==='number'?p.reload/2:.5,0,1)*Math.PI):0;this.weapon.position.set(.24,-.245-reload*.15,-.28+this.recoil*.055);this.weapon.rotation.set(.015+this.recoil*.055+reload*.3,-.045,-reload*.32);this.muzzleFlash.visible=shot||this.recoil>.75;this.muzzleFlash.rotation.z=this.time*25;
 this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);const calls=this.renderer.info.render.calls,tri=this.renderer.info.render.triangles;if(p.hasRifle!==false&&state.mode!=='title'&&state.mode!=='ending'){this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.render(this.weaponScene,this.weaponCamera);}this.drawCalls=calls+this.renderer.info.render.calls;this.triangles=tri+this.renderer.info.render.triangles;
 this._frames++;this._fpsClock+=dt;if(this._fpsClock>=.75){this._fps=Math.round(this._frames/this._fpsClock);this._frames=0;this._fpsClock=0;}
}
resize(){const w=this.canvas.clientWidth||global.innerWidth||1280,h=this.canvas.clientHeight||global.innerHeight||720;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.weaponCamera.aspect=w/h;this.weaponCamera.updateProjectionMatrix();}
setQuality(q){this.quality=['low','medium','high'].includes(q)?q:'medium';this.renderer.setPixelRatio(q==='high'?Math.min(global.devicePixelRatio||1,1.5):1);this.renderer.shadowMap.enabled=q!=='low';this.sun.shadow.mapSize.set(q==='high'?2048:1024,q==='high'?2048:1024);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}this.resize();}
getInfo(){const i=this.renderer.info;return{fps:this._fps,quality:this.quality,drawCalls:this.drawCalls||0,triangles:this.triangles||0,geometries:i.memory.geometries,textures:i.memory.textures,renderer:'Three.js r'+T.REVISION,firstPerson:true,fov:92};}
dispose(){this.disposed=true;this.disposeWorld();for(const g of Object.values(this.geometry))g.dispose();this.sky.geometry.dispose();for(const m of this.materials.values())m.dispose();for(const t of this.textures.values())t.dispose();for(const maps of Object.values(this.surfaceMaps||{}))for(const t of Object.values(maps))t.dispose();for(const m of this.owned)m.dispose();this.envSource.dispose();this.envTarget.dispose();this.renderer.dispose();}
}
global.DaybreakRenderer=DaybreakRenderer;if(typeof module!=='undefined'&&module.exports)module.exports={DaybreakRenderer};
})(typeof window!=='undefined'?window:globalThis);
