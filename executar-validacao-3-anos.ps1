param(
    # A rodada atual revalida somente os resultados promissores que começaram
    # em 2026. Use -IncludeLongHistory apenas quando quiser reexecutar também
    # estudos que já possuem a janela longa.
    [int]$MaxRuns = 30,
    [switch]$Resume,
    [switch]$IncludeLongHistory,
    # Revalida uma autoria específica sem deduplicar configurações. Útil para
    # atualizar o próprio backtest do autor (por exemplo, Janderson), mesmo
    # quando outro relatório tem inputs parecidos.
    [string]$SomenteAutor = ''
)

$ErrorActionPreference = 'Stop'

# Escopo fechado: este script so abre o terminal MetaQuotes autorizado.
$Terminal = 'C:\Program Files\MetaTrader 5\terminal64.exe'
$Profile = 'C:\Users\noobg\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075'
$Root = 'E:\Area de Trabalho\Trade\Fimathe\Backtests'
$IndexPath = Join-Path $Root '2026\00_Indice\indice-backtests-2026.csv'
$RunLabel = if ([string]::IsNullOrWhiteSpace($SomenteAutor)) { 'validacao-3-anos' } else { 'validacao-3-anos-' + ($SomenteAutor -replace '[^A-Za-z0-9_-]', '') }
$WorkRoot = Join-Path $Root ('2026\00_Indice\' + $RunLabel)
$ConfigRoot = Join-Path 'C:\FimatheRunConfigs' ($RunLabel -replace '[^A-Za-z0-9_-]', '')
$EaSourceRoot = 'E:\Area de Trabalho\Trade\Fimathe\EA''s'
$FromDate = '2023.11.01'
$ToDate = '2026.10.31'
$Culture = [System.Globalization.CultureInfo]::InvariantCulture
$Columns = @(
    'Colecao','Ativo','Timeframe','HoraServidor','HoraMarcacaoBrasil','Posicao','FaixaRisco','Score',
    'CapitalInicial','LucroLiquido','LucroPercentual','DrawdownCapitalInicialValor','DrawdownCapitalInicialPercent',
    'DrawdownEquityPicoPercent','ProfitFactor','Trades','Periodo','PastaDestino','Relatorio','Origem','DataAdicao',
    'Autor','Corretora','NomePadrao'
)

function Write-RunLog([string]$Text) {
    $line = ('{0:yyyy-MM-dd HH:mm:ss} | {1}' -f (Get-Date), $Text)
    Add-Content -LiteralPath (Join-Path $WorkRoot 'execucao.log') -Value $line -Encoding UTF8
    Write-Output $line
}

function Convert-Number([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return [double]::NaN }
    $text = $Value.Trim() -replace '\s',''
    $comma = $text.LastIndexOf(',')
    $dot = $text.LastIndexOf('.')
    if ($comma -ge 0 -and $dot -ge 0) {
        if ($comma -gt $dot) { $text = $text.Replace('.','').Replace(',','.') }
        else { $text = $text.Replace(',','') }
    } elseif ($comma -ge 0) { $text = $text.Replace(',','.') }
    return [double]::Parse($text, $Culture)
}

function Format-Br([double]$Value) {
    if ([double]::IsNaN($Value)) { return '' }
    return $Value.ToString('0.####', $Culture).Replace('.', ',')
}

function Get-HtmlMetric([string]$Html, [string]$LabelPattern) {
    $match = [regex]::Match($Html, "(?is)<td\b[^>]*>\s*$LabelPattern\s*</td>\s*<td\b[^>]*>\s*<b>([^<]+)</b>")
    if (-not $match.Success) { return '' }
    return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim()
}

function Get-ReportMetrics([string]$ReportPath) {
    $html = Get-Content -LiteralPath $ReportPath -Raw
    $capital = Convert-Number (Get-HtmlMetric $html 'Dep.sito Inicial:')
    $profit = Convert-Number (Get-HtmlMetric $html 'Lucro L.quido Total:')
    $ddInitial = Convert-Number (Get-HtmlMetric $html 'Rebaixamento Absoluto do Capital L.quido:')
    $ddEquityRaw = Get-HtmlMetric $html 'Rebaixamento M.ximo do Capital L.quido:'
    $ddEquity = [double]::NaN
    $match = [regex]::Match($ddEquityRaw, '\(([0-9.,]+)%\)')
    if ($match.Success) { $ddEquity = Convert-Number $match.Groups[1].Value }
    $pf = Convert-Number (Get-HtmlMetric $html 'Fator de Lucro:')
    $trades = Convert-Number (Get-HtmlMetric $html 'Total de Negocia..es:')
    [pscustomobject]@{
        Capital = $capital
        NetProfit = $profit
        ProfitPercent = if ($capital -gt 0) { 100 * $profit / $capital } else { [double]::NaN }
        DDInitialValue = $ddInitial
        DDInitialPercent = if ($capital -gt 0) { 100 * $ddInitial / $capital } else { [double]::NaN }
        DDEquityPercent = $ddEquity
        ProfitFactor = $pf
        Trades = $trades
    }
}

function Get-SetFromReport([string]$ReportPath) {
    $html = Get-Content -LiteralPath $ReportPath -Raw
    $items = [regex]::Matches($html, '(?is)<b>\s*([A-Za-z_][A-Za-z0-9_]*=[^<\r\n]+?)\s*</b>') |
        ForEach-Object { [System.Net.WebUtility]::HtmlDecode($_.Groups[1].Value).Trim() } |
        Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' }
    if (-not $items -or $items.Count -lt 10) { throw "Nao foi possivel reconstruir os inputs de $ReportPath" }
    return (($items | Select-Object -Unique) -join "`r`n") + "`r`n"
}

function Get-CandidateSet([pscustomobject]$Row) {
    # No Windows PowerShell 5.1, -LiteralPath e -Parent pertencem a conjuntos
    # diferentes de parametros. O caminho vem do CSV controlado localmente.
    $folder = Split-Path -Path $Row.Relatorio -Parent
    $set = Get-ChildItem -LiteralPath $folder -Filter '*.set' -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($set) { return (Get-Content -LiteralPath $set.FullName -Raw) }
    return Get-SetFromReport $Row.Relatorio
}

function Get-EaFileName([pscustomobject]$Row) {
    $html = Get-Content -LiteralPath $Row.Relatorio -Raw
    $match = [regex]::Match($html, 'FimatheBot\s+([0-9]+(?:\.[0-9]+)?)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (-not $match.Success) { throw "Versao do EA nao encontrada em $($Row.Relatorio)" }
    return "FimatheBot $($match.Groups[1].Value).ex5"
}

function Assert-SafeEnvironment {
    if (-not (Test-Path -LiteralPath $Terminal)) { throw "Terminal autorizado nao encontrado: $Terminal" }
    if (-not (Test-Path -LiteralPath $Profile)) { throw "Perfil autorizado nao encontrado: $Profile" }
    # FTMO e Maven podem permanecer abertos. Esta checagem olha somente para
    # uma eventual bateria anterior iniciada por este próprio script; nunca
    # fecha, altera ou depende dos demais terminais.
    $ownRun = @(Get-CimInstance Win32_Process -Filter "Name='terminal64.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match [regex]::Escape($ConfigRoot) })
    if ($ownRun.Count -gt 0) { throw 'Ja existe uma bateria Fimathe em execucao no terminal isolado. Aguarde a conclusao antes de iniciar outra.' }
}

function Install-Ea([string]$EaFile) {
    $source = Join-Path $EaSourceRoot $EaFile
    $destination = Join-Path $Profile (Join-Path 'MQL5\Experts' $EaFile)
    # Algumas versoes ja estao compiladas exclusivamente no perfil de testes.
    # Nesse caso elas sao reutilizadas; nunca se procura nada em FTMO/Maven.
    if (-not (Test-Path -LiteralPath $source)) {
        if (Test-Path -LiteralPath $destination) { return }
        throw "EA de origem nao encontrado nem instalado no perfil autorizado: $EaFile"
    }
    if (-not (Test-Path -LiteralPath $destination) -or (Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $destination).Hash) {
        Copy-Item -LiteralPath $source -Destination $destination -Force
        Write-RunLog "EA copiado para o perfil isolado: $EaFile"
    }
}

function Save-Index([object[]]$Rows) {
    $Rows | Select-Object $Columns | Export-Csv -LiteralPath $IndexPath -Delimiter ';' -NoTypeInformation -Encoding UTF8
}

function Invoke-Validation([pscustomobject]$Candidate, [int]$Number) {
    Assert-SafeEnvironment
    Install-Ea $Candidate.EaFile

    $slug = 'V3A_{0:D2}_{1}_{2}_{3}' -f $Number,$Candidate.Row.Ativo,$Candidate.Row.Timeframe,$Candidate.Hash.Substring(0,8)
    $resultFolder = Join-Path $WorkRoot $slug
    New-Item -ItemType Directory -Force -Path $resultFolder,$ConfigRoot | Out-Null
    $setPath = Join-Path $resultFolder "$slug.set"
    Set-Content -LiteralPath $setPath -Value $Candidate.SetContent -Encoding ascii

    $reportBase = $slug
    $reportPath = Join-Path $Profile "$reportBase.htm"
    Get-ChildItem -LiteralPath $Profile -Filter "$reportBase*" -File -ErrorAction SilentlyContinue | Remove-Item -Force
    $inputLines = $Candidate.SetContent -split "`r?`n" | Where-Object { $_ -match '^[^;\s][^=]*=' }
    $ini = @(
        '[Tester]',
        "Expert=$($Candidate.EaFile)",
        "Symbol=$($Candidate.Row.Ativo)",
        "Period=$($Candidate.Row.Timeframe)",
        'Optimization=0', 'Model=0',
        "FromDate=$FromDate", "ToDate=$ToDate",
        'Deposit=10000', 'Currency=USD', 'Leverage=100', 'ExecutionMode=255', 'Visual=0',
        "Report=$reportBase", 'ReplaceReport=1', 'ShutdownTerminal=1', 'UseLocal=1', 'UseRemote=0', 'UseCloud=0',
        '', '[TesterInputs]'
    ) + $inputLines
    $iniPath = Join-Path $ConfigRoot "$slug.ini"
    Set-Content -LiteralPath $iniPath -Value $ini -Encoding ascii

    @(
        "# Validacao de tres anos - $slug",
        '',
        "Configuracao original: $($Candidate.Row.Relatorio)",
        "EA: $($Candidate.EaFile)",
        "Ativo / timeframe: $($Candidate.Row.Ativo) / $($Candidate.Row.Timeframe)",
        "Periodo: $FromDate a $ToDate",
        'Criterio: reexecucao da mesma configuracao, sem alterar seus inputs.'
    ) | Set-Content -LiteralPath (Join-Path $resultFolder 'ESPECIFICACAO.md') -Encoding UTF8

    Write-RunLog "INICIO $slug | EA=$($Candidate.EaFile) | origem=$($Candidate.Row.Relatorio)"
    $started = Get-Date
    $process = Start-Process -FilePath $Terminal -ArgumentList ('/config:' + $iniPath) -WindowStyle Hidden -PassThru
    # M5 com ticks reais de tres anos pode levar bem mais que os M15/M30.
    $deadline = (Get-Date).AddMinutes(40)
    do {
        Start-Sleep -Seconds 5
        $ready = (Test-Path -LiteralPath $reportPath) -and ((Get-Item -LiteralPath $reportPath).LastWriteTime -ge $started)
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) {
        # O PID pertence exclusivamente ao terminal isolado iniciado acima.
        if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) { Stop-Process -Id $process.Id -Force }
        throw "Relatorio nao criado em 40 minutos: $slug"
    }
    Start-Sleep -Seconds 2
    Get-ChildItem -LiteralPath $Profile -Filter "$reportBase*" -File | Copy-Item -Destination $resultFolder -Force
    $metric = Get-ReportMetrics $reportPath
    if ([double]::IsNaN($metric.Capital) -or [double]::IsNaN($metric.ProfitPercent)) { throw "Metricas invalidas em $slug" }
    @(
        "# Resultado - $slug", '',
        "Lucro liquido: $([math]::Round($metric.NetProfit,2))", "Lucro percentual: $([math]::Round($metric.ProfitPercent,4))%",
        "DD capital inicial: $([math]::Round($metric.DDInitialPercent,4))%", "DD equity do pico: $([math]::Round($metric.DDEquityPercent,4))%",
        "Profit Factor: $([math]::Round($metric.ProfitFactor,2))", "Trades: $([int]$metric.Trades)"
    ) | Set-Content -LiteralPath (Join-Path $resultFolder 'RESULTADO.md') -Encoding UTF8
    Get-ChildItem -LiteralPath $Profile -Filter "$reportBase*" -File | Remove-Item -Force
    Write-RunLog ('FIM {0} | lucro={1:N2}% | DD inicial={2:N2}% | DD equity={3:N2}% | PF={4:N2} | trades={5}' -f $slug,$metric.ProfitPercent,$metric.DDInitialPercent,$metric.DDEquityPercent,$metric.ProfitFactor,$metric.Trades)
    return [pscustomobject]@{ Folder=$resultFolder; Report=(Join-Path $resultFolder "$reportBase.htm"); Metric=$metric }
}

New-Item -ItemType Directory -Force -Path $WorkRoot,$ConfigRoot | Out-Null
Assert-SafeEnvironment
$rows = @(Import-Csv -LiteralPath $IndexPath -Delimiter ';')
# Indices antigos podem ainda nao ter as colunas de procedencia. Reconstrua
# apenas a identificacao necessaria para preservar o vinculo entre os
# relatorios manuais e suas entradas existentes; a organizacao final grava
# essas colunas de forma permanente.
foreach ($row in $rows) {
    if ([string]::IsNullOrWhiteSpace($row.Autor) -and
        (($row.Relatorio -match '\(Janderson\)') -or ($row.Colecao -eq 'Achei interessante'))) {
        $row | Add-Member -NotePropertyName Autor -NotePropertyValue 'Janderson' -Force
    }
}
$selected = @()
$seen = @{}
$candidates = $rows | ForEach-Object {
    $profit = Convert-Number $_.LucroPercentual
    $ddInitial = Convert-Number $_.DrawdownCapitalInicialPercent
    $ddEquity = Convert-Number $_.DrawdownEquityPicoPercent
    $periodStart = if ($_.Periodo -match '(\d{4}\.\d{2}\.\d{2})') { $Matches[1] } else { '' }
    [pscustomobject]@{ Row=$_; Profit=$profit; DDInitial=$ddInitial; DDEquity=$ddEquity; PeriodStart=$periodStart; Quality=if($ddInitial -gt 0){$profit/[math]::Max($ddInitial,0.25)}else{-1} }
} | Where-Object {
    $_.Profit -ge 45 -and $_.DDInitial -gt 0 -and $_.DDInitial -le 9 -and
    # O DD sobre o capital inicial e o limite prioritario de prop firm.
    # Equity continua registrado, mas nao elimina uma validacao solicitada
    # apenas por exceder esse segundo indicador.
    ([string]::IsNullOrWhiteSpace($SomenteAutor) -or $_.DDEquity -le 12 -or $_.Row.Autor -eq $SomenteAutor) -and
    ([string]::IsNullOrWhiteSpace($SomenteAutor) -or $_.Row.Autor -eq $SomenteAutor) -and
    ($IncludeLongHistory -or $_.PeriodStart -ge '2026.01.01')
} | Sort-Object @{Expression='Quality';Descending=$true},@{Expression='Profit';Descending=$true}

foreach ($candidate in $candidates) {
    try {
        if (-not (Test-Path -LiteralPath $candidate.Row.Relatorio)) { continue }
        $setContent = Get-CandidateSet $candidate.Row
        $bytes = [Text.Encoding]::UTF8.GetBytes(($setContent -replace "`r?`n", "`n").Trim())
        $hash = ([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
        if ([string]::IsNullOrWhiteSpace($SomenteAutor) -and $seen.ContainsKey($hash)) { continue }
        $ea = Get-EaFileName $candidate.Row
        if (-not (Test-Path -LiteralPath (Join-Path $EaSourceRoot $ea)) -and -not (Test-Path -LiteralPath (Join-Path $Profile (Join-Path 'MQL5\Experts' $ea)))) { continue }
        $seen[$hash] = $true
        $selected += [pscustomobject]@{ Row=$candidate.Row; SetContent=$setContent; Hash=$hash; EaFile=$ea; Quality=$candidate.Quality }
        if ($selected.Count -ge $MaxRuns) { break }
    } catch {
        Write-RunLog "PULAR origem=$($candidate.Row.Relatorio) | $($_.Exception.Message)"
    }
}
if ($selected.Count -eq 0) { throw 'Nenhuma configuracao elegivel e reproduzivel foi encontrada.' }
$selected | ForEach-Object { [pscustomobject]@{ Ativo=$_.Row.Ativo; Timeframe=$_.Row.Timeframe; Lucro2026=$_.Row.LucroPercentual; DDInicial2026=$_.Row.DrawdownCapitalInicialPercent; DDEquity2026=$_.Row.DrawdownEquityPicoPercent; EA=$_.EaFile; RelatorioOriginal=$_.Row.Relatorio; Hash=$_.Hash } } | Export-Csv -LiteralPath (Join-Path $WorkRoot 'selecao.csv') -NoTypeInformation -Encoding UTF8
Write-RunLog "SELECAO pronta: $($selected.Count) configuracoes unicas | janela=$FromDate-$ToDate"

$runNumber = 0
foreach ($candidate in $selected) {
    $runNumber++
    $existing = Join-Path $WorkRoot ('V3A_{0:D2}_{1}_{2}_{3}' -f $runNumber,$candidate.Row.Ativo,$candidate.Row.Timeframe,$candidate.Hash.Substring(0,8))
    if ($Resume -and (Test-Path -LiteralPath (Join-Path $existing 'RESULTADO.md'))) { Write-RunLog "PULAR concluido: $existing"; continue }
    try {
        $result = Invoke-Validation $candidate $runNumber
        $m = $result.Metric
        $candidate.Row.CapitalInicial = Format-Br $m.Capital
        $candidate.Row.LucroLiquido = Format-Br $m.NetProfit
        $candidate.Row.LucroPercentual = Format-Br $m.ProfitPercent
        $candidate.Row.DrawdownCapitalInicialValor = Format-Br $m.DDInitialValue
        $candidate.Row.DrawdownCapitalInicialPercent = Format-Br $m.DDInitialPercent
        $candidate.Row.DrawdownEquityPicoPercent = Format-Br $m.DDEquityPercent
        $candidate.Row.ProfitFactor = Format-Br $m.ProfitFactor
        $candidate.Row.Trades = [string][int]$m.Trades
        $candidate.Row.Score = Format-Br ($m.ProfitPercent / [math]::Max($m.DDInitialPercent,0.25))
        $candidate.Row.Periodo = "$($candidate.Row.Timeframe) ($FromDate - $ToDate)"
        $candidate.Row.PastaDestino = $result.Folder
        $candidate.Row.Relatorio = $result.Report
        $candidate.Row.Origem = "$($candidate.Row.Origem) | validacao-3-anos"
        Save-Index $rows
    } catch {
        Write-RunLog "FALHA $runNumber | $($_.Exception.Message)"
    }
}
Write-RunLog 'CONCLUIDO: validacao de tres anos finalizada. Recrie os dados do painel antes do deploy.'
