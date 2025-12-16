
from flask import request, jsonify
from . import api
from extensions import db
from models import StudyRoom, RoomResource
from datetime import datetime

# Add messages table to store chat
class RoomMessage(db.Model):
    __tablename__ = 'room_messages'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = db.Column(db.String(36), db.ForeignKey('study_rooms.id'))
    student_id = db.Column(db.String(36))
    student_name = db.Column(db.String(200), default='Unknown')
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@api.route('/study-rooms/<room_id>/messages', methods=['GET', 'POST'])
def room_messages(room_id):
    if request.method == 'GET':
        msgs = RoomMessage.query.filter_by(room_id=room_id).order_by(RoomMessage.created_at).all()
        return jsonify({"messages": [{
            "id": m.id,
            "student_name": m.student_name,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        } for m in msgs]})
    
    # POST
    data = request.get_json() or {}
    msg = RoomMessage(
        room_id=room_id,
        student_id=data.get('student_id'),
        student_name=data.get('student_name', 'Student'),
        content=data.get('content')
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({"id": msg.id})
