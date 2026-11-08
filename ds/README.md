# Design system da Rizzygo

Um arquivo de CSS, `rizzygo.css`, com as cores, as fontes, os tamanhos e os componentes comuns aos sites da Rizzygo. O mesmo arquivo fica em dois repositórios:

| Repositório | Caminho | Sites |
| --- | --- | --- |
| `rizzygo-website` | `ds/rizzygo.css` | rizzygo.com.br e rizzo.rizzygo.com.br |
| `ako` | `ds/rizzygo.css` | ako.rizzygo.com.br |

Cada página carrega o `rizzygo.css` primeiro e o CSS do site depois (`estilo.css`, `trilhas/app.css`, `favos/favos.css` ou `inicio.css`). O CSS do site guarda só o que é dele.

## Como mudar

1. Mude o `rizzygo.css` em um dos repositórios.
2. Copie o arquivo igual para o outro e abra os dois pull requests juntos.
3. Confira as prévias no computador, no celular e no modo escuro.

Os dois arquivos precisam ficar idênticos. Para conferir: `diff rizzygo-website/ds/rizzygo.css ako/ds/rizzygo.css`.

## Tokens

| Grupo | Tokens | Uso |
| --- | --- | --- |
| Marca | `--marca-azul` `#1F4FD8`, `--marca-ambar` `#F5A524`, `--marca-noite` `#0B1B3A`, `--marca-nevoa` `#F5F7FB` | Valor fixo, igual nos dois modos |
| Superfícies | `--fundo`, `--superficie`, `--linha`, `--noite`, `--noite-2` | Fundo da página, cartões, bordas, faixas escuras |
| Texto | `--tinta`, `--suave`, `--noite-texto`, `--noite-suave` | Texto principal e secundário, no claro e no escuro |
| Ação | `--azul`, `--azul-claro`, `--azul-tinta` | Links, botões e destaques |
| Conquista | `--ambar`, `--ambar-forte`, `--ambar-claro` | Progresso, selos, detalhes dos títulos |
| Estado | `--certo`, `--erro` e as versões `-claro` | Acerto, erro, "No ar" |
| Fontes | `--f-titulo` (Outfit), `--f-texto` (Atkinson Hyperlegible), `--f-mono` | Títulos, texto, código |
| Tamanhos | `--t-capa`, `--t-pagina`, `--t-secao`, `--t-sub`, `--t-lead`, `--t-texto`, `--t-pequeno`, `--t-rotulo` | Do título da página inicial à etiqueta |
| Espaço | `--e-1` (0,25rem) a `--e-8` (4rem) | Margens e respiros |
| Forma | `--raio` 16px, `--raio-p` 8px, `--raio-pilula`, `--sombra-1`, `--sombra-2` | Cantos e sombras |
| Largura | `--largura` 72rem, `--largura-texto` 46rem | Página e coluna de leitura |

O modo escuro segue o sistema (`prefers-color-scheme`) e aceita `data-theme="light"` ou `"dark"` no `<html>`.

## Componentes

| Classe | O que é |
| --- | --- |
| `.familia` | Faixa azul-noite no topo, com os botões Rizzygo e Ako. Leva de um site ao outro em todas as páginas. |
| `.topo`, `.marca`, `.menu` | Cabeçalho fixo com o logo e o menu |
| `.btn`, `.btn-sec`, `.btn-claro`, `.btn-contorno-claro` | Botão principal, secundário, âmbar (em fundo escuro) e contorno claro |
| `.status.no-ar`, `.status.construcao` | Selo de situação de um projeto |
| `.etiquetas` / `.etiqueta` | Lista de etiquetas com o favo âmbar |
| `.sobretitulo`, `.lead` | Linha acima do título e parágrafo de abertura |
| `.secao`, `.secao-cab` (`.centro`) | Seção com título, traço âmbar e linha de apoio |
| `.hero`, `.hero-grade` | Capa com o brilho azul e âmbar |
| `.cartoes` (`.dois`), `.cartao` | Grade de cartões. Com um link no `h3`, o cartão todo vira o link. Variantes: `.destaque`, `.destaque.ambar`. Partes: `.cartao-rotulo`, `.cartao-icone`, `.mais` |
| `.numeros` | Faixa de números, clara ou dentro de `.noite` |
| `.noite`, `.chamada` | Faixa ou bloco azul-noite com grade de pontos |
| `.rodape` | Rodapé azul-noite |
| `.revela`, `.palavra`, `.luz`, `.progresso` | Efeitos marcados pelo `site.js` e pelo `trilhas/efeitos.js`. Respeitam a preferência por menos movimento. |

## A Zumi

A Zumi só aparece no que é gratuito (Ako, Favos, Rizzygo All), nunca em Mentoria ou Empresas. Use pelo menos 96 px e a versão `-fundo-escuro` em fundo azul-noite ou no modo escuro (com `<picture>` e `prefers-color-scheme`). As regras completas estão em `rizzygo-docs/marca/zumi/README.md`.
