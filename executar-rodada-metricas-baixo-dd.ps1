param([switch]$Resume)

$ErrorActionPreference = 'Stop'

# Escopo deliberadamente fechado no terminal isolado autorizado.
$Terminal = 'C:\Program Files\MetaTrader 5\terminal64.exe'
$Profile = 'C:\Users\noobg\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075'
$Root = 'E:\Area de Trabalho\Trade\Fimathe\Backtests'
$Index = Join-Path $Root '2026\00_Indice\indice-backtests-2026.csv'
$RunLabel = 'rodada-metricas-baixo-dd'
$WorkRoot = Join-Path $Root "2026\00_Indice\$RunLabel"
$ConfigRoot = Join-Path 'C:\FimatheRunConfigs' $RunLabel
$EaSource = 'E:\Area de Trabalho\Trade\Fimathe\EA''s'
$FromDate = '2023.11.01'
$ToDate = '2026.10.31'
$Culture = [Globalization.CultureInfo]::InvariantCulture

function Log([string]$Text) {
    $line = '{0:yyyy-MM-dd HH:mm:ss} | {1}' -f (Get-Date),$Text
    Add-Content -LiteralPath (Join-Path $WorkRoot 'execucao.log') -Encoding UTF8 -Value $line
    Write-Output $line
}

function Number([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return [double]::NaN }
    $s = $Value.Trim() -replace '\s',''
    $comma = $s.LastIndexOf(','); $dot = $s.LastIndexOf('.')
    if ($comma -ge 0 -and $dot -ge 0) {
        if ($comma -gt $dot) { $s = $s.Replace('.','').Replace(',','.') }
        else { $s = $s.Replace(',','') }
    } elseif ($comma -ge 0) { $s = $s.Replace(',','.') }
    return [double]::Parse($s,$Culture)
}

function Format-Br([double]$Value) {
    if ([double]::IsNaN($Value)) { return '' }
    return $Value.ToString('0.####',$Culture).Replace('.',',')
}

function MetricText([string]$Html,[string]$Label) {
    $m = [regex]::Match($Html,"(?is)<td\b[^>]*>\s*$Label\s*</td>\s*<td\b[^>]*>\s*<b>([^<]+)</b>")
    if (!$m.Success) { return '' }
    return [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value).Trim()
}

function Metrics([string]$Path) {
    $html = Get-Content -LiteralPath $Path -Raw
    $capital = Number (MetricText $html 'Dep.sito Inicial:')
    $profit = Number (MetricText $html 'Lucro L.quido Total:')
    $ddValue = Number (MetricText $html 'Rebaixamento Absoluto do Capital L.quido:')
    $ddText = MetricText $html 'Rebaixamento M.ximo do Capital L.quido:'
    $ddm = [regex]::Match($ddText,'\(([0-9.,]+)%\)')
    $pf = Number (MetricText $html 'Fator de Lucro:')
    $trades = Number (MetricText $html 'Total de Negocia..es:')
    return [pscustomobject]@{
        Capital=$capital; NetProfit=$profit
        ProfitPercent=if($capital -gt 0){100*$profit/$capital}else{[double]::NaN}
        DDInitialValue=$ddValue
        DDInitialPercent=if($capital -gt 0){100*$ddValue/$capital}else{[double]::NaN}
        DDEquityPercent=if($ddm.Success){Number $ddm.Groups[1].Value}else{[double]::NaN}
        ProfitFactor=$pf; Trades=$trades
    }
}

function InputsFrom([string]$Report) {
    $html = Get-Content -LiteralPath $Report -Raw
    $inputs = [regex]::Matches($html,'(?is)<b>\s*([A-Za-z_][A-Za-z0-9_]*=[^<\r\n]+?)\s*</b>') |
        ForEach-Object { [System.Net.WebUtility]::HtmlDecode($_.Groups[1].Value).Trim() } |
        Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } |
        Select-Object -Unique
    if ($inputs.Count -lt 20) { throw "Nao foi possivel ler os inputs de $Report" }
    return ($inputs -join "`r`n") + "`r`n"
}

function Set-Input([string]$Set,[string]$Name,[string]$Value) {
    $rx = "(?m)^$([regex]::Escape($Name))=.*$"
    if ($Set -match $rx) { return [regex]::Replace($Set,$rx,"$Name=$Value") }
    return $Set.TrimEnd() + "`r`n$Name=$Value`r`n"
}

function Install-Ea([string]$EaFile) {
    $to = Join-Path $Profile (Join-Path 'MQL5\Experts' $EaFile)
    $from = Join-Path $EaSource $EaFile
    if (!(Test-Path -LiteralPath $from)) {
        if (Test-Path -LiteralPath $to) { return }
        throw "EA nao encontrado no perfil isolado: $EaFile"
    }
    if (!(Test-Path -LiteralPath $to) -or (Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath $to).Hash) {
        Copy-Item -LiteralPath $from -Destination $to -Force
        Log "EA atualizado no perfil isolado: $EaFile"
    }
}

function Assert-Safe {
    if (!(Test-Path -LiteralPath $Terminal) -or !(Test-Path -LiteralPath $Profile)) { throw 'Terminal ou perfil isolado nao encontrado.' }
    $own = @(Get-CimInstance Win32_Process -Filter "Name='terminal64.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match [regex]::Escape($ConfigRoot) })
    if ($own.Count) { throw 'Ja ha uma rodada desta bateria em execucao no terminal isolado.' }
}

function Run-One([pscustomobject]$Variant,[int]$Number,[string]$BaseSet,[string]$EaFile) {
    Assert-Safe
    $slug = 'BDD_{0:D2}_{1}' -f $Number,$Variant.Id
    $folder = Join-Path $WorkRoot $slug
    $setPath = Join-Path $folder "$slug.set"
    $reportPath = Join-Path $Profile "$slug.htm"
    New-Item -ItemType Directory -Force -Path $folder,$ConfigRoot | Out-Null
    $set = $BaseSet
    foreach($key in $Variant.Changes.Keys){ $set = Set-Input $set $key ([string]$Variant.Changes[$key]) }
    $changeList = @($Variant.Changes.Keys | Sort-Object | ForEach-Object { '{0}={1}' -f $_,$Variant.Changes[$_] })
    $changesText = $changeList -join '; '
    Set-Content -LiteralPath $setPath -Value $set -Encoding ascii
    Get-ChildItem -LiteralPath $Profile -Filter "$slug*" -File -ErrorAction SilentlyContinue | Remove-Item -Force
    $inputs = $set -split "`r?`n" | Where-Object { $_ -match '^[^;\s][^=]*=' }
    $ini = @(
        '[Tester]', "Expert=$EaFile", 'Symbol=XAUUSD', 'Period=M15', 'Optimization=0', 'Model=0',
        "FromDate=$FromDate", "ToDate=$ToDate", 'Deposit=10000', 'Currency=USD', 'Leverage=100',
        'ExecutionMode=255', 'Visual=0', "Report=$slug", 'ReplaceReport=1', 'ShutdownTerminal=1',
        'UseLocal=1', 'UseRemote=0', 'UseCloud=0', '', '[TesterInputs]'
    ) + $inputs
    $iniPath = Join-Path $ConfigRoot "$slug.ini"
    Set-Content -LiteralPath $iniPath -Value $ini -Encoding ascii
    @(
        "# $($Variant.Label)", '',
        'Rodada: otimização controlada de métricas / baixo drawdown.',
        "Base: $($Variant.Base)",
        "Alterações isoladas: $changesText",
        "Período: $FromDate a $ToDate", 'Risco por trade preservado: 0,9%.',
        'Não é recomendação de operação; exige comparação com a base.'
    ) | Set-Content -LiteralPath (Join-Path $folder 'ESPECIFICACAO.md') -Encoding UTF8
    Log "INICIO $slug | $($Variant.Label)"
    $started = Get-Date
    $p = Start-Process -FilePath $Terminal -ArgumentList ('/config:' + $iniPath) -WindowStyle Hidden -PassThru
    $deadline = (Get-Date).AddMinutes(40)
    do { Start-Sleep -Seconds 5; $ready = (Test-Path -LiteralPath $reportPath) -and ((Get-Item -LiteralPath $reportPath).LastWriteTime -ge $started) } while (!$ready -and (Get-Date) -lt $deadline)
    if (!$ready) { if(Get-Process -Id $p.Id -ErrorAction SilentlyContinue){Stop-Process -Id $p.Id -Force}; throw "Relatorio nao criado em 40 minutos: $slug" }
    Start-Sleep -Seconds 2
    Get-ChildItem -LiteralPath $Profile -Filter "$slug*" -File | Copy-Item -Destination $folder -Force
    $m = Metrics $reportPath
    if([double]::IsNaN($m.ProfitPercent)){throw "Metricas invalidas: $slug"}
    @(
        "# Resultado - $($Variant.Label)", '',
        "Lucro líquido: $([math]::Round($m.NetProfit,2))", "Lucro: $([math]::Round($m.ProfitPercent,4))%",
        "DD capital inicial: $([math]::Round($m.DDInitialPercent,4))%", "DD equity do pico: $([math]::Round($m.DDEquityPercent,4))%",
        "Profit Factor: $([math]::Round($m.ProfitFactor,2))", "Trades: $([int]$m.Trades)"
    ) | Set-Content -LiteralPath (Join-Path $folder 'RESULTADO.md') -Encoding UTF8
    Get-ChildItem -LiteralPath $Profile -Filter "$slug*" -File | Remove-Item -Force
    Log ('FIM {0} | lucro={1:N2}% | DD inicial={2:N2}% | DD equity={3:N2}% | PF={4:N2} | trades={5}' -f $slug,$m.ProfitPercent,$m.DDInitialPercent,$m.DDEquityPercent,$m.ProfitFactor,$m.Trades)
    return [pscustomobject]@{Id=$Variant.Id;Label=$Variant.Label;Folder=$folder;Report=(Join-Path $folder "$slug.htm");Metric=$m;Changes=$changesText}
}

New-Item -ItemType Directory -Force -Path $WorkRoot,$ConfigRoot | Out-Null
Assert-Safe
$rows = Import-Csv -LiteralPath $Index -Delimiter ';'
$base = $rows | Where-Object { $_.Relatorio -match '37a146df' } | Select-Object -First 1
if (!$base) { throw 'Base PB27 (37a146df) nao encontrada no indice.' }
$eaMatch = [regex]::Match((Get-Content -LiteralPath $base.Relatorio -Raw),'FimatheBot\s+([0-9]+(?:\.[0-9]+)?)',[Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (!$eaMatch.Success) { throw 'Versao do EA nao identificada na base.' }
$ea = "FimatheBot $($eaMatch.Groups[1].Value).ex5"
Install-Ea $ea
$baseSet = InputsFrom $base.Relatorio

# Cada hipótese altera apenas uma família de parâmetros da base PB27.
$variants = @(
    [pscustomobject]@{Id='EM2_BASE';Label='PB27 + gestao emergencial 2% / 0,5x / retorno capital-base';Base='C4 CH2000 TP193 VM PB27';Changes=@{UsarGerenciamentoEmergencial='true';QuedaParaAtivarEmergencial_Percent='2';MultiplicadorRiscoEmergencial='0.5';ModoSaidaGestaoEmergencial='0'}},
    [pscustomobject]@{Id='EM3_BASE';Label='PB27 + gestao emergencial 3% / 0,5x / retorno capital-base';Base='C4 CH2000 TP193 VM PB27';Changes=@{UsarGerenciamentoEmergencial='true';QuedaParaAtivarEmergencial_Percent='3';MultiplicadorRiscoEmergencial='0.5';ModoSaidaGestaoEmergencial='0'}},
    [pscustomobject]@{Id='EM3_GAT';Label='PB27 + gestao emergencial 3% / 0,5x / saida no gatilho';Base='C4 CH2000 TP193 VM PB27';Changes=@{UsarGerenciamentoEmergencial='true';QuedaParaAtivarEmergencial_Percent='3';MultiplicadorRiscoEmergencial='0.5';ModoSaidaGestaoEmergencial='1'}},
    [pscustomobject]@{Id='EXP6H';Label='PB27 + invalida rompimento apos 6 horas';Base='C4 CH2000 TP193 VM PB27';Changes=@{UsarLimiteHorasSemRompimento='true';LimiteHorasSemRompimento='6.0'}},
    [pscustomobject]@{Id='EXP7H';Label='PB27 + invalida rompimento apos 7 horas';Base='C4 CH2000 TP193 VM PB27';Changes=@{UsarLimiteHorasSemRompimento='true';LimiteHorasSemRompimento='7.0'}},
    [pscustomobject]@{Id='TP185';Label='PB27 + alvo take 185%';Base='C4 CH2000 TP193 VM PB27';Changes=@{TakeProfit_PercentualCanal='185';TakeProfit_PercentualCanal_Reversao='185'}},
    [pscustomobject]@{Id='TP180';Label='PB27 + alvo take 180%';Base='C4 CH2000 TP193 VM PB27';Changes=@{TakeProfit_PercentualCanal='180';TakeProfit_PercentualCanal_Reversao='180'}},
    [pscustomobject]@{Id='CH2400';Label='CH2400 + pullback 27';Base='C4 CH2000 TP193 VM PB27';Changes=@{TamanhoMinimoCanal_Pontos='2400'}},
    [pscustomobject]@{Id='SEMTER';Label='PB27 sem operacao na terca';Base='C4 CH2000 TP193 VM PB27';Changes=@{Operar_Terca='false'}},
    [pscustomobject]@{Id='SEMQUI';Label='PB27 sem operacao na quinta';Base='C4 CH2000 TP193 VM PB27';Changes=@{Operar_Quinta='false'}}
)

$results = @()
$n = 0
foreach($variant in $variants) {
    $n++
    $folder = Join-Path $WorkRoot ('BDD_{0:D2}_{1}' -f $n,$variant.Id)
    if($Resume -and (Test-Path -LiteralPath (Join-Path $folder 'RESULTADO.md'))) { Log "PULAR concluido: $($variant.Id)"; continue }
    try { $results += Run-One $variant $n $baseSet $ea }
    catch { Log "ERRO $($variant.Id) | $($_.Exception.Message)" }
}
if($results.Count) {
    $summary = $results | ForEach-Object {[pscustomobject]@{Id=$_.Id;Teste=$_.Label;Alteracoes=$_.Changes;LucroPct=Format-Br $_.Metric.ProfitPercent;DDInicialPct=Format-Br $_.Metric.DDInitialPercent;DDEquityPct=Format-Br $_.Metric.DDEquityPercent;PF=Format-Br $_.Metric.ProfitFactor;Trades=[int]$_.Metric.Trades;Relatorio=$_.Report;Pasta=$_.Folder}}
    $summary | Export-Csv -LiteralPath (Join-Path $WorkRoot 'resumo.csv') -Delimiter ';' -NoTypeInformation -Encoding UTF8
    Log "CONCLUIDO: $($results.Count) testes. Nenhum foi inserido automaticamente no painel; revisar pareto e duplicidade primeiro."
}
