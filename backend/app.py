
# app.py
from flask import Flask, jsonify, send_from_directory, abort, request, current_app, make_response
from config import Config
from extensions import db, migrate, jwt
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import safe_join
import os

# Blueprints
from routes import api
from routes.create_user import bp as create_user_bp
from routes.auth import bp as auth_bp
from routes.schedule_routes import schedule_bp
from routes.summary import summary_bp
from routes.revision import revision_bp  # ✅ ADD THIS LINE

from datetime import timedelta

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # ✅ INCREASE TOKEN EXPIRATION TO 24 HOURS
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    
    # CORS Configuration
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:5173"}},
        supports_credentials=False
    )

    # Register blueprints
    app.register_blueprint(api, url_prefix="/api")
    app.register_blueprint(create_user_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(summary_bp, url_prefix="/api")
    app.register_blueprint(revision_bp, url_prefix="/api")  # ✅ ADD THIS LINE

    # Uploads setup
    UPLOAD_ROOT = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(UPLOAD_ROOT, exist_ok=True)

    @app.route("/uploads/<student_id>/<filename>")
    def serve_uploaded_file(student_id, filename):
        directory = os.path.join(UPLOAD_ROOT, student_id)
        try:
            target = safe_join(directory, filename)
        except Exception:
            abort(404)

        if not target or not os.path.isfile(target):
            abort(404)

        return send_from_directory(directory, filename, as_attachment=True)

    # Root
    @app.route("/")
    def root():
        return jsonify({"msg": "Smart Campus Backend running"}), 200

    # Current user (JWT-based)
    @app.route("/api/me", methods=["GET"])
    @jwt_required()
    def get_current_user():
        try:
            identity = get_jwt_identity()
            from models import User

            user = User.query.get(identity)
            if not user:
                return jsonify({"error": "user_not_found"}), 404

            return jsonify({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            }), 200

        except Exception as e:
            current_app.logger.exception("GET /api/me failed")
            return jsonify({"error": str(e)}), 500

    # Debug: list all routes
    @app.route("/api/debug/routes", methods=["GET"])
    def debug_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                "endpoint": rule.endpoint,
                "methods": list(rule.methods - {"HEAD", "OPTIONS"}),
                "path": str(rule)
            })
        routes.sort(key=lambda x: x["path"])
        return jsonify(routes), 200

    # Global OPTIONS handler
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            response = make_response("", 200)
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            return response
        return None

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)