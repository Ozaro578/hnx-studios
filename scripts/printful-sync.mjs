#!/usr/bin/env node
/*
  TorPro Teamkleidung → Printful
  Legt die Produkte aus scripts/torpro-products.json als Sync-Produkte im Printful-Store an
  und kann Mockups über den Mockup-Generator erzeugen.

  Aufruf:
    PRINTFUL_API_KEY=... node scripts/printful-sync.mjs list            # Stores + vorhandene Produkte
    PRINTFUL_API_KEY=... node scripts/printful-sync.mjs plan            # nur prüfen, nichts anlegen
    PRINTFUL_API_KEY=... node scripts/printful-sync.mjs create          # Produkte anlegen (überspringt vorhandene Namen)
    PRINTFUL_API_KEY=... node scripts/printful-sync.mjs mockups         # Mockup-Bilder erzeugen → mockups.json
    PRINTFUL_API_KEY=... node scripts/printful-sync.mjs delete          # TorPro-Produkte wieder löschen

  Optional: PRINTFUL_STORE_ID (bei mehreren Stores), ONLY=polo,cap (nur bestimmte Produkte)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.printful.com';
const KEY = process.env.PRINTFUL_API_KEY;
const STORE = process.env.PRINTFUL_STORE_ID || '';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const cmd = process.argv[2] || 'plan';

const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.join(here, 'torpro-products.json'), 'utf8'));

if (!KEY && cmd !== 'plan') { console.error('PRINTFUL_API_KEY fehlt'); process.exit(2); }

async function api(method, p, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (KEY) headers.Authorization = 'Bearer ' + KEY;
  if (STORE) headers['X-PF-Store-Id'] = STORE;
  const res = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${p} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 600)}`);
  return json.result ?? json;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const catalogCache = {};
async function catalog(id) {
  if (!catalogCache[id]) catalogCache[id] = await api('GET', `/products/${id}`);
  return catalogCache[id];
}

function selected() {
  return plan.products.filter(p => !ONLY.length || ONLY.includes(p.key));
}

/* Baut sync_product + sync_variants für ein Produkt aus dem Plan */
async function build(p) {
  const cat = await catalog(p.catalogId);
  const optionIds = new Set((cat.product.options || []).map(o => o.id));
  const fileTypes = new Set((cat.product.files || []).map(f => f.id));
  const sizes = p.sizes || plan.sizes;
  const variants = [];
  const problems = [];
  for (const [color, tone] of Object.entries(p.colors)) {
    for (const size of sizes) {
      const v = cat.variants.find(x => x.color === color && x.size === size);
      if (!v) { problems.push(`${p.name}: ${color} / ${size} nicht im Katalog`); continue; }
      const files = [];
      for (const f of p.files[tone] || []) {
        if (!fileTypes.has(f.type)) { problems.push(`${p.name}: Platzierung ${f.type} nicht verfügbar`); continue; }
        const entry = { type: f.type, url: plan.baseUrl + f.file };
        if (f.position && plan.positions[f.position]) entry.position = plan.positions[f.position];
        files.push(entry);
      }
      const options = [];
      for (const f of p.files[tone] || []) {
        if (f.threadOption && f.threads) {
          if (optionIds.has(f.threadOption)) options.push({ id: f.threadOption, value: plan.threads[f.threads] });
          else problems.push(`${p.name}: Option ${f.threadOption} nicht verfügbar (Garnfarben werden von Printful automatisch gewählt)`);
        }
      }
      for (const o of p.options || []) if (optionIds.has(o.id)) options.push(o);
      variants.push({ variant_id: v.id, retail_price: p.retail, files, options, _color: color, _size: size, _image: v.image });
    }
  }
  const thumb = variants[0]?._image;
  return { sync_product: { name: p.name, thumbnail: thumb }, sync_variants: variants, problems };
}

async function existing() {
  const list = [];
  let offset = 0;
  while (true) {
    const r = await api('GET', `/store/products?limit=100&offset=${offset}`);
    list.push(...r);
    if (r.length < 100) break;
    offset += 100;
  }
  return list;
}

async function main() {
  if (cmd === 'list') {
    if (!STORE) console.log('Stores:', JSON.stringify(await api('GET', '/stores'), null, 1));
    const ex = await existing();
    console.log(`${ex.length} Sync-Produkte im Store:`);
    for (const e of ex) console.log(` - [${e.id}] ${e.name} (${e.variants} Varianten)`);
    return;
  }

  if (cmd === 'plan' || cmd === 'create') {
    const ex = cmd === 'create' ? await existing() : [];
    for (const p of selected()) {
      const b = await build(p);
      console.log(`\n== ${p.name} (Katalog ${p.catalogId}) – ${b.sync_variants.length} Varianten`);
      for (const pr of b.problems) console.log('   ! ' + pr);
      const colors = [...new Set(b.sync_variants.map(v => v._color))];
      console.log('   Farben: ' + colors.join(', '));
      console.log('   Dateien: ' + [...new Set(b.sync_variants.flatMap(v => v.files.map(f => f.type + ' ← ' + path.basename(f.url))))].join(' | '));
      if (cmd !== 'create') continue;
      if (ex.find(e => e.name === p.name)) { console.log('   → existiert bereits, übersprungen'); continue; }
      if (!b.sync_variants.length) { console.log('   → keine Varianten, übersprungen'); continue; }
      const payload = {
        sync_product: b.sync_product,
        sync_variants: b.sync_variants.map(({ _color, _size, _image, ...v }) => v),
      };
      try {
        const r = await api('POST', '/store/products', payload);
        console.log(`   ✔ angelegt: Sync-Produkt ${r.id}`);
      } catch (e) {
        console.log('   ✖ Fehler: ' + e.message);
      }
      await sleep(1500);
    }
    return;
  }

  if (cmd === 'delete') {
    const ex = await existing();
    for (const p of selected()) {
      const hit = ex.find(e => e.name === p.name);
      if (!hit) continue;
      await api('DELETE', `/store/products/${hit.id}`);
      console.log('gelöscht: ' + hit.name);
      await sleep(800);
    }
    return;
  }

  if (cmd === 'mockups') {
    // Ein Mockup je Farbe und Produkt über den Mockup-Generator (Rate-Limit beachten)
    const out = [];
    for (const p of selected()) {
      const b = await build(p);
      const byColor = {};
      for (const v of b.sync_variants) byColor[v._color] ??= v;
      const variantIds = Object.values(byColor).map(v => v.variant_id);
      const first = Object.values(byColor)[0];
      if (!first) continue;
      const files = first.files.map(f => ({ placement: f.type, image_url: f.url, position: f.position }));
      const options = first.options || [];
      let task;
      try {
        task = await api('POST', `/mockup-generator/create-task/${p.catalogId}`, { variant_ids: variantIds, format: 'jpg', files, options });
      } catch (e) {
        console.log(`✖ ${p.name}: ${e.message}`);
        continue;
      }
      console.log(`… ${p.name}: Task ${task.task_key}`);
      let result;
      for (let i = 0; i < 30; i++) {
        await sleep(10000);
        result = await api('GET', `/mockup-generator/task?task_key=${task.task_key}`);
        if (result.status === 'completed' || result.status === 'failed') break;
      }
      if (result?.status !== 'completed') { console.log(`✖ ${p.name}: ${result?.status} ${result?.error || ''}`); continue; }
      for (const m of result.mockups) {
        const color = Object.values(byColor).find(v => m.variant_ids.includes(v.variant_id))?._color;
        out.push({ product: p.key, name: p.name, color, placement: m.placement, url: m.mockup_url, extra: (m.extra || []).map(x => ({ title: x.title, url: x.url })) });
        console.log(`   ✔ ${color} ${m.placement}: ${m.mockup_url}`);
      }
      await sleep(30000); // Mockup-Generator: begrenzte Aufrufe pro Minute
    }
    fs.writeFileSync('mockups.json', JSON.stringify(out, null, 2));
    console.log(`\n${out.length} Mockups → mockups.json`);
    return;
  }

  console.error('Unbekannter Befehl: ' + cmd);
  process.exit(2);
}

main().catch(e => { console.error(e.message); process.exit(1); });
