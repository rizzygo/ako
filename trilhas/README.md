# Rizzygo Ako

As trilhas de estudo da Iniciativa Ako, da Rizzygo.

Um site para montar seu roteiro de estudos em TI, em português e de graça. Ele mostra por onde começar, indica materiais gratuitos, traz desafios com problemas do dia a dia e dá XP e conquistas conforme você pratica.

Acesse em **https://rizzygo.github.io/iniciativa-ako/trilhas/**

A primeira trilha é **Primeiros passos em TI**: 16 tópicos em 6 etapas, do "como estudar" até um primeiro projeto publicado no GitHub. No fim, a trilha se divide em seis caminhos: infraestrutura e cloud, desenvolvimento, dados, QA, segurança e produto.

## Como o site funciona

- **Sem cadastro:** o progresso fica salvo só no navegador de quem usa. Na página de conquistas dá para exportar e importar o progresso por arquivo.
- **Sem build:** HTML, CSS e JavaScript puros. Todo o conteúdo fica num arquivo só, o `dados/primeiros-passos.json`.
- **Desafios sorteados:** cada tópico tem um banco de 6 perguntas, e cada tentativa sorteia 3. Quem refaz o desafio não decora as respostas.
- **Revisão rápida:** depois de começar dois tópicos, a pessoa pode fazer revisões com 5 perguntas sorteadas do que já estudou. A revisão não vale XP, mas três revisões com pelo menos 4 acertos dão a conquista Memória afiada.
- **XP por prática:** cada tópico vale até 90 XP. São 20 pelo checklist completo, 30 pelo desafio (2 de 3 acertos), 10 por acertar tudo de primeira, 10 por responder à pergunta Ako e 20 por explicar o assunto para outra pessoa.

## Materiais em português

A Iniciativa Ako escreve lições próprias em português, na pasta [materiais](materiais), para os tópicos em que o melhor material gratuito só existia em inglês ou era um texto solto de blog. Elas são textos originais, não traduções, e dão crédito aos materiais que serviram de base.

| Lição | Tópico |
|---|---|
| [Como estudar tecnologia](materiais/como-estudar.html) | Como estudar tecnologia |
| [As áreas da TI e o que cada pessoa faz](materiais/areas-da-ti.html) | As áreas da TI e as carreiras |
| [Inglês para ler documentação](materiais/ingles-para-ti.html) | Inglês para ler documentação |
| [Linha de comando para iniciantes](materiais/linha-de-comando.html) | Terminal |
| [Linux básico, na prática](materiais/linux-basico.html) | Linux básico |
| [Redes na prática: IP, DNS e portas](materiais/redes-na-pratica.html) | Redes |
| [Como a web funciona, do clique à página](materiais/como-a-web-funciona.html) | Como a web funciona |
| [Primeiros passos no GitHub](materiais/primeiros-passos-github.html) | Git e GitHub |
| [IA com responsabilidade, no estudo e no trabalho](materiais/ia-com-responsabilidade.html) | Usar IA com responsabilidade |
| [Segurança digital no dia a dia](materiais/seguranca-digital.html) | Segurança digital básica |
| [Comunicação no trabalho de tecnologia](materiais/comunicacao-no-trabalho.html) | Comunicação e trabalho em equipe |
| [Seu primeiro projeto no GitHub, do zero ao link](materiais/primeiro-projeto.html) | Seu primeiro projeto no GitHub |

## Materiais pagos, sempre opcionais

Todo tópico dá para concluir só com materiais gratuitos. Quando existe um curso, livro ou certificação paga que vale o investimento, ele aparece numa seção separada do tópico, "Para ir além, se quiser investir". Só entram opções acessíveis e bem avaliadas, com a nota e o número de avaliações conferidos na fonte.

## Três jeitos de contribuir com o conteúdo

1. **Sugerir um material gratuito:** abra uma [issue](https://github.com/rizzygo/ako/issues) com o link, o tópico e uma frase sobre o que a pessoa encontra ali.
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
- **Materiais gratuitos primeiro, sempre conferidos:** abra o link antes de sugerir. Se estiver em inglês, use `"idioma": "en"`. Se só o certificado for pago, escreva `"gratuito": "sim, certificado pago"`. Material pago começa com `não`, como `"gratuito": "não, livro impresso ou e-book"`, e vai para a seção de opções pagas. Diga na `nota` a avaliação e onde ela foi conferida.
- **Desafios com problemas reais:** cada tópico precisa de pelo menos 3 perguntas, e o ideal são 6, para o sorteio variar. Cada uma traz uma situação do dia a dia, quatro alternativas plausíveis, uma certa e uma explicação que ensina. Varie a posição da resposta certa.
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
