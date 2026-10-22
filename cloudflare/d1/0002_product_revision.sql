-- SALUZ | Controle de concorrência para edição no catálogo D1.
-- Aplicar uma única vez em DEV e STAGING, nunca em produção.
ALTER TABLE saluz_products ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0);
