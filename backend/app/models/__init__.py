import importlib

# List all model modules that actually exist in backend/
MODEL_MODULES = [
    "billing_models",
    "inventory_models",
    "tenant_models",
    "financial_models",
    "notification_models",
    "bi_models",
    "security_models",
]

def load_models():
    from app.core.db import Base
    for name in MODEL_MODULES:
        try:
            importlib.import_module(name)
            print(f"✅ Loaded model module: {name}")
        except Exception as e:
            print(f"⚠️ Skipped {name}: {e}")
    return Base

