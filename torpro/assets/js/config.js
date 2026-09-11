/* =========================================================
   TorPro Zugangstechnik – zentrale Konfiguration
   Hier Firmendaten, Preise und (optional) Firebase eintragen.
   ========================================================= */
window.TORPRO_CONFIG = {
  company: {
    name: "TorPro Zugangstechnik",
    shortName: "TorPro",
    owner: "TODO: Inhaber / Geschäftsführer",           // für Impressum
    legalForm: "TODO: z. B. GbR / GmbH / Einzelunternehmen",
    street: "Klingenberger Straße 100",
    zip: "74080",
    city: "Heilbronn",
    phone: "+49 7131 0000000",                         // TODO: echte Nummer eintragen
    phoneDisplay: "07131 / 000 00 00",                 // TODO
    email: "info@torpro-zugangstechnik.de",            // TODO: echte Adresse eintragen
    vatId: "TODO: USt-IdNr.",
    openingHours: [
      ["Mo – Fr", "07:30 – 17:00 Uhr"],
      ["Sa", "nach Vereinbarung"],
      ["Notdienst", "24/7 telefonisch"]
    ],
    // Koordinaten (ungefähr, Klingenberger Str. 100, Heilbronn-Böckingen)
    lat: 49.1385,
    lng: 9.1862,
    serviceRadiusKm: 80
  },


  /* Hero-Diashow auf der Startseite: Referenzfotos (alle im Format 16:9, 1920×1080 px).
     Fehlende Dateien werden automatisch übersprungen. */
  slides: [
    { src: "assets/img/referenzen/ref-01.jpg", caption: "Sektionaltor RAL 7016 Anthrazit, flächenbündig · Heilbronn", alt: "Anthrazitfarbenes Sektionaltor, flächenbündig, in einer Garagenöffnung" },
    { src: "assets/img/referenzen/ref-02.jpg", caption: "Sektionaltor RAL 9016 Verkehrsweiß, glatt · Heilbronn", alt: "Weißes Sektionaltor mit glatter Oberfläche" },
    { src: "assets/img/referenzen/ref-03.jpg", caption: "Sektionaltor Anthrazit mit Notentriegelung · Raum Heilbronn", alt: "Anthrazitfarbenes Sektionaltor in einer Einzelgarage" },
    { src: "assets/img/referenzen/ref-04.jpg", caption: "Sektionaltor Anthrazit, Austausch im Bestand · Raum Heilbronn", alt: "Neues anthrazitfarbenes Sektionaltor in einer sanierten Garage" },
    { src: "assets/img/referenzen/ref-05.jpg", caption: "Frankentore Sektionaltor RAL 9007 Graualuminium · Raum Heilbronn", alt: "Silbergraues Sektionaltor in einer Fertiggarage" }
  ],

  /* Optional: Endpoint, an den Konfigurator-Anfragen zusätzlich per POST
     (JSON) gesendet werden – z. B. Formspree, Make, Zapier oder ein eigenes Script.
     Leer lassen = nur Speicherung + E-Mail-Fallback. */
  requestWebhook: "",

  /* =====================================================
     FIREBASE (empfohlen für den Live-Betrieb)
     1. https://console.firebase.google.com → Projekt anlegen
     2. Authentication → E-Mail/Passwort aktivieren → Monteure als Nutzer anlegen
     3. Firestore Database anlegen → Regeln aus /torpro/firestore.rules übernehmen
     4. Projekteinstellungen → Web-App → Konfiguration hier eintragen
     Ohne Firebase läuft der Adminbereich im lokalen Demo-Modus
     (Daten nur im Browser, Login über demoUsers).
     ===================================================== */
  firebase: null,
  /* Beispiel:
  firebase: {
    apiKey: "…",
    authDomain: "torpro-xxxx.firebaseapp.com",
    projectId: "torpro-xxxx",
    storageBucket: "torpro-xxxx.appspot.com",
    messagingSenderId: "…",
    appId: "…"
  },
  */

  /* Demo-Logins – NUR für den lokalen Demo-Modus ohne Firebase. */
  demoUsers: [
    { email: "admin@torpro.de", password: "torpro2026", name: "Admin", role: "admin" },
    { email: "monteur@torpro.de", password: "montage2026", name: "Monteur", role: "monteur" }
  ],

  /* =====================================================
     Konfigurator – Preislogik (Richtwerte netto, unverbindlich)
     Jederzeit anpassbar. Alle Beträge in Euro.
     ===================================================== */
  pricing: {
    vat: 0.19,
    /* Grundpreis deckt eine Standardgröße ab (bis "baseArea" m²),
       darüber wird pro zusätzlichem m² "perM2" berechnet. */
    types: {
      sektional:        { label: "Sektionaltor Stahl",        base: 1490, baseArea: 5.4, perM2: 180, montage: 590 },
      sektional_premium:{ label: "Sektionaltor Premium (Alu)",base: 2490, baseArea: 5.4, perM2: 260, montage: 640 },
      rolltor:          { label: "Rolltor",                    base: 1690, baseArea: 5.4, perM2: 200, montage: 590 },
      schwingtor:       { label: "Schwingtor",                 base: 990,  baseArea: 5.4, perM2: 120, montage: 490 },
      seitensektional:  { label: "Seitensektionaltor",         base: 1990, baseArea: 5.4, perM2: 220, montage: 690 }
    },
    insulation: { "40": 0, "60": 0.15 },          // Faktor auf Torpreis
    surface:    { woodgrain: 0, silkgrain: 120, micrograin: 180, holzdekor: 290 },
    sicke:      { gross: 0, mittel: 60, kassette: 140, glatt: 220 },
    colorStandard: 0,        // RAL 9016 Verkehrsweiß
    colorRal: 190,           // andere Vorzugsfarben
    colorSpecial: 390,       // Sonderfarbe nach RAL
    drive:      { none: 0, base: 490, pro: 690 },
    handsender: 45,          // je zusätzlicher Handsender (1 Stück beim Antrieb inklusive)
    codetaster: 129,
    smart: 149,
    lichtschranke: 89,
    fenster: 349,
    schlupftuer: 890,
    nebentuer: 1290,
    lueftung: 79,
    demontage: 190
  }
};
