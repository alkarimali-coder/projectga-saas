"""
App package initializer.
Provides helper to load models on demand.
"""

from importlib import import_module

def load_models():
    import_module("app.models")
