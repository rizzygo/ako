# 0004: Ficha da conta e plano no Firestore

- Estado: aceita
- Data: 20/11/2026

## Contexto

O responsável pela Rizzygo precisa saber quantas contas usam o Ako e a Rotina e dar a cada conta um plano, grátis ou pago. O navegador não consegue listar as contas do Firebase Authentication, e o site não tem servidor próprio (ver [0003](0003-firebase-opcional.md)).

## Decisão

- `contas/<uid>`: e-mail, nome, `criadaEm`, `vistaEm` (só o dia) e o último dia de cada app. O `nuvem.js` grava no máximo uma vez por dia por app. Só o admin lê.
- `planos/<uid>`: plano, origem (manual, pagamento ou vitalício), ciclo e validade. A pessoa só lê o próprio plano; quem grava é o admin e, mais tarde, o servidor do pagamento.
- Admin = quem tem um documento em `admins/<uid>`, criado à mão no console. Nenhum uid fica no código. O admin não lê `users/<uid>/apps`.
- Apagar a conta apaga a ficha e o plano.

## Opções consideradas

- **Ficha no Firestore (escolhida):** uma gravação por dia por conta, regras por uid, sem servidor novo.
- **Contar pelo console do Firebase:** não mostra uso por dia nem por app, e não dá para guardar o plano.
- **Plano num banco do Worker (D1):** pediria um endpoint novo com verificação de login só para o admin gravar, e o app leria de dois lugares.
- **Ficha sem e-mail:** coleta menos, mas o admin veria só códigos e não saberia a quem dar o plano.

## Consequências

- Cada conta logada gasta uma gravação a mais por dia. Contar usa `count()`, que custa uma leitura a cada mil documentos.
- A política de privacidade explica a ficha e o plano.
- As regras novas precisam estar publicadas no console antes de o `nuvem.js` novo ir ao ar; senão "Apagar conta" falha ao apagar a ficha.
