-- Banco D1 do push da Rotina. Um aparelho por linha; nada de nome, e-mail ou texto do lembrete.
CREATE TABLE IF NOT EXISTS aparelhos (
  id TEXT PRIMARY KEY,        -- número aleatório criado no aparelho
  endpoint TEXT NOT NULL,     -- endereço do serviço de push do navegador (Google, Apple, Mozilla)
  p256dh TEXT NOT NULL,       -- chave pública do navegador, para cifrar o push
  auth TEXT NOT NULL,
  fuso TEXT NOT NULL,         -- ex.: America/Sao_Paulo
  agenda TEXT NOT NULL,       -- JSON: horários e intervalos, por chave
  estado TEXT NOT NULL,       -- JSON: próximos avisos, tocados hoje, adiados
  atualizado INTEGER NOT NULL -- última vez que o aparelho mandou a agenda (ms)
);

-- Contador da IA da Zumi (rota /zumi). Só números: 'g:<dia>' é o total do dia, 'a:<id>:<dia>' é o de um aparelho.
-- Não guarda o que a pessoa mandou nem o que a Zumi respondeu. Linhas com mais de 2 dias saem às 6h UTC.
CREATE TABLE IF NOT EXISTS zumi_uso (
  chave TEXT PRIMARY KEY,
  dia TEXT NOT NULL,          -- AAAA-MM-DD em UTC, o mesmo relógio da cota do Workers AI
  n INTEGER NOT NULL
);
