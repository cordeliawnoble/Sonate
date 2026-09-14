window.SONATE_CONFIG = {
  // URL /exec de ton déploiement Apps Script.
  endpoint: "https://script.google.com/macros/s/AKfycbyHp3AdQP3-0nqabPLQZLSOmrU9TR9XbdHbOiIGrmslHeM5kkQ-awQnkwE5rPq5ekCa_A/exec",

  defaults: {
    language: "fr-FR",
    source: "Sonate"
  },

  verification: {
    attempts: 8,
    firstDelayMs: 1100,
    intervalMs: 1200
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
