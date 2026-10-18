// Author: Sandeep Belgavi. Pure synthetic harness experiments, shared by browser and CLI.
(function(root){
 'use strict';
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function evaluate(kind,x){
  const invalid=()=>({status:'INVALID_INPUT',detail:'Use the documented fixture schema and bounded arrays. This experiment makes no external calls.'});
  if(!object(x))return invalid();
  if(kind==='replay'){
   if(typeof x.stableKey!=='boolean'||!Array.isArray(x.attempts)||!x.attempts.length||x.attempts.length>10||x.attempts.some(a=>!object(a)||!['timeout_after_commit','success','failure_before_commit'].includes(a.outcome)))return invalid();
   const ledger=new Set(),events=[];let effects=0;
   for(let n=0;n<x.attempts.length;n++){const key=x.stableKey?'operation-1':`attempt-${n+1}`,a=x.attempts[n];if(ledger.has(key)){events.push({attempt:n+1,status:'REPLAYED_PRIOR_RESULT',effects});continue;}if(a.outcome==='failure_before_commit'){events.push({attempt:n+1,status:'FAILED_BEFORE_EFFECT',effects});continue;}ledger.add(key);effects++;events.push({attempt:n+1,status:a.outcome==='timeout_after_commit'?'UNKNOWN_TO_CALLER':'RECEIVED',effects});}
   return {status:effects>1?'DUPLICATE_EFFECT':effects===1?'REPLAY_SAFE':'NO_EFFECT',effects,events,detail:'One logical operation, synthetic transactional ledger. A real provider needs an atomic durable idempotency contract and payload binding.'};
  }
  if(kind==='promotion'){
   if(!Array.isArray(x.trainingGroups)||x.trainingGroups.length>100||x.trainingGroups.some(g=>typeof g!=='string'||!g||g.length>80)||!Array.isArray(x.cases)||x.cases.length<4||x.cases.length>100||x.cases.some(c=>!object(c)||typeof c.group!=='string'||!c.group||c.group.length>80||typeof c.baseline!=='boolean'||typeof c.candidate!=='boolean'||typeof c.critical!=='boolean'))return invalid();
   const leaked=x.cases.some(c=>x.trainingGroups.includes(c.group));if(leaked)return {status:'LEAKAGE_BLOCKED',detail:'A held-out source group also appears in training. Fix the split before comparing scores.'};
   const baseline=x.cases.filter(c=>c.baseline).length,candidate=x.cases.filter(c=>c.candidate).length,criticalFailures=x.cases.filter(c=>c.critical&&!c.candidate).length;
   return {status:criticalFailures||candidate<baseline?'REGRESSION_BLOCKED':candidate===baseline?'NO_MEASURED_GAIN':'CANDIDATE_READY_FOR_REVIEW',baseline,candidate,total:x.cases.length,criticalFailures,detail:'Supplied fixture outcomes only. A higher toy score is not statistical evidence, model training or permission to deploy. Independent evaluation and human review remain required.'};
  }
  if(kind==='outcome'){
   if(typeof x.claimedSuccess!=='boolean'||typeof x.recordExists!=='boolean'||typeof x.authorized!=='boolean'||typeof x.approvalBound!=='boolean')return invalid();
   return {status:x.recordExists&&(!x.authorized||!x.approvalBound)?'POLICY_BREACH':x.recordExists&&x.authorized&&x.approvalBound?'VERIFIED_OUTCOME':x.claimedSuccess?'FALSE_SUCCESS':'INCOMPLETE',detail:'The simulated stored outcome and policy checks determine the result; the agent narrative cannot establish success. This fixture does not inspect a real database.'};
  }
  return invalid();
 }
 if(typeof module!=='undefined')module.exports={evaluate};
 root.HarnessLessons={evaluate};
})(globalThis);
