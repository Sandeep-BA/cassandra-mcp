// Author: Sandeep Belgavi. Deterministic teaching fixtures; no model or network calls.
(function(root){
  'use strict';
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  function evaluate(kind, x) {
    if (!object(x)) return {status:'INVALID_INPUT', detail:'Supply a JSON object.'};
    if(kind==='architecture') {
      const required=['identity','budget','minimize','model','validate','approval','action','audit','deliver'];
      if(!Array.isArray(x.steps)||x.steps.length!==required.length||new Set(x.steps).size!==required.length||required.some(s=>!x.steps.includes(s)))
        return {status:'INVALID_INPUT',detail:'Include each of the nine named stages exactly once.'};
      const edges=[['identity','budget'],['budget','model'],['minimize','model'],['model','validate'],['validate','approval'],['approval','action'],['action','audit'],['audit','deliver']];
      const broken=edges.filter(([a,b])=>x.steps.indexOf(a)>x.steps.indexOf(b));
      return {status:broken.length?'UNSAFE_ORDER':'ORDER_ACCEPTED',detail:broken.length?broken.map(([a,b])=>`${a} must precede ${b}`).join('; '):'All prerequisite edges hold. Ordering alone does not implement authentication or enforce these controls.'};
    }
    if(kind==='contract') {
      const keys=['proceed','review','block'],p=x.probabilities;
      if(!object(p)||Object.keys(p).length!==3||keys.some(k=>typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0||p[k]>1)||!keys.includes(x.choice)||Math.abs(keys.reduce((s,k)=>s+p[k],0)-1)>1e-6||p[x.choice]<Math.max(...keys.map(k=>p[k])))
        return {status:'INVALID_OUTPUT',detail:'Require exactly proceed, review and block; finite probabilities in [0,1] summing to 1; and a maximum-probability choice.'};
      return {status:x.choice==='block'?'BLOCKED':x.choice==='review'||p[x.choice]<0.85?'NEEDS_REVIEW':'AWAITING_APPROVAL',detail:'The contract is structurally valid. This does not establish factual correctness. The 0.85 threshold is a teaching policy, not measured calibration.'};
    }
    if(kind==='minimizer') {
      const required=['order_status','refund_rule'];
      if(required.some(k=>typeof x[k]!=='string'||!x[k].trim()||x[k].length>4096))return {status:'MISSING_EVIDENCE',detail:'Both order_status and refund_rule must be nonempty strings of at most 4096 characters.'};
      const state=Object.fromEntries(required.map(k=>[k,x[k]]));
      return {status:'MINIMIZED',detail:`Only two allowlisted fields reach the simulated worker. Dropped ${Object.keys(x).filter(k=>!required.includes(k)).length} other fields. Secrets embedded inside allowed text are NOT detected.`,state};
    }
    if(kind==='budget') {
      if(!Number.isInteger(x.remaining)||x.remaining<0||x.remaining>100||!Array.isArray(x.requests)||x.requests.length>100||x.requests.some(r=>!object(r)||typeof r.authorized!=='boolean'||typeof r.providerFails!=='boolean'))return {status:'INVALID_INPUT',detail:'Use remaining 0–100 and at most 100 requests with boolean authorized and providerFails fields.'};
      let remaining=x.remaining,calls=0;
      const events=x.requests.map((r,i)=>{let status;if(!r.authorized)status='DENIED';else if(remaining===0)status='BUDGET_EXHAUSTED';else{remaining--;calls++;status=r.providerFails?'PROVIDER_UNAVAILABLE':'RESPONSE_RECEIVED';}return {request:i+1,status};});
      return {status:'SIMULATED',detail:'Each authorized attempt reserves one call before provider work. Failed attempts still consume the reservation. No automatic retries.',remaining,calls,events};
    }
    if(kind==='partition') {
      if(x.table!=='demo.events')return {status:'DENIED',detail:'Only demo.events is allowlisted in this fixture.'};
      if(!object(x.partition)||Object.keys(x.partition).length!==1||typeof x.partition.tenant_id!=='string'||!/^[a-z0-9-]{1,40}$/.test(x.partition.tenant_id)||!Array.isArray(x.columns)||!x.columns.length||new Set(x.columns).size!==x.columns.length||x.columns.some(c=>!['tenant_id','event_id','status'].includes(c))||!Number.isInteger(x.limit)||x.limit<1||x.limit>100)
        return {status:'INVALID_INPUT',detail:'Use the complete tenant_id partition key, distinct allowed columns, and an integer limit from 1 to 100.'};
      return {status:'QUERY_PLAN_ONLY',detail:'A prepared query plan is shown; no database is contacted. A tenant claim still needs server-side authorization before this tool can be used.',query:`SELECT ${x.columns.join(', ')} FROM demo.events WHERE tenant_id = ? LIMIT ?`,parameters:[x.partition.tenant_id,x.limit]};
    }
    return {status:'INVALID_INPUT',detail:'Unknown exercise.'};
  }
  if(typeof module!=='undefined')module.exports={evaluate};
  root.ArenaLessons={evaluate};
})(globalThis);
