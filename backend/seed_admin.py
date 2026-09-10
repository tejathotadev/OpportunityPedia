"""Insert or update the platform admin from .env (ADMIN_EMAIL / ADMIN_PASSWORD).

Prefer `python seed_accounts.py` which also creates the demo customer.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from seed_accounts import seed_accounts


if __name__ == "__main__":
    seed_accounts()
