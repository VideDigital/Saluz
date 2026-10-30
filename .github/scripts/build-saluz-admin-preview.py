#!/usr/bin/env python3
"""Build a public-only SALUZ admin Pages package with the admin-only API proxy.

Cloudflare Pages Functions must come from admin-deploy/functions, never from
the main storefront functions/ directory. No secrets or private files are copied.
Usage: python3 .github/scripts/build-saluz-admin-preview.py <absolute-output-dir>
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
SUFFIXES = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg",
            ".webp", ".ico", ".txt", ".woff2", ".xml"}
CONFIG_FILES = {"_headers", "_redirects"}
REQUIRED_FILES = {
    "admin.html", "admin.js", "admin.css", "saluz-admin-extras.js",
    "saluz-studio.js", "saluz-campaigns.js", "saluz-mobile.js",
    "saluz-product-dialog.css", "_headers",
}
PROXY = ROOT / "admin-deploy/functions/api/[[path]].js"


def build(output: Path) -> None:
    output = output.resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError("Build output must be outside repository to avoid recursive copy")
    if output.exists():
        raise ValueError("Output path already exists; refusing to overwrite it")
    if not PROXY.is_file():
        raise RuntimeError("Admin-only API proxy is missing")
    (output / "public").mkdir(parents=True)
    for item in ROOT.iterdir():
        if item.is_file() and (item.suffix.lower() in SUFFIXES or item.name in CONFIG_FILES):
            shutil.copy2(item, output / "public" / item.name)
    absent = REQUIRED_FILES - {p.name for p in (output / "public").iterdir()}
    if absent:
        raise RuntimeError(f"Missing required public assets: {sorted(absent)}")

    admin_html = (output / "public/admin.html").read_text(encoding="utf-8")
    if "./admin.js?v=20261030-tab-return" not in admin_html:
        raise RuntimeError("admin.html does not reference the tested session-fix build")
    admin_js = (output / "public/admin.js").read_text(encoding="utf-8")
    if "invalidateAdminSession" not in admin_js or "ensureAdminResponse" not in admin_js:
        raise RuntimeError("Admin session invalidation fix is missing")

    dest = output / "functions/api/[[path]].js"
    dest.parent.mkdir(parents=True)
    shutil.copy2(PROXY, dest)
    proxy_content = dest.read_text(encoding="utf-8")
    if "ADMIN_API_ORIGIN" not in proxy_content or "https://homologacao.saluz-loja.pages.dev" not in proxy_content:
        raise RuntimeError("Admin proxy is not the reviewed restricted version")

    if any((output / "public" / secret).exists() for secret in ("README.md", "cloudflare", "supabase", ".env", ".git")):
        raise RuntimeError("Non-public project content in deployment bundle")
    print(f"SALUZ admin build: {len(list((output / 'public').iterdir()))} public assets, one protected API proxy")
    print("Environment: STAGING only; production checkout and main branch remain untouched.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Specify output directory as argument")
    build(Path(sys.argv[1]))
