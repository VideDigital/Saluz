-- SALUZ | A diferenca entre preco atual e anterior e apenas informativa.
-- O preco efetivamente usado no carrinho continua saluz_products.price_cents.
ALTER TABLE public.saluz_products
  ADD COLUMN IF NOT EXISTS original_price_cents integer;

DO $sql$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saluz_products_original_price_check'
      AND conrelid = 'public.saluz_products'::regclass
  ) THEN
    ALTER TABLE public.saluz_products
      ADD CONSTRAINT saluz_products_original_price_check
      CHECK (
        original_price_cents IS NULL OR
        (original_price_cents > price_cents AND original_price_cents <= 50000000)
      );
  END IF;
END $sql$;
