#!/usr/bin/env python3
"""Repo-local build tooling. Invoked BY PATH, never installed, never a distribution.

Per conventions/no-internal-packages.md: a product declares no package of its own.
"""
from pipeline.pipeline import main

if __name__ == "__main__":
    main()
