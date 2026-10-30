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
        if not str(r.get("gratuito", "")).startswith(("sim", "não")):
            erro(onde, f"recurso '{r.get('titulo')}': 'gratuito' deve começar com 'sim' ou 'não'")
        if r.get("idioma") not in ("pt-BR", "en", "es"):
            erro(onde, f"recurso '{r.get('titulo')}' com idioma inválido")

# Mapas das áreas (dados/mapas.json)
ARQ_MAPAS = ARQ.parent / "mapas.json"
try:
    m = json.loads(ARQ_MAPAS.read_text(encoding="utf-8"))
except json.JSONDecodeError as e:
    print(f"O arquivo mapas.json não é um JSON válido. Linha {e.lineno}, coluna {e.colno}: {e.msg}")
    sys.exit(1)
licoes = {p.name for p in (ARQ.parent.parent / "materiais").glob("*.html")}
ids_mapas = {x.get("id") for x in m.get("mapas", [])}
for mapa in m.get("mapas", []):
    mid = mapa.get("id", "(mapa sem id)")
    if mapa.get("area") not in AREAS:
        erro(f"mapa {mid}", f"área desconhecida: {mapa.get('area')}")
    nos = set()
    for secao in mapa.get("secoes", []):
        if not secao.get("titulo") or not secao.get("nos"):
            erro(f"mapa {mid}", "toda seção precisa de título e de pelo menos um tópico")
        for no in secao.get("nos", []):
            onde = f"mapa {mid}, tópico {no.get('id')}"
            if no.get("id") in nos:
                erro(onde, "id repetido no mapa")
            nos.add(no.get("id"))
            for campo in ["id", "titulo", "resumo"]:
                if not no.get(campo):
                    erro(onde, f"falta o campo {campo}")
            if no.get("nivel", "essencial") not in ("essencial", "opcional"):
                erro(onde, "'nivel' deve ser essencial ou opcional")
            if "topico" in no and no["topico"] not in ids:
                erro(onde, f"tópico da trilha {no['topico']} não existe")
            if "licao" in no and no["licao"] not in licoes:
                erro(onde, f"lição {no['licao']} não existe em materiais/")
            if "mapa" in no and no["mapa"] not in ids_mapas:
                erro(onde, f"mapa {no['mapa']} não existe")
            for r in no.get("recursos", []):
                if not r.get("url", "").startswith("https://"):
                    erro(onde, f"recurso '{r.get('titulo')}' precisa de um link https")
                if r.get("idioma") not in ("pt-BR", "en", "es"):
                    erro(onde, f"recurso '{r.get('titulo')}' com idioma inválido")
                if not r.get("fonte"):
                    erro(onde, f"recurso '{r.get('titulo')}' sem fonte")
for a in d.get("areas", []):
    if not str(a.get("mapa", "")).startswith("mapas/#/") or a["mapa"][8:] not in ids_mapas:
        erro(f"área {a.get('id')}", "'mapa' deve apontar para um mapa existente, como mapas/#/infra")

if erros:
    print(f"Encontrei {len(erros)} problema(s):")
    for e in erros:
        print(" -", e)
    sys.exit(1)
print(f"Tudo certo: {len(ids)} tópicos em {len(etapas)} etapas e {len(ids_mapas)} mapas de área.")
