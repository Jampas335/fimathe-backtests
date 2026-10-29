(() => {
'use strict';

// =====================================================================
// utilitarios
// =====================================================================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const nf = (n, d = 2) => isNum(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const pct = (n, d = 2) => isNum(n) ? nf(n, d) + '%' : '—';
const sgn = (n, d = 2, suf = '') => isNum(n) ? (n > 0 ? '+' : '') + nf(n, d) + suf : '—';
const money = (n, d = 2) => isNum(n) ? (n < 0 ? '−' : '') + '$' + nf(Math.abs(n), d) : '—';
const cls = n => isNum(n) ? (n > 0 ? 'pos' : n < 0 ? 'neg' : '') : '';
const median = a => { const s = a.filter(isNum).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const encodePath = p => p.split('/').map(encodeURIComponent).join('/');
const pad = n => String(n).padStart(2, '0');
const dt = t => { const d = new Date(t * 1000); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const dur = s => { if (!isNum(s)) return '—'; const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? `${h}h ${pad(m)}m` : `${m}m`; };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('bt.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bt.' + k, JSON.stringify(v)); } catch { } },
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800); }

const ICON = {
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18M3 12h18M3 19h18"/></svg>',
  scatter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="15" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="17" cy="13" r="2"/><path d="M3 3v18h18"/></svg>',
  heat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>',
  cols: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  tf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 20V9M12 20V4M17 20v-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/></svg>',
  bars: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="14" width="3.6" height="7" rx=".8"/><rect x="8" y="10" width="3.6" height="11" rx=".8"/><rect x="13" y="12" width="3.6" height="9" rx=".8"/><rect x="18" y="5" width="3.6" height="16" rx=".8"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.3-7.5 9.5-4.3-1.2-7.5-5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4" stroke-linecap="round"/></svg>',
  percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
  cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 3l14 7-6 2-2 6z"/></svg>',
  first: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  last: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17l5-5-5-5M12 17l5-5-5-5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/></svg>',
};

// =====================================================================
// dados
// =====================================================================
const I = window.BT_INDEX;
if (!I) { $('#main').innerHTML = '<div class="empty"><h3>Dados do painel não encontrados</h3>Rode <b>Atualizar-Painel.cmd</b> na pasta Backtests para gerar <code>painel/dados/indice.js</code>.</div>'; return; }
const ROWS = I.rows;
const BY_ID = new Map(ROWS.map(r => [r.id, r]));
const TF_ORDER = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];
const ASSETS = [...new Set(ROWS.map(r => r.a))].sort();
const TFS = [...new Set(ROWS.map(r => r.tf))].sort((a, b) => TF_ORDER.indexOf(a) - TF_ORDER.indexOf(b));
const HOURS = [...new Set(ROWS.map(r => r.hb).filter(Boolean))].sort();
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Nome de exibicao: o nome do relatorio sem os tokens de ativo/TF (que ja aparecem em "Configuracao").
// Tambem separa metricas anotadas no nome (LUCRO, DD, RISCO), horario (21H) e periodo (2026JAN-OUT),
// que ja tem colunas proprias; os valores ficam em r.nameTags para o detalhe explicar.
const NAME_METRIC = { LUCRO: 'Lucro', LP: 'Lucro', DD: 'DD', DDB: 'DD', DDE: 'DD', RISCO: 'Risco', RISK: 'Risco' };
const nameParse = r => {
  // depois de LUCRO/DD/RISCO, '_' entre numeros e separador decimal (LUCRO80_13 = 80,13)
  const parts = String(r.name || '').split('_').filter(Boolean);
  const keep = [], tags = [];
  const up = s => String(s || '').toUpperCase();
  const isN = s => /^\d+$/.test(s || '');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], P = up(p);
    if (P === up(r.a) || P === up(r.tf)) continue;
    if (/^\d{1,2}H$/.test(P) || /^\d{4}[A-Z]{3}(-[A-Z]{3})?$/.test(P)) continue;
    if (keep.length && /^VAL\d{4}$/.test(P)) { if (/^\d{4}$/.test(parts[i + 1] || '')) i++; continue; }   // janela de validacao (VAL2025_2026) = periodo
    const m = P.match(/^([A-Z]+?)(\d+)?$/);
    if (m && NAME_METRIC[m[1]] && (m[2] || isN(parts[i + 1]))) {
      let raw = m[2] || parts[++i], shown = p + (m[2] ? '' : '_' + raw);
      if (isN(parts[i + 1])) { raw += ',' + parts[++i]; shown += '_' + parts[i]; }
      let v = Number(raw.replace(',', '.'));
      if (NAME_METRIC[m[1]] === 'Risco' && !raw.includes(',') && raw.startsWith('0') && raw.length > 1) v = Number('0.' + raw.slice(1));
      tags.push({ k: NAME_METRIC[m[1]], raw: shown, v });
      continue;
    }
    keep.push(p);
  }
  return { keep, tags };
};
const NAME_CASE = { METAQUOTES: 'MetaQuotes' };
const displayName = r => {
  const { keep, tags } = nameParse(r);
  r.nameTags = tags;
  r.dnEmpty = !keep.length;
  r.dnNumbered = keep.length === 1 && tags.length > 0;   // so prefixo + numeros: vira "Prefixo · Configuração NN"
  if (!keep.length) return 'Sem variante no nome';
  const head = NAME_CASE[keep[0].toUpperCase()] || keep[0];
  return keep.length > 1 ? `${head} · ${keep.slice(1).join(' ')}` : head;
};
// Tipo de take = alvo em multiplos do risco, a partir do TP em % do canal (93% = 0,93 -> Take 1).
// Faixas: 0,45-0,70 = 0,5 · 0,70-1,20 = 1 · 1,20-1,60 = 1,5 · 1,60-2,20 = 2; depois segue o padrao
// (k+0,2 a k+0,6 = k,5 · k+0,6 a k+1,2 = k+1).
function takeOf(pct) {
  if (!isNum(pct)) return null;
  const x = pct / 100;
  for (const [a, b, t] of [[0.45, 0.70, 0.5], [0.70, 1.20, 1], [1.20, 1.60, 1.5], [1.60, 2.20, 2]]) if (x >= a && x < b) return t;
  if (x < 0.45) return Math.round(x * 100) / 100;
  for (let k = 2; ; k++) { if (x < k + 0.6) return k + 0.5; if (x < k + 1.2) return k + 1; }
}
const takeTxt = t => 'Take ' + String(t).replace('.', ',');
const ptsTxt = v => nf(v, 0) + ' pts';
const takeTip = r => `TP ${nf(r.tpPct, 0)}% do canal (${nf(r.tpPct / 100)}× o risco)${r.virada ? ` · virada de mão: TP ${nf(r.tpRevPct, 0)}% = ${takeTxt(r.takeRev)}` : ' · sem virada de mão'}`;
const fmtDate = s => s ? String(s).split('.').reverse().join('/') : '';
for (const r of ROWS) {
  r.rdd = isNum(r.plp) && isNum(r.ddb) ? r.plp / Math.max(r.ddb, 0.25) : null;   // lucro por unidade de DD do capital base
  r.mpos = r.monthsTotal ? r.monthsPos / r.monthsTotal * 100 : null;
  r.dn = displayName(r);
  r.perKey = `${r.from || '?'}→${r.to || '?'}`;
  const P = r.p || {};
  r.pts = isNum(Number(P.TamanhoMinimoCanal_Pontos)) && P.TamanhoMinimoCanal_Pontos !== undefined ? Number(P.TamanhoMinimoCanal_Pontos) : null;
  r.ptsKey = r.pts == null ? '' : String(r.pts);
  r.tpPct = P.TakeProfit_PercentualCanal !== undefined ? Number(P.TakeProfit_PercentualCanal) : null;
  r.take = takeOf(r.tpPct);
  r.takeKey = r.take == null ? '' : String(r.take);
  r.virada = P.UsarViradaDeMao === 'true';
  r.tpRevPct = P.TakeProfit_PercentualCanal_Reversao !== undefined ? Number(P.TakeProfit_PercentualCanal_Reversao) : null;
  r.takeRev = r.virada ? takeOf(r.tpRevPct) : null;
  r.hay = [r.name, r.a, r.tf, r.hb, r.days, r.ea, r.folder, r.per, r.coll, r.pts != null ? r.pts + ' pts' : '', r.take != null ? takeTxt(r.take) : ''].join(' ').toLowerCase();
}
// variantes que so se diferenciam pelos numeros do nome: numeradas por lucro dentro do grupo (ativo, TF, prefixo)
const numbered = {};
for (const r of ROWS) if (r.dnNumbered) (numbered[`${r.a}|${r.tf}|${r.dn}`] ||= []).push(r);
for (const g of Object.values(numbered)) g.sort((a, b) => (b.plp ?? -Infinity) - (a.plp ?? -Infinity) || a.name.localeCompare(b.name)).forEach((r, i) => { r.dn = `${r.dn} · Configuração ${pad(i + 1)}`; });
for (const r of ROWS) r.hay += ' ' + r.dn.toLowerCase();
const PERIODS = Object.entries(ROWS.reduce((m, r) => (m[r.perKey] = (m[r.perKey] || 0) + 1, m), {})).sort((a, b) => a[0].localeCompare(b[0])).map(([k]) => k);
const TAKES = [...new Set(ROWS.map(r => r.takeKey).filter(Boolean))].sort((a, b) => a - b);
const PTS = [...new Set(ROWS.map(r => r.ptsKey).filter(Boolean))].sort((a, b) => a - b);
const perLabel = k => { const [a, b] = k.split('→'); return `${fmtDate(a)} – ${fmtDate(b)}`; };

// Metricas disponiveis para filtro, eixo de grafico e colunas.
const M = {
  plp: { long: 'Lucro líquido em % do capital inicial', l: 'Lucro %', h: 'Lucro', f: v => sgn(v, 2, '%'), c: true, better: 1 },
  pl: { long: 'Lucro líquido em dólares', l: 'Lucro líquido $', h: 'Lucro $', f: v => money(v), c: true, better: 1 },
  ddb: { long: 'DD capital inicial % — queda da equity abaixo do capital inicial', l: 'DD capital inicial %', h: 'DD inicial', f: v => pct(v), better: -1, tip: 'Maior queda da equity abaixo do capital inicial (equity registrada pelo MT5). É a medida usada como “perda total” pelas mesas prop.' },
  dde: { long: 'DD equity do pico % — queda da equity a partir do maior valor anterior', l: 'DD equity do pico %', h: 'DD do pico', f: v => pct(v), better: -1, tip: 'Maior queda da equity a partir do pico anterior (MT5: rebaixamento máximo do capital líquido). Inclui quedas depois de lucros.' },
  pf: { long: 'Profit Factor — lucro bruto ÷ prejuízo bruto', l: 'Profit Factor', h: 'PF', f: v => nf(v), better: 1, tip: 'Lucro bruto ÷ prejuízo bruto' },
  rdd: { long: 'Lucro % ÷ DD capital inicial %', l: 'Lucro / DD inicial', f: v => nf(v, 1), better: 1, tip: 'Lucro % dividido pelo DD capital inicial % (mínimo 0,25 para não explodir com DD perto de zero)' },
  tr: { long: 'Nº de trades', l: 'Trades', f: v => nf(v, 0), better: 0 },
  winRate: { long: 'Taxa de acerto % (trades com lucro)', l: 'Taxa de acerto %', h: 'Acerto', f: v => pct(v, 1), better: 1 },
  worstDay: { long: 'Pior dia % — pior soma diária de trades fechados', l: 'Pior dia %', f: v => sgn(v, 2, '%'), c: true, better: 1, tip: 'Pior resultado diário (fechado) sobre o saldo do início do dia' },
  bestDayShare: { long: 'Melhor dia em % do lucro total (consistência)', l: 'Melhor dia / lucro %', f: v => pct(v, 1), better: -1, tip: 'Consistência: quanto do lucro total veio do melhor dia' },
  mpos: { long: 'Meses positivos % (meses com lucro)', l: 'Meses positivos %', f: v => pct(v, 0), better: 1 },
  worstMonth: { long: 'Pior mês %', l: 'Pior mês %', f: v => sgn(v, 2, '%'), c: true, better: 1 },
  sharpe: { long: 'Sharpe (MT5)', l: 'Sharpe', f: v => nf(v), better: 1 },
  rf: { long: 'Fator de recuperação (MT5)', l: 'Fator de recuperação', f: v => nf(v), better: 1 },
  payoff: { long: 'Payoff médio $ por trade (MT5)', l: 'Payoff médio $', f: v => money(v), c: true, better: 1 },
  maxLossStreak: { long: 'Perdas seguidas (máximo)', l: 'Perdas seguidas (máx)', f: v => nf(v, 0), better: -1 },
  risk: { long: 'Risco por trade %', l: 'Risco por trade %', f: v => pct(v, 2), better: 0 },
  score: { long: 'Score da biblioteca (índice CSV)', l: 'Score da biblioteca', f: v => nf(v), better: 1 },
};
const RESULT_KEYS = ['plp', 'ddb', 'dde', 'pf'];
const MORE_KEYS = ['rdd', 'tr', 'winRate', 'worstDay', 'bestDayShare', 'mpos', 'sharpe', 'risk'];
const RANGE_KEYS = [...RESULT_KEYS, ...MORE_KEYS];

const COLS = [
  { k: 'name', l: 'Estratégia', t: 'text', fixed: true }, { k: 'cfg', l: 'Configuração', sortKey: 'a' }, { k: 'spark', l: 'Curva', nosort: true },
  ...Object.keys(M).map(k => ({ k, l: M[k].l, long: M[k].long, n: true })),
  { k: 'pts', l: 'Canal mínimo (pts)', long: 'Tamanho mínimo do canal em pontos', n: true }, { k: 'take', l: 'Take', long: 'Tipo de take (alvo ÷ risco)', n: true },
  { k: 'days', l: 'Dias operados', t: 'text' }, { k: 'perKey', l: 'Período', t: 'text' }, { k: 'ea', l: 'Robô', t: 'text' }, { k: 'coll', l: 'Coleção', t: 'text' },
];
const DEFAULT_COLS = ['name', 'cfg', 'spark', 'plp', 'ddb', 'pf'];
const COLS_VER = 3;

// Presets = combinacoes de ordenacao/filtro com a regra escrita por extenso.
const PRESETS = [
  { id: 'prop', l: 'Menor drawdown', rule: 'Só lucrativos · DD capital inicial ↑ · desempate: lucro % ↓', sort: [['ddb', 1], ['plp', -1]], pos: true },
  { id: 'eff', l: 'Lucro por risco', rule: 'Só lucrativos · lucro % ÷ DD capital inicial ↓ · desempate: Profit Factor ↓', sort: [['rdd', -1], ['pf', -1]], pos: true },
  { id: 'max', l: 'Maior lucro', rule: 'Lucro % ↓ · desempate: DD capital inicial ↑', sort: [['plp', -1], ['ddb', 1]] },
  { id: 'cons', l: 'Consistência', rule: 'Só lucrativos · % de meses positivos ↓ · depois pior dia ↓ (menos negativo) · depois lucro % ↓', sort: [['mpos', -1], ['worstDay', -1], ['plp', -1]], pos: true },
];

const emptyFilters = () => ({ q: '', a: [], tf: [], hb: [], days: [], take: [], pts: [], per: [], perFrom: '', perTo: '', ranges: {}, params: {}, pos: false, favs: false, prop: false });
const S = Object.assign({
  filters: emptyFilters(), sort: [['plp', -1]], preset: '', view: 'table', cols: DEFAULT_COLS, page: 0, pageSize: 10, focus: null,
  heatMetric: 'best', scX: 'ddb', scY: 'plp', sideHidden: false, colsVer: 0, showAllAssets: false, density: 'normal', showHl: false,
}, store.get('state', {}));
S.filters = Object.assign(emptyFilters(), S.filters);
if (S.colsVer !== COLS_VER) { S.cols = [...DEFAULT_COLS]; S.colsVer = COLS_VER; S.pageSize = 10; }
S.cols = S.cols.filter(k => COLS.some(c => c.k === k));
const favs = new Set(store.get('favs', []));
let cmp = store.get('cmp', []).filter(id => BY_ID.has(id));
let cmpAlign = store.get('cmpAlign', 'date');
let cmpScale = store.get('cmpScale', 'pct');
let views = store.get('views', []);
const PROP = Object.assign({ target: 10, daily: 5, total: 10, cons: '' }, store.get('prop', {}));
const save = () => store.set('state', { filters: S.filters, sort: S.sort, preset: S.preset, view: S.view, cols: S.cols, pageSize: S.pageSize, heatMetric: S.heatMetric, scX: S.scX, scY: S.scY, sideHidden: S.sideHidden, colsVer: S.colsVer, showAllAssets: S.showAllAssets, density: S.density, focus: S.focus, navMini: S.navMini });
const propRuleText = () => `lucro ≥ ${nf(PROP.target, 0)}% · pior dia > −${nf(PROP.daily, 0)}% · DD capital inicial < ${nf(PROP.total, 0)}%${PROP.cons !== '' ? ` · melhor dia ≤ ${PROP.cons}% do lucro` : ''}`;

const propPass = r => isNum(r.plp) && r.plp >= PROP.target && (!isNum(r.worstDay) || r.worstDay > -PROP.daily) && isNum(r.ddb) && r.ddb < PROP.total && (PROP.cons === '' || !isNum(r.bestDayShare) || r.bestDayShare <= Number(PROP.cons));

// =====================================================================
// filtros
// =====================================================================
function matches(r, f, except) {
  if (except !== 'q' && f.q) {
    for (const tok of f.q.toLowerCase().split(/\s+/).filter(Boolean)) {
      if (tok[0] === '-' && tok.length > 1) { if (r.hay.includes(tok.slice(1))) return false; }
      else if (!r.hay.includes(tok)) return false;
    }
  }
  if (except !== 'a' && f.a.length && !f.a.includes(r.a)) return false;
  if (except !== 'tf' && f.tf.length && !f.tf.includes(r.tf)) return false;
  if (except !== 'hb' && f.hb.length && !f.hb.includes(r.hb)) return false;
  if (except !== 'take' && f.take.length && !f.take.includes(r.takeKey)) return false;
  if (except !== 'pts' && f.pts.length && !f.pts.includes(r.ptsKey)) return false;
  if (except !== 'per' && f.per.length && !f.per.includes(r.perKey)) return false;
  if (f.perFrom && (!r.from || r.from.replace(/./g, '-') < f.perFrom)) return false;
  if (f.perTo && (!r.to || r.to.replace(/./g, '-') > f.perTo)) return false;
  if (except !== 'days' && f.days.length) { const d = (r.days || '').split('-'); if (!f.days.every(x => d.includes(x))) return false; }
  for (const k in f.ranges) {
    const [mn, mx] = f.ranges[k]; const v = r[k];
    if ((isNum(mn) || isNum(mx)) && !isNum(v)) return false;
    if (isNum(mn) && v < mn) return false;
    if (isNum(mx) && v > mx) return false;
  }
  for (const k in f.params) { if (except === 'p:' + k) continue; const vals = f.params[k]; if (vals.length && !vals.includes(r.p[k])) return false; }
  if (f.pos && !(r.pl > 0)) return false;
  if (f.favs && !favs.has(r.id)) return false;
  if (f.prop && !propPass(r)) return false;
  return true;
}
const filtered = except => ROWS.filter(r => (libMode !== 'fav' || favs.has(r.id)) && matches(r, S.filters, except));
function compare(a, b) {
  for (const [k, d] of S.sort) {
    const x = a[k], y = b[k];
    if (x == null && y == null) continue;
    if (x == null) return 1; if (y == null) return -1;       // vazios sempre no fim
    const c = typeof x === 'string' ? x.localeCompare(y, 'pt-BR', { numeric: true }) : x - y;
    if (c) return c * d;
  }
  return 0;
}
const activeCount = f => (f.q ? 1 : 0) + f.a.length + f.tf.length + f.hb.length + f.days.length + f.take.length + f.pts.length + f.per.length + (f.perFrom ? 1 : 0) + (f.perTo ? 1 : 0) + Object.values(f.ranges).filter(([a, b]) => isNum(a) || isNum(b)).length + Object.values(f.params).filter(v => v.length).length + (f.pos ? 1 : 0) + (f.favs ? 1 : 0) + (f.prop ? 1 : 0);

// =====================================================================
// graficos (ECharts)
// =====================================================================
let charts = [];
function disposeCharts() { charts.forEach(c => c.dispose()); charts = []; }
window.addEventListener('resize', debounce(() => charts.forEach(c => c.resize()), 120));
function pal() {
  return {
    ink: css('--ink'), ink2: css('--ink-2'), muted: css('--muted'), line: css('--line'), line2: css('--line-2'),
    surface: css('--surface'), surface2: css('--surface-2'), accent: css('--accent'), accentInk: css('--accent-ink'), pos: css('--pos'), neg: css('--neg'),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map(i => css('--s' + i)),
  };
}
function base(extra = {}) {
  const c = pal();
  return Object.assign({
    useUTC: true, animationDuration: 300,
    textStyle: { fontFamily: css('--font'), color: c.ink2, fontSize: 11 },
    grid: { left: 10, right: 18, top: 30, bottom: 10, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: c.surface, borderColor: c.line2, borderWidth: 1, padding: [8, 11], textStyle: { color: c.ink, fontSize: 12 }, extraCssText: 'border-radius:4px;box-shadow:none;', axisPointer: { type: 'line', lineStyle: { color: c.muted, width: 1 } } },
  }, extra);
}
const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const timeLabel = v => { const d = new Date(v), m = d.getUTCMonth(), day = d.getUTCDate(); if (day === 1 && d.getUTCHours() === 0) return m === 0 ? `{y|${d.getUTCFullYear()}}` : MES[m]; return `${pad(day)}/${pad(m + 1)}`; };
const moneyAxis = v => money(v, 0);
function axis(type, extra = {}) {
  const c = pal();
  return Object.assign({
    type, axisLine: { show: type !== 'value', lineStyle: { color: c.line2 } }, axisTick: { show: false },
    axisLabel: Object.assign({ color: c.muted, fontSize: 11, hideOverlap: true }, type === 'time' ? { formatter: timeLabel, rich: { y: { color: c.ink2, fontWeight: 600, fontSize: 11 } } } : {}),
    splitLine: { show: type === 'value', lineStyle: { color: c.line, width: 1 } },
    nameTextStyle: { color: c.muted, fontSize: 11 },
  }, extra);
}
function mk(el, opt) { const ch = echarts.init(el, null, { renderer: 'canvas' }); ch.setOption(opt); charts.push(ch); return ch; }
function tfColor(tf) { const p = pal().s; return p[Math.max(0, TFS.indexOf(tf)) % 8]; }
const signBar = (v, c) => ({ value: v, itemStyle: { color: v >= 0 ? c.pos : c.neg, borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } });

// Curva resumida (saldo em % do capital inicial). mn/mx em comum entre as linhas => alturas comparaveis.
function sparkSvg(a, mn = Math.min(0, ...(a || [0])), mx = Math.max(0, ...(a || [0]))) {
  if (!a || a.length < 2) return '<span class="muted">—</span>';
  const w = 100, h = 32, rg = mx - mn || 1;
  const y = v => (h - 2 - (v - mn) / rg * (h - 4)).toFixed(1);
  const pts = a.map((v, i) => `${(i / (a.length - 1) * w).toFixed(1)},${y(v)}`).join(' ');
  const col = a[a.length - 1] >= 0 ? 'var(--pos)' : 'var(--neg)';
  const tip = `Saldo em % do capital: final ${sgn(a[a.length - 1], 2, '%')} · mínimo ${sgn(Math.min(...a), 2, '%')} · máximo ${sgn(Math.max(...a), 2, '%')}`;
  return `<svg class="spark" preserveAspectRatio="none" role="img" aria-label="${tip}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polygon points="0,${h} ${pts} ${w},${h}" fill="${col}" fill-opacity=".1"/><line x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="2 2"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/><title>${tip}</title></svg>`;
}

// =====================================================================
// filtros: gaveta completa + menus rapidos (Periodo, Timeframe)
// =====================================================================
const parseNum = v => { const s = String(v).trim().replace(/\s/g, '').replace(',', '.'); if (s === '' || s === '-') return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
const RANGE_LABEL = { plp: 'Lucro (%)', ddb: 'DD capital inicial (%)', dde: 'DD equity do pico (%)', pf: 'Profit Factor', rdd: 'Lucro ÷ DD capital inicial', tr: 'Nº de trades', winRate: 'Taxa de acerto (%)', worstDay: 'Pior dia (%)', bestDayShare: 'Melhor dia / lucro total (%)', mpos: 'Meses positivos (%)', sharpe: 'Sharpe', risk: 'Risco por trade (%)' };
const rangeCount = keys => keys.filter(k => S.filters.ranges[k]).length;
const CNT_HELP = `<p>O número ao lado de cada opção é quantos testes ficariam se você marcasse essa opção, <b>considerando os outros filtros já aplicados</b>.</p><p>Opções do mesmo grupo se somam (ativo XAUUSD <b>ou</b> EURUSD); grupos diferentes se combinam (XAUUSD <b>e</b> M15).</p>`;

function rangeBlock(k) {
  const [mn, mx] = S.filters.ranges[k] || [];
  const v = x => isNum(x) ? String(x).replace('.', ',') : '';
  return `<div class="rng">
    <label for="r-${k}-0">${RANGE_LABEL[k] || M[k].l}${M[k].tip ? `<span class="hint" title="${esc(M[k].tip)}">${ICON.info}</span>` : ''}</label>
    <div class="rng-in"><input id="r-${k}-0" inputmode="decimal" autocomplete="off" placeholder="mínimo" data-r="${k}" data-i="0" value="${v(mn)}" class="${isNum(mn) ? 'set' : ''}"><span>—</span><input inputmode="decimal" autocomplete="off" placeholder="máximo" data-r="${k}" data-i="1" value="${v(mx)}" class="${isNum(mx) ? 'set' : ''}" aria-label="${esc(RANGE_LABEL[k] || M[k].l)} máximo"></div>
  </div>`;
}

function renderSide() {
  const f = S.filters;
  const paramKeys = Object.keys(I.params);
  $('#side').innerHTML = `
    <div class="side-head"><h2>Filtros</h2><span class="side-cnt" id="cntAll"></span>
      ${pop('cntHelp', 'Como ler os números', CNT_HELP)}
      <button class="x" id="closeSide" aria-label="Fechar filtros">×</button></div>
    <div class="side-body">
    <details class="fgroup" open data-g="a"><summary>Ativo<span class="cnt" id="cnt-a"></span></summary><div class="fbody">
      <input class="mini-search" id="aq" type="search" placeholder="Buscar ativo…" autocomplete="off" aria-label="Buscar ativo">
      <div class="checklist" id="g-a"></div>
    </div></details>
    <details class="fgroup" open data-g="cfg"><summary>Configuração<span class="cnt" id="cnt-cfg"></span></summary><div class="fbody">
      <div class="sublabel">Timeframe</div><div class="opt-grid c3" id="g-tf"></div>
      <div class="sublabel">Horário de marcação (Brasília)</div><div class="opt-grid c3" id="g-hb"></div>
      <div class="sublabel">Take (alvo ÷ risco) <span class="hint" title="Take 1 = arrisca 1 para ganhar 1; Take 2 = arrisca 1 para ganhar 2. Calculado pelo TP em % do canal: 0,70–1,20 = Take 1 · 1,60–2,20 = Take 2.">${ICON.info}</span></div><div class="opt-grid c4" id="g-take"></div>
      <div class="sublabel">Tamanho mínimo do canal (pontos)</div><div class="opt-grid c4" id="g-pts"></div>
      <div class="sublabel">Dias operados <span class="hint" title="Mostra os testes que operam em todos os dias marcados.">${ICON.info}</span></div><div class="opt-grid c4" id="g-days"></div>
    </div></details>
    <details class="fgroup" open data-g="per"><summary>Período do backtest<span class="cnt" id="cnt-per"></span></summary><div class="fbody">
      <div class="date-rng"><label><span>Começa a partir de</span><input type="date" id="perFrom" value="${esc(f.perFrom)}"></label><label><span>Termina até</span><input type="date" id="perTo" value="${esc(f.perTo)}"></label></div>
      <div class="sublabel">Períodos existentes</div><div class="checklist" id="g-per"></div>
    </div></details>
    <details class="fgroup" open data-g="res"><summary>Resultados<span class="cnt" id="cnt-res"></span></summary><div class="fbody">${RESULT_KEYS.map(rangeBlock).join('')}</div></details>
    <details class="fgroup" data-g="more" ${rangeCount(MORE_KEYS) ? 'open' : ''}><summary>Mais métricas<span class="cnt" id="cnt-more"></span></summary><div class="fbody">${MORE_KEYS.map(rangeBlock).join('')}</div></details>
    <details class="fgroup" data-g="crit" ${f.prop || f.pos || f.favs ? 'open' : ''}><summary>Critérios adicionais<span class="cnt" id="cnt-crit"></span></summary><div class="fbody">
      <label class="toggle">Somente lucrativos<input type="checkbox" id="fpos" ${f.pos ? 'checked' : ''}></label>
      <label class="toggle">Somente favoritos<input type="checkbox" id="ffav" ${f.favs ? 'checked' : ''}></label>
      <label class="toggle">Somente aprovados no critério prop<input type="checkbox" id="fprop" ${f.prop ? 'checked' : ''}></label>
      <button class="link-btn" data-open-prop>Ver ou editar o critério prop</button>
    </div></details>
    <details class="fgroup" data-g="p" ${Object.keys(f.params).length ? 'open' : ''}><summary>Parâmetros do robô<span class="cnt" id="cnt-p"></span></summary><div class="fbody">
      <div class="param-pick"><select class="sel" id="paramAdd" aria-label="Adicionar filtro por parâmetro"><option value="">+ Filtrar por parâmetro (${paramKeys.length} variam)…</option>${paramKeys.filter(k => !(k in f.params)).map(k => `<option>${esc(k)}</option>`).join('')}</select></div>
      <div id="g-params"></div>
    </div></details>
    </div>
    <div class="side-foot"><button class="btn outline" id="clearAll">Limpar tudo</button><button class="btn primary" id="sideDone"><span>Mostrar <b id="sideN"></b> resultados</span></button></div>`;
  refreshFacets();

  const side = $('#side');
  $('#aq').addEventListener('input', () => refreshFacets());
  side.onclick = e => {
    const chip = e.target.closest('button[data-facet]');
    if (chip) { toggleFacet(chip.dataset.facet, chip.dataset.v); return; }
    const rm = e.target.closest('[data-prm]');
    if (rm) { delete f.params[rm.dataset.prm]; renderSide(); changed(); return; }
    if (e.target.closest('#showAllA')) { S.showAllAssets = !S.showAllAssets; save(); refreshFacets(); }
  };
  side.onchange = e => {
    const t = e.target;
    if (t.matches('input[type=checkbox][data-facet]')) { toggleFacet(t.dataset.facet, t.dataset.v); return; }
    if (t.dataset.r) applyRange(t);
    if (t.id === 'perFrom' || t.id === 'perTo') { f[t.id] = t.value; changed(); }
  };
  const typing = debounce(t => applyRange(t), 700);
  side.oninput = e => { if (e.target.dataset.r) typing(e.target); };
  side.onkeydown = e => { if (e.key === 'Enter' && e.target.dataset.r) applyRange(e.target); };
  $('#paramAdd').onchange = e => { if (!e.target.value) return; f.params[e.target.value] = []; renderSide(); };
  $('#fpos').onchange = e => { S.filters.pos = e.target.checked; changed(); };
  $('#ffav').onchange = e => { S.filters.favs = e.target.checked; changed(); };
  $('#fprop').onchange = e => { S.filters.prop = e.target.checked; changed(); };
  $('#clearAll').onclick = clearFilters;
  $('#closeSide').onclick = $('#sideDone').onclick = () => setSide(false);
}
function toggleFacet(g, v) {
  const f = S.filters, arr = g.startsWith('p:') ? f.params[g.slice(2)] : f[g];
  const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v);
  changed();
}
function applyRange(t) {
  const f = S.filters, k = t.dataset.r, cur = f.ranges[k] ? [...f.ranges[k]] : [null, null];
  const n = parseNum(t.value);
  if (t.value.trim() !== '' && n == null) { t.classList.add('bad'); return; }
  t.classList.remove('bad');
  if (cur[+t.dataset.i] === n) return;
  cur[+t.dataset.i] = n;
  if (!isNum(cur[0]) && !isNum(cur[1])) delete f.ranges[k]; else f.ranges[k] = cur;
  t.classList.toggle('set', n != null);
  changed();
}
function clearFilters() { S.filters = emptyFilters(); S.preset = ''; renderSide(); changed(); }

// dialogos (critério prop, configurações, ajuda)
function dialog(id, html, onclose) {
  let d = document.getElementById(id);
  if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'dlg'; document.body.appendChild(d); }
  d.innerHTML = html;
  d.onclose = onclose || null;
  d.onclick = e => { if (e.target === d) d.close(); };   // clique fora fecha
  if (!d.open) d.showModal();
  return d;
}
function openPropDialog() {
  const d = dialog('propDlg', `<form method="dialog" class="dlg-in">
    <header><h2>Critério prop</h2><button class="x" value="close" aria-label="Fechar">×</button></header>
    <p>Um teste é <b>aprovado</b> quando passa em todas as regras abaixo. Os valores ficam salvos neste navegador e valem para a biblioteca, o resumo e a aba Risco de cada teste.</p>
    <div class="dlg-rules">
      <label><span><b>Meta de lucro</b><small>Lucro líquido % sobre o capital inicial precisa ser maior ou igual a</small></span><input inputmode="decimal" data-prop="target" value="${String(PROP.target).replace('.', ',')}"><em>%</em></label>
      <label><span><b>Perda diária máxima</b><small>O pior dia (soma dos trades fechados no dia, horário do servidor) precisa perder menos que</small></span><input inputmode="decimal" data-prop="daily" value="${String(PROP.daily).replace('.', ',')}"><em>%</em></label>
      <label><span><b>Perda total máxima</b><small>O DD capital inicial (equity abaixo do capital inicial, MT5) precisa ser menor que</small></span><input inputmode="decimal" data-prop="total" value="${String(PROP.total).replace('.', ',')}"><em>%</em></label>
      <label><span><b>Consistência (opcional)</b><small>O melhor dia pode representar no máximo esta fração do lucro total. Vazio = não usar.</small></span><input inputmode="decimal" data-prop="cons" value="${esc(String(PROP.cons).replace('.', ','))}" placeholder="—"><em>%</em></label>
    </div>
    <p class="fhint">Limitação: o MT5 não exporta a equity intradiária, então quedas flutuantes dentro do dia não entram na perda diária.</p>
    <footer><label class="toggle inline"><input type="checkbox" id="dlgOnly" ${S.filters.prop ? 'checked' : ''}>Mostrar só os aprovados</label><span class="spacer"></span><button class="btn primary" value="close">Concluir</button></footer>
  </form>`, () => { if (route().name === 'detail') go(); });
  d.querySelector('.dlg-rules').addEventListener('input', debounce(e => {
    const t = e.target, k = t.dataset.prop; if (!k) return;
    if (k === 'cons') { PROP.cons = t.value.trim() === '' ? '' : (parseNum(t.value) ?? ''); }
    else { const n = parseNum(t.value); t.classList.toggle('bad', n == null); if (n == null) return; PROP[k] = n; }
    store.set('prop', PROP); changed();
  }, 400));
  $('#dlgOnly', d).onchange = e => { S.filters.prop = e.target.checked; const fp = $('#fprop'); if (fp) fp.checked = e.target.checked; changed(); };
}
document.addEventListener('click', e => { if (e.target.closest('[data-open-prop]')) { e.preventDefault(); closeMenus(); openPropDialog(); } });

function openSettings() {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const g = new Date(I.generated);
  const d = dialog('setDlg', `<form method="dialog" class="dlg-in">
    <header><h2>Configurações</h2><button class="x" value="close" aria-label="Fechar">×</button></header>
    <div class="dlg-sec"><h3>Aparência</h3>
      <div class="dlg-row"><span>Tema</span><div class="seg" id="setTheme"><button type="button" data-v="dark" class="${theme === 'dark' ? 'on' : ''}">Escuro</button><button type="button" data-v="light" class="${theme === 'light' ? 'on' : ''}">Claro</button></div></div>
      <div class="dlg-row"><span>Densidade da tabela</span><div class="seg" id="setDens"><button type="button" data-v="normal" class="${S.density !== 'compact' ? 'on' : ''}">Padrão</button><button type="button" data-v="compact" class="${S.density === 'compact' ? 'on' : ''}">Compacta</button></div></div>
    </div>
    <div class="dlg-sec"><h3>Critério prop</h3><p>${esc(propRuleText())}</p><button type="button" class="btn outline sm" data-open-prop>Editar critério</button></div>
    <div class="dlg-sec"><h3>Dados</h3>
      <p><b>${nf(I.count, 0)}</b> relatórios · índice gerado em ${g.toLocaleDateString('pt-BR')} às ${g.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
      <p>Para incluir relatórios novos, rode <b>Atualizar-Painel.cmd</b> na pasta Backtests e recarregue esta página.</p></div>
    <div class="dlg-sec"><h3>Preferências salvas</h3><p>Filtros, colunas, favoritos, comparação, anotações e visualizações ficam guardados neste navegador.</p><button type="button" class="btn outline sm" id="setReset">Restaurar filtros, colunas e ordenação</button></div>
  </form>`);
  $('#setTheme', d).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; setTheme(b.dataset.v); $$('#setTheme button', d).forEach(x => x.classList.toggle('on', x === b)); };
  $('#setDens', d).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; S.density = b.dataset.v; save(); $$('#setDens button', d).forEach(x => x.classList.toggle('on', x === b)); if (isLib()) renderLibBody(); };
  $('#setReset', d).onclick = () => { S.filters = emptyFilters(); S.sort = [['plp', -1]]; S.preset = ''; S.cols = [...DEFAULT_COLS]; S.view = 'table'; S.page = 0; save(); d.close(); go(); toast('Preferências restauradas'); };
}
function openHelp() {
  dialog('helpDlg', `<form method="dialog" class="dlg-in">
    <header><h2>Ajuda</h2><button class="x" value="close" aria-label="Fechar">×</button></header>
    <div class="dlg-sec"><h3>Atalhos</h3><dl>
      <dt><kbd>/</kbd></dt><dd>Buscar backtests</dd>
      <dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>Mover a seleção na tabela (a prévia acompanha)</dd>
      <dt><kbd>Enter</kbd></dt><dd>Abrir a análise completa do backtest selecionado</dd>
      <dt><kbd>F</kbd></dt><dd>Abrir os filtros</dd>
      <dt><kbd>Esc</kbd></dt><dd>Fechar menus, filtros e prévia; voltar à biblioteca</dd>
    </dl></div>
    <div class="dlg-sec"><h3>Busca</h3><p>Pesquisa no nome do relatório, ativo, timeframe, horário, dias operados, robô, período e pasta. Várias palavras precisam aparecer todas; <b>-palavra</b> exclui quem tem a palavra.</p></div>
    <div class="dlg-sec"><h3>Os três drawdowns</h3><dl>
      <dt>DD capital inicial</dt><dd>${esc(M.ddb.tip)}</dd>
      <dt>DD equity do pico</dt><dd>${esc(M.dde.tip)}</dd>
      <dt>DD de saldo do pico</dt><dd>Maior queda do saldo (só operações fechadas) a partir do maior saldo anterior. Calculado pelo painel.</dd>
    </dl></div>
    <div class="dlg-sec"><h3>Números nos filtros</h3>${CNT_HELP}</div>
  </form>`);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-dlg]'); if (!b) return;
  closeNav();
  if (b.dataset.dlg === 'settings') openSettings(); else openHelp();
});

function facetCounts(group) {
  const counts = {};
  for (const r of filtered(group)) {
    if (group === 'days') (r.days || '').split('-').forEach(d => counts[d] = (counts[d] || 0) + 1);
    else { const v = group.startsWith('p:') ? r.p[group.slice(2)] : r[{ per: 'perKey', take: 'takeKey', pts: 'ptsKey' }[group] || group]; counts[v] = (counts[v] || 0) + 1; }
  }
  return counts;
}
// botoes de opcao (poucas opcoes): nome em cima, contagem embaixo, estado marcado evidente
function facetChips(group, values, label = v => v) {
  const f = S.filters, counts = facetCounts(group);
  const sel = group.startsWith('p:') ? f.params[group.slice(2)] : f[group];
  return values.map(v => { const on = sel.includes(v); return `<button class="opt ${on ? 'on' : ''} ${!counts[v] && !on ? 'dis' : ''}" aria-pressed="${on}" data-facet="${esc(group)}" data-v="${esc(v)}"><span>${esc(label(v))}</span><em>${nf(counts[v] || 0, 0)}</em></button>`; }).join('');
}
function facetList(group, values, label = v => v, limit = 0) {
  const sel = S.filters[group], counts = facetCounts(group);
  let shown = values;
  if (limit && values.length > limit) shown = values.filter((v, i) => i < limit || sel.includes(v));
  return shown.map(v => { const on = sel.includes(v); return `<label class="ck ${on ? 'on' : ''} ${!counts[v] && !on ? 'dis' : ''}"><input type="checkbox" data-facet="${group}" data-v="${esc(v)}" ${on ? 'checked' : ''}><span>${esc(label(v))}</span><em>${nf(counts[v] || 0, 0)}</em></label>`; }).join('');
}
function refreshFacets() {
  const f = S.filters;
  if (!$('#g-a')) return;
  const q = ($('#aq')?.value || '').trim().toUpperCase();
  const assetCounts = facetCounts('a');
  let assets = [...ASSETS].sort((x, y) => (assetCounts[y] || 0) - (assetCounts[x] || 0) || x.localeCompare(y));
  if (q) assets = assets.filter(a => a.includes(q));
  const LIM = 8, more = !q && assets.length > LIM;
  $('#g-a').innerHTML = (assets.length ? facetList('a', assets, v => v, more && !S.showAllAssets ? LIM : 0) : '<p class="fhint">Nenhum ativo com esse nome.</p>') +
    (more ? `<button class="link-btn" id="showAllA">${S.showAllAssets ? 'Mostrar menos' : `Mostrar todos (${assets.length})`}</button>` : '');
  $('#g-tf').innerHTML = facetChips('tf', TFS);
  $('#g-hb').innerHTML = facetChips('hb', HOURS);
  $('#g-days').innerHTML = facetChips('days', DAYS);
  $('#g-take').innerHTML = facetChips('take', TAKES, v => takeTxt(v));
  $('#g-pts').innerHTML = facetChips('pts', PTS);
  $('#g-per').innerHTML = facetList('per', PERIODS, perLabel);
  $('#g-params').innerHTML = Object.keys(f.params).map(k => `<div class="param-row"><header><span>${esc(k)}</span><button class="x" data-prm="${esc(k)}" title="Remover filtro" aria-label="Remover filtro ${esc(k)}">×</button></header><div class="opt-grid c3">${facetChips('p:' + k, I.params[k] || [])}</div></div>`).join('');
  const n = (id, v) => { const el = $('#cnt-' + id); if (el) el.textContent = v ? v : ''; };
  n('a', f.a.length); n('cfg', f.tf.length + f.hb.length + f.take.length + f.pts.length + f.days.length); n('per', f.per.length + (f.perFrom ? 1 : 0) + (f.perTo ? 1 : 0));
  n('res', rangeCount(RESULT_KEYS)); n('more', rangeCount(MORE_KEYS));
  n('crit', (f.pos ? 1 : 0) + (f.favs ? 1 : 0) + (f.prop ? 1 : 0)); n('p', Object.values(f.params).filter(v => v.length).length);
  const total = activeCount(f) - (f.q ? 1 : 0);
  $('#cntAll').textContent = total ? `${total} aplicado${total > 1 ? 's' : ''}` : '';
  $('#clearAll').disabled = !activeCount(f);
  $('#sideN').textContent = nf(filtered().length, 0);
  ['perFrom', 'perTo'].forEach(k => { const el = $('#' + k); if (el && el !== document.activeElement) el.value = f[k]; });
  ['pos', 'favs', 'prop'].forEach(k => { const el = $({ pos: '#fpos', favs: '#ffav', prop: '#fprop' }[k]); if (el) el.checked = f[k]; });
}

// menus rapidos da linha de filtros: mesmo estado da gaveta
function quickMenu(kind) {
  const f = S.filters;
  if (kind === 'per') return `<div class="menu-h">Período do backtest</div><div class="pad">
    <div class="date-rng"><label><span>Começa a partir de</span><input type="date" data-qd="perFrom" value="${esc(f.perFrom)}"></label><label><span>Termina até</span><input type="date" data-qd="perTo" value="${esc(f.perTo)}"></label></div>
    <div class="sublabel">Períodos existentes</div><div class="checklist" id="qPer">${facetList('per', PERIODS, perLabel)}</div></div>
    <div class="menu-f"><button class="link-btn" data-qclear="per">Limpar período</button></div>`;
  return `<div class="menu-h">Timeframe</div><div class="pad"><div class="opt-grid c3" id="qTf">${facetChips('tf', TFS)}</div></div>
    <div class="menu-h">Horário de marcação (Brasília)</div><div class="pad"><div class="opt-grid c3" id="qHb">${facetChips('hb', HOURS)}</div></div>
    <div class="menu-h">Take (alvo ÷ risco)</div><div class="pad"><div class="opt-grid c3" id="qTake">${facetChips('take', TAKES, v => takeTxt(v))}</div></div>
    <div class="menu-f"><button class="link-btn" data-qclear="tf">Limpar timeframe, horário e take</button></div>`;
}
function refreshQuick() {
  const f = S.filters;
  if ($('#qPer')) $('#qPer').innerHTML = facetList('per', PERIODS, perLabel);
  if ($('#qTf')) $('#qTf').innerHTML = facetChips('tf', TFS);
  if ($('#qHb')) $('#qHb').innerHTML = facetChips('hb', HOURS);
  if ($('#qTake')) $('#qTake').innerHTML = facetChips('take', TAKES, v => takeTxt(v));
  const nb = (id, n) => { const b = $(id); if (!b) return; $('.qb', b).textContent = n || ''; b.classList.toggle('on', !!n); };
  nb('#perBtn', f.per.length + (f.perFrom ? 1 : 0) + (f.perTo ? 1 : 0));
  nb('#tfBtn', f.tf.length + f.hb.length + f.take.length);
}

function setSide(show) {
  $('#side').classList.toggle('open', show);
  $('#sideScrim').classList.toggle('open', show);
  document.body.classList.toggle('lock', show);
  if (show) { closeMenus(); refreshFacets(); setTimeout(() => $('#closeSide')?.focus(), 60); }
  updateSideBtn();
}
const sideVisible = () => $('#side').classList.contains('open');
function updateSideBtn() {
  const b = $('#sideBtn'); if (!b) return;
  const n = activeCount(S.filters) - (S.filters.q ? 1 : 0);
  b.setAttribute('aria-expanded', sideVisible());
  b.classList.toggle('on', !!n);
  b.innerHTML = `${ICON.filter}Filtros${n ? `<span class="badge">${n}</span>` : ''}`;
}

function changed(resetPage = true) {
  if (resetPage) { S.page = 0; vtScroll = 0; }
  save();
  if (isLib()) { refreshFacets(); refreshQuick(); renderLibBody(); }
}

// =====================================================================
// biblioteca
// =====================================================================
const sortLabel = k => (M[k] || COLS.find(c => c.k === k || c.sortKey === k) || { l: k }).l;
const sortDefault = k => M[k] ? (M[k].better < 0 ? 1 : -1) : 1;
const SORTABLE = [...COLS.filter(c => !c.nosort).map(c => c.sortKey || c.k)].filter((k, i, a) => a.indexOf(k) === i);
const pop = (id, label, html, cls = '') => `<span class="pop-wrap"><button class="help-btn" type="button" data-pop="${id}" aria-label="${esc(label)}" title="${esc(label)}">?</button><div class="menu pop ${cls}" id="${id}">${html}</div></span>`;
let libMode = 'lib';
const isLib = () => ['lib', 'fav'].includes(route().name);
const libData = () => filtered().sort(compare);
const narrow = () => matchMedia('(max-width:1180px)').matches;
const kpiPrev = {};
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderLib() {
  const fav = libMode === 'fav';
  vtScroll = 0;
  $('#main').classList.add('lib-fill');   // a pagina nao rola; so a lista
  $('#main').innerHTML = `
    <section class="page-head rise">
      <div class="ph-text"><div class="eyebrow">${fav ? 'Sua seleção' : 'Pesquisa e análise'}</div><h1>${fav ? 'Favoritos' : 'Biblioteca de backtests'}</h1><p>${fav ? 'Os testes marcados com estrela, com os mesmos filtros e visualizações.' : 'Explore resultados. Compare configurações. Encontre padrões.'}</p></div>
      <div class="ph-tools">
        <div class="search">${ICON.search}<input id="fq" type="search" placeholder="Buscar estratégia, ativo ou relatório…" value="${esc(S.filters.q)}" autocomplete="off" aria-label="Buscar backtests">
          <span class="search-tools">${pop('searchHelp', 'Como a busca funciona', `<p><b>O que é pesquisado:</b> nome do relatório, ativo, timeframe, horário, dias operados, robô, período e pasta.</p><p><b>Várias palavras:</b> todas precisam aparecer (<code>xauusd brdom</code>).</p><p><b>Excluir:</b> <code>-palavra</code> remove quem tem a palavra.</p><p><b>Atalho:</b> tecla <kbd>/</kbd> foca a busca de qualquer tela.</p>`, 'rt')}<kbd>/</kbd></span></div>
        <div class="menu-wrap"><button class="btn outline lg" id="viewsBtn" aria-haspopup="true">${ICON.bookmark}<span>Visualizações salvas</span>${ICON.chev}</button><div class="menu" id="viewsMenu"></div></div>
      </div>
    </section>
    <section class="kpi-strip rise" id="kpis"></section>
    <section class="filter-row rise">
      <div class="seg view-seg" id="viewSeg" role="tablist" aria-label="Visualização">
        <button data-view="table" role="tab">${ICON.table}<span>Tabela</span></button>
        <button data-view="scatter" role="tab">${ICON.scatter}<span>Dispersão</span></button>
        <button data-view="heat" role="tab">${ICON.heat}<span>Mapa de calor</span></button>
      </div>
      <button class="btn outline" id="sideBtn" aria-controls="side"></button>
      <div class="active-chips" id="activeChips"></div>
      <div class="menu-wrap"><button class="btn outline qbtn" id="perBtn" aria-haspopup="true">${ICON.cal}<span>Período</span><i class="qb"></i>${ICON.chev}</button><div class="menu qf" id="perMenu"></div></div>
      <div class="menu-wrap"><button class="btn outline qbtn" id="tfBtn" aria-haspopup="true">${ICON.tf}<span>Timeframe</span><i class="qb"></i>${ICON.chev}</button><div class="menu qf" id="tfMenu"></div></div>
    </section>
    <section class="lib-grid rise">
      <div class="card results">
        <div class="res-head">
          <h2 id="status"></h2>
          <div class="res-tools">
            <div class="menu-wrap"><button class="tool" id="sortBtn" aria-haspopup="true">${ICON.sort}<span>Ordenar:</span><b id="sortLbl"></b>${ICON.chev}</button><div class="menu" id="sortMenu" style="width:340px"></div></div>
            <div class="menu-wrap" id="colsWrap"><button class="tool" id="colsBtn" aria-haspopup="true">${ICON.cols}<span>Colunas</span></button><div class="menu" id="colsMenu" style="width:340px"></div></div>
            <div class="menu-wrap"><button class="tool" id="expBtn" aria-haspopup="true">${ICON.dl}<span>Exportar</span></button><div class="menu" id="expMenu"></div></div>
          </div>
        </div>
        <div id="libBody"></div>
      </div>
      <aside class="preview" id="preview" aria-label="Backtest selecionado"></aside>
    </section>
    <div class="scrim" id="pvScrim"></div>
    <div class="selbar" id="selbar" hidden></div>`;
  const f = S.filters;
  $('#fq').addEventListener('input', debounce(e => { f.q = e.target.value.trim(); changed(); }, 220));
  $('#viewSeg').onclick = e => { const b = e.target.closest('[data-view]'); if (!b) return; S.view = b.dataset.view; save(); renderLibBody(); };
  $('#sideBtn').onclick = () => setSide(!sideVisible());
  $('#pvScrim').onclick = () => openPv(false);
  // menus: abrir/fechar com o mesmo padrao
  const menu = (btnId, menuId, draw) => {
    const m = $('#' + menuId);
    $('#' + btnId).onclick = e => { e.stopPropagation(); const open = !m.classList.contains('open'); closeMenus(m); if (open) draw(m); m.classList.toggle('open', open); m.parentElement.classList.toggle('is-open', open); };
    return m;
  };
  // ordenar: presets + coluna + direcao num so lugar
  const drawSort = m => {
    const [k, d] = S.sort[0];
    m.innerHTML = `<div class="menu-h">Presets</div>${PRESETS.map(p => `<button class="menu-it ${S.preset === p.id ? 'on' : ''}" data-preset="${p.id}"><span><b>${esc(p.l)}</b><small>${esc(p.rule)}</small></span>${S.preset === p.id ? ICON.check : ''}</button>`).join('')}
      <div class="menu-h">Ordenar por coluna</div>
      <div class="sort-ctl"><select class="sel" id="sortSel" aria-label="Coluna">${SORTABLE.map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${esc(sortLabel(x))}</option>`).join('')}</select>
        <div class="seg" id="sortDir"><button data-dir="-1" class="${d < 0 ? 'on' : ''}">↓ Decrescente</button><button data-dir="1" class="${d > 0 ? 'on' : ''}">↑ Crescente</button></div></div>
      <p class="pop-p">Ordem atual: <b>${esc(S.sort.map(([k, d]) => `${sortLabel(k)} ${d > 0 ? '↑' : '↓'}`).join(' → '))}</b>. Clique num cabeçalho da tabela para ordenar; <b>Shift+clique</b> adiciona desempate.</p>`;
    $('#sortSel', m).onchange = e => { const x = e.target.value; S.sort = [[x, sortDefault(x)]]; S.preset = ''; save(); renderLibBody(); drawSort(m); };
  };
  const sortMenu = menu('sortBtn', 'sortMenu', drawSort);
  sortMenu.onclick = e => {
    e.stopPropagation();
    const p = e.target.closest('[data-preset]'), dr = e.target.closest('[data-dir]');
    if (p) { applyPreset(S.preset === p.dataset.preset ? '' : p.dataset.preset); drawSort(sortMenu); }
    if (dr) { S.sort[0][1] = +dr.dataset.dir; S.preset = ''; save(); renderLibBody(); drawSort(sortMenu); }
  };
  // colunas + densidade
  const drawCols = m => {
    const order = [...S.cols, ...COLS.filter(c => !S.cols.includes(c.k)).map(c => c.k)];
    m.innerHTML = `<div class="menu-h">Densidade</div><div class="pad"><div class="seg" id="densSeg" style="width:100%"><button data-d="normal" class="${S.density !== 'compact' ? 'on' : ''}" style="flex:1;justify-content:center">Padrão</button><button data-d="compact" class="${S.density === 'compact' ? 'on' : ''}" style="flex:1;justify-content:center">Compacta</button></div></div>
      <div class="menu-h">Colunas · ordem de exibição</div>` + order.map(k => { const c = COLS.find(x => x.k === k); const on = S.cols.includes(k); const i = S.cols.indexOf(k);
      return `<div class="col-it"><label title="${esc(M[k]?.tip || '')}"><input type="checkbox" data-col="${k}" ${on ? 'checked' : ''} ${c.fixed ? 'disabled' : ''}><span>${esc(c.long || c.l)}</span></label>${on ? `<button class="mv" data-mv="${k}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Mover ${esc(c.l)} para cima">↑</button><button class="mv" data-mv="${k}|1" ${i === S.cols.length - 1 ? 'disabled' : ''} aria-label="Mover ${esc(c.l)} para baixo">↓</button>` : ''}</div>`; }).join('') +
      `<div class="menu-f"><button class="link-btn" id="colsReset">Restaurar padrão</button></div>`;
  };
  const colsMenu = menu('colsBtn', 'colsMenu', drawCols);
  colsMenu.onclick = e => {
    e.stopPropagation();
    const dn = e.target.closest('[data-d]'); if (dn) { S.density = dn.dataset.d; save(); drawCols(colsMenu); renderLibBody(); return; }
    const mv = e.target.closest('[data-mv]');
    if (mv) { const [k, d] = mv.dataset.mv.split('|'); const i = S.cols.indexOf(k), j = i + +d; if (j < 0 || j >= S.cols.length) return; [S.cols[i], S.cols[j]] = [S.cols[j], S.cols[i]]; save(); drawCols(colsMenu); renderLibBody(); return; }
    if (e.target.id === 'colsReset') { S.cols = [...DEFAULT_COLS]; save(); drawCols(colsMenu); renderLibBody(); }
  };
  colsMenu.onchange = e => {
    const k = e.target.dataset.col; if (!k) return;
    S.cols = e.target.checked ? [...S.cols, k] : S.cols.filter(x => x !== k);
    save(); drawCols(colsMenu); renderLibBody();
  };
  // exportar
  const expMenu = menu('expBtn', 'expMenu', m => {
    m.innerHTML = `<div class="menu-h">Exportar CSV (Excel, separador ;)</div>
      <button class="menu-it" data-exp="f">Resultados filtrados<em>${nf(filtered().length, 0)}</em></button>
      <button class="menu-it" data-exp="s" ${cmp.length ? '' : 'disabled'}>Selecionados<em>${nf(cmp.length, 0)}</em></button>
      <button class="menu-it" data-exp="a">Toda a biblioteca<em>${nf(ROWS.length, 0)}</em></button>`;
  });
  expMenu.onclick = e => {
    const b = e.target.closest('[data-exp]'); if (!b) return; closeMenus();
    if (b.dataset.exp === 'f') exportCsv(libData(), 'filtrados');
    else if (b.dataset.exp === 's') exportCsv(cmp.map(id => BY_ID.get(id)), 'selecionados');
    else exportCsv([...ROWS].sort(compare), 'biblioteca');
  };
  // visualizacoes salvas
  const drawViews = m => {
    m.innerHTML = `<div class="menu-h">Visualizações salvas</div>` +
      (views.length ? views.map((v, i) => `<div class="col-it"><button class="menu-it grow" data-vapply="${i}">${esc(v.name)}<em>${activeCount(v.filters)} filtro${activeCount(v.filters) === 1 ? '' : 's'}</em></button><button class="mv" data-vdel="${i}" aria-label="Excluir visualização ${esc(v.name)}" title="Excluir">×</button></div>`).join('') : '<p class="pop-p">Nenhuma ainda. Salve a combinação atual de filtros, ordenação, colunas e visualização para voltar a ela com um clique.</p>') +
      `<div class="menu-f"><button class="btn primary sm" id="vSave" style="width:100%">Salvar visualização atual…</button></div>`;
  };
  const vMenu = menu('viewsBtn', 'viewsMenu', drawViews);
  vMenu.onclick = e => {
    e.stopPropagation();
    const a = e.target.closest('[data-vapply]'), d = e.target.closest('[data-vdel]');
    if (a) { const v = views[+a.dataset.vapply]; Object.assign(S, JSON.parse(JSON.stringify({ filters: Object.assign(emptyFilters(), v.filters), sort: v.sort, preset: v.preset || '', cols: v.cols, view: v.view }))); closeMenus(); renderSide(); renderLib(); save(); toast(`Visualização “${v.name}” aplicada`); return; }
    if (d) { views.splice(+d.dataset.vdel, 1); store.set('views', views); drawViews(vMenu); return; }
    if (e.target.id === 'vSave') {
      const name = (prompt('Nome da visualização:', '') || '').trim(); if (!name) return;
      views = views.filter(v => v.name !== name);
      views.push({ name, filters: JSON.parse(JSON.stringify(S.filters)), sort: S.sort, preset: S.preset, cols: S.cols, view: S.view });
      store.set('views', views); drawViews(vMenu); toast(`Visualização “${name}” salva`);
    }
  };
  // filtros rapidos
  for (const k of ['per', 'tf']) {
    const m = menu(k + 'Btn', k + 'Menu', mm => { mm.innerHTML = quickMenu(k); });
    m.onclick = e => {
      e.stopPropagation();
      const chip = e.target.closest('button[data-facet]'); if (chip) { toggleFacet(chip.dataset.facet, chip.dataset.v); return; }
      const c = e.target.closest('[data-qclear]');
      if (c) { if (c.dataset.qclear === 'per') { f.per = []; f.perFrom = ''; f.perTo = ''; } else { f.tf = []; f.hb = []; f.take = []; } m.innerHTML = quickMenu(k); changed(); }
    };
    m.onchange = e => {
      const t = e.target;
      if (t.matches('input[type=checkbox][data-facet]')) toggleFacet(t.dataset.facet, t.dataset.v);
      if (t.dataset.qd) { S.filters[t.dataset.qd] = t.value; changed(); }
    };
  }
  $('#activeChips').onclick = e => {
    if (e.target.closest('#chipsClear')) { clearFilters(); return; }
    const b = e.target.closest('[data-unset]'); if (!b) return;
    const [g, v] = b.dataset.unset.split('|'); const f = S.filters;
    if (g === 'q') { f.q = ''; $('#fq').value = ''; } else if (g === 'r') delete f.ranges[v]; else if (g === 'p') delete f.params[v];
    else if (['pos', 'favs', 'prop'].includes(g)) f[g] = false; else if (g === 'perFrom' || g === 'perTo') f[g] = ''; else f[g] = f[g].filter(x => x !== v);
    renderSide(); changed();
  };
  $('#selbar').onclick = e => {
    const b = e.target.closest('[data-sel]'); if (!b) return;
    if (b.dataset.sel === 'clear') { cmp = []; store.set('cmp', cmp); updateCmpBadge(); renderLibBody(); renderPreview(true); }
    if (b.dataset.sel === 'exp') exportCsv(cmp.map(id => BY_ID.get(id)), 'selecionados');
  };
  $('#preview').onclick = e => {
    const id = S.focus;
    if (e.target.closest('#pvClose')) { openPv(false); return; }
    const fv = e.target.closest('[data-fav]'); if (fv) { toggleFav(id); syncRow(id); renderPreview(true); return; }
    const mb = e.target.closest('[data-menu]'); if (mb) { e.stopPropagation(); openRowMenu(mb); return; }
    if (e.target.closest('#pvCmp')) { if (toggleCmp(id) !== false) { syncRow(id); renderSelbar(); renderPreview(true); } }
  };
  refreshQuick();
  renderLibBody();
}
function closeMenus(except) {
  $$('.menu.open').forEach(m => { if (m !== except) { m.classList.remove('open'); m.parentElement?.classList.remove('is-open'); } });
  $$('[data-pop][aria-expanded="true"]').forEach(b => b.nextElementSibling !== except && b.setAttribute('aria-expanded', 'false'));
}
// popovers de ajuda (botao "?")
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pop]'); if (!b) return;
  e.stopPropagation(); e.preventDefault();
  const p = document.getElementById(b.dataset.pop); const open = !p.classList.contains('open');
  closeMenus(); p.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
}, true);
function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id);
  S.preset = p ? p.id : '';
  if (p) { S.sort = p.sort.map(x => [...x]); if (p.pos) S.filters.pos = true; }
  changed();
}

// numero que "conta" ate o novo valor quando o filtro muda
function tween(el, key, to, fmt) {
  const from = kpiPrev[key] ?? 0; kpiPrev[key] = to;
  if (!isNum(to) || from === to || reduceMotion()) { el.textContent = isNum(to) ? fmt(to) : '—'; return; }
  const t0 = performance.now(), D = 520, tok = el._tw = {};
  const step = now => { if (el._tw !== tok) return; const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  setTimeout(() => { if (el._tw === tok) { el._tw = null; el.textContent = fmt(to); } }, D + 80);   // garante o valor final mesmo sem quadros (aba em segundo plano)
}
function renderKpis(data) {
  const pos = data.filter(r => r.pl > 0);
  const props = data.filter(propPass).length;
  const all = data.length === ROWS.length && libMode === 'lib';
  const k = (ic, tone, l, sub, extra = '') => `<div class="kpi"><span class="kpi-ic ${tone}">${ic}</span><div class="kpi-t"><span class="kpi-l">${l}</span><strong>—</strong><em title="${esc(sub)}">${esc(sub)}</em></div>${extra}</div>`;
  const el = $('#kpis');
  el.innerHTML =
    k(ICON.doc, '', libMode === 'fav' ? 'Favoritos no filtro' : all ? 'Backtests na biblioteca' : 'Backtests no filtro', all ? 'sem filtros aplicados' : `de ${nf(libMode === 'fav' ? favs.size : ROWS.length, 0)} ${libMode === 'fav' ? 'favoritos' : 'relatórios'}`) +
    k(ICON.bars, 'pos', 'Testes lucrativos', `${nf(pos.length, 0)} resultados positivos`) +
    k(ICON.pie, '', 'Profit Factor mediano', `DD equity do pico mediano ${pct(median(data.map(r => r.dde)))}`) +
    k(ICON.target, 'gold', 'Dentro do critério prop', `meta ${nf(PROP.target, 0)}% · diária ${nf(PROP.daily, 0)}% · total ${nf(PROP.total, 0)}%`, `<div class="kpi-act"><button class="link-btn" data-open-prop>Ver critério ${ICON.arrow}</button></div>`);
  const st = $$('strong', el);
  tween(st[0], 'n', data.length, v => nf(Math.round(v), 0));
  tween(st[1], 'pos', data.length ? pos.length / data.length * 100 : null, v => pct(v, 0));
  tween(st[2], 'pf', median(data.map(r => r.pf)), v => nf(v));
  tween(st[3], 'prop', props, v => nf(Math.round(v), 0));
}

function renderActiveChips() {
  const f = S.filters, out = [];
  const chip = (label, val, key) => out.push(`<span class="fchip">${label ? `<span>${esc(label)}</span>` : ''}${esc(val)}<button class="x" data-unset="${esc(key)}" aria-label="Remover filtro ${esc(label)} ${esc(val)}">×</button></span>`);
  if (f.q) chip('Busca', `“${f.q}”`, 'q|');
  f.a.forEach(v => chip('', v, 'a|' + v)); f.tf.forEach(v => chip('', v, 'tf|' + v)); f.hb.forEach(v => chip('', v + ' Brasília', 'hb|' + v)); f.days.forEach(v => chip('Opera', v, 'days|' + v));
  f.take.forEach(v => chip('', takeTxt(v), 'take|' + v)); f.pts.forEach(v => chip('Canal', ptsTxt(+v), 'pts|' + v));
  f.per.forEach(v => chip('', perLabel(v), 'per|' + v));
  if (f.perFrom) chip('Desde', fmtDate(f.perFrom.replace(/-/g, '.')), 'perFrom|'); if (f.perTo) chip('Até', fmtDate(f.perTo.replace(/-/g, '.')), 'perTo|');
  for (const k in f.ranges) { const [a, b] = f.ranges[k]; const fm = x => String(x).replace('.', ','); chip(M[k].h || M[k].l, isNum(a) && isNum(b) ? `${fm(a)} a ${fm(b)}` : isNum(a) ? `≥ ${fm(a)}` : `≤ ${fm(b)}`, 'r|' + k); }
  for (const k in f.params) if (f.params[k].length) chip(PDEF[k] ? PDEF[k][1] : k, f.params[k].map(v => plainValue(PDEF[k] ? PDEF[k][2] : 'raw', v)).join(', '), 'p|' + k);
  if (f.pos) chip('', 'Só lucrativos', 'pos|'); if (f.favs) chip('', 'Só favoritos', 'favs|'); if (f.prop) chip('', 'Aprovados prop', 'prop|');
  const el = $('#activeChips');
  el.innerHTML = out.length ? out.join('') + (out.length > 1 ? '<button class="link-btn" id="chipsClear">Limpar tudo</button>' : '') : '';
  el.hidden = !out.length;
  updateSideBtn();
}

function renderSortControls() {
  const [k, d] = S.sort[0];
  const p = PRESETS.find(x => x.id === S.preset);
  $('#sortLbl').textContent = p ? p.l : `${M[k]?.h || sortLabel(k)} ${d > 0 ? '↑' : '↓'}`;
  $('#sortBtn').title = p ? p.rule : 'Ordem: ' + S.sort.map(([k, d]) => `${sortLabel(k)} ${d > 0 ? '↑' : '↓'}`).join(' → ');
}

function renderSelbar() {
  const bar = $('#selbar'); if (!bar) return;
  bar.hidden = !cmp.length;
  if (!cmp.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = `<div class="selbar-in"><span class="sel-n">${cmp.length}</span><span><b>selecionado${cmp.length > 1 ? 's' : ''}</b> <span class="muted">· até 8</span></span><span class="spacer"></span>
    <button class="btn sm" data-sel="clear">Limpar</button><button class="btn sm" data-sel="exp">${ICON.dl}Exportar</button><a class="btn sm primary" href="#/comparar">Comparar${cmp.length > 1 ? ` ${cmp.length}` : ''}</a></div>`;
}

function renderLibBody() {
  disposeCharts();
  const data = libData();
  renderKpis(data); renderActiveChips(); renderSortControls(); renderSelbar(); refreshQuick();
  $$('#viewSeg button').forEach(b => { const on = b.dataset.view === S.view; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $('#colsWrap').hidden = S.view !== 'table';
  $('#status').innerHTML = `<b>${nf(data.length, 0)}</b> resultado${data.length === 1 ? '' : 's'}`;
  const body = $('#libBody');
  if (!data.some(r => r.id === S.focus)) S.focus = data[0]?.id || null;
  renderPreview();
  if (!ROWS.length) { body.innerHTML = `<div class="empty"><h3>A biblioteca está vazia</h3>Nenhum relatório foi encontrado no índice. Rode <b>Atualizar-Painel.cmd</b> depois de organizar os backtests.</div>`; return; }
  if (!data.length) {
    body.innerHTML = libMode === 'fav' && !favs.size
      ? `<div class="empty fade"><h3>Nenhum favorito ainda</h3><p>Marque a estrela de um backtest na biblioteca para guardá-lo aqui.</p><a class="btn primary" href="#/">Ir para a biblioteca</a></div>`
      : `<div class="empty fade"><h3>Nenhum backtest com esses filtros</h3><p>Remova algum filtro ou limpe todos de uma vez.</p><button class="btn primary" id="emptyClear">Limpar filtros</button></div>`;
    const ec = $('#emptyClear'); if (ec) ec.onclick = clearFilters;
    return;
  }
  if (S.view === 'scatter') return renderScatter(body, data);
  if (S.view === 'heat') return renderHeat(body, data);
  renderTable(body, data);
}

// periodo curto: "Jan – Out 2026" ou "Set 2025 – Ago 2026"
const perShort = r => {
  const p = s => { const [y, m] = String(s || '').split('.'); return { y, m: MES[+m - 1] || '?' }; };
  if (!r.from || !r.to) return perLabel(r.perKey);
  const a = p(r.from), b = p(r.to);
  return a.y === b.y ? `${a.m} – ${b.m} ${b.y}` : `${a.m} ${a.y} – ${b.m} ${b.y}`;
};
const riskTxt = v => isNum(v) ? String(Math.round(v * 100) / 100).replace('.', ',') + '%' : '—';

// pontos do canal + take (e o take da virada quando e diferente)
const cfgLine = r => (r.pts == null && r.take == null) ? '' : `<div class="cfg2">${r.pts != null ? `<span class="tag pts" title="Tamanho mínimo do canal">${ptsTxt(r.pts)}</span>` : ''}${r.take != null ? `<span class="tag take" title="${esc(takeTip(r))}">${takeTxt(r.take)}${r.takeRev != null && r.takeRev !== r.take ? ` <i>· virada ${String(r.takeRev).replace('.', ',')}</i>` : ''}</span>` : ''}</div>`;
function cell(c, r, sp) {
  const v = r[c.k];
  switch (c.k) {
    case 'name': return `<td class="c-name"><a class="tname ${r.dnEmpty ? 'noname' : ''}" href="#/t/${r.id}" title="${esc(r.dn)} — relatório: ${esc(r.name)}">${esc(r.dn)}</a><div class="tmeta" title="${esc([r.days, perLabel(r.perKey)].filter(Boolean).join(' · '))}">${[perShort(r), isNum(r.risk) ? 'risco ' + riskTxt(r.risk) : ''].filter(Boolean).map(esc).join('<i>•</i>')}</div></td>`;
    case 'spark': return `<td>${sparkSvg(r.spark, sp[0], sp[1])}</td>`;
    case 'cfg': return `<td class="c-cfg"><div><span class="asset">${esc(r.a)}</span><span class="tag">${esc(r.tf)}</span>${r.hb ? `<span class="tag">${esc(r.hb)}</span>` : ''}</div>${cfgLine(r)}</td>`;
    case 'pts': return `<td class="n">${r.pts != null ? nf(r.pts, 0) : '—'}</td>`;
    case 'take': return `<td class="n" title="${esc(takeTip(r))}">${r.take != null ? nf(r.take, r.take % 1 ? 1 : 0) : '—'}</td>`;
    case 'perKey': return `<td class="ink2">${esc(perLabel(v))}</td>`;
  }
  if (M[c.k]) return `<td class="n ${M[c.k].c ? cls(v) : ''}">${M[c.k].f(v)}</td>`;
  return `<td class="ink2">${esc(v ?? '—')}</td>`;
}
// ---------- lista virtual: so as linhas visiveis (+ margem) existem no DOM ----------
let VT = null, vtScroll = 0, vtRaf = 0;
const VT_OVER = 8;
function renderTable(body, data) {
  const cols = S.cols.map(k => COLS.find(c => c.k === k)).filter(Boolean);
  let lo = 0, hi = 0;   // escala comum das curvas para toda a lista (laco: evita spread em arrays grandes)
  for (const r of data) if (r.spark) for (const v of r.spark) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const sp = [lo, hi];
  const showRank = !!S.preset;
  const sortMark = k => { const i = S.sort.findIndex(s => s[0] === k); if (i < 0) return ''; return `<span class="ar">${S.sort[i][1] > 0 ? '↑' : '↓'}${S.sort.length > 1 ? `<sup>${i + 1}</sup>` : ''}</span>`; };
  const head = c => {
    const sk = c.nosort ? '' : (c.sortKey || c.k);
    const tip = c.k === 'spark' ? `Saldo em % do capital inicial. Mesma escala vertical em todas as linhas da lista (de ${sgn(sp[0], 0, '%')} a ${sgn(sp[1], 0, '%')}), então alturas são comparáveis.` : (M[c.k] ? M[c.k].long + (M[c.k].tip ? ' — ' + M[c.k].tip : '') : '');
    const lbl = c.k === 'name' ? 'Backtest' : (M[c.k]?.h || c.l);
    return `<th class="${sk ? 's' : ''} ${c.n ? 'n' : ''} ${c.k === 'spark' ? 'th-spark' : ''}" data-sort="${sk}" ${sk ? `aria-sort="${S.sort[0][0] === sk ? (S.sort[0][1] > 0 ? 'ascending' : 'descending') : 'none'}"` : ''} title="${esc(tip)}${tip && sk ? ' · ' : ''}${sk ? 'Clique para ordenar' : ''}">${esc(lbl)}${sortMark(sk)}</th>`;
  };
  const fav = S.filters.favs, nSel = cmp.length;
  body.innerHTML = `<div class="fade vt"><div class="tbl-wrap" id="vtWrap" tabindex="-1"><table class="grid lib ${S.density === 'compact' ? 'compact' : ''}">
    <thead><tr><th class="ctl"><label class="ctl-ck" title="${nSel ? 'Limpar a seleção' : 'Selecionar os 8 primeiros da lista para comparar'}"><input type="checkbox" id="ckAll" aria-label="${nSel ? 'Limpar a seleção' : 'Selecionar os 8 primeiros'}"></label><button class="star th ${fav ? 'on' : ''}" id="favOnly" aria-pressed="${fav}" title="${fav ? 'Mostrando só favoritos — clique para mostrar todos' : 'Mostrar só favoritos'}">${ICON.star}</button></th>${showRank ? '<th class="n rank-h" title="Posição no preset ativo">#</th>' : ''}${cols.map(head).join('')}<th class="act"><span class="sr">Ações</span></th></tr></thead>
    <tbody id="vtBody"></tbody>
  </table></div>
  <div class="vt-foot"><span id="vtRange"></span><span class="muted">Role a lista · <kbd>↑</kbd> <kbd>↓</kbd> navegam · <kbd>Enter</kbd> abre</span></div></div>`;
  VT = { data, cols, sp, showRank, rh: S.density === 'compact' ? 62 : 74, start: -1, end: -1, wrap: $('#vtWrap'), body: $('#vtBody'), ncol: cols.length + 2 + (showRank ? 1 : 0) };
  const ckAll = $('#ckAll'); ckAll.indeterminate = nSel > 0;
  ckAll.onchange = () => {
    if (nSel) cmp = [];
    else { cmp = data.slice(0, 8).map(r => r.id); if (data.length > 8) toast('Os 8 primeiros da lista foram selecionados (máximo da comparação)'); }
    store.set('cmp', cmp); updateCmpBadge(); renderLibBody(); renderPreview(true);
  };
  $('#favOnly').onclick = () => { S.filters.favs = !S.filters.favs; changed(); };
  $('thead', body).onclick = e => {
    const th = e.target.closest('th[data-sort]'); if (!th || !th.dataset.sort) return;
    const k = th.dataset.sort, def = sortDefault(k);
    const i = S.sort.findIndex(s => s[0] === k);
    if (e.shiftKey) { if (i >= 0) S.sort[i][1] *= -1; else S.sort.push([k, def]); }
    else if (i === 0) S.sort[0][1] *= -1;
    else S.sort = [[k, def]];
    S.preset = ''; vtScroll = 0; save(); renderLibBody();
  };
  const tb = VT.body;
  tb.onclick = e => {
    const cb = e.target.closest('[data-cmp]');
    if (cb) { if (toggleCmp(cb.dataset.cmp, true) === false) cb.checked = false; syncRow(cb.dataset.cmp); renderSelbar(); const ca = $('#ckAll'); if (ca) ca.indeterminate = cmp.length > 0; if (cb.dataset.cmp === S.focus) renderPreview(true); return; }
    if (e.target.closest('.ctl-ck')) return;
    const fv = e.target.closest('[data-fav]'); if (fv) { toggleFav(fv.dataset.fav); syncRow(fv.dataset.fav); fv.classList.add('bump'); if (fv.dataset.fav === S.focus) renderPreview(true); return; }
    const mb = e.target.closest('[data-menu]'); if (mb) { e.stopPropagation(); openRowMenu(mb); return; }
    if (e.target.closest('a')) return;
    const tr = e.target.closest('tr[data-id]'); if (tr) setFocus(tr.dataset.id, true);
  };
  tb.ondblclick = e => { if (e.target.closest('td.ctl, td.act, a')) return; const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/t/' + tr.dataset.id; };
  VT.wrap.onscroll = () => {
    vtScroll = VT.wrap.scrollTop;
    const rm = $('#rowMenu'); if (rm) rm.classList.remove('open');
    if (!vtRaf) vtRaf = requestAnimationFrame(() => { vtRaf = 0; vtDraw(); });
  };
  VT.wrap.scrollTop = vtScroll;
  vtDraw(true);
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => vtDraw(true));   // fonte carregou: remede
}
function vtRow(r, i) {
  const v = VT, sel = cmp.includes(r.id), fv = favs.has(r.id);
  return `<tr data-id="${r.id}" class="${sel ? 'picked' : ''} ${r.id === S.focus ? 'focus' : ''}">
    <td class="ctl"><label class="ctl-ck" title="Selecionar para comparar"><input type="checkbox" class="cmp" data-cmp="${r.id}" ${sel ? 'checked' : ''} aria-label="Selecionar ${esc(r.dn)} para comparar"></label><button class="star ${fv ? 'on' : ''}" data-fav="${r.id}" aria-pressed="${fv}" aria-label="${fv ? 'Remover dos favoritos' : 'Favoritar'}" title="${fv ? 'Remover dos favoritos' : 'Favoritar'}">${ICON.star}</button></td>
    ${v.showRank ? `<td class="n rank">${i + 1}</td>` : ''}${v.cols.map(c => cell(c, r, v.sp)).join('')}
    <td class="act"><button class="dots" data-menu="${r.id}" aria-label="Ações de ${esc(r.dn)}" aria-haspopup="true">${ICON.dots}</button></td></tr>`;
}
function vtDraw(force) {
  const v = VT; if (!v || !v.wrap.isConnected) return;
  const n = v.data.length, headH = v.wrap.querySelector('thead').offsetHeight;
  const top = Math.max(0, v.wrap.scrollTop - headH), h = v.wrap.clientHeight;
  const start = Math.max(0, Math.floor(top / v.rh) - VT_OVER);
  const end = Math.min(n, Math.floor(top / v.rh) + Math.ceil(h / v.rh) + VT_OVER);
  if (force || start !== v.start || end !== v.end) {
    v.start = start; v.end = end;
    const pad = px => px > 0 ? `<tr class="vpad" aria-hidden="true"><td colspan="${v.ncol}" style="height:${px}px"></td></tr>` : '';
    let html = pad(start * v.rh);
    for (let i = start; i < end; i++) html += vtRow(v.data[i], i);
    v.body.innerHTML = html + pad((n - end) * v.rh);
    // mede a altura media real das linhas desenhadas (a fonte pode carregar depois) e corrige o calculo
    const rows = v.body.querySelectorAll('tr[data-id]');
    if (rows.length) {
      const rh = (rows[rows.length - 1].getBoundingClientRect().bottom - rows[0].getBoundingClientRect().top) / rows.length;
      if (rh > 0 && Math.abs(rh - v.rh) > .25 && (v.fix = (v.fix || 0) + 1) < 4) { v.rh = rh; return vtDraw(true); }
      v.fix = 0;
    }
  }
  // linhas comecam abaixo do cabecalho fixo: y(i) = headH + i*rh; area visivel = [scrollTop + headH, scrollTop + h]
  const st = v.wrap.scrollTop, first = Math.min(n, Math.floor(st / v.rh) + 1), last = Math.min(n, Math.ceil((st + h - headH) / v.rh));
  const el = $('#vtRange'); if (el) el.innerHTML = n ? `Linhas <b>${nf(first, 0)}–${nf(Math.max(first, last), 0)}</b> de ${nf(n, 0)}` : '';
}
// rola a lista ate a linha (teclado, foco vindo da dispersao)
function vtReveal(i) {
  const v = VT; if (!v || !v.wrap.isConnected) return;
  const headH = v.wrap.querySelector('thead').offsetHeight, y = i * v.rh, view = v.wrap.clientHeight - headH;
  if (y < v.wrap.scrollTop) v.wrap.scrollTop = y;
  else if (y + v.rh > v.wrap.scrollTop + view) v.wrap.scrollTop = y + v.rh - view;
  vtDraw();
}
// atualiza uma linha sem redesenhar a tabela (estrela, selecao)
function syncRow(id) {
  const tr = $(`#libBody tr[data-id="${id}"]`); if (!tr) return;
  const sel = cmp.includes(id), fv = favs.has(id);
  tr.classList.toggle('picked', sel);
  const cb = $('[data-cmp]', tr); if (cb) cb.checked = sel;
  const st = $('[data-fav]', tr); if (st) { st.classList.toggle('on', fv); st.setAttribute('aria-pressed', fv); st.title = fv ? 'Remover dos favoritos' : 'Favoritar'; }
}

// ---------- prévia do backtest em foco ----------
let pvShown = null, pvChart = null;
function disposePv() { if (pvChart) { pvChart.dispose(); pvChart = null; } }
function openPv(show) {
  const p = $('#preview'); if (!p) return;
  p.classList.toggle('open', show); $('#pvScrim')?.classList.toggle('open', show);
  document.body.classList.toggle('lock', show && narrow());
  if (show && pvChart) setTimeout(() => pvChart && pvChart.resize(), 340);
}
function setFocus(id, open) {
  S.focus = id;
  $$('#libBody tr[data-id]').forEach(tr => tr.classList.toggle('focus', tr.dataset.id === id));
  renderPreview();
  if (open && narrow()) openPv(true);
}
function renderPreview(force) {
  const el = $('#preview'); if (!el) return;
  const r = BY_ID.get(S.focus);
  if (!r) { pvShown = null; disposePv(); el.innerHTML = `<div class="pv-empty fade">${ICON.cursor}<h3>Nenhum backtest selecionado</h3><p>Clique numa linha para ver o resumo aqui.</p></div>`; return; }
  if (pvShown === r.id && !force) return;
  const same = pvShown === r.id;
  pvShown = r.id;
  const fv = favs.has(r.id), inCmp = cmp.includes(r.id);
  const stat = (ic, l, v, tip = '') => `<div class="pv-stat" ${tip ? `title="${esc(tip)}"` : ''}>${ic}<div><span>${l}</span><b>${v}</b></div></div>`;
  const keepChart = same && pvChart;
  const chartEl = keepChart ? $('#pvChart') : null;
  el.innerHTML = `<div class="${same ? '' : 'pv-in'}">
    <div class="pv-top"><span class="eyebrow">Backtest selecionado</span><button class="x pv-close" id="pvClose" aria-label="Fechar prévia">×</button></div>
    <div class="pv-head"><h2 title="Relatório: ${esc(r.name)}">${esc(r.dn)}</h2><button class="star ${fv ? 'on' : ''}" data-fav="${r.id}" aria-pressed="${fv}" title="${fv ? 'Remover dos favoritos' : 'Favoritar'}">${ICON.star}</button><button class="dots" data-menu="${r.id}" aria-label="Mais ações" aria-haspopup="true">${ICON.dots}</button></div>
    <div class="pv-cfg">${esc(r.a)}<i>/</i>${esc(r.tf)}${r.hb ? `<i>/</i>${esc(r.hb)} Brasília` : ''}</div>
    ${cfgLine(r)}
    <div class="pv-ret ${cls(r.plp)}">${sgn(r.plp, 2, '%')}</div>
    <div class="pv-sub">Retorno no período · ${money(r.pl)} sobre ${money(r.cap, 0)}</div>
    <div class="pv-ch"><h3>Curva de capital</h3><a class="icon-btn sm" href="#/t/${r.id}" title="Abrir análise completa" aria-label="Abrir análise completa">${ICON.expand}</a></div>
    <div class="pv-chart" id="pvChart">${keepChart ? '' : '<div class="skel"></div>'}</div>
    <div class="pv-stats">
      ${stat(ICON.shield, 'DD capital inicial', pct(r.ddb), M.ddb.tip)}
      ${stat(ICON.bars, 'Profit Factor', nf(r.pf), M.pf.tip)}
      ${stat(ICON.percent, 'Risco por operação', riskTxt(r.risk))}
      ${stat(ICON.cal, 'Período', esc(perShort(r)), perLabel(r.perKey))}
    </div>
    <div class="pv-acts">
      <a class="btn primary block" href="#/t/${r.id}">${ICON.ext}Abrir análise completa</a>
      <button class="btn outline block ${inCmp ? 'on' : ''}" id="pvCmp">${inCmp ? `${ICON.check}Na comparação — remover` : `${ICON.bars}Adicionar à comparação`}</button>
    </div></div>`;
  if (keepChart) { $('#pvChart').replaceWith(chartEl); return; }
  disposePv();
  const id = r.id;
  loadDetail(id).then(d => { if (pvShown === id) drawPvChart(r, analyze(r, d)); }).catch(() => { if (pvShown === id) drawPvChart(r, null); });
}
function drawPvChart(r, A) {
  const el = $('#pvChart'); if (!el) return;
  el.innerHTML = '';
  disposePv();
  const c = pal(), col = (r.plp ?? 0) >= 0 ? c.pos : c.neg;
  const data = A ? A.balance.map(([t, b]) => [t, +((b - A.cap) / A.cap * 100).toFixed(3)]) : (r.spark || []).map((v, i) => [i, v]);
  pvChart = echarts.init(el, null, { renderer: 'canvas' });
  pvChart.setOption(base({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 6, right: 14, top: 12, bottom: 4, containLabel: true },
    tooltip: Object.assign(base().tooltip, { formatter: ps => { const p = ps[0]; return `${A ? dt(p.value[0] / 1000) : 'Ponto ' + (p.value[0] + 1)}<br>Retorno <b style="color:${p.value[1] >= 0 ? c.pos : c.neg}">${sgn(p.value[1], 2, '%')}</b>`; } }),
    xAxis: A ? axis('time', { axisLine: { show: false }, splitLine: { show: false } }) : axis('value', { show: false, max: 'dataMax' }),
    yAxis: axis('value', { splitNumber: 4, axisLabel: { color: c.muted, formatter: v => nf(v, 0) + '%' } }),
    series: [{ type: 'line', data, showSymbol: false, lineStyle: { width: 2, color: col }, itemStyle: { color: col },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: col + '40' }, { offset: 1, color: col + '00' }]) },
      markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: c.line2, type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] } }],
  }));
}

// menu de acoes da linha (um unico elemento flutuante)
function openRowMenu(btn) {
  const id = btn.dataset.menu, r = BY_ID.get(id);
  let m = $('#rowMenu');
  if (!m) { m = document.createElement('div'); m.id = 'rowMenu'; m.className = 'menu floating'; document.body.appendChild(m); m.onclick = e => e.stopPropagation(); }
  if (m.classList.contains('open') && m.dataset.id === id) { m.classList.remove('open'); return; }
  closeMenus();
  m.dataset.id = id;
  m.innerHTML = `<div class="menu-h" title="${esc(r.name)}">${esc(r.a)} ${esc(r.tf)} · ${esc(r.dn)}</div>
    <a class="menu-it" href="#/t/${id}">Abrir análise</a>
    <button class="menu-it" data-ra="cmp">${cmp.includes(id) ? 'Remover da comparação' : 'Adicionar à comparação'}</button>
    <button class="menu-it" data-ra="fav">${favs.has(id) ? 'Desfavoritar' : 'Favoritar'}</button>
    <button class="menu-it" data-ra="copy">Copiar nome original</button>
    <a class="menu-it" href="${encodePath(r.report)}" target="_blank" rel="noopener">Abrir relatório MT5 original</a>
    <a class="menu-it" href="${encodePath(r.folder)}/" target="_blank" rel="noopener">Abrir pasta do teste</a>`;
  m.classList.add('open');
  const b = btn.getBoundingClientRect(), mw = 250;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
  const h = m.offsetHeight; m.style.top = (b.bottom + 4 + h > innerHeight ? b.top - h - 4 : b.bottom + 4) + 'px';
  m.onclick = e => {
    e.stopPropagation();
    const a = e.target.closest('[data-ra]'); if (!a) { if (e.target.closest('a')) m.classList.remove('open'); return; }
    m.classList.remove('open');
    if (a.dataset.ra === 'cmp') { toggleCmp(id); renderLibBody(); renderPreview(true); }
    if (a.dataset.ra === 'fav') { toggleFav(id); renderLibBody(); renderPreview(true); }
    if (a.dataset.ra === 'copy') copyText(r.name);
  };
}
function copyText(t, msg = 'Nome copiado') {
  const done = () => toast(msg);
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fallback());
  else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch { toast('Não foi possível copiar'); } ta.remove(); }
}

function renderScatter(body, data) {
  const opts = k => Object.keys(M).map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${esc(M[x].l)}</option>`).join('');
  body.innerHTML = `<div class="fade"><div class="card-h"><div><h3>Dispersão: ${esc(M[S.scX].l)} × ${esc(M[S.scY].l)}</h3><div class="sub">Mesmos ${nf(data.length, 0)} backtests da busca atual · clique num ponto para ver o resumo, duplo clique para abrir · role para dar zoom</div></div>
    <div class="axis-pick"><label><span>Eixo X</span><select class="sel" id="scX">${opts(S.scX)}</select></label><label><span>Eixo Y</span><select class="sel" id="scY">${opts(S.scY)}</select></label></div></div>
    <div class="card-b"><div class="chart" id="scChart" style="height:clamp(420px,calc(100vh - 420px),640px)"></div></div></div>`;
  $('#scX').onchange = e => { S.scX = e.target.value; save(); renderLibBody(); };
  $('#scY').onchange = e => { S.scY = e.target.value; save(); renderLibBody(); };
  const c = pal(), X = M[S.scX], Y = M[S.scY];
  const maxTr = Math.max(...data.map(r => r.tr || 0), 1);
  const series = TFS.filter(tf => data.some(r => r.tf === tf)).map(tf => ({
    name: tf, type: 'scatter', large: false,
    symbolSize: d => 6 + 12 * Math.sqrt((d[2] || 0) / maxTr),
    itemStyle: { color: tfColor(tf), opacity: .78, borderColor: c.surface, borderWidth: 1 },
    emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: c.ink, borderWidth: 1.5 } },
    data: data.filter(r => r.tf === tf && isNum(r[S.scX]) && isNum(r[S.scY])).map(r => [r[S.scX], r[S.scY], r.tr, r.id]),
  }));
  const ch = mk($('#scChart'), base({
    legend: { top: 0, right: 0, textStyle: { color: c.ink2, fontSize: 12 }, icon: 'circle', itemWidth: 10 },
    grid: { left: 14, right: 24, top: 36, bottom: 34, containLabel: true },
    tooltip: { trigger: 'item', backgroundColor: c.surface, borderColor: c.line2, textStyle: { color: c.ink, fontSize: 12 }, extraCssText: 'border-radius:4px;box-shadow:none;', formatter: p => { const r = BY_ID.get(p.data[3]); return `<b>${esc(r.a)} ${esc(r.tf)} · ${esc(r.dn)}</b><br><span style="color:${c.muted}">${esc(r.hb || '')} · ${esc(perLabel(r.perKey))}</span><br>${X.l}: <b>${X.f(r[S.scX])}</b><br>${Y.l}: <b>${Y.f(r[S.scY])}</b><br>PF ${nf(r.pf)} · ${nf(r.tr, 0)} trades`; } },
    xAxis: axis('value', { name: X.l, nameLocation: 'middle', nameGap: 28, scale: true, splitLine: { show: true, lineStyle: { color: c.line } } }),
    yAxis: axis('value', { name: Y.l, scale: true }),
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    series,
  }));
  ch.on('click', p => { if (p.data) setFocus(p.data[3], true); });
  ch.on('dblclick', p => { if (p.data) location.hash = '#/t/' + p.data[3]; });
}

function renderHeat(body, data) {
  const metrics = {
    best: { l: 'Melhor lucro %', agg: 'maior valor entre os testes da célula', calc: rs => Math.max(...rs.map(r => r.plp).filter(isNum)), f: v => sgn(v, 1, '%'), hi: 1 },
    eff: { l: 'Melhor lucro ÷ DD capital inicial', agg: 'maior valor entre os testes da célula', calc: rs => Math.max(...rs.map(r => r.rdd).filter(isNum)), f: v => nf(v, 1), hi: 1 },
    dd: { l: 'Menor DD capital inicial (lucrativos)', agg: 'menor DD entre os testes lucrativos da célula', calc: rs => { const p = rs.filter(r => r.pl > 0).map(r => r.ddb); return p.length ? Math.min(...p) : null; }, f: v => pct(v), hi: -1 },
    pf: { l: 'Profit Factor mediano', agg: 'mediana dos testes da célula', calc: rs => median(rs.map(r => r.pf)), f: v => nf(v), hi: 1 },
    posr: { l: '% de testes lucrativos', agg: 'proporção dos testes da célula com lucro', calc: rs => rs.filter(r => r.pl > 0).length / rs.length * 100, f: v => pct(v, 0), hi: 1 },
    n: { l: 'Nº de testes', agg: 'contagem', calc: rs => rs.length, f: v => nf(v, 0), hi: 1 },
  };
  const m = metrics[S.heatMetric] || metrics.best;
  const assets = ASSETS.filter(a => data.some(r => r.a === a)), tfs = TFS.filter(t => data.some(r => r.tf === t));
  const cells = {}; let vals = [];
  for (const a of assets) for (const t of tfs) {
    const rs = data.filter(r => r.a === a && r.tf === t);
    const v = rs.length ? m.calc(rs) : null;
    cells[a + '|' + t] = { v: isNum(v) ? v : null, n: rs.length };
    if (isNum(v)) vals.push(v);
  }
  const mn = Math.min(...vals), mx = Math.max(...vals);
  // escala de 3 cores com a mediana no centro (metade das celulas de cada lado)
  const md = median(vals);
  const shade = v => { let k = mx === mn ? 1 : v >= md ? .5 + .5 * (v - md) / ((mx - md) || 1) : .5 - .5 * (md - v) / ((md - mn) || 1); if (m.hi < 0) k = 1 - k; return k; };
  body.innerHTML = `<div class="fade"><div class="card-h"><div><h3>Mapa de calor: ativo × timeframe</h3><div class="sub">Linhas = ativo · colunas = timeframe · valor = ${esc(m.l)} (${esc(m.agg)}) · clique numa célula para filtrar a tabela</div></div>
    <div class="axis-pick"><label><span>Métrica</span><select class="sel" id="heatM">${Object.entries(metrics).map(([k, x]) => `<option value="${k}" ${k === S.heatMetric ? 'selected' : ''}>${x.l}</option>`).join('')}</select></label><div class="legend-seq" title="Centro neutro = mediana das células"><span>pior</span><i></i><span>melhor</span></div></div></div>
    <div class="card-b" style="overflow:auto"><table class="heat"><thead><tr><th></th>${tfs.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>
    ${assets.map(a => `<tr><th class="rowh">${a}</th>${tfs.map(t => {
      const c = cells[a + '|' + t];
      if (!c.n || c.v == null) return `<td class="none">${c.n ? `<small>${c.n} testes</small>` : '—'}</td>`;
      // escala divergente: pior = vermelho, meio = neutro, melhor = verde
      const k = shade(c.v), d = (k - .5) * 2, bg = `color-mix(in srgb, var(${d < 0 ? '--neg' : '--pos'}) ${Math.round(8 + Math.abs(d) * 62)}%, var(--surface-2))`;
      return `<td data-a="${a}" data-tf="${t}" style="background:${bg};color:var(--ink)" title="${a} ${t}: ${m.l} ${m.f(c.v)} · ${c.n} testes"><b>${m.f(c.v)}</b><small>${c.n} testes</small></td>`;
    }).join('')}</tr>`).join('')}
    </tbody></table></div></div>`;
  $('#heatM').onchange = e => { S.heatMetric = e.target.value; save(); renderLibBody(); };
  $('.heat', body).onclick = e => {
    const td = e.target.closest('td[data-a]'); if (!td) return;
    S.filters.a = [td.dataset.a]; S.filters.tf = [td.dataset.tf]; S.view = 'table'; renderSide(); changed();
  };
}

function exportCsv(data, tag) {
  const keys = ['a', 'tf', 'hb', 'pts', 'take', 'tpPct', 'dn', 'name', ...Object.keys(M), 'days', 'from', 'to', 'folder'];
  const lbl = { dn: 'Nome de exibição', name: 'Nome original do relatório', folder: 'Pasta', from: 'Início', to: 'Fim', a: 'Ativo', tf: 'Timeframe', hb: 'Horário', days: 'Dias operados', pts: 'Canal mínimo (pts)', take: 'Take', tpPct: 'TP % do canal' };
  const val = v => isNum(v) ? String(Math.round(v * 10000) / 10000).replace('.', ',') : `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = keys.map(k => `"${lbl[k] || M[k].l}"`).join(';');
  const csv = '﻿' + [head, ...data.map(r => keys.map(k => val(r[k])).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `backtests-${tag}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`${nf(data.length, 0)} backtests exportados`);
}

function toggleFav(id) { favs.has(id) ? favs.delete(id) : favs.add(id); store.set('favs', [...favs]); updateCmpBadge(); toast(favs.has(id) ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); if (libMode === 'fav' && isLib()) renderLibBody(); }
function toggleCmp(id, quiet) {
  const i = cmp.indexOf(id);
  if (i >= 0) cmp.splice(i, 1);
  else { if (cmp.length >= 8) { toast('Máximo de 8 backtests na comparação'); return false; } cmp.push(id); }
  store.set('cmp', cmp); updateCmpBadge();
  if (!quiet) toast(cmp.includes(id) ? `Na comparação (${cmp.length})` : 'Removido da comparação');
  return true;
}
const updateCmpBadge = () => { $('#cmpCount').textContent = cmp.length || ''; $('#favCount').textContent = favs.size || ''; };

// =====================================================================
// carregamento dos detalhes (um .js por relatorio — funciona via file://)
// =====================================================================
const detailCache = new Map(), pending = new Map();
window.BT_DETAIL = (id, d) => { detailCache.set(id, d); const p = pending.get(id); if (p) { p.res(d); pending.delete(id); } };
function loadDetail(id) {
  if (detailCache.has(id)) return Promise.resolve(detailCache.get(id));
  if (pending.has(id)) return pending.get(id).promise;
  let res, rej; const promise = new Promise((a, b) => { res = a; rej = b; });
  pending.set(id, { res, promise });
  const s = document.createElement('script');
  s.src = `painel/dados/r/${id}.js`;
  s.onerror = () => { pending.delete(id); rej(new Error('Arquivo de detalhe não encontrado. Rode Atualizar-Painel.cmd.')); };
  s.onload = () => s.remove();
  document.head.appendChild(s);
  return promise;
}

// Analises a partir dos trades: [abertura, fechamento, dir, vol, pEntrada, pSaida, sl, tp, resultado, saldo, cmtEntrada, cmtSaida]
function analyze(row, d) {
  const cap = row.cap || 10000, T = d.trades;
  const startT = d.deals.length ? d.deals[0][0] : (T[0] ? T[0][0] : 0);
  const balance = [[startT * 1000, cap]];
  for (const x of d.deals) if (x[1] !== 'balance' && x[2] !== 'in' && isNum(x[7])) balance.push([x[0] * 1000, x[7]]);
  let peak = cap; const ddPeak = [], ddBase = [];
  for (const [t, b] of balance) { peak = Math.max(peak, b); ddPeak.push([t, -((peak - b) / peak * 100)]); ddBase.push([t, Math.min(0, (b - cap) / cap * 100)]); }
  // mensal e diario
  const months = new Map(), days = new Map(); let bal = cap;
  for (const t of T) {
    const dd = new Date(t[1] * 1000), mk_ = `${dd.getUTCFullYear()}-${pad(dd.getUTCMonth() + 1)}`, dk = dd.toISOString().slice(0, 10);
    if (!months.has(mk_)) months.set(mk_, { start: bal, pnl: 0, n: 0 });
    if (!days.has(dk)) days.set(dk, { start: bal, pnl: 0, n: 0 });
    months.get(mk_).pnl += t[8]; months.get(mk_).n++; days.get(dk).pnl += t[8]; days.get(dk).n++;
    bal += t[8];
  }
  const entryType = t => /_VR\d*/i.test(t[10]) ? 'Virada de mão' : 'Entrada normal';
  const exitType = t => /^tp/i.test(t[11]) ? 'Take profit' : /^sl/i.test(t[11]) ? 'Stop loss' : /end of test/i.test(t[11]) ? 'Fim do teste' : (t[11] || 'Outro');
  const group = fn => { const g = new Map(); for (const t of T) { const k = fn(t); if (!g.has(k)) g.set(k, []); g.get(k).push(t); } return g; };
  const summary = ts => { const w = ts.filter(t => t[8] > 0); const pnl = ts.reduce((s, t) => s + t[8], 0); return { n: ts.length, win: ts.length ? w.length / ts.length * 100 : 0, pnl, avg: ts.length ? pnl / ts.length : 0 }; };
  // sequencias
  let cw = 0, cl = 0, mw = 0, ml = 0;
  for (const t of T) { if (t[8] > 0) { cw++; cl = 0; } else { cl++; cw = 0; } mw = Math.max(mw, cw); ml = Math.max(ml, cl); }
  return { cap, balance, ddPeak, ddBase, months, days, entryType, exitType, group, summary, maxWin: mw, maxLoss: ml };
}

// =====================================================================
// detalhe da estrategia
// =====================================================================
const TABS = [['geral', 'Visão geral'], ['operacoes', 'Operações'], ['periodos', 'Períodos'], ['risco', 'Risco'], ['config', 'Configuração e arquivos']];
const TAB_ALIAS = { analise: 'operacoes', trades: 'operacoes', params: 'config', stats: 'config', arquivos: 'config' };
let detailTab = 'geral';
const crumb = () => '';
async function renderDetail(id) {
  const row = BY_ID.get(id);
  if (!row) { $('#main').innerHTML = `${crumb()}<div class="card"><div class="empty"><h3>Backtest não encontrado</h3>O índice pode ter sido regenerado desde que este link foi aberto. <a href="#/">Voltar para a biblioteca</a></div></div>`; return; }
  $('#main').innerHTML = `${crumb(row)}<div class="loading"><i class="spin"></i>Lendo relatório…</div>`;
  let d;
  try { d = await loadDetail(id); } catch (e) { $('#main').innerHTML = `${crumb(row)}<div class="card"><div class="empty"><h3>Não foi possível ler este relatório</h3>${esc(e.message)}</div></div>`; return; }
  if (route().id !== id) return;
  const A = analyze(row, d);
  const inCmp = cmp.includes(id);
  $('#main').innerHTML = `
    ${crumb(row)}
    <header class="d-head"><div class="d-id">
      <div class="d-cfg"><span class="asset">${esc(row.a)}</span><span class="tag">${esc(row.tf)}</span>${row.hb ? `<span class="tag">${esc(row.hb)} Brasília</span>` : ''}${cfgLine(row).replace(/^<div class="cfg2">|<\/div>$/g, '')}${row.days ? `<span class="tag">${esc(row.days)}</span>` : ''}${isNum(row.risk) ? `<span class="tag">risco ${nf(row.risk, 2)}% por trade</span>` : ''}</div>
      <h1>${esc(row.dn)}</h1>
      <div class="orig"><span class="muted">Relatório original</span><code title="${esc(row.name)}">${esc(row.name)}</code><button class="btn xs" id="dCopy" title="Copiar nome original">${ICON.copy}Copiar</button></div>
      ${nameNote(row)}
      <div class="meta"><span>${esc(perLabel(row.perKey))}</span><span>${esc(row.ea || '')}</span>${d.meta['Empresa'] ? `<span>${esc(d.meta['Empresa'])}</span>` : ''}<span>Alavancagem ${esc(d.meta['Alavancagem'] || '—')}</span><span>Capital inicial ${money(row.cap, 0)}</span></div>
    </div>
    <div class="d-actions">
      <button class="btn outline ${favs.has(id) ? 'on' : ''}" id="dFav" aria-pressed="${favs.has(id)}">★ ${favs.has(id) ? 'Favorito' : 'Favoritar'}</button>
      <button class="btn ${inCmp ? 'on' : 'primary'}" id="dCmp">${inCmp ? '✓ Na comparação' : '+ Adicionar à comparação'}</button>
      <div class="menu-wrap"><button class="btn outline sq" id="dMore" aria-haspopup="true" aria-label="Mais ações">${ICON.dots}</button><div class="menu" id="dMoreMenu">
        <a class="menu-it" href="${encodePath(row.report)}" target="_blank" rel="noopener">Abrir relatório MT5 original</a>
        <a class="menu-it" href="${encodePath(row.folder)}/" target="_blank" rel="noopener">Abrir pasta do teste</a>
        ${cmp.length ? `<a class="menu-it" href="#/comparar">Ir para a comparação (${cmp.length})</a>` : ''}
      </div></div>
    </div></header>
    <div class="kpis kpis6 rise">
      ${kpi('Lucro líquido', money(row.pl), `${sgn(row.plp, 2, '%')} sobre ${money(row.cap, 0)}`, cls(row.pl))}
      ${kpi('DD capital inicial', pct(row.ddb), `${money(row.ddbv)} abaixo do capital inicial`, '', M.ddb.tip)}
      ${kpi('DD equity do pico', pct(row.dde), `DD de saldo do pico: ${pct(row.ddBalPeak)}`, '', M.dde.tip)}
      ${kpi('Profit Factor', nf(row.pf), `Fator de recuperação ${nf(row.rf)}`)}
      ${kpi('Trades', nf(row.tr, 0), `acerto ${pct(row.winRate, 1)} · ${nf(row.nL, 0)} compras / ${nf(row.nS, 0)} vendas`)}
      ${kpi('Pior dia', sgn(row.worstDay, 2, '%'), `${nf(row.tradingDays, 0)} dias com trade`, cls(row.worstDay), M.worstDay.tip)}
    </div>
    <div class="tabs" id="dTabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${detailTab === k}" class="${detailTab === k ? 'on' : ''}">${l}${k === 'operacoes' ? ` <span class="muted">${T_len(d)}</span>` : ''}</button>`).join('')}</div>
    <div id="dBody"></div>`;
  $('#dCopy').onclick = () => copyText(row.name);
  $('#dFav').onclick = e => { toggleFav(id); const on = favs.has(id); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = '★ ' + (on ? 'Favorito' : 'Favoritar'); };
  $('#dCmp').onclick = e => { if (toggleCmp(id) === false) return; const on = cmp.includes(id); e.currentTarget.classList.toggle('on', on); e.currentTarget.classList.toggle('primary', !on); e.currentTarget.textContent = on ? '✓ Na comparação' : '+ Adicionar à comparação'; };
  $('#dMore').onclick = e => { e.stopPropagation(); const m = $('#dMoreMenu'), open = !m.classList.contains('open'); closeMenus(m); m.classList.toggle('open', open); };
  $('#dTabs').onclick = e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    detailTab = b.dataset.tab; history.replaceState(null, '', `#/t/${id}/${detailTab}`);
    $$('#dTabs button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); renderTab(row, d, A);
  };
  renderTab(row, d, A);
}
const T_len = d => nf(d.trades.length, 0);
// Explica numeros anotados no nome do relatorio (ex.: DD12_60) comparando com as metricas calculadas.
function nameNote(row) {
  const tags = (row.nameTags || []).filter(t => t.k === 'DD' || t.k === 'Lucro');
  if (!tags.length) return '';
  const near = (a, b) => isNum(a) && isNum(b) && Math.abs(a - b) < 0.06;
  const items = tags.map(t => {
    if (t.k === 'Lucro') return near(t.v, row.plp) ? `<b>${esc(t.raw)}</b> = lucro de ${pct(row.plp)}` : `<b>${esc(t.raw)}</b> não bate com o lucro deste relatório (${sgn(row.plp, 2, '%')})`;
    const hit = [['DD equity do pico', row.dde], ['DD capital inicial', row.ddb], ['DD de saldo do pico', row.ddBalPeak]].find(([, v]) => near(t.v, v));
    return hit ? `<b>${esc(t.raw)}</b> = ${hit[0]} (${pct(hit[1])})${hit[0] !== 'DD capital inicial' ? `; a coluna “DD capital inicial” é outra medida (${pct(row.ddb)})` : ''}`
      : `<b>${esc(t.raw)}</b> não corresponde a nenhum drawdown deste relatório (capital inicial ${pct(row.ddb)} · equity do pico ${pct(row.dde)} · saldo do pico ${pct(row.ddBalPeak)}); o valor do nome provavelmente veio de outra execução`;
  });
  return `<div class="name-note">${ICON.info}<span>Números no nome do relatório: ${items.join(' · ')}.</span></div>`;
}
const kpi = (l, v, sub = '', c = '', tip = '') => `<div class="kpi"><span>${l}${tip ? `<i class="hint" title="${esc(tip)}">${ICON.info}</i>` : ''}</span><strong class="${c}">${v}</strong><em title="${esc(sub)}">${esc(sub)}</em></div>`;

function renderTab(row, d, A) {
  disposeCharts();
  const el = $('#dBody'); el.onclick = null;
  ({ geral: tabGeral, operacoes: tabOperacoes, periodos: tabPeriodos, risco: tabRisco, config: tabConfig }[detailTab] || tabGeral)(el, row, d, A);
}

function zoomSlider(c) { return { type: 'slider', height: 22, bottom: 8, borderColor: c.line, backgroundColor: 'transparent', fillerColor: 'rgba(252,213,53,.10)', moveHandleSize: 0, handleSize: '70%', handleStyle: { color: c.accent, borderColor: c.accent }, emphasis: { handleStyle: { color: c.accent, borderColor: c.accent } }, dataBackground: { lineStyle: { color: c.line2 }, areaStyle: { color: c.line } }, textStyle: { color: c.muted } }; }

function tabGeral(el, row, d, A) {
  const kv = (l, v, c = '') => `<div><span>${l}</span><b class="${c}">${v}</b></div>`;
  el.innerHTML = `
    <div class="stack">
      <div class="card"><div class="card-h"><div><h3>Curva de saldo</h3><div class="sub">Saldo após cada operação fechada (o MT5 não exporta a equity intradiária) · arraste a barra inferior ou role para dar zoom</div></div></div><div class="card-b"><div class="chart tall" id="cEq"></div></div></div>
      <div class="grid2">
        <div class="card"><div class="card-h"><h3>Principais resultados</h3></div><div class="card-b"><div class="kv one">
          ${kv('Lucro líquido', `${money(row.pl)} (${sgn(row.plp, 2, '%')})`, cls(row.pl))}
          ${kv('Lucro bruto / prejuízo bruto', `${money(row.gp)} / ${money(row.gl)}`)}
          ${kv('Profit Factor', nf(row.pf))}
          ${kv('Expectativa por trade', money(row.pl / Math.max(1, row.tr)), cls(row.pl))}
          ${kv('Ganho médio / perda média', `${money(row.avgW)} / ${money(row.avgL)}`)}
          ${kv('Taxa de acerto', pct(row.winRate, 1))}
          ${kv('Meses positivos', row.monthsTotal ? `${row.monthsPos} de ${row.monthsTotal}` : '—')}
          ${kv('Pior mês', sgn(row.worstMonth, 2, '%'), cls(row.worstMonth))}
          ${kv('Sharpe (MT5)', nf(row.sharpe))}
          ${kv('Fator de recuperação (MT5)', nf(row.rf))}
        </div></div></div>
        <div class="card"><div class="card-h"><h3>Retorno mensal</h3><span class="sub">% sobre o saldo do início de cada mês</span></div><div class="card-b" style="overflow:auto">${monthsTable(A)}</div></div>
      </div>
    </div>`;
  const c = pal();
  mk($('#cEq'), base({
    grid: { left: 10, right: 18, top: 20, bottom: 50, containLabel: true },
    tooltip: Object.assign(base().tooltip, { formatter: ps => { const p = ps[0]; const v = p.value[1]; return `${dt(p.value[0] / 1000)}<br>Saldo <b>${money(v)}</b> <span style="color:${v >= A.cap ? c.pos : c.neg}">${sgn((v - A.cap) / A.cap * 100, 2, '%')}</span>`; } }),
    xAxis: axis('time'), yAxis: axis('value', { scale: true, axisLabel: { color: c.muted, formatter: moneyAxis } }),
    dataZoom: [{ type: 'inside' }, zoomSlider(c)],
    series: [{
      type: 'line', data: A.balance, showSymbol: false, step: false, lineStyle: { width: 2, color: c.accentInk }, itemStyle: { color: c.accentInk },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c.accentInk + '2e' }, { offset: 1, color: c.accentInk + '00' }]) },
      markLine: { symbol: 'none', silent: true, label: { formatter: 'Capital inicial', color: c.muted, position: 'insideEndBottom' }, lineStyle: { color: c.muted, type: 'solid', width: 1 }, data: [{ yAxis: A.cap }] },
    }],
  }));
}

function monthsTable(A) {
  const years = [...new Set([...A.months.keys()].map(k => k.slice(0, 4)))].sort();
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const vals = [...A.months.values()].map(m => Math.abs(m.pnl / m.start * 100)); const mx = Math.max(...vals, 0.01);
  const cellBg = p => `background:color-mix(in srgb, var(${p >= 0 ? '--pos' : '--neg'}) ${Math.round(10 + Math.min(1, Math.abs(p) / mx) * 55)}%, var(--surface-2))`;
  return `<table class="months"><thead><tr><th></th>${names.map(n => `<th>${n}</th>`).join('')}<th>Ano</th></tr></thead><tbody>${years.map(y => {
    let yStart = null, yPnl = 0;
    const tds = names.map((_, i) => {
      const m = A.months.get(`${y}-${pad(i + 1)}`);
      if (!m) return '<td class="empty-m">·</td>';
      if (yStart == null) yStart = m.start; yPnl += m.pnl;
      const p = m.pnl / m.start * 100;
      return `<td style="${cellBg(p)}" title="${names[i]}/${y}: ${money(m.pnl)} em ${m.n} trades">${sgn(p, 1)}</td>`;
    }).join('');
    const yp = yStart ? yPnl / yStart * 100 : null;
    return `<tr><th>${y}</th>${tds}<td class="y ${cls(yp)}">${sgn(yp, 1, '%')}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function splitCard(title, g, A, order) {
  const keys = order ? order.filter(k => g.has(k)).concat([...g.keys()].filter(k => !order.includes(k))) : [...g.keys()];
  return `<div class="split-card"><h4>${title}</h4>${keys.map(k => { const s = A.summary(g.get(k)); return `<div class="split-row"><span>${esc(k)}</span><b class="${cls(s.pnl)}">${money(s.pnl)}</b></div><div class="split-row sub-row"><span class="muted">${nf(s.n, 0)} trades · acerto ${pct(s.win, 0)}</span><span class="muted">média ${money(s.avg)}</span></div>`; }).join('')}</div>`;
}
const barTip = extra => Object.assign({}, base().tooltip, { axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(128,128,128,.08)' } } }, extra);

function tabOperacoes(el, row, d, A) {
  const T = d.trades;
  if (!T.length) { el.innerHTML = '<div class="card"><div class="empty"><h3>Sem operações</h3>Este relatório não tem trades fechados.</div></div>'; return; }
  el.innerHTML = `<div class="stack">
    <div class="split">
      ${splitCard('Direção', A.group(t => t[2] > 0 ? 'Compra' : 'Venda'), A, ['Compra', 'Venda'])}
      ${splitCard('Tipo de entrada', A.group(A.entryType), A, ['Entrada normal', 'Virada de mão'])}
      ${splitCard('Motivo de saída', A.group(A.exitType), A, ['Take profit', 'Stop loss', 'Fim do teste'])}
    </div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Distribuição dos resultados</h3><span class="sub">nº de trades por faixa de resultado ($)</span></div><div class="card-b"><div class="chart mini" id="cHist"></div></div></div>
      <div class="card"><div class="card-h"><h3>Duração dos trades</h3><span class="sub">nº de trades por faixa de duração</span></div><div class="card-b"><div class="chart mini" id="cDur"></div></div></div>
    </div>
    <div id="trWrap"></div>
  </div>`;
  const c = pal();
  const vals = T.map(t => t[8]), lo = Math.min(...vals), hi = Math.max(...vals), nb = Math.min(24, Math.max(8, Math.round(Math.sqrt(T.length) * 1.5)));
  const w = (hi - lo) / nb || 1, bins = Array.from({ length: nb }, (_, i) => ({ a: lo + i * w, b: lo + (i + 1) * w, n: 0 }));
  for (const v of vals) bins[Math.min(nb - 1, Math.floor((v - lo) / w))].n++;
  mk($('#cHist'), base({
    tooltip: barTip({ formatter: ps => { const b = bins[ps[0].dataIndex]; return `${money(b.a)} a ${money(b.b)}<br><b>${b.n}</b> trades`; } }),
    xAxis: axis('category', { data: bins.map(b => money((b.a + b.b) / 2, 0)) }), yAxis: axis('value', { minInterval: 1 }),
    series: [{ type: 'bar', barCategoryGap: '8%', data: bins.map(b => ({ value: b.n, itemStyle: { color: (b.a + b.b) / 2 >= 0 ? c.pos : c.neg, borderRadius: [3, 3, 0, 0] } })) }],
  }));
  const edges = [[0, 900, '<15m'], [900, 1800, '15–30m'], [1800, 3600, '30m–1h'], [3600, 7200, '1–2h'], [7200, 14400, '2–4h'], [14400, 28800, '4–8h'], [28800, 57600, '8–16h'], [57600, 86400, '16–24h'], [86400, Infinity, '>24h']];
  const dg = edges.map(() => []); for (const t of T) if (t[0]) { const s = t[1] - t[0]; dg[edges.findIndex(e => s >= e[0] && s < e[1])].push(t); }
  mk($('#cDur'), base({
    tooltip: barTip({ formatter: ps => { const s = A.summary(dg[ps[0].dataIndex]); return `<b>${ps[0].name}</b><br>${s.n} trades · acerto ${pct(s.win, 0)}<br>resultado ${money(s.pnl)} · média ${money(s.avg)}`; } }),
    xAxis: axis('category', { data: edges.map(e => e[2]) }), yAxis: axis('value', { minInterval: 1 }),
    series: [{ type: 'bar', barMaxWidth: 34, data: dg.map(g => ({ value: g.length, itemStyle: { color: c.s[1], borderRadius: [3, 3, 0, 0] } })) }],
  }));
  tabTrades($('#trWrap'), row, d, A);
}

function tabPeriodos(el, row, d, A) {
  const T = d.trades;
  if (!T.length) { el.innerHTML = '<div class="card"><div class="empty"><h3>Sem operações</h3></div></div>'; return; }
  el.innerHTML = `<div class="stack">
    <div class="card"><div class="card-h"><div><h3>Resultado por mês</h3><div class="sub">% sobre o saldo do início do mês</div></div></div><div class="card-b"><div class="chart short" id="cMon"></div></div></div>
    <div class="card"><div class="card-h"><div><h3>Resultado por dia</h3><div class="sub">Soma dos trades fechados em cada dia (horário do servidor) · linha vermelha = limite de perda diária do critério prop (−${nf(PROP.daily, 0)}%)</div></div></div><div class="card-b"><div class="chart" id="cDay"></div></div></div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Por dia da semana</h3><span class="sub">dia de abertura · horário do servidor</span></div><div class="card-b"><div class="chart mini" id="cWd"></div></div></div>
      <div class="card"><div class="card-h"><h3>Por hora de entrada</h3><span class="sub">horário do servidor</span></div><div class="card-b"><div class="chart mini" id="cHr"></div></div></div>
    </div>
  </div>`;
  const c = pal();
  const mons = [...A.months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  mk($('#cMon'), base({
    tooltip: barTip({ formatter: ps => { const [k, m] = mons[ps[0].dataIndex]; return `${k.split('-').reverse().join('/')}<br>Resultado <b>${money(m.pnl)}</b> (${sgn(m.pnl / m.start * 100, 2, '%')})<br>${m.n} trades`; } }),
    xAxis: axis('category', { data: mons.map(([k]) => { const [y, m] = k.split('-'); return `${MES[+m - 1]}/${y.slice(2)}`; }) }),
    yAxis: axis('value', { axisLabel: { color: c.muted, formatter: v => nf(v, 1) + '%' } }),
    series: [{ type: 'bar', barMaxWidth: 34, data: mons.map(([, m]) => signBar(+(m.pnl / m.start * 100).toFixed(3), c)) }],
  }));
  const dayData = [...A.days.entries()].map(([k, v]) => [Date.parse(k + 'T12:00:00Z'), v.pnl, v.pnl / v.start * 100, v.n]);
  mk($('#cDay'), base({
    tooltip: barTip({ formatter: ps => { const x = ps[0].data.raw; return `${new Date(x[0]).toISOString().slice(0, 10).split('-').reverse().join('/')}<br>Resultado <b>${money(x[1])}</b> (${sgn(x[2], 2, '%')})<br>${x[3]} trade(s)`; } }),
    xAxis: axis('time'), yAxis: axis('value', { axisLabel: { color: c.muted, formatter: v => nf(v, 1) + '%' } }),
    dataZoom: [{ type: 'inside' }],
    series: [{ type: 'bar', barMaxWidth: 8, data: dayData.map(x => ({ value: [x[0], x[2]], raw: x, itemStyle: { color: x[2] >= 0 ? c.pos : c.neg, borderRadius: x[2] >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2] } })),
      markLine: { symbol: 'none', silent: true, lineStyle: { color: c.neg, width: 1, type: 'solid' }, label: { formatter: `−${PROP.daily}%`, color: c.neg, position: 'insideStartBottom' }, data: [{ yAxis: -PROP.daily }] } }],
  }));
  const wdNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const byWd = wdNames.map(() => []), byHr = Array.from({ length: 24 }, () => []);
  for (const t of T) { const x = new Date((t[0] || t[1]) * 1000); byWd[x.getUTCDay()].push(t); byHr[x.getUTCHours()].push(t); }
  const catBars = (elId, labels, groups) => {
    const keep = labels.map((l, i) => [l, groups[i]]).filter(([, g]) => g.length);
    mk($(elId), base({
      tooltip: barTip({ formatter: ps => { const s = A.summary(keep[ps[0].dataIndex][1]); return `<b>${ps[0].name}</b><br>Resultado <b>${money(s.pnl)}</b><br>${s.n} trades · acerto ${pct(s.win, 0)}<br>média ${money(s.avg)}`; } }),
      xAxis: axis('category', { data: keep.map(k => k[0]) }), yAxis: axis('value', { axisLabel: { color: c.muted, formatter: moneyAxis } }),
      series: [{ type: 'bar', barMaxWidth: 28, data: keep.map(([, g]) => signBar(+A.summary(g).pnl.toFixed(2), c)) }],
    }));
  };
  catBars('#cWd', wdNames, byWd);
  catBars('#cHr', byHr.map((_, i) => pad(i) + 'h'), byHr);
}

function tabRisco(el, row, d, A) {
  const T = d.trades;
  const rules = [
    { l: `Meta de lucro ≥ ${PROP.target}%`, ok: row.plp >= PROP.target, v: `Lucro ${sgn(row.plp, 2, '%')}` },
    { l: `Perda diária menor que ${PROP.daily}%`, ok: isNum(row.worstDay) ? row.worstDay > -PROP.daily : null, v: `Pior dia ${sgn(row.worstDay, 2, '%')} (trades fechados)` },
    { l: `Perda total menor que ${PROP.total}%`, ok: isNum(row.ddb) ? row.ddb < PROP.total : null, v: `DD capital inicial ${pct(row.ddb)}` },
    { l: PROP.cons !== '' ? `Melhor dia ≤ ${PROP.cons}% do lucro` : 'Consistência (regra não definida)', ok: PROP.cons === '' ? null : (isNum(row.bestDayShare) ? row.bestDayShare <= Number(PROP.cons) : null), v: `Melhor dia = ${pct(row.bestDayShare, 1)} do lucro` },
  ];
  const best = T.length ? T.reduce((b, t) => t[8] > b[8] ? t : b) : null, worst = T.length ? T.reduce((b, t) => t[8] < b[8] ? t : b) : null;
  el.innerHTML = `<div class="stack">
    <div class="dd-explain">
      <div class="dd-card"><span>DD capital inicial</span><strong>${pct(row.ddb)}</strong><em>${money(row.ddbv)}</em><p>Maior queda da <b>equity</b> abaixo do capital inicial, registrada pelo MT5. Ignora quedas que acontecem acima do capital inicial. É o que as mesas prop chamam de perda total.</p></div>
      <div class="dd-card"><span>DD equity do pico</span><strong>${pct(row.dde)}</strong><em>MT5: rebaixamento máximo do capital líquido</em><p>Maior queda da <b>equity</b> (com posições abertas) a partir do maior valor anterior. Inclui devolução de lucro.</p></div>
      <div class="dd-card"><span>DD de saldo do pico</span><strong>${pct(row.ddBalPeak)}</strong><em>calculado pelo painel</em><p>Maior queda do <b>saldo</b> (só operações fechadas) a partir do maior saldo anterior. É a linha vermelha do gráfico abaixo.</p></div>
    </div>
    <div class="card"><div class="card-h"><div><h3>Drawdown ao longo do tempo</h3><div class="sub">Calculado a partir do saldo após cada operação fechada</div></div></div><div class="card-b"><div class="chart" id="cDd"></div></div></div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Critério prop</h3><a href="#/" class="sub" id="editRules">editar na biblioteca</a></div><div class="card-b"><div class="prop">${rules.map(r => `<div class="rule ${r.ok == null ? 'na' : r.ok ? 'ok' : 'bad'}"><span class="ic" aria-hidden="true">${r.ok == null ? '–' : r.ok ? '✓' : '✕'}</span><div><b>${esc(r.l)}</b><span>${r.ok == null ? 'Não avaliado · ' : r.ok ? 'Passa · ' : 'Não passa · '}${esc(r.v)}</span></div></div>`).join('')}</div>
        <p class="fhint" style="margin:10px 0 0">A perda diária usa a soma dos trades fechados em cada dia, no horário do servidor. O MT5 não exporta a equity intradiária, então quedas flutuantes dentro do dia não entram nesse número.</p></div></div>
      <div class="card"><div class="card-h"><h3>Sequências e extremos</h3></div><div class="card-b"><div class="kv one">
        <div><span>Ganhos seguidos (máx.)</span><b>${A.maxWin}</b></div>
        <div><span>Perdas seguidas (máx.)</span><b>${A.maxLoss}</b></div>
        <div><span>Melhor trade</span><b class="pos">${best ? money(best[8]) : '—'}</b></div>
        <div><span>Pior trade</span><b class="neg">${worst ? money(worst[8]) : '—'}</b></div>
        <div><span>Pior dia</span><b class="${cls(row.worstDay)}">${sgn(row.worstDay, 2, '%')}</b></div>
        <div><span>Pior mês</span><b class="${cls(row.worstMonth)}">${sgn(row.worstMonth, 2, '%')}</b></div>
        <div><span>Melhor dia / lucro total</span><b>${pct(row.bestDayShare, 1)}</b></div>
      </div></div></div>
    </div>
  </div>`;
  const c = pal();
  mk($('#cDd'), base({
    legend: { top: 0, right: 0, textStyle: { color: c.ink2, fontSize: 12 }, itemWidth: 14, itemHeight: 3, icon: 'rect' },
    grid: { left: 10, right: 18, top: 30, bottom: 50, containLabel: true },
    tooltip: Object.assign(base().tooltip, { valueFormatter: v => nf(v) + '%' }),
    xAxis: axis('time'), yAxis: axis('value', { max: 0, axisLabel: { color: c.muted, formatter: v => nf(v, 1) + '%' } }),
    dataZoom: [{ type: 'inside' }, zoomSlider(c)],
    series: [
      { name: 'Saldo abaixo do pico', type: 'line', data: A.ddPeak, showSymbol: false, lineStyle: { width: 1.5, color: c.neg }, itemStyle: { color: c.neg }, areaStyle: { color: c.neg, opacity: .15 } },
      { name: 'Saldo abaixo do capital inicial', type: 'line', data: A.ddBase, showSymbol: false, lineStyle: { width: 2, color: c.s[1] }, itemStyle: { color: c.s[1] } },
    ],
  }));
  $('#editRules').onclick = e => { e.preventDefault(); openPropDialog(); };
}

function tabTrades(el, row, d, A) {
  const T = d.trades.map((t, i) => ({ i: i + 1, t }));
  const st = { side: '', res: '', kind: '', sort: ['i', 1] };
  el.innerHTML = `<div class="card"><div class="card-h" style="flex-wrap:wrap">
    <h3>Lista de operações</h3><span class="spacer"></span>
    <div class="seg" data-f="res"><button data-v="" class="on">Todas</button><button data-v="w">Ganhos</button><button data-v="l">Perdas</button></div>
    <div class="seg" data-f="side"><button data-v="" class="on">Compra e venda</button><button data-v="1">Compra</button><button data-v="-1">Venda</button></div>
    <div class="seg" data-f="kind"><button data-v="" class="on">Todas entradas</button><button data-v="Entrada normal">Normal</button><button data-v="Virada de mão">Virada de mão</button></div>
    <span class="status" id="trCount"></span></div>
    <div class="tbl-wrap" style="max-height:calc(100vh - 200px)"><table class="grid" id="trTbl"></table></div></div>`;
  const cols = [['i', '#', 1], ['open', 'Abertura'], ['close', 'Fechamento'], ['dur', 'Duração', 1], ['dir', 'Direção'], ['vol', 'Volume', 1], ['pin', 'Entrada', 1], ['pout', 'Saída', 1], ['sl', 'S/L', 1], ['tp', 'T/P', 1], ['pnl', 'Resultado', 1], ['bal', 'Saldo', 1], ['kind', 'Tipo'], ['exit', 'Saída por']];
  const val = (x, k) => { const t = x.t; return { i: x.i, open: t[0], close: t[1], dur: t[0] ? t[1] - t[0] : null, dir: t[2], vol: t[3], pin: t[4], pout: t[5], sl: t[6], tp: t[7], pnl: t[8], bal: t[9], kind: A.entryType(t), exit: A.exitType(t) }[k]; };
  const draw = () => {
    let rows = T.filter(x => (!st.side || x.t[2] === +st.side) && (!st.res || (st.res === 'w' ? x.t[8] > 0 : x.t[8] <= 0)) && (!st.kind || A.entryType(x.t) === st.kind));
    const [sk, sd] = st.sort; rows.sort((a, b) => { const x = val(a, sk), y = val(b, sk); return (typeof x === 'string' ? x.localeCompare(y) : (x ?? -Infinity) - (y ?? -Infinity)) * sd; });
    const pnl = rows.reduce((s, x) => s + x.t[8], 0);
    $('#trCount', el).innerHTML = `${nf(rows.length, 0)} trades · <b class="${cls(pnl)}">${money(pnl)}</b>`;
    const digits = Math.max(2, ...d.trades.slice(0, 5).map(t => (String(t[4] || '').split('.')[1] || '').length));
    $('#trTbl', el).innerHTML = `<thead><tr>${cols.map(([k, l, n]) => `<th class="s ${n ? 'n' : ''}" data-k="${k}">${l}${st.sort[0] === k ? `<span class="ar">${st.sort[1] > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(x => { const t = x.t; return `<tr style="cursor:default">
      <td class="n rank">${x.i}</td><td>${t[0] ? dt(t[0]) : '—'}</td><td>${dt(t[1])}</td><td class="n">${dur(t[0] ? t[1] - t[0] : null)}</td>
      <td><span class="dir ${t[2] > 0 ? 'buy' : 'sell'}">${t[2] > 0 ? '▲ Compra' : '▼ Venda'}</span></td><td class="n">${nf(t[3], 2)}</td>
      <td class="n">${nf(t[4], digits)}</td><td class="n">${nf(t[5], digits)}</td><td class="n muted">${t[6] ? nf(t[6], digits) : '—'}</td><td class="n muted">${t[7] ? nf(t[7], digits) : '—'}</td>
      <td class="n ${cls(t[8])}"><b>${money(t[8])}</b></td><td class="n">${money(t[9])}</td><td class="ink2">${A.entryType(t)}</td><td class="ink2">${esc(A.exitType(t))}</td></tr>`; }).join('')}</tbody>`;
  };
  el.onclick = e => {
    const b = e.target.closest('.seg[data-f] button');
    if (b) { st[b.parentElement.dataset.f] = b.dataset.v; $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b)); draw(); return; }
    const th = e.target.closest('th[data-k]');
    if (th) { st.sort = st.sort[0] === th.dataset.k ? [th.dataset.k, -st.sort[1]] : [th.dataset.k, th.dataset.k === 'i' ? 1 : -1]; draw(); }
  };
  draw();
}

// Catalogo dos parametros do robo: secao, nome amigavel e tipo do valor.
// Tipos: yn (Sim/Não), onoff (Ativado/Desativado), pct, pctCanal, pts, int, candles, bars, hours, lot, color (MQL5 0x00BBGGRR), enum (código sem mapeamento: valor bruto), text.
// Parametros fora do catalogo continuam aparecendo, na secao do grupo original do relatorio.
const PSEC = [
  ['exec', 'Execução e horários'], ['canal', 'Formação e validade do canal'], ['entrada', 'Entradas e pullback'], ['dias', 'Dias operados'],
  ['rev', 'Reversão (virada de mão)'], ['recup', 'Recuperação de ciclo'], ['risco', 'Gestão de risco'], ['tpsl', 'Take profit e stop loss'],
  ['metas', 'Metas semanais'], ['visual', 'Visualização no gráfico', true], ['diag', 'Diagnóstico e logs', true],
];
const PDEF = {
  MagicNumber: ['exec', 'Número mágico das ordens', 'int'],
  OperarTodaHora: ['exec', 'Operar em qualquer horário', 'yn'],
  HorariosOperacionais: ['exec', 'Horários operacionais (código)', 'enum'],
  UsarProximoCandleDisponivel: ['exec', 'Usar o próximo candle disponível', 'onoff'],
  PermitirMultiplasEntradas: ['exec', 'Permitir múltiplas entradas', 'yn'],
  EncerrarTradeAnterior: ['exec', 'Encerrar o trade anterior', 'yn'],
  CandlesParaFormacao: ['canal', 'Candles para formar o canal', 'candles'],
  TamanhoMinimoCanal_Pontos: ['canal', 'Tamanho mínimo do canal', 'pts'],
  DistanciaMaxRompimento_Percent: ['canal', 'Distância máxima do rompimento', 'pct'],
  MetodoCalculoCandle: ['canal', 'Método de cálculo do candle (marcação do CA)', 'enum'],
  PercentualMaximoPavio: ['canal', 'Pavio máximo', 'pct'],
  UsarLimiteHorasSemRompimento: ['canal', 'Limite de horas sem rompimento', 'onoff'],
  LimiteHorasSemRompimento: ['canal', 'Horas sem rompimento até invalidar', 'hours'],
  UsarEntradaPullback: ['entrada', 'Entrada por pullback', 'onoff'],
  DistanciaPullback_Percent: ['entrada', 'Distância do pullback', 'pct'],
  ReativarCanalAposRompimentoInvalido: ['entrada', 'Reativar o canal após rompimento inválido', 'yn'],
  UsarFiltroDiaSemana: ['dias', 'Filtro de dias da semana', 'onoff'],
  Operar_Domingo: ['dias', 'Domingo', 'yn'], Operar_Segunda: ['dias', 'Segunda-feira', 'yn'], Operar_Terca: ['dias', 'Terça-feira', 'yn'],
  Operar_Quarta: ['dias', 'Quarta-feira', 'yn'], Operar_Quinta: ['dias', 'Quinta-feira', 'yn'], Operar_Sexta: ['dias', 'Sexta-feira', 'yn'], Operar_Sabado: ['dias', 'Sábado', 'yn'],
  UsarViradaDeMao: ['rev', 'Virada de mão', 'onoff'],
  MaxViradasDeMao: ['rev', 'Máximo de viradas de mão', 'int'],
  TakeProfit_PercentualCanal_Reversao: ['rev', 'Take profit da virada', 'pctCanal'],
  StopLoss_PercentualBuffer_Reversao: ['rev', 'Folga (buffer) do stop loss da virada', 'pct'],
  RecuperarCicloAoIniciar: ['recup', 'Recuperar o ciclo ao iniciar', 'yn'],
  AtivarEntradaRecuperada: ['recup', 'Entrada recuperada', 'onoff'],
  AtivarViradaRecuperada: ['recup', 'Virada recuperada', 'onoff'],
  MaxBarrasSinalRecuperado: ['recup', 'Máximo de barras do sinal recuperado', 'bars'],
  BloquearRecuperacaoAmbigua: ['recup', 'Bloquear recuperação ambígua', 'yn'],
  RiscoPorTrade_Percent: ['risco', 'Risco por operação', 'pct'],
  LoteMinimoOperacional: ['risco', 'Lote mínimo operacional', 'lot'],
  ArredondarLoteParaCima: ['risco', 'Arredondar o lote para cima', 'yn'],
  TakeProfit_PercentualCanal: ['tpsl', 'Take profit', 'pctCanal'],
  StopLoss_PercentualBuffer: ['tpsl', 'Folga (buffer) do stop loss', 'pct'],
  ComentarioOrdens: ['tpsl', 'Comentário das ordens', 'text'],
  UseMetaSemanal: ['metas', 'Meta semanal', 'onoff'],
  MaxTradesGanho_Semana: ['metas', 'Máximo de trades com ganho na semana', 'int'],
  MaxTradesPerda_Semana: ['metas', 'Máximo de trades com perda na semana', 'int'],
  IncluirLucroViradaMetaSemanal: ['metas', 'Contar o lucro da virada na meta', 'yn'],
  IncluirPerdaViradaMetaSemanal: ['metas', 'Contar a perda da virada na meta', 'yn'],
  ExibirObjetosGraficos: ['visual', 'Exibir objetos no gráfico', 'yn'],
  ManterObjetosAntigos: ['visual', 'Manter objetos antigos', 'yn'],
  CorCanalAbertura_CA: ['visual', 'Cor do canal de abertura (CA)', 'color'],
  CorCanalProjecao_C1: ['visual', 'Cor do canal de projeção (C1)', 'color'],
  CorCanalTakeProfit_C2: ['visual', 'Cor do canal de take profit (C2)', 'color'],
  CorLinhaStopLoss: ['visual', 'Cor da linha de stop loss', 'color'],
  CorGatilhoRompimento: ['visual', 'Cor do gatilho de rompimento', 'color'],
  EstiloLinhaCanal: ['visual', 'Estilo da linha do canal (código)', 'enum'],
  LarguraLinhaCanal: ['visual', 'Largura da linha do canal', 'int'],
  TamanhoLinhas_em_Candles: ['visual', 'Comprimento das linhas', 'candles'],
  QuantidadeCanaisProjecaoTake: ['visual', 'Canais de projeção do take', 'int'],
  HabilitarLogsDebug: ['diag', 'Logs de depuração', 'onoff'],
  LogDetalhesCalculo: ['diag', 'Log com detalhes do cálculo', 'onoff'],
  ExibirResumoBacktest: ['diag', 'Exibir resumo do backtest', 'yn'],
  ExibirLogEstadoDetalhado: ['diag', 'Log de estado detalhado', 'onoff'],
};
const numTxt = raw => { const n = Number(raw); return raw !== '' && Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : raw; };
// valor formatado para leitura; o valor bruto do relatorio fica no title
function paramValue(kind, raw) {
  const b = String(raw).toLowerCase(), isB = b === 'true' || b === 'false';
  if (kind === 'yn' && isB) return `<span class="pv-b ${b === 'true' ? 'on' : ''}">${b === 'true' ? 'Sim' : 'Não'}</span>`;
  if (kind === 'onoff' && isB) return `<span class="pv-b ${b === 'true' ? 'on' : ''}">${b === 'true' ? 'Ativado' : 'Desativado'}</span>`;
  if (isB) return b === 'true' ? 'Sim' : 'Não';
  const n = Number(raw), ok = raw !== '' && Number.isFinite(n);
  if (!ok) return esc(raw);
  switch (kind) {
    case 'pct': return `${numTxt(raw)}<i>%</i>`;
    case 'pctCanal': return `${numTxt(raw)}<i>% do canal</i> <span class="tag take">${takeTxt(takeOf(n))}</span>`;
    case 'pts': return `${numTxt(raw)}<i>pontos</i>`;
    case 'candles': return `${numTxt(raw)}<i>${n === 1 ? 'candle' : 'candles'}</i>`;
    case 'bars': return `${numTxt(raw)}<i>${n === 1 ? 'barra' : 'barras'}</i>`;
    case 'hours': return `${numTxt(raw)}<i>${n === 1 ? 'hora' : 'horas'}</i>`;
    case 'lot': return `${numTxt(raw)}<i>lote</i>`;
    case 'color': { const v = n >>> 0, hex = '#' + [v & 255, (v >> 8) & 255, (v >> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join(''); return `<span class="swatch" style="background:${hex}"></span>${hex.toUpperCase()}`; }
    case 'enum': case 'text': return esc(raw);
  }
  return numTxt(raw);
}
const plainValue = (kind, raw) => paramValue(kind, raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().replace(/ %/g, '%');
const timeRef = h => /CORRETORA/i.test(h) ? ['srv', 'Horário da corretora'] : /\(Brasil\)/i.test(h) ? ['br', 'Horário de Brasília'] : null;

function tabConfig(el, row, d) {
  // agrupa pelo catalogo, guardando o grupo original de cada parametro
  const secs = new Map(PSEC.map(([id, t, closed]) => [id, { id, t, closed: !!closed, items: [], orig: new Set() }]));
  let grp = '';
  for (const [k, v] of d.params) {
    if (v === '') { grp = k; continue; }
    const def = PDEF[k];
    let sec = def ? secs.get(def[0]) : null;
    if (!sec) { const id = 'x:' + (grp || 'Outros'); if (!secs.has(id)) secs.set(id, { id, t: grp || 'Outros parâmetros', items: [], orig: new Set() }); sec = secs.get(id); }
    sec.items.push({ k, v, label: def ? def[1] : k, kind: def ? def[2] : 'raw' });
    if (grp) sec.orig.add(grp);
  }
  const varies = k => k in I.params;
  const active = (k, v) => (S.filters.params[k] || []).includes(v);
  const rowHtml = it => {
    const val = paramValue(it.kind, it.v), pv = plainValue(it.kind, it.v);
    const btn = varies(it.k)
      ? `<button class="pf ${active(it.k, it.v) ? 'on' : ''}" data-pf="${esc(it.k)}" data-v="${esc(it.v)}" aria-pressed="${active(it.k, it.v)}" aria-label="${active(it.k, it.v) ? 'Remover filtro' : 'Filtrar'} por ${esc(it.label.toLowerCase())}: ${esc(pv)}" title="${active(it.k, it.v) ? 'Filtro ativo — clique para remover' : 'Filtrar backtests por este valor'}">${ICON.filter}</button>`
      : '<span class="pf-gap" aria-hidden="true"></span>';
    return `<div class="prow ${varies(it.k) ? 'varies' : ''}" data-q="${esc((it.label + ' ' + it.k + ' ' + it.v + ' ' + pv).toLowerCase())}">
      <div class="pn"><span class="pl">${esc(it.label)}${varies(it.k) ? '<i class="vdot" title="Varia entre os backtests da biblioteca"></i>' : ''}</span>${it.label !== it.k ? `<code title="Identificador técnico no robô">${esc(it.k)}</code>` : ''}</div>
      <div class="pvv" title="Valor no relatório: ${esc(it.v)}">${val}</div>${btn}</div>`;
  };
  const secHtml = s => {
    const refs = [...new Set([...s.orig].map(timeRef).filter(Boolean).map(x => x.join('|')))].map(x => x.split('|'));
    const note = s.id === 'exec' && row.hb ? `<p class="psec-note">Os horários do robô seguem o relógio da corretora. O painel identifica este teste como <b>${esc(row.hb)} (horário de Brasília)</b>.</p>` : '';
    return `<details class="psec" data-sec="${esc(s.id)}" ${s.closed ? '' : 'open'} data-default="${s.closed ? 'closed' : 'open'}">
      <summary><span class="pst">${esc(s.t)}</span>${refs.map(([c, t]) => `<span class="tref ${c}">${t}</span>`).join('')}<span class="pcount">${s.items.length}</span></summary>
      ${note}<div class="plist">${s.items.map(rowHtml).join('')}</div>
      ${s.orig.size ? `<p class="psec-orig">No relatório: ${[...s.orig].map(esc).join(' · ')}</p>` : ''}</details>`;
  };
  const used = [...secs.values()].filter(s => s.items.length);
  const total = used.reduce((n, s) => n + s.items.length, 0);
  const meta = Object.entries(d.meta).filter(([k]) => k !== 'Parâmetros de entrada');
  const noteKey = 'note.' + row.id;
  const longField = (id, label, text, href) => `<div class="idf long"><span class="idl">${label}</span>
    <div class="idv"><span class="idt" id="${id}" title="${esc(text)}">${href ? `<a href="${href}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text)}</span>
    <button class="btn xs" data-expand="${id}" aria-expanded="false">Ver completo</button><button class="btn xs" data-copy="${esc(text)}" aria-label="Copiar ${esc(label.toLowerCase())}">${ICON.copy}Copiar</button></div></div>`;
  const shortField = (label, val, extra = '') => `<div class="idf"><span class="idl">${label}</span><span class="ids">${val}${extra}</span></div>`;
  el.innerHTML = `<div class="stack">
    <div class="card"><div class="card-h"><h3>Origem e identificação</h3></div><div class="card-b idblock">
      ${longField('idName', 'Nome original do relatório', row.name)}
      ${longField('idFile', 'Arquivo do relatório', row.report.split('/').pop(), encodePath(row.report))}
      ${longField('idDir', 'Pasta', row.folder, encodePath(row.folder) + '/')}
      <div class="idgrid">
        ${shortField('Coleção', esc(row.coll || '—'))}
        ${shortField('Período testado', esc(perLabel(row.perKey)))}
        ${shortField('Robô', esc(row.ea || '—'))}
        ${shortField('Faixa de risco', esc(row.fx || '—'))}
        ${shortField(`Posição no ranking ${esc(row.a)} ${esc(row.tf)}`, '#' + esc(row.pos ?? '—'))}
        ${shortField('ID no painel', `<code>${esc(row.id)}</code>`, ` <button class="btn xs" data-copy="${esc(row.id)}" aria-label="Copiar ID">${ICON.copy}</button>`)}
      </div>
    </div></div>
    <div class="card"><div class="card-h pcfg-h"><div><h3>Parâmetros de entrada</h3><div class="sub">${total} parâmetros em ${used.length} seções · <span class="legend-v"><i class="vdot"></i> varia entre os backtests — use ${ICON.filter.replace('<svg', '<svg class="ic-inline"')} para filtrar a biblioteca</span></div></div>
      <div class="psearch">${ICON.search}<input id="pSearch" type="search" placeholder="Buscar parâmetro, código ou valor…" autocomplete="off" aria-label="Buscar parâmetro"></div></div>
      <div id="pActive"></div>
      <div class="card-b"><div class="pcols" id="pBody">${used.map(secHtml).join('')}</div><p class="pempty" id="pEmpty" hidden>Nenhum parâmetro encontrado.</p></div></div>
    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Resultados do testador</h3><span class="sub">exatamente como no relatório MT5</span></div><div class="card-b"><div class="kv one">${d.stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div></div></div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Configuração do teste</h3></div><div class="card-b"><div class="kv one">${meta.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div></div></div>
        <div class="card"><div class="card-h"><h3>Minhas anotações</h3><span class="sub">salvas neste navegador</span></div><div class="card-b"><textarea class="note-box" id="myNote" placeholder="Observações sobre esta estratégia…">${esc(store.get(noteKey, ''))}</textarea></div></div>
        <div class="card"><div class="card-h"><h3>Arquivos do teste</h3></div><div class="card-b files">${d.files.map(f => `<a href="${encodePath(f)}" target="_blank" rel="noopener">${ICON.ext.replace('<svg', '<svg width="14" height="14"')}${esc(f.split('/').pop())}</a>`).join('') || '<span class="muted">Nenhum arquivo extra.</span>'}</div></div>
      </div>
    </div>
    ${d.notes.map(([f, t]) => `<div class="card"><div class="card-h"><h3>${esc(f)}</h3></div><div class="card-b"><pre class="md">${esc(t)}</pre></div></div>`).join('')}
    ${d.images.length ? `<div class="card"><div class="card-h"><h3>Gráficos originais do MT5</h3></div><div class="card-b"><div class="gallery">${d.images.map(f => `<figure><a href="${encodePath(f)}" target="_blank" rel="noopener"><img loading="lazy" src="${encodePath(f)}" alt="Gráfico do MT5: ${esc(f.split('/').pop())}"></a><figcaption>${esc(f.split('/').pop())}</figcaption></figure>`).join('')}</div></div></div>` : ''}
  </div>`;
  // 'Ver completo' so quando o texto esta cortado
  const fitIds = () => $$('[data-expand]', el).forEach(b => { const t = $('#' + b.dataset.expand); if (!t.classList.contains('full')) b.hidden = t.scrollWidth <= t.clientWidth + 1; });
  requestAnimationFrame(fitIds); window.addEventListener('resize', debounce(() => el.isConnected && fitIds(), 150));
  $('#myNote').oninput = debounce(e => store.set(noteKey, e.target.value), 300);
  // filtros de parametro ativos (mesmo estado da biblioteca), com remocao direta
  const label = k => PDEF[k] ? PDEF[k][1] : k;
  const drawActive = () => {
    const act = Object.entries(S.filters.params).filter(([, v]) => v.length);
    $('#pActive').innerHTML = act.length ? `<div class="pactive">${ICON.filter}<span>Filtros ativos na biblioteca:</span>${act.map(([k, vs]) => vs.map(v => `<span class="fchip sm"><span>${esc(label(k))}</span>${esc(plainValue(PDEF[k]?.[2] || 'raw', v))}<button class="x" data-unpf="${esc(k)}" data-v="${esc(v)}" aria-label="Remover filtro ${esc(label(k))}">×</button></span>`).join('')).join('')}<a href="#/" class="link-btn">Ver biblioteca filtrada ${ICON.arrow}</a></div>` : '';
  };
  drawActive();
  const unset = (k, v) => { const a = (S.filters.params[k] || []).filter(x => x !== v); if (a.length) S.filters.params[k] = a; else delete S.filters.params[k]; S.page = 0; save(); };
  const syncBtns = () => $$('#pBody [data-pf]').forEach(b => { const on = active(b.dataset.pf, b.dataset.v), it = { label: label(b.dataset.pf) }; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.title = on ? 'Filtro ativo — clique para remover' : 'Filtrar backtests por este valor'; b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^(Remover filtro|Filtrar) por/, on ? 'Remover filtro por' : 'Filtrar por')); });
  // somente o botao de funil filtra; o resto da linha e texto selecionavel
  el.onclick = e => {
    const cp = e.target.closest('[data-copy]'); if (cp) { copyText(cp.dataset.copy, 'Copiado'); return; }
    const ex = e.target.closest('[data-expand]'); if (ex) { const t = $('#' + ex.dataset.expand); const open = t.classList.toggle('full'); ex.setAttribute('aria-expanded', open); ex.textContent = open ? 'Resumir' : 'Ver completo'; return; }
    const un = e.target.closest('[data-unpf]'); if (un) { unset(un.dataset.unpf, un.dataset.v); drawActive(); syncBtns(); toast('Filtro removido'); return; }
    const b = e.target.closest('[data-pf]'); if (!b) return;
    e.stopPropagation();
    const k = b.dataset.pf, v = b.dataset.v;
    if (active(k, v)) { unset(k, v); drawActive(); syncBtns(); toast('Filtro removido'); return; }
    S.filters.params[k] = [v]; S.page = 0; save(); location.hash = '#/'; toast(`Filtro: ${label(k)} = ${plainValue(PDEF[k]?.[2] || 'raw', v)}`);
  };
  // busca: tambem dentro de secoes recolhidas, que abrem quando ha resultado
  $('#pSearch').oninput = e => {
    const q = e.target.value.trim().toLowerCase(); let hits = 0;
    $$('#pBody .psec').forEach(s => {
      let n = 0;
      $$('.prow', s).forEach(r => { const ok = !q || r.dataset.q.includes(q) || s.querySelector('.pst').textContent.toLowerCase().includes(q); r.hidden = !ok; if (ok) n++; });
      s.hidden = !n; hits += n;
      s.open = q ? n > 0 : s.dataset.default === 'open';
    });
    $('#pEmpty').hidden = hits > 0;
  };
}

// =====================================================================
// comparacao
// =====================================================================
async function renderCompare() {
  const main = $('#main');
  if (!cmp.length) { main.innerHTML = `<div class="page-head rise"><div><div class="eyebrow">Lado a lado</div><h1>Comparações</h1><p>Selecione até 8 backtests na biblioteca (caixa de seleção de cada linha) ou use “Adicionar à comparação” dentro de um backtest.</p></div></div><div class="card rise"><div class="empty"><h3>Nenhum backtest selecionado</h3><p>Marque a caixa de seleção das linhas na biblioteca.</p><a class="btn primary" href="#/">Ir para a biblioteca</a></div></div>`; return; }
  main.innerHTML = `<div class="loading"><i class="spin"></i>Carregando ${cmp.length} relatórios…</div>`;
  const ids = [...cmp];
  let det;
  try { det = await Promise.all(ids.map(loadDetail)); } catch (e) { main.innerHTML = `<div class="card"><div class="empty"><h3>Não foi possível ler um dos relatórios</h3>${esc(e.message)}</div></div>`; return; }
  if (route().name !== 'cmp') return;
  const c = pal(), rows = ids.map(id => BY_ID.get(id)), an = rows.map((r, i) => analyze(r, det[i]));
  const col = i => c.s[i % 8];
  const sw = i => `<i class="sw" style="background:${col(i)}"></i>`;
  const metricRows = ['plp', 'pl', 'ddb', 'dde', 'pf', 'rdd', 'tr', 'winRate', 'worstDay', 'bestDayShare', 'mpos', 'worstMonth', 'sharpe', 'rf', 'payoff', 'maxLossStreak', 'risk'];
  const bestIdx = k => { const b = M[k].better; if (!b) return -1; let bi = -1; rows.forEach((r, i) => { if (isNum(r[k]) && (bi < 0 || (b > 0 ? r[k] > rows[bi][k] : r[k] < rows[bi][k]))) bi = i; }); return bi; };
  const pkeys = [...new Set(det.flatMap(d => d.params.filter(([, v]) => v !== '').map(([k]) => k)))];
  const pmaps = det.map(d => Object.fromEntries(d.params));
  const diffKeys = pkeys.filter(k => new Set(pmaps.map(p => p[k])).size > 1);
  const periods = [...new Set(rows.map(r => r.perKey))];
  const caps = [...new Set(rows.map(r => r.cap))];
  const abs = cmpScale === 'abs';
  const colHead = (r, i) => `<th class="n">${sw(i)}${esc(r.a)} ${esc(r.tf)}<div class="tmeta" style="max-width:190px;margin-left:auto">${esc(r.dn)}</div></th>`;
  main.innerHTML = `
    <div class="page-head rise"><div><div class="eyebrow">Lado a lado</div><h1>Comparações</h1><p>${rows.length} backtest${rows.length > 1 ? 's' : ''} · as cores são as mesmas em todos os gráficos e tabelas</p></div>
      <div class="head-ctl">
        <div class="seg" id="cmpScale" aria-label="Escala"><button data-v="pct" class="${!abs ? 'on' : ''}" title="Retorno em % do capital inicial de cada teste">% normalizado</button><button data-v="abs" class="${abs ? 'on' : ''}" title="Saldo em dólares">$ absoluto</button></div>
        <div class="seg" id="cmpAlign" aria-label="Eixo de tempo"><button data-v="date" class="${cmpAlign === 'date' ? 'on' : ''}">Data real</button><button data-v="start" class="${cmpAlign === 'start' ? 'on' : ''}" title="Eixo em dias desde o início de cada teste">Alinhar pelo início</button></div>
        <button class="btn outline" id="cmpClear">Limpar seleção</button></div></div>
    <div class="card rise" style="margin-bottom:14px"><table class="grid ident"><thead><tr><th></th><th>Backtest</th><th>Período</th><th class="n">Capital inicial</th><th class="n">Trades</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr style="cursor:default"><td style="width:24px">${sw(i)}</td><td><a class="tname" href="#/t/${r.id}">${esc(r.a)} ${esc(r.tf)} · ${esc(r.dn)}</a><div class="tmeta mono" title="${esc(r.name)}">${esc(r.name)}</div></td><td class="ink2">${esc(perLabel(r.perKey))}</td><td class="n">${money(r.cap, 0)}</td><td class="n">${nf(r.tr, 0)}</td><td class="n"><button class="x" data-rm="${r.id}" aria-label="Remover ${esc(r.dn)} da comparação" title="Remover da comparação">×</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="stack">
      <div class="card"><div class="card-h"><div><h3>${abs ? 'Saldo' : 'Retorno acumulado'}</h3><div class="sub">${abs ? 'Saldo em dólares após cada operação fechada' : '% sobre o capital inicial de cada teste'} · ${cmpAlign === 'start' ? 'eixo = dias desde o início de cada teste' : 'eixo = data real'}</div></div></div>
        ${periods.length > 1 ? `<div class="banner">${ICON.info}<div><b>Os testes cobrem períodos diferentes:</b> ${periods.map(p => esc(perLabel(p))).join(' · ')}. ${cmpAlign === 'date' ? 'Na data real, as curvas não começam juntas. Use <button class="link-btn" id="goAlign">Alinhar pelo início</button> para comparar a evolução desde o primeiro dia.' : 'O eixo está alinhado pelo primeiro dia de cada teste; as datas reais são diferentes.'}</div></div>` : ''}
        ${abs && caps.length > 1 ? `<div class="banner">${ICON.info}<div><b>Capitais iniciais diferentes</b> (${caps.map(x => money(x, 0)).join(', ')}). Em $ absoluto, a comparação de tamanho das curvas fica distorcida; prefira % normalizado.</div></div>` : ''}
        <div class="card-b"><div class="chart tall" id="cmpEq"></div></div></div>
      <div class="card"><div class="card-h"><div><h3>Drawdown do saldo a partir do pico</h3><div class="sub">% do saldo · operações fechadas</div></div></div><div class="card-b"><div class="chart short" id="cmpDd"></div></div></div>
      <div class="card"><div class="card-h"><h3>Métricas lado a lado</h3><span class="sub">● melhor valor de cada linha (quando há um “melhor”)</span></div><div style="overflow:auto"><table class="grid cmp-table"><thead><tr><th>Métrica</th>${rows.map(colHead).join('')}</tr></thead>
        <tbody>${metricRows.map(k => { const bi = bestIdx(k); return `<tr style="cursor:default"><td class="ink2" title="${esc(M[k].tip || '')}">${esc(M[k].l)}</td>${rows.map((r, i) => `<td class="n ${M[k].c ? cls(r[k]) : ''} ${i === bi && rows.length > 1 ? 'best' : ''}">${M[k].f(r[k])}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Diferenças de configuração</h3><span class="sub">${diffKeys.length} de ${pkeys.length} parâmetros mudam entre os testes</span></div><div style="overflow:auto">${diffKeys.length ? `<table class="grid"><thead><tr><th>Parâmetro</th>${rows.map(colHead).join('')}</tr></thead><tbody>${diffKeys.map(k => `<tr style="cursor:default"><td class="ink2">${esc(k)}</td>${pmaps.map(p => `<td class="n">${esc(p[k] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<div class="empty">Todos os parâmetros são iguais.</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Período e origem dos dados</h3></div><div style="overflow:auto"><table class="grid"><thead><tr><th></th>${rows.map(colHead).join('')}</tr></thead><tbody>
        ${[['Período', r => perLabel(r.perKey)], ['Dias operados', r => r.days || '—'], ['Horário (Brasília)', r => r.hb || '—'], ['Canal mínimo', r => r.pts != null ? ptsTxt(r.pts) : '—'], ['Take', r => r.take != null ? takeTxt(r.take) + (r.takeRev != null && r.takeRev !== r.take ? ` (virada ${String(r.takeRev).replace('.', ',')})` : '') : '—'], ['Robô', r => r.ea || '—'], ['Coleção', r => r.coll || '—'], ['Pasta', r => r.folder]].map(([l, f]) => `<tr style="cursor:default"><td class="ink2">${l}</td>${rows.map(r => `<td class="n ink2 wrap">${esc(f(r))}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>
    </div>`;
  $('#cmpClear').onclick = () => { cmp = []; store.set('cmp', cmp); updateCmpBadge(); renderCompare(); };
  $('#cmpAlign').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; cmpAlign = b.dataset.v; store.set('cmpAlign', cmpAlign); renderCompare(); };
  $('#cmpScale').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; cmpScale = b.dataset.v; store.set('cmpScale', cmpScale); renderCompare(); };
  const ga = $('#goAlign'); if (ga) ga.onclick = () => { cmpAlign = 'start'; store.set('cmpAlign', cmpAlign); renderCompare(); };
  $('.ident').onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; toggleCmp(b.dataset.rm); renderCompare(); };
  const byStart = cmpAlign === 'start';
  const xs = (pts, i) => byStart ? pts.map(([t, v]) => [+((t - an[i].balance[0][0]) / 864e5).toFixed(3), v]) : pts;
  const xAx = () => byStart ? axis('value', { name: 'dias desde o início', nameLocation: 'middle', nameGap: 24, splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: c.line2 } }, max: 'dataMax' }) : axis('time');
  const fmtV = v => abs ? money(v) : nf(v) + '%';
  const tipEq = Object.assign(base().tooltip, { valueFormatter: fmtV }, byStart ? { formatter: ps => `Dia ${nf(ps[0].value[0], 0)}<br>` + ps.map(p => `${p.marker}${esc(p.seriesName)} <b>${fmtV(p.value[1])}</b>`).join('<br>') } : {});
  const tipDd = Object.assign(base().tooltip, { valueFormatter: v => nf(v) + '%' }, byStart ? { formatter: ps => `Dia ${nf(ps[0].value[0], 0)}<br>` + ps.map(p => `${p.marker}${esc(p.seriesName)} <b>${nf(p.value[1])}%</b>`).join('<br>') } : {});
  const name = r => `${r.a} ${r.tf} · ${r.dn}`;
  mk($('#cmpEq'), base({
    tooltip: tipEq, grid: { left: 10, right: 18, top: 20, bottom: byStart ? 64 : 50, containLabel: true },
    xAxis: xAx(), yAxis: axis('value', { scale: abs, axisLabel: { color: c.muted, formatter: v => abs ? moneyAxis(v) : nf(v, 0) + '%' } }),
    dataZoom: [{ type: 'inside' }, zoomSlider(c)],
    series: rows.map((r, i) => ({ name: name(r), type: 'line', showSymbol: false, lineStyle: { width: 2, color: col(i) }, itemStyle: { color: col(i) }, data: xs(an[i].balance.map(([t, b]) => [t, abs ? b : +((b - an[i].cap) / an[i].cap * 100).toFixed(3)]), i) })),
  }));
  mk($('#cmpDd'), base({
    tooltip: tipDd, grid: { left: 10, right: 18, top: 20, bottom: byStart ? 30 : 10, containLabel: true },
    xAxis: xAx(), yAxis: axis('value', { max: 0, axisLabel: { color: c.muted, formatter: v => nf(v, 1) + '%' } }),
    series: rows.map((r, i) => ({ name: name(r), type: 'line', showSymbol: false, lineStyle: { width: 1.5, color: col(i) }, itemStyle: { color: col(i) }, data: xs(an[i].ddPeak, i) })),
  }));
}

// =====================================================================
// roteamento, tema e inicializacao
// =====================================================================
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('t/')) { const [id, tab] = h.slice(2).split('/'); return { name: 'detail', id, tab }; }
  if (h.startsWith('comparar')) return { name: 'cmp' };
  if (h.startsWith('favoritos')) return { name: 'fav' };
  return { name: 'lib' };
}
function renderCrumbs(r) {
  const home = `<a href="#/" class="hide-sm">${ICON.home}<span>Backtests</span></a><span class="sep hide-sm">/</span>`;
  const row = r.name === 'detail' ? BY_ID.get(r.id) : null;
  $('#crumbs').innerHTML = home + (
    r.name === 'cmp' ? '<b>Comparações</b>' :
    r.name === 'fav' ? '<b>Favoritos</b>' :
    r.name === 'detail' ? `<a href="#/">Biblioteca</a><span class="sep">/</span><b title="${esc(row?.name || '')}">${row ? `${esc(row.a)} ${esc(row.tf)} · ${esc(row.dn)}` : 'Backtest'}</b>` :
    '<b>Biblioteca</b>');
}
function closeNav() { $('#layout').classList.remove('nav-open'); $('#navScrim').classList.remove('open'); }
function go() {
  const r = route();
  disposeCharts(); disposePv(); pvShown = null;
  closeMenus(); const rm = $('#rowMenu'); if (rm) rm.classList.remove('open');
  if (sideVisible()) setSide(false);
  closeNav(); document.body.classList.remove('lock');
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (r.name === 'detail' ? 'lib' : r.name)));
  renderCrumbs(r);
  if (r.name === 'lib' || r.name === 'fav') { libMode = r.name; renderSide(); renderLib(); }
  if (r.name !== 'lib' && r.name !== 'fav') $('#main').classList.remove('lib-fill');
  if (r.name === 'detail') { detailTab = TAB_ALIAS[r.tab] || (TABS.some(t => t[0] === r.tab) ? r.tab : 'geral'); renderDetail(r.id); }
  else if (r.name === 'cmp') renderCompare();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);
window.addEventListener('resize', debounce(() => { if (pvChart) pvChart.resize(); if (!narrow()) { $('#preview')?.classList.remove('open'); $('#pvScrim')?.classList.remove('open'); } }, 120));
document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus(); });
window.addEventListener('scroll', () => { const rm = $('#rowMenu'); if (rm) rm.classList.remove('open'); }, true);
const typingIn = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.querySelector('dialog[open]');
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/' && !typingIn()) { if (!isLib()) location.hash = '#/'; setTimeout(() => $('#fq') && $('#fq').focus(), 30); e.preventDefault(); return; }
  if (e.key === 'Escape') {
    if ($('.menu.open')) { closeMenus(); return; }
    if (sideVisible()) { setSide(false); return; }
    if ($('#preview.open')) { openPv(false); return; }
    if ($('#layout').classList.contains('nav-open')) { closeNav(); return; }
    if (!isLib() && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) location.hash = '#/';
    return;
  }
  if (!isLib() || typingIn() || sideVisible()) return;
  if ((e.key === 'f' || e.key === 'F') && !e.shiftKey) { setSide(true); e.preventDefault(); return; }
  if (S.view !== 'table') return;
  if (!VT || !VT.wrap.isConnected || !VT.data.length) return;
  const i = VT.data.findIndex(r => r.id === S.focus);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Home' || e.key === 'End') {
    const page = Math.max(1, Math.floor(VT.wrap.clientHeight / VT.rh) - 1);
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page, Home: -Infinity, End: Infinity }[e.key];
    const j = Math.max(0, Math.min(VT.data.length - 1, (i < 0 ? (step > 0 ? -1 : 0) : i) + step));
    vtReveal(j); setFocus(VT.data[j].id, false); e.preventDefault();
  }
  if (e.key === 'Enter' && S.focus && !e.target.closest('a,button')) location.hash = '#/t/' + S.focus;
});
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('bt.theme', t); } catch { }
  $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const keepSide = sideVisible();
  go();
  if (keepSide) setSide(true);
}
$('#themeSeg').onclick = e => { const b = e.target.closest('[data-t]'); if (b) setTheme(b.dataset.t); };
$$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')));
$('#navBtn').onclick = () => {
  if (!matchMedia('(max-width:900px)').matches) { S.navMini = !S.navMini; save(); $('#layout').classList.toggle('nav-mini', S.navMini); setTimeout(() => { charts.forEach(c => c.resize()); if (pvChart) pvChart.resize(); }, 320); return; }
  const open = !$('#layout').classList.contains('nav-open'); $('#layout').classList.toggle('nav-open', open); $('#navScrim').classList.toggle('open', open);
};
$('#layout').classList.toggle('nav-mini', !!S.navMini);
$('#navScrim').onclick = closeNav;
$('#sideScrim').onclick = () => setSide(false);
const g = new Date(I.generated);
const gTxt = `${g.toLocaleDateString('pt-BR')} ${g.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
$('#genInfo').textContent = `Dados atualizados · ${gTxt}`;
$('#genInfo').title = `${nf(I.count, 0)} relatórios no índice`;
$('#navData').innerHTML = `<b>${nf(I.count, 0)} relatórios</b>${ASSETS.length} ativos · ${TFS.length} timeframes<br>índice de ${gTxt}`;
updateCmpBadge();
go();
})();
