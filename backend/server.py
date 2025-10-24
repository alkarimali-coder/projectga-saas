"""
COAM SaaS Server - Enhanced Security Version
This file now imports from enhanced_server to activate the security features
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check which server to use (allow override via environment variable)
USE_ENHANCED_SERVER = os.getenv("USE_ENHANCED_SERVER", "true").lower() == "true"

if USE_ENHANCED_SERVER:
    logger.info("🔐 Loading Enhanced Security Server...")
    try:
        # Import the enhanced server with all security features
        from enhanced_server import app

        logger.info("✅ Enhanced Security Server loaded successfully!")
        logger.info("🛡️  Security Features Active:")
        logger.info("   • Multi-Factor Authentication (TOTP/SMS/Email)")
        logger.info("   • Field-level PII Encryption (AES-256-GCM)")
        logger.info("   • Enhanced RBAC (6-role system)")
        logger.info("   • Comprehensive Audit Logging")
        logger.info("   • Security Monitoring & Metrics")
        logger.info("   • SOC2/GDPR Compliance Framework")

    except Exception as e:
        logger.error(f"❌ Failed to load enhanced server: {str(e)}")
        logger.info("🔄 Falling back to original server...")
        # Fallback to original implementation
        from original_server import app
else:
    logger.info("📊 Loading Original Server (Security Features Disabled)...")
    from original_server import app

# Export the app for uvicorn
__all__ = ["app"]
