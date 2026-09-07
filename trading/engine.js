/**
 * HNX Trading Engine – reine, framework-freie Handelslogik für den Paper-Trading-Simulator.
 *
 * Alle Funktionen sind "pure": Sie verändern ihre Eingaben nicht, sondern liefern neue Objekte.
 * Beträge sind in der Quote-Währung (z. B. EUR), Mengen in der Basis-Währung (z. B. BTC).
 *
 * Der Einstandspreis (avgPrice) enthält bereits die Kaufgebühren. Dadurch ist der realisierte
 * Gewinn/Verlust immer NETTO – also das, was am Ende wirklich auf dem Konto landet.
 */

/** Typische Spot-Gebühr großer Börsen (0,1 %). Neo-Broker-Apps nehmen oft 1–1,5 %! */
export const DEFAULT_FEE_RATE = 0.001;

const EPSILON = 1e-12;

function assertPositive(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} muss eine positive Zahl sein (erhalten: ${value})`);
  }
}

function assertRate(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`${name} muss zwischen 0 und 1 liegen (erhalten: ${value})`);
  }
}

/** Rundet auf 2 Nachkommastellen (für Geldbeträge in der Anzeige). */
export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Erstellt ein leeres Portfolio.
 * @param {{cash?: number, feeRate?: number}} options
 */
export function createPortfolio({ cash = 1000, feeRate = DEFAULT_FEE_RATE } = {}) {
  assertPositive(cash, "Startkapital");
  assertRate(feeRate, "Gebührensatz");
  return {
    startCash: cash,
    cash,
    feeRate,
    positions: {}, // symbol -> { quantity, avgPrice }
    trades: [], // chronologische Liste aller Orders
    realizedPnl: 0,
    feesPaid: 0,
  };
}

/**
 * Kauft für einen festen EUR-Betrag (so funktionieren die meisten Krypto-Apps: "100 € Bitcoin kaufen").
 * @param {object} portfolio
 * @param {{symbol: string, price: number, amountQuote: number, timestamp?: number}} order
 */
export function buy(portfolio, { symbol, price, amountQuote, timestamp = Date.now() }) {
  assertPositive(price, "Kurs");
  assertPositive(amountQuote, "Betrag");
  if (!symbol) throw new Error("Symbol fehlt");
  if (amountQuote > portfolio.cash + EPSILON) {
    throw new Error(
      `Nicht genug Guthaben: ${round2(amountQuote)} benötigt, ${round2(portfolio.cash)} verfügbar`,
    );
  }

  const fee = amountQuote * portfolio.feeRate;
  const quantity = (amountQuote - fee) / price;
  const existing = portfolio.positions[symbol] ?? { quantity: 0, avgPrice: 0 };
  const totalCost = existing.quantity * existing.avgPrice + amountQuote;
  const totalQuantity = existing.quantity + quantity;

  const next = structuredClone(portfolio);
  next.cash -= amountQuote;
  next.feesPaid += fee;
  next.positions[symbol] = { quantity: totalQuantity, avgPrice: totalCost / totalQuantity };
  next.trades.push({ type: "buy", symbol, price, quantity, amountQuote, fee, timestamp });
  return next;
}

/**
 * Verkauft eine Menge der Basis-Währung.
 * @param {object} portfolio
 * @param {{symbol: string, price: number, quantity: number, timestamp?: number}} order
 */
export function sell(portfolio, { symbol, price, quantity, timestamp = Date.now() }) {
  assertPositive(price, "Kurs");
  assertPositive(quantity, "Menge");
  const position = portfolio.positions[symbol];
  if (!position) throw new Error(`Keine Position in ${symbol}`);
  if (quantity > position.quantity + EPSILON) {
    throw new Error(`Nur ${position.quantity} ${symbol} vorhanden, ${quantity} angefragt`);
  }
  // Rundungsfehler bei "alles verkaufen" abfangen
  const qty = Math.min(quantity, position.quantity);

  const gross = qty * price;
  const fee = gross * portfolio.feeRate;
  const proceeds = gross - fee;
  const pnl = proceeds - qty * position.avgPrice;

  const next = structuredClone(portfolio);
  next.cash += proceeds;
  next.feesPaid += fee;
  next.realizedPnl += pnl;
  const remaining = position.quantity - qty;
  if (remaining <= EPSILON) {
    delete next.positions[symbol];
  } else {
    next.positions[symbol] = { quantity: remaining, avgPrice: position.avgPrice };
  }
  next.trades.push({ type: "sell", symbol, price, quantity: qty, amountQuote: proceeds, fee, pnl, timestamp });
  return next;
}

/**
 * Bewertet das Portfolio zu aktuellen Kursen.
 * @param {object} portfolio
 * @param {Record<string, number>} prices symbol -> aktueller Kurs
 */
export function valuate(portfolio, prices) {
  let positionsValue = 0;
  let unrealizedPnl = 0;
  const positions = Object.entries(portfolio.positions).map(([symbol, pos]) => {
    const price = prices[symbol];
    const hasPrice = typeof price === "number" && Number.isFinite(price);
    const value = hasPrice ? pos.quantity * price : pos.quantity * pos.avgPrice;
    const cost = pos.quantity * pos.avgPrice;
    const pnl = value - cost;
    positionsValue += value;
    unrealizedPnl += pnl;
    return {
      symbol,
      quantity: pos.quantity,
      avgPrice: pos.avgPrice,
      price: hasPrice ? price : null,
      value,
      cost,
      pnl,
      pnlPercent: cost > 0 ? (pnl / cost) * 100 : 0,
    };
  });
  const total = portfolio.cash + positionsValue;
  return {
    cash: portfolio.cash,
    positionsValue,
    total,
    unrealizedPnl,
    realizedPnl: portfolio.realizedPnl,
    feesPaid: portfolio.feesPaid,
    totalReturn: total - portfolio.startCash,
    totalReturnPercent: ((total - portfolio.startCash) / portfolio.startCash) * 100,
    positions,
  };
}

/**
 * Positionsgrößen-Rechner nach der 1-%-Regel: Riskiere pro Trade nur einen kleinen Teil des Kapitals.
 * Ergebnis: Wie viel darf ich kaufen, damit ich beim Stop-Loss höchstens `riskPercent` verliere?
 * @param {{capital: number, riskPercent: number, entry: number, stopLoss: number}} input
 */
export function positionSize({ capital, riskPercent, entry, stopLoss }) {
  assertPositive(capital, "Kapital");
  assertPositive(riskPercent, "Risiko in %");
  assertPositive(entry, "Einstiegskurs");
  assertPositive(stopLoss, "Stop-Loss");
  if (stopLoss >= entry) throw new Error("Der Stop-Loss muss unter dem Einstiegskurs liegen");

  const riskAmount = capital * (riskPercent / 100);
  const riskPerUnit = entry - stopLoss;
  const quantity = riskAmount / riskPerUnit;
  const positionValue = quantity * entry;
  const stopDistancePercent = (riskPerUnit / entry) * 100;
  return {
    riskAmount,
    riskPerUnit,
    quantity,
    positionValue,
    stopDistancePercent,
    exceedsCapital: positionValue > capital,
  };
}

/**
 * Break-even-Kurs: Wie weit muss der Kurs steigen, damit nach Kauf- UND Verkaufsgebühr (plus Spread) null rauskommt?
 * @param {{entry: number, feeRate: number, spreadPercent?: number}} input
 */
export function breakEvenPrice({ entry, feeRate, spreadPercent = 0 }) {
  assertPositive(entry, "Einstiegskurs");
  assertRate(feeRate, "Gebührensatz");
  const spread = spreadPercent / 100;
  // Kauf: für X € bekommt man X*(1-fee)/(entry*(1+spread)) Einheiten.
  // Verkauf bei Kurs p: Einheiten * p * (1-spread) * (1-fee) = X  =>  p = entry*(1+spread)/((1-fee)^2*(1-spread))
  const price = (entry * (1 + spread)) / ((1 - feeRate) ** 2 * (1 - spread));
  return { price, requiredGainPercent: (price / entry - 1) * 100 };
}

/**
 * Sparplan-Simulation (Dollar-Cost-Averaging): Jeden Zeitschritt denselben Betrag investieren.
 * @param {{amountPerPeriod: number, prices: number[], feeRate?: number}} input prices = Kurs je Kaufzeitpunkt
 */
export function simulateDca({ amountPerPeriod, prices, feeRate = DEFAULT_FEE_RATE }) {
  assertPositive(amountPerPeriod, "Sparrate");
  assertRate(feeRate, "Gebührensatz");
  if (!Array.isArray(prices) || prices.length === 0) throw new Error("Kursliste ist leer");

  let quantity = 0;
  let invested = 0;
  let fees = 0;
  const history = prices.map((price, index) => {
    assertPositive(price, `Kurs an Position ${index}`);
    const fee = amountPerPeriod * feeRate;
    quantity += (amountPerPeriod - fee) / price;
    invested += amountPerPeriod;
    fees += fee;
    return { index, price, invested, quantity, value: quantity * price };
  });
  const lastPrice = prices[prices.length - 1];
  const value = quantity * lastPrice;
  const lumpSumQuantity = (invested * (1 - feeRate)) / prices[0];
  return {
    invested,
    fees,
    quantity,
    avgPrice: invested / quantity,
    value,
    pnl: value - invested,
    pnlPercent: ((value - invested) / invested) * 100,
    lumpSumValue: lumpSumQuantity * lastPrice, // Vergleich: alles am Anfang auf einmal
    history,
  };
}

/**
 * Wie viel Prozent Gewinn brauche ich, um einen Verlust wieder aufzuholen?
 * -50 % erfordern +100 %! Das ist der wichtigste Grund für Risikomanagement.
 */
export function recoveryGainPercent(lossPercent) {
  if (lossPercent <= 0) return 0;
  if (lossPercent >= 100) return Infinity;
  return (1 / (1 - lossPercent / 100) - 1) * 100;
}

/**
 * Hebel-Simulation: Bei welchem Kursrückgang wird eine Long-Position liquidiert?
 * Vereinfacht (ohne Funding, ohne Maintenance-Margin): Liquidation bei -100 %/Hebel.
 */
export function leverageLiquidation({ leverage, entry }) {
  assertPositive(leverage, "Hebel");
  assertPositive(entry, "Einstiegskurs");
  const dropPercent = 100 / leverage;
  return { dropPercent, liquidationPrice: entry * (1 - dropPercent / 100) };
}
