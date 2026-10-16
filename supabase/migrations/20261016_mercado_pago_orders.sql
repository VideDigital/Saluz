-- SALUZ / Mercado Pago Orders: estrutura privada, sem liberar pagamentos.
-- Aplicar primeiro em homologacao; ativacao exige reserva transacional de estoque.
ALTER TABLE public.saluz_orders
 ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'nenhum',
 ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'nao_iniciado',
 ADD COLUMN IF NOT EXISTS mp_order_id text,
 ADD COLUMN IF NOT EXISTS mp_checkout_url text,
 ADD COLUMN IF NOT EXISTS checkout_token_hash text,
 ADD COLUMN IF NOT EXISTS stock_reserved_at timestamptz,
 ADD COLUMN IF NOT EXISTS stock_reservation_expires_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_updated_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saluz_mp_provider_check') THEN
  ALTER TABLE public.saluz_orders ADD CONSTRAINT saluz_mp_provider_check
   CHECK (payment_provider IN ('nenhum','mercado_pago'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saluz_mp_state_check') THEN
  ALTER TABLE public.saluz_orders ADD CONSTRAINT saluz_mp_state_check
   CHECK (payment_state IN ('nao_iniciado','checkout_criado','pendente','aprovado','falhou','expirado','cancelado','reembolsado','contestacao'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saluz_mp_reservation_check') THEN
  ALTER TABLE public.saluz_orders ADD CONSTRAINT saluz_mp_reservation_check
   CHECK (stock_reservation_expires_at IS NULL OR stock_reserved_at IS NOT NULL);
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS saluz_mp_order_unique
 ON public.saluz_orders (mp_order_id) WHERE mp_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS saluz_mp_state_lookup
 ON public.saluz_orders (payment_state,payment_updated_at) WHERE payment_provider = 'mercado_pago';
COMMENT ON COLUMN public.saluz_orders.checkout_token_hash IS
 'SHA-256 de token aleatorio de autorizacao para iniciar checkout; nunca salvar o token original.';
COMMENT ON COLUMN public.saluz_orders.stock_reserved_at IS
 'Marcador preenchido SOMENTE pelo fluxo transacional de reserva de estoque, ainda pendente.';
REVOKE ALL ON public.saluz_orders FROM anon,authenticated;
GRANT ALL ON public.saluz_orders TO service_role;
