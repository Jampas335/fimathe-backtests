# Backtests fora do painel principal

Esta pasta preserva relatórios que não ajudam a comparar configurações no painel, sem apagar nenhum arquivo.

Critérios aplicados:

- **Baixa amostra:** até cinco operações fechadas no relatório. Não é evidência suficiente para avaliar lucro, prejuízo ou drawdown.
- **Duplicado exato:** mesma configuração, ativo, timeframe, período e métricas finais. O painel mantém uma cópia canônica e arquiva apenas as cópias idênticas.

Prejuízos reais, resultados ruins e drawdowns altos continuam no painel quando possuem amostra suficiente e não são duplicados. O índice `indice-arquivados-sem-relevancia.csv` informa o motivo de cada separação e, quando houver, o ID da cópia mantida.
