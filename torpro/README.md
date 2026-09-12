# TorPro Zugangstechnik – Website & Adminbereich

Statische Website (HTML/CSS/JS, kein Build-Schritt) für **TorPro Zugangstechnik**, Klingenberger Straße 100, 74080 Heilbronn.

## Struktur

| Pfad | Inhalt |
|------|--------|
| `index.html` | Startseite: Leistungen, **Garagentor-Konfigurator** mit Richtpreis & Angebotsanfrage, Partner (M-M Alu-Door, Frankentore), Ablauf, Einsatzgebiet-Karte, Kontakt |
| `admin/` | Mitarbeiterbereich (Login): Dashboard, Kalender, Auftragskarte, Aufträge, Anfragen, Kunden, Team, Einstellungen |
| `impressum.html`, `datenschutz.html` | Rechtstexte (Platzhalter in `config.js` ausfüllen) |
| `assets/js/config.js` | **Zentrale Konfiguration**: Firmendaten, Telefon/E-Mail, Öffnungszeiten, Konfigurator-Preise, Firebase, Demo-Logins |
| `assets/js/store.js` | Datenschicht (Firebase Firestore/Auth oder lokaler Demo-Modus) |
| `assets/js/configurator.js` | Konfigurator-Logik, Preisberechnung, Vorschau |
| `assets/js/admin.js` | Adminbereich |
| `assets/js/logo.js`, `assets/img/logo*.svg` | Logo als SVG (aus der Vorlage nachgebaut) |
| `firestore.rules` | Sicherheitsregeln für Firestore |

## Lokal ansehen

```bash
cd torpro
python3 -m http.server 8080
# → http://localhost:8080  und  http://localhost:8080/admin/
```

Demo-Login (ohne Firebase): `admin@torpro.de` / `torpro2026` (siehe `config.js` → `demoUsers`).
Im Demo-Modus liegen alle Daten nur im Browser (localStorage). Unter *Einstellungen → Demo-Daten anlegen* lassen sich Beispielaufträge erzeugen.

## Live-Betrieb (Kalender/Aufträge für alle Monteure gemeinsam)

1. Firebase-Projekt anlegen: <https://console.firebase.google.com>
2. **Authentication** → E-Mail/Passwort aktivieren → Monteure als Nutzer anlegen
3. **Firestore Database** anlegen (Region `europe-west3`) → Regeln aus `firestore.rules` einfügen
4. Projekteinstellungen → Web-App → `firebaseConfig` in `assets/js/config.js` unter `firebase:` eintragen
5. Optional: `requestWebhook` (z. B. Formspree) eintragen, damit Anfragen zusätzlich per E-Mail kommen

Danach erscheinen Konfigurator-Anfragen von der Website automatisch im Adminbereich unter „Anfragen“ und können per Klick in Aufträge umgewandelt werden.

## Vor dem Livegang ausfüllen (`assets/js/config.js`)

- Telefonnummer, E-Mail-Adresse
- Inhaber, Rechtsform, USt-IdNr. (Impressum)
- Preise im Konfigurator prüfen (`pricing`)
- Demo-Logins entfernen bzw. ändern, sobald Firebase aktiv ist

## Hosting

Der Ordner kann direkt auf GitHub Pages, Netlify, Vercel oder jedem Webspace liegen. Externe Abhängigkeiten werden per CDN geladen: Google Fonts, Leaflet (Karte), OpenStreetMap-Kacheln, Nominatim (Adress-Geocoding im Admin), Firebase (optional).
