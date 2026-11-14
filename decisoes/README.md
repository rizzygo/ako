# Decisões do Ako

Cada arquivo registra uma decisão técnica difícil de desfazer: o contexto, o que escolhemos, o que ficou de fora e o que isso muda. O modelo está em [`favos/regras/modelo-adr.md`](https://github.com/rizzygo/favos/blob/main/regras/modelo-adr.md).

Este repositório é público. Aqui entram só decisões técnicas. Decisões de negócio, de marca e de visibilidade ficam no repositório privado da Rizzygo.

| Número | Decisão | Estado |
| --- | --- | --- |
| [0001](0001-sem-build.md) | O Ako não tem build: o Pages serve os arquivos como estão | Aceita |
| [0002](0002-design-system-copiado.md) | Um design system, copiado entre o Ako e o site principal | Aceita |
| [0003](0003-firebase-opcional.md) | Conta e nuvem opcionais com Firebase, sem servidor próprio | Aceita |
| 0004 | Push dos lembretes por um Cloudflare Worker, sem o nome do lembrete | Movida para o repositório da Rotina em 14/11/2026 |
| 0005 | A IA da Zumi roda no Cloudflare Workers AI | Movida para o repositório da Rotina em 14/11/2026 |
| 0006 | Freios contra robô para o plano grátis não acabar | Movida para o repositório da Rotina em 14/11/2026 |

Decisão nova: copie o modelo, use o próximo número e acrescente a linha nesta tabela no mesmo PR.
