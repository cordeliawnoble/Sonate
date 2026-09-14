(() => {
  const cfg = window.SONATE_CONFIG || {};
  const DRAFT_KEY = "sonate-draft-v1";
  let category = "Histoire";
  let recognition = null;
  let listening = false;
  let userWantsListening = false;
  let startedAt = null;

  // Dictée : on garde le texte qui existait AVANT la session séparément
  // des résultats fournis par le moteur vocal. On reconstruit la session
  // au lieu d'ajouter chaque événement, ce qui évite les doublons Chrome.
  let speechBaseText = "";
  let speechFinalText = "";

  const $ = (s) => document.querySelector(s);
  const transcript = $("#transcript");
  const interim = $("#interim");
  const micBtn = $("#micBtn");
  const micLabel = $("#micLabel");
  const listenStatus = $("#listenStatus");
  const supportStatus = $("#supportStatus");
  const stats = $("#stats");
  const dynamicFields = $("#dynamicFields");
  const depositBtn = $("#depositBtn");
  const saveStatus = $("#saveStatus");
  const successDialog = $("#successDialog");
  const draftBadge = $("#draftBadge");
  const connectionDot = $("#connectionDot");

  const esc = (v = "") => String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const options = (items, placeholder = "Choisir…") =>
    `<option value="">${esc(placeholder)}</option>` +
    items.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");

  const field = (name, label, body, full = false) =>
    `<div class="field ${full ? "full" : ""}" data-field="${name}">
       <label for="${name}">${label}</label>
       ${body}
     </div>`;

  function renderFields(saved = {}) {
    const L = cfg.lists || {};
    let html = "";

    if (category === "Histoire") {
      html += field("type", "Type", `<select id="type">${options(L.storyTypes || [])}</select>`);
      html += field("univers", "Univers / genre", `<input id="univers" list="universList" placeholder="Ex. Voxinaë, urban fantasy…"><datalist id="universList"></datalist>`);
      html += field("saga", "Saga", `<input id="saga" placeholder="Facultatif">`);
      html += field("sousSaga", "Sous-saga", `<input id="sousSaga" placeholder="Facultatif">`);
      html += field("cible", "Œuvre", `<input id="cible" placeholder="Facultatif / inconnue">`);
      html += field("title", "Titre provisoire", `<input id="title" placeholder="Facultatif">`);
    } else if (category === "Podcast") {
      html += field("cible", "Podcast", `<select id="cible">${options(L.podcasts || [])}</select>`);
      html += field("type", "Type d’idée", `<select id="type">${options(L.podcastTypes || [])}</select>`);
      html += field("title", "Titre provisoire", `<input id="title" placeholder="Facultatif">`, true);
    } else if (category === "Prompt personnage") {
      html += field("cible", "Projet / application", `<input id="cible" placeholder="Ex. future appli personnages">`);
      html += field("univers", "Univers", `<input id="univers" placeholder="Ex. Voxinaë">`);
      html += field("personnage", "Personnage", `<input id="personnage" placeholder="Ex. Roy Vane">`);
      html += field("type", "Type de prompt", `<select id="type">${options(L.promptTypes || [])}</select>`);
      html += field("title", "Titre provisoire", `<input id="title" placeholder="Facultatif">`, true);
    } else if (category === "Site / outil") {
      html += field("cible", "Projet / outil", `<input id="cible" placeholder="Ex. Sonate, site auteur…">`);
      html += field("type", "Type", `<select id="type">${options(L.toolTypes || [])}</select>`);
      html += field("title", "Titre provisoire", `<input id="title" placeholder="Facultatif">`, true);
    } else {
      html += field("type", "Type", `<input id="type" placeholder="Facultatif">`);
      html += field("cible", "Projet / contexte", `<input id="cible" placeholder="Facultatif">`);
      html += field("title", "Titre provisoire", `<input id="title" placeholder="Facultatif">`, true);
    }

    dynamicFields.innerHTML = html;
    restoreFieldValues(saved);
    dynamicFields.querySelectorAll("input,select").forEach(el => {
      el.addEventListener("input", persistDraft);
      el.addEventListener("change", persistDraft);
    });
  }

  function getFieldValues() {
    const result = {};
    dynamicFields.querySelectorAll("input,select").forEach(el => result[el.id] = el.value);
    return result;
  }

  function restoreFieldValues(values = {}) {
    Object.entries(values).forEach(([k,v]) => {
      const el = document.getElementById(k);
      if (el && v != null) el.value = v;
    });
  }

  function updateStats() {
    const txt = transcript.value.trim();
    const words = txt ? txt.split(/\s+/).length : 0;
    stats.textContent = `${words} mot${words > 1 ? "s" : ""} · ${transcript.value.length} caractère${transcript.value.length > 1 ? "s" : ""}`;
  }

  function persistDraft() {
    const draft = {
      category,
      transcript: transcript.value,
      fields: getFieldValues(),
      startedAt: startedAt || new Date().toISOString()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
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
      startedAt = d.startedAt || new Date().toISOString();
      setCategoryUI();
      renderFields(d.fields || {});
      draftBadge.classList.remove("hidden");
      updateStats();
    } catch (_) {}
  }

  function clearDraft(resetUI = true) {
    localStorage.removeItem(DRAFT_KEY);
    startedAt = null;
    transcript.value = "";
    interim.textContent = "";
    speechBaseText = "";
    speechFinalText = "";
    draftBadge.classList.add("hidden");
    if (resetUI) {
      category = "Histoire";
      setCategoryUI();
      renderFields();
    }
    updateStats();
  }

  function setCategoryUI() {
    document.querySelectorAll(".category").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.category === category);
    });
  }

  document.querySelectorAll(".category").forEach(btn => {
    btn.addEventListener("click", () => {
      const previous = getFieldValues();
      category = btn.dataset.category;
      setCategoryUI();
      renderFields(previous);
      persistDraft();
    });
  });

  transcript.addEventListener("input", () => {
    if (!startedAt) startedAt = new Date().toISOString();
    persistDraft();
  });

  $("#clearBtn").addEventListener("click", () => {
    if (!transcript.value && !interim.textContent) return;
    if (confirm("Effacer cette note et son brouillon local ?")) clearDraft(false);
  });


  function normalizeToken(token) {
    return String(token || "")
      .toLocaleLowerCase("fr-FR")
      .replace(/[.,!?;:…]+$/g, "");
  }

  function collapseAbnormalRepeats(value) {
    const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return "";

    const out = [];
    let i = 0;

    while (i < tokens.length) {
      let j = i + 1;
      while (j < tokens.length && normalizeToken(tokens[j]) === normalizeToken(tokens[i])) {
        j++;
      }

      const run = j - i;

      // On ne touche qu'aux répétitions franchement anormales.
      // "très très bien" reste intact ; "Roy Roy Roy Roy" devient "Roy".
      if (run >= 3 && normalizeToken(tokens[i])) {
        out.push(tokens[i]);
      } else {
        for (let k = i; k < j; k++) out.push(tokens[k]);
      }

      i = j;
    }

    return out.join(" ");
  }

  function mergeWithoutOverlap(left, right) {
    const A = String(left || "").trim().split(/\s+/).filter(Boolean);
    const B = String(right || "").trim().split(/\s+/).filter(Boolean);

    if (!A.length) return B.join(" ");
    if (!B.length) return A.join(" ");

    const max = Math.min(A.length, B.length);
    let overlap = 0;

    for (let size = max; size >= 1; size--) {
      let same = true;
      for (let i = 0; i < size; i++) {
        if (normalizeToken(A[A.length - size + i]) !== normalizeToken(B[i])) {
          same = false;
          break;
        }
      }
      if (same) {
        overlap = size;
        break;
      }
    }

    return [...A, ...B.slice(overlap)].join(" ");
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = (cfg.defaults && cfg.defaults.language) || "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      listening = true;
      startedAt = startedAt || new Date().toISOString();

      // Snapshot immuable du texte déjà présent avant cette session de dictée.
      speechBaseText = transcript.value.trim();
      speechFinalText = "";

      micBtn.classList.add("listening");
      micBtn.setAttribute("aria-pressed", "true");
      micLabel.textContent = "Arrêter";
      listenStatus.textContent = "Je t’écoute…";
      supportStatus.textContent = "Tes mots apparaissent en direct. Tu peux corriger ensuite.";
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      // Chrome Android peut renvoyer des morceaux qui se recouvrent.
      // On reconstruit donc la session en supprimant les chevauchements.
      for (let i = 0; i < event.results.length; i++) {
        const rawPiece = (event.results[i][0].transcript || "").trim();
        if (!rawPiece) continue;

        const piece = collapseAbnormalRepeats(rawPiece);

        if (event.results[i].isFinal) {
          finalText = mergeWithoutOverlap(finalText, piece);
        } else {
          interimText = mergeWithoutOverlap(interimText, piece);
        }
      }

      speechFinalText = collapseAbnormalRepeats(finalText);

      const visible = mergeWithoutOverlap(speechBaseText, speechFinalText);
      transcript.value = collapseAbnormalRepeats(visible);

      // L'intermédiaire reste visible mais n'est jamais enregistré dans la note.
      interim.textContent = interimText
        ? "… " + collapseAbnormalRepeats(interimText)
        : "";

      persistDraft();
    };

    recognition.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        userWantsListening = false;
      }

      supportStatus.textContent =
        event.error === "not-allowed"
          ? "Autorise le micro dans le navigateur pour utiliser la dictée."
          : `Dictée interrompue (${event.error}). Je relance si possible.`;
    };

    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove("listening");
      micBtn.setAttribute("aria-pressed", "false");

      // Si Chrome a coupé tout seul alors que l'utilisatrice veut toujours dicter,
      // on relance automatiquement après un tout petit délai.
      if (userWantsListening) {
        micLabel.textContent = "Arrêter";
        listenStatus.textContent = "Je t’écoute…";
        supportStatus.textContent = "Pause détectée, je relance le micro automatiquement.";

        speechBaseText = transcript.value.trim();
        speechFinalText = "";
        interim.textContent = "";
        persistDraft();

        setTimeout(() => {
          try {
            if (userWantsListening && !listening) recognition.start();
          } catch (_) {}
        }, 250);
        return;
      }

      micLabel.textContent = "Dicter";
      listenStatus.textContent = "Micro en veille";
      interim.textContent = "";

      speechBaseText = transcript.value.trim();
      speechFinalText = "";
      persistDraft();
    };

    micBtn.addEventListener("click", () => {
      try {
        if (userWantsListening) {
          // Arrêt demandé explicitement par l'utilisatrice.
          userWantsListening = false;
          if (listening) recognition.stop();
        } else {
          // Démarrage manuel : on reste en écoute jusqu'à nouvel appui.
          userWantsListening = true;
          if (!listening) recognition.start();
        }
      } catch (_) {}
    });
  } else {
    micBtn.disabled = true;
    listenStatus.textContent = "Dictée non disponible ici";
    supportStatus.textContent = "Tu peux écrire la note. Sur Android, ouvre Sonate dans Chrome pour la dictée vocale.";
  }

  function makePayload() {
    const now = new Date();
    const f = getFieldValues();
    const metadata = {
      personnage: f.personnage || "",
      capturedStartedAt: startedAt || now.toISOString(),
      appVersion: "1.3.0"
    };

    return {
      horodatage: now.toISOString(),
      date: new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(now),
      heure: new Intl.DateTimeFormat("fr-FR", { timeStyle: "medium" }).format(now),
      categorie: category,
      type: f.type || "",
      univers: f.univers || "",
      saga: f.saga || "",
      sousSaga: f.sousSaga || "",
      cible: f.cible || "",
      titre: f.title || "",
      transcription: transcript.value.trim(),
      source: (cfg.defaults && cfg.defaults.source) || "Sonate",
      statut: "Déposée",
      metadata
    };
  }

  async function deposit() {
    const payload = makePayload();
    if (!payload.transcription) {
      saveStatus.textContent = "Écris ou dicte quelque chose avant de déposer.";
      transcript.focus();
      return;
    }
    if (!cfg.endpoint) {
      saveStatus.textContent = "Sonate est prête, mais l’URL Apps Script n’est pas encore renseignée dans config.js.";
      return;
    }

    depositBtn.disabled = true;
    saveStatus.textContent = "Je dépose la note dans Pépinière…";

    try {
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Réponse invalide");

      clearDraft(false);
      saveStatus.textContent = "";
      successDialog.showModal();
    } catch (err) {
      console.error(err);
      saveStatus.textContent = "Impossible de déposer pour l’instant. Le brouillon reste sauvegardé sur ce téléphone.";
    } finally {
      depositBtn.disabled = false;
    }
  }

  depositBtn.addEventListener("click", deposit);
  $("#newNoteBtn").addEventListener("click", () => {
    successDialog.close();
    clearDraft(true);
    transcript.focus();
  });

  window.addEventListener("online", () => {
    connectionDot.textContent = "● en ligne";
    connectionDot.style.color = "#708268";
  });
  window.addEventListener("offline", () => {
    connectionDot.textContent = "● hors ligne";
    connectionDot.style.color = "#a26b74";
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }

  renderFields();
  loadDraft();
  updateStats();
})();
