import data from './game-config.json';

// Imported by simulation, renderer and UI: no second set of balance defaults.
export const TUNING=data;
export const CONFIG={...data.core,vision:data.core.vision??Infinity,survivorVision:data.core.survivorVision??Infinity};

export function validateTuning(config:typeof data){
 const visit=(value:unknown,path:string)=>{
  if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`配置 ${path} 必须是有限数值`);
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))visit(child,`${path}.${key}`);
 };
 visit(config,'game-config');
 for(const [group,values] of Object.entries({core:config.core,movement:config.movement,actions:config.actions,traversal:config.traversal,skill:config.skill,match:config.match,lunge:config.lunge})){
  for(const [key,value] of Object.entries(values))if(typeof value==='number'&&value<=0)throw new Error(`配置 ${group}.${key} 必须大于 0`);
 }
 if(config.match.requiredGenerators>config.match.groundGenerators+config.match.upstairsGenerators)throw new Error('所需发电机数不能超过生成数量');
 if(config.match.groundGenerators>config.world.genSpots.filter(p=>!p.level).length||config.match.upstairsGenerators>config.world.genSpots.filter(p=>p.level===1).length)throw new Error('发电机数量超过地图候选点');
 if(config.match.outdoorHooks>config.world.hookSpots.length)throw new Error('钩子数量超过地图候选点');
 if(config.basement.hookOffsets.length!==4)throw new Error('地下室必须有四个钩子坐标');
 if(config.lunge.contact<config.lunge.windup||config.lunge.end<=config.lunge.contact||config.lunge.recovery<config.lunge.end)throw new Error('蓄力攻击时序无效');
 if(config.actions.selfRescueChance>1||config.actions.recoverCap>1||config.basement.shackChance<0||config.basement.shackChance>1)throw new Error('概率和进度必须在 0 到 1 之间');
 if(!Number.isInteger(config.stairsVisual.steps)||config.stairsVisual.steps<3)throw new Error('楼梯台阶数量必须是至少 3 的整数');
}
validateTuning(TUNING);
