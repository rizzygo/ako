# Firebase do Ako

Projeto `rizzygo-webapp`, plano Spark (gratuito). Usado para a cópia opcional na nuvem: login com Google ou e-mail e senha (Firebase Authentication) e um documento por app no Cloud Firestore (`southamerica-east1`). O site continua no Cloudflare Pages; o Firebase Hosting e o App Hosting não são usados.

- Código no navegador: [`/nuvem.js`](../nuvem.js), carregado só quando a pessoa aceita ou já tinha ligado a nuvem.
- Dados: `users/<uid>/apps/<app>` com `dados` (texto JSON), `cliente` (hora do aparelho), `aceites`, `versao` e `atualizadoEm`.
- Documentos: `rotina` e `ako` (trilhas, mapas e ajustes juntos, desde 11/11/2026). Os antigos `trilhas`, `mapas` e `ajustes` ficam como estavam: na primeira vez em cada aparelho, `/nuvem.js` lê os três e cria o `ako`. "Apagar conta" apaga todos.
- Cota do Spark: 50 mil leituras e 20 mil gravações por dia, para todo mundo junto (zera à meia-noite do Pacífico, de madrugada no Brasil), e 10 GiB de download por mês. Para economizar, cada aba relê a nuvem no máximo a cada 2 min (Rotina) ou 10 min (`ako`), e abrir uma aba nova sempre lê. Cota cheia: os apps avisam com `AVISO_COTA` e seguem salvando no aparelho.
- Regras: [`firestore.rules`](firestore.rules). O mesmo projeto guarda o cadastro de leitores dos ebooks do rizzygo.com.br (`leitores/<uid>`), e o Firestore tem um arquivo de regras só: este arquivo junta os dois lados e precisa ficar igual à cópia do repositório `rizzygo-website`. Mudou? Atualize os dois, cole no console (Firestore Database > Regras) e publique.
- Admin (desde 20/11/2026, decisão [0004](../decisoes/0004-ficha-da-conta-e-plano.md)): `contas/<uid>` (ficha da conta, gravada pelo `nuvem.js` uma vez por dia por app), `planos/<uid>` (+ `historico`), `anotacoes/<uid>` e `revisoes/<id>`. Quem é admin: um documento vazio em `admins/<uid>`, criado à mão no console (Firestore Database > Dados > Iniciar coleção `admins`, ID do documento = o uid que aparece em Authentication > Usuários). O código não guarda nenhum uid.
- O que vai para a nuvem e como apagar: página [/privacidade/](../privacidade/index.html).

No console, em Authentication > Configurações > Domínios autorizados, ficam `ako.rizzygo.com.br`, `ako-7vx.pages.dev`, `rotina.rizzygo.com.br` e `rizzygo-rotina.pages.dev` (a Rotina, desde 14/11/2026, usa o mesmo projeto).

## App Check (chave no código desde 14/11/2026)

Sem App Check, qualquer pessoa cria uma conta e chama o Firestore de fora das nossas páginas, gastando a cota do dia de todo mundo. Com ele, o Firestore só aceita pedidos das páginas da Rizzygo (reCAPTCHA v3, invisível para quem usa). O código já está pronto em `nuvem.js` (Ako e Rotina) e `leitor.js` (rizzygo.com.br): a constante `APP_CHECK` vazia deixa tudo desligado.

1. Crie a chave do reCAPTCHA v3 em https://www.google.com/recaptcha/admin/create : tipo "Baseada em pontuação (v3)", domínios `rizzygo.com.br`, `ako-7vx.pages.dev`, `rizzygo-rotina.pages.dev`, `rizzygo-website.pages.dev` e `localhost` (o domínio inclui os subdomínios, como ako., rotina. e rizzo.). Guarde a chave do site (pública) e a chave secreta.
2. No console do Firebase (projeto `rizzygo-webapp`), abra App Check > Apps, escolha o app da Web, provedor reCAPTCHA v3, cole a chave secreta e salve. Ainda não clique em "Aplicar" (Enforce).
3. Chave do site em `APP_CHECK` nos três arquivos (é pública, pode ficar no código). Feito em 14/11/2026.
4. Espere 1 ou 2 dias e olhe App Check > APIs > Cloud Firestore: as "solicitações verificadas" precisam estar perto de 100%.
5. Clique em "Aplicar" no Cloud Firestore. Se algo quebrar, o mesmo botão desliga na hora. Authentication fica sem aplicar por enquanto.
