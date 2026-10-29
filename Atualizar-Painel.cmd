@echo off
rem Le o indice e todos os relatorios MT5 e atualiza os dados do painel.
cd /d "%~dp0"
node "painel\gerar-dados.js"
if errorlevel 1 (echo. & echo Falhou. Verifique se o Node.js esta instalado.) else (echo. & echo Pronto. Abra Painel-Backtests-Fimathe.html)
pause
