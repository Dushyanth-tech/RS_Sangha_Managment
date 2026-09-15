import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
load_dotenv()

_key = os.environ["BANK_ENCRYPTION_KEY"].encode()
_fernet = Fernet(_key)

def encrypt_value(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()

def mask_last4(value: str) -> str:
    digits = value[-4:] if len(value) >= 4 else value
    return f"•••• •••• {digits}"