# create_db.py
import os
from dotenv import load_dotenv
import pymysql

# load variables from .env in the backend folder
load_dotenv()

HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
PORT = int(os.getenv("MYSQL_PORT", "3306"))
USER = os.getenv("MYSQL_USER", "root")
PASSWORD = os.getenv("MYSQL_PASSWORD", "")
DBNAME = os.getenv("MYSQL_DB", "smart_campus")

print(f"Connecting to MySQL at {HOST}:{PORT} as {USER} ...")

conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD)
conn.autocommit(True)
try:
    with conn.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DBNAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        print(f"Database `{DBNAME}` created or already exists.")
finally:
    conn.close()

