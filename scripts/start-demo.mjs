import { spawn } from 'node:child_process';
import { openSync, closeSync, mkdirSync } from 'node:fs';
mkdirSync('artifacts',{recursive:true});
const out=openSync('artifacts/dev-server.log','a'),err=openSync('artifacts/dev-server-error.log','a');
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{cwd:process.cwd(),detached:true,windowsHide:true,stdio:['ignore',out,err]});
child.unref();closeSync(out);closeSync(err);console.log(`Demo server PID: ${child.pid}`);
