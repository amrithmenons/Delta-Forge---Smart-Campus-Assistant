# backend/routes/auth.py
from flask import request, jsonify, Blueprint, current_app
from extensions import db
from models import User
from utils import hash_password, verify_password
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('fullName') or data.get('full_name') or ''
        
        if not email or not password:
            return jsonify({"msg": "email and password required"}), 400

        # Check if user already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"msg": "User already exists"}), 400

        # Create new user
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password)
        )
        
        db.session.add(user)
        db.session.commit()
        
        current_app.logger.info(f"Created user: {user.id} - {email}")

        # Generate token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            "access_token": access_token,
            "student_id": user.id,
            "user": {
                "email": user.email,
                "full_name": user.full_name
            }
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Database integrity error: {str(e)}")
        return jsonify({"msg": "Email already exists or database constraint violation"}), 400
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Signup error: {str(e)}")
        return jsonify({"msg": f"Signup failed: {str(e)}"}), 500


@bp.route('/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"msg": "email and password required"}), 400

        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"msg": "Invalid credentials"}), 401
        
        # Verify password
        if not verify_password(user.password_hash, password):
            return jsonify({"msg": "Invalid credentials"}), 401

        # Generate token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            "access_token": access_token,
            "student_id": user.id,
            "user": {
                "email": user.email,
                "full_name": user.full_name
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Signin error: {str(e)}")
        return jsonify({"msg": f"Signin failed: {str(e)}"}), 500


# ADD THESE LINES AT THE END:
from . import api
api.register_blueprint(bp)