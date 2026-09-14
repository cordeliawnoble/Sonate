// SONATE — CONFIGURATION
// 1) Déploie Code.gs comme Web App Apps Script.
// 2) Colle ici l'URL terminant par /exec.
// L'application fonctionne en mode brouillon même sans endpoint,
// mais "Déposer" ne pourra pas écrire dans Google Sheets.
window.SONATE_CONFIG = {
  endpoint: "",

  defaults: {
    language: "fr-FR",
    source: "Sonate"
  },

  lists: {
    storyTypes: [
      "Concept d’œuvre",
      "Intrigue",
      "Scène",
      "Personnage",
      "Relation",
      "Lore",
      "Dialogue / citation",
      "Image / ambiance",
      "Autre"
    ],
    podcastTypes: [
      "Idée d’épisode",
      "Sujet",
      "Réflexion",
      "Format",
      "Invité",
      "Gimmick",
      "Autre"
    ],
    podcasts: [
      "La Charentaise dans la parenthèse",
      "Résonance",
      "Le Club des Foutus",
      "Audio-série d’histoires d’horreur",
      "Autre"
    ],
    promptTypes: [
      "Scénario d’ouverture",
      "Prompt personnage",
      "Situation",
      "Dialogue",
      "Relation",
      "Univers",
      "Autre"
    ],
    toolTypes: [
      "Fonctionnalité",
      "Design / UX",
      "Automatisation",
      "Contenu",
      "Bug / amélioration",
      "Concept",
      "Autre"
    ]
  }
};
