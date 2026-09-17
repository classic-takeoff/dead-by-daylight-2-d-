import { Match } from '../src/game';
const results=[];
for(const seed of (process.argv.includes('--seed42')?[42]:Array.from({length:16},(_,i)=>i+1))){
 let state=seed;const rng=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};const m=new Match('killer',rng);
 for(let n=0;n<12000&&!m.finished;n++){m.killerAI(.1);const action=m.killer.action,progress=m.killer.progress;m.step(.1);m.killer.action=action;m.killer.progress=progress;}
 results.push({seed,finished:m.finished,seconds:Math.round(m.time),generators:m.repaired,escaped:m.survivors.filter(a=>a.life==='escaped').length,hits:m.killer.stats.hits});
 if(!m.finished)console.log('STUCK',seed,m.actors.map(a=>({life:a.life,x:a.x,y:a.y,level:a.level,action:a.action,path:a.path,target:a.target})),m.generators);
}
console.table(results);if(results.some(r=>!r.finished))process.exit(1);
