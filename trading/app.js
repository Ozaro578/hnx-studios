import {
  createPortfolio, buy, sell, valuate, positionSize, breakEvenPrice,
  simulateDca, recoveryGainPercent, leverageLiquidation, round2,
} from "./engine.js";

/* ---------- Konfiguration ---------- */
const COINS = [
  { symbol: "BTC", id: "bitcoin", name: "Bitcoin" },
  { symbol: "ETH", id: "ethereum", name: "Ethereum" },
  { symbol: "SOL", id: "solana", name: "Solana" },
  { symbol: "XRP", id: "ripple", name: "XRP" },
  { symbol: "ADA", id: "cardano", name: "Cardano" },
];
// Fallback, falls die API nicht erreichbar ist (Rate-Limit, offline, Adblocker)
const DEMO_PRICES = { BTC: 60000, ETH: 2500, SOL: 140, XRP: 0.55, ADA: 0.4 };
const STORAGE_KEY = "hnx-trading-portfolio-v1";
const START_CASH = 1000;
const REFRESH_MS = 60_000;

/* ---------- State ---------- */
let portfolio = loadPortfolio();
let prices = {};
let changes24h = {};
let selectedSymbol = "BTC";
let priceSource = "demo";

/* ---------- Hilfsfunktionen ---------- */
const $ = (sel) => document.querySelector(sel);
const eur = (v, digits = 2) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)} %`;
const qty = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: 6 });
const cls = (v) => (v >= 0 ? "pos" : "neg");
const priceFmt = (v) => eur(v, v < 1 ? 4 : 2);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.cash === "number" && parsed.positions) return parsed;
    }
  } catch { /* privater Modus o. ä. */ }
  return createPortfolio({ cash: START_CASH });
}

function savePortfolio() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); } catch { /* ignorieren */ }
}

function currentPrices() {
  const out = {};
  for (const c of COINS) out[c.symbol] = prices[c.symbol] ?? DEMO_PRICES[c.symbol];
  return out;
}

/* ---------- Kurse laden ---------- */
async function fetchPrices() {
  const ids = COINS.map((c) => c.id).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    for (const c of COINS) {
      if (data[c.id]?.eur) {
        prices[c.symbol] = data[c.id].eur;
        changes24h[c.symbol] = data[c.id].eur_24h_change ?? 0;
      }
    }
    priceSource = "live";
    $("#price-status").textContent = `live · ${new Date().toLocaleTimeString("de-DE")}`;
  } catch (err) {
    if (priceSource !== "live") {
      prices = { ...DEMO_PRICES };
      $("#price-status").textContent = "Demo-Kurse (API nicht erreichbar)";
    } else {
      $("#price-status").textContent = `letzter Stand (Aktualisierung fehlgeschlagen: ${err.message})`;
    }
  }
  renderAll();
}

/* ---------- Rendering ---------- */
function renderKpis() {
  const v = valuate(portfolio, currentPrices());
  $("#kpis").innerHTML = `
    <div class="card"><h3>Gesamtwert</h3><div class="kpi">${eur(v.total)}</div>
      <div class="${cls(v.totalReturn)}">${pct(v.totalReturnPercent)} · ${eur(v.totalReturn)}</div></div>
    <div class="card"><h3>Cash</h3><div class="kpi">${eur(v.cash)}</div><small class="muted">von ${eur(portfolio.startCash)} Start</small></div>
    <div class="card"><h3>Unrealisiert</h3><div class="kpi ${cls(v.unrealizedPnl)}">${eur(v.unrealizedPnl)}</div><small class="muted">offene Positionen</small></div>
    <div class="card"><h3>Realisiert</h3><div class="kpi ${cls(v.realizedPnl)}">${eur(v.realizedPnl)}</div><small class="muted">Gebühren gezahlt: ${eur(v.feesPaid)}</small></div>`;
}

function renderPrices() {
  $("#prices").innerHTML = COINS.map((c) => {
    const p = currentPrices()[c.symbol];
    const ch = changes24h[c.symbol];
    return `<div class="card price-card ${c.symbol === selectedSymbol ? "selected" : ""}" data-symbol="${c.symbol}">
      <h3>${c.name} <span class="muted">${c.symbol}</span></h3>
      <div class="kpi">${priceFmt(p)}</div>
      ${typeof ch === "number" ? `<div class="${cls(ch)}">${pct(ch)} <small class="muted">24h</small></div>` : `<div class="muted">Demo</div>`}
    </div>`;
  }).join("");
  document.querySelectorAll(".price-card").forEach((el) =>
    el.addEventListener("click", () => {
      selectedSymbol = el.dataset.symbol;
      $("#buy-symbol").value = selectedSymbol;
      renderPrices();
      renderTradePreviews();
    }));
}

function renderPositions() {
  const v = valuate(portfolio, currentPrices());
  if (v.positions.length === 0) {
    $("#positions").innerHTML = `<tr><td class="muted">Noch keine Positionen. Kaufe im Tab „Handeln“.</td></tr>`;
    return;
  }
  $("#positions").innerHTML = `
    <thead><tr><th>Coin</th><th class="num">Menge</th><th class="num">Einstand</th><th class="num">Kurs</th><th class="num">Wert</th><th class="num">G/V</th><th></th></tr></thead>
    <tbody>${v.positions.map((p) => `<tr>
      <td>${p.symbol}</td><td class="num">${qty(p.quantity)}</td><td class="num">${priceFmt(p.avgPrice)}</td>
      <td class="num">${p.price === null ? "–" : priceFmt(p.price)}</td><td class="num">${eur(p.value)}</td>
      <td class="num ${cls(p.pnl)}">${eur(p.pnl)}<br><small>${pct(p.pnlPercent)}</small></td>
      <td><button class="ghost" data-sell="${p.symbol}">Alles verkaufen</button></td></tr>`).join("")}</tbody>`;
  document.querySelectorAll("[data-sell]").forEach((b) =>
    b.addEventListener("click", () => executeSell(b.dataset.sell, 1)));
}

function renderHistory() {
  const trades = [...portfolio.trades].reverse();
  if (trades.length === 0) {
    $("#history").innerHTML = `<tr><td class="muted">Noch keine Orders.</td></tr>`;
    return;
  }
  $("#history").innerHTML = `
    <thead><tr><th>Zeit</th><th>Typ</th><th>Coin</th><th class="num">Kurs</th><th class="num">Menge</th><th class="num">Betrag</th><th class="num">Gebühr</th><th class="num">G/V</th></tr></thead>
    <tbody>${trades.map((t) => `<tr>
      <td>${new Date(t.timestamp).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</td>
      <td class="${t.type === "buy" ? "pos" : "neg"}">${t.type === "buy" ? "Kauf" : "Verkauf"}</td>
      <td>${t.symbol}</td><td class="num">${priceFmt(t.price)}</td><td class="num">${qty(t.quantity)}</td>
      <td class="num">${eur(t.amountQuote)}</td><td class="num">${eur(t.fee)}</td>
      <td class="num ${t.pnl === undefined ? "" : cls(t.pnl)}">${t.pnl === undefined ? "–" : eur(t.pnl)}</td></tr>`).join("")}</tbody>`;
}

function renderTradePreviews() {
  const feeRate = parseFloat($("#fee-select").value);
  const symbol = $("#buy-symbol").value;
  const amount = parseFloat($("#buy-form").amount.value) || 0;
  const price = currentPrices()[symbol];
  const fee = amount * feeRate;
  const be = breakEvenPrice({ entry: price, feeRate });
  $("#buy-preview").innerHTML = amount > 0
    ? `Du bekommst ca. <strong>${qty((amount - fee) / price)} ${symbol}</strong> zu ${priceFmt(price)}. Gebühr: ${eur(fee)}.
       Break-even nach Kauf + Verkauf: <strong>${priceFmt(be.price)}</strong> (${pct(be.requiredGainPercent)}). Verfügbar: ${eur(portfolio.cash)}.`
    : "Betrag eingeben.";

  const sellSel = $("#sell-symbol");
  const symbols = Object.keys(portfolio.positions);
  sellSel.innerHTML = symbols.length
    ? symbols.map((s) => `<option value="${s}">${s} (${qty(portfolio.positions[s].quantity)})</option>`).join("")
    : `<option value="">keine Position</option>`;
  if (!symbols.length) { $("#sell-preview").textContent = "Du hältst noch nichts."; return; }
  const sSym = sellSel.value || symbols[0];
  const fraction = parseFloat($("#sell-form").fraction.value);
  const pos = portfolio.positions[sSym];
  const q = pos.quantity * fraction;
  const p = currentPrices()[sSym];
  const gross = q * p;
  const sFee = gross * portfolio.feeRate;
  const pnl = gross - sFee - q * pos.avgPrice;
  $("#sell-preview").innerHTML = `Verkauf von ${qty(q)} ${sSym} zu ${priceFmt(p)} → Erlös <strong>${eur(gross - sFee)}</strong> (Gebühr ${eur(sFee)}), Gewinn/Verlust: <strong class="${cls(pnl)}">${eur(pnl)}</strong>.`;
}

function renderAll() {
  renderKpis(); renderPrices(); renderPositions(); renderHistory(); renderTradePreviews();
}

/* ---------- Handeln ---------- */
function flash(msg, isError = false) {
  const el = document.createElement("div");
  el.className = "notice";
  el.style.borderColor = isError ? "var(--danger)" : "var(--accent)";
  el.style.color = isError ? "var(--danger)" : "var(--accent)";
  el.style.background = "#fff";
  el.textContent = msg;
  $("main").insertBefore(el, $("nav.tabs"));
  setTimeout(() => el.remove(), 4000);
}

function executeBuy(symbol, amount, feeRate) {
  try {
    portfolio = { ...portfolio, feeRate };
    portfolio = buy(portfolio, { symbol, price: currentPrices()[symbol], amountQuote: amount });
    savePortfolio(); renderAll();
    flash(`Gekauft: ${eur(amount)} in ${symbol}.`);
  } catch (err) { flash(err.message, true); }
}

function executeSell(symbol, fraction) {
  try {
    const pos = portfolio.positions[symbol];
    if (!pos) throw new Error("Keine Position");
    portfolio = sell(portfolio, { symbol, price: currentPrices()[symbol], quantity: pos.quantity * fraction });
    savePortfolio(); renderAll();
    const last = portfolio.trades.at(-1);
    flash(`Verkauft: ${symbol}, Gewinn/Verlust ${eur(last.pnl)}.`, last.pnl < 0);
  } catch (err) { flash(err.message, true); }
}

$("#buy-form").addEventListener("submit", (e) => {
  e.preventDefault();
  executeBuy($("#buy-symbol").value, parseFloat(e.target.amount.value), parseFloat($("#fee-select").value));
});
$("#sell-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("#sell-symbol").value) executeSell($("#sell-symbol").value, parseFloat(e.target.fraction.value));
});
["#buy-form", "#sell-form"].forEach((sel) => $(sel).addEventListener("input", renderTradePreviews));
$("#buy-symbol").addEventListener("change", () => { selectedSymbol = $("#buy-symbol").value; renderPrices(); });
$("#reset").addEventListener("click", () => {
  if (confirm("Portfolio wirklich auf 1.000 € zurücksetzen? Die Historie geht verloren.")) {
    portfolio = createPortfolio({ cash: START_CASH });
    savePortfolio(); renderAll();
  }
});

/* ---------- Rechner ---------- */
function renderSize() {
  const f = $("#size-form");
  try {
    const r = positionSize({
      capital: parseFloat(f.capital.value), riskPercent: parseFloat(f.risk.value),
      entry: parseFloat(f.entry.value), stopLoss: parseFloat(f.stop.value),
    });
    $("#size-result").innerHTML = `Du riskierst <strong>${eur(r.riskAmount)}</strong>. Stop-Abstand: ${r.stopDistancePercent.toFixed(2)} %.
      → Kaufe höchstens <strong>${qty(r.quantity)} Einheiten</strong> = Positionswert <strong>${eur(r.positionValue)}</strong>.
      ${r.exceedsCapital ? `<br><span class="neg">Achtung: Die Position wäre größer als dein Kapital – Stop enger setzen ist gefährlich, besser weniger kaufen.</span>` : ""}`;
  } catch (err) { $("#size-result").innerHTML = `<span class="neg">${escapeHtml(err.message)}</span>`; }
}

function renderFees() {
  const f = $("#fee-form");
  try {
    const feeRate = parseFloat(f.fee.value) / 100;
    const spread = parseFloat(f.spread.value);
    const be = breakEvenPrice({ entry: 100, feeRate, spreadPercent: spread });
    const trades = parseFloat(f.trades.value) || 0;
    const amount = parseFloat(f.amount.value) || 0;
    const roundTripCost = amount * (be.requiredGainPercent / 100);
    const yearly = roundTripCost * trades * 12;
    $("#fee-result").innerHTML = `Ein Kauf-Verkauf-Zyklus kostet dich <strong>${be.requiredGainPercent.toFixed(2)} %</strong>. Der Kurs muss also erst um so viel steigen, bevor du einen Cent verdienst.
      <br>Bei ${trades} Trades/Monat à ${eur(amount)}: <strong>${eur(roundTripCost * trades)} pro Monat</strong>, <strong>${eur(yearly)} pro Jahr</strong> nur an Kosten.
      <br><span class="muted">Zum Vergleich: Ein ETF-Sparplan kostet meist 0 € Order-Gebühr und ~0,2 % pro Jahr.</span>`;
  } catch (err) { $("#fee-result").innerHTML = `<span class="neg">${escapeHtml(err.message)}</span>`; }
}

async function fetchMonthlyPrices(coinId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=365&interval=daily`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const points = data.prices; // [[timestamp, price], ...]
  // Ersten Kurs jedes Monats nehmen (Kauf am Monatsanfang)
  const byMonth = new Map();
  for (const [ts, price] of points) {
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, { key, price });
  }
  return [...byMonth.values()];
}

function syntheticMonthly(symbol) {
  // Deterministischer Fallback-Verlauf, damit der Rechner offline funktioniert
  const base = DEMO_PRICES[symbol];
  const factors = [0.62, 0.7, 0.66, 0.8, 0.95, 0.88, 1.05, 1.15, 1.0, 0.92, 1.08, 1.0];
  return factors.map((f, i) => ({ key: `Monat ${i + 1}`, price: base * f }));
}

$("#dca-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const symbol = $("#dca-symbol").value;
  const coin = COINS.find((c) => c.symbol === symbol);
  const amount = parseFloat(e.target.amount.value);
  const feeRate = parseFloat(e.target.fee.value) / 100;
  $("#dca-result").textContent = "Lade Kursverlauf…";
  let months; let source = "CoinGecko, Monatsanfangskurse";
  try { months = await fetchMonthlyPrices(coin.id); }
  catch { months = syntheticMonthly(symbol); source = "Beispiel-Verlauf (API nicht erreichbar)"; }
  try {
    const r = simulateDca({ amountPerPeriod: amount, prices: months.map((m) => m.price), feeRate });
    const maxV = Math.max(...r.history.map((h) => Math.max(h.value, h.invested)));
    $("#dca-result").innerHTML = `
      <p>Über ${months.length} Monate investiert: <strong>${eur(r.invested)}</strong> (davon Gebühren ${eur(r.fees)}) → heutiger Wert <strong>${eur(r.value)}</strong>,
      also <strong class="${cls(r.pnl)}">${eur(r.pnl)} (${pct(r.pnlPercent)})</strong>. Ø Kaufkurs: ${priceFmt(r.avgPrice)}.</p>
      <p>Hättest du alles am Anfang auf einmal investiert: ${eur(r.lumpSumValue)}. <span class="muted">Sparplan gewinnt bei fallenden/seitwärts laufenden Kursen, Einmalanlage bei durchgehend steigenden.</span></p>
      <div class="scroll"><table><thead><tr><th>Monat</th><th class="num">Kurs</th><th class="num">Eingezahlt</th><th class="num">Wert</th><th style="width:40%">Wert vs. Einzahlung</th></tr></thead><tbody>
      ${r.history.map((h, i) => `<tr><td>${escapeHtml(months[i].key)}</td><td class="num">${priceFmt(h.price)}</td><td class="num">${eur(h.invested)}</td>
        <td class="num ${cls(h.value - h.invested)}">${eur(h.value)}</td>
        <td><div class="bar"><span style="width:${(h.value / maxV) * 100}%"></span></div></td></tr>`).join("")}
      </tbody></table></div><p class="muted">Quelle: ${source}. Vergangene Kurse sagen nichts über die Zukunft.</p>`;
  } catch (err) { $("#dca-result").innerHTML = `<span class="neg">${escapeHtml(err.message)}</span>`; }
});

function renderRecovery() {
  const rows = [5, 10, 20, 30, 50, 70, 90];
  $("#recovery").innerHTML = `<thead><tr><th>Verlust</th><th class="num">nötiger Gewinn zum Ausgleich</th></tr></thead>
    <tbody>${rows.map((l) => `<tr><td class="neg">−${l} %</td><td class="num pos">+${recoveryGainPercent(l).toFixed(0)} %</td></tr>`).join("")}</tbody>`;
}

function renderLeverage() {
  const f = $("#lev-form");
  try {
    const r = leverageLiquidation({ leverage: parseFloat(f.leverage.value), entry: parseFloat(f.entry.value) });
    $("#lev-result").innerHTML = `Mit Hebel ${f.leverage.value}× bist du bei einem Kursrückgang von <strong class="neg">−${r.dropPercent.toFixed(2)} %</strong> (Kurs ${priceFmt(r.liquidationPrice)}) komplett liquidiert.
      ${r.dropPercent <= 15 ? `<br><span class="neg">Das passiert bei Krypto regelmäßig innerhalb eines Tages.</span>` : ""}`;
  } catch (err) { $("#lev-result").innerHTML = `<span class="neg">${escapeHtml(err.message)}</span>`; }
}

$("#size-form").addEventListener("input", renderSize);
$("#fee-form").addEventListener("input", renderFees);
$("#lev-form").addEventListener("input", renderLeverage);

/* ---------- Tabs ---------- */
document.querySelectorAll("nav.tabs button").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", b === btn));
    document.querySelectorAll("section.tab").forEach((s) => { s.hidden = s.id !== `tab-${btn.dataset.tab}`; });
  }));

/* ---------- Init ---------- */
for (const sel of ["#buy-symbol", "#dca-symbol"]) {
  $(sel).innerHTML = COINS.map((c) => `<option value="${c.symbol}">${c.name} (${c.symbol})</option>`).join("");
}
$("#fee-select").value = String(portfolio.feeRate);
renderAll(); renderSize(); renderFees(); renderRecovery(); renderLeverage();
fetchPrices();
setInterval(fetchPrices, REFRESH_MS);
