# Skill antes-de-rodar para IAs de código

Esta skill leva o guia [Dicas antes de rodar](../../guias/dicas-antes-de-rodar-prompt) para dentro da sua IA de código. Com ela instalada, a IA confirma o contexto antes de mexer em algo, segue guard rails contra alucinação e termina toda mudança com a seção "Antes de rodar". Você não precisa colar a instrução em cada conversa.

Funciona no Claude Code, no GitHub Copilot, no Cortex Code (Snowflake) e em outras ferramentas que leem skills no formato `SKILL.md`.

## Cinco mudanças no jeito da IA trabalhar

- **Pergunta antes de fazer:** procura no projeto a versão, o ambiente e o padrão de código, e pergunta só o que não encontrou.
- **Não inventa:** lê o arquivo antes de editar, cita arquivo e linha e avisa quando não confirmou que um comando ou uma função existe.
- **Evita estrago:** mostra a simulação primeiro e pede confirmação antes de apagar, sobrescrever ou mexer em produção.
- **Evita retrabalho:** faz a menor mudança que resolve, uma de cada vez, no padrão do projeto.
- **Fecha com "Antes de rodar":** o que muda, como desfazer, como saber que deu certo e o que ficou sem verificar.

## Instale em 2 minutos

A pasta `.claude/skills/` funciona nas três ferramentas. Para instalar só no projeto atual, rode na raiz do projeto:

```bash
mkdir -p .claude/skills/antes-de-rodar
curl -fsSL https://raw.githubusercontent.com/rizzygo/ako/main/skills/antes-de-rodar/SKILL.md \
  -o .claude/skills/antes-de-rodar/SKILL.md
```

**Antes de rodar**

1. **O que muda:** cria a pasta `.claude/skills/antes-de-rodar` no projeto e baixa um único arquivo de texto, o `SKILL.md`.
2. **Como desfazer:** `rm -r .claude/skills/antes-de-rodar`
3. **Como saber que deu certo:** `head -3 .claude/skills/antes-de-rodar/SKILL.md` mostra `name: antes-de-rodar`. No Claude Code, digite `/antes-de-rodar` para chamar a skill.
4. **O que não verifiquei:** se o seu projeto já tem uma pasta de skills com outro nome. Se tiver, use a dela.

Faça o commit da pasta para todo o time usar a mesma skill.

### Onde a skill fica em cada ferramenta

Para instalar em todos os seus projetos de uma vez, ou na pasta própria da sua ferramenta, troque o caminho do comando por um destes:

| Ferramenta | Só neste projeto | Em todos os seus projetos |
| --- | --- | --- |
| Claude Code | `.claude/skills/antes-de-rodar/` | `~/.claude/skills/antes-de-rodar/` |
| GitHub Copilot | `.github/skills/antes-de-rodar/` ou `.claude/skills/antes-de-rodar/` | `~/.copilot/skills/antes-de-rodar/` |
| Cortex Code | `.cortex/skills/antes-de-rodar/` ou `.claude/skills/antes-de-rodar/` | `~/.snowflake/cortex/skills/antes-de-rodar/` |

Sua ferramenta não lê skills? Copie o texto do `SKILL.md`, sem o bloco entre os `---` do topo, para o arquivo de instruções dela, como o `AGENTS.md`, que várias ferramentas leem.

## Três exemplos com a skill instalada

Os pedidos abaixo são comuns no dia a dia. Os trechos mostram o que a skill faz a IA acrescentar.

### Claude Code: renomear uma função usada no projeto inteiro

> Renomeie a função `calcularFrete` para `calcularFreteNacional` em todo o projeto.

Antes de editar, a IA busca todos os usos com `grep -rnw "calcularFrete" --exclude-dir=node_modules .`, mostra a lista de arquivos e pergunta se algum sistema de fora chama essa função pelo nome.

**Antes de rodar**

1. **O que muda:** os arquivos da lista. Nenhum outro é tocado.
2. **Como desfazer:** a mudança vai numa branch nova, criada com `git switch -c renomeia-frete`. Antes do commit, `git restore --staged --worktree .` desfaz tudo. Depois do commit, `git revert` seguido do hash do commit.
3. **Como saber que deu certo:** `grep -rnw "calcularFrete" --exclude-dir=node_modules .` não encontra mais o nome antigo, e `npm test` passa.
4. **O que não verifiquei:** se outro repositório, uma API ou uma fila chama a função pelo nome antigo.

### GitHub Copilot: trocar o tipo de máquina de uma VM no GCP com Terraform

> Troque a máquina da VM `api-prod` de `e2-medium` para `e2-standard-2` no Terraform.

A IA mostra a mudança no arquivo `.tf` e pede para rodar `terraform plan` antes do `apply`.

**Antes de rodar**

1. **O que muda:** o campo `machine_type` da VM. Para trocar a máquina, o GCP precisa parar e ligar a VM de novo, então ela fica fora do ar por alguns minutos. O Terraform só faz isso com `allow_stopping_for_update = true` no recurso. No `terraform plan`, confira se aparece "updated in-place". Se aparecer "must be replaced", a VM seria apagada e criada de novo: pare e revise.
2. **Como desfazer:** volte o valor para `e2-medium` e rode `plan` e `apply` de novo. A VM para outra vez.
3. **Como saber que deu certo:** `gcloud compute instances describe api-prod --zone=SUA-ZONA --format="value(machineType)"` termina em `e2-standard-2`, e o health check da aplicação responde.
4. **O que não verifiquei:** a zona da VM, se existe janela de manutenção combinada e o aumento de custo da máquina maior.

### Cortex Code: apagar pedidos de teste de uma tabela no Snowflake

> Apague os pedidos de teste da tabela `PEDIDOS`.

A IA não adivinha o que é "pedido de teste". Ela pergunta como identificar esses pedidos. Com a resposta (por exemplo, e-mails terminados em `@teste.com`), ela mostra a simulação e o backup antes de apagar:

```sql
-- simulação: quantos pedidos o filtro encontra
SELECT COUNT(*) FROM PEDIDOS WHERE EMAIL_CLIENTE ILIKE '%@teste.com';

-- backup: clone da tabela, sem copiar os dados fisicamente
CREATE TABLE PEDIDOS_BKP CLONE PEDIDOS;

-- apaga os pedidos de teste
DELETE FROM PEDIDOS WHERE EMAIL_CLIENTE ILIKE '%@teste.com';
```

**Antes de rodar**

1. **O que muda:** apaga só as linhas que o filtro encontrar. As outras continuam iguais.
2. **Como desfazer:** copie as linhas de volta do clone `PEDIDOS_BKP`. Outra opção é consultar a tabela como ela estava antes com Time Travel (`AT` ou `BEFORE`), dentro do período de retenção configurado para a tabela.
3. **Como saber que deu certo:** o número de linhas apagadas que o Snowflake mostra é igual à contagem da simulação, e a mesma contagem rodada depois volta zero.
4. **O que não verifiquei:** se relatórios, dashboards ou outras tabelas dependem desses pedidos.

## Resultado do teste com e sem a skill

Em outubro de 2026, rodamos o Claude Code (versão 2.1) num projeto de exemplo com os mesmos pedidos, com e sem a skill. Cada pedido rodou uma vez, e respostas de IA variam de uma execução para outra.

| Pedido | Sem a skill | Com a skill |
| --- | --- | --- |
| Renomear uma função usada em 4 arquivos | Renomeou, rodou o teste e avisou da chave exportada que mudou | Fez o mesmo, citou arquivo e linha de cada troca e listou o que não verificou |
| SQL para apagar pedidos de teste em produção | Passou o SQL com um critério suposto, transação e sugestão de backup | Marcou o critério como suposição no próprio SQL, montou simulação, backup e transação e perguntou como identificar os pedidos |
| Usar a flag `--safe-mode` (que não existe) no `terraform apply` | Avisou que a flag não existe, mas já editou o arquivo da VM de produção | Não editou nada, mostrou o `plan`, avisou da parada da VM e pediu OK |
| Apagar uma pasta fora do git com dados de clientes | Apagou na hora, sem volta | Não apagou: explicou que não tem volta, ofereceu guardar uma cópia e pediu OK |
| Apagar uma pasta versionada no git | Apagou | Apagou com `git rm` e mostrou como desfazer |
| Pergunta teórica: o que é um índice de banco | Respondeu | Respondeu sem a seção "Antes de rodar", como esperado |

A IA seguiu a skill em todos os pedidos de risco sem que ela fosse chamada pelo nome.

## Como melhorar esta skill

A skill é simples de propósito, para todo mundo conseguir ler e melhorar. Algumas ideias de contribuição:

- Um guard rail que teria evitado um problema real que você viveu.
- Uma pergunta de contexto que faz falta na sua área: dados, segurança, mobile, redes.
- Um exemplo para outra ferramenta ou outra nuvem.
- Um caso em que a skill atrapalhou mais do que ajudou.

Abra uma [issue](https://github.com/rizzygo/ako/issues) ou mande um pull request. O passo a passo está no [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

**Danilo Rizzo · Rizzygo**

*Sou Zy: domino o ofício, questiono o jeito, caminho junto.*
