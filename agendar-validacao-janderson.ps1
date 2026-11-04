$ErrorActionPreference = 'Stop'
$Root = 'E:\Area de Trabalho\Trade\Fimathe\Backtests'
$Target = Join-Path $Root 'executar-validacao-3-anos.ps1'
$Log = Join-Path $Root '2026\00_Indice\validacao-3-anos-janderson\agendamento.log'
New-Item -ItemType Directory -Force -Path (Split-Path $Log -Parent) | Out-Null

function Log([string]$Text) {
    Add-Content -LiteralPath $Log -Encoding UTF8 -Value ('{0:yyyy-MM-dd HH:mm:ss} | {1}' -f (Get-Date), $Text)
}

# A bateria geral já está em andamento. Espera o processo pai dela, em vez de
# olhar apenas o terminal entre uma execução e outra, para não abrir duas
# sessões de teste em paralelo. FTMO/Maven não entram nesta checagem.
do {
    $main = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'executar-validacao-3-anos\.ps1' -and $_.CommandLine -notmatch 'SomenteAutor\s+Janderson' })
    if ($main.Count -gt 0) { Start-Sleep -Seconds 20 }
} while ($main.Count -gt 0)

Log 'Bateria geral encerrada. Iniciando as validações longas dos relatórios do Janderson.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Target -SomenteAutor Janderson -MaxRuns 10
Log "Bateria Janderson encerrada. ExitCode=$LASTEXITCODE"
