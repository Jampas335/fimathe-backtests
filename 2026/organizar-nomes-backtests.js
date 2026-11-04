'use strict';

// Padroniza as pastas registradas no índice sem alterar os arquivos de origem.
// Uso seguro (somente prévia): node organizar-nomes-backtests.js
// Aplicar de fato:           node organizar-nomes-backtests.js --apply

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const INDEX = path.join(ROOT, '00_Indice', 'indice-backtests-2026.csv');
const PLAN = path.join(ROOT, '00_Indice', 'plano-renomeacao-backtests.json');
const APPLY = process.argv.includes('--apply');

const decode = b => b[0] === 0xff && b[1] === 0xfe ? b.toString('utf16le').slice(1) : b.toString('utf8').replace(/^\uFEFF/, '');
const strip = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').trim();
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const safe = s => String(s || '').replace(/[<>:"/\\|?*]/g, '-').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').replace(/[- ]+$/g, '').trim();
const compact = v => String(v ?? '').trim().replace(/\.0+$/, '').replace(/[^0-9A-Za-z.,-]/g, '');
const insideRoot = p => {
  const resolved = path.resolve(p);
  const prefix = ROOT.toLowerCase() + path.sep;
  return resolved.toLowerCase().startsWith(prefix);
};

function readCsv(file) {
  const lines = decode(fs.readFileSync(file)).trim().split(/\r?\n/);
  const parse = line => {
    const out = []; let text = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (quoted && line[i + 1] === '"') { text += '"'; i++; } else quoted = !quoted; }
      else if (c === ';' && !quoted) { out.push(text); text = ''; }
      else text += c;
    }
    out.push(text); return out;
  };
  const headers = parse(lines[0]);
  return { headers, rows: lines.slice(1).filter(Boolean).map(line => Object.fromEntries(headers.map((h, i) => [h, parse(line)[i] || '']))) };
}
function writeCsv(file, headers, rows) {
  const text = [headers.map(csvCell).join(';'), ...rows.map(r => headers.map(h => csvCell(r[h])).join(';'))].join('\r\n') + '\r\n';
  fs.writeFileSync(file, '\uFEFF' + text, 'utf8');
}
function paramsFrom(html) {
  const params = {};
  for (const m of html.matchAll(/<b>([\s\S]*?)<\/b>/gi)) {
    const value = strip(m[1]); const at = value.indexOf('=');
    if (at > 0) params[value.slice(0, at).trim()] = value.slice(at + 1).trim();
  }
  return params;
}
function brokerFrom(html) {
  const candidates = [...html.matchAll(/<td[^>]*colspan="13"[^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>/gi)].map(m => strip(m[1]));
  const raw = candidates.find(v => /\bbuild\b/i.test(v)) || '';
  const broker = raw.replace(/\s*\(Build[^)]*\)\s*/i, '').replace(/-MT[45]$/i, '').trim();
  return safe(broker || 'Corretora-nao-informada');
}
function sourceFrom(collection) {
  const key = String(collection || '').toLowerCase();
  if (key.includes('daniel')) return 'Daniel';
  if (key.includes('exploracao codex')) return 'Codex';
  // A coleção "Achei interessante" reúne os testes feitos e salvos
  // manualmente pelo Janderson; a autoria deve aparecer primeiro no nome.
  if (key.includes('achei')) return 'Janderson';
  return 'Fimathe';
}
function periodFrom(row) {
  const m = String(row.Periodo || '').match(/(\d{4}\.\d\d\.\d\d)\s*-\s*(\d{4}\.\d\d\.\d\d)/);
  if (m) return `${m[1]}_a_${m[2]}`;
  return /^\d{4}\.\d\d\.\d\d_a_\d{4}\.\d\d\.\d\d$/.test(String(row.Periodo || '')) ? row.Periodo : 'periodo-nao-informado';
}
function periodFromHtml(html) {
  const m = strip(html).match(/(?:Período|Period):\s*([A-Z0-9]+)\s*\((\d{4}\.\d\d\.\d\d)\s*-\s*(\d{4}\.\d\d\.\d\d)\)/i);
  return m ? `${m[2]}_a_${m[3]}` : 'periodo-nao-informado';
}
function canonicalName(row, broker, p, id) {
  const parts = [
    `(${sourceFrom(row.Colecao)})`, `[${broker}]`, '-', `${row.Ativo || 'SEM-ATIVO'} ${row.Timeframe || 'SEM-TF'}`,
    '-', row.HoraMarcacaoBrasil || 'horario-nao-informado',
  ];
  const cfg = [];
  if (p.CandlesParaFormacao) cfg.push(`C${compact(p.CandlesParaFormacao)}`);
  if (p.TamanhoMinimoCanal_Pontos) cfg.push(`CH${compact(p.TamanhoMinimoCanal_Pontos)}`);
  if (p.TakeProfit_PercentualCanal) cfg.push(`TP${compact(p.TakeProfit_PercentualCanal)}`);
  if (p.UsarViradaDeMao === 'true') cfg.push('VM'); else if (p.UsarViradaDeMao === 'false') cfg.push('sem-VM');
  if (p.UsarEntradaPullback === 'true') cfg.push(`PB${compact(p.DistanciaPullback_Percent) || 'on'}`); else if (p.UsarEntradaPullback === 'false') cfg.push('sem-PB');
  if (cfg.length) parts.push('-', cfg.join(' '));
  if (p.RiscoPorTrade_Percent) parts.push('-', `R${compact(p.RiscoPorTrade_Percent)}`);
  parts.push('-', periodFrom(row), '-', id);
  const full = safe(parts.join(' '));
  // Mantém margem para o caminho completo do Windows. O identificador nunca é removido.
  const suffix = ` - ${id}`;
  return full.length > 142 ? `${full.slice(0, 142 - suffix.length).trim()}${suffix}` : full;
}

if (!fs.existsSync(INDEX)) throw new Error(`Índice não encontrado: ${INDEX}`);
const { headers, rows } = readCsv(INDEX);
// Baterias antigas podem ter salvo o índice sem as colunas de proveniência.
// Recrie-as antes de escrever, preservando a autoria/corretora na próxima
// organização em vez de perder o padrão de nomes já adotado.
for (const field of ['Autor', 'Corretora', 'NomePadrao']) if (!headers.includes(field)) headers.push(field);
const plan = [];
for (const row of rows) {
  const source = path.resolve(row.PastaDestino);
  const report = path.resolve(row.Relatorio);
  if (!insideRoot(source) || !insideRoot(report)) throw new Error(`Caminho fora da biblioteca: ${source}`);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error(`Pasta do teste não encontrada: ${source}`);
  if (!fs.existsSync(report)) throw new Error(`Relatório não encontrado: ${report}`);
  const html = decode(fs.readFileSync(report));
  const id = crypto.createHash('sha1').update(`${row.Origem || source}|${path.basename(report)}`).digest('hex').slice(0, 8);
  const broker = brokerFrom(html), name = canonicalName(row, broker, paramsFrom(html), id);
  const destination = path.join(ROOT, safe(row.Ativo || 'SEM_ATIVO'), safe(row.Timeframe || 'SEM_TIMEFRAME'), name);
  if (!insideRoot(destination)) throw new Error(`Destino fora da biblioteca: ${destination}`);
  plan.push({ id, origem: sourceFrom(row.Colecao), corretora: broker, ativo: row.Ativo, timeframe: row.Timeframe, antes: source, depois: destination, relatorioAntes: report, relatorioDepois: path.join(destination, path.basename(report)), nome: name, row });
}

const sourceSet = new Set(), destinationSet = new Set();
for (const item of plan) {
  const s = item.antes.toLowerCase(), d = item.depois.toLowerCase();
  if (sourceSet.has(s)) throw new Error(`Pasta de origem repetida no índice: ${item.antes}`);
  if (destinationSet.has(d)) throw new Error(`Colisão de nome planejada: ${item.depois}`);
  sourceSet.add(s); destinationSet.add(d);
  if (fs.existsSync(item.depois) && path.resolve(item.antes) !== path.resolve(item.depois)) throw new Error(`Destino já existe: ${item.depois}`);
}

// Há testes físicos que ainda não entraram no índice do painel (por exemplo,
// a versão curta que originou uma validação de três anos). Eles também entram
// no padrão de pastas, mas são mantidos marcados como "sem índice" até que
// tenham suas métricas importadas para o painel.
const unindexed = [];
for (const assetDir of fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('00_'))) {
  const assetPath = path.join(ROOT, assetDir.name);
  for (const tfDir of fs.readdirSync(assetPath, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const tfPath = path.join(assetPath, tfDir.name);
    for (const testDir of fs.readdirSync(tfPath, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const source = path.join(tfPath, testDir.name);
      if (sourceSet.has(source.toLowerCase())) continue;
      const reportName = fs.readdirSync(source).find(f => /\.html?$/i.test(f));
      if (!reportName) continue;
      const report = path.join(source, reportName), html = decode(fs.readFileSync(report));
      const p = paramsFrom(html);
      const inferredCollection = /daniel/i.test(testDir.name) ? 'Daniel' : /^F48/i.test(testDir.name.replace(/^\d+__[^_]+__[^_]+__/, '')) ? 'Exploracao Codex 48.5' : 'Estudos Fimathe';
      const row = { Ativo: assetDir.name, Timeframe: tfDir.name, HoraMarcacaoBrasil: p.HorariosOperacionais === '3' ? '21h' : p.HorariosOperacionais === '0' ? '19h' : 'horario-nao-informado', Periodo: periodFromHtml(html), Colecao: inferredCollection };
       // Pastas ainda fora do índice não possuem uma chave CSV estável. Depois
       // da primeira padronização, preserve o id que já está no nome para que
       // uma nova execução do organizador não as renomeie outra vez.
       const existingId = testDir.name.match(/ - ([a-f0-9]{8})$/i)?.[1];
       const id = existingId || crypto.createHash('sha1').update(`${source}|${reportName}`).digest('hex').slice(0, 8);
      const broker = brokerFrom(html), name = canonicalName(row, broker, p, id);
      const destination = path.join(ROOT, assetDir.name, tfDir.name, name);
       if (destinationSet.has(destination.toLowerCase()) || (fs.existsSync(destination) && path.resolve(source) !== path.resolve(destination))) throw new Error(`Colisão de nome não indexada: ${destination}`);
      const item = { id, origem: sourceFrom(row.Colecao), corretora: broker, ativo: row.Ativo, timeframe: row.Timeframe, antes: source, depois: destination, relatorioAntes: report, relatorioDepois: path.join(destination, reportName), nome: name, semIndice: true };
      plan.push(item); unindexed.push(item); sourceSet.add(source.toLowerCase()); destinationSet.add(destination.toLowerCase());
    }
  }
}

fs.writeFileSync(PLAN, JSON.stringify({ geradoEm: new Date().toISOString(), total: plan.length, indexados: plan.length - unindexed.length, semIndice: unindexed.length, aplicar: APPLY, testes: plan.map(({ row, ...item }) => item) }, null, 2), 'utf8');
console.log(`Plano gerado: ${plan.length} backtests`);
console.log(`Prévia: ${PLAN}`);
console.log(`Exemplo: ${plan[0]?.nome || 'nenhum'}`);
if (!APPLY) { console.log('Nada foi movido. Use --apply para aplicar o plano.'); process.exit(0); }

let moved = 0;
for (const item of plan) {
  if (path.resolve(item.antes) === path.resolve(item.depois)) continue;
  fs.mkdirSync(path.dirname(item.depois), { recursive: true });
  fs.renameSync(item.antes, item.depois);
  if (item.row) {
    item.row.PastaDestino = item.depois;
    item.row.Relatorio = item.relatorioDepois;
    item.row.Autor = item.origem;
    item.row.Corretora = item.corretora;
    item.row.NomePadrao = item.nome;
  }
  moved++;
}
for (const row of rows) {
  if (!row.Autor) row.Autor = sourceFrom(row.Colecao);
  if (!row.Corretora) row.Corretora = 'Corretora-nao-informada';
}
for (const h of ['Autor', 'Corretora', 'NomePadrao']) if (!headers.includes(h)) headers.push(h);
writeCsv(INDEX, headers, rows);
if (unindexed.length) writeCsv(path.join(ROOT, '00_Indice', 'backtests-sem-indice.csv'), ['Autor', 'Corretora', 'Ativo', 'Timeframe', 'PastaDestino', 'Relatorio', 'NomePadrao'], unindexed.map(x => ({ Autor: x.origem, Corretora: x.corretora, Ativo: x.ativo, Timeframe: x.timeframe, PastaDestino: x.depois, Relatorio: x.relatorioDepois, NomePadrao: x.nome })));
console.log(`Concluído: ${moved} pastas renomeadas; índice atualizado.`);
