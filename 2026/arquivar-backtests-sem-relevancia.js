/*
  Separa do painel, sem apagar, testes que não acrescentam evidência nova.
  Uso: node 2026/arquivar-backtests-sem-relevancia.js [--apply]
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.resolve(__dirname);
const INDEX = path.join(ROOT, '00_Indice', 'indice-backtests-2026.csv');
const ARCHIVE = path.join(ROOT, '00_Arquivados', 'Sem_relevancia_painel');
const ARCHIVE_CSV = path.join(ARCHIVE, 'indice-arquivados-sem-relevancia.csv');
const PLAN = path.join(ARCHIVE, 'plano-arquivamento-sem-relevancia.json');
const DATA = path.resolve(__dirname, '..', 'painel', 'dados', 'indice.js');
const APPLY = process.argv.includes('--apply');

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const records = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === ';' && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(v => v !== '')) records.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  const [headers, ...body] = records;
  return { headers, rows: body.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))) };
}
function esc(v) { return '"' + String(v ?? '').replaceAll('"', '""') + '"'; }
function writeCsv(file, headers, rows) { fs.writeFileSync(file, [headers.map(esc).join(';'), ...rows.map(r => headers.map(h => esc(r[h])).join(';'))].join('\r\n') + '\r\n', 'utf8'); }
function idOf(row) { return crypto.createHash('sha1').update((row.Origem || row.PastaDestino) + '|' + path.basename(row.Relatorio)).digest('hex').slice(0, 12); }
function inside(p) { const rel = path.relative(ROOT, path.resolve(p)); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); }
function loadStats() { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(DATA, 'utf8'), ctx); return ctx.window.BT_INDEX.rows; }
function duplicateKey(s) {
  return [s.a, s.tf, s.hb, s.from, s.to, s.cap, s.pl, s.ddbv, s.ddb, s.dde, s.pf, s.tr, s.risk, JSON.stringify(s.p || {})].join('|');
}
function reasonFolder(reason) { return reason === 'Baixa amostra (até 5 operações)' ? 'baixa_amostra' : 'duplicado_exato'; }

const { headers, rows } = readCsv(INDEX);
const stats = loadStats();
const statById = new Map(stats.map(s => [s.id, s]));
if (statById.size !== rows.length) throw new Error(`Índice e painel não coincidem: CSV=${rows.length}, painel=${statById.size}`);
const missing = rows.filter(r => !statById.has(idOf(r)));
if (missing.length) throw new Error(`${missing.length} linha(s) não encontrada(s) no painel`);

const archived = new Map();
// Até cinco operações não é uma amostra apropriada para comparar estratégias.
for (const row of rows) {
  const stat = statById.get(idOf(row));
  if (stat.tr <= 5) archived.set(stat.id, { reason: 'Baixa amostra (até 5 operações)', retained: '' });
}
// Resultados e parâmetros iguais no mesmo ativo/TF/período são cópias: uma basta.
const groups = new Map();
for (const row of rows) {
  const stat = statById.get(idOf(row));
  const key = duplicateKey(stat); (groups.get(key) || groups.set(key, []).get(key)).push({ row, stat });
}
for (const group of groups.values()) {
  const eligible = group.filter(x => !archived.has(x.stat.id));
  if (eligible.length < 2) continue;
  eligible.sort((a, b) => Number(a.row.Posicao || Infinity) - Number(b.row.Posicao || Infinity) || a.stat.id.localeCompare(b.stat.id));
  const kept = eligible[0].stat.id;
  for (const item of eligible.slice(1)) archived.set(item.stat.id, { reason: 'Duplicado exato de resultado e configuração', retained: kept });
}

const plan = [];
for (const row of rows) {
  const id = idOf(row), why = archived.get(id);
  if (!why) continue;
  const source = path.resolve(row.PastaDestino), report = path.resolve(row.Relatorio);
  if (!inside(source) || !inside(report) || !fs.existsSync(source) || !fs.existsSync(report)) throw new Error(`Pasta ou relatório inválido: ${source}`);
  const target = path.join(ARCHIVE, reasonFolder(why.reason), row.Ativo, row.Timeframe, path.basename(source));
  if (!inside(target)) throw new Error(`Destino fora da biblioteca: ${target}`);
  plan.push({ id, motivo: why.reason, mantido: why.retained || null, antes: source, depois: target, row });
}
for (const item of plan) if (fs.existsSync(item.depois) && path.resolve(item.antes) !== path.resolve(item.depois)) throw new Error(`Destino já existe: ${item.depois}`);
fs.mkdirSync(ARCHIVE, { recursive: true });
fs.writeFileSync(PLAN, JSON.stringify({ geradoEm: new Date().toISOString(), aplicar: APPLY, total: plan.length, baixaAmostra: plan.filter(x => x.motivo.startsWith('Baixa')).length, duplicados: plan.filter(x => x.motivo.startsWith('Duplicado')).length, testes: plan.map(({ row, ...x }) => x) }, null, 2), 'utf8');
console.log(`Plano: ${plan.length} testes a separar (${plan.filter(x => x.motivo.startsWith('Baixa')).length} por baixa amostra; ${plan.filter(x => x.motivo.startsWith('Duplicado')).length} duplicados exatos).`);
console.log(`Manifesto: ${PLAN}`);
if (!APPLY) { console.log('Nada foi movido. Use --apply para confirmar.'); process.exit(0); }

const archiveHeaders = [...headers, 'MotivoArquivamento', 'BacktestMantidoId', 'DataArquivamento'];
const prior = fs.existsSync(ARCHIVE_CSV) ? readCsv(ARCHIVE_CSV).rows : [];
const when = new Date().toISOString();
for (const item of plan) {
  fs.mkdirSync(path.dirname(item.depois), { recursive: true });
  fs.renameSync(item.antes, item.depois);
  const r = { ...item.row, PastaDestino: item.depois, Relatorio: path.join(item.depois, path.basename(item.row.Relatorio)), MotivoArquivamento: item.motivo, BacktestMantidoId: item.mantido || '', DataArquivamento: when };
  prior.push(r);
}
writeCsv(INDEX, headers, rows.filter(r => !archived.has(idOf(r))));
writeCsv(ARCHIVE_CSV, archiveHeaders, prior);
console.log(`Concluído: ${plan.length} testes foram preservados em ${ARCHIVE} e removidos somente do índice do painel.`);
