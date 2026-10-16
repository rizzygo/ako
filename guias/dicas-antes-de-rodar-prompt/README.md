# Antes de rodar

Guia de 10 minutos da **Rizzygo** para configurar sua IA uma vez e fazer toda sugestão de comando vir com três respostas: **o que muda**, **como desfazer** e **como saber que deu certo**.

Você não precisa reescrever o prompt perfeito toda vez. Salva o padrão uma vez, e a IA aplica sempre. Funciona no ChatGPT, no Claude, no Gemini, no Copilot e em qualquer IA que aceite instruções.

## As três perguntas

1. **O que isso muda?** Qual arquivo, qual recurso, qual permissão. E se é só leitura ou se altera algo.
2. **Como eu desfaço?** Se não existe caminho de volta, o cuidado tem que dobrar.
3. **Como sei que deu certo?** "Não deu erro" é diferente de "funcionou".

## Passo 1 · Copie a instrução

O texto também está no arquivo [instrucao.txt](instrucao.txt), e a versão em página está em [pagina.html](pagina.html).

```text
Sempre que você sugerir um comando, script, código ou mudança de configuração que eu vá executar, termine a resposta com uma seção chamada "Antes de rodar", com três itens:

1. O que isso muda: quais arquivos, recursos, permissões ou dados são afetados, e se é só leitura ou se altera algo.
2. Como desfazer: o passo exato para voltar atrás. Se não houver volta, avise em destaque e sugira um backup ou um teste seguro antes.
3. Como saber que deu certo: um comando ou sinal concreto para conferir o resultado. "Não deu erro" não conta como confirmação.

Quando existir um modo de simulação (dry-run, plan, --what-if), mostre ele primeiro.
Se faltar contexto para responder com segurança (sistema operacional, versão, se é produção ou teste), pergunte antes de sugerir.
```

## Passo 2 · Cole na sua IA

| Ferramenta | Onde colar |
| --- | --- |
| ChatGPT | Nas instruções personalizadas, em Personalizar o ChatGPT. Ou nas instruções de um Projeto. |
| Claude | Nas preferências do seu perfil, nas configurações. Ou nas instruções de um Projeto. |
| Gemini | Crie um Gem com essa instrução e use ele para estudar e trabalhar. |
| GitHub Copilot | No arquivo `.github/copilot-instructions.md` do repositório. |
| Cursor | Nas regras do projeto, na pasta `.cursor/rules`. |
| Claude Code | No arquivo `CLAUDE.md` do projeto. |
| Qualquer outra | Cole o texto no começo da conversa. Funciona até a conversa acabar. |

Os nomes dos menus mudam com frequência. Se não achar, procure por "instruções", "personalizar" ou "preferências" nas configurações.

## Passo 3 · Teste com uma pergunta real

> Como libero a porta 80 no firewall do meu servidor Ubuntu?

A resposta deve chegar mais ou menos assim:

```bash
# libera conexões HTTP na porta 80
sudo ufw allow 80/tcp
```

**Antes de rodar**

- **O que muda:** cria uma regra no firewall (UFW) que aceita conexões na porta 80 vindas de qualquer endereço. Se o UFW estiver desligado, a regra só vale depois de `sudo ufw enable`.
- **Como desfazer:** `sudo ufw delete allow 80/tcp`
- **Como saber que deu certo:** `sudo ufw status` deve mostrar `80/tcp ALLOW`. De outra máquina, `curl -I http://IP-do-servidor` deve responder.

Se a resposta veio sem a seção "Antes de rodar", confira se a instrução foi salva no lugar certo e abra uma conversa nova.

## Vá além

Não fique só estudando prompt. Transforme o que você aprende em padrão. Cada linha abaixo pode ser colada no fim da instrução principal.

```text
4. Quanto custa: se o comando cria ou altera recursos pagos na nuvem, diga o que gera cobrança e como evitar surpresa na fatura.
5. O que fica exposto: diga se algo passa a ficar acessível pela internet ou com permissão maior que o necessário.
Explique cada parte do comando em uma linha, como para quem está aprendendo.
No fim, me faça uma pergunta curta para eu confirmar que entendi o que vou rodar.
Se eu não tiver dito meu sistema operacional e a versão da ferramenta, pergunte antes de responder.
```

## Por que isso importa

- Em um estudo de Stanford, quem usou assistente de IA escreveu código menos seguro e, ao mesmo tempo, acreditava mais que o código estava seguro. ([Perry et al., ACM CCS 2023](https://arxiv.org/abs/2211.03622))
- Desenvolvedores experientes levaram 19% mais tempo em tarefas reais usando IA, e mesmo assim achavam que tinham ficado cerca de 20% mais rápidos. ([Estudo METR, julho de 2025](https://the-decoder.com/ai-coding-can-make-developers-slower-even-if-they-feel-faster/))

A IA ajuda, e muito. Mas entender como as coisas funcionam continua sendo com você.

---

**Danilo Rizzo · Rizzygo**

Fez o teste? Abra uma issue ou me conta no LinkedIn qual pergunta você adicionaria.

*Sou Zy: domino o ofício, questiono o jeito, caminho junto.*
