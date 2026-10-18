// Author: Sandeep Belgavi.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={module:{exports:{}}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/harness-models.js'),'utf8'),context);const e=context.module.exports.evaluate;
test('retry ledger prevents repeated committed effects with a stable key',()=>{
 const attempts=[{outcome:'timeout_after_commit'},{outcome:'success'}];assert.equal(e('replay',{stableKey:true,attempts}).effects,1);assert.equal(e('replay',{stableKey:false,attempts}).effects,2);assert.equal(e('replay',{stableKey:true,attempts:[{outcome:'failure_before_commit'}]}).status,'NO_EFFECT');
});
test('promotion never accepts leakage or critical regressions despite aggregate gains',()=>{
 const x=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/harness-promotion.json'),'utf8'));assert.equal(e('promotion',x).status,'CANDIDATE_READY_FOR_REVIEW');x.trainingGroups.push('holdout-a');assert.equal(e('promotion',x).status,'LEAKAGE_BLOCKED');x.trainingGroups=[];x.cases[0].candidate=false;assert.equal(e('promotion',x).status,'REGRESSION_BLOCKED');
});
test('stored outcome cannot override policy and a success claim cannot create an outcome',()=>{
 assert.equal(e('outcome',{claimedSuccess:true,recordExists:false,authorized:true,approvalBound:true}).status,'FALSE_SUCCESS');assert.equal(e('outcome',{claimedSuccess:true,recordExists:true,authorized:false,approvalBound:true}).status,'POLICY_BREACH');assert.equal(e('outcome',{claimedSuccess:false,recordExists:true,authorized:true,approvalBound:true}).status,'VERIFIED_OUTCOME');
});
test('all harness models reject malformed fixtures',()=>{for(const kind of ['replay','promotion','outcome'])for(const x of [null,[],{},'x'])assert.equal(e(kind,x).status,'INVALID_INPUT');});
