"""Root conftest — adds api/ to sys.path so helpers.py is importable."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "api"))
