"""Simplified loyalty sync job.

This module contains a placeholder implementation of the loyalty sync job so
that we can exercise the surrounding automation (GitHub Actions, logging, etc.).
The concrete Retail Express / Shopify integrations are intentionally omitted
because they depend on project-specific credentials. The orchestration logic is
kept close to production so that environment variables and safety caps can be
validated.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

SYNC_INTERVAL_SECONDS = int(os.getenv("SYNC_INTERVAL_SECONDS", "300"))
MAX_RE_CUSTOMERS_PER_CYCLE = int(os.getenv("MAX_RE_CUSTOMERS_PER_CYCLE", "0"))  # 0 = no limit
MAX_RE_SALES_PER_CUSTOMER = int(os.getenv("MAX_RE_SALES_PER_CUSTOMER", "0"))    # 0 = no limit

RE_KEY = os.getenv("RE_KEY")
SHOP_STORE = os.getenv("SHOP_STORE")
SHOP_TOKEN = os.getenv("SHOP_TOKEN")


# --------------------------------------------------------------------------------------
# Helper utilities
# --------------------------------------------------------------------------------------

def _normalize_identifier(value: Optional[str]) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _re_sale_id(sale: Dict) -> str:
    return str(sale.get("id") or sale.get("ID") or sale.get("sale_id") or "unknown")


def _is_online_sale(sale: Dict) -> bool:
    channel = (sale.get("channel") or sale.get("source") or "").lower()
    return "web" in channel or "online" in channel or "shopify" in channel


def re_list_customers(token: str, page: int, modified_since_iso: Optional[str]) -> Dict:
    """Pretend to fetch a page of customers from Retail Express."""
    # In this simplified variant we just return an empty page so the sync is a no-op.
    return {"items": [], "next": None}


def re_list_sales_for_customer(token: str, customer_id: str, modified_since_iso: Optional[str]) -> List[Dict]:
    """Placeholder for Retail Express sales API."""
    return []


def _sync_sale_to_shopify(sale: Dict, *, looks_online: bool, already_imported: bool) -> None:
    """Pretend to sync a sale to Shopify. This is a no-op in this repository."""
    return None


def _apply_loyalty_to_shopify(customer: Dict, *, sales: Iterable[Dict]) -> None:
    """Placeholder for Shopify loyalty logic."""
    return None


# --------------------------------------------------------------------------------------
# Core sync routine
# --------------------------------------------------------------------------------------

def run_sync_cycle() -> None:
    now = datetime.utcnow()
    modified_since = now - timedelta(seconds=SYNC_INTERVAL_SECONDS)
    shop_created_since = now - timedelta(days=90)
    customers_processed = 0

    print(
        f"[info] Starting sync cycle with modified_since={modified_since.isoformat()} "
        f"shop_created_since={shop_created_since.isoformat()}"
    )

    page = 1
    while True:
        response = re_list_customers(RE_KEY or "", page, modified_since.isoformat())
        items = response.get("items", [])
        print(f"[debug] Page {page}: fetched {len(items)} customers")

        if not items:
            break

        for c in items:
            email = c.get("email") or c.get("Email") or "unknown"
            try:
                print(f"[info] Fetching sales for {email} (RE id {c.get('id')})...")
                re_sales = re_list_sales_for_customer(RE_KEY or "", c.get("id"), modified_since_iso=None)
            except Exception as sales_err:  # pragma: no cover - placeholder for API errors
                print(f"[warn] Unable to fetch RE sales for {email}: {sales_err}")
                re_sales = []

            re_customer_id_norm = _normalize_identifier(c.get("id"))
            filtered_sales = []
            mismatch_count = 0

            for sale in re_sales:
                sale_re_customer_id = _normalize_identifier(
                    sale.get("customer_id")
                    or sale.get("customerId")
                    or (sale.get("customer") or {}).get("id")
                )
                if sale_re_customer_id and sale_re_customer_id != re_customer_id_norm:
                    mismatch_count += 1
                    continue
                filtered_sales.append(sale)

            if mismatch_count:
                print(
                    f"[warn] {email}: discarded {mismatch_count} sales from RE "
                    f"because customer_id didn't match (kept {len(filtered_sales)})"
                )

            re_sales = filtered_sales
            print(f"[debug] {email}: fetched {len(re_sales)} sales from RE after customer filter")

            sales_processed_for_customer = 0
            for sale in re_sales:
                sales_processed_for_customer += 1
                if MAX_RE_SALES_PER_CUSTOMER and sales_processed_for_customer > MAX_RE_SALES_PER_CUSTOMER:
                    print(
                        f"[info] Hit MAX_RE_SALES_PER_CUSTOMER={MAX_RE_SALES_PER_CUSTOMER} "
                        f"for {email}; skipping remaining sales for this customer."
                    )
                    break

                sale_id = _re_sale_id(sale)
                looks_online = _is_online_sale(sale)
                already_imported = False

                print(
                    f"[debug] {email}: syncing sale {sale_id} "
                    f"(online={looks_online}, imported={already_imported})"
                )
                _sync_sale_to_shopify(sale, looks_online=looks_online, already_imported=already_imported)

            _apply_loyalty_to_shopify(c, sales=re_sales)

            customers_processed += 1
            if MAX_RE_CUSTOMERS_PER_CYCLE and customers_processed >= MAX_RE_CUSTOMERS_PER_CYCLE:
                print(
                    f"[info] Hit MAX_RE_CUSTOMERS_PER_CYCLE={MAX_RE_CUSTOMERS_PER_CYCLE}, "
                    f"stopping early for this sync cycle."
                )
                items = []
                break

        if not response.get("next") or not items:
            break
        page += 1


if __name__ == "__main__":
    while True:
        run_sync_cycle()
        print(f"[info] Sleeping for {SYNC_INTERVAL_SECONDS}s before next cycle...")
        time.sleep(SYNC_INTERVAL_SECONDS)
