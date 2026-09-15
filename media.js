/* Sonate v4 - module médias. À charger APRÈS app.js */
(()=>{
"use strict";
const C=window.SONATE_DB||{};
const MAX=C.image?.maxFiles||8, MAX_DIM=C.image?.maxDimension||1600, QUALITY=C.image?.quality??.84;
let media=[];
const $=id=>document.getElementById(id);
const fmt=n=>n<1024?`${n} o`:n<1048576?`${Math.round(n/1024)} Ko`:`${(n/1048576).toFixed(1)} Mo`;

async function bitmap(file){
  if(window.createImageBitmap) return createImageBitmap(file);
  return new Promise((resolve,reject)=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
    img.onerror=reject; img.src=u;
  });
}
async function webp(file){
  const img=await bitmap(file);
  const iw=img.width, ih=img.height;
  const scale=Math.min(1,MAX_DIM/Math.max(iw,ih));
  const w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  canvas.getContext("2d",{alpha:false}).drawImage(img,0,0,w,h);
  const blob=await new Promise(r=>canvas.toBlob(r,"image/webp",QUALITY));
  if(img.close)img.close();
  if(!blob)throw new Error("Conversion WebP impossible");
  return {blob,width:w,height:h,originalWidth:iw,originalHeight:ih};
}
function render(){
  const panel=$("mediaPanel"),grid=$("mediaGrid");
  if(!panel||!grid)return;
  panel.hidden=!media.length;
  $("mediaCount").textContent=`${media.length} image${media.length>1?"s":""}`;
  const before=media.reduce((s,m)=>s+m.originalSize,0),after=media.reduce((s,m)=>s+m.blob.size,0);
  $("mediaSavings").textContent=media.length?`${fmt(before)} → ${fmt(after)} · −${Math.max(0,Math.round((1-after/before)*100))}%`:"";
  grid.innerHTML=media.map((m,i)=>`<div class="sonate-media-item"><img src="${m.preview}" alt="Capture"><button type="button" data-media-remove="${i}">×</button><small>${fmt(m.blob.size)}</small></div>`).join("");
  grid.querySelectorAll("[data-media-remove]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.mediaRemove;URL.revokeObjectURL(media[i].preview);media.splice(i,1);render();
  });
}
async function upload(captureId){
  const out=[],bucket=C.storageBucket||"sonate-media";
  for(let i=0;i<media.length;i++){
    const m=media[i],path=`${captureId}/${String(i+1).padStart(2,"0")}.webp`;
    const r=await fetch(`${C.supabaseUrl}/storage/v1/object/${bucket}/${path}`,{
      method:"POST",
      headers:{apikey:C.supabaseAnonKey,Authorization:`Bearer ${C.supabaseAnonKey}`,"Content-Type":"image/webp","x-upsert":"false"},
      body:m.blob
    });
    if(!r.ok)throw new Error(`Upload image ${i+1}: HTTP ${r.status}`);
    out.push({bucket,path,mime:"image/webp",bytes:m.blob.size,width:m.width,height:m.height,
      original_name:m.originalName,original_bytes:m.originalSize});
  }
  return out;
}
window.SonateMedia={
  has:()=>media.length>0,
  count:()=>media.length,
  upload,
  metadata:()=>media.map(m=>({original_name:m.originalName,original_bytes:m.originalSize,bytes:m.blob.size,width:m.width,height:m.height})),
  clear:()=>{media.forEach(m=>URL.revokeObjectURL(m.preview));media=[];render();}
};
document.addEventListener("DOMContentLoaded",()=>{
  const input=$("imageInput"),button=$("imageBtn");
  if(!input||!button)return;
  button.onclick=()=>input.click();
  input.onchange=async()=>{
    const files=[...input.files].filter(f=>f.type.startsWith("image/")).slice(0,Math.max(0,MAX-media.length));
    for(const f of files){
      const c=await webp(f);
      media.push({...c,originalName:f.name,originalSize:f.size,preview:URL.createObjectURL(c.blob)});
    }
    input.value="";render();
  };
  render();
});
})();