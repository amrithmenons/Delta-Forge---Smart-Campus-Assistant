
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-change-this")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-this")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('MYSQL_USER','root')}:{os.getenv('MYSQL_PASSWORD','password')}"
        f"@{os.getenv('MYSQL_HOST','127.0.0.1')}:{os.getenv('MYSQL_PORT','3306')}/{os.getenv('MYSQL_DB','smart_campus')}"
    )
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
