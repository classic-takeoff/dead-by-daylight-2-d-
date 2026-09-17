import test from 'node:test';
import assert from 'node:assert/strict';
import {solveArm} from '../src/arm-pose';
test('arms retain their bone lengths and connected grip throughout a full aim rotation',()=>{
 for(let i=0;i<360;i+=5)for(const reach of [3,17,40,60]){const angle=i*Math.PI/180,shoulder={x:9,y:-6};const arm=solveArm(shoulder,{x:Math.cos(angle)*reach,y:Math.sin(angle)*reach},1);assert.ok(Math.abs(Math.hypot(arm.elbow.x-shoulder.x,arm.elbow.y-shoulder.y)-17)<1e-6);assert.ok(Math.abs(Math.hypot(arm.hand.x-arm.elbow.x,arm.hand.y-arm.elbow.y)-16)<1e-6);assert.ok(Math.hypot(arm.hand.x-shoulder.x,arm.hand.y-shoulder.y)<=33);}
});
