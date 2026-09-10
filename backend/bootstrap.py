"""Run from the backend folder: python bootstrap.py"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db.bootstrap import bootstrap

if __name__ == "__main__":
    bootstrap()
