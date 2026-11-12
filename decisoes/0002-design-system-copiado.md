# 0002: Um design system, copiado entre o Ako e o site principal

- Estado: aceita
- Data: registrada em 11/11/2026; vale desde 08/11/2026

## Contexto

O Ako e o rizzygo.com.br precisam se ler como uma família só: mesmas cores, fontes, botões e faixa do topo. Os dois ficam em repositórios separados, e o Ako não tem build nem gerenciador de pacotes.

## Decisão

Um arquivo de CSS, `ds/rizzygo.css`, e um script de tema, `ds/tema.js`, idênticos nos dois repositórios. Cada página carrega o design system primeiro e o CSS próprio depois. O guia fica em [`ds/README.md`](../ds/README.md).

## Opções consideradas

- **Cópia idêntica (escolhida):** funciona sem build e sem dependência entre repositórios.
- **Pacote npm ou submódulo git:** evitaria a cópia, mas traria build e passos extras para quem contribui.
- **Carregar o CSS de um domínio só:** acopla a disponibilidade de um site ao outro.

## Consequências

- Mudança no `ds/` exige dois PRs abertos juntos, com o mesmo arquivo.
- O `ako` é a fonte. Desde 12/11/2026, o CI do site principal compara o `ds/` dele com o deste repositório e falha se houver diferença. Mude aqui primeiro e mescle este PR antes do PR do site.
