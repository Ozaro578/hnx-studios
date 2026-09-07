import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPortfolio,
  buy,
  sell,
  valuate,
  positionSize,
  breakEvenPrice,
  simulateDca,
  recoveryGainPercent,
  leverageLiquidation,
  round2,
} from "../engine.js";

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test("createPortfolio startet mit Startkapital und ohne Positionen", () => {
  const p = createPortfolio({ cash: 500 });
  assert.equal(p.cash, 500);
  assert.equal(p.startCash, 500);
  assert.deepEqual(p.positions, {});
  assert.throws(() => createPortfolio({ cash: 0 }));
  assert.throws(() => createPortfolio({ feeRate: 1 }));
});

test("buy zieht Gebühr ab und verändert das Original nicht", () => {
  const p0 = createPortfolio({ cash: 1000, feeRate: 0.01 });
  const p1 = buy(p0, { symbol: "BTC", price: 50000, amountQuote: 100 });
  assert.equal(p0.cash, 1000, "Original darf sich nicht ändern");
  assert.equal(p1.cash, 900);
  close(p1.feesPaid, 1);
  close(p1.positions.BTC.quantity, 99 / 50000);
  close(p1.positions.BTC.avgPrice, 100 / (99 / 50000)); // Einstand inkl. Gebühr
  assert.equal(p1.trades.length, 1);
});

test("buy lehnt zu große Beträge ab", () => {
  const p = createPortfolio({ cash: 100 });
  assert.throws(() => buy(p, { symbol: "BTC", price: 10, amountQuote: 100.01 }), /Nicht genug Guthaben/);
  assert.throws(() => buy(p, { symbol: "BTC", price: -1, amountQuote: 10 }));
});

test("mehrere Käufe ergeben einen gewichteten Durchschnittspreis", () => {
  let p = createPortfolio({ cash: 1000, feeRate: 0 });
  p = buy(p, { symbol: "ETH", price: 2000, amountQuote: 200 }); // 0.1 ETH
  p = buy(p, { symbol: "ETH", price: 4000, amountQuote: 200 }); // 0.05 ETH
  close(p.positions.ETH.quantity, 0.15);
  close(p.positions.ETH.avgPrice, 400 / 0.15);
});

test("sell realisiert Netto-Gewinn nach Gebühren", () => {
  let p = createPortfolio({ cash: 1000, feeRate: 0.01 });
  p = buy(p, { symbol: "BTC", price: 100, amountQuote: 100 }); // 0.99 BTC, Einstand 101.01…
  p = sell(p, { symbol: "BTC", price: 200, quantity: 0.99 });
  // Erlös: 0.99*200 = 198, Gebühr 1.98 => 196.02. Gewinn = 196.02 - 100 = 96.02
  close(p.cash, 900 + 196.02);
  close(p.realizedPnl, 96.02);
  close(p.feesPaid, 1 + 1.98);
  assert.equal(p.positions.BTC, undefined, "Position komplett geschlossen");
});

test("sell verweigert mehr als vorhanden und unbekannte Symbole", () => {
  let p = createPortfolio({ cash: 1000, feeRate: 0 });
  assert.throws(() => sell(p, { symbol: "BTC", price: 1, quantity: 1 }), /Keine Position/);
  p = buy(p, { symbol: "BTC", price: 100, amountQuote: 100 });
  assert.throws(() => sell(p, { symbol: "BTC", price: 100, quantity: 2 }), /vorhanden/);
});

test("Teilverkauf lässt Rest mit gleichem Einstandspreis stehen", () => {
  let p = createPortfolio({ cash: 1000, feeRate: 0 });
  p = buy(p, { symbol: "SOL", price: 50, amountQuote: 500 }); // 10 SOL
  p = sell(p, { symbol: "SOL", price: 40, quantity: 4 }); // Verlust 40
  close(p.positions.SOL.quantity, 6);
  close(p.positions.SOL.avgPrice, 50);
  close(p.realizedPnl, -40);
});

test("valuate berechnet unrealisierten Gewinn und Gesamtrendite", () => {
  let p = createPortfolio({ cash: 1000, feeRate: 0 });
  p = buy(p, { symbol: "BTC", price: 100, amountQuote: 500 });
  const v = valuate(p, { BTC: 120 });
  close(v.positionsValue, 600);
  close(v.unrealizedPnl, 100);
  close(v.total, 1100);
  close(v.totalReturnPercent, 10);
  close(v.positions[0].pnlPercent, 20);
  // Ohne Kurs wird zum Einstand bewertet
  const v2 = valuate(p, {});
  close(v2.unrealizedPnl, 0);
  assert.equal(v2.positions[0].price, null);
});

test("positionSize folgt der 1-%-Regel", () => {
  const r = positionSize({ capital: 1000, riskPercent: 1, entry: 100, stopLoss: 95 });
  close(r.riskAmount, 10);
  close(r.quantity, 2);
  close(r.positionValue, 200);
  close(r.stopDistancePercent, 5);
  assert.equal(r.exceedsCapital, false);
  const tight = positionSize({ capital: 1000, riskPercent: 2, entry: 100, stopLoss: 99.5 });
  assert.equal(tight.exceedsCapital, true, "enger Stop => Position größer als Kapital");
  assert.throws(() => positionSize({ capital: 1000, riskPercent: 1, entry: 100, stopLoss: 100 }));
});

test("breakEvenPrice berücksichtigt Gebühren auf beiden Seiten und Spread", () => {
  const noFee = breakEvenPrice({ entry: 100, feeRate: 0 });
  close(noFee.price, 100);
  const withFee = breakEvenPrice({ entry: 100, feeRate: 0.01 });
  close(withFee.price, 100 / 0.99 ** 2);
  close(withFee.requiredGainPercent, (1 / 0.99 ** 2 - 1) * 100);
  const withSpread = breakEvenPrice({ entry: 100, feeRate: 0, spreadPercent: 1 });
  close(withSpread.price, (100 * 1.01) / 0.99);
  // Sanity: 1,5 % Gebühr (typische Neo-Broker-App) braucht rund +3 % Kurs
  const app = breakEvenPrice({ entry: 100, feeRate: 0.015 });
  assert.ok(app.requiredGainPercent > 3 && app.requiredGainPercent < 3.1);
});

test("simulateDca kauft mehr Anteile bei niedrigen Kursen", () => {
  const r = simulateDca({ amountPerPeriod: 100, prices: [100, 50, 100], feeRate: 0 });
  close(r.invested, 300);
  close(r.quantity, 1 + 2 + 1);
  close(r.value, 400);
  close(r.pnl, 100);
  close(r.avgPrice, 75);
  close(r.lumpSumValue, 300); // alles am Anfang bei 100 gekauft, endet bei 100
  assert.equal(r.history.length, 3);
  assert.throws(() => simulateDca({ amountPerPeriod: 100, prices: [] }));
});

test("simulateDca zieht Gebühren ab", () => {
  const r = simulateDca({ amountPerPeriod: 100, prices: [10, 10], feeRate: 0.01 });
  close(r.fees, 2);
  close(r.quantity, 19.8);
});

test("recoveryGainPercent: -50 % braucht +100 %", () => {
  close(recoveryGainPercent(50), 100);
  close(recoveryGainPercent(10), 11.111111111, 1e-6);
  assert.equal(recoveryGainPercent(0), 0);
  assert.equal(recoveryGainPercent(100), Infinity);
});

test("leverageLiquidation: Hebel 10 = Liquidation bei -10 %", () => {
  const r = leverageLiquidation({ leverage: 10, entry: 1000 });
  close(r.dropPercent, 10);
  close(r.liquidationPrice, 900);
});

test("round2 rundet kaufmännisch", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.4449), 2.44);
});
