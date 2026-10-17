"""Confere o formato do conteúdo das trilhas. Uso: python3 trilhas/validar.py"""
import json
import pathlib
import sys

ARQ = pathlib.Path(__file__).parent / "dados" / "primeiros-passos.json"
AREAS = {"infra", "dev", "dados", "qa", "seguranca", "produto"}
erros = []


def erro(onde, msg):
    erros.append(f"{onde}: {msg}")


try:
    d = json.loads(ARQ.read_text(encoding="utf-8"))
except json.JSONDecodeError as e:
    print(f"O arquivo não é um JSON válido. Linha {e.lineno}, coluna {e.colno}: {e.msg}")
    sys.exit(1)

etapas = {e["id"] for e in d.get("etapas", [])}
ids = set()
for t in d.get("topicos", []):
    onde = t.get("id", "(tópico sem id)")
    if onde in ids:
        erro(onde, "id repetido")
    ids.add(onde)
    for campo in ["id", "etapa", "titulo", "horas", "resumo", "essencial", "pergunta_ako"]:
        if campo not in t:
            erro(onde, f"falta o campo {campo}")
    if t.get("etapa") not in etapas:
        erro(onde, f"etapa {t.get('etapa')} não existe")
    for a in t.get("areas", []):
        if a not in AREAS:
            erro(onde, f"área desconhecida: {a}")
    if t.get("tipo") == "ramificacao":
        continue
    if len(t.get("checklist", [])) < 2:
        erro(onde, "o checklist precisa de pelo menos 2 itens")
    quiz = t.get("quiz", [])
    if len(quiz) < 3:
        erro(onde, "o desafio precisa de pelo menos 3 perguntas, porque o site sorteia 3 por tentativa")
    for i, q in enumerate(quiz, 1):
        ops = q.get("opcoes", [])
        if len(ops) < 2:
            erro(onde, f"pergunta {i} precisa de pelo menos 2 alternativas")
        if not isinstance(q.get("correta"), int) or not 0 <= q["correta"] < len(ops):
            erro(onde, f"pergunta {i}: 'correta' deve ser a posição da resposta certa, de 0 a {len(ops) - 1}")
        if not q.get("explicacao"):
            erro(onde, f"pergunta {i} está sem explicação")
    for r in t.get("recursos", []):
        url = r.get("url", "")
        if not (url.startswith("https://") or url.startswith("../") or url.startswith("./materiais/")):
            erro(onde, f"recurso '{r.get('titulo')}' precisa de um link https")
        if r.get("idioma") not in ("pt-BR", "en", "es"):
            erro(onde, f"recurso '{r.get('titulo')}' com idioma inválido")

if erros:
    print(f"Encontrei {len(erros)} problema(s):")
    for e in erros:
        print(" -", e)
    sys.exit(1)
print(f"Tudo certo: {len(ids)} tópicos em {len(etapas)} etapas.")
