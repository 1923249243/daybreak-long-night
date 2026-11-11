/* 第一人称输入、八关剧情与菜单。主逻辑与渲染独立。 */
(() => {'use strict';
 const $=id=>document.getElementById(id),canvas=$('view'),overlay=$('overlay');
 const keys=new Set(),edge={interact:false,reload:false,jump:false,fire:false};
 let settings={volume:.35,quality:'low',assist:true,sensitivity:.75},game,renderer,audio;
 let pointer={fire:false,aim:false,drag:false,x:0,y:0},yaw=0,pitch=0,modeSeen='',chapterSeen=0;
 let last=performance.now(),fpsFrames=0,fpsElapsed=0,toastLeft=0,dialogueLeft=0,dialogues=[],opening=false,hitLeft=0;
 window.__daybreakErrors=[];
 function fail(e){const s=e?.stack||String(e);window.__daybreakErrors.push(s);$('error').hidden=false;$('error').querySelector('p').textContent=s;$('loading').hidden=true;}
 window.addEventListener('error',e=>{window.__daybreakErrors.push(e.message);if(!window.__daybreakReady)fail(e.error||e.message);});window.addEventListener('unhandledrejection',e=>{window.__daybreakErrors.push(String(e.reason));if(!window.__daybreakReady)fail(e.reason);});
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function clearInput(){keys.clear();pointer.fire=pointer.aim=pointer.drag=false;edge.interact=edge.reload=edge.jump=edge.fire=false;}
 function unlock(){if(document.pointerLockElement===canvas)document.exitPointerLock?.();}
 function capture(){audio.init();try{const p=canvas.requestPointerLock?.();if(p?.catch)p.catch(()=>{});}catch{}canvas.focus({preventScroll:true});}
 function say(text,priority=false){if(!text)return;if(priority){dialogues=[];dialogueLeft=0;}dialogues.push(String(text));}
 function toast(text){if(!text)return;$('toast').textContent=text;$('toast').hidden=false;toastLeft=3.5;}
 function event(e){if(!e)return;audio?.play(e.type);if(e.type==='state'){clearInput();if(e.mode==='playing'){yaw=game?.state.player.yaw||0;pitch=game?.state.player.pitch||0;canvas.focus({preventScroll:true});}else unlock();}else if(e.type==='dialogue')say(e.text);else if(e.type==='hit'){hitLeft=.12;}else if(['mission','checkpoint','supply','rescue','warning','message'].includes(e.type))toast(e.text);}
 function chapter(){return DaybreakStory.chapters[game.state.chapter]||DaybreakStory.chapters[1];}
 function button(text,fn,cls=''){const b=el('button',cls,text);b.type='button';b.addEventListener('click',()=>{audio.init();clearInput();fn();});return b;}
 function start(id){game.start(id);opening=false;}
 function begin(){capture();game.begin();yaw=game.state.player.yaw||0;pitch=game.state.player.pitch||0;opening=false;}
 function resume(){capture();game.resume();yaw=game.state.player.yaw||0;pitch=game.state.player.pitch||0;}
 function title(){game.title();modeSeen='';menu();}
 function progress(){return game.progress||{unlocked:1,completed:[]};}
 function card(name,tag,paragraphs,quote){const box=el('div','briefing-card');box.append(el('span','eyebrow',tag),el('h1','',name));for(const p of paragraphs||[])box.append(el('p','',p));if(quote)box.append(el('p','quote',quote));return box;}
 function settingsOpen(){if(game.state.mode==='playing')game.pause();unlock();$('settings').hidden=false;$('settings-close').focus();}
 function settingsClose(){settings={volume:Number($('volume').value)/100,quality:$('quality').value,assist:$('assist').checked,sensitivity:Number($('sensitivity').value)/100};audio.setVolume(settings.volume);renderer.setQuality(settings.quality);game.setAimAssist?.(settings.assist);try{localStorage.setItem('daybreak.longnight.settings.v1',JSON.stringify(settings));}catch{}$('settings').hidden=true;}
 function menu(){
  const s=game.state,c=chapter(),mode=s.mode;overlay.replaceChildren();overlay.hidden=mode==='playing';$('hud').hidden=mode!=='playing';$('toast').hidden=true;toastLeft=0;
  if(mode==='playing'){canvas.focus({preventScroll:true});return;}
  clearInput();$('dialogue').hidden=true;unlock();
  if(mode==='title'){
   const m=el('div','menu-content');m.append(el('div','eyebrow','八关单人第一人称战役'),el('h1','','白昼之前'),el('div','subtitle','长夜行动'),el('p','menu-story','天亮前，顾衡将炮击城外救援队。他控制着铁路、补给和山口要塞。沈砚、林夏、梁肃与九号，要从一场失败的撤离中，打开整条走廊。'));
   const row=el('div','menu-actions');if(game.hasSave)row.append(button('继续战役',()=>{game.continue();opening=false;},'primary'));row.append(button('从第一关开始',()=>start(1),game.hasSave?'':'primary'),button('游玩设置',settingsOpen,'quiet'));m.append(row);
   const grid=el('div','chapter-list');for(let i=1;i<=8;i++){const sc=DaybreakStory.chapters[i],unlocked=i<=(progress().unlocked||1),b=button('',()=>start(i),s.chapter===i?'current':'');b.disabled=!unlocked;b.append(el('small','',sc.number+' / '+sc.location),document.createTextNode(unlocked?sc.title:'尚未解锁'));if(progress().completed?.includes(i))b.append(el('small','chapter-done','已完成'));grid.append(b);}m.append(grid);
   m.append(el('p','footnote','WASD 移动，鼠标转向与射击，E 互动。开场即见顾衡与装甲列车。每关独立地图，任务阶段自动保存。\n第一人称视野92°，无镜头晃动或动态模糊。开源版本可完全离线游玩。'));overlay.append(m);
  }else if(mode==='briefing'){
   const box=card(c.title,'第 '+c.number+' / 08 关 · '+c.place,c.intro,c.quote);box.append(el('p','mission-summary',c.task));const a=el('div','menu-actions');a.append(button('进入'+c.location,begin,'primary'),button('返回战役菜单',title,'quiet'));box.append(a);overlay.append(box);
  }else if(mode==='paused'){
   const box=card('行动已暂停',c.number+' / '+c.location,['敌人、守点和补给冷却已停下。继续时，视线会留在原来的方向。']);const a=el('div','menu-actions');a.append(button('继续行动',resume,'primary'),button('游玩设置',settingsOpen),button('从检查点重试',()=>{capture();game.restartCheckpoint();},'quiet'),button('返回战役菜单',title,'quiet'));box.append(a);overlay.append(box);
  }else if(mode==='dead'){
   const box=card('再试一次',c.location+' / 行动中断',[s.deathReason||'本次行动中断。可以从最近任务阶段继续。']);const a=el('div','menu-actions');a.append(button('从检查点继续',()=>{capture();game.restartCheckpoint();opening=true;},'primary'),button('返回战役菜单',title,'quiet'));box.append(a);overlay.append(box);
  }else if(mode==='chapterComplete'){
   const box=card(c.title+' · 完成',c.place,c.end);box.append(el('p','mission-summary',c.next));const a=el('div','menu-actions');a.append(button('进入下一关',()=>{game.nextChapter();opening=false;},'primary'),button('返回战役菜单',title,'quiet'));box.append(a);overlay.append(box);audio.play('chapterComplete');
  }else if(mode==='ending'){
   const end=DaybreakStory.ending,box=card(end.title,'长夜行动 / 尾声',end.paragraphs,end.quote);box.classList.add('ending-card');const roll=el('div','rollcall');roll.append(el('span','','伤员 12 / 12 已抵达'),el('span','','顾衡 · 已拘押'),el('span','','九号 · 已归队'));box.append(roll);const a=el('div','menu-actions');a.append(button('重温第一关',()=>start(1),'primary'),button('章节选择',title,'quiet'));box.append(a);overlay.append(box);audio.play('ending');
  }
 }
 function hud(dt){
  const s=game.state,p=s.player,b=s.buddy||{},m=s.mission,c=chapter();$('chapter-tag').textContent=c.number+' / 08 · '+c.location;$('objective-text').textContent=m.label||c.title;
  let detail=s.chapter===3?'伤员已转移 '+(m.saved||s.stats.rescued||0)+' / 12':c.subtitle;
  if(m.target){const dx=m.target.x-p.x,dz=m.target.z-p.z,d=Math.hypot(dx,dz),a=Math.atan2(Math.sin(Math.atan2(-dx,-dz)-p.yaw),Math.cos(Math.atan2(-dx,-dz)-p.yaw));detail+=' · '+(d<2.5?'目标就在附近':Math.abs(a)>2.4?'↓ 目标在身后':a>.35?'← 目标在左侧':a<-.35?'→ 目标在右侧':'↑ 前往目标')+' '+Math.round(d)+'m';}
  $('objective-detail').textContent=detail;
  let f=Number(m.progress)||0;if(f>1)f/=100;$('mission-progress').style.width=Math.min(1,Math.max(0,f))*100+'%';
  $('player-label').textContent=s.chapter===5?'梁肃 / 守桥队长':'沈砚 / 战斗工兵';const hp=Math.max(0,Math.ceil(p.hp));$('health-text').textContent=hp;$('health-fill').style.width=hp+'%';
  $('buddy-text').textContent=s.chapter===5?'工兵队 / 撤出伏击':b.damaged?'九号 / 机械臂受损':b.action==='repair'?'九号 / 正在抢修':'九号 / 同行中';
  const carry=p.carrying;const kind=carry==='buddy'?'带九号撤离':carry==='battery'?'搬运启动电池':carry==='equipment'?'搬运工兵器材':'正在转移伤员';
  $('weapon-label').textContent=carry?kind:p.hasRifle===false?'工程操作':'制式步枪';$('ammo-text').textContent=carry?'↗':p.hasRifle===false?'—':String(p.ammo||0);$('reserve-text').textContent=carry||p.hasRifle===false?'':' / '+(p.reserve||0);$('weapon-note').textContent=carry?'搬运时无法射击 · 按提示互动':p.reload>0?'正在装填…':'R 装填 · 绿色箱体 E 补给';
  $('prompt').hidden=!s.prompt;if(s.prompt){$('prompt').querySelector('span').textContent=s.prompt.replace(/^\s*E\s*/,'');$('prompt').querySelector('kbd').hidden=!/\bE\b|按E/.test(s.prompt);}
  const boss=s.boss,showBoss=!!boss&&s.chapter>=7&&boss.hp>0&&!boss.captured&&boss.active!==false;$('boss-panel').hidden=!showBoss;if(showBoss){$('boss-name').textContent=s.chapter===7?'顾衡 · 要塞反击':'顾衡 · 最后防线';$('boss-health').style.width=Math.max(0,Math.min(1,boss.hp/(boss.maxHp||boss.hp)))*100+'%';$('boss-note').textContent=boss.armored?'先解除重炮与护卫防线':'压住火力，夺取指挥车';}
  toastLeft-=dt;if(toastLeft<=0)$('toast').hidden=true;hitLeft=Math.max(0,hitLeft-dt);$('crosshair').classList.toggle('hit',hitLeft>0);
  if(s.mode==='playing'){
   if(!opening){opening=true;say(c.opening,true);}dialogueLeft-=dt;
   if(dialogueLeft<=0&&dialogues.length){const text=dialogues.shift(),i=text.indexOf('：');$('dialogue').querySelector('.dialogue-speaker').textContent=i>0&&i<14?text.slice(0,i):'战地通信';$('dialogue').querySelector('p').textContent=i>0&&i<14?text.slice(i+1):text;$('dialogue').hidden=false;dialogueLeft=Math.max(4.5,Math.min(9,text.length*.12));}else if(dialogueLeft<=0)$('dialogue').hidden=true;
  }
 }
 function input(){
  const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  if(keys.has('KeyJ')||keys.has('ArrowLeft'))yaw+=.022;if(keys.has('KeyL')||keys.has('ArrowRight'))yaw-=.022;if(keys.has('KeyI'))pitch=Math.min(1.3,pitch+.018);if(keys.has('KeyK'))pitch=Math.max(-1.3,pitch-.018);
  const r={mx:-Math.sin(yaw)*f+Math.cos(yaw)*side,mz:-Math.cos(yaw)*f-Math.sin(yaw)*side,yaw,pitch,fire:pointer.fire||edge.fire,aim:pointer.aim,interact:edge.interact,reload:edge.reload,jump:edge.jump,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),crouch:keys.has('KeyC')||keys.has('ControlLeft')};edge.interact=edge.reload=edge.jump=edge.fire=false;return r;
 }
 document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(!$('settings').hidden)settingsClose();else if(game?.state.mode==='playing')game.pause();else if(game?.state.mode==='paused')resume();return;}
  if(e.target?.closest?.('input,select,textarea,button'))return;if(!game||game.state.mode!=='playing'||!$('settings').hidden)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)edge.interact=true;if(e.code==='KeyR'&&!e.repeat)edge.reload=true;if(e.code==='Space'&&!e.repeat)edge.jump=true;if(e.code==='Enter')dialogueLeft=0;audio.init();
 });document.addEventListener('keyup',e=>keys.delete(e.code));
 canvas.addEventListener('pointerdown',e=>{if(game?.state.mode!=='playing')return;audio.init();pointer.x=e.clientX;pointer.y=e.clientY;if(e.button===0){pointer.fire=edge.fire=true;capture();}if(e.button===2){pointer.aim=true;pointer.drag=true;}canvas.focus();});
 document.addEventListener('pointermove',e=>{if(!game||game.state.mode!=='playing')return;let dx=0,dy=0;if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(pointer.drag){dx=e.clientX-pointer.x;dy=e.clientY-pointer.y;}pointer.x=e.clientX;pointer.y=e.clientY;if(dx||dy){yaw-=dx*.0024*settings.sensitivity;pitch=Math.max(-1.3,Math.min(1.3,pitch-dy*.0024*settings.sensitivity));}});
 window.addEventListener('pointerup',e=>{if(e.button===0)pointer.fire=false;if(e.button===2)pointer.aim=pointer.drag=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&game?.state.mode==='playing')game.pause();});
 window.addEventListener('blur',()=>{clearInput();if(game?.state.mode==='playing')game.pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(game?.state.mode==='playing')game.pause();}});
 $('pause-button').addEventListener('click',()=>game.pause());$('settings-close').addEventListener('click',settingsClose);$('error-reload').addEventListener('click',()=>location.reload());
 for(const name of ['volume','sensitivity'])$(name).addEventListener('input',()=>{$(name+'-value').textContent=$(name).value+'%';if(name==='volume')audio.setVolume(Number($('volume').value)/100);});
 try{
  let storage;try{storage=localStorage;const p=JSON.parse(storage.getItem('daybreak.longnight.settings.v1')||'null');if(p&&typeof p==='object')settings={...settings,...p};}catch{}
  audio=new DaybreakAudio();audio.setVolume(settings.volume);renderer=new DaybreakRenderer(canvas);renderer.setQuality(settings.quality);game=DaybreakGame.create({storage,onEvent:event,difficulty:'story',aimAssist:settings.assist});
  for(const name of ['volume','sensitivity']){$(name).value=String(Math.round(settings[name]*100));$(name+'-value').textContent=$(name).value+'%';}$('quality').value=settings.quality;$('assist').checked=!!settings.assist;
  window.__daybreak={game,renderer,audio};
  function frame(now){const raw=Math.max(0,(now-last)/1000),dt=Math.min(.05,raw);last=now;
   try{if(game.state.mode==='playing')game.update(dt,input());if(modeSeen!==game.state.mode||chapterSeen!==game.state.chapter){if(chapterSeen!==game.state.chapter){opening=false;dialogues=[];dialogueLeft=0;}modeSeen=game.state.mode;chapterSeen=game.state.chapter;menu();}hud(dt);renderer.render(game.state,dt);
    fpsFrames++;fpsElapsed+=raw;if(fpsElapsed>=1){const info=renderer.getInfo()||{},gpu=String(info.gpu||'').match(/(?:RTX|GTX)\s*\d{3,4}|Radeon[^,)]*/i)?.[0]||'第一人称 3D';$('perf').textContent=Math.round(fpsFrames/fpsElapsed)+' FPS · '+gpu;fpsFrames=fpsElapsed=0;}
    if(!window.__daybreakReady){window.__daybreakReady=true;$('loading').hidden=true;}requestAnimationFrame(frame);
   }catch(e){fail(e);}
  }
  window.addEventListener('resize',()=>renderer.resize());requestAnimationFrame(frame);
 }catch(e){fail(e);}
})();
