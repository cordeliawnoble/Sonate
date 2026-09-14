(() => {
  "use strict";

  const onReady = (fn) => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  };

  onReady(() => {
    const status = document.getElementById("runtimeStatus");

    try {
      const cfg = window.SONATE_CONFIG || {};
      const DRAFT_KEY = "sonate-draft-v21";
      const PENDING_KEY = "sonate-pending-v21";

      const el = id => document.getElementById(id);
      const transcript = el("transcript");
      const interim = el("interim");
      const micBtn = el("micBtn");
      const micLabel = el("micLabel");
      const listenStatus = el("listenStatus");
      const supportStatus = el("supportStatus");
      const stats = el("stats");
      const dynamicFields = el("dynamicFields");
      const depositBtn = el("depositBtn");
      const retryBtn = el("retryBtn");
      const pendingBox = el("pendingBox");
      const pendingText = el("pendingText");
      const saveStatus = el("saveStatus");
      const successDialog = el("successDialog");
      const successId = el("successId");
      const draftBadge = el("draftBadge");
      const connectionDot = el("connectionDot");

      if (!transcript || !micBtn || !dynamicFields || !depositBtn) {
        throw new Error("Interface Sonate incomplète : éléments essentiels introuvables.");
      }

      let category = "Histoire";
      let recognition = null;
      let listening = false;
      let keepListening = false;
      let startedAt = null;
      let baseText = "";

      const esc = (v="") => String(v)
        .replaceAll("&","&amp;").replaceAll("<","&lt;")
        .replaceAll(">","&gt;").replaceAll('"',"&quot;");

      const opts = (items=[], placeholder="Choisir…") =>
        `<option value="">${esc(placeholder)}</option>` +
        items.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");

      const field = (id, label, html, full=false) =>
        `<div class="field ${full ? "full" : ""}">
          <label for="${id}">${label}</label>${html}
        </div>`;

      function values() {
        const out = {};
        dynamicFields.querySelectorAll("input,select").forEach(x => out[x.id] = x.value);
        return out;
      }

      function restoreValues(saved={}) {
        Object.entries(saved).forEach(([k,v]) => {
          const x = el(k);
          if (x) x.value = v ?? "";
        });
      }

      function renderFields(saved={}) {
        const L = cfg.lists || {};
        let html = "";

        if (category === "Histoire") {
          html += field("type","Type",`<select id="type">${opts(L.storyTypes)}</select>`);
          html += field("univers","Univers / genre",`<input id="univers" placeholder="Ex. Voxinaë, urban fantasy…">`);
          html += field("saga","Saga",`<input id="saga" placeholder="Facultatif">`);
          html += field("sousSaga","Sous-saga",`<input id="sousSaga" placeholder="Facultatif">`);
          html += field("cible","Œuvre",`<input id="cible" placeholder="Facultatif / inconnue">`);
          html += field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`);
        } else if (category === "Podcast") {
          html += field("cible","Podcast",`<select id="cible">${opts(L.podcasts)}</select>`);
          html += field("type","Type d’idée",`<select id="type">${opts(L.podcastTypes)}</select>`);
          html += field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
        } else if (category === "Prompt personnage") {
          html += field("cible","Projet / application",`<input id="cible" placeholder="Ex. future appli personnages">`);
          html += field("univers","Univers",`<input id="univers" placeholder="Ex. Voxinaë">`);
          html += field("personnage","Personnage",`<input id="personnage" placeholder="Ex. Roy Vane">`);
          html += field("type","Type de prompt",`<select id="type">${opts(L.promptTypes)}</select>`);
          html += field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
        } else if (category === "Site / outil") {
          html += field("cible","Projet / outil",`<input id="cible" placeholder="Ex. Sonate, site auteur…">`);
          html += field("type","Type",`<select id="type">${opts(L.toolTypes)}</select>`);
          html += field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
        } else {
          html += field("type","Type",`<input id="type" placeholder="Facultatif">`);
          html += field("cible","Projet / contexte",`<input id="cible" placeholder="Facultatif">`);
          html += field("title","Titre provisoire",`<input id="title" placeholder="Facultatif">`,true);
        }

        dynamicFields.innerHTML = html;
        restoreValues(saved);
        dynamicFields.querySelectorAll("input,select").forEach(x => {
          x.addEventListener("input", saveDraft);
          x.addEventListener("change", saveDraft);
        });
      }

      function updateStats() {
        const txt = transcript.value.trim();
        const words = txt ? txt.split(/\s+/).length : 0;
        stats.textContent = `${words} mot${words > 1 ? "s" : ""} · ${transcript.value.length} caractère${transcript.value.length > 1 ? "s" : ""}`;
      }

      function saveDraft() {
        const data = {
          category, transcript: transcript.value,
          fields: values(), startedAt: startedAt || new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        updateStats();
      }

      function loadDraft() {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (!raw) return;
          const d = JSON.parse(raw);
          if (!d.transcript && !Object.values(d.fields || {}).some(Boolean)) return;
          category = d.category || "Histoire";
          transcript.value = d.transcript || "";
          startedAt = d.startedAt || null;
          setCategory(category);
          renderFields(d.fields || {});
          draftBadge.classList.remove("hidden");
        } catch (_) {}
      }

      function clearDraft(reset=true) {
        localStorage.removeItem(DRAFT_KEY);
        transcript.value = "";
        interim.textContent = "";
        startedAt = null;
        baseText = "";
        draftBadge.classList.add("hidden");
        if (reset) {
          category = "Histoire";
          setCategory(category);
          renderFields();
        }
        updateStats();
      }

      function setCategory(name) {
        category = name;
        document.querySelectorAll(".category").forEach(b =>
          b.classList.toggle("active", b.dataset.category === category)
        );
      }

      document.querySelectorAll(".category").forEach(btn => {
        btn.addEventListener("click", () => {
          const previous = values();
          setCategory(btn.dataset.category);
          renderFields(previous);
          saveDraft();
        });
      });

      transcript.addEventListener("input", () => {
        startedAt = startedAt || new Date().toISOString();
        saveDraft();
      });

      el("clearBtn").addEventListener("click", () => {
        if (confirm("Effacer cette note et son brouillon local ?")) clearDraft(false);
      });

      function norm(s) {
        return String(s||"").toLocaleLowerCase("fr-FR").replace(/[.,!?;:…]+$/g,"");
      }

      function collapse(text) {
        const t = String(text||"").trim().split(/\s+/).filter(Boolean);
        const out = [];
        for (let i=0; i<t.length;) {
          let j=i+1;
          while (j<t.length && norm(t[j])===norm(t[i])) j++;
          const run=j-i;
          if (run>=3 && norm(t[i])) out.push(t[i]);
          else for(let k=i;k<j;k++) out.push(t[k]);
          i=j;
        }
        return out.join(" ");
      }

      function merge(a,b) {
        const A=String(a||"").trim().split(/\s+/).filter(Boolean);
        const B=String(b||"").trim().split(/\s+/).filter(Boolean);
        if(!A.length) return B.join(" ");
        if(!B.length) return A.join(" ");
        let overlap=0;
        for(let size=Math.min(A.length,B.length);size>=1;size--){
          let same=true;
          for(let i=0;i<size;i++){
            if(norm(A[A.length-size+i])!==norm(B[i])) { same=false; break; }
          }
          if(same){ overlap=size; break; }
        }
        return [...A,...B.slice(overlap)].join(" ");
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SR) {
        recognition = new SR();
        recognition.lang = cfg.defaults?.language || "fr-FR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          listening = true;
          baseText = transcript.value.trim();
          startedAt = startedAt || new Date().toISOString();
          micBtn.classList.add("listening");
          micBtn.setAttribute("aria-pressed","true");
          micLabel.textContent = "Arrêter";
          listenStatus.textContent = "Je t’écoute…";
          supportStatus.textContent = "Tu peux faire des pauses, je relance le micro toute seule.";
        };

        recognition.onresult = e => {
          let finalText="", interimText="";
          for(let i=0;i<e.results.length;i++){
            const piece=collapse(e.results[i][0].transcript||"");
            if(!piece) continue;
            if(e.results[i].isFinal) finalText=merge(finalText,piece);
            else interimText=merge(interimText,piece);
          }
          transcript.value = collapse(merge(baseText,finalText));
          interim.textContent = interimText ? "… "+collapse(interimText) : "";
          saveDraft();
        };

        recognition.onerror = e => {
          if(e.error==="not-allowed" || e.error==="service-not-allowed") keepListening=false;
          supportStatus.textContent = e.error==="not-allowed"
            ? "Autorise le micro dans Chrome."
            : `Micro interrompu (${e.error}).`;
        };

        recognition.onend = () => {
          listening=false;
          micBtn.classList.remove("listening");
          micBtn.setAttribute("aria-pressed","false");
          baseText=transcript.value.trim();
          interim.textContent="";

          if(keepListening){
            micLabel.textContent="Arrêter";
            listenStatus.textContent="Je t’écoute…";
            setTimeout(() => {
              try { if(keepListening && !listening) recognition.start(); } catch(_) {}
            },250);
          } else {
            micLabel.textContent="Dicter";
            listenStatus.textContent="Micro en veille";
          }
          saveDraft();
        };

        micBtn.addEventListener("click", () => {
          try {
            if(keepListening){
              keepListening=false;
              if(listening) recognition.stop();
            } else {
              keepListening=true;
              if(!listening) recognition.start();
            }
          } catch(err) {
            supportStatus.textContent="Impossible de démarrer le micro. Recharge Sonate.";
          }
        });
      } else {
        micBtn.disabled=true;
        supportStatus.textContent="Dictée vocale non disponible dans ce navigateur.";
      }

      function makeId(){
        const d=new Date(), p=n=>String(n).padStart(2,"0");
        return `BOUT-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      }

      function payload(existingId){
        const d=new Date(), f=values();
        return {
          id: existingId || makeId(),
          horodatage:d.toISOString(),
          date:new Intl.DateTimeFormat("fr-FR",{dateStyle:"short"}).format(d),
          heure:new Intl.DateTimeFormat("fr-FR",{timeStyle:"medium"}).format(d),
          categorie:category,
          type:f.type||"", univers:f.univers||"", saga:f.saga||"",
          sousSaga:f.sousSaga||"", cible:f.cible||"", titre:f.title||"",
          transcription:transcript.value.trim(),
          source:cfg.defaults?.source||"Sonate",
          statut:"Déposée",
          metadata:JSON.stringify({
            personnage:f.personnage||"",
            capturedStartedAt:startedAt||d.toISOString(),
            appVersion:"2.1.0"
          })
        };
      }

      function getPending(){
        try { return JSON.parse(localStorage.getItem(PENDING_KEY)||"null"); }
        catch(_) { return null; }
      }
      function setPending(p){
        localStorage.setItem(PENDING_KEY,JSON.stringify(p));
        renderPending();
      }
      function clearPending(){
        localStorage.removeItem(PENDING_KEY);
        renderPending();
      }
      function renderPending(){
        const p=getPending();
        pendingBox.classList.toggle("hidden",!p);
        if(p) pendingText.textContent=`ID ${p.id}. Rien ne sera effacé avant confirmation.`;
      }

      function hiddenPost(p){
        const form=document.createElement("form");
        form.method="POST";
        form.action=cfg.endpoint;
        form.target="depositFrame";
        form.style.display="none";
        Object.entries(p).forEach(([k,v])=>{
          const input=document.createElement("input");
          input.type="hidden"; input.name=k; input.value=String(v??"");
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        form.remove();
      }

      function jsonp(url, timeout=6000){
        return new Promise((resolve,reject)=>{
          const cb="__sonate_"+Date.now()+"_"+Math.random().toString(36).slice(2);
          const script=document.createElement("script");
          const timer=setTimeout(()=>{ cleanup(); reject(new Error("timeout")); },timeout);
          const cleanup=()=>{
            clearTimeout(timer);
            try{ delete window[cb]; }catch(_){}
            script.remove();
          };
          window[cb]=data=>{ cleanup(); resolve(data); };
          script.onerror=()=>{ cleanup(); reject(new Error("jsonp")); };
          script.src=url+(url.includes("?")?"&":"?")+"callback="+encodeURIComponent(cb)+"&_="+Date.now();
          document.head.appendChild(script);
        });
      }

      const sleep=ms=>new Promise(r=>setTimeout(r,ms));

      async function verify(id){
        const v=cfg.verification||{};
        await sleep(v.firstDelayMs||1000);
        for(let i=0;i<(v.attempts||8);i++){
          try{
            const r=await jsonp(`${cfg.endpoint}?action=status&id=${encodeURIComponent(id)}`);
            if(r?.ok && r?.found) return true;
          }catch(_){}
          await sleep(v.intervalMs||1100);
        }
        return false;
      }

      async function sendAndVerify(p, send=true){
        if(!cfg.endpoint) throw new Error("endpoint");
        setPending(p);
        if(send) hiddenPost(p);
        return await verify(p.id);
      }

      async function deposit(){
        const p=payload();
        if(!p.transcription){
          saveStatus.textContent="Écris ou dicte quelque chose avant de déposer.";
          return;
        }
        if(!cfg.endpoint){
          saveStatus.textContent="L’URL Apps Script manque dans config.js.";
          return;
        }

        if(keepListening){
          keepListening=false;
          try{ if(listening) recognition.stop(); }catch(_){}
        }

        depositBtn.disabled=true;
        saveStatus.textContent="Dépôt en cours…";

        try{
          const ok=await sendAndVerify(p,true);
          if(ok){
            clearPending();
            clearDraft(false);
            successId.textContent=p.id;
            saveStatus.textContent="";
            if(successDialog?.showModal) successDialog.showModal();
            else alert("Note déposée : "+p.id);
          }else{
            saveStatus.textContent="Pas encore confirmé. Ta note reste sauvegardée sur ce téléphone.";
          }
        }catch(err){
          console.error(err);
          saveStatus.textContent="Impossible de confirmer le dépôt. La note reste sauvegardée.";
        }finally{
          depositBtn.disabled=false;
          renderPending();
        }
      }

      async function retry(){
        const p=getPending();
        if(!p) return;
        retryBtn.disabled=true;
        saveStatus.textContent="Je vérifie la note…";
        try{
          let ok=await verify(p.id);
          if(!ok) ok=await sendAndVerify(p,true);
          if(ok){
            clearPending();
            clearDraft(false);
            successId.textContent=p.id;
            saveStatus.textContent="";
            if(successDialog?.showModal) successDialog.showModal();
            else alert("Note déposée : "+p.id);
          }else{
            saveStatus.textContent="Toujours non confirmée. Rien n’a été effacé.";
          }
        }finally{
          retryBtn.disabled=false;
          renderPending();
        }
      }

      depositBtn.addEventListener("click",deposit);
      retryBtn.addEventListener("click",retry);

      el("newNoteBtn")?.addEventListener("click",()=>{
        successDialog?.close?.();
        clearDraft(true);
        transcript.focus();
      });

      window.addEventListener("online",()=>{
        connectionDot.textContent="● en ligne";
        connectionDot.style.color="#708268";
      });
      window.addEventListener("offline",()=>{
        connectionDot.textContent="● hors ligne";
        connectionDot.style.color="#a26b74";
      });

      renderFields();
      loadDraft();
      renderPending();
      updateStats();

      status.textContent="Sonate prête · v2.1";
      status.className="runtime-status ready";

      if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./sw.js?v=2.1").catch(console.warn);
      }
    } catch (err) {
      console.error("Sonate fatal:", err);
      if (status) {
        status.textContent="Erreur Sonate · recharge la page";
        status.className="runtime-status error";
      }
      const msg=document.getElementById("saveStatus");
      if(msg) msg.textContent="Sonate n’a pas réussi à démarrer : "+(err?.message||err);
    }
  });
})();
