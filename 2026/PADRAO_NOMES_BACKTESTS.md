# Padrão de nomes dos backtests

Cada pasta de backtest segue o formato abaixo. A primeira informação é sempre a autoria/origem do estudo; em seguida vem a corretora obtida do próprio relatório MT5.

```text
(Origem) [Corretora] - ATIVO TF - HORARIO - Cx CHx TPx VM/PB - Rx - INICIO_a_FIM - id-curto
```

Exemplo:

```text
(Daniel) [HantecMarketsMU] - XAUUSD M5 - 21h - C4 CH3000 TP190 VM PB10 - R1.00 - 2026.01.01_a_2026.10.30 - 7fd3a1c2
```

Significado:

- `(Origem)`: `Daniel`, `Codex`, `Fimathe` ou `Referencia`.
- `[Corretora]`: servidor/corretora lido no cabeçalho do relatório MT5. Quando o relatório não a informa, usa-se `[Corretora-nao-informada]`.
- `C`: candles de formação; `CH`: canal mínimo em pontos; `TP`: alvo percentual do canal; `VM`: virada de mão; `PB`: pullback.
- `R`: risco percentual por operação.
- `id-curto`: identificador estável para evitar colisões entre configurações parecidas.

As pastas continuam organizadas por `2026/ATIVO/TIMEFRAME/`. A origem e a corretora ficam no início do nome do teste para aparecerem tanto no Explorer quanto no painel.

O script `organizar-nomes-backtests.js` gera primeiro uma prévia em `00_Indice/plano-renomeacao-backtests.json`. Somente o parâmetro `--apply` move as pastas e atualiza o índice CSV.
