
(()=>{"use strict";
const c=window.SONATE_DB||{},$=id=>document.getElementById(id);
let rows=[],filter="";
function headers(){return{"apikey":c.supabaseAnonKey,"Authorization":`Bearer ${c.supabaseAnonKey}`}}
async function load(){
  $("status").textContent="Chargement…";
  const r=await fetch(`${c.supabaseUrl}/rest/v1/sonate_captures?select=*&order=created_at.desc`,{headers:headers()});
  if(!r.ok){$("status").textContent=`Erreur ${r.status}`;return}
  rows=await r.json();$("status").textContent="";render();
}
function render(){
  const data=filter?rows.filter(x=>x.status===filter):rows;
  $("count").textContent=`${data.length} capture${data.length>1?"s":""}`;
  if(!data.length){$("list").innerHTML='<div class="empty">Aucune capture ici.</div>';return}
  $("list").innerHTML=data.map(x=>`<article class="item">
    <div class="top"><span class="id">${x.id}</span><span class="pill ${x.status}">${x.status}</span></div>
    <div class="meta"><span>${new Date(x.created_at).toLocaleString("fr-FR")}</span><span>• ${x.category||"Sans catégorie"}</span><span>• ${x.capture_type||"Sans type"}</span>${x.saga?`<span>• ${x.saga}</span>`:""}${x.sub_saga?`<span>• ${x.sub_saga}</span>`:""}</div>
    ${x.provisional_title?`<h3>${x.provisional_title}</h3>`:""}
    <div class="text">${String(x.transcript||"").replaceAll("<","&lt;")}</div>
  </article>`).join("");
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.status;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));render()});
$("refresh").onclick=load;
$("csv").onclick=()=>{
  const data=filter?rows.filter(x=>x.status===filter):rows;
  const cols=["id","created_at","category","capture_type","universe","saga","sub_saga","target","provisional_title","transcript","status"];
  const q=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[cols.join(","),...data.map(r=>cols.map(k=>q(r[k])).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="sonate-captures.csv";a.click();URL.revokeObjectURL(a.href);
};
load();
})();
