# Spec: ignorar um lembrete só dessa vez

<!-- Escrita em 12/11/2026, a pedido do fundador. -->

## Problema

Quando um lembrete toca, o aviso oferece só "Feito" e "Daqui a 10 min". Se a pessoa não vai fazer aquilo agora (já bebeu água, está numa reunião, o remédio já foi tomado), ela precisa mentir com "Feito" ou adiar algo que vai tocar de novo à toa. Para quem tem TDAH, um aviso que volta sem motivo vira ruído e a pessoa acaba desligando o lembrete inteiro.

## Resultado esperado

A pessoa pula aquela ocorrência com um toque, sem ganhar pontos e sem desligar o lembrete. O próximo aviso vem no horário de sempre.

## Fora do escopo

- Botões dentro da notificação do sistema (ficam para a proposta de notificar com o app fechado).
- Mudar o tempo do "Daqui a 10 min".

## Critérios de aceite

- [ ] Dado um aviso de lembrete na tela, então ele mostra três botões: a ação do lembrete ("Feito" ou outra), "Daqui a 10 min" e "Ignorar dessa vez".
- [ ] Dado que a pessoa toca em "Ignorar dessa vez", então o aviso fecha, não soma pontos e não volta daqui a pouco.
- [ ] Lembrete por intervalo: o próximo aviso continua no intervalo de sempre. Lembrete no horário: o próximo é no próximo dia escolhido.
- [ ] Dado um lembrete que já tinha sido adiado, quando a pessoa ignora, então ele não fica adiado de novo.
- [ ] Se a notificação do sistema daquele lembrete ainda estiver aberta, ela fecha junto.

## Como conferir

- Comandos: `scripts/validar` e `node rotina/testes/e2e.js` (faz um lembrete tocar, toca em "Ignorar dessa vez" e confere que o aviso some e não volta).
- Prévia: criar um lembrete a cada 15 min, esperar tocar, ignorar. No celular os três botões quebram em duas linhas sem cortar texto.
- Dados: nenhum campo novo. Ignorar só apaga `adiados[id]`, se houver.
