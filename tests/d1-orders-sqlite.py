"""SALUZ / SQLite integration tests for D1 stock holds. Test data only."""
import json
import sqlite3
from pathlib import Path
from datetime import datetime,timedelta,timezone
from uuid import uuid4

db=sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for migration in ["0001_initial.sql","0002_product_revision.sql","0004_stock_reservations.sql"]:
    db.executescript(Path("cloudflare/d1",migration).read_text())
product_a=str(uuid4())
product_b=str(uuid4())
db.execute(
  "INSERT INTO saluz_products(id,name,category,price_cents,variants,is_active) VALUES(?,?,?,?,?,1)",
  (product_a,"Teste de kit","Kits e presentes",15990,json.dumps([{"color":"Neutro","size":"Kit","stock":2}]))
)
db.execute(
  "INSERT INTO saluz_products(id,name,category,price_cents,variants,is_active) VALUES(?,?,?,?,?,1)",
  (product_b,"Teste de bolsa","Nécessaires",6990,json.dumps([{"color":"Floral","size":"Único","stock":1}]))
)
db.commit()
expiry=(datetime.now(timezone.utc)+timedelta(minutes=25)).isoformat(timespec="milliseconds").replace("+00:00","Z")
def qty(product):
    return json.loads(db.execute("SELECT variants FROM saluz_products WHERE id=?",(product,)).fetchone()[0])[0]["stock"]
def reserve(order_id,items,shipping=0):
    db.execute("BEGIN")
    try:
        db.execute("""
        INSERT INTO saluz_orders(id,customer_name,customer_email,customer_phone,customer_cpf,postal_code,
        address_line,address_number,neighborhood,city,state,items,subtotal_cents,
        shipping_cents,status,payment_state,stock_reserved_at,stock_reservation_expires_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,(order_id,"Comprador teste","comprador@example.invalid","11999999999","12345678901","01310930",
         "Rua Teste","1","Centro","São Paulo","SP",json.dumps(items),1000,shipping,
         "aguardando_pagamento","nao_iniciado",datetime.now(timezone.utc).isoformat(),expiry))
        for product,color,size,q,price in items:
            db.execute("""INSERT INTO saluz_stock_reservations
              (order_id,product_id,color,size,quantity,unit_price_cents,expires_at)
              VALUES(?,?,?,?,?,?,?)""",(order_id,product,color,size,q,price,expiry))
        db.commit()
    except Exception:
        db.rollback()
        raise

first=str(uuid4())
reserve(first,[(product_a,"Neutro","Kit",2,15990)])
assert qty(product_a)==0
# Last unit is held: competing order is rejected, never oversold.
second=str(uuid4())
try:
    reserve(second,[(product_a,"Neutro","Kit",1,15990)])
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Oversell should have failed")
assert db.execute("SELECT count(*) FROM saluz_orders WHERE id=?",(second,)).fetchone()[0]==0
assert qty(product_a)==0

# Release exactly once, including duplicate callbacks.
db.execute("UPDATE saluz_stock_reservations SET released_at=? WHERE order_id=?",("2026-10-29T12:00:00Z",first))
assert qty(product_a)==2
db.execute("UPDATE saluz_stock_reservations SET released_at=? WHERE order_id=?",("2026-10-29T12:01:00Z",first))
assert qty(product_a)==2

# A multi-product order with one insufficient line MUST roll back the first hold.
third=str(uuid4())
try:
    reserve(third,[(product_a,"Neutro","Kit",1,15990),(product_b,"Floral","Único",2,6990)])
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Multi-item partial reservation should rollback")
assert qty(product_a)==2 and qty(product_b)==1
assert db.execute("SELECT count(*) FROM saluz_orders WHERE id=?",(third,)).fetchone()[0]==0

# Server price drift and missing confirmed shipping must reject.
for shipping,price in [(0,1),(None,15990)]:
    fourth=str(uuid4())
    try:
        reserve(fourth,[(product_a,"Neutro","Kit",1,price)],shipping)
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("Invalid price/shipping accepted")
    assert qty(product_a)==2

print("SALUZ D1: holds, stock concurrency, atomic rollback, price/shipping guards and idempotent release OK")
