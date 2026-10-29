# Painel de Backtests

Abra `Painel-Backtests-Fimathe.html` (na pasta `Backtests`) direto no Edge ou no Chrome.
Não precisa de servidor nem de internet.

## Atualizar depois de novos backtests

1. Rode `Organizar-Backtests-2026.ps1`, que gera `2026/00_Indice/indice-backtests-2026.csv`.
2. Dê dois cliques em `Atualizar-Painel.cmd`, que roda `node painel/gerar-dados.js`.
3. Recarregue o painel (F5).

O gerador lê o índice CSV e cada relatório HTML do MT5 (configuração, parâmetros,
estatísticas, ordens e transações). Ele reconstrói os trades e grava:

- `dados/indice.js`: uma linha leve por teste. A biblioteca, os filtros e a dispersão usam esse arquivo.
- `dados/r/<id>.js`: o detalhe completo de cada teste, carregado só quando ele é aberto.

O `<id>` é calculado a partir da pasta de origem do teste. Por isso favoritos,
anotações e a seleção de comparação continuam valendo depois que a biblioteca é
reclassificada.

## Arquivos

- `app.js` / `app.css`: interface
- `lib/echarts.min.js`: biblioteca de gráficos (ECharts 5.5.1, local)
- `Painel-Backtests-Fimathe.ANTIGO.html`: backup do painel anterior

Favoritos, anotações, filtros e regras prop ficam salvos no navegador (localStorage).
