#!/usr/bin/env python3
"""SALUZ: read-only HTTP smoke test against the deployed Cloudflare staging aliases.

Run: python3 tests/staging-http-smoke.py

This checks the *current published deployment* rather than the un-deployed PR source.
No credentials, writes, checkout submissions, real customer data, or payments.
"""
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

STORE = "https://homologacao.saluz-loja.pages.dev"
ADMIN = "https://homologacao.saluz-admin.pages.dev"


def request(origin, path, expected=200):
    req = Request(
        origin + path,
        headers={
            "Accept": "application/json,text/html",
            "User-Agent": "saluz-staging-smoke/1.0",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=18) as response:
            status = response.status
            ctype = response.headers.get("Content-Type", "")
            payload = response.read(500_000)
    except HTTPError as error:
        status = error.code
        ctype = error.headers.get("Content-Type", "")
        payload = error.read(500_000)
    except (URLError, TimeoutError) as error:
        raise AssertionError(f"{path}: failed to connect to staging ({type(error).__name__})") from error

    assert status == expected, f"{path}: status {status}, expected {expected}"
    print(f"PASS {origin.split('//')[1]}{path}: HTTP {status}")
    if status == 200 and "application/json" in ctype:
        return json.loads(payload)
    return None


def main():
    # Public pages should be deployable and publicly reachable.
    request(STORE, "/loja.html")
    request(ADMIN, "/admin.html")

    # Both deployed Pages functions must be reachable through staging aliases.
    status = request(STORE, "/api/status")
    assert status.get("checkout_enabled") is False, "checkout enabled unexpectedly"
    assert status.get("orders_locked") is True, "orders not locked unexpectedly"

    catalog = request(STORE, "/api/products?source=d1&page=1&limit=2")
    assert catalog.get("configured") is True, "D1 preview not configured"
    products = catalog.get("products")
    assert isinstance(products, list) and len(products) <= 2
    assert all(p.get("is_active") is True for p in products), "unpublished product exposed"

    home = request(STORE, "/api/products/home?source=d1")
    assert isinstance(home.get("featured"), list)
    assert isinstance(home.get("newest"), list)
    assert home.get("configured") is True

    content = request(STORE, "/api/site-content?source=d1")
    assert isinstance(content, dict), "D1 site content response missing"

    # Validation and privacy: never return admin data to anonymous clients.
    request(STORE, "/api/products?source=d1&category=__invalid__", 400)
    request(STORE, "/api/products/not-a-uuid?source=d1", 404)
    request(STORE, "/api/admin/products", 401)
    request(STORE, "/api/migration-admin/products", 401)
    request(ADMIN, "/api/migration-admin/products", 401)
    request(STORE, "/api/migration-media?key=invalid", 404)

    print("SALUZ staging HTTP smoke: all checks passed; functional admin login and uploads remain untested.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
