# 0001: O Ako não tem build

- Estado: aceita
- Data: registrada em 11/11/2026; vale desde o início do projeto

## Contexto

O Ako é feito para quem está começando. Qualquer pessoa precisa conseguir abrir um arquivo, entender e mandar uma correção pelo navegador do GitHub. O site é hospedado no Cloudflare Pages, no plano gratuito.

## Decisão

HTML, CSS e JavaScript puros, sem bundler, sem framework e sem etapa de build. O Cloudflare Pages publica os arquivos do repositório como estão, a cada commit na `main`, e cria uma prévia por pull request.

## Opções consideradas

- **Sem build (escolhida):** zero dependência, contribuição pelo navegador, prévia imediata.
- **Gerador estático (como o `build.py` do site principal):** permite reaproveitar layout, mas obriga quem contribui a rodar o gerador.
- **Framework de front-end:** mais recursos, mas exige Node, dependências e conhecimento que o público ainda não tem.

## Consequências

- Todo caminho de arquivo é uma URL pública. Mover arquivo quebra link, progresso e cache, por isso exige regra 301 no `_redirects`.
- Cache é controlado à mão com `?v=` nas páginas e com o `CACHE` do service worker da Rotina.
- Trecho repetido entre páginas (faixa do topo, rodapé, analytics) é copiado. A checagem fica no CI e na revisão.
