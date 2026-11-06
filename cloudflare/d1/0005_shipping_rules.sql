-- SALUZ / STAGING ONLY: tabela de entrega local por intervalo de CEP.
-- SEM INSERTs: nenhuma tarifa, prazo ou região é assumida como decisão da Anny.
-- A cotação requer duas condições: linha enabled=1 validada e
-- variável de servidor SALUZ_SHIPPING_RULES_ENABLED=true.
-- NÃO habilitar esta variável na produção nem usar esta tabela como tarifa dos Correios.
CREATE TABLE IF NOT EXISTS saluz_shipping_rules (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 label TEXT NOT NULL CHECK(length(trim(label)) BETWEEN 3 AND 80),
 cep_start TEXT NOT NULL CHECK(length(cep_start)=8 AND cep_start NOT GLOB '*[^0-9]*'),
 cep_end TEXT NOT NULL CHECK(length(cep_end)=8 AND cep_end NOT GLOB '*[^0-9]*'),
 price_cents INTEGER NOT NULL CHECK(price_cents BETWEEN 0 AND 50000000),
 eta_min_days INTEGER NOT NULL CHECK(eta_min_days BETWEEN 1 AND 90),
 eta_max_days INTEGER NOT NULL CHECK(eta_max_days BETWEEN eta_min_days AND 90),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(cep_start<=cep_end)
);
CREATE INDEX IF NOT EXISTS idx_saluz_shipping_rules_enabled_cep
 ON saluz_shipping_rules(enabled,cep_start,cep_end);
