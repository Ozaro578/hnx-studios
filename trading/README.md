# Trading Simulator

Paper-Trading-App zum Lernen von Krypto-Trading – ohne echtes Geld.

## Features

- **Dashboard**: virtuelles Portfolio (Start 1.000 €), Live-Kurse von CoinGecko (BTC, ETH, SOL, XRP, ADA) mit 24h-Änderung, offene Positionen mit Gewinn/Verlust, Order-Historie.
- **Handeln**: Kaufen für einen Euro-Betrag, Verkaufen in 25/50/100 %-Schritten, wählbares Gebührenmodell (0,1 % Börse / 0,5 % Broker / 1,5 % Neo-Broker-App). Vorschau zeigt Gebühr und Break-even-Kurs vor jedem Trade.
- **Rechner**: Positionsgröße nach der 1-%-Regel, Gebühren- und Break-even-Rechner, Sparplan-Simulation (DCA) mit echten Monatskursen der letzten 12 Monate, Verlust-Aufhol-Tabelle, Hebel-Liquidationsrechner.
- **Lernen**: Kompakte Einführung in Trading, Krypto-Kauf, Risiko, Steuern (DE) und Betrugserkennung.

Das Portfolio wird nur im `localStorage` des Browsers gespeichert. Ist die CoinGecko-API nicht erreichbar, werden Demo-Kurse verwendet und das wird angezeigt.

## Struktur

| Datei | Zweck |
|-------|-------|
| `engine.js` | Reine Handelslogik (Portfolio, Orders, Bewertung, Rechner) – ohne DOM, in Node und Browser nutzbar |
| `app.js` | UI-Logik, Kursabruf, Persistenz |
| `index.html` | Oberfläche |
| `tests/engine.test.js` | Unit-Tests für die Engine (`node --test`) |

## Lokal starten

Die App nutzt ES-Module und muss über HTTP ausgeliefert werden (nicht per `file://`):

```bash
python3 -m http.server 8080   # oder: npm run serve
# dann http://localhost:8080/trading/ öffnen
```

Tests:

```bash
npm test
```

## Hinweis

Simulation und Lernwerkzeug, keine Anlage- oder Steuerberatung. Kursdaten ohne Gewähr.
