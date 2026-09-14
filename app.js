(()=>{"use strict";
const C=window.SONATE_DB||{},DRAFT="sonate-draft-v3",$=id=>document.getElementById(id);
let cat="Histoire",rec=null,listening=false,wants=false,base="";
const note=$("note"),fields=$("fields"),status=$("status");

const configured=()=>/^https:\/\/.+\.supabase\.co$/.test(C.supabaseUrl||"") && !!C.supabaseAnonKey;
$("dbBadge").textContent=configured()?"● Base Sonate prête":"● Base non configurée";
$("dbBadge").className="badge "+(configured()?"ok":"warn");

const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const opts=(arr=[],ph="Choisir…")=>`<option value="">${ph}</option>`+arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
const field=(id,label,body,full=false)=>`<div class="field ${full?"full":""}"><label for="${id}">${label}</label>${body}</div>`;

function vals(){let o={};fields.querySelectorAll("input,select").forEach(x=>o[x.id]=x.value);return o}
function restore(o={}){Object.entries(o).forEach(([k,v])=>{if($(k))$(k).value=v??""})}

function render(saved={}){
  const L=C.lists||{}; let h="";
  if(cat==="Histoire"){
    h+=field("type","Type",`<select id="type">${opts(L.storyTypes)}</select>`);
    h+=field("universe","Univers / genre",`<input id="universe" placeholder="Ex. Voxinaë">`);
    h+=field("saga","Saga",`<input id="saga" placeholder="Facultatif">`);
    h+=field("subSaga","Sous-saga",`<input id="subSaga" placeholder="Facultatif">`);
    h+=field("target","Œuvre",`<input id="target" placeholder="Facultatif / inconnue">`);
    h+=field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`);
  }else if(cat==="Podcast"){
    h+=field("target","Podcast",`<select id="target">${opts(L.podcasts)}</select>`);
    h+=field("type","Type d’idée",`<select id="type">${opts(L.podcastTypes)}</select>`);
    h+=field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
  }else if(cat==="Prompt personnage"){
    h+=field("target","Projet / application",`<input id="target" placeholder="Facultatif">`);
    h+=field("universe","Univers",`<input id="universe" placeholder="Ex. Voxinaë">`);
    h+=field("character","Personnage",`<input id="character" placeholder="Ex. Roy Vane">`);
    h+=field("type","Type de prompt",`<select id="type">${opts(L.promptTypes)}</select>`);
    h+=field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
  }else if(cat==="Site / outil"){
    h+=field("target","Projet / outil",`<input id="target" placeholder="Ex. Sonate">`);
    h+=field("type","Type",`<select id="type">${opts(L.toolTypes)}</select>`);
    h+=field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
  }else{
    h+=field("type","Type",`<input id="type" placeholder="Facultatif">`);
    h+=field("target","Projet / contexte",`<input id="target" placeholder="Facultatif">`);
    h+=field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
  }
  fields.innerHTML=h; restore(saved);
  fields.querySelectorAll("input,select").forEach(x=>{x.oninput=saveDraft;x.onchange=saveDraft});
}
function saveDraft(){localStorage.setItem(DRAFT,JSON.stringify({cat,note:note.value,fields:vals()}));updateStats()}
function loadDraft(){try{let d=JSON.parse(localStorage.getItem(DRAFT)||"null");if(!d)return;cat=d.cat||cat;note.value=d.note||"";document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b.dataset.cat===cat));render(d.fields||{});$("draftBadge").classList.remove("hidden")}catch(e){}}
function updateStats(){let t=note.value.trim(),w=t?t.split(/\s+/).length:0;$("stats").textContent=`${w} mot${w>1?"s":""} · ${note.value.length} caractère${note.value.length>1?"s":""}`}

document.querySelectorAll(".category").forEach(b=>b.onclick=()=>{let old=vals();cat=b.dataset.cat;document.querySelectorAll(".category").forEach(x=>x.classList.toggle("active",x===b));render(old);saveDraft()});
note.oninput=saveDraft;
$("clearBtn").onclick=()=>{if(confirm("Effacer cette note ?")){note.value="";localStorage.removeItem(DRAFT);$("draftBadge").classList.add("hidden");updateStats()}};

function norm(s){return String(s||"").toLowerCase().replace(/[.,!?;:…]+$/g,"")}
function collapse(t){let a=String(t||"").trim().split(/\s+/).filter(Boolean),o=[];for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&norm(a[j])===norm(a[i]))j++;if(j-i>=3)o.push(a[i]);else for(let k=i;k<j;k++)o.push(a[k]);i=j}return o.join(" ")}
function merge(a,b){let A=String(a||"").trim().split(/\s+/).filter(Boolean),B=String(b||"").trim().split(/\s+/).filter(Boolean);if(!A.length)return B.join(" ");let ov=0;for(let n=Math.min(A.length,B.length);n;n--){let good=true;for(let i=0;i<n;i++)if(norm(A[A.length-n+i])!==norm(B[i])){good=false;break}if(good){ov=n;break}}return [...A,...B.slice(ov)].join(" ")}

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
  rec=new SR(); rec.lang=C.language||"fr-FR"; rec.continuous=true; rec.interimResults=true; rec.maxAlternatives=1;
  rec.onstart=()=>{listening=true;base=note.value.trim();$("micBtn").classList.add("listening");$("micLabel").textContent="Arrêter";$("micStatus").textContent="Je t’écoute…";$("micHelp").textContent="Tu peux faire des pauses. Je continue jusqu’à ce que tu m’arrêtes."};
  rec.onresult=e=>{let fin="",inter="";for(let i=0;i<e.results.length;i++){let p=collapse(e.results[i][0].transcript||"");if(e.results[i].isFinal)fin=merge(fin,p);else inter=merge(inter,p)}note.value=collapse(merge(base,fin));$("interim").textContent=inter?"… "+inter:"";saveDraft()};
  rec.onend=()=>{listening=false;$("micBtn").classList.remove("listening");base=note.value.trim();$("interim").textContent="";if(wants){$("micLabel").textContent="Arrêter";$("micStatus").textContent="Je t’écoute…";setTimeout(()=>{try{if(wants&&!listening)rec.start()}catch(e){}},250)}else{$("micLabel").textContent="Dicter";$("micStatus").textContent="Micro en veille";$("micHelp").textContent="La dictée apparaîtra ici en direct."}};
  rec.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed")wants=false;$("micStatus").textContent="Micro : "+e.error};
  $("micBtn").onclick=()=>{try{if(wants){wants=false;if(listening)rec.stop()}else{wants=true;if(!listening)rec.start()}}catch(e){}};
}else{$("micBtn").disabled=true;$("micHelp").textContent="Dictée vocale indisponible dans ce navigateur."}

function makeId(){let d=new Date(),p=n=>String(n).padStart(2,"0");return `BOUT-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}

async function deposit(){
  if(!configured()){status.textContent="Configure Supabase dans config.js.";return}
  if(!note.value.trim()){status.textContent="La note est vide.";return}

  if(wants){wants=false;try{if(listening)rec.stop()}catch(e){}}

  const v=vals(), payload={
    id:makeId(),
    captured_at:new Date().toISOString(),
    category:cat,
    capture_type:v.type||"",
    universe:v.universe||"",
    saga:v.saga||"",
    sub_saga:v.subSaga||"",
    target:v.target||"",
    provisional_title:v.title||"",
    transcript:note.value.trim(),
    source:"Sonate",
    status:"received",
    metadata:{character:v.character||"",appVersion:"3.0.0"}
  };

  $("depositBtn").disabled=true; status.textContent="Dépôt dans Sonate…";
  try{
    const r=await fetch(`${C.supabaseUrl}/rest/v1/sonate_captures`,{
      method:"POST",
      headers:{
        "apikey":C.supabaseAnonKey,
        "Authorization":`Bearer ${C.supabaseAnonKey}`,
        "Content-Type":"application/json",
        "Prefer":"return=minimal"
      },
      body:JSON.stringify(payload)
    });
    if(!r.ok)throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    note.value=""; localStorage.removeItem(DRAFT); $("draftBadge").classList.add("hidden"); updateStats();
    status.textContent=`🌾 Note déposée : ${payload.id}`;
  }catch(e){
    status.textContent="Échec du dépôt. La note reste ici. "+e.message;
  }finally{$("depositBtn").disabled=false}
}
$("depositBtn").onclick=deposit;

render();loadDraft();updateStats();
})();