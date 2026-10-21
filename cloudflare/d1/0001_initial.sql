-- SALUZ | Cloudflare D1 (SQLite)
-- Aplicar somente a bases D1 vazias de DEV/STAGING até a aprovação de migração.
-- O login Supabase Auth NÃO pode ser copiado. Criar identidade/autenticação separadas.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saluz_admins (
 user_id TEXT PRIMARY KEY NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner','admin')),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS saluz_products (
 id TEXT PRIMARY KEY NOT NULL CHECK (length(id)=36),
 name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 140),
 description TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '',
 image_url TEXT NOT NULL DEFAULT '',
 price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 0 AND 50000000),
 original_price_cents INTEGER CHECK (original_price_cents IS NULL OR
   (original_price_cents > price_cents AND original_price_cents <= 50000000)),
 variants TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(variants) AND json_type(variants)='array'),
 is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)),
 is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_saluz_products_published ON saluz_products(is_active,is_featured,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saluz_products_category ON saluz_products(category,is_active,created_at DESC);

CREATE TABLE IF NOT EXISTS saluz_orders (
 id TEXT PRIMARY KEY NOT NULL CHECK (length(id)=36),
 customer_name TEXT NOT NULL,
 customer_email TEXT NOT NULL,
 customer_phone TEXT NOT NULL,
 customer_cpf TEXT NOT NULL,
 postal_code TEXT NOT NULL,
 address_line TEXT NOT NULL,
 address_number TEXT NOT NULL,
 address_extra TEXT NOT NULL DEFAULT '',
 neighborhood TEXT NOT NULL,
 city TEXT NOT NULL,
 state TEXT NOT NULL,
 items TEXT NOT NULL CHECK (json_valid(items) AND json_type(items)='array'),
 subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents BETWEEN 0 AND 50000000),
 shipping_cents INTEGER CHECK (shipping_cents IS NULL OR shipping_cents>=0),
 payment_method TEXT NOT NULL DEFAULT 'a_definir',
 status TEXT NOT NULL DEFAULT 'solicitacao_recebida'
   CHECK (status IN ('solicitacao_recebida','contatado','aguardando_pagamento','pago_confirmado','em_preparacao','enviado','cancelado')),
 privacy_accepted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 payment_provider TEXT NOT NULL DEFAULT 'nenhum' CHECK (payment_provider IN ('nenhum','mercado_pago')),
 payment_state TEXT NOT NULL DEFAULT 'nao_iniciado'
   CHECK (payment_state IN ('nao_iniciado','checkout_criado','pendente','aprovado','falhou','expirado','cancelado','reembolsado','contestacao')),
 mp_order_id TEXT UNIQUE, mp_checkout_url TEXT, checkout_token_hash TEXT,
 stock_reserved_at TEXT, stock_reservation_expires_at TEXT,
 payment_updated_at TEXT, payment_confirmed_at TEXT,
 CHECK(stock_reservation_expires_at IS NULL OR stock_reserved_at IS NOT NULL),
 CHECK(checkout_token_hash IS NULL OR length(checkout_token_hash)=64)
);
CREATE INDEX IF NOT EXISTS idx_saluz_orders_created ON saluz_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saluz_orders_payment ON saluz_orders(payment_provider,payment_state,payment_updated_at);

CREATE TABLE IF NOT EXISTS saluz_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 session_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK (event_type IN ('page_view','product_view','add_to_cart','checkout_start','checkout_submit','contact_click')),
 page_path TEXT NOT NULL DEFAULT '/',
 event_label TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_saluz_events_created ON saluz_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saluz_events_session_created ON saluz_events(session_id,created_at DESC);

CREATE TABLE IF NOT EXISTS saluz_site_content (
 id INTEGER PRIMARY KEY CHECK(id=1),
 draft TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(draft) AND json_type(draft)='object'),
 published TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(published) AND json_type(published)='object'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 published_at TEXT
);
INSERT OR IGNORE INTO saluz_site_content(id) VALUES (1);

CREATE TABLE IF NOT EXISTS saluz_login_limits (
 key_hash TEXT PRIMARY KEY NOT NULL CHECK(length(key_hash)=64),
 window_start TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0)
);

-- O arquivo físico R2 é compartilhável entre produtos/versões;
-- registrar referências sem assumir que um link histórico deixa de ser necessário.
CREATE TABLE IF NOT EXISTS saluz_media (
 id TEXT PRIMARY KEY NOT NULL,
 r2_key TEXT NOT NULL UNIQUE,
 original_name TEXT NOT NULL,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
 byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=5242880),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 purpose TEXT NOT NULL CHECK(purpose IN ('product','banner','editorial','other')),
 lifecycle TEXT NOT NULL DEFAULT 'active' CHECK(lifecycle IN ('active','trash')),
 uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 trashed_at TEXT,
 deleted_at TEXT,
 CHECK (lifecycle <> 'trash' OR trashed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_saluz_media_sha ON saluz_media(sha256);
CREATE INDEX IF NOT EXISTS idx_saluz_media_lifecycle ON saluz_media(lifecycle,uploaded_at);
CREATE TABLE IF NOT EXISTS saluz_media_references (
 media_id TEXT NOT NULL REFERENCES saluz_media(id) ON DELETE RESTRICT,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('product','product_variant','banner','site_content','order_history')),
 entity_id TEXT NOT NULL,
 field_name TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(media_id,entity_type,entity_id,field_name)
);
CREATE INDEX IF NOT EXISTS idx_saluz_media_references_entity ON saluz_media_references(entity_type,entity_id);

CREATE TABLE IF NOT EXISTS saluz_audit_log (
 id TEXT PRIMARY KEY NOT NULL,
 admin_id TEXT NOT NULL,
 action TEXT NOT NULL,
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 detail TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail))
);
CREATE INDEX IF NOT EXISTS idx_saluz_audit_recent ON saluz_audit_log(created_at DESC);

-- Restrições D1: não basta ter tabela saluz_admins para validar uma sessão.
-- Antes de conectar API de produção: auth, cookies, CSRF, rate-limit, RBAC e backups.
