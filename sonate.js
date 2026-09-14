
(()=>{"use strict";
const cfg=window.SONATE_DB||{},$=id=>document.getElementById(id);
let cat="Histoire", rec=null, listening=false, wants=false, base="";
const note=$("note"), fields=$("fields"), status=$("status");

function okConfig(){return /^https:\/\/.+\.supabase\.co$/.test(cfg.supabaseUrl||"") && !!cfg.supabaseAnonKey}
$("dbStatus").textContent=okConfig()?"● Base Sonate prête":"● Base non configurée";

const f=(id,label,ph)=>`<div class="field"><label>${label}</label><input id="${id}" placeholder="${ph||"Facultatif"}"></div>`;
function render(){let h="";
if(cat==="Histoire")h=f("type","Type","Intrigue, scène…")+f("universe","Univers / genre","Voxinaë")+f("saga","Saga")+f("subSaga","Sous-saga")+f("target","Œuvre")+f("title","Titre provisoire");
else if(cat==="Podcast")h=f("type","Type d’idée","Épisode, sujet…")+f("target","Podcast")+f("title","Titre provisoire");
else h=f("type","Type")+f("target","Projet / contexte")+f("title","Titre provisoire");
fields.innerHTML=h}
render();

document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{
  cat=b.dataset.cat;
  document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===b));
  render();
});

function val(id){return $(id)?.value||""}
function id(){let d=new Date(),p=n=>String(n).padStart(2,"0");return `BOUT-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}

async function deposit(){
  if(!okConfig()){status.textContent="Configure Supabase dans config.js.";return}
  if(!note.value.trim()){status.textContent="La note est vide.";return}

  const payload={
    id:id(),
    captured_at:new Date().toISOString(),
    category:cat,
    capture_type:val("type"),
    universe:val("universe"),
    saga:val("saga"),
    sub_saga:val("subSaga"),
    target:val("target"),
    provisional_title:val("title"),
    transcript:note.value.trim(),
    source:"Sonate",
    status:"received",
    metadata:{appVersion:"supabase-mvp"}
  };

  status.textContent="Dépôt…";
  const r=await fetch(`${cfg.supabaseUrl}/rest/v1/sonate_captures`,{
    method:"POST",
    headers:{
      "apikey":cfg.supabaseAnonKey,
      "Authorization":`Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type":"application/json",
      "Prefer":"return=minimal"
    },
    body:JSON.stringify(payload)
  });

  if(!r.ok){
    status.textContent=`Échec du dépôt (${r.status}). Ta note reste affichée.`;
    return;
  }

  note.value="";
  status.textContent=`🌾 Note déposée dans Sonate : ${payload.id}`;
}
$("deposit").onclick=deposit;

function norm(s){return String(s||"").toLowerCase().replace(/[.,!?;:…]+$/g,"")}
function collapse(t){let a=String(t||"").trim().split(/\s+/).filter(Boolean),o=[];for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&norm(a[j])===norm(a[i]))j++;if(j-i>=3)o.push(a[i]);else for(let k=i;k<j;k++)o.push(a[k]);i=j}return o.join(" ")}
function merge(a,b){let A=String(a||"").trim().split(/\s+/).filter(Boolean),B=String(b||"").trim().split(/\s+/).filter(Boolean);if(!A.length)return B.join(" ");let ov=0;for(let n=Math.min(A.length,B.length);n;n--){let good=true;for(let i=0;i<n;i++)if(norm(A[A.length-n+i])!==norm(B[i])){good=false;break}if(good){ov=n;break}}return [...A,...B.slice(ov)].join(" ")}

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
  rec=new SR();rec.lang="fr-FR";rec.continuous=true;rec.interimResults=true;
  rec.onstart=()=>{listening=true;base=note.value.trim();$("mic").classList.add("listening")};
  rec.onresult=e=>{let fin="",inter="";for(let i=0;i<e.results.length;i++){let p=collapse(e.results[i][0].transcript);if(e.results[i].isFinal)fin=merge(fin,p);else inter=merge(inter,p)}note.value=collapse(merge(base,fin));$("interim").textContent=inter?"… "+inter:""};
  rec.onend=()=>{listening=false;base=note.value.trim();if(wants)setTimeout(()=>{try{if(wants&&!listening)rec.start()}catch(e){}},250)};
  $("mic").onclick=()=>{try{if(wants){wants=false;if(listening)rec.stop()}else{wants=true;if(!listening)rec.start()}}catch(e){}};
}
})();
