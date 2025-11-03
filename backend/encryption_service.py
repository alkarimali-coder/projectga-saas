"""
Encryption Service for COAM SaaS Platform
Handles PII encryption/decryption with AES-256-GCM
"""

import os
import base64
import secrets
import logging
from typing import Dict, Any, Optional, Union, List
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
#from core_models import None

logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Custom exception for encryption errors"""

    pass


class KeyManagementError(Exception):
    """Custom exception for key management errors"""

    pass


class EncryptedField:
    """Represents an encrypted field with metadata"""

    def __init__(
        self,
        encrypted_value: str,
        encryption_key_id: str,
        algorithm: str = "AES-256-GCM",
        classification: str = "CONFIDENTIAL",
        created_at: Optional[datetime] = None,
    ):
        self.encrypted_value = encrypted_value
        self.encryption_key_id = encryption_key_id
        self.algorithm = algorithm
        self.classification = classification
        self.created_at = created_at or datetime.now(timezone.utc)

    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "encrypted_value": self.encrypted_value,
            "encryption_key_id": self.encryption_key_id,
            "algorithm": self.algorithm,
            "classification": self.classification.value,
            "created_at": self.created_at,
        }

    def __str__(self):
        return f"EncryptedField(key_id={self.encryption_key_id}, algorithm={self.algorithm})"


class EncryptionService:
    """Comprehensive encryption service with key management"""

    def __init__(self):
        """Initialize encryption service"""
        self.key_size = 32  # 256 bits
        self.salt_size = 16  # 128 bits
        self.nonce_size = 12  # 96 bits for GCM

        # Initialize encryption keys
        self._load_encryption_keys()

        # PII field patterns
        self.pii_patterns = {
            "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "phone": r"\+?[1-9]\d{1,14}",
            "ssn": r"\d{3}-?\d{2}-?\d{4}",
            "credit_card": r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}",
        }

    def _load_encryption_keys(self) -> None:
        """Load encryption keys from environment variables"""
        try:
            master_key = os.getenv("ENCRYPTION_MASTER_KEY")
            if not master_key:
                if os.getenv("ENVIRONMENT", "development") == "development":
                    master_key = base64.b64encode(secrets.token_bytes(32)).decode()
                    logger.warning(
                        f"Generated new master key for development: {master_key}"
                    )
                    logger.warning(
                        "Set ENCRYPTION_MASTER_KEY environment variable for production"
                    )
                else:
                    raise KeyManagementError(
                        "ENCRYPTION_MASTER_KEY not found in environment"
                    )

            self.master_key = base64.b64decode(master_key.encode())

            # Key rotation support
            self.key_versions = {"current": self.master_key}

            # Load additional key versions
            for i in range(1, 6):
                old_key = os.getenv(f"ENCRYPTION_KEY_V{i}")
                if old_key:
                    self.key_versions[f"v{i}"] = base64.b64decode(old_key.encode())

            logger.info(f"Loaded {len(self.key_versions)} encryption keys")

        except Exception as e:
            logger.error(f"Failed to load encryption keys: {str(e)}")
            raise KeyManagementError(f"Key loading failed: {str(e)}")

    def _derive_key(self, master_key: bytes, salt: bytes) -> bytes:
        """Derive encryption key using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend(),
        )
        return kdf.derive(master_key)

    def encrypt_field(
        self,
        plaintext: str,
        classification: str = "CONFIDENTIAL",
    ) -> EncryptedField:
        """Encrypt a field value"""
        try:
            # Generate salt and nonce
            salt = secrets.token_bytes(self.salt_size)
            nonce = secrets.token_bytes(self.nonce_size)

            # Derive key
            derived_key = self._derive_key(self.master_key, salt)

            # Encrypt with AES-256-GCM
            cipher = Cipher(
                algorithms.AES(derived_key), modes.GCM(nonce), backend=default_backend()
            )
            encryptor = cipher.encryptor()
            ciphertext = (
                encryptor.update(plaintext.encode("utf-8")) + encryptor.finalize()
            )

            # Combine salt + nonce + tag + ciphertext
            encrypted_data = salt + nonce + encryptor.tag + ciphertext
            encrypted_value = base64.b64encode(encrypted_data).decode("ascii")

            return EncryptedField(
                encrypted_value=encrypted_value,
                encryption_key_id="current",
                classification=classification,
            )

        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionError(f"Failed to encrypt field: {str(e)}")

    def decrypt_field(
        self, encrypted_field: Union[EncryptedField, Dict[str, Any]]
    ) -> str:
        """Decrypt a field value"""
        try:
            # Handle both EncryptedField objects and raw dicts
            if isinstance(encrypted_field, dict):
                encrypted_value = encrypted_field["encrypted_value"]
                key_id = encrypted_field["encryption_key_id"]
            else:
                encrypted_value = encrypted_field.encrypted_value
                key_id = encrypted_field.encryption_key_id

            # Get decryption key with backward compatibility
            if key_id not in self.key_versions:
                key_mapping = {
                    "default": "current",
                    "primary": "current",
                    "1": "current",
                    "master": "current",
                }

                mapped_key = key_mapping.get(key_id, key_id)
                if mapped_key in self.key_versions:
                    key_id = mapped_key
                else:
                    logger.error(
                        f"Available key IDs: {list(self.key_versions.keys())}, requested: {key_id}"
                    )
                    raise EncryptionError(f"Decryption key {key_id} not found")

            master_key = self.key_versions[key_id]

            # Decode encrypted data
            try:
                encrypted_data = base64.b64decode(encrypted_value.encode("ascii"))
                logger.debug(f"Decoded encrypted data length: {len(encrypted_data)}")
            except Exception as decode_error:
                logger.error(f"Base64 decode failed: {decode_error}")
                raise EncryptionError(f"Invalid base64 encrypted value: {decode_error}")

            # Extract components
            salt = encrypted_data[: self.salt_size]
            nonce = encrypted_data[self.salt_size : self.salt_size + self.nonce_size]
            tag = encrypted_data[
                self.salt_size + self.nonce_size : self.salt_size + self.nonce_size + 16
            ]
            ciphertext = encrypted_data[self.salt_size + self.nonce_size + 16 :]

            # Derive decryption key
            try:
                derived_key = self._derive_key(master_key, salt)
                logger.debug(
                    f"Key derivation successful, derived key length: {len(derived_key)}"
                )
            except Exception as key_error:
                logger.error(f"Key derivation failed: {key_error}")
                raise EncryptionError(f"Key derivation failed: {key_error}")

            # Decrypt with AES-256-GCM
            try:
                cipher = Cipher(
                    algorithms.AES(derived_key),
                    modes.GCM(nonce, tag),
                    backend=default_backend(),
                )
                decryptor = cipher.decryptor()
                plaintext_bytes = decryptor.update(ciphertext) + decryptor.finalize()
                logger.debug("Decryption successful")
            except Exception as decrypt_error:
                logger.error(f"AES-GCM decryption failed: {decrypt_error}")
                raise EncryptionError(f"Decryption failed: {decrypt_error}")

            try:
                return plaintext_bytes.decode("utf-8")
            except UnicodeDecodeError as unicode_error:
                logger.error(f"UTF-8 decoding failed: {unicode_error}")
                raise EncryptionError(f"UTF-8 decoding failed: {unicode_error}")

        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            logger.error(
                f"Key ID: {key_id}, Available keys: {list(self.key_versions.keys())}"
            )
            logger.error(
                f"Encrypted value length: {len(encrypted_value) if isinstance(encrypted_value, str) else 'N/A'}"
            )
            logger.error(f"Exception type: {type(e).__name__}")
            raise EncryptionError(f"Failed to decrypt field: {str(e)}")

    def decrypt_pii_fields(
        self, data: Dict[str, Any], encrypted_fields: List[str]
    ) -> Dict[str, Any]:
        """Decrypt PII fields in a data dictionary"""
        result = data.copy()

        for field_name in encrypted_fields:
            if field_name in result:
                if isinstance(result[field_name], dict):
                    # Field is encrypted
                    try:
                        decrypted_value = self.decrypt_field(result[field_name])
                        result[field_name] = decrypted_value
                        logger.debug(f"Successfully decrypted field {field_name}")
                    except Exception as e:
                        logger.error(f"Failed to decrypt field {field_name}: {str(e)}")
                        logger.error(f"Encrypted field structure: {result[field_name]}")

                        # Try fallback decryption strategies
                        fallback_value = self._try_fallback_decryption(
                            result[field_name], field_name
                        )
                        if fallback_value:
                            result[field_name] = fallback_value
                        else:
                            # Use field-specific placeholders that are more user-friendly
                            field_placeholders = {
                                "company_name": "Company Name",
                                "admin_email": "admin@example.com",
                                "first_name": "User",
                                "last_name": "Name",
                                "address_line1": "Address",
                                "city": "City",
                                "phone": "Phone",
                            }
                            result[field_name] = field_placeholders.get(
                                field_name, f"[ENCRYPTED_{field_name.upper()}]"
                            )
                elif isinstance(result[field_name], str):
                    # Field might already be decrypted or plain text
                    if result[field_name].startswith("[DECRYPTION_FAILED_"):
                        # Keep existing placeholder
                        pass
                    else:
                        # Field is already plain text, leave as is
                        logger.debug(f"Field {field_name} is already plain text")
                else:
                    logger.warning(
                        f"Field {field_name} has unexpected type: {type(result[field_name])}"
                    )

        return result

    def _try_fallback_decryption(
        self, encrypted_field: Dict[str, Any], field_name: str
    ) -> Optional[str]:
        """Try alternative decryption strategies for legacy or corrupted data"""
        try:
            # Strategy 1: Check if data might already be plain text
            encrypted_value = encrypted_field.get("encrypted_value", "")
            if encrypted_value and not encrypted_value.startswith("eyJ"):
                try:
                    decoded = base64.b64decode(encrypted_value.encode("ascii"))
                except:
                    logger.warning(
                        f"Field {field_name} appears to be plain text, not encrypted"
                    )
                    return encrypted_value if len(encrypted_value) < 200 else None

            # Strategy 2: Try with alternative key IDs
            original_key_id = encrypted_field.get("encryption_key_id")
            alternative_keys = ["default", "primary", "master", "v1"]

            for alt_key in alternative_keys:
                if alt_key in self.key_versions and alt_key != original_key_id:
                    try:
                        temp_field = encrypted_field.copy()
                        temp_field["encryption_key_id"] = alt_key
                        return self.decrypt_field(temp_field)
                    except:
                        continue

            return None

        except Exception as e:
            logger.warning(f"Fallback decryption failed for {field_name}: {str(e)}")
            return None


# Global encryption service instance
encryption_service = EncryptionService()
