import type { Point } from './world';

// Fixed upper/lower arm lengths keep elbows connected through every aim angle.
export function solveArm(shoulder:Point,target:Point,bend=1,upper=17,lower=16){
  const dx=target.x-shoulder.x,dy=target.y-shoulder.y,n=Math.hypot(dx,dy);
  const ux=n>.001?dx/n:0,uy=n>.001?dy/n:1;
  const d=Math.max(Math.abs(upper-lower)+.01,Math.min(upper+lower-.2,n));
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {shoulder,elbow:{x:shoulder.x+ux*along-uy*height*bend,y:shoulder.y+uy*along+ux*height*bend},hand:{x:shoulder.x+ux*d,y:shoulder.y+uy*d}};
}
