# AGENTS.md da fatia rotina

Vale para `rotina/`: o app Rotina com a Zumi, instalável no celular (PWA). As regras gerais estão no [`AGENTS.md`](../AGENTS.md) da raiz. O [README](README.md) explica o app para pessoas; aqui ficam só os pontos em que um agente costuma errar.

## Onde mexer

| Quero... | Arquivo |
| --- | --- |
| Mudar comportamento, abas ou textos do app | `rotina.js` |
| Mudar visual | `rotina.css` (depois do `ds/rizzygo.css`) |
| Mudar o que funciona sem internet | `sw.js` |
| Funcionalidade nova ou mudança de comportamento | Primeiro uma spec em [`specs/`](specs/README.md), depois o código |
| Teste de ponta a ponta | `testes/e2e.js` (critério de aceite que dá para automatizar vira um passo aqui) |

## Pegadinhas

- **Cache em três lugares.** Mudou `rotina.js` ou `rotina.css`: troque o `?v=` no `index.html`, troque o mesmo `?v=` na lista `ARQUIVOS` do `sw.js` e troque o `CACHE` do `sw.js`. Faltou um, e o celular de quem instalou continua com a versão velha ou mistura versões.
- **Dados da pessoa.** Tudo fica no `localStorage` (`rizzygo-rotina-v1`) e, se ela ligou a conta, no Firestore (documento `rotina`). Campo novo precisa de valor padrão para quem já tem dados salvos. Nunca apague nem renomeie campo existente sem migração.
- **Avisos começam desligados.** Lembrete novo nasce desligado; a pessoa liga em Ajustes.
- **Arquivos compartilhados** (`/conta.js`, `/nuvem.js`, `/mesclar.js`, `/vitoria.js`) também servem as trilhas. Mudança neles é testada nas duas fatias.
- **`rotina.js` é grande** (cerca de 2 mil linhas). Leia a função que vai mudar e as que ela chama; não reescreva trechos que o pedido não pede.

## Conferir

```sh
scripts/validar              # inclui node rotina/testes/e2e.js, que usa a Rotina num navegador de verdade
node rotina/testes/e2e.js    # só o teste da Rotina (precisa do Playwright)
```

O teste abre todas as abas, cria tarefa, item sem data, meta e lembrete, recarrega e confere que nada sumiu. Também abre com dados de uma versão anterior (`testes/estado-antigo.json`). Campo novo no estado salvo: atualize esse arquivo só acrescentando, nunca apagando.

Na prévia: abra a Rotina com dados antigos salvos e confira que nada sumiu. Teste Hoje, Tarefas (Hoje, Agenda, Sem data) e Ajustes, no celular e no modo escuro. Se mudou o `sw.js`, recarregue duas vezes e confira a versão nova.
