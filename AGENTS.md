# AGENTS.md: como trabalhar no Ako

Este arquivo vale para qualquer agente de IA (Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor) e para pessoas. O `CLAUDE.md` só aponta para cá. As regras de base da Rizzygo All ficam em [`favos/regras`](https://github.com/rizzygo/favos/tree/main/regras): idioma, o que fazer antes de mudar e como fechar uma resposta.

## O que é este repositório

O site **ako.rizzygo.com.br**: trilhas, mapas, lições e a vitrine dos Favos. A Rotina com a Zumi mora em rotina.rizzygo.com.br desde 14/11/2026; aqui fica só a ponte `/rotina/`. Repositório **público** (CC BY 4.0). HTML, CSS e JavaScript puros, **sem build**: o Cloudflare Pages publica os arquivos como estão a cada commit na `main` e cria uma prévia em cada pull request.

**Todo caminho é uma URL publicada.** Não mova nem renomeie arquivo servido sem uma regra 301 no `_redirects` no mesmo PR.

## Fatias

Cada pasta é uma funcionalidade completa. Para mexer numa fatia, leia o `AGENTS.md` dela (quando houver) e não abra as outras.

| Fatia | O que é | Mapa próprio |
| --- | --- | --- |
| `trilhas/` | Trilhas, mapas das áreas e lições | [`trilhas/AGENTS.md`](trilhas/AGENTS.md) |
| `rotina/` | Só a ponte para rotina.rizzygo.com.br: o app e o Worker dos lembretes moram em outro repositório desde 14/11/2026 | |
| `favos/` | Uma página por skill dos Favos | README do repositório `favos` |
| `privacidade/`, `guias/` | Política de privacidade e guias soltos | |
| `index.html` + `inicio.css` | Página inicial | |

**Compartilhado** (muda com mais cuidado, porque afeta todas as fatias):

- `ds/`: design system, idêntico ao `ds/` do `rizzygo-website`. Mudou aqui, copie para lá no mesmo dia. Guia em [`ds/README.md`](ds/README.md).
- `conta.js`, `nuvem.js`, `mesclar.js`: conta Google opcional e progresso na nuvem (Firebase). Regras do Firestore em [`firebase/`](firebase/).
- `vitoria.js`, `contribua.js`, `topo.css`: som de vitória, rodapé de contribuição, faixa do topo.

## Comandos

```sh
scripts/validar   # trilhas, mapas, lições, JavaScript, segredos e tamanho dos AGENTS.md
scripts/previa    # prévia local em http://localhost:8000, igual ao Cloudflare Pages
```

O CI (`.github/workflows/validar.yml`) roda o mesmo `scripts/validar`. Confira a prévia no computador, no celular e no modo escuro antes de pedir revisão.

## Regras

- **Cache:** mudou CSS ou JS, troque o `?v=` nas páginas que carregam o arquivo.
- **Público:** nada de dado de pessoa, decisão de negócio, preço, token ou id de projeto. O "porquê" interno fica no repositório privado `rizzygo-docs`.
- **Conteúdo:** fonte só depois de aberta e conferida. Material pago nunca é obrigatório. Termos técnicos em inglês ficam em inglês.
- **Contagem de visitas:** página HTML nova leva o trecho do Cloudflare Web Analytics antes do `</body>` e entra no `sitemap.xml`.
- **Família Rizzygo:** página nova leva a faixa `.familia` com Rizzygo, Ako e Rotina (classe `familia-site`, mesmo tamanho; a Rotina aponta direto para https://rotina.rizzygo.com.br/; a ponte `/rotina/` fica para links antigos) e segue o design system. A faixa é igual no rizzygo.com.br e na Rotina. O menu principal (Trilhas, Mapas, Materiais, Favos) não tem Rotina: ela fica só na faixa.
- **Antes de apagar, mudar regra do Firestore ou mexer em produção:** explique e espere o OK.
- **Git e segredos:** nada de `git push --force` nem push direto na `main`. Não leia nem versione arquivo de token, `.env` ou chave. No Claude Code, o `.claude/settings.json` já nega isso; o `scripts/segredos.py` barra no CI.

## Decisões e specs

- **Decisões (ADRs):** em [`decisoes/`](decisoes/), uma por arquivo. Escolha difícil de desfazer ganha ADR no mesmo PR.
- **Specs:** funcionalidade nova ou mudança de comportamento ganha `specs/<nome>.md` dentro da fatia, no modelo de [`favos/regras/modelo-spec.md`](https://github.com/rizzygo/favos/blob/main/regras/modelo-spec.md). Correção de texto ou bug pequeno não precisa.

## Commits

Conventional Commits em português, com a fatia no escopo: `feat(trilhas): ...`, `fix(favos): ...`, `docs(ako): ...`.
