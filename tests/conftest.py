"""Make twlab importable whether or not `pip install -e .` has run (belt-and-suspenders for CI/local)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "data-pipeline"))
