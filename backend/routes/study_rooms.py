# from flask import request, jsonify
# from . import api
# from extensions import db
# from models import StudyRoom, RoomResource

# @api.route('/study-rooms', methods=['GET'])
# def list_rooms():
#     rooms = StudyRoom.query.order_by(StudyRoom.created_at.desc()).all()
#     out = [{"id": r.id, "name": r.name, "subject": r.subject, "description": r.description} for r in rooms]
#     return jsonify({"rooms": out})

# @api.route('/study-rooms', methods=['POST'])
# def create_room():
#     data = request.get_json() or {}
#     name = data.get('name')
#     subject = data.get('subject')
#     description = data.get('description')
#     created_by = data.get('created_by')
#     if not name or not created_by:
#         return jsonify({"msg":"name and created_by required"}), 400

#     r = StudyRoom(name=name, subject=subject, description=description, created_by=created_by)
#     db.session.add(r)
#     db.session.commit()
#     return jsonify({"id": r.id})

# @api.route('/study-rooms/<room_id>/resources', methods=['GET','POST'])
# def room_resources(room_id):
#     if request.method == 'GET':
#         resources = RoomResource.query.filter_by(room_id=room_id).order_by(RoomResource.created_at.desc()).all()
#         out = [{
#             "id": res.id,
#             "title": res.title,
#             "resource_type": res.resource_type,
#             "content": res.content,
#             "url": res.url,
#             "students": {"full_name": "Unknown"}
#         } for res in resources]
#         return jsonify({"resources": out})

#     # POST
#     data = request.get_json() or {}
#     student_id = data.get('student_id')
#     resource_type = data.get('resource_type')
#     title = data.get('title')
#     content = data.get('content')
#     url = data.get('url')

#     rr = RoomResource(room_id=room_id, student_id=student_id, resource_type=resource_type, title=title, content=content, url=url)
#     db.session.add(rr)
#     db.session.commit()
#     return jsonify({"id": rr.id})

# @api.route('/study-rooms/<room_id>/join', methods=['POST'])
# def join_room(room_id):
#     # For simplicity we don't persist membership; just return ok
#     return jsonify({"msg":"joined"})









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