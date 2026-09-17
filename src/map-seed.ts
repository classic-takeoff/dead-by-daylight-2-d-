let previousSeed=-1;
export function freshMapSeed(){
 const bytes=new Uint32Array(1);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else bytes[0]=(Date.now()^Math.floor(Math.random()*0x100000000))>>>0;
 let seed=bytes[0];if(seed===previousSeed)seed=(seed+0x9e3779b9)>>>0;previousSeed=seed;return seed;
}
export function seededRandom(seed:number){
 let state=seed>>>0;
 return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/0x100000000;};
}
export const seedLabel=(seed:number)=>'F-'+(seed>>>0).toString(16).toUpperCase().padStart(8,'0');
