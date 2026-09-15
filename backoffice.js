(()=>{"use strict";
const C=window.SONATE_DB||{},$=id=>document.getElementById(id);let rows=[],filter="";
function headers(){return{"apikey":C.supabaseAnonKey,"Authorization":`Bearer ${C.supabaseAnonKey}`}}
function safe(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}

async function signedUrl(bucket,path){
  const r=await fetch(`${C.supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`,{
    method:"POST",
    headers:{...headers(),"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn:3600})
  });
  if(!r.ok)return "";
  const j=await r.json();
  return j.signedURL ? `${C.supabaseUrl}/storage/v1${j.signedURL}` : "";
}

async function load(){
  $("status").textContent="Chargement…";
  if(!C.supabaseUrl||!C.supabaseAnonKey){$("status").textContent="Supabase n’est pas configuré dans config.js.";return}
  const r=await fetch(`${C.supabaseUrl}/rest/v1/sonate_captures?select=*&order=created_at.desc`,{headers:headers()});
  if(!r.ok){$("status").textContent=`Erreur ${r.status}`;return}
  rows=await r.json();

  for(const row of rows){
    const attachments=row.metadata?.attachments||[];
    row._mediaUrls=await Promise.all(
      attachments.map(m=>signedUrl(m.bucket||C.storageBucket||"sonate-media",m.path))
    );
  }

  $("status").textContent="";
  render();
}

function render(){
  const data=filter?rows.filter(x=>x.status===filter):rows;
  $("count").textContent=`${data.length} capture${data.length>1?"s":""}`;
  if(!data.length){$("list").innerHTML='<div class="empty">Aucune capture ici.</div>';return}

  $("list").innerHTML=data.map(x=>{
    const attachments=x.metadata?.attachments||[];
    const media=attachments.length?`<div class="media-list">${attachments.map((m,i)=>{
      const url=x._mediaUrls?.[i]||"";
      return url?`<a class="media-card" href="${safe(url)}" target="_blank" rel="noopener">
        <img src="${safe(url)}" alt="Capture visuelle">
        <small>${Math.round((m.bytes||0)/1024)} Ko · ${safe(m.width)}×${safe(m.height)}</small>
      </a>`:"";
    }).join("")}</div>`:"";

    return `<article class="item">
      <div class="top"><span class="id">${safe(x.id)}</span><span class="pill ${safe(x.status)}">${safe(x.status)}</span></div>
      <div class="meta">
        <span>${new Date(x.created_at).toLocaleString("fr-FR")}</span>
        <span>• ${safe(x.category||"Sans catégorie")}</span>
        <span>• ${safe(x.capture_type||"Sans type")}</span>
        ${x.saga?`<span>• ${safe(x.saga)}</span>`:""}
        ${x.sub_saga?`<span>• ${safe(x.sub_saga)}</span>`:""}
        ${x.metadata?.destination?`<span>• ${safe(x.metadata.destination)}</span>`:""}
      </div>
      ${x.provisional_title?`<h3>${safe(x.provisional_title)}</h3>`:""}
      <div class="text">${safe(x.transcript)}</div>
      ${media}
    </article>`;
  }).join("");
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  filter=b.dataset.status;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  render();
});
$("refresh").onclick=load;
$("csv").onclick=()=>{
  const data=filter?rows.filter(x=>x.status===filter):rows,
    cols=["id","created_at","category","capture_type","universe","saga","sub_saga","target","provisional_title","transcript","status"],
    q=v=>`"${String(v??"").replaceAll('"','""')}"`,
    csv=[cols.join(","),...data.map(r=>cols.map(k=>q(r[k])).join(","))].join("\n"),
    a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download="sonate-captures.csv";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
load();
})();