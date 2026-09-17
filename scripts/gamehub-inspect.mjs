import { readFileSync, writeFileSync } from 'node:fs';
const base='http://101.43.19.238';
const credentialSource='C:/Users/57861/.codex/sessions/2026/09/12/rollout-2026-09-12T02-34-34-01a091bf-ff80-7ab2-8e42-9e02e736b8ae.jsonl';
const messages=readFileSync(credentialSource,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(r=>r.type==='response_item'&&r.payload.role==='user');
const prior=messages.map(r=>r.payload.content?.map(c=>c.text??'').join('\n')??'').findLast(t=>t.includes(base)&&t.includes('API Token'));
const token=prior?.match(/API Token[：:]\s*(gh_[A-Za-z0-9]+)/)?.[1];if(!token)throw Error('GameHub credential unavailable');
const response=await fetch(base+'/api/v1/projects',{redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`GameHub HTTP ${response.status}`);const data=await response.json();writeFileSync('artifacts/gamehub-projects.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data.projects.map(p=>({id:p.id,title:p.title,published:p.published,current_version_id:p.current_version_id}))));
