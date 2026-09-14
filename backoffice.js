(()=>{"use strict";
const C=window.SONATE_DB||{},$=id=>document.getElementById(id);let rows=[],filter="";
function headers(){return{"apikey":C.supabaseAnonKey,"Authorization":`Bearer ${C.supabaseAnonKey}`}}
async function load(){
  $("status").textContent="Chargement…";
  if(!C.supabaseUrl||!C.supabaseAnonKey){$("status").textContent="Supabase n’est pas configuré dans config.js.";return}
  const r=await fetch(`${C.supabaseUrl}/rest/v1/sonate_captures?select=*&order=created_at.desc`,{headers:headers()});
  if(!r.ok){$("status").textContent=`Erreur ${r.status}`;return}
  rows=await r.json();$("status").textContent="";render()
}
function safe(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
function render(){
  const data=filter?rows.filter(x=>x.status===filter):rows;
  $("count").textContent=`${data.length} capture${data.length>1?"s":""}`;
  if(!data.length){$("list").innerHTML='<div class="empty">Aucune capture ici.</div>';return}
  $("list").innerHTML=data.map(x=>`<article class="item">
    <div class="top"><span class="id">${safe(x.id)}</span><span class="pill ${safe(x.status)}">${safe(x.status)}</span></div>
    <div class="meta"><span>${new Date(x.created_at).toLocaleString("fr-FR")}</span><span>• ${safe(x.category||"Sans catégorie")}</span><span>• ${safe(x.capture_type||"Sans type")}</span>${x.saga?`<span>• ${safe(x.saga)}</span>`:""}${x.sub_saga?`<span>• ${safe(x.sub_saga)}</span>`:""}</div>
    ${x.provisional_title?`<h3>${safe(x.provisional_title)}</h3>`:""}
    <div class="text">${safe(x.transcript)}</div>
  </article>`).join("")
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.status;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));render()});
$("refresh").onclick=load;
$("csv").onclick=()=>{const data=filter?rows.filter(x=>x.status===filter):rows,cols=["id","created_at","category","capture_type","universe","saga","sub_saga","target","provisional_title","transcript","status"],q=v=>`"${String(v??"").replaceAll('"','""')}"`,csv=[cols.join(","),...data.map(r=>cols.map(k=>q(r[k])).join(","))].join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="sonate-captures.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
load();
})();