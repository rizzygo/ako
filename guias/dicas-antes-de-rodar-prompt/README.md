# Dicas antes de rodar

Em cerca de 5 minutos, você configura sua IA para terminar toda sugestão de comando com três respostas: o que muda, como desfazer e como saber que deu certo. Lendo tudo e adicionando as linhas extras, são uns 10 minutos.

Você salva a instrução uma vez e ela vale para as próximas conversas. Funciona no ChatGPT, no Claude, no Gemini, no GitHub Copilot e em qualquer IA que aceite instruções personalizadas.

Prefere com visual e botão de copiar? Abra a [versão em página](https://rizzygo.github.io/iniciativa-ako/guias/dicas-antes-de-rodar-prompt/pagina.html).

## As três perguntas que a IA vai responder

1. **O que isso muda?** Quais arquivos, recursos ou permissões são afetados, e se o comando só lê ou também altera algo.
2. **Como eu desfaço?** O passo exato para voltar atrás. Quando não existe volta, o cuidado precisa ser maior.
3. **Como sei que deu certo?** Um sinal concreto para conferir. "Não deu erro" não quer dizer que funcionou.

## Passo 1: copie a instrução (1 minuto)

Este texto ensina a IA a responder às três perguntas sem você precisar pedir. Ele também está no arquivo [instrucao.txt](instrucao.txt).

```text
Sempre que você sugerir um comando, script, código ou mudança de configuração que eu vá executar, termine a resposta com uma seção chamada "Antes de rodar", com três itens:

1. O que isso muda: quais arquivos, recursos, permissões ou dados são afetados, e se é só leitura ou se altera algo.
2. Como desfazer: o passo exato para voltar atrás. Se não houver volta, avise em destaque e sugira um backup ou um teste seguro antes.
3. Como saber que deu certo: um comando ou sinal concreto para conferir o resultado. "Não deu erro" não conta como confirmação.

Quando existir um modo de simulação (dry-run, plan, --what-if), mostre ele primeiro.
Se faltar contexto para responder com segurança (sistema operacional, versão, se é produção ou teste), pergunte antes de sugerir.
```

## Passo 2: cole a instrução no lugar certo da sua IA (2 minutos)

Cada ferramenta guarda instruções num lugar diferente. A tabela mostra onde colar.

| Ferramenta | Onde colar |
| --- | --- |
| ChatGPT | Em Configurações > Personalização > Instruções personalizadas ([atalho](https://chatgpt.com/#settings/Personalization)). Também dá para usar as instruções de um Projeto. |
| Claude | Clique nas suas iniciais, no canto inferior esquerdo, abra Configurações e cole em "Instruções para o Claude". Também dá para usar as instruções de um Projeto. |
| Gemini | Em Configurações e ajuda > Contexto pessoal > Adicionar ([atalho](https://gemini.google.com/saved-info)). Outra opção é criar um Gem com a instrução. |
| GitHub Copilot | No arquivo `.github/copilot-instructions.md` do repositório. |
| Cursor | Nas regras do projeto, na pasta `.cursor/rules`. |
| Claude Code | No arquivo `CLAUDE.md` do projeto. |
| Outra IA | Cole o texto no começo da conversa. Ele vale só para aquela conversa. |

Os nomes dos menus mudam com frequência. Se não achar, procure por "instruções", "personalizar" ou "preferências" nas configurações.

## Passo 3: teste com uma pergunta do seu dia a dia (2 minutos)

Abra uma conversa nova e faça uma pergunta como uma destas. Os dois exemplos mostram que as três perguntas servem tanto para infraestrutura quanto para dados do negócio.

### Exemplo 1: liberar uma porta no firewall do servidor

> Como libero a porta 80 no firewall do meu servidor Ubuntu?

A resposta deve vir mais ou menos assim:

```bash
# libera conexões HTTP na porta 80
sudo ufw allow 80/tcp
```

**Antes de rodar**

- **O que muda:** cria uma regra no firewall (UFW) que aceita conexões na porta 80 vindas de qualquer endereço. Se o UFW estiver desligado, a regra só passa a valer depois de `sudo ufw enable`. Antes de ligar, libere o SSH com `sudo ufw allow OpenSSH` para não perder o acesso ao servidor.
- **Como desfazer:** `sudo ufw delete allow 80/tcp`
- **Como saber que deu certo:** `sudo ufw status` deve mostrar `80/tcp ALLOW`. De outra máquina, `curl -I http://IP-do-servidor` deve responder, se houver um servidor web rodando.

### Exemplo 2: reajustar preços no banco de dados de uma loja

> Preciso aumentar em 10% o preço de todos os produtos da categoria Acessórios no banco de dados da loja. Como faço?

A resposta deve vir mais ou menos assim:

```sql
-- simulação: mostra o preço atual e o novo, sem alterar nada
SELECT nome, preco, preco * 1.10 AS preco_novo
FROM produtos
WHERE categoria = 'Acessórios';

-- aplica o aumento
UPDATE produtos
SET preco = preco * 1.10
WHERE categoria = 'Acessórios';
```

**Antes de rodar**

- **O que muda:** altera o preço de todos os produtos da categoria Acessórios. Os outros produtos não mudam. Sem a linha `WHERE`, todos os preços da loja subiriam.
- **Como desfazer:** rode o `UPDATE` dentro de uma transação, com `BEGIN;` antes. Se algo estiver errado, `ROLLBACK;` desfaz tudo. Depois do `COMMIT;`, só um backup traz os preços de volta, então salve uma cópia antes: `CREATE TABLE produtos_backup AS SELECT * FROM produtos;`. Dividir por 1,10 depois pode errar centavos por causa do arredondamento.
- **Como saber que deu certo:** rode `SELECT COUNT(*), SUM(preco) FROM produtos WHERE categoria = 'Acessórios';` antes e depois. A quantidade de produtos deve ser a mesma, e a soma, cerca de 10% maior.

Se a seção "Antes de rodar" não aparecer, confira se a instrução foi salva no lugar certo e abra outra conversa.

## Quatro linhas extras para adaptar a instrução ao seu caso (opcional, 3 minutos)

Não fique só estudando prompt: transforme o que você aprende em padrão. Escolha as linhas que fazem sentido para você e cole no fim da instrução principal.

```text
4. Quanto custa: se o comando cria ou altera recursos pagos na nuvem, diga o que gera cobrança e como evitar surpresa na fatura.
5. O que fica exposto: diga se algo passa a ficar acessível pela internet ou com permissão maior que o necessário.
Explique cada parte do comando em uma linha, como para quem está aprendendo.
No fim, me faça uma pergunta curta para eu confirmar que entendi o que vou rodar.
```

## Dois estudos em que quem usou IA superestimou o próprio trabalho

- Num estudo da Universidade Stanford, quem usou um assistente de IA escreveu código menos seguro e acreditava mais que o código estava seguro. ([Perry et al., ACM CCS 2023](https://arxiv.org/abs/2211.03622))
- Num estudo do METR com ferramentas do início de 2025, desenvolvedores experientes levaram 19% mais tempo em tarefas reais usando IA. Mesmo assim, achavam que tinham ficado cerca de 20% mais rápidos. ([METR, julho de 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/))

A IA ajuda muito, mas entender como as coisas funcionam continua sendo com você.

---

**Danilo Rizzo · Rizzygo**

Fez o teste? Abra uma [issue](https://github.com/rizzygo/iniciativa-ako/issues) ou me conte no LinkedIn qual pergunta você adicionaria.

*Sou Zy: domino o ofício, questiono o jeito, caminho junto.*
