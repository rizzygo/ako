# Trilhas Rizzygo

Um site para montar seu roteiro de estudos em TI, em português e de graça. Ele mostra por onde começar, indica materiais gratuitos, traz desafios com problemas do dia a dia e dá XP e conquistas conforme você pratica.

Acesse em **https://rizzygo.github.io/iniciativa-ako/trilhas/**

A primeira trilha é **Primeiros passos em TI**: 16 tópicos em 6 etapas, do "como estudar" até um primeiro projeto publicado no GitHub. No fim, a trilha se divide em seis caminhos: infraestrutura e cloud, desenvolvimento, dados, QA, segurança e produto.

## Como o site funciona

- **Sem cadastro:** o progresso fica salvo só no navegador de quem usa. Na página de conquistas dá para exportar e importar o progresso por arquivo.
- **Sem build:** HTML, CSS e JavaScript puros. Todo o conteúdo fica num arquivo só, o `dados/primeiros-passos.json`.
- **XP por prática:** cada tópico vale até 90 XP. São 20 pelo checklist completo, 30 pelo desafio (2 de 3 acertos), 10 por acertar tudo de primeira, 10 por responder à pergunta Ako e 20 por explicar o assunto para outra pessoa.

## Materiais em português

Quando o melhor material gratuito de um tópico só existe em inglês, a Iniciativa Ako escreve uma lição própria em português, na pasta [](materiais). Elas são textos originais, não traduções, e dão crédito aos materiais que serviram de base.

- [Linha de comando para iniciantes](https://rizzygo.github.io/iniciativa-ako/trilhas/materiais/linha-de-comando.html), para o tópico Terminal
- [Linux básico, na prática](https://rizzygo.github.io/iniciativa-ako/trilhas/materiais/linux-basico.html), para o tópico Linux básico
- [Primeiros passos no GitHub](https://rizzygo.github.io/iniciativa-ako/trilhas/materiais/primeiros-passos-github.html), para o tópico Git e GitHub

## Três jeitos de contribuir com o conteúdo

1. **Sugerir um material gratuito:** abra uma [issue](https://github.com/rizzygo/iniciativa-ako/issues) com o link, o tópico e uma frase sobre o que a pessoa encontra ali.
2. **Corrigir ou melhorar um tópico:** edite o `dados/primeiros-passos.json` pelo navegador (ícone de lápis) e mande um pull request. O passo a passo está no [CONTRIBUTING.md](../CONTRIBUTING.md).
3. **Propor uma trilha nova**, por exemplo Cloud e DevOps ou Dados: abra uma issue com as etapas e os tópicos que você imagina.

## O que cada tópico tem no arquivo

```json
{
 "id": "terminal",
 "etapa": "maquina",
 "titulo": "Terminal: a linha de comando",
 "horas": 4,
 "areas": ["infra", "seguranca", "dev"],
 "resumo": "Um parágrafo curto explicando o assunto.",
 "essencial": ["De três a cinco pontos que a pessoa precisa saber."],
 "checklist": ["Quatro ações práticas, escritas no passado: Abri o terminal e rodei pwd"],
 "recursos": [{ "titulo": "...", "fonte": "...", "url": "https://...", "tipo": "curso", "idioma": "pt-BR", "gratuito": "sim", "nota": "O que a pessoa encontra ali." }],
 "quiz": [{ "pergunta": "Um problema do dia a dia", "opcoes": ["A", "B", "C", "D"], "correta": 1, "explicacao": "Por que a resposta certa é a certa." }],
 "pergunta_ako": "Uma pergunta para a pessoa questionar o próprio jeito de aprender."
}
```

- `areas` liga o tópico aos caminhos do fim da trilha (`infra`, `dev`, `dados`, `qa`, `seguranca`, `produto`). Esses tópicos ganham a etiqueta "Para o seu caminho".
- `correta` é a posição da resposta certa, contando a partir de zero.
- Texto entre crases, como `` `git status` ``, aparece formatado como comando.

## Combinados para o conteúdo

- **Escreva para quem está começando:** frases curtas e todo termo técnico explicado na primeira vez.
- **Materiais só gratuitos e conferidos:** abra o link antes de sugerir. Se estiver em inglês, use `"idioma": "en"`. Se o certificado for pago, escreva em `gratuito`.
- **Desafios com problemas reais:** uma situação do dia a dia, quatro alternativas plausíveis, uma certa e uma explicação que ensina. Varie a posição da resposta certa.
- **Rode o verificador antes de mandar:** `python3 trilhas/validar.py` aponta erros de formato.

## Testar no seu computador

O navegador bloqueia a leitura do JSON quando o arquivo é aberto direto do disco. Suba um servidor local na pasta `trilhas`:

```bash
cd trilhas
python3 -m http.server 8000
```

**Antes de rodar**

1. **O que muda:** nada no projeto. O comando só serve os arquivos da pasta em http://localhost:8000 enquanto estiver aberto.
2. **Como desfazer:** aperte Ctrl+C no terminal.
3. **Como saber que deu certo:** abra http://localhost:8000 e a página inicial da trilha aparece.

---

**Danilo Rizzo · Rizzygo**

*Sou Zy: domino o ofício, questiono o jeito, caminho junto.*
