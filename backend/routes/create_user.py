# backend/routes/create_user.py
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import User
from utils import hash_password

bp = Blueprint("create_user", __name__, url_prefix="/api")

@bp.route("/upsert-user", methods=["POST"])
def upsert_user():
    """
    POST JSON:
      { "id": "<external-uid>", "email": "user@example.com", "full_name": "Full Name" }

    Creates the user row if it doesn't exist, or updates email/full_name if it does.
    """
    data = request.get_json() or {}
    user_id = data.get("id")
    email = data.get("email")
    full_name = data.get("full_name") or data.get("fullName") or ""

    if not user_id or not email:
        return jsonify({"msg": "id and email required"}), 400

    user = User.query.filter_by(id=user_id).first()
    if user:
        user.email = email
        user.full_name = full_name
        db.session.commit()
        return jsonify({"msg": "updated", "id": user.id}), 200

    # model requires password_hash — put a harmless placeholder
    placeholder = hash_password("external-auth-placeholder")
    u = User(id=user_id, email=email, full_name=full_name, password_hash=placeholder)
    db.session.add(u)
    db.session.commit()
    current_app.logger.info("Created user via upsert: %s", user_id)
    return jsonify({"msg": "created", "id": u.id}), 201
