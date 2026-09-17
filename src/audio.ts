import { TUNING } from './tuning';
import { TAUNTS, validTaunt, tauntGain } from './sound effect/taunts';
import type { Match } from './game';
﻿const SAMPLES=[...TAUNTS.map(name=>name+'.mp3'),'impactPunch_heavy_000','impactPunch_heavy_001','impactWood_heavy_000','impactWood_heavy_001','impactPlank_medium_000','impactPlank_medium_001','impactMetal_medium_000','impactMetal_light_000','impactSoft_heavy_000','impactSoft_medium_000','footstep_wood_000','footstep_wood_001','footstep_grass_000','footstep_grass_001','knifeSlice','knifeSlice2','drawKnife1','cloth1','cloth2','creak1','creak2','chop','metalLatch','metalClick','sword-1a.wav','sword-1b.wav','piercing-1a.wav','mechanic-loop.wav','mechanic-start.wav','stab but not hit.mp3','stab flesh.mp3','wood break.mp3','alarm before qte.mp3','gate_open.mp3','survivor on hook.mp3','chase-loop.wav','healing.mp3','machine_explosion.mp3'];
export function heartbeatProfile(danger:number){const d=Math.max(0,Math.min(1,danger));return {interval:TUNING.audio.heartbeat.interval-TUNING.audio.heartbeat.intervalDrop*d,gain:d===0?0:TUNING.audio.heartbeat.gain+TUNING.audio.heartbeat.gainRise*Math.pow(d,TUNING.audio.heartbeat.exponent),cutoff:TUNING.audio.heartbeat.cutoff+TUNING.audio.heartbeat.cutoffRise*d};}
export class Sound {
 private voices=new Map<number,{source:AudioBufferSourceNode;gain:GainNode}>();
 taunt(id:number,actor:number,m:Match){
  const c=this.context,a=m.actors[actor];if(!c||c.state!=='running'||!a||!validTaunt(id))return;
  const buffer=this.buffers.get(TAUNTS[id]+'.mp3');if(!buffer)return;
  const old=this.voices.get(actor);if(old){old.source.stop();this.voices.delete(actor);}
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=tauntGain(m.player,a)*this.volume;
  source.connect(gain);gain.connect(this.output!);this.voices.set(actor,{source,gain});source.start();
  source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(actor)?.source===source)this.voices.delete(actor);};
 }
 updateVoices(m:Match){const c=this.context;if(!c)return;for(const [id,voice] of this.voices){const a=m.actors[id];voice.gain.gain.setTargetAtTime(a&&!m.finished?tauntGain(m.player,a)*this.volume:0,c.currentTime,.05);}}
 private chaseLoop:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
 context:AudioContext|null=null;volume=Number(localStorage.getItem('fogbound-volume')??TUNING.audio.defaultVolume);lastBeat=-10;
 buffers=new Map<string,AudioBuffer>();ready:Promise<void>|null=null;private output:AudioNode|null=null;private stepAt=new Map<number,number>();private workLoops=new Map<string,{source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode}>();private workTicks=new Map<number,string>();
 init(){
  if(!this.context){this.context=new AudioContext();const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=10;limiter.ratio.value=8;limiter.connect(this.context.destination);this.output=limiter;}
  void this.context.resume();
  this.ready??=Promise.all(SAMPLES.map(async name=>{const response=await fetch(`./audio/${encodeURIComponent(name.includes('.')?name:name+'.ogg')}`);if(!response.ok)throw Error(`Audio ${name}: ${response.status}`);const buffer=await this.context!.decodeAudioData(await response.arrayBuffer());let peak=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const value of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(value));if(peak>0)for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=.9/peak;}this.buffers.set(name,buffer);})).then(()=>{}).catch(error=>console.error('Audio load failed',error));
 }
 sample(name:string,gain=1,rate=1,delay=0,cutoff=18000,duration?:number){
  const c=this.context,buffer=this.buffers.get(name);if(!c||!buffer||!this.volume||c.state!=='running')return;
  const src=c.createBufferSource(),amp=c.createGain(),filter=c.createBiquadFilter();src.buffer=buffer;src.playbackRate.value=rate;filter.type='lowpass';filter.frequency.value=cutoff;amp.gain.value=gain*this.volume;src.connect(filter);filter.connect(amp);amp.connect(this.output!);const start=c.currentTime+delay;src.start(start);if(duration!==undefined){amp.gain.setValueAtTime(gain*this.volume,start);amp.gain.setValueAtTime(gain*this.volume,start+Math.max(0,duration-.045));amp.gain.linearRampToValueAtTime(0,start+duration);src.stop(start+duration);}src.onended=()=>{src.disconnect();filter.disconnect();amp.disconnect();};
 }
 event(type:string,intensity=1){
  if(!this.buffers.size)return;
  const play=(name:string,gain=1,rate=1,delay=0,cutoff=18000,duration?:number)=>this.sample(name,gain*intensity,rate,delay,cutoff,duration),variation=Math.random()>.5;
  switch(type){
   case 'generator-blast':play('machine_explosion.mp3',1);break;
    case 'weapon-block':play('impactMetal_light_000',.65,1.25,0,18000,.18);play('impactWood_heavy_001',.4,1.1,0,18000,.2);break;
    case 'charge':play('drawKnife1',.5,.8);play('cloth1',.25,.8);break;
   case 'swing':play(variation?'knifeSlice':'knifeSlice2',1.05,1.12);break;
   case 'miss':play('stab but not hit.mp3',.85,1);break;
   case 'hit':play('stab flesh.mp3',.95,1);break;
   case 'pallet':play('impactWood_heavy_000',1);play('impactPlank_medium_000',.7,.85,.09);break;
   case 'stomp':play('footstep_wood_000',.8,.8,0,18000,.16);play('impactWood_heavy_001',.9,.9,0,18000,.24);break;
   case 'metal-kick':play('impactMetal_medium_000',.9,.7);break;
   case 'chop':play('chop',.8,.9);play('impactWood_heavy_001',.65,.85,.025);break;
   case 'break':play('wood break.mp3',.9,1,0,18000,.42);break;
   case 'hook':play('survivor on hook.mp3',.9);break;
   case 'rescue':play('metalLatch',.8,1.15);play('cloth1',.65,.9,.1);break;
   case 'locker-alert':play('creak1',.9,1.7);play('creak2',.65,1.9,.2);break;
   case 'locker':play('creak1',.65,.9);play('metalLatch',.5);break;
   case 'locker-grab':play('cloth2',.9,.8);play('impactSoft_medium_000',.6);break;
   case 'pickup':play('cloth2',.75,.7);play('impactSoft_medium_000',.4,.8);break;
   case 'vault':play('cloth1',.6,1.1);play('footstep_wood_000',.6,.95,.35);break;
   case 'land':play('impactSoft_heavy_000',1,.8);play('footstep_grass_000',.6,.75,.05);break;
   case 'stairs':for(let i=0;i<3;i++)play(i%2?'footstep_wood_000':'footstep_wood_001',.5,1,i*.16);break;
   case 'kick':play('impactMetal_medium_000',.8,.7);break;
   case 'skill-warning':play('alarm before qte.mp3',.7);break;
   case 'skill':play('metalClick',.65,1.25);break;
   case 'success':case 'heal':play('cloth1',.5,1.3);play('metalClick',.3,1.5);break;
   case 'fail':play('impactMetal_medium_000',.9,.8);break;
   case 'gate':play('gate_open.mp3',.8);break;
   case 'generator':case 'hatch':play('metalLatch',.8,.65);play('creak2',.65,.7,.1);break;
   case 'barrier':play('impactMetal_medium_000',.55,.6);play('creak2',.3,.6);break;
    case 'escape':play('cloth1',.5);break;
   case 'death':play('creak1',.9,.55);play('impactMetal_light_000',.6,.65,.15);break;
  }
 }
 chaseMusic(active:boolean){
  const c=this.context,buffer=this.buffers.get('chase-loop.wav');if(!c||c.state!=='running')return;
  if(active&&buffer&&!this.chaseLoop){
   const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.output!);source.start();this.chaseLoop={source,gain};
   source.onended=()=>{source.disconnect();gain.disconnect();};
  }
  if(this.chaseLoop){const gain=this.chaseLoop.gain.gain;gain.setTargetAtTime(active?this.volume*TUNING.audio.chaseVolume:0,c.currentTime,active?.3:.55);}
  if(!active)this.stopChase();
 }
 stopChase(){
  const loop=this.chaseLoop,c=this.context;if(!loop||!c)return;
  loop.gain.gain.setTargetAtTime(0,c.currentTime,.3);loop.source.stop(c.currentTime+1.5);this.chaseLoop=null;
 }
 stopWork(){
  for(const voice of this.voices.values())voice.source.stop();this.voices.clear();
  this.stopChase();
  const c=this.context;for(const loop of this.workLoops.values()){if(c){loop.gain.gain.cancelScheduledValues(c.currentTime);loop.gain.gain.setTargetAtTime(0,c.currentTime,.025);loop.source.stop(c.currentTime+.12);}else loop.source.stop();}this.workLoops.clear();this.workTicks.clear();
 }
 work(jobs:Array<{id:number;key:string;kind:string;elapsed:number;intensity:number}>){
  const c=this.context;if(!c||c.state!=='running')return;
  const engines=new Map<string,number>();for(const job of jobs)if(job.kind==='repair'||job.kind==='heal')engines.set(job.key,Math.max(engines.get(job.key)??0,job.intensity));
  for(const [key,loop] of this.workLoops)if(!engines.has(key)){loop.gain.gain.setTargetAtTime(0,c.currentTime,.03);loop.source.stop(c.currentTime+.15);this.workLoops.delete(key);}

  for(const [key,intensity] of engines){
   const healing=key.startsWith('heal:'),buffer=this.buffers.get(healing?'healing.mp3':'mechanic-loop.wav');
   let loop=this.workLoops.get(key);if(!loop&&buffer){const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;source.playbackRate.value=healing?1:.8;filter.type='lowpass';filter.frequency.value=healing?14000:1800;source.connect(filter);filter.connect(gain);gain.connect(this.output!);gain.gain.value=0;source.start();loop={source,gain,filter};this.workLoops.set(key,loop);source.onended=()=>{source.disconnect();gain.disconnect();filter.disconnect();};if(!healing)this.sample('mechanic-start.wav',intensity*.25,.8);}
   if(loop)loop.gain.gain.setTargetAtTime(intensity*this.volume*TUNING.audio.workVolume,c.currentTime,.07);
  }
  for(const job of jobs){const tick=Math.floor(job.elapsed/(job.kind==='repair'?.42:.55)),token=job.key+':'+tick;if(this.workTicks.get(job.id)===token)continue;this.workTicks.set(job.id,token);
   if(job.kind==='repair'){this.sample(tick%2?'metalClick':'impactMetal_light_000',job.intensity*.38,tick%2?1.1:.9);if(tick%3===0)this.sample('cloth1',job.intensity*.17,.85);}
   else if(job.kind==='rescue'||job.kind==='hook')this.sample(tick%2?'cloth1':'cloth2',job.intensity*.4,.8);
   else if(job.kind==='gate'){this.sample('metalLatch',job.intensity*.25,.75);this.sample('creak1',job.intensity*.25,.8);}
  }
  for(const id of this.workTicks.keys())if(!jobs.some(j=>j.id===id))this.workTicks.delete(id);
 }
 footstep(id:number,time:number,wood:boolean,running:boolean,intensity:number){if(time-(this.stepAt.get(id)??-10)<(running?TUNING.audio.runStepSeconds:TUNING.audio.walkStepSeconds))return;this.stepAt.set(id,time);this.sample(`footstep_${wood?'wood':'grass'}_00${Math.floor(time*10)%2}`,intensity*(running?TUNING.audio.runStepVolume:TUNING.audio.walkStepVolume),.93+Math.random()*.14);}
 ambient(time:number,danger:number,_chasing:boolean){const beat=heartbeatProfile(danger);if(danger>0&&time-this.lastBeat>beat.interval){this.lastBeat=time;this.sample('impactSoft_heavy_000',beat.gain,.64,0,beat.cutoff);this.sample('impactSoft_medium_000',beat.gain*.72,.77,beat.interval*.24,beat.cutoff*.85);}}
}

