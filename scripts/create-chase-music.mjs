import {writeFileSync} from 'node:fs';
// Original industrial chase cue: chromatic bass, diminished clusters, string alarms.
const rate=22050,seconds=24,n=rate*seconds,tau=2*Math.PI,beat=.5;
const channels=[new Float32Array(n),new Float32Array(n)];
let seed=320917;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)*2-1;
function voice(at,duration,pan,fn){const count=Math.round(duration*rate),offset=Math.round(at*rate);for(let i=0;i<count;i++){const t=i/rate,env=Math.min(1,t/.015)*Math.min(1,(duration-t)/.12),v=fn(t)*env;channels[0][(offset+i)%n]+=v*(.75-pan*.25);channels[1][(offset+i)%n]+=v*(.75+pan*.25);}}
const midi=m=>440*2**((m-69)/12);
for(let b=0;b<48;b++){
 const note=29+b%8,f=midi(note);
 // Eight semitone steps repeatedly climb; overlapping tails never resolve.
 voice(b*beat,.74,0,t=>.19*Math.tanh(1.8*(Math.sin(tau*f*t)+.36*Math.sin(tau*f*2*t)))*Math.exp(-t*2.8));
 if(b%2===0){
  for(const [j,interval] of [0,3,6,9,10.15].entries()){
   const pitch=midi(53+(Math.floor(b/8)%3)+interval);
   voice(b*beat,1.8,Math.sin(j*2),t=>.027*(Math.sin(tau*pitch*t+.7*Math.sin(tau*pitch*1.003*t))+.32*Math.sin(tau*pitch*2.007*t))*Math.exp(-t*.65));
  }
 }
 // Bowed high-register stabs arrive off-beat, layered with detuned neighbouring tones.
 if(b%4===3)for(let j=0;j<3;j++)voice(b*beat+.18,.72,(j-1)*.7,t=>{
  const f=midi(85+(b%8)+j*.63),bow=Math.sin(tau*f*t+1.9*Math.sin(tau*f*2*t));
  return .027*bow*Math.exp(-t*4)*(1+.18*Math.sin(tau*37*t));
 });
 // Metallic impacts and broadband, high-passed industrial friction.
 if(b%3===0)voice(b*beat,.4,b%2?-.6:.6,t=>.05*(random()*.6+Math.sin(tau*183*t)*Math.sin(tau*431*t))*Math.exp(-t*13));
}
// Periodic rising/falling alarm, rough stereo machinery bed. All seam phases close.
let previous=[0,0];
const noise=[new Float32Array(n),new Float32Array(n)];for(let ch=0;ch<2;ch++)for(let i=0;i<n;i++)noise[ch][i]=random();
for(let ch=0;ch<2;ch++)for(let i=0;i<n;i++){
 const p=tau*i/n,t=i/rate;
 const alarm=Math.sin(p*21120+370*Math.sin(p*4)+ch*.12)+.25*Math.sin(p*31680+555*Math.sin(p*4));
 const swell=(.5+.5*Math.sin(p*3-1))**6;
 const scrape=noise[ch][i]-noise[ch][(i+n-1)%n];
 channels[ch][i]+=.019*alarm*swell+.007*scrape*(.3+.7*(.5+.5*Math.sin(p*11))**3)+.022*Math.sin(p*1200)*Math.sin(p*7);
}
let peak=0,sum=0;for(const data of channels)for(let i=0;i<n;i++){data[i]=Math.tanh(data[i]*1.25);peak=Math.max(peak,Math.abs(data[i]));}
const out=Buffer.alloc(44+n*4);out.write('RIFF');out.writeUInt32LE(36+n*4,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++){const v=channels[ch][i]*.82/peak;sum+=v*v;out.writeInt16LE(Math.round(v*32767),44+(i*2+ch)*2);}
const seam=channels.map(data=>Math.abs(data[0]-data[n-1])*.82/peak);let maxStep=0;for(const data of channels)for(let i=1;i<n;i++)maxStep=Math.max(maxStep,Math.abs(data[i]-data[i-1])*.82/peak);
if(Math.max(...seam)>maxStep)throw Error('Loop seam discontinuity');
writeFileSync('public/audio/chase-loop.wav',out);console.log({seconds,channels:2,peak:.82,rms:Math.sqrt(sum/(n*2)),seam,bytes:out.length});
