# Firebase do Ako

Projeto `rizzygo-webapp`, plano Spark (gratuito). Usado para a cópia opcional na nuvem: login com Google ou e-mail e senha (Firebase Authentication) e um documento por app no Cloud Firestore (`southamerica-east1`). O site continua no Cloudflare Pages; o Firebase Hosting e o App Hosting não são usados.

- Código no navegador: [`/nuvem.js`](../nuvem.js), carregado só quando a pessoa aceita ou já tinha ligado a nuvem.
- Dados: `users/<uid>/apps/<app>` com `dados` (texto JSON), `cliente` (hora do aparelho), `aceites`, `versao` e `atualizadoEm`.
- Regras: [`firestore.rules`](firestore.rules). O mesmo projeto guarda o cadastro de leitores dos ebooks do rizzygo.com.br (`leitores/<uid>`), e o Firestore tem um arquivo de regras só: este arquivo junta os dois lados e precisa ficar igual à cópia do repositório `rizzygo-website`. Mudou? Atualize os dois, cole no console (Firestore Database > Regras) e publique.
- O que vai para a nuvem e como apagar: página [/privacidade/](../privacidade/index.html).

No console, em Authentication > Configurações > Domínios autorizados, ficam `ako.rizzygo.com.br` e `ako-7vx.pages.dev`.
