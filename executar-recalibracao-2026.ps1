param([switch]$Resume)

$ErrorActionPreference = 'Stop'

# Escopo fechado: somente o terminal MetaQuotes isolado autorizado.
$Terminal = 'C:\Program Files\MetaTrader 5\terminal64.exe'
$Profile = 'C:\Users\noobg\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075'
$Root = 'E:\Area de Trabalho\Trade\Fimathe\Backtests'
$Index = Join-Path $Root '2026\00_Indice\indice-backtests-2026.csv'
$RunLabel = 'rodada-recalibracao-2026'
$WorkRoot = Join-Path $Root "2026\00_Indice\$RunLabel"
$ConfigRoot = Join-Path 'C:\FimatheRunConfigs' $RunLabel
$EaSource = 'E:\Area de Trabalho\Trade\Fimathe\EA''s'
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
    if ($own.Count) { throw 'Ja ha uma rodada de recalibracao em execucao no terminal isolado.' }
}

function Run-One([pscustomobject]$Variant,[string]$Scope,[string]$FromDate,[string]$ToDate,[string]$BaseSet,[string]$EaFile,[int]$Number) {
    Assert-Safe
    $slug = 'RC26_{0:D2}_{1}_{2}' -f $Number,$Variant.Id,$Scope
    $folder = Join-Path $WorkRoot ('{0:D2}_{1}' -f $Number,$Variant.Id)
    $setPath = Join-Path $folder "$slug.set"
    $reportPath = Join-Path $Profile "$slug.htm"
    New-Item -ItemType Directory -Force -Path $folder,$ConfigRoot | Out-Null
    $set = $BaseSet
    foreach($key in $Variant.Changes.Keys){ $set = Set-Input $set $key ([string]$Variant.Changes[$key]) }
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
    Log "INICIO $slug | $($Variant.Label) | $FromDate a $ToDate"
    $started = Get-Date
    $p = Start-Process -FilePath $Terminal -ArgumentList ('/config:' + $iniPath) -WindowStyle Hidden -PassThru
    $deadline = (Get-Date).AddMinutes(40)
    do { Start-Sleep -Seconds 5; $ready = (Test-Path -LiteralPath $reportPath) -and ((Get-Item -LiteralPath $reportPath).LastWriteTime -ge $started) } while (!$ready -and (Get-Date) -lt $deadline)
    if (!$ready) { if(Get-Process -Id $p.Id -ErrorAction SilentlyContinue){Stop-Process -Id $p.Id -Force}; throw "Relatorio nao criado em 40 minutos: $slug" }
    Start-Sleep -Seconds 2
    Get-ChildItem -LiteralPath $Profile -Filter "$slug*" -File | Copy-Item -Destination $folder -Force
    $m = Metrics $reportPath
    if([double]::IsNaN($m.ProfitPercent)){throw "Metricas invalidas: $slug"}
    Get-ChildItem -LiteralPath $Profile -Filter "$slug*" -File | Remove-Item -Force
    Log ('FIM {0} | lucro={1:N2}% | DD inicial={2:N2}% | PF={3:N2} | trades={4}' -f $slug,$m.ProfitPercent,$m.DDInitialPercent,$m.ProfitFactor,$m.Trades)
    return $m
}

New-Item -ItemType Directory -Force -Path $WorkRoot,$ConfigRoot | Out-Null
Assert-Safe
$rows = Import-Csv -LiteralPath $Index -Delimiter ';'
$base = $rows | Where-Object { $_.Relatorio -match '7fca220f' } | Select-Object -First 1
if (!$base) { throw 'Base CH2200/PB21 nao encontrada no indice.' }
$eaMatch = [regex]::Match((Get-Content -LiteralPath $base.Relatorio -Raw),'FimatheBot\s+([0-9]+(?:\.[0-9]+)?)',[Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (!$eaMatch.Success) { throw 'Versao do EA nao identificada na base.' }
$ea = "FimatheBot $($eaMatch.Groups[1].Value).ex5"
Install-Ea $ea
$baseSet = InputsFrom $base.Relatorio

# Hipoteses predefinidas em torno do platô 2.200--2.400. Nao ha busca cega nem aumento de risco.
$variants = @(
    [pscustomobject]@{Id='CH2150';Label='Canal 2150, TP193, PB21';Changes=@{TamanhoMinimoCanal_Pontos='2150'}},
    [pscustomobject]@{Id='CH2250';Label='Canal 2250, TP193, PB21';Changes=@{TamanhoMinimoCanal_Pontos='2250'}},
    [pscustomobject]@{Id='PB18';Label='Canal 2200, TP193, pullback 18%';Changes=@{DistanciaPullback_Percent='18'}},
    [pscustomobject]@{Id='PB24';Label='Canal 2200, TP193, pullback 24%';Changes=@{DistanciaPullback_Percent='24'}},
    [pscustomobject]@{Id='PB27';Label='Canal 2200, TP193, pullback 27%';Changes=@{DistanciaPullback_Percent='27'}},
    [pscustomobject]@{Id='TP190';Label='Canal 2200, TP190, PB21';Changes=@{TakeProfit_PercentualCanal='190';TakeProfit_PercentualCanal_Reversao='190'}},
    [pscustomobject]@{Id='TP196';Label='Canal 2200, TP196, PB21';Changes=@{TakeProfit_PercentualCanal='196';TakeProfit_PercentualCanal_Reversao='196'}},
    [pscustomobject]@{Id='EM2X05';Label='Canal 2200, TP193, PB21, gestao emergencial 2% / 0,5x';Changes=@{UsarGerenciamentoEmergencial='true';QuedaParaAtivarEmergencial_Percent='2';MultiplicadorRiscoEmergencial='0.5';ModoSaidaGestaoEmergencial='0'}},
    [pscustomobject]@{Id='EM2X07';Label='Canal 2200, TP193, PB21, gestao emergencial 2% / 0,7x';Changes=@{UsarGerenciamentoEmergencial='true';QuedaParaAtivarEmergencial_Percent='2';MultiplicadorRiscoEmergencial='0.7';ModoSaidaGestaoEmergencial='0'}},
    # Controle de reproducao: nenhuma alteracao. Necessario antes de comparar com relatorios gerados por outro binario.
    [pscustomobject]@{Id='BASE_ATUAL';Label='Controle: CH2200, TP193, PB21, sem alteracoes';Changes=@{}}
)

@(
    '# Recalibracao 2026 -- XAUUSD M15 21h', '',
    'Objetivo: comparar pequenas variacoes ao redor da configuracao CH2200 / TP193 / pullback 21 / risco 0,9%.',
    'O ranking nao aceita retorno isolado. Cada variacao e executada em 2026 completo e no bloco recente agosto--outubro.',
    'O bloco agosto--outubro e uma verificacao de regime recente; nao e garantia de desempenho futuro.',
    'Nenhuma variacao eleva o risco por trade acima de 0,9%.'
) | Set-Content -LiteralPath (Join-Path $WorkRoot 'METODOLOGIA.md') -Encoding UTF8

$results = @(); $n=0
foreach($variant in $variants) {
    $n++; $folder = Join-Path $WorkRoot ('{0:D2}_{1}' -f $n,$variant.Id)
    $summaryPath = Join-Path $folder 'RESULTADO.md'
    if($Resume -and (Test-Path -LiteralPath $summaryPath)) { Log "PULAR concluido: $($variant.Id)"; continue }
    try {
        $full = Run-One $variant 'FULL' '2026.01.01' '2026.10.31' $baseSet $ea $n
        $recent = Run-One $variant 'RECENTE' '2026.08.01' '2026.10.31' $baseSet $ea $n
        $changes = ($variant.Changes.Keys | Sort-Object | ForEach-Object { "$_=$($variant.Changes[$_])" }) -join '; '
        @(
            "# Resultado -- $($variant.Label)", '',
            '## 2026 completo (01/01 a 31/10)', "Lucro: $([math]::Round($full.ProfitPercent,4))%", "DD capital inicial: $([math]::Round($full.DDInitialPercent,4))%", "DD equity: $([math]::Round($full.DDEquityPercent,4))%", "Profit Factor: $([math]::Round($full.ProfitFactor,2))", "Trades: $([int]$full.Trades)", '',
            '## Regime recente (01/08 a 31/10)', "Lucro: $([math]::Round($recent.ProfitPercent,4))%", "DD capital inicial: $([math]::Round($recent.DDInitialPercent,4))%", "DD equity: $([math]::Round($recent.DDEquityPercent,4))%", "Profit Factor: $([math]::Round($recent.ProfitFactor,2))", "Trades: $([int]$recent.Trades)", '',
            "Alteracoes: $changes", '',
            'Aprovacao exige avaliacao conjunta: retorno 2026, DD relativo ao capital inicial e resultado positivo no regime recente.'
        ) | Set-Content -LiteralPath $summaryPath -Encoding UTF8
        $results += [pscustomobject]@{Id=$variant.Id;Teste=$variant.Label;Alteracoes=$changes;Lucro2026=$full.ProfitPercent;DDInicial2026=$full.DDInitialPercent;PF2026=$full.ProfitFactor;Trades2026=[int]$full.Trades;LucroRecente=$recent.ProfitPercent;DDInicialRecente=$recent.DDInitialPercent;PFRecente=$recent.ProfitFactor;TradesRecentes=[int]$recent.Trades;Pasta=$folder}
    } catch { Log "ERRO $($variant.Id) | $($_.Exception.Message)" }
}
if($results.Count) {
    $results | Sort-Object @{Expression='DDInicial2026';Ascending=$true},@{Expression='Lucro2026';Descending=$true} | Export-Csv -LiteralPath (Join-Path $WorkRoot 'resumo.csv') -Delimiter ';' -NoTypeInformation -Encoding UTF8
    Log "CONCLUIDO: $($results.Count) configuracoes. Nada foi inserido automaticamente no painel."
}
