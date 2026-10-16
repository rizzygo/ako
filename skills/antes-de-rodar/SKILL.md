---
name: antes-de-rodar
description: Use sempre que for sugerir ou executar um comando, script, migração, mudança de código, de infraestrutura ou de configuração. Confirma o contexto, segue guard rails contra alucinação, problemas e retrabalho, e termina com a seção "Antes de rodar" (o que muda, como desfazer, como saber que deu certo e o que não foi verificado).
---

# Antes de rodar

Nenhuma mudança acontece sem que a pessoa saiba o que muda, como desfazer e como conferir.

## 1. Confirme o contexto antes de começar

Primeiro, procure a resposta no projeto: README, arquivos de versão (`package.json`, `go.mod`, `requirements.txt`, `versions.tf`), configurações e histórico do git. Pergunte só o que faltar e puder mudar a resposta, no máximo três perguntas, como estas:

- Em que ambiente isso vai rodar: produção, homologação ou teste?
- Qual sistema operacional, versão da ferramenta, banco de dados ou nuvem?
- Que resultado mostra que deu certo?
- Você quer que eu só sugira ou que eu também execute?

Se o pedido estiver ambíguo, pergunte antes de escrever código.

## 2. Siga os guard rails

### Contra alucinação

- Leia o arquivo antes de editar. Nunca suponha o conteúdo.
- Não invente comando, flag, função, API, versão ou caminho. Se não confirmou que existe, escreva "não confirmei" e mostre como conferir: `--help`, a documentação oficial ou uma busca no código.
- Cite o arquivo e a linha que justificam cada mudança.
- Separe o que você verificou do que está supondo.

### Contra problemas

- Mostre a simulação primeiro, quando existir: `--dry-run`, `terraform plan`, `kubectl diff`, `git diff`, um `SELECT` antes do `UPDATE` ou do `DELETE`.
- Peça confirmação explícita antes de qualquer ação destrutiva ou difícil de desfazer: apagar arquivos ou dados, `DROP`, `rm -rf`, `git push --force`, mudar permissões, mexer em produção.
- Nunca coloque senhas, tokens ou chaves no código, em logs ou na resposta.
- Conceda só a permissão necessária.

### Contra retrabalho

- Faça a menor mudança que resolve o pedido. Melhorias fora do pedido vão como sugestão separada.
- Faça uma mudança por vez e confira antes de seguir para a próxima.
- Siga o padrão que o projeto já usa: estilo, bibliotecas, estrutura de pastas.

## 3. Termine com a seção "Antes de rodar"

Toda resposta com comando, script, código ou mudança de configuração termina assim:

**Antes de rodar**

1. **O que muda:** arquivos, recursos, permissões ou dados afetados, e se a ação só lê ou também altera.
2. **Como desfazer:** o passo exato para voltar atrás. Se não houver volta, avise em destaque e sugira um backup ou um teste seguro antes.
3. **Como saber que deu certo:** um comando ou sinal concreto. "Não deu erro" não conta como confirmação.
4. **O que não verifiquei:** suposições e pontos que a pessoa precisa conferir.

## 4. Deixe uma boa pergunta

Quando ajudar a pessoa a entender melhor, acrescente depois do "Antes de rodar" uma destas perguntas, adaptada ao caso:

- Existe um jeito mais simples de fazer isso?
- O que acontece se rodar duas vezes?
- Quem mais é afetado por essa mudança?
- Como você vai saber, daqui a uma semana, que isso continua funcionando?
