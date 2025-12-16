# routes/revision.py
from flask import jsonify, request, Blueprint
from models import RevisionLog, db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from functools import wraps

revision_bp = Blueprint('revision', __name__)

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    return decorated_function

@revision_bp.route('/revision-logs/<student_id>', methods=['GET'])
@jwt_required()
@handle_errors
def get_revision_logs(student_id):
    """Get all revision logs for a student"""
    current_user_id = get_jwt_identity()
    
    # Security: ensure user can only access their own logs
    if current_user_id != student_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    logs = RevisionLog.query.filter_by(
        student_id=student_id
    ).order_by(RevisionLog.created_at.desc()).all()
    
    out = []
    for l in logs:
        out.append({
            "id": l.id,
            "duration_minutes": l.duration_minutes,
            "topics_reviewed": l.topics_reviewed or [],
            "effectiveness_rating": l.effectiveness_rating,
            "notes": l.notes,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "material_id": l.material_id,
            "session_type": getattr(l, 'session_type', 'manual')
        })
    return jsonify({"logs": out})

@revision_bp.route('/revision-logs', methods=['POST'])
@jwt_required()
@handle_errors
def add_revision_log():
    """Add a new revision log"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Create new log
    new_log = RevisionLog(
        student_id=current_user_id,
        duration_minutes=data.get('duration_minutes', 0),
        topics_reviewed=data.get('topics_reviewed', []),
        effectiveness_rating=data.get('effectiveness_rating'),
        notes=data.get('notes', ''),
        material_id=data.get('material_id'),
        created_at=datetime.utcnow()
    )
    
    # Add session_type if your model supports it
    if hasattr(RevisionLog, 'session_type'):
        new_log.session_type = data.get('session_type', 'manual')
    
    db.session.add(new_log)
    db.session.commit()
    
    return jsonify({
        "message": "Revision session logged successfully",
        "id": new_log.id
    }), 201

@revision_bp.route('/revision-logs/<log_id>', methods=['DELETE'])
@jwt_required()
@handle_errors
def delete_revision_log(log_id):
    """Delete a revision log"""
    current_user_id = get_jwt_identity()
    
    log = RevisionLog.query.filter_by(
        id=log_id,
        student_id=current_user_id
    ).first()
    
    if not log:
        return jsonify({"error": "Log not found"}), 404
    
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({"message": "Log deleted successfully"}), 200

@revision_bp.route('/revision-logs/<log_id>', methods=['PUT'])
@jwt_required()
@handle_errors
def update_revision_log(log_id):
    """Update a revision log"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    log = RevisionLog.query.filter_by(
        id=log_id,
        student_id=current_user_id
    ).first()
    
    if not log:
        return jsonify({"error": "Log not found"}), 404
    
    # Update fields
    if 'duration_minutes' in data:
        log.duration_minutes = data['duration_minutes']
    if 'topics_reviewed' in data:
        log.topics_reviewed = data['topics_reviewed']
    if 'effectiveness_rating' in data:
        log.effectiveness_rating = data['effectiveness_rating']
    if 'notes' in data:
        log.notes = data['notes']
    
    db.session.commit()
    
    return jsonify({
        "message": "Log updated successfully",
        "id": log.id
    }), 200