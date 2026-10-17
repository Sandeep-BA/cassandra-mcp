// Author: Sandeep Belgavi. Boundary checks for the original browser teaching models.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={module:{exports:{}}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/decision-labs.js'),'utf8'),context);
const e=(kind,input)=>JSON.parse(JSON.stringify(context.module.exports.evaluate(kind,input)));
test('architecture accepts prerequisites, rejects duplicate and misplaced controls',()=>{
 const steps=['identity','budget','minimize','model','validate','approval','action','audit','deliver'];
 assert.equal(e('architecture',{steps}).status,'ORDER_ACCEPTED');
 assert.equal(e('architecture',{steps:[...steps.slice(0,8),'audit']}).status,'INVALID_INPUT');
 [steps[3],steps[1]]=[steps[1],steps[3]];
 assert.equal(e('architecture',{steps}).status,'UNSAFE_ORDER');
});
test('contract rejects malformed distributions and preserves policy outcomes',()=>{
 const valid={choice:'proceed',probabilities:{proceed:.9,review:.08,block:.02}};
 assert.equal(e('contract',valid).status,'AWAITING_APPROVAL');
 assert.equal(e('contract',{...valid,choice:'review'}).status,'INVALID_OUTPUT');
 assert.equal(e('contract',{...valid,probabilities:{proceed:.9,review:.4,block:.02}}).status,'INVALID_OUTPUT');
 assert.equal(e('contract',{...valid,probabilities:{proceed:NaN,review:0,block:0}}).status,'INVALID_OUTPUT');
 assert.equal(e('contract',{choice:'block',probabilities:{proceed:.01,review:.01,block:.98}}).status,'BLOCKED');
 assert.equal(e('contract',{choice:'proceed',probabilities:{proceed:.8,review:.18,block:.02}}).status,'NEEDS_REVIEW');
});
test('minimizer drops unrelated fields without pretending to redact free text',()=>{
 const r=e('minimizer',{order_status:'fake-secret',refund_rule:'review',password:'omit'});
 assert.deepEqual(r.state,{order_status:'fake-secret',refund_rule:'review'});
 assert.equal(e('minimizer',{order_status:'ok'}).status,'MISSING_EVIDENCE');
 assert.equal(e('minimizer',{order_status:'x'.repeat(4097),refund_rule:'review'}).status,'MISSING_EVIDENCE');
});
test('budget reserves failed authorized attempts but never denied requests',()=>{
 const r=e('budget',{remaining:1,requests:[{authorized:false,providerFails:false},{authorized:true,providerFails:true},{authorized:true,providerFails:false}]});
 assert.equal(r.calls,1);assert.equal(r.remaining,0);
 assert.deepEqual(r.events.map(x=>x.status),['DENIED','PROVIDER_UNAVAILABLE','BUDGET_EXHAUSTED']);
 assert.equal(e('budget',{remaining:-1,requests:[]}).status,'INVALID_INPUT');
});
test('partition rejects unauthorized identifiers and binds values separately',()=>{
 const x={table:'demo.events',partition:{tenant_id:'demo'},columns:['event_id'],limit:20};
 const r=e('partition',x);assert.equal(r.status,'QUERY_PLAN_ONLY');assert.deepEqual(r.parameters,['demo',20]);
 assert.equal(e('partition',{...x,table:'system.local'}).status,'DENIED');
 for(const patch of [{columns:['*']},{columns:['status','status']},{limit:101},{partition:{tenant_id:'demo',extra:'x'}}])assert.equal(e('partition',{...x,...patch}).status,'INVALID_INPUT');
});
test('all models reject absent inputs without throwing',()=>{
 for(const kind of ['architecture','contract','minimizer','budget','partition'])for(const x of [null,[],0,'bad'])assert.equal(e(kind,x).status,'INVALID_INPUT');
});
