#!/usr/bin/env python3
"""Procura segredos nos arquivos versionados (git ls-files).

Uso:
  python3 scripts/segredos.py          # varre o repositório
  python3 scripts/segredos.py --test   # roda os testes do próprio script

Sai com código 1 se achar algo. Cada achado diz o arquivo, a linha, o tipo e
como corrigir. A chave de API web do Firebase não conta: ela é pública por
desenho e a proteção fica nas regras do Firestore (decisoes/0003 do ako).
Para liberar um falso positivo, ponha `segredos:ignorar` na mesma linha.
"""
import re
import subprocess
import sys

PADROES = [
    ("chave privada", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----")),
    ("chave de acesso da AWS", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("token do GitHub", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b")),
    ("token do Slack", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b")),
    ("chave da Anthropic", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}")),
    ("chave da OpenAI", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}")),
    ("chave do Stripe", re.compile(r"\b[rs]k_live_[A-Za-z0-9]{20,}\b")),
    ("conta de serviço do Google", re.compile(r'"private_key_id"\s*:\s*"[0-9a-f]{20,}"')),
    ("webhook do Discord ou do Slack", re.compile(r"https://(?:discord(?:app)?\.com/api/webhooks|hooks\.slack\.com/services)/\S{20,}")),
    ("valor de segredo atribuído", re.compile(
        r"(?i)\b[A-Z0-9_]*(?:api[_-]?key|api[_-]?token|secret|token|senha|password)[A-Z0-9_]*\s*[:=]\s*[\"']?"
        r"(?P<valor>[A-Za-z0-9_\-]{32,})")),
]

# Nomes de arquivo que não devem ser versionados.
NOMES = re.compile(r"(?i)(^|/)(\.env(\..+)?|[^/]*token[^/]*\.txt|[^/]*\.pem|[^/]*\.p12|id_rsa|id_ed25519|credentials\.json|service-account[^/]*\.json)$")
NOMES_LIBERADOS = re.compile(r"(?i)\.env\.(exemplo|example|sample)$")

FIREBASE_WEB = re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")
IGNORAR = "segredos:ignorar"


def parece_aleatorio(valor):
    """Valor de verdade mistura maiúscula, minúscula e número, ou é hexadecimal longo.
    Nomes como `linkerd-policy-validator-k8s-tls` não contam."""
    if re.fullmatch(r"[0-9a-f]{32,}", valor):
        return True
    return bool(re.search(r"[A-Z]", valor) and re.search(r"[a-z]", valor) and re.search(r"[0-9]", valor))


def achados_no_texto(caminho, texto):
    saida = []
    for n, linha in enumerate(texto.splitlines(), 1):
        if IGNORAR in linha:
            continue
        sem_firebase = FIREBASE_WEB.sub("", linha)
        for tipo, padrao in PADROES:
            m = padrao.search(sem_firebase)
            if m and ("valor" not in padrao.groupindex or parece_aleatorio(m.group("valor"))):
                saida.append((caminho, n, tipo))
                break
    return saida


def achados_no_nome(caminho):
    if NOMES.search(caminho) and not NOMES_LIBERADOS.search(caminho):
        return [(caminho, 0, "arquivo que costuma guardar segredo")]
    return []


def arquivos():
    r = subprocess.run(["git", "ls-files", "-z"], capture_output=True, check=True)
    return [p for p in r.stdout.decode().split("\0") if p]


def varrer():
    tudo = []
    for caminho in arquivos():
        tudo += achados_no_nome(caminho)
        try:
            with open(caminho, "rb") as f:
                dados = f.read(2_000_000)
        except (IsADirectoryError, FileNotFoundError):
            continue
        if b"\0" in dados[:8000]:
            continue  # binário
        tudo += achados_no_texto(caminho, dados.decode("utf-8", "replace"))
    return tudo


def testar():
    casos_ruins = [
        "AWS_ACCESS_KEY_ID=AKIA" + "ABCDEFGHIJKLMNOP",
        "token: gh" + "p_" + "a" * 36,
        "-----BEGIN RSA " + "PRIVATE KEY-----",
        'CLOUDFLARE_API_TOKEN="' + "Ab3" * 14 + '"',
        "senha = " + "x9Y" * 12,
        "secret: " + "0a1b" * 10,
        "chave = sk-" + "ant-" + "b" * 30,
    ]
    casos_bons = [
        'apiKey: "AIza' + "c" * 35 + '",',
        "token: ${{ secrets.TERMOS_PROIBIDOS }}",
        "password: <sua-senha>",
        "CACHE = 'rotina-2026111215'",
        "Bearer " + "x9" * 20 + "  # segredos:ignorar",
        "TERMOS_PROIBIDOS_ARQUIVO=.termos-proibidos",
        "  secretName: linkerd-policy-validator-k8s-tls",
    ]
    erros = 0
    for c in casos_ruins:
        if not achados_no_texto("t", c):
            print("deveria achar:", c); erros += 1
    for c in casos_bons:
        if achados_no_texto("t", c):
            print("não deveria achar:", c); erros += 1
    for nome, esperado in [(".env", True), ("cloudflare-token.txt", True), ("a/.env.exemplo", False), ("rotina/sw.js", False)]:
        if bool(achados_no_nome(nome)) != esperado:
            print("nome errado:", nome); erros += 1
    print("segredos.py: testes", "ok" if not erros else f"com {erros} erro(s)")
    return 1 if erros else 0


def main():
    if "--test" in sys.argv:
        return testar()
    achados = varrer()
    for caminho, linha, tipo in achados:
        onde = f"{caminho}:{linha}" if linha else caminho
        print(f"{onde}: parece {tipo}.")
    if achados:
        print(
            "\nSegredo não entra no repositório. Tire o valor do arquivo, troque a chave no serviço "
            "(ela já vazou se foi para o GitHub) e guarde num secret do GitHub ou no cofre do sistema. "
            f"Se for falso positivo, ponha '{IGNORAR}' na linha."
        )
        return 1
    print("segredos.py: nenhum segredo nos arquivos versionados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
