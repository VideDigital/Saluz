-- SALUZ / Cloudflare D1 - autenticacao administrativa paralela (somente DEV/STAGING).
-- Aplicar após 0001_initial.sql; não transferir hashes/senhas do Supabase.
-- Nenhum usuário ou senha é criado por este script.
CREATE TABLE IF NOT EXISTS saluz_auth_credentials (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES saluz_admins(user_id) ON DELETE RESTRICT,
 salt_hex TEXT NOT NULL CHECK(length(salt_hex)=32),
 password_hash_hex TEXT NOT NULL CHECK(length(password_hash_hex)=64),
 iterations INTEGER NOT NULL CHECK(iterations BETWEEN 210000 AND 1000000),
 credential_version INTEGER NOT NULL DEFAULT 1 CHECK(credential_version>=1),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS saluz_auth_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash)=64),
 user_id TEXT NOT NULL REFERENCES saluz_admins(user_id) ON DELETE CASCADE,
 credential_version INTEGER NOT NULL CHECK(credential_version>=1),
 issued_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_saluz_auth_sessions_account ON saluz_auth_sessions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS saluz_auth_login_limits (
 key_hash TEXT PRIMARY KEY NOT NULL CHECK(length(key_hash)=64),
 window_start TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0)
);
-- Reversão: nenhum banco oficial depende destas tabelas; desative API,
-- revogue sessões antes de qualquer retirada, preservando backup.
