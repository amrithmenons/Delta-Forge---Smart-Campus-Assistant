# from werkzeug.security import generate_password_hash, check_password_hash

# def hash_password(password: str) -> str:
#     return generate_password_hash(password)

# def verify_password(hash_pw: str, password: str) -> bool:
#     return check_password_hash(hash_pw, password)


from werkzeug.security import generate_password_hash, check_password_hash
import base64, os
from config import Config

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(hash_pw: str, password: str) -> bool:
    return check_password_hash(hash_pw, password)

def save_base64_file(base64_data: str, filename_hint: str = None) -> str:
    """
    Expects a data URL 'data:<mime>;base64,AAAA...' or plain base64.
    Saves file in backend/uploads and returns path.
    """
    if not os.path.exists(Config.UPLOAD_FOLDER):
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    if base64_data.startswith("data:"):
        parts = base64_data.split(",", 1)
        base64_data = parts[1]

    raw = base64.b64decode(base64_data)
    name = filename_hint or "upload"
    out_path = os.path.join(Config.UPLOAD_FOLDER, f"{name}_{os.urandom(6).hex()}")
    with open(out_path, "wb") as f:
        f.write(raw)
    return out_path
