// Author: Sandeep Belgavi. Offline CLI using the exact browser grading implementation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const [kind,file]=process.argv.slice(2);
if(!['replay','promotion','outcome'].includes(kind)||!file){console.error('Usage: node scripts/run_harness.cjs replay|promotion|outcome fixture.json');process.exit(2);}
try{
 const size=fs.statSync(file).size;if(size>32768)throw Error('Fixture exceeds 32 KiB');
 const context={module:{exports:{}}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/harness-models.js'),'utf8'),context);
 const input=JSON.parse(fs.readFileSync(file,'utf8'));const result=context.module.exports.evaluate(kind,input);console.log(JSON.stringify(result,null,2));if(result.status==='INVALID_INPUT')process.exitCode=2;
}catch{console.error('Unable to evaluate fixture: supply a readable JSON file of at most 32 KiB.');process.exitCode=2;}
