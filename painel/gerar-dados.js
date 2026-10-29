// Gera os dados do painel a partir do indice CSV e dos relatorios HTML do MT5.
// Uso: node painel/gerar-dados.js   (ou duplo clique em Atualizar-Painel.cmd)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');                 // pasta Backtests
const INDEX_CSV = path.join(ROOT, '2026', '00_Indice', 'indice-backtests-2026.csv');
const OUT = path.join(__dirname, 'dados');
const OUT_R = path.join(OUT, 'r');

// Parametros puramente visuais/diagnosticos nao entram no filtro de parametros.
const COSMETIC = /^(Cor|Estilo|Largura|TamanhoLinhas|QuantidadeCanaisProjecao|MagicNumber|Comentario|HabilitarLogs|LogDetalhes|Exibir|Mostrar|Desenhar|ManterObjetos)/i;
const WEEKDAYS = [['Operar_Domingo', 'Dom'], ['Operar_Segunda', 'Seg'], ['Operar_Terca', 'Ter'], ['Operar_Quarta', 'Qua'], ['Operar_Quinta', 'Qui'], ['Operar_Sexta', 'Sex'], ['Operar_Sabado', 'Sáb']];

// ---------- utilitarios ----------
const decode = buf => (buf[0] === 0xFF && buf[1] === 0xFE) ? buf.toString('utf16le').slice(1) : buf.toString('utf8').replace(/^﻿/, '');
const strip = s => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const mtNum = s => { if (s == null) return null; const t = String(s).replace(/\s/g, '').match(/-?\d+(\.\d+)?/); return t ? Number(t[0]) : null; };
const brNum = s => { if (s == null || s === '') return null; const n = Number(String(s).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const parenPct = s => { const m = String(s || '').match(/\(?(-?[\d.]+)%\)?/); return m ? Number(m[1]) : null; };
const ts = s => { const m = s.match(/(\d{4})\.(\d\d)\.(\d\d) (\d\d):(\d\d)(?::(\d\d))?/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000 : null; };
const round = (n, d = 2) => n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d;
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const readText = (p, max = 40000) => { try { const t = decode(fs.readFileSync(p)); return t.length > max ? t.slice(0, max) + '\n…' : t; } catch { return null; } };

function readCsv(file) {
  const lines = decode(fs.readFileSync(file)).trim().split(/\r?\n/);
  const split = l => l.replace(/^"|"$/g, '').split('";"');
  const head = split(lines[0]);
  return lines.slice(1).map(l => { const c = split(l); return Object.fromEntries(head.map((h, i) => [h, c[i]])); });
}

// ---------- parser do relatorio MT5 ----------
function parseReport(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => strip(c[1])));
  const meta = {}, params = [], stats = [], orders = {}, deals = [];
  let section = 'cfg', paramMode = false;
  for (const r of rows) {
    const first = r[0] || '';
    if (r.length === 1 && /^Resultados$/i.test(first)) { section = 'res'; continue; }
    if (r.length === 1 && /^Ordens$/i.test(first)) { section = 'ord'; continue; }
    if (r.length === 1 && /^Transa/i.test(first)) { section = 'deal'; continue; }
    if (section === 'cfg') {
      if (r.length < 2) continue;
      const label = first.replace(/:$/, '').trim();
      if (label === 'Parâmetros de entrada') paramMode = true;
      else if (label) paramMode = false;
      if (paramMode) {
        const v = r[1]; const i = v.indexOf('=');
        if (i > 0) params.push([v.slice(0, i), v.slice(i + 1)]);
      } else if (label) meta[label] = r[1];
    } else if (section === 'res') {
      for (let i = 0; i + 1 < r.length; i += 2) {
        if (/:$/.test(r[i]) && r[i + 1] !== '') stats.push([r[i].replace(/\s*:$/, ''), r[i + 1]]);
        else if (!/:$/.test(r[i])) i--;            // celulas vazias de preenchimento
      }
    } else if (section === 'ord') {
      if (!/^\d{4}\.\d\d\.\d\d/.test(first)) continue;
      // tempo, ordem, ativo, tipo, volume, preco, S/L, T/P, tempo, estado, comentario
      orders[r[1]] = { sl: mtNum(r[6]) || null, tp: mtNum(r[7]) || null, type: r[3] };
    } else if (section === 'deal') {
      if (!/^\d{4}\.\d\d\.\d\d/.test(first)) continue;
      // horario, oferta, ativo, tipo, direcao, volume, preco, ordem, comissao, swap, lucro, saldo, comentario
      deals.push({ t: ts(first), id: r[1], sym: r[2], type: r[3], dir: r[4], vol: mtNum(r[5]), price: mtNum(r[6]), order: r[7],
        comm: mtNum(r[8]) || 0, swap: mtNum(r[9]) || 0, profit: mtNum(r[10]) || 0, bal: mtNum(r[11]), cmt: r[12] || '' });
    }
  }
  return { meta, params, stats, orders, deals };
}

// Casa entradas e saidas (FIFO por direcao, preferindo volume identico) para montar os trades.
function buildTrades(deals, orders) {
  const open = { buy: [], sell: [] }, trades = [];
  for (const d of deals) {
    if (d.type !== 'buy' && d.type !== 'sell') continue;
    if (d.dir === 'in') {
      const o = orders[d.order] || {};
      open[d.type].push({ t: d.t, dir: d.type === 'buy' ? 1 : -1, vol: d.vol, left: d.vol, price: d.price, sl: o.sl, tp: o.tp, cmt: d.cmt, cost: d.comm + d.swap });
      continue;
    }
    // saida: fecha posicao do lado oposto
    const side = d.type === 'buy' ? 'sell' : 'buy';
    const q = open[side];
    let pos = q.find(p => Math.abs(p.left - d.vol) < 1e-9) || q[0];
    const net = d.profit + d.comm + d.swap;
    if (!pos) { trades.push([null, d.t, side === 'buy' ? 1 : -1, d.vol, null, d.price, null, null, round(net), d.bal, '', d.cmt]); continue; }
    const share = Math.min(1, d.vol / pos.vol);
    const entryCost = pos.cost * share;
    trades.push([pos.t, d.t, pos.dir, d.vol, pos.price, d.price, pos.sl, pos.tp, round(net + entryCost), d.bal, pos.cmt, d.cmt]);
    pos.left = round(pos.left - d.vol, 6);
    if (pos.left <= 1e-9) q.splice(q.indexOf(pos), 1);
    if (d.dir === 'in/out') open[d.type].push({ t: d.t, dir: d.type === 'buy' ? 1 : -1, vol: d.vol, left: d.vol, price: d.price, cmt: d.cmt, cost: 0 });
  }
  return trades;
}

// Metricas derivadas dos trades/saldo (prop firm: pior dia, consistencia, meses).
function derive(deals, trades, capital) {
  const bal = deals.filter(d => d.bal != null && d.type !== 'balance');
  const days = new Map(), months = new Map();
  let prevBal = capital;
  for (const d of bal) {
    const date = new Date(d.t * 1000).toISOString();
    const day = date.slice(0, 10), mon = date.slice(0, 7);
    if (!days.has(day)) days.set(day, { start: prevBal, pnl: 0 });
    if (!months.has(mon)) months.set(mon, { start: prevBal, pnl: 0 });
    const delta = d.bal - prevBal;
    days.get(day).pnl += delta; months.get(mon).pnl += delta;
    prevBal = d.bal;
  }
  let worstDay = 0, bestDay = 0;
  for (const v of days.values()) { const pct = v.pnl / v.start * 100; worstDay = Math.min(worstDay, pct); bestDay = Math.max(bestDay, v.pnl); }
  const totalProfit = prevBal - capital;
  const mVals = [...months.values()];
  // drawdown do saldo a partir do pico
  let peak = capital, ddPeak = 0;
  for (const d of bal) { peak = Math.max(peak, d.bal); ddPeak = Math.max(ddPeak, (peak - d.bal) / peak * 100); }
  // sequencias
  let streakL = 0, maxL = 0;
  for (const t of trades) { if (t[8] < 0) { streakL++; maxL = Math.max(maxL, streakL); } else streakL = 0; }
  const wins = trades.filter(t => t[8] > 0).length;
  // curva resumida (% sobre o capital) para sparkline
  const pts = [0, ...bal.map(d => (d.bal - capital) / capital * 100)];
  const N = 48, spark = [];
  for (let i = 0; i < N; i++) spark.push(round(pts[Math.round(i * (pts.length - 1) / (N - 1))], 2));
  return {
    worstDay: round(worstDay, 2),
    bestDayShare: totalProfit > 0 ? round(bestDay / totalProfit * 100, 1) : null,
    monthsPos: mVals.filter(m => m.pnl > 0).length, monthsTotal: mVals.length,
    worstMonth: mVals.length ? round(Math.min(...mVals.map(m => m.pnl / m.start * 100)), 2) : null,
    ddBalPeak: round(ddPeak, 2), maxLossStreak: maxL,
    winRate: trades.length ? round(wins / trades.length * 100, 1) : null,
    tradingDays: days.size,
    spark: pts.length > 1 ? spark : null,
  };
}

const statOf = (stats, re) => { const s = stats.find(([k]) => re.test(k)); return s ? s[1] : null; };

// ---------- execucao ----------
function main() {
  if (!fs.existsSync(INDEX_CSV)) { console.error('Indice nao encontrado: ' + INDEX_CSV); process.exit(1); }
  const csv = readCsv(INDEX_CSV);
  fs.rmSync(OUT_R, { recursive: true, force: true });
  fs.mkdirSync(OUT_R, { recursive: true });

  const rows = [], paramValues = new Map(), errors = [];
  const t0 = Date.now();
  csv.forEach((c, n) => {
    const report = c.Relatorio, folder = c.PastaDestino;
    const folderName = path.basename(folder);
    const name = folderName.replace(/^\d+__DDB[^_]*__LP[^_]*__/, '');
    // ID estavel: a origem nao muda quando a biblioteca e reclassificada.
    const id = crypto.createHash('sha1').update((c.Origem || rel(folder)) + '|' + path.basename(report)).digest('hex').slice(0, 12);
    const capital = brNum(c.CapitalInicial) || 10000;
    let rep = null;
    try { rep = parseReport(decode(fs.readFileSync(report))); }
    catch (e) { errors.push(`${rel(report)}: ${e.message}`); }

    const trades = rep ? buildTrades(rep.deals, rep.orders) : [];
    const der = rep ? derive(rep.deals, trades, capital) : {};
    const stats = rep ? rep.stats : [];
    const params = rep ? rep.params : [];
    const pmap = Object.fromEntries(params);
    for (const [k, v] of params) {
      if (COSMETIC.test(k) || v === '') continue;
      if (!paramValues.has(k)) paramValues.set(k, new Set());
      paramValues.get(k).add(v);
    }
    const daysOn = WEEKDAYS.filter(([k]) => pmap[k] === 'true').map(([, l]) => l);
    const perMatch = (c.Periodo || '').match(/(\d{4}\.\d\d\.\d\d)\s*-\s*(\d{4}\.\d\d\.\d\d)/);
    const longs = trades.filter(t => t[2] === 1), shorts = trades.filter(t => t[2] === -1);

    rows.push({
      id, a: c.Ativo, tf: c.Timeframe, hs: c.HoraServidor, hb: c.HoraMarcacaoBrasil, pos: +c.Posicao, fx: c.FaixaRisco,
      score: brNum(c.Score), cap: capital, pl: brNum(c.LucroLiquido), plp: brNum(c.LucroPercentual),
      ddbv: brNum(c.DrawdownCapitalInicialValor), ddb: brNum(c.DrawdownCapitalInicialPercent), dde: brNum(c.DrawdownEquityPicoPercent),
      pf: brNum(c.ProfitFactor), tr: brNum(c.Trades), per: c.Periodo, from: perMatch ? perMatch[1] : null, to: perMatch ? perMatch[2] : null,
      name, folder: rel(folder), report: rel(report), coll: c.Colecao,
      ea: rep ? rep.meta['Expert Advisor (Robô)'] || null : null,
      sharpe: mtNum(statOf(stats, /Sharpe/)), rf: mtNum(statOf(stats, /Fator de Recupera/)), payoff: mtNum(statOf(stats, /Retorno Esperado/)),
      gp: mtNum(statOf(stats, /^Lucro Bruto/)), gl: mtNum(statOf(stats, /^Perda Bruta/)),
      avgW: mtNum(statOf(stats, /^M[ée]dia lucro/i)), avgL: mtNum(statOf(stats, /^M[ée]dia perda/i)),
      risk: pmap.RiscoPorTrade_Percent != null ? Number(pmap.RiscoPorTrade_Percent) : null,
      days: daysOn.length ? daysOn.join('-') : null,
      nL: longs.length, nS: shorts.length,
      plL: round(longs.reduce((s, t) => s + t[8], 0)), plS: round(shorts.reduce((s, t) => s + t[8], 0)),
      ...der, _params: pmap,
    });

    if (rep) {
      const dir = path.dirname(report);
      const files = fs.readdirSync(dir).filter(f => !/\.log$/i.test(f));
      const notes = files.filter(f => /\.md$/i.test(f)).map(f => [f, readText(path.join(dir, f))]).filter(([, t]) => t);
      const detail = {
        id, meta: rep.meta, params: rep.params, stats: rep.stats,
        trades, deals: rep.deals.map(d => [d.t, d.type, d.dir, d.vol, d.price, round(d.comm + d.swap), d.profit, d.bal, d.cmt]),
        images: files.filter(f => /\.png$/i.test(f)).map(f => rel(path.join(dir, f))),
        files: files.filter(f => !/\.png$/i.test(f)).map(f => rel(path.join(dir, f))),
        notes,
      };
      fs.writeFileSync(path.join(OUT_R, id + '.js'), `BT_DETAIL(${JSON.stringify(id)},${JSON.stringify(detail)});`);
    }
    if ((n + 1) % 100 === 0) process.stdout.write(`  ${n + 1}/${csv.length} relatorios lidos\r`);
  });

  // Parametros que variam entre testes viram filtros.
  const varying = [...paramValues].filter(([, s]) => s.size > 1 && s.size <= 60).map(([k]) => k).sort();
  for (const r of rows) { r.p = Object.fromEntries(varying.filter(k => k in r._params).map(k => [k, r._params[k]])); delete r._params; }
  const paramCatalog = Object.fromEntries(varying.map(k => [k, [...paramValues.get(k)].sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b))]));

  const index = { generated: new Date().toISOString(), source: rel(INDEX_CSV), count: rows.length, params: paramCatalog, rows };
  fs.writeFileSync(path.join(OUT, 'indice.js'), 'window.BT_INDEX=' + JSON.stringify(index) + ';');
  console.log(`\nPainel atualizado: ${rows.length} backtests, ${varying.length} parametros filtraveis, ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  if (errors.length) { console.log(`${errors.length} relatorio(s) com erro:`); errors.forEach(e => console.log('  ' + e)); }
}

main();
