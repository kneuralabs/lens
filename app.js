/* ════════════════════════════════════════════════════════════
   KneuraLens — application logic
   Data model preserved verbatim: T[i] = [priority, text, level, theme, framework]
   state[i] = {done,status,assignee,startDate,endDate,notes}
   localStorage: kn_state · kn_customer · kn_theme · kn_screen · kn_accent · kn_density
════════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ─── config ───
const FRAMEWORKS=['ISO-IEC 42001','NIST AI RMF','EU AI Act','OECD AI Principles','Singapore IMDA','Canada ADM','UNESCO Ethics','US Bill of Rights','China AI Gov','G7 Hiroshima'];
const THEMES=['Governance & Leadership','Risk Management','Transparency & Explainability','Fairness, Bias & Non-discrimination','Human Oversight & Human Rights','Data Governance & Privacy','Security, Resilience & Reliability','Monitoring, Auditing & Compliance','Stakeholder Engagement & Ethics','Innovation, Procurement & International'];
const PRIORITIES=['critical','high','medium','low'];
const LEVELS=['L1','L2','L3','L4'];
const STATUSES=['not-started','initiated','in-progress','blocked','completed'];
const SLA={critical:'Act immediately',high:'Within 30 days',medium:'Within 90 days',low:'Planned improvement'};
const FW_SHORT={'ISO-IEC 42001':'ISO 42001','NIST AI RMF':'NIST','EU AI Act':'EU AI Act','OECD AI Principles':'OECD','Singapore IMDA':'IMDA','Canada ADM':'Canada ADM','UNESCO Ethics':'UNESCO','US Bill of Rights':'US AIBoR','China AI Gov':'China','G7 Hiroshima':'G7'};
const THEME_SHORT={'Governance & Leadership':'Governance','Risk Management':'Risk','Transparency & Explainability':'Transparency','Fairness, Bias & Non-discrimination':'Fairness','Human Oversight & Human Rights':'Human Oversight','Data Governance & Privacy':'Data & Privacy','Security, Resilience & Reliability':'Security','Monitoring, Auditing & Compliance':'Monitoring','Stakeholder Engagement & Ethics':'Stakeholders','Innovation, Procurement & International':'Innovation'};
const AVA=['#2B63C4','#0E8C82','#B0710A','#16805E','#5848C2','#C0427A','#2D72C2','#9A6B00','#0F766E','#6D4AC2'];

// ─── storage ───
const LS_VERSION=1;
const LS=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const SS=(k,v)=>{try{if(k==='kn_state')v={...v,_v:LS_VERSION};localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

let state=(()=>{const d=LS('kn_state');return(d&&d._v===LS_VERSION)?d:{}})();
let filters={q:'',p:'',l:'',fw:'',th:'',st:''};
const PERSONS_POOL=(typeof PERSONS!=='undefined')?PERSONS:['Alice Chen','Bob Patel','Carol Singh'];

// ─── small helpers ───
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const RING=Math.round(2*Math.PI*50);

function calcDuration(s,e){if(!s||!e)return '';const d=Math.round((new Date(e)-new Date(s))/86400000);return d<0?'invalid':d===0?'same day':d===1?'1 day':d+' days';}
function defStatus(p){return p==='critical'?'initiated':p==='high'?'in-progress':'not-started';}
function defPerson(i){const team=getTeam();return team[i%team.length];}
function defStartDate(p,i){const b=new Date('2025-02-01');const o={critical:0,high:14,medium:45,low:90}[p]||0;b.setDate(b.getDate()+o+(i%4)*7);return b.toISOString().slice(0,10);}
function defEndDate(s,p){const d=new Date(s);const dur={critical:30,high:45,medium:90,low:180}[p]||60;d.setDate(d.getDate()+dur);return d.toISOString().slice(0,10);}
function getTeam(){const c=LS('kn_customer')||{};if(c.team&&c.team.trim())return c.team.split(',').map(x=>x.trim()).filter(Boolean);return PERSONS_POOL;}
function eff(i){const t=T[i],s=state[i]||{};const start=s.startDate||defStartDate(t[0],i);return{done:!!s.done,status:s.status||defStatus(t[0]),assignee:s.assignee||defPerson(i),startDate:start,endDate:s.endDate||defEndDate(start,t[0]),notes:s.notes||''};}
function isDone(i){const s=state[i]||{};return s.done||s.status==='completed';}
function initials(n){const p=n.trim().split(/\s+/);return((p[0]||'')[0]||'')+((p[1]||'')[0]||'');}
function avaColor(n){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return AVA[h%AVA.length];}
function matLevel(pct){if(pct>=90)return['L4','Leading','Governance embedded as a competitive strength.'];if(pct>=75)return['L3','Implementing','Controls operating across the organisation.'];if(pct>=50)return['L2','Developing','Building out structure and accountability.'];return['L1','Assess','Establishing your governance baseline.'];}

// ─── filtering (logic preserved) ───
function filtered(){
  const{q,p,l,fw,th,st}=filters;
  const c=LS('kn_customer')||{};
  const cpFW=c.frameworks&&c.frameworks.length?c.frameworks:null;
  const cpPRI=c.priorities&&c.priorities.length?c.priorities:null;
  const cpLVL=c.levels&&c.levels.length?c.levels:null;
  const cpTH=c.themes&&c.themes.length?c.themes:null;
  const ql=q.toLowerCase();
  const out=[];
  for(let i=0;i<T.length;i++){
    const t=T[i];
    if(cpFW&&!cpFW.includes(t[4]))continue;
    if(cpPRI&&!cpPRI.includes(t[0]))continue;
    if(cpLVL&&!cpLVL.includes(t[2]))continue;
    if(cpTH&&!cpTH.some(x=>t[3].includes(x)))continue;
    if(p&&t[0]!==p)continue;
    if(l&&t[2]!==l)continue;
    if(fw&&t[4]!==fw)continue;
    if(th&&!t[3].includes(th))continue;
    if(ql&&!t[1].toLowerCase().includes(ql))continue;
    if(st){const s=state[i]||{};if((s.status||defStatus(t[0]))!==st)continue;}
    out.push(i);
  }
  return out;
}

// ════ TASKS RENDER ════
const taskRoot=$('#task-root');
let renderCap=250;
function renderTasks(){
  const idxs=filtered();
  updateTaskStats(idxs);
  $('#nav-tasks-ct').textContent=idxs.length;

  if(!idxs.length){
    taskRoot.innerHTML=`<div class="empty">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <h3>No tasks match</h3>
      <p>Adjust the filters above, or set up your Company Profile to scope tasks to the frameworks you care about.</p></div>`;
    return;
  }
  const groups={critical:[],high:[],medium:[],low:[]};
  idxs.forEach(i=>groups[T[i][0]].push(i));

  const capped=idxs.length>renderCap;
  let budget=renderCap;
  let html='';
  PRIORITIES.forEach(pri=>{
    const arr=groups[pri];if(!arr.length||budget<=0)return;
    const slice=arr.slice(0,budget);budget-=slice.length;
    html+=`<div class="tasksec">
      <div class="tasksec-h" data-sec="${pri}">
        <svg class="caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        <span class="dot dot-${pri}"></span>
        <span class="tlabel">${pri}</span>
        <span class="tsla">${SLA[pri]}</span>
        <span class="tcount tnum">${arr.length}</span>
      </div>
      <div class="tasklist">${slice.map(rowHTML).join('')}</div>
    </div>`;
  });
  if(capped){
    html+=`<div class="loadmore"><span>Showing first <b class="tnum">${renderCap}</b> of <b class="tnum">${idxs.length}</b> tasks — refine with filters for focus.</span>
      <button class="btn btn-ghost sm" id="btn-loadall">Load all ${idxs.length}</button></div>`;
  }
  taskRoot.innerHTML=html;
  const la=$('#btn-loadall');if(la)la.addEventListener('click',()=>{renderCap=Infinity;renderTasks();});
}

function rowHTML(i){
  const t=T[i],e=eff(i);
  const dur=calcDuration(e.startDate,e.endDate);
  return `<div class="trow p-${t[0]}${e.done?' done':''}" data-i="${i}">
    <div class="chk${e.done?' on':''}" data-act="chk" title="Mark done">${e.done?'<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 6"/></svg>':''}</div>
    <div class="tmain">
      <div class="ttext">${esc(t[1])}</div>
      <div class="tmeta">
        <span class="chip chip-accent" title="Framework">${esc(FW_SHORT[t[4]]||t[4])}</span>
        <span class="chip chip-soft" title="Maturity level">${t[2]}</span>
        <span class="chip chip-soft" title="${esc(t[3])}">${esc(THEME_SHORT[t[3]]||t[3])}</span>
      </div>
      <div class="tfields">
        <div class="tf"><span class="tfl">Status</span>
          <button class="status st-${e.status}" data-act="status" title="Click to cycle"><span class="sd"></span>${e.status.replace(/-/g,' ')}</button></div>
        <div class="tf"><span class="tfl">Owner</span>
          <div class="assignee" data-act="assignee" title="Reassign"><span class="avatar" style="background:${avaColor(e.assignee)}">${esc(initials(e.assignee)).toUpperCase()}</span><span class="an">${esc(e.assignee)}</span></div></div>
        <div class="tf"><span class="tfl">Start</span>
          <input type="date" class="date-inp" data-act="start" value="${e.startDate}"></div>
        <div class="tf"><span class="tfl">Due <span class="dur" data-dur>${dur?'· '+dur:''}</span></span>
          <input type="date" class="date-inp" data-act="end" value="${e.endDate}"></div>
        <div class="tf grow"><span class="tfl">Notes</span>
          <input type="text" class="tnotes" data-act="notes" placeholder="Add a note…" value="${esc(e.notes)}"></div>
      </div>
    </div>
  </div>`;
}

// delegation
taskRoot.addEventListener('click',ev=>{
  const sec=ev.target.closest('.tasksec-h');
  if(sec){sec.classList.toggle('collapsed');return;}
  const row=ev.target.closest('.trow');if(!row)return;
  const i=+row.dataset.i;
  const actEl=ev.target.closest('[data-act]');
  const act=actEl&&actEl.dataset.act;
  if(act==='chk'){
    const s=state[i]||{};s.done=!s.done;if(s.done)s.status='completed';else if(s.status==='completed')s.status=defStatus(T[i][0]);
    state[i]=s;SS('kn_state',state);patchRow(i,row);return;
  }
  if(act==='status'){
    const s=state[i]||{};const cur=s.status||defStatus(T[i][0]);
    const next=STATUSES[(STATUSES.indexOf(cur)+1)%STATUSES.length];
    s.status=next;s.done=next==='completed';state[i]=s;SS('kn_state',state);patchRow(i,row);return;
  }
  if(act==='assignee'){openAssignee(actEl,i);return;}
});
taskRoot.addEventListener('change',ev=>{
  const el=ev.target,act=el.dataset.act;if(!act)return;
  const row=el.closest('.trow');const i=+row.dataset.i;const s=state[i]||{};
  if(act==='start'||act==='end'){
    s[act==='start'?'startDate':'endDate']=el.value;state[i]=s;SS('kn_state',state);
    const start=row.querySelector('[data-act=start]').value,end=row.querySelector('[data-act=end]').value;
    const d=calcDuration(start,end);const dl=row.querySelector('[data-dur]');if(dl)dl.textContent=d?'Duration · '+d:'';
  }
});
taskRoot.addEventListener('input',ev=>{
  if(ev.target.dataset.act!=='notes')return;
  const row=ev.target.closest('.trow');const i=+row.dataset.i;const s=state[i]||{};
  s.notes=ev.target.value;state[i]=s;SS('kn_state',state);
});
function openAssignee(el,i){
  const team=getTeam();const cur=eff(i).assignee;
  const sel=document.createElement('select');
  team.forEach(p=>{const o=document.createElement('option');o.value=o.textContent=p;if(p===cur)o.selected=true;sel.appendChild(o)});
  el.innerHTML='';el.appendChild(sel);sel.focus();
  const close=()=>{const s=state[i]||{};s.assignee=sel.value;state[i]=s;SS('kn_state',state);renderTasks();};
  sel.addEventListener('change',close);sel.addEventListener('blur',()=>renderTasks());
}

function patchRow(i,oldRow){
  const tmp=document.createElement('div');tmp.innerHTML=rowHTML(i);
  oldRow.replaceWith(tmp.firstChild);
  const idxs=filtered();updateTaskStats(idxs);$('#nav-tasks-ct').textContent=idxs.length;syncBadges();
}

function updateTaskStats(idxs){
  const total=idxs.length;
  const done=idxs.filter(isDone).length;
  const pct=total?Math.round(done/total*100):0;
  const cnt={critical:0,high:0,medium:0,low:0};
  idxs.forEach(i=>cnt[T[i][0]]++);
  $('#task-stats').innerHTML=`
    <div class="stat"><div class="sv c-acc tnum">${pct}%</div><div class="sk">Complete</div><div class="prog" style="margin-top:10px"><i style="width:${pct}%"></i></div></div>
    <div class="stat"><div class="sv tnum">${total}</div><div class="sk">Visible tasks</div></div>
    <div class="stat"><div class="sv tnum">${done}</div><div class="sk">Done</div></div>
    <div class="stat"><div class="sv c-crit tnum">${cnt.critical}</div><div class="sk">Critical</div></div>`;
}

// ════ OVERVIEW ════
function renderOverview(){
  const total=T.length;let done=0,critOpen=0;
  for(let i=0;i<total;i++){if(isDone(i))done++;else if(T[i][0]==='critical')critOpen++;}
  const pct=total?Math.round(done/total*100):0;
  const[lv,name,sub]=matLevel(pct);
  setTimeout(()=>{$('#ov-ring').style.strokeDashoffset=(RING-pct/100*RING).toFixed(1);$('#ov-level-bar').style.width=pct+'%';},60);
  $('#ov-pct').textContent=pct+'%';
  $('#ov-frac').textContent=done+' of '+total+' complete';
  $('#ov-level').textContent=lv+' · '+name;
  $('#ov-level-sub').textContent=sub;
  $('#ov-stats').innerHTML=`
    <div class="stat"><div class="sv tnum">${total}</div><div class="sk">Total tasks</div></div>
    <div class="stat"><div class="sv c-crit tnum">${critOpen}</div><div class="sk">Critical open</div></div>
    <div class="stat"><div class="sv tnum">${done}</div><div class="sk">Completed</div></div>
    <div class="stat"><div class="sv tnum">${total-done}</div><div class="sk">Remaining</div></div>`;

  // framework bars
  const fwMap={};T.forEach((t,i)=>{(fwMap[t[4]]=fwMap[t[4]]||{t:0,d:0}).t++;if(isDone(i))fwMap[t[4]].d++;});
  $('#ov-fw-bars').innerHTML=FRAMEWORKS.map(fw=>{const d=fwMap[fw]||{t:0,d:0};const p=d.t?Math.round(d.d/d.t*100):0;
    return `<div class="barrow"><div class="bm"><span class="bl">${esc(fw)}</span><span class="bc tnum">${p}%</span></div><div class="bartrack"><div class="barfill" style="width:0;background:var(--accent)" data-w="${p}"></div></div></div>`;}).join('');
  animateBars('#ov-fw-bars');

  // NBA
  const inc=[];for(let i=0;i<total;i++)if(!isDone(i))inc.push(i);
  const ord={critical:0,high:1,medium:2,low:3};inc.sort((a,b)=>ord[T[a][0]]-ord[T[b][0]]);
  $('#ov-nba-ct').textContent=inc.length+' remaining';
  const top=inc.slice(0,6);
  $('#ov-nba').innerHTML=top.length?top.map((i,n)=>`<div class="nba-item" data-goto-task="${i}"><span class="nba-rank">${n+1}</span><span class="nba-txt">${esc(T[i][1])}</span><span class="sev sev-${T[i][0]}">${T[i][0]}</span></div>`).join(''):'<div style="padding:18px 0;color:var(--medium);font-weight:600">All tasks complete 🎉</div>';

  // spark by level
  const lvMap={};LEVELS.forEach(l=>lvMap[l]={t:0,d:0});T.forEach((t,i)=>{lvMap[t[2]].t++;if(isDone(i))lvMap[t[2]].d++;});
  const sparkPct=LEVELS.map(l=>lvMap[l].t?Math.round(lvMap[l].d/lvMap[l].t*100):0);
  const lead=sparkPct.indexOf(Math.max(...sparkPct));
  $('#ov-spark').innerHTML=sparkPct.map((p,n)=>`<div class="sb${n===lead&&p>0?' lead':''}" style="height:0" data-h="${Math.max(p,3)}" title="${LEVELS[n]} · ${p}%"></div>`).join('');
  setTimeout(()=>$$('#ov-spark .sb').forEach(b=>b.style.height=b.dataset.h+'%'),60);
  renderPersonChart();
}
function animateBars(sel){setTimeout(()=>$$(sel+' .barfill').forEach(b=>b.style.width=b.dataset.w+'%'),60);}

function renderPersonChart(){
  const personMap={};
  for(let i=0;i<T.length;i++){const a=eff(i).assignee;if(!personMap[a])personMap[a]={t:0,d:0};personMap[a].t++;if(isDone(i))personMap[a].d++;}
  const sorted=Object.entries(personMap).filter(([,v])=>v.t>0).sort((a,b)=>b[1].t-a[1].t);
  const maxT=sorted.length?sorted[0][1].t:1;
  $('#ov-person-sub').textContent=sorted.length+' people';
  $('#ov-person-bars').innerHTML=sorted.map(([name,v])=>{
    const pct=Math.round(v.d/v.t*100);const barW=Math.round(v.t/maxT*100);
    return `<div class="person-row">
      <div class="person-info"><span class="avatar" style="background:${avaColor(name)}">${esc(initials(name)).toUpperCase()}</span>
        <span class="person-name">${esc(name)}</span>
        <span class="person-stats tnum">${v.t} tasks &nbsp;·&nbsp; ${pct}% done</span></div>
      <div class="bartrack"><div class="barfill" style="width:0;background:${avaColor(name)}" data-w="${barW}"></div></div>
    </div>`;
  }).join('');
  animateBars('#ov-person-bars');
}

// ════ REPORT ════
function renderReport(){
  const total=T.length;let done=0,critOpen=0;
  for(let i=0;i<total;i++){if(isDone(i))done++;else if(T[i][0]==='critical')critOpen++;}
  const pct=total?Math.round(done/total*100):0;const[lv,name]=matLevel(pct);
  setTimeout(()=>$('#rp-ring').style.strokeDashoffset=(RING-pct/100*RING).toFixed(1),60);
  $('#rp-pct').textContent=pct+'%';$('#rp-level-tag').textContent=lv;
  $('#rp-level').textContent=lv+' · '+name;
  const c=LS('kn_customer')||{};
  $('#rp-org').textContent=c.name?`${c.name}${c.industry?' · '+c.industry:''}${c.region?' · '+c.region:''}`:'Save a company profile to personalise this report.';
  $('#rp-stats').innerHTML=`
    <div class="stat"><div class="sv tnum">${total}</div><div class="sk">Tasks</div></div>
    <div class="stat"><div class="sv tnum">${done}</div><div class="sk">Completed</div></div>
    <div class="stat"><div class="sv c-crit tnum">${critOpen}</div><div class="sk">Critical open</div></div>`;

  // heatmap theme×level
  const map={};T.forEach((t,i)=>{const k=t[3]+'|'+t[2];(map[k]=map[k]||{t:0,d:0}).t++;if(isDone(i))map[k].d++;});
  const heat=$('#rp-heat');
  heat.style.gridTemplateColumns='118px repeat(4,1fr)';
  let h='<div class="heat-corner"></div>'+LEVELS.map(l=>`<div class="heat-colh">${l}</div>`).join('');
  THEMES.forEach(th=>{
    h+=`<div class="heat-rowh" title="${esc(th)}">${esc(THEME_SHORT[th]||th)}</div>`;
    LEVELS.forEach(lv=>{const d=map[th+'|'+lv]||{t:0,d:0};const p=d.t?d.d/d.t:0;
      const bg=`color-mix(in srgb, var(--accent) ${(p*82+6).toFixed(0)}%, var(--surface-2))`;
      h+=`<div class="heat-cell" style="background:${bg}" title="${esc(th)} · ${lv}: ${d.d}/${d.t} (${Math.round(p*100)}%)" data-goto-tasks>${d.t?Math.round(p*100):''}</div>`;});
  });
  heat.innerHTML=h;
  $('#rp-heat-scale').innerHTML=[6,30,55,80].map(p=>`<i style="background:color-mix(in srgb,var(--accent) ${p}%,var(--surface-2))"></i>`).join('');

  // framework coverage
  const fwMap={};T.forEach((t,i)=>{(fwMap[t[4]]=fwMap[t[4]]||{t:0,d:0}).t++;if(isDone(i))fwMap[t[4]].d++;});
  $('#rp-fw').innerHTML=FRAMEWORKS.map(fw=>{const d=fwMap[fw]||{t:0,d:0};const p=d.t?Math.round(d.d/d.t*100):0;
    return `<div class="barrow"><div class="bm"><span class="bl">${esc(fw)}</span><span class="bc tnum">${d.d}/${d.t} · ${p}%</span></div><div class="bartrack"><div class="barfill" style="width:0;background:var(--accent)" data-w="${p}"></div></div></div>`;}).join('');
  animateBars('#rp-fw');
}

// ════ PROFILE ════
function buildChoices(){
  const mk=(arr,group,labelFn)=>arr.map(v=>`<div class="choice" data-group="${group}" data-val="${esc(v)}"><span class="cbox"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 6"/></svg></span><span>${esc(labelFn?labelFn(v):v)}</span></div>`).join('');
  $('#ch-fw').innerHTML=mk(FRAMEWORKS,'fw');
  $('#ch-th').innerHTML=mk(THEMES,'th');
  $('#ch-pri').innerHTML=mk(PRIORITIES,'pri',v=>v[0].toUpperCase()+v.slice(1));
  $('#ch-lvl').innerHTML=mk(LEVELS,'lvl');
  $$('.choice').forEach(ch=>ch.addEventListener('click',()=>ch.classList.toggle('on')));
  $$('[data-all]').forEach(b=>b.addEventListener('click',()=>{
    const g=b.dataset.all;const ch=$$(`.choice[data-group="${g}"]`);const all=ch.every(c=>c.classList.contains('on'));
    ch.forEach(c=>c.classList.toggle('on',!all));b.textContent=all?'Select all':'Clear all';
  }));
}
function getChecked(group){return $$(`.choice[data-group="${group}"].on`).map(c=>c.dataset.val);}
function setChecked(group,vals){$$(`.choice[data-group="${group}"]`).forEach(c=>c.classList.toggle('on',(vals||[]).includes(c.dataset.val)));}
function loadProfile(){
  const c=LS('kn_customer')||{};
  ['name','industry','size','region','contact','email','team','notes'].forEach(k=>{const el=$('#c-'+k);if(el&&c[k]!=null)el.value=c[k];});
  setChecked('fw',c.frameworks);setChecked('th',c.themes);setChecked('pri',c.priorities);setChecked('lvl',c.levels);
}
function saveProfile(){
  const g=id=>$('#c-'+id).value;
  const c={name:g('name'),industry:g('industry'),size:g('size'),region:g('region'),contact:g('contact'),email:g('email'),team:g('team'),notes:g('notes'),
    frameworks:getChecked('fw'),priorities:getChecked('pri'),levels:getChecked('lvl'),themes:getChecked('th')};
  SS('kn_customer',c);
  const n=$('#saved-note');n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2400);
  renderTasks();syncBadges();navigateTo('tasks');
}

// ════ NAV ════
function navigateTo(screen){
  $$('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.screen===screen));
  $$('.screen').forEach(x=>x.classList.toggle('active',x.id==='s-'+screen));
  try{localStorage.setItem('kn_screen',screen)}catch(e){}
  if(screen==='overview')renderOverview();
  if(screen==='report')renderReport();
  closeRail();window.scrollTo({top:0});
}
$$('.nav-link').forEach(l=>l.addEventListener('click',()=>navigateTo(l.dataset.screen)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>navigateTo(b.dataset.goto)));
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto-task],[data-goto-tasks]');if(g)navigateTo('tasks');});
function syncBadges(){
  let critOpen=0,done=0;for(let i=0;i<T.length;i++){if(isDone(i))done++;else if(T[i][0]==='critical')critOpen++;}
  const b=$('#nav-crit-badge');if(critOpen>0){b.textContent=critOpen;b.style.display='flex';}else b.style.display='none';
}

// ════ FILTER CONTROLS ════
function buildFilters(){
  const opt=(v,l)=>`<option value="${esc(v)}">${esc(l)}</option>`;
  $('#f-p').innerHTML=opt('','All priorities')+PRIORITIES.map(p=>opt(p,p[0].toUpperCase()+p.slice(1))).join('');
  $('#f-l').innerHTML=opt('','All levels')+LEVELS.map(l=>opt(l,l)).join('');
  $('#f-fw').innerHTML=opt('','All frameworks')+FRAMEWORKS.map(f=>opt(f,FW_SHORT[f]||f)).join('');
  $('#f-th').innerHTML=opt('','All themes')+THEMES.map(t=>opt(t,THEME_SHORT[t]||t)).join('');
  $('#f-st').innerHTML=opt('','Any status')+STATUSES.map(s=>opt(s,s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))).join('');
}
$('#f-q').addEventListener('input',debounce(e=>{filters.q=e.target.value;recap();},160));
$('#f-p').addEventListener('change',e=>{filters.p=e.target.value;recap();});
$('#f-l').addEventListener('change',e=>{filters.l=e.target.value;recap();});
$('#f-fw').addEventListener('change',e=>{filters.fw=e.target.value;recap();});
$('#f-th').addEventListener('change',e=>{filters.th=e.target.value;recap();});
$('#f-st').addEventListener('change',e=>{filters.st=e.target.value;recap();});
function recap(){renderCap=250;renderTasks();}
$('#btn-reset').addEventListener('click',()=>{
  if(!confirm('Reset all task progress (status, dates, assignees, notes)?'))return;
  state={};SS('kn_state',state);
  filters={q:'',p:'',l:'',fw:'',th:'',st:''};
  $('#f-q').value='';['f-p','f-l','f-fw','f-th','f-st'].forEach(id=>$('#'+id).value='');
  renderTasks();syncBadges();
});

// ════ EXCEL / CSV IMPORT (logic preserved) ════
let XLSX_LOADED=false;
function loadSheetJS(cb){if(XLSX_LOADED){cb();return;}const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=()=>{XLSX_LOADED=true;cb();};s.onerror=()=>setStatus('Could not load spreadsheet parser (offline?). CSV still works.','var(--critical)');document.head.appendChild(s);}
const DEFAULT_TASKS=(typeof T!=='undefined')?T.slice():[];
function setStatus(m,c){const el=$('#upload-status');el.textContent=m;el.style.color=c||'var(--muted)';}
function openUpload(){$('#upload-modal').classList.add('open');document.body.classList.add('modal-open');}
function closeUpload(){$('#upload-modal').classList.remove('open');document.body.classList.remove('modal-open');}
$('#btn-open-upload').addEventListener('click',openUpload);
$('#btn-close-modal').addEventListener('click',closeUpload);
$('#upload-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeUpload();});
const drop=$('#drop'),fileInput=$('#file-input');
drop.addEventListener('click',()=>fileInput.click());
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over');});
drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');const f=e.dataTransfer.files[0];if(f)processFile(f);});
fileInput.addEventListener('change',()=>{if(fileInput.files[0])processFile(fileInput.files[0]);});
$('#btn-restore').addEventListener('click',()=>{
  T.length=0;DEFAULT_TASKS.forEach(t=>T.push(t));state={};SS('kn_state',state);
  closeUpload();$('#upbadge').classList.remove('show');renderTasks();syncBadges();
});
function processFile(file){
  setStatus('Reading…','var(--accent)');
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){const r=new FileReader();r.onload=e=>parseCSV(e.target.result);r.readAsText(file);}
  else{loadSheetJS(()=>{const r=new FileReader();r.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];parseRows(XLSX.utils.sheet_to_json(ws,{defval:''}));}catch(err){setStatus('Error: '+err.message,'var(--critical)');}};r.readAsArrayBuffer(file);});}
}
function parseCSV(text){const lines=text.split(/\r?\n/).filter(l=>l.trim());if(!lines.length){setStatus('Empty file','var(--critical)');return;}
  const headers=lines[0].split(',').map(h=>h.trim().replace(/['"]/g,'').toLowerCase());
  const rows=lines.slice(1).map(line=>{const vals=line.match(/(".*?"|[^,]+)/g)||[];const o={};headers.forEach((h,i)=>o[h]=(vals[i]||'').replace(/^"|"$/g,'').trim());return o;});
  parseRows(rows);}
function parseRows(rows){
  const newTasks=[];let skipped=0;
  rows.forEach(row=>{
    const find=names=>{for(const n of names){const k=Object.keys(row).find(k=>k.toLowerCase().replace(/\s+/g,'').includes(n));if(k&&row[k]!==undefined)return String(row[k]).trim();}return '';};
    const priRaw=(find(['priority','pri'])||'medium').toLowerCase().replace(/[^a-z]/g,'');
    const task=find(['task','description','action','name','title']);
    const level=find(['level','lv','maturity'])||'L1';
    const theme=find(['theme','category','area'])||'Governance & Leadership';
    const fw=find(['framework','fw','standard'])||'ISO-IEC 42001';
    const pri=PRIORITIES.find(p=>priRaw.includes(p))||'medium';
    if(!task){skipped++;return;}
    newTasks.push([pri,task,level,theme,fw]);
  });
  if(!newTasks.length){setStatus('No valid tasks found — check your column names. ('+skipped+' rows skipped)','var(--critical)');return;}
  T.length=0;newTasks.forEach(t=>T.push(t));state={};SS('kn_state',state);
  setStatus('✓ Loaded '+newTasks.length+' tasks'+(skipped?' ('+skipped+' skipped)':''),'var(--medium)');
  setTimeout(()=>{closeUpload();const b=$('#upbadge');$('#upbadge-txt').textContent=newTasks.length+' custom tasks';b.classList.add('show');renderTasks();syncBadges();},900);
}

// ════ PROFILE buttons ════
$('#btn-save-profile').addEventListener('click',saveProfile);
$('#btn-clear-profile').addEventListener('click',()=>{if(!confirm('Clear the company profile?'))return;localStorage.removeItem('kn_customer');loadProfile();renderTasks();syncBadges();});
$('#btn-print').addEventListener('click',()=>window.print());

// ════ THEME / SETTINGS ════
const SUN='<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>';
const MOON='<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>';
const root=document.documentElement;
function applyTheme(t){root.setAttribute('data-theme',t);$('#theme-ic').innerHTML=t==='dark'?SUN:MOON;$('#theme-lbl').textContent=t==='dark'?'Light':'Dark';localStorage.setItem('kn_theme',t);syncSeg('#theme-seg','data-theme',t);}
function applyAccent(a){root.setAttribute('data-accent',a);localStorage.setItem('kn_accent',a);$$('#accent-swatches .sw').forEach(s=>s.classList.toggle('on',s.dataset.accent===a));}
function applyDensity(d){root.setAttribute('data-density',d);localStorage.setItem('kn_density',d);syncSeg('#density-seg','data-density',d);}
function syncSeg(sel,attr,val){$$(sel+' button').forEach(b=>b.classList.toggle('on',b.getAttribute(attr)===val));}
applyTheme(localStorage.getItem('kn_theme')||'light');
applyAccent(localStorage.getItem('kn_accent')||'blue');
applyDensity(localStorage.getItem('kn_density')||'default');
$('#theme-btn').addEventListener('click',()=>applyTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'));
$$('#theme-seg button').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
$$('#accent-swatches .sw').forEach(s=>s.addEventListener('click',()=>applyAccent(s.dataset.accent)));
$$('#density-seg button').forEach(b=>b.addEventListener('click',()=>applyDensity(b.dataset.density)));
// settings popover
const pop=$('#settings-pop'),sbtn=$('#settings-btn');
sbtn.addEventListener('click',e=>{e.stopPropagation();const r=sbtn.getBoundingClientRect();pop.style.left=Math.min(r.left,window.innerWidth-252)+'px';pop.style.bottom=(window.innerHeight-r.top+8)+'px';pop.classList.toggle('open');});
document.addEventListener('click',e=>{if(!pop.contains(e.target)&&e.target!==sbtn)pop.classList.remove('open');});

// ════ MOBILE RAIL ════
const rail=$('#rail'),scrim=$('#scrim');
function openRail(){rail.classList.add('open');scrim.classList.add('show');}
function closeRail(){rail.classList.remove('open');scrim.classList.remove('show');}
$$('[data-rail-toggle]').forEach(b=>b.addEventListener('click',openRail));
scrim.addEventListener('click',closeRail);

// ════ INIT ════
buildFilters();buildChoices();loadProfile();renderTasks();syncBadges();
navigateTo((localStorage.getItem('kn_screen')||'tasks').replace('overview','overview'));

})();
