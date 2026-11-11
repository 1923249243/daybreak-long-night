(() => {'use strict';
 class DaybreakAudio{
  constructor(){this.ctx=null;this.volume=.35;this.last={};}
  init(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.25;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{} }
  setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.master)this.master.gain.setTargetAtTime(this.volume*.25,this.ctx.currentTime,.05);}
  tone(f,duration=.15,level=.2,type='sine',slide=0,offset=0){if(!this.ctx||!this.master||this.volume===0)return;const t=this.ctx.currentTime+offset,o=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(15,slide),t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(level,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(gain);gain.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};}
  play(type){if(!this.ctx)return;const now=this.ctx.currentTime;if(now-(this.last[type]||-100)<(type==='shot'?.09:.15))return;this.last[type]=now;
   if(type==='shot'){this.tone(90,.07,.4,'triangle',30);this.tone(750,.025,.12,'sawtooth',130);}
   else if(type==='hurt')this.tone(110,.18,.12,'triangle',65);
   else if(type==='hit')this.tone(550,.04,.13,'triangle',300);
   else if(type==='supply'){this.tone(380,.17,.17);this.tone(570,.23,.15,'sine',0,.1);}
   else if(type==='rescue'||type==='checkpoint'){this.tone(330,.25,.15);this.tone(440,.3,.13,'sine',0,.13);this.tone(660,.4,.1,'sine',0,.26);}
   else if(type==='chapterComplete'||type==='ending'){[220,330,440,550].forEach((f,i)=>this.tone(f,.7,.11,'sine',0,i*.18));}
   else if(type==='reload')this.tone(180,.09,.12,'triangle',350);
   else if(type==='dialogue')this.tone(640,.08,.06,'sine',520);
  }
 }
 window.DaybreakAudio=DaybreakAudio;
})();
