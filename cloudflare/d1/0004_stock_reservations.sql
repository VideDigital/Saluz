-- SALUZ: reservations tied to orders, not exposed publicly. DEV/STAGING only.
-- Each INSERT is checked and stock deducted by SQLite triggers within D1.batch.
CREATE TABLE IF NOT EXISTS saluz_stock_reservations (
 order_id TEXT NOT NULL REFERENCES saluz_orders(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL REFERENCES saluz_products(id) ON DELETE RESTRICT,
 color TEXT NOT NULL,
 size TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 0 AND 50000000),
 expires_at TEXT NOT NULL,
 released_at TEXT,
 PRIMARY KEY(order_id,product_id,color,size)
);
CREATE INDEX IF NOT EXISTS idx_saluz_stock_reservations_active ON saluz_stock_reservations(expires_at,released_at);
CREATE TRIGGER IF NOT EXISTS saluz_reservation_validate BEFORE INSERT ON saluz_stock_reservations
BEGIN
 SELECT RAISE(ABORT,'Reserva exige pedido aguardando pagamento e frete confirmado')
 WHERE NOT EXISTS (
  SELECT 1 FROM saluz_orders o WHERE o.id=NEW.order_id AND o.status='aguardando_pagamento'
   AND o.payment_state='nao_iniciado' AND o.shipping_cents IS NOT NULL
   AND o.stock_reservation_expires_at=NEW.expires_at AND o.stock_reservation_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
 );
 SELECT RAISE(ABORT,'Estoque indisponível ou preço alterado') WHERE NOT EXISTS (
  SELECT 1 FROM saluz_products p, json_each(p.variants) v
  WHERE p.id=NEW.product_id AND p.is_active=1 AND p.price_cents=NEW.unit_price_cents
   AND json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size
   AND json_type(v.value,'$.stock')='integer'
   AND CAST(json_extract(v.value,'$.stock') AS INTEGER)>=NEW.quantity
 );
END;
CREATE TRIGGER IF NOT EXISTS saluz_reservation_deduct AFTER INSERT ON saluz_stock_reservations
BEGIN
 UPDATE saluz_products SET
 variants=json_set(variants,
  (SELECT '$['||v.key||'].stock' FROM json_each(variants) v
    WHERE json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size LIMIT 1),
  (SELECT CAST(json_extract(v.value,'$.stock') AS INTEGER)-NEW.quantity FROM json_each(variants) v
    WHERE json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size LIMIT 1)),
 revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id=NEW.product_id;
END;
CREATE TRIGGER IF NOT EXISTS saluz_reservation_release_guard BEFORE UPDATE OF released_at ON saluz_stock_reservations
WHEN OLD.released_at IS NULL AND NEW.released_at IS NOT NULL
BEGIN
 SELECT RAISE(ABORT,'Não é possível devolver estoque: variação ausente') WHERE NOT EXISTS (
  SELECT 1 FROM saluz_products p, json_each(p.variants) v WHERE p.id=OLD.product_id
   AND json_extract(v.value,'$.color')=OLD.color AND json_extract(v.value,'$.size')=OLD.size
 );
END;
CREATE TRIGGER IF NOT EXISTS saluz_reservation_release AFTER UPDATE OF released_at ON saluz_stock_reservations
WHEN OLD.released_at IS NULL AND NEW.released_at IS NOT NULL
BEGIN
 UPDATE saluz_products SET variants=json_set(variants,
  (SELECT '$['||v.key||'].stock' FROM json_each(variants) v WHERE json_extract(v.value,'$.color')=OLD.color AND json_extract(v.value,'$.size')=OLD.size LIMIT 1),
  (SELECT CAST(json_extract(v.value,'$.stock') AS INTEGER)+OLD.quantity FROM json_each(variants) v WHERE json_extract(v.value,'$.color')=OLD.color AND json_extract(v.value,'$.size')=OLD.size LIMIT 1)),
 revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id=OLD.product_id;
END;
