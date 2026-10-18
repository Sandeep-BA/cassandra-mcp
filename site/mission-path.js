// Author: Sandeep Belgavi. Versioned local learning progress; inputs never enter analytics.
(()=>{
 'use strict';
 const VERSION=1,KEY='aicassindra.missions.v1',CONSENT='aicassindra.mission-metrics',MEASUREMENT='G-12JNJLMDPJ';
 const plans={
  replay:[['Prevent duplicate committed effects','REPLAY_SAFE','Use stableKey true with timeout_after_commit followed by success.'],['Expose unsafe retries','DUPLICATE_EFFECT','Use a new key for each attempt by setting stableKey false.'],['Recognize an operation with no committed effect','NO_EFFECT','Set each outcome to failure_before_commit.']],
  promotion:[['Produce a candidate for independent review','CANDIDATE_READY_FOR_REVIEW','Keep groups separated and improve a noncritical case.'],['Detect source-group leakage','LEAKAGE_BLOCKED','Add a held-out group to trainingGroups.'],['Veto a critical regression','REGRESSION_BLOCKED','Keep groups separate and set a critical candidate case to false.']],
  outcome:[['Reject an unsupported success claim','FALSE_SUCCESS','Keep claimedSuccess true and recordExists false.'],['Verify a permitted stored outcome','VERIFIED_OUTCOME','Set recordExists, authorized and approvalBound true.'],['Detect an unauthorized effect','POLICY_BREACH','Keep the record and disable authorization.']],
  architecture:[['Repair all prerequisites','ORDER_ACCEPTED','Move the budget and minimizer before model work; validate before approval, audit before delivery.'],['Expose an unsafe ordering','UNSAFE_ORDER','Keep nine unique stages but move approval after action.'],['Expose an incomplete architecture','INVALID_INPUT','Remove or duplicate one required stage.']],
  contract:[['Produce a valid recommendation that waits for approval','AWAITING_APPROVAL','Use proceed 0.90, review 0.08, block 0.02.'],['Route uncertainty to review','NEEDS_REVIEW','Use proceed 0.80, review 0.18, block 0.02.'],['Reject a plausible-looking malformed response','INVALID_OUTPUT','Select a non-maximum choice or introduce an unknown probability key.']],
  minimizer:[['Keep only the required evidence','MINIMIZED','Provide order_status and refund_rule as nonempty strings.'],['Fail closed on absent policy','MISSING_EVIDENCE','Remove refund_rule rather than inventing a default.'],['Expose the free-text limitation','MINIMIZED','Put the literal synthetic marker FAKE-SECRET inside order_status. Notice that it survives.']],
  budget:[['Observe one failed attempt consuming a reservation','SIMULATED','Keep the starter fixture and predict SIMULATED. Inspect calls = 2 and remaining = 0.'],['Deny every authorized call at zero budget','SIMULATED','Set remaining to 0 and retain at least one authorized request.'],['Reject an invalid capacity claim','INVALID_INPUT','Set remaining to a negative number.']],
  partition:[['Build a bounded prepared query plan','QUERY_PLAN_ONLY','Use demo.events, a tenant_id, allowed columns and limit 1–100.'],['Reject access to an unlisted table','DENIED','Change the table to system.local.'],['Reject an excessive result limit','INVALID_INPUT','Keep the valid table and key, but set limit to 101.']]
 };
 const ids=['architecture','contract','minimizer','budget','partition','replay','promotion','outcome'],total=ids.length*3,levels=['Beginner','Intermediate','Hard'];
 const statuses=['REPLAY_SAFE','DUPLICATE_EFFECT','NO_EFFECT','CANDIDATE_READY_FOR_REVIEW','LEAKAGE_BLOCKED','REGRESSION_BLOCKED','FALSE_SUCCESS','VERIFIED_OUTCOME','POLICY_BREACH','ORDER_ACCEPTED','UNSAFE_ORDER','INVALID_INPUT','AWAITING_APPROVAL','NEEDS_REVIEW','INVALID_OUTPUT','MINIMIZED','MISSING_EVIDENCE','SIMULATED','QUERY_PLAN_ONLY','DENIED'];
 const fresh=()=>({version:VERSION,completed:[],drafts:{},levels:{},attempts:0,events:[],lastVisit:null});
 let state=fresh(),persistent=true,sharing=false;
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===VERSION){state={...fresh(),...saved};state.completed=Array.isArray(saved.completed)?saved.completed.filter(x=>ids.some(id=>[0,1,2].some(n=>x===`${id}:${n}`))):[];state.completed=[...new Set(state.completed)];state.events=Array.isArray(saved.events)?saved.events.filter(x=>x&&typeof x.event==='string'&&typeof x.at==='string').slice(-200):[];state.drafts=saved.drafts&&typeof saved.drafts==='object'?saved.drafts:{};state.levels=saved.levels&&typeof saved.levels==='object'?saved.levels:{};state.attempts=Number.isSafeInteger(saved.attempts)&&saved.attempts>=0?saved.attempts:0;}sharing=localStorage.getItem(CONSENT)==='yes';}catch{persistent=false;}
 const $=s=>document.querySelector(s),sections=new Map(),started=new Set();
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{persistent=false;}$('#storage-status').textContent=persistent?(document.body.hasAttribute('data-account-sync')?'Drafts stay on this browser. Use the account controls below to save or load completed checkpoints.':'Drafts and progress are saved on this browser only. Use synthetic data. No account sync.'):'Browser storage is unavailable or full. Progress works for this visit only; download your report before leaving.';}
 function enableAnalytics(){if(document.querySelector('[data-mission-analytics]'))return;window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',MEASUREMENT,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});const script=document.createElement('script');script.async=true;script.dataset.missionAnalytics='true';script.src=`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT}`;document.head.append(script);}
 function track(event,id='',level=0,status=''){
  const record={event,mission:id,level, status,at:new Date().toISOString()};state.events.push(record);state.events=state.events.slice(-200);persist();
  if(sharing&&typeof window.gtag==='function')window.gtag('event',event,{mission_id:id||'path',mission_level:level,result_code:status||'none',curriculum_version:VERSION,send_to:MEASUREMENT});
  renderTrail();
 }
 function renderTrail(){const list=$('#activity-trail');list.replaceChildren();for(const event of state.events.slice(-12).reverse()){const li=document.createElement('li');li.textContent=`${event.at.slice(0,16).replace('T',' ')} UTC · ${event.event} · ${event.mission||'learning path'}${event.status?' · '+event.status:''}`;list.append(li);}}
 function nextCheckpoint(){for(const id of ids)for(let n=0;n<3;n++)if(!state.completed.includes(`${id}:${n}`))return {id,n};return {id:ids[0],n:2};}
 function dashboard(){const count=state.completed.length;$('#mission-progress').value=count;$('#progress-summary').textContent=count===total?`All ${total} checkpoints completed. Download your evidence report or revisit a harder case.`:`${count} of ${total} checkpoints completed · ${state.attempts} attempts. Progress is earned by meeting a challenge and predicting its result.`;const next=nextCheckpoint();$('#resume-mission').href='#'+next.id;$('#resume-mission').textContent=count===total?'Revisit the architecture challenge':`${count?'Continue':'Start'}: ${next.id} · ${levels[next.n]}`;}
 function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function qualifies(id,n,x,r){if(r.status!==plans[id][n][1])return false;
  if(id==='minimizer'&&n===2)return x.order_status.includes('FAKE-SECRET')&&r.state.order_status.includes('FAKE-SECRET');
  if(id==='budget'&&n===0)return r.calls===2&&r.remaining===0&&r.events.some(e=>e.status==='PROVIDER_UNAVAILABLE')&&r.events.some(e=>e.status==='BUDGET_EXHAUSTED')&&r.events.some(e=>e.status==='DENIED');
  if(id==='budget'&&n===1)return x.remaining===0&&x.requests.some(e=>e.authorized)&&r.calls===0;
  if(id==='partition'&&n===2)return x!==null&&typeof x==='object'&&x.table==='demo.events'&&x.limit===101;
  return true;
 }
 for(const section of document.querySelectorAll('[data-exercise]')){
  const id=section.dataset.exercise,editor=section.querySelector('textarea'),baseline=editor.value,output=section.querySelector('output'),status=section.querySelector('[data-status]'),controls=section.querySelector('.mission-controls');
  controls.innerHTML=`<label>Challenge level <select data-level>${levels.map((l,n)=>`<option value="${n}">${l}</option>`).join('')}</select></label><p data-objective></p><details data-hint><summary>Show a hint</summary><p></p></details><label>Predict the result before running <select data-prediction><option value="">Choose a result</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select></label><p data-checkpoint aria-live="polite"></p><div class="toolbar"><button data-artifact type="button" disabled>Download successful experiment</button><a data-next href="#mission-dashboard">Choose next checkpoint</a></div><p class="note">Experiment downloads include your entered JSON and result. Progress reports exclude drafts. Neither is uploaded.</p>`;
  const level=controls.querySelector('[data-level]'),prediction=controls.querySelector('[data-prediction]'),checkpoint=controls.querySelector('[data-checkpoint]'),artifact=controls.querySelector('[data-artifact]');let last=null;
  level.value=[0,1,2].includes(state.levels[id])?String(state.levels[id]):'0';
  if(typeof state.drafts[id]==='string'&&state.drafts[id].length<=32768)editor.value=state.drafts[id];
  function update(){const n=Number(level.value);controls.querySelector('[data-objective]').textContent=`Your objective: ${plans[id][n][0]}. Expected result: ${plans[id][n][1]}.`;controls.querySelector('[data-hint] p').textContent=plans[id][n][2];checkpoint.textContent=state.completed.includes(`${id}:${n}`)?'Checkpoint completed on this device. Try another case or continue.':'Meet this objective and predict the result to complete the checkpoint.';prediction.value='';last=null;artifact.disabled=true;state.levels[id]=n;persist();}
  level.addEventListener('change',()=>{update();track('mission_selected',id,Number(level.value));});
  controls.querySelector('[data-hint]').addEventListener('toggle',event=>{if(event.target.open)track('mission_hint',id,Number(level.value));});
  editor.addEventListener('input',()=>{if(editor.value.length<=32768)state.drafts[id]=editor.value;else delete state.drafts[id];last=null;artifact.disabled=true;persist();});
  section.querySelector('[data-reset]').addEventListener('click',()=>{editor.value=baseline;state.drafts[id]=baseline;output.textContent='Run the fixture to inspect the result.';status.textContent='Ready';update();track('mission_reset',id,Number(level.value));});
  section.querySelector('[data-run]').addEventListener('click',()=>{
   const n=Number(level.value);let x,r;state.attempts++;if(!started.has(`${id}:${n}`)){started.add(`${id}:${n}`);track('mission_started',id,n);}
   try{if(editor.value.length>32768)throw Error();x=JSON.parse(editor.value);r=(['replay','promotion','outcome'].includes(id)?window.HarnessLessons:window.ArenaLessons).evaluate(id,x);}catch{r={status:'INVALID_JSON',detail:'Supply valid JSON of at most 32 KiB. No input was sent anywhere.'};}
   output.textContent=JSON.stringify(r,null,2);status.textContent=r.status;track('mission_attempt',id,n,r.status);
   const passed=qualifies(id,n,x,r)&&prediction.value===r.status;
   last=passed?{author:'Sandeep Belgavi',curriculumVersion:VERSION,mission:id,level:levels[n],input:x,result:r,completedAt:new Date().toISOString(),scope:'Local synthetic experiment; not a production security assessment.'}:null;artifact.disabled=!passed;
   if(passed){const key=`${id}:${n}`;if(!state.completed.includes(key)){state.completed.push(key);track('mission_completed',id,n,r.status);}checkpoint.textContent='Checkpoint complete. Download your experiment or choose the next checkpoint.';}else checkpoint.textContent=prediction.value!==r.status?'Compare the observed result with your prediction, then try again.':'The result matches your prediction, but the challenge conditions are not met. Open the hint and inspect the fixture.';
   dashboard();persist();
  });
  artifact.addEventListener('click',()=>{if(last){download(`aicassindra-${id}-experiment.json`,last);track('mission_artifact',id,Number(level.value));}});
  controls.querySelector('[data-next]').addEventListener('click',event=>{event.preventDefault();resume();});
  sections.set(id,{level,update,section});update();
 }
 function resume(){const next=nextCheckpoint(),entry=sections.get(next.id);entry.level.value=String(next.n);entry.update();location.hash=next.id;entry.level.focus({preventScroll:true});track('mission_resumed',next.id,next.n);}
 $('#resume-mission').addEventListener('click',event=>{event.preventDefault();resume();});
 const week=Math.floor(Date.now()/(7*86400000)),weekly=ids[week%ids.length];$('#weekly-mission').href='#'+weekly;$('#weekly-mission').textContent=`This week’s rotating practice: ${weekly}`;
 $('#weekly-mission').addEventListener('click',()=>track('mission_weekly',weekly));
 $('#export-progress').addEventListener('click',()=>{track('mission_report');download('aicassindra-progress.json',{author:'Sandeep Belgavi',version:VERSION,completed:state.completed,attempts:state.attempts,events:state.events,exportedAt:new Date().toISOString(),scope:'Self-reported local practice; no drafts included.'});});
 $('#clear-progress').addEventListener('click',()=>{if(!confirm('Clear saved drafts, completions and activity on this device? This cannot be undone.'))return;state=fresh();for(const {section,level,update} of sections.values()){level.value='0';section.querySelector('[data-reset]').click();update();}state.events=[];state.attempts=0;persist();dashboard();renderTrail();});
 $('#share-metrics').checked=sharing;window['ga-disable-'+MEASUREMENT]=!sharing;
 $('#share-metrics').addEventListener('change',event=>{sharing=event.target.checked;window['ga-disable-'+MEASUREMENT]=!sharing;try{localStorage.setItem(CONSENT,sharing?'yes':'no');}catch{}if(sharing){enableAnalytics();track('mission_analytics_opt_in');}});
 if(sharing)enableAnalytics();
 // Explicit account import/export bridge. No network request or automatic merge here.
 window.ArenaProgress={completed:()=>state.completed.slice(),merge:items=>{if(!Array.isArray(items))throw Error('Invalid progress');for(const item of items)if(ids.some(id=>[0,1,2].some(n=>item===`${id}:${n}`))&&!state.completed.includes(item))state.completed.push(item);persist();dashboard();}};
 const today=new Date().toISOString().slice(0,10);const returning=state.lastVisit&&state.lastVisit!==today;state.lastVisit=today;track(returning?'mission_return_visit':'mission_path_opened');dashboard();
})();
