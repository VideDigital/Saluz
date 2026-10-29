#!/usr/bin/env python3
"""SALUZ: staging D1 cart quote contract tests. READ-ONLY against real D1.

A POST to /api/migration-orders/quote is only a *quote*: this script never
submits customer information, creates orders, reserves stock or pays. It
discovers a currently published DEMONSTRAÇÃO product from staging, validates
server-side price integrity and rejects invalid cart/origin inputs.

Run: python3 tests/staging-quote-smoke.py
"""
import json
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ORIGIN = "https://homologacao.saluz-loja.pages.dev"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SaluzQuoteSmoke/1.0)",
    "Accept": "application/json",
}


def call(path, method="GET", payload=None, origin=None, content_type="application/json"):
    headers = HEADERS.copy()
    body = None
    if method == "POST":
        headers["Content-Type"] = content_type
        headers["Origin"] = ORIGIN if origin is None else origin
        body = json.dumps(payload).encode("utf-8") if payload is not None else b"{}"
    request = Request(ORIGIN + path, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=20) as res:
            status, response = res.status, res.read(256_000)
    except HTTPError as error:
        status, response = error.code, error.read(256_000)
    except (URLError, TimeoutError) as error:
        raise AssertionError(f"{method} {path}: indisponível ({type(error).__name__})") from error
    try:
        data = json.loads(response)
    except ValueError as error:
        raise AssertionError(f"{method} {path}: não retornou JSON (HTTP {status})") from error
    return status, data


def require(status, expected, label):
    assert status == expected, f"{label}: HTTP {status}, esperado {expected}"
    print(f"PASS {label}: HTTP {status}")


def main():
    status, listing = call("/api/products?source=d1&page=1&limit=48")
    require(status, 200, "catálogo público D1 de homologação")
    assert listing.get("configured") is True
    products = listing.get("products")
    assert isinstance(products, list)

    # The test must only use fake/demo records, never assume real stock.
    chosen = None
    for product in products:
        if not str(product.get("name", "")).upper().startswith("DEMONSTRAÇÃO"):
            continue
        if not isinstance(product.get("price_cents"), int) or product["price_cents"] <= 0:
            continue
        variants = product.get("variants")
        if isinstance(variants, str):
            variants = json.loads(variants)
        if not isinstance(variants, list):
            continue
        for variant in variants:
            if (isinstance(variant, dict) and isinstance(variant.get("stock"), int)
                    and variant["stock"] >= 1 and variant.get("color") and variant.get("size")):
                chosen = product, variant
                break
        if chosen:
            break
    assert chosen, "Nenhum produto DEMONSTRAÇÃO publicado com estoque em STAGING"
    product, variant = chosen

    payload = {"items": [{
        "id": product["id"],
        "color": variant["color"],
        "size": variant["size"],
        "quantity": 1,
        "price_cents": 1,  # malicious client-supplied price must be ignored
    }], "postal_code": "01310930"}

    status, quote = call("/api/migration-orders/quote", "POST", payload)
    require(status, 200, "cotação D1 do produto de demonstração")
    assert quote.get("source") == "D1 staging", "Cotação não veio do D1 STAGING"
    assert quote.get("payment_enabled") is False, "Pagamento habilitado indevidamente"
    assert quote.get("shipping_cents") is None and quote.get("total_cents") is None
    assert quote.get("shipping_status") == "aguardando_configuracao"
    assert quote.get("subtotal_cents") == product["price_cents"], "Preço não corresponde ao D1"
    assert quote.get("items", [{}])[0].get("unit_price_cents") == product["price_cents"]
    assert quote.get("items", [{}])[0].get("quantity") == 1
    print("PASS valor consultado no servidor; frete e pagamento continuam bloqueados")

    invalid = json.loads(json.dumps(payload))
    invalid["items"][0]["quantity"] = 0
    status, _ = call("/api/migration-orders/quote", "POST", invalid)
    require(status, 400, "quantidade inválida")

    invalid = json.loads(json.dumps(payload))
    invalid["items"][0]["quantity"] = min(10, variant["stock"] + 1)
    if invalid["items"][0]["quantity"] > variant["stock"]:
        status, _ = call("/api/migration-orders/quote", "POST", invalid)
        require(status, 400, "quantidade acima do estoque")

    invalid = json.loads(json.dumps(payload))
    invalid["items"].append(dict(invalid["items"][0]))
    status, _ = call("/api/migration-orders/quote", "POST", invalid)
    require(status, 400, "variação duplicada")

    status, _ = call("/api/migration-orders/quote", "POST", payload,
                     origin="https://pagina-externa.invalid")
    require(status, 403, "origem externa bloqueada")

    status, _ = call("/api/migration-orders/quote", "POST", payload,
                     content_type="text/plain")
    require(status, 415, "content-type inválido")

    print("SALUZ: cotação de homologação segura; SEM escrita, pedido, reserva, ou cobrança.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, KeyError, IndexError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
