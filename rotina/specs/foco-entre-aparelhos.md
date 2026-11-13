# Spec: o mesmo relógio do Foco em todos os aparelhos

<!-- Escrita em 13/11/2026, a pedido do fundador. -->

## Problema

Com a conta ligada no celular e no computador, o relógio do Foco mostrava tempos diferentes em cada um. O relógio (`timer`) ficava só no aparelho: cada um contava o bloco que foi começado nele, e começar num não mudava nada no outro. Quem começa o bloco no computador e olha o celular vê outro tempo e perde a confiança no app.

## Resultado esperado

Um relógio só por conta. O outro aparelho mostra o mesmo tempo, porque os dois calculam o restante a partir da mesma hora de fim (`fimEm`), salva na nuvem. Começar, pausar, zerar, pular e trocar de bloco num aparelho vale nos dois.

## Fora do escopo

- Ver a mudança do outro aparelho em tempo real, com os dois abertos lado a lado. A Rotina relê a nuvem ao voltar para o app, ao abrir a aba Foco e no botão "Atualizar agora", no máximo uma vez a cada 2 min por aba, para caber na cota grátis do Firestore.
- Corrigir relógio do sistema desacertado. Os aparelhos usam a hora de cada um; com o horário automático ligado, a diferença é de menos de 1 s.
- Quem não entrou na conta: o relógio continua só no aparelho, como antes.

## Critérios de aceite

- [ ] Dado a conta ligada, quando a pessoa começa um bloco, então o relógio vai para a nuvem na hora (sem esperar os 2 min de sempre).
- [ ] Dado um bloco rodando no aparelho A, quando a pessoa abre a Rotina no aparelho B, então B mostra o mesmo tempo que A.
- [ ] Dado que os dois aparelhos mexeram no relógio, então vale o que mexeu por último (`timer.mudouEm`), inteiro, sem misturar campos dos dois.
- [ ] Dado que A pausa, quando B atualiza, então B fica pausado no mesmo tempo, com o botão "Continuar".
- [ ] Dado que o bloco acabou com o app fechado, quando a pessoa abre, então o bloco conta uma vez só e a pausa conta a partir da hora em que o bloco acabou, como no outro aparelho. Fim que passou há mais de 1 min não toca som nem notificação de novo.
- [ ] Dado os dois aparelhos abertos no fim do bloco, então os pontos do bloco contam uma vez só (a junção fica com o maior número, não soma).
- [ ] Cópia na nuvem gravada por uma versão anterior (sem o relógio) não zera o relógio deste aparelho.

## Como conferir

- Comandos: `scripts/validar` e `node rotina/testes/e2e.js` (passo 3b: dois aparelhos simulados com um Firestore de mentira começam, recomeçam e pausam o relógio).
- Prévia: entrar na mesma conta no celular e no computador, começar no computador, abrir a Rotina no celular e conferir o mesmo tempo. Pausar no celular e, no computador, tocar em "Atualizar agora" em Ajustes.
- Dados: campo novo `timer.mudouEm` (número, hora da última ação). Sem ele, vale como 0. O `timer` deixou de ser local e agora vai para o documento `rotina` na nuvem. A regra de juntar objeto com `mudouEm` está em `/mesclar.js` e não afeta as trilhas, que não têm esse campo.
