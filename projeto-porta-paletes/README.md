# Estruturas Porta-Paletes

Aplicação web (HTML, CSS e JavaScript, sem servidor) para cadastrar, pesquisar e exportar estruturas de porta-paletes, com visual 3D.

## Arquitetura
- index.html: marcação da página e banco de dados embutido (bloco script#db, em JSON)
- css/estilos.css: estilos (tema claro e escuro)
- js/app.js: lógica (formulário, cálculos, desenho 3D com Three.js, listagem e pesquisa, exportação Excel com SheetJS, geração deste ZIP com JSZip)
- data/estruturas.json: cópia dos dados no momento do download

## Banco de dados
Os registros ficam dentro do próprio código (bloco JSON do index.html). Na versão publicada, cada gravação regenera o código da página já com os dados novos. Fora dela, as gravações ficam no localStorage do navegador; para torná-las permanentes, copie o conteúdo de data/estruturas.json para o bloco script#db do index.html.

## Cálculos
- Níveis = arredondar(altura total / distanciamento informado), mínimo 1
- Espaçamento ajustado = altura total / níveis
- Metragem total = comprimento do módulo x quantidade de módulos
- Com mais de uma estrutura, elas ficam lado a lado, separadas pelo distanciamento entre estruturas

## Executar
Abra index.html no navegador (requer internet para carregar Three.js, SheetJS e JSZip via cdnjs).
