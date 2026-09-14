(()=>{"use strict";
const C=window.SONATE_CONFIG||{},D="sonate-draft-23",P="sonate-pending-23",$=id=>document.getElementById(id);
let cat="Histoire",rec=null,listening=false,wants=false,base="";
const note=$("note"),fields=$("fields"),status=$("status"),pending=$("pending"),retry=$("retry");
function field(id,label,ph){return `<div class="field"><label>${label}</label><input id="${id}" placeholder="${ph||"Facultatif"}"></div>`}
function render(saved={}){let h="";
if(cat==="Histoire")h=field("type","Type","Intrigue, scène, personnage…")+field("univers","Univers / genre","Voxinaë…")+field("saga","Saga")+field("sousSaga","Sous-saga")+field("cible","Œuvre")+field("titre","Titre provisoire");
else if(cat==="Podcast")h=field("type","Type d’idée","Idée d’épisode…")+field("cible","Podcast")+field("titre","Titre provisoire");
else h=field("type","Type")+field("cible","Projet / contexte")+field("titre","Titre provisoire");
fields.innerHTML=h;Object.entries(saved).forEach(([k,v])=>{if($(k))$(k).value=v});fields.querySelectorAll("input").forEach(x=>x.oninput=save)}
function vals(){let o={};fields.querySelectorAll("input").forEach(x=>o[x.id]=x.value);return o}
function save(){localStorage.setItem(D,JSON.stringify({cat,note:note.value,fields:vals()}))}
function load(){try{let d=JSON.parse(localStorage.getItem(D)||"null");if(d){cat=d.cat||cat;note.value=d.note||"";document.querySelectorAll(".cat").forEach(b=>b.classList.toggle("active",b.dataset.cat===cat));render(d.fields||{})}}catch(e){}}
document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{let v=vals();cat=b.dataset.cat;document.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));render(v);save()});note.oninput=save;
function norm(s){return String(s||"").toLowerCase().replace(/[.,!?;:…]+$/g,"")}
function collapse(t){let a=String(t||"").trim().split(/\s+/).filter(Boolean),o=[];for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&norm(a[j])===norm(a[i]))j++;if(j-i>=3)o.push(a[i]);else for(let k=i;k<j;k++)o.push(a[k]);i=j}return o.join(" ")}
function merge(a,b){let A=String(a||"").trim().split(/\s+/).filter(Boolean),B=String(b||"").trim().split(/\s+/).filter(Boolean);if(!A.length)return B.join(" ");let ov=0;for(let n=Math.min(A.length,B.length);n;n--){let ok=true;for(let i=0;i<n;i++)if(norm(A[A.length-n+i])!==norm(B[i])){ok=false;break}if(ok){ov=n;break}}return [...A,...B.slice(ov)].join(" ")}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){rec=new SR();rec.lang=C.language||"fr-FR";rec.continuous=true;rec.interimResults=true;
rec.onstart=()=>{listening=true;base=note.value.trim();$("mic").classList.add("listening");$("mictext").textContent="Arrêter";$("micstatus").textContent="Je t’écoute…"};
rec.onresult=e=>{let f="",it="";for(let i=0;i<e.results.length;i++){let p=collapse(e.results[i][0].transcript);if(e.results[i].isFinal)f=merge(f,p);else it=merge(it,p)}note.value=collapse(merge(base,f));$("interim").textContent=it?"… "+it:"";save()};
rec.onend=()=>{listening=false;$("mic").classList.remove("listening");base=note.value.trim();if(wants)setTimeout(()=>{try{if(wants&&!listening)rec.start()}catch(e){}},250);else{$("mictext").textContent="Dicter";$("micstatus").textContent="Micro en veille"}};
rec.onerror=e=>{if(e.error==="not-allowed")wants=false;$("micstatus").textContent="Micro : "+e.error};
$("mic").onclick=()=>{try{if(wants){wants=false;if(listening)rec.stop()}else{wants=true;if(!listening)rec.start()}}catch(e){}}}else $("mic").disabled=true;
function id(){let d=new Date(),p=n=>String(n).padStart(2,"0");return `BOUT-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function payload(old){let f=vals(),d=new Date();return{id:old||id(),horodatage:d.toISOString(),date:d.toLocaleDateString("fr-FR"),heure:d.toLocaleTimeString("fr-FR"),categorie:cat,type:f.type||"",univers:f.univers||"",saga:f.saga||"",sousSaga:f.sousSaga||"",cible:f.cible||"",titre:f.titre||"",transcription:note.value.trim(),source:"Sonate",statut:"Déposée",metadata:JSON.stringify({appVersion:"2.3.0"})}}
function jsonp(url,timeout=10000){return new Promise((res,rej)=>{let cb="__sonate"+Date.now()+Math.random().toString(36).slice(2),s=document.createElement("script"),timer=setTimeout(()=>{clean();rej(Error("timeout"))},timeout);function clean(){clearTimeout(timer);try{delete window[cb]}catch(e){}s.remove()}window[cb]=d=>{clean();res(d)};s.onerror=()=>{clean();rej(Error("network"))};s.src=url+(url.includes("?")?"&":"?")+"callback="+cb+"&_="+Date.now();document.head.appendChild(s)})}
function b64(v){let bytes=new TextEncoder().encode(v),bin="";bytes.forEach(x=>bin+=String.fromCharCode(x));return btoa(bin)}
async function send(p){let enc=b64(JSON.stringify(p)),chunks=[];for(let i=0;i<enc.length;i+=1200)chunks.push(enc.slice(i,i+1200));for(let i=0;i<chunks.length;i++){status.textContent=`Dépôt ${i+1}/${chunks.length}…`;let u=`${C.endpoint}?action=depositChunk&id=${encodeURIComponent(p.id)}&part=${i+1}&total=${chunks.length}&data=${encodeURIComponent(chunks[i])}`;let r=await jsonp(u);if(!r.ok)throw Error(r.error||"chunk")}status.textContent="Assemblage dans Pépinière…";let r=await jsonp(`${C.endpoint}?action=commitDeposit&id=${encodeURIComponent(p.id)}`,12000);if(!r.ok)throw Error(r.error||"commit");return r}
async function verify(i){let r=await jsonp(`${C.endpoint}?action=status&id=${encodeURIComponent(i)}`);return !!(r.ok&&r.found)}
function showPending(p){localStorage.setItem(P,JSON.stringify(p));pending.textContent=`Une note attend confirmation. ID ${p.id}. Rien ne sera effacé.`;pending.classList.remove("hidden");retry.classList.remove("hidden")}
function clearPending(){localStorage.removeItem(P);pending.classList.add("hidden");retry.classList.add("hidden")}
async function deposit(p){if(!C.endpoint){status.textContent="Ajoute l’URL /exec dans config.js.";return}if(!p.transcription){status.textContent="La note est vide.";return}showPending(p);$("deposit").disabled=true;try{await send(p);if(await verify(p.id)){clearPending();localStorage.removeItem(D);note.value="";status.textContent="🌾 Note déposée et confirmée : "+p.id}else status.textContent="Non confirmé. La note reste sur le téléphone."}catch(e){status.textContent="Dépôt non confirmé : "+e.message+". La note reste sauvegardée."}finally{$("deposit").disabled=false}}
$("deposit").onclick=()=>deposit(payload());
retry.onclick=()=>{try{let p=JSON.parse(localStorage.getItem(P));if(p)deposit(p)}catch(e){}};
try{let p=JSON.parse(localStorage.getItem(P)||"null");if(p){pending.textContent=`Une note attend confirmation. ID ${p.id}. Rien ne sera effacé.`;pending.classList.remove("hidden");retry.classList.remove("hidden")}}catch(e){}
render();load();$("runtime").textContent="Sonate prête · v2.3";
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=2.3").catch(()=>{});
})();