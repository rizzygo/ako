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
