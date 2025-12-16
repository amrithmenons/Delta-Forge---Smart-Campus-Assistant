
"""
Schedule Routes Blueprint - Using student_id from request (like materials.py)
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, time, date
from extensions import db
from models import (
    User, Routine, ExamSchedule, ScheduleSlot, 
    StudyGoal, ScheduleAnalytics
)

# Create blueprint
schedule_bp = Blueprint('schedule', __name__, url_prefix='/api')

# ============================================
# HELPER FUNCTIONS
# ============================================

def time_to_str(t):
    if isinstance(t, time):
        return t.strftime('%H:%M')
    return str(t) if t else ''

def date_to_str(d):
    if isinstance(d, date):
        return d.strftime('%Y-%m-%d')
    return str(d) if d else ''

def str_to_time(s):
    if isinstance(s, str):
        try:
            return datetime.strptime(s, '%H:%M').time()
        except:
            return time(0, 0)
    return s

def str_to_date(s):
    if isinstance(s, str):
        try:
            return datetime.strptime(s, '%Y-%m-%d').date()
        except:
            return date.today()
    return s

def get_week_dates(start_date):
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    days_since_monday = start_date.weekday()
    monday = start_date - timedelta(days=days_since_monday)
    return [monday + timedelta(days=i) for i in range(7)]

def find_available_slots(occupied_slots, day_start, day_end, slot_duration):
    if not occupied_slots:
        return [day_start]
    
    occupied_times = [(slot.start_time, slot.end_time) for slot in occupied_slots]
    occupied_times.sort(key=lambda x: x[0])
    
    available = []
    current_time = day_start
    
    for start, end in occupied_times:
        if current_time < start:
            gap_minutes = time_diff_minutes(current_time, start)
            if gap_minutes >= slot_duration:
                available.append(current_time)
        if end > current_time:
            current_time = end
    
    if current_time < day_end:
        gap_minutes = time_diff_minutes(current_time, day_end)
        if gap_minutes >= slot_duration:
            available.append(current_time)
    
    return available[:10]

def time_diff_minutes(time1, time2):
    dt1 = datetime.combine(date.today(), time1)
    dt2 = datetime.combine(date.today(), time2)
    return int((dt2 - dt1).total_seconds() / 60)

def add_minutes_to_time(t, minutes):
    dt = datetime.combine(date.today(), t)
    dt += timedelta(minutes=minutes)
    return dt.time()

# ============================================
# ROUTINES API
# ============================================

@schedule_bp.route('/routines', methods=['GET'])
def get_routines():
    """Get all routines for a student"""
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
            
        routines = Routine.query.filter_by(student_id=student_id, is_active=True).all()
        
        return jsonify([{
            'id': r.id,
            'name': r.name,
            'start_time': time_to_str(r.start_time),
            'end_time': time_to_str(r.end_time),
            'days': r.days if r.days else [],
            'color': r.color
        } for r in routines]), 200
    except Exception as e:
        print(f"Error in get_routines: {str(e)}")
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/routine', methods=['POST'])
def create_routine():
    """Create a new routine"""
    try:
        data = request.json
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
        
        routine = Routine(
            student_id=student_id,
            name=data['name'],
            start_time=str_to_time(data['start_time']),
            end_time=str_to_time(data['end_time']),
            days=data.get('days', []),
            color=data.get('color', '#9333ea')
        )
        db.session.add(routine)
        db.session.commit()
        return jsonify({'id': routine.id, 'message': 'Routine created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/routine/<routine_id>', methods=['PUT'])
def update_routine(routine_id):
    """Update a routine"""
    try:
        data = request.json
        student_id = data.get('student_id') or request.args.get('student_id')
        
        routine = Routine.query.filter_by(id=routine_id, student_id=student_id).first()
        
        if not routine:
            return jsonify({'error': 'Routine not found'}), 404
        
        routine.name = data.get('name', routine.name)
        routine.start_time = str_to_time(data.get('start_time', routine.start_time))
        routine.end_time = str_to_time(data.get('end_time', routine.end_time))
        routine.days = data.get('days', routine.days)
        db.session.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/routine/<routine_id>', methods=['DELETE'])
def delete_routine(routine_id):
    """Delete a routine"""
    try:
        student_id = request.args.get('student_id')
        routine = Routine.query.filter_by(id=routine_id, student_id=student_id).first()
        
        if not routine:
            return jsonify({'error': 'Routine not found'}), 404
        
        routine.is_active = False
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================
# EXAMS API
# ============================================

@schedule_bp.route('/exams', methods=['GET'])
def get_exams():
    """Get all exams for a student"""
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
            
        exams = ExamSchedule.query.filter_by(student_id=student_id).all()
        
        return jsonify([{
            'id': e.id,
            'subject': e.subject,
            'exam_date': date_to_str(e.exam_date),
            'start_time': time_to_str(e.start_time),
            'end_time': time_to_str(e.end_time),
            'location': e.location,
            'notes': e.notes
        } for e in exams]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/exam', methods=['POST'])
def create_exam():
    """Create a new exam"""
    try:
        data = request.json
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
        
        exam = ExamSchedule(
            student_id=student_id,
            subject=data['subject'],
            exam_date=str_to_date(data['exam_date']),
            start_time=str_to_time(data['start_time']),
            end_time=str_to_time(data['end_time']),
            location=data.get('location'),
            notes=data.get('notes')
        )
        db.session.add(exam)
        db.session.commit()
        return jsonify({'id': exam.id, 'message': 'Exam created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/exam/<exam_id>', methods=['PUT'])
def update_exam(exam_id):
    """Update an exam"""
    try:
        data = request.json
        student_id = data.get('student_id') or request.args.get('student_id')
        
        exam = ExamSchedule.query.filter_by(id=exam_id, student_id=student_id).first()
        
        if not exam:
            return jsonify({'error': 'Exam not found'}), 404
        
        exam.subject = data.get('subject', exam.subject)
        exam.exam_date = str_to_date(data.get('exam_date', exam.exam_date))
        exam.start_time = str_to_time(data.get('start_time', exam.start_time))
        exam.end_time = str_to_time(data.get('end_time', exam.end_time))
        exam.location = data.get('location', exam.location)
        exam.notes = data.get('notes', exam.notes)
        db.session.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/exam/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    """Delete an exam"""
    try:
        student_id = request.args.get('student_id')
        exam = ExamSchedule.query.filter_by(id=exam_id, student_id=student_id).first()
        
        if not exam:
            return jsonify({'error': 'Exam not found'}), 404
        
        db.session.delete(exam)
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================
# SCHEDULE GENERATION & RETRIEVAL
# ============================================

@schedule_bp.route('/schedule/generate', methods=['POST'])
def generate_schedule():
    """Generate schedule for a student"""
    try:
        data = request.json
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
        
        print(f"🔍 Generating schedule for student: {student_id}")
        
        subjects = data.get('subjects', [])
        if not subjects:
            return jsonify({'error': 'subjects field is required'}), 400
        
        start_date = str_to_date(data['start_date'])
        end_date = str_to_date(data['end_date'])
        study_duration = data.get('study_duration', 90)
        break_duration = data.get('break_duration', 15)
        
        # Delete existing study slots
        ScheduleSlot.query.filter(
            ScheduleSlot.student_id == student_id,
            ScheduleSlot.date >= start_date,
            ScheduleSlot.date <= end_date,
            ScheduleSlot.slot_type == 'study'
        ).delete()
        
        # Get routines and exams
        routines = Routine.query.filter_by(student_id=student_id, is_active=True).all()
        exams = ExamSchedule.query.filter(
            ExamSchedule.student_id == student_id,
            ExamSchedule.exam_date >= start_date,
            ExamSchedule.exam_date <= end_date
        ).all()
        
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        current_date = start_date
        total_slots = 0
        
        while current_date <= end_date:
            day_name = day_names[current_date.weekday()]
            
            # Add routines
            for routine in routines:
                if day_name in routine.days:
                    db.session.add(ScheduleSlot(
                        student_id=student_id,
                        date=current_date,
                        start_time=routine.start_time,
                        end_time=routine.end_time,
                        title=routine.name,
                        slot_type='routine',
                        color=routine.color
                    ))
                    total_slots += 1
            
            # Add exams
            for exam in exams:
                if exam.exam_date == current_date:
                    db.session.add(ScheduleSlot(
                        student_id=student_id,
                        date=current_date,
                        start_time=exam.start_time,
                        end_time=exam.end_time,
                        title=f'{exam.subject} Exam',
                        slot_type='exam',
                        subject=exam.subject,
                        color='#dc2626',
                        priority=3
                    ))
                    total_slots += 1
            
            db.session.flush()
            
            # Find available slots
            occupied = ScheduleSlot.query.filter_by(
                student_id=student_id, date=current_date
            ).all()
            
            available = find_available_slots(occupied, time(8, 0), time(22, 0), study_duration)
            
            # Add study sessions
            for i, slot_time in enumerate(available):
                if i >= len(subjects) * 2:
                    break
                
                subject = subjects[i % len(subjects)]
                end_time = add_minutes_to_time(slot_time, study_duration)
                
                if end_time > time(22, 0):
                    continue
                
                db.session.add(ScheduleSlot(
                    student_id=student_id,
                    date=current_date,
                    start_time=slot_time,
                    end_time=end_time,
                    title=subject['name'],
                    slot_type='study',
                    subject=subject['name'],
                    priority=subject.get('priority', 1),
                    color='#3b82f6'
                ))
                total_slots += 1
                
                # Add break
                if break_duration > 0:
                    break_end = add_minutes_to_time(end_time, break_duration)
                    if break_end <= time(22, 0):
                        db.session.add(ScheduleSlot(
                            student_id=student_id,
                            date=current_date,
                            start_time=end_time,
                            end_time=break_end,
                            title='Break',
                            slot_type='break',
                            color='#10b981'
                        ))
                        total_slots += 1
            
            current_date += timedelta(days=1)
        
        db.session.commit()
        print(f"✅ Schedule generated! {total_slots} slots created")
        return jsonify({'message': 'Schedule generated', 'slots_created': total_slots}), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/schedule', methods=['GET'])
def get_schedule():
    """Get all schedule slots for a student"""
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
            
        slots = ScheduleSlot.query.filter_by(student_id=student_id).all()
        
        return jsonify([{
            'id': s.id,
            'date': date_to_str(s.date),
            'start': time_to_str(s.start_time),
            'end': time_to_str(s.end_time),
            'title': s.title,
            'type': s.slot_type,
            'subject': s.subject,
            'color': s.color,
            'priority': s.priority
        } for s in slots]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/schedule/weekly', methods=['GET'])
def get_weekly_schedule():
    """Get weekly schedule view"""
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'student_id required'}), 400
            
        start_date_str = request.args.get('start_date')
        start_date = str_to_date(start_date_str) if start_date_str else date.today()
        week_dates = get_week_dates(start_date)
        
        slots = ScheduleSlot.query.filter(
            ScheduleSlot.student_id == student_id,
            ScheduleSlot.date >= week_dates[0],
            ScheduleSlot.date <= week_dates[6]
        ).all()
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        days_data = []
        
        for i, day_date in enumerate(week_dates):
            day_slots = [s for s in slots if s.date == day_date]
            days_data.append({
                'date': date_to_str(day_date),
                'day_name': day_names[i],
                'slots': [{
                    'id': s.id,
                    'date': date_to_str(s.date),
                    'start': time_to_str(s.start_time),
                    'end': time_to_str(s.end_time),
                    'title': s.title,
                    'type': s.slot_type,
                    'subject': s.subject,
                    'color': s.color
                } for s in day_slots]
            })
        
        return jsonify({
            'week_start': date_to_str(week_dates[0]),
            'week_end': date_to_str(week_dates[6]),
            'days': days_data
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/schedule/slot/<slot_id>', methods=['PUT'])
def update_slot(slot_id):
    """Update a schedule slot"""
    try:
        data = request.json
        student_id = data.get('student_id') or request.args.get('student_id')
        
        slot = ScheduleSlot.query.filter_by(id=slot_id, student_id=student_id).first()
        
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        
        if 'date' in data:
            slot.date = str_to_date(data['date'])
        if 'start_time' in data:
            slot.start_time = str_to_time(data['start_time'])
        db.session.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/schedule/slot/<slot_id>', methods=['DELETE'])
def delete_slot(slot_id):
    """Delete a schedule slot"""
    try:
        student_id = request.args.get('student_id')
        slot = ScheduleSlot.query.filter_by(id=slot_id, student_id=student_id).first()
        
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        
        db.session.delete(slot)
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@schedule_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'schedule'}), 200

print("✅ Schedule routes loaded (using student_id from request)")