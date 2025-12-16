
# models.py
from datetime import datetime
import uuid
from extensions import db
from sqlalchemy import LargeBinary, Text

def gen_id():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    full_name = db.Column(db.String(120))
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CourseMaterial(db.Model):
    __tablename__ = 'course_materials'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255))
    subject = db.Column(db.String(120))
    file_type = db.Column(db.String(50))
    file_name = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    file_blob = db.Column(LargeBinary)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    processing_status = db.Column(db.String(50), default='processing')
    content = db.Column(Text(length=4294967295))  # LONGTEXT
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    material_id = db.Column(db.String(36), db.ForeignKey('course_materials.id'), nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    quiz_type = db.Column(db.String(50))
    total_questions = db.Column(db.Integer)
    time_per_question = db.Column(db.Integer, default=20)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    quiz_id = db.Column(db.String(36), db.ForeignKey('quizzes.id'), nullable=False)
    question = db.Column(db.Text)
    options = db.Column(db.JSON)
    correct_answer = db.Column(db.String(255))
    explanation = db.Column(db.Text)
    points = db.Column(db.Integer, default=10)

class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    quiz_id = db.Column(db.String(36), db.ForeignKey('quizzes.id'))
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    score = db.Column(db.Integer)
    correct_answers = db.Column(db.Integer)
    total_questions = db.Column(db.Integer)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

# === SMART SCHEDULER MODELS ===

class Routine(db.Model):
    """Daily routines like sleep, exercise, meals, etc."""
    __tablename__ = "routines"
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)  # Sleep, Exercise, Breakfast, etc.
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    days = db.Column(db.JSON, default=list)  # ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    is_active = db.Column(db.Boolean, default=True)
    color = db.Column(db.String(20), default='#9333ea')  # For UI display
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExamSchedule(db.Model):
    """Exam schedules"""
    __tablename__ = "exam_schedules"
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(255))
    notes = db.Column(db.Text)
    reminder_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScheduleSlot(db.Model):
    """Individual schedule slots - can be study sessions, routines, or exams"""
    __tablename__ = "schedule_slots"
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    slot_type = db.Column(db.String(50), nullable=False)  # study, routine, exam, break, custom
    subject = db.Column(db.String(120))  # For study sessions
    is_completed = db.Column(db.Boolean, default=False)
    completion_notes = db.Column(db.Text)
    priority = db.Column(db.Integer, default=1)  # 1=normal, 2=high, 3=urgent
    color = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for better query performance
    __table_args__ = (
        db.Index('idx_student_date', 'student_id', 'date'),
        db.Index('idx_slot_type', 'slot_type'),
    )

class ScheduleTemplate(db.Model):
    """Reusable schedule templates"""
    __tablename__ = "schedule_templates"
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)  # "Finals Week", "Regular Semester"
    description = db.Column(db.Text)
    template_data = db.Column(db.JSON)  # Store template configuration
    is_public = db.Column(db.Boolean, default=False)
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudyGoal(db.Model):
    """Study goals and targets"""
    __tablename__ = "study_goals"
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    target_hours_per_week = db.Column(db.Float, nullable=False)
    current_hours = db.Column(db.Float, default=0)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class RoomResource(db.Model):
    """Resources shared in study rooms"""
    __tablename__ = 'room_resources'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    room_id = db.Column(db.String(36), db.ForeignKey('study_rooms.id'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    resource_type = db.Column(db.String(50))  # note, link, file, quiz
    title = db.Column(db.String(255))
    content = db.Column(db.Text)
    url = db.Column(db.String(1024))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RevisionLog(db.Model):
    """Track revision sessions"""
    __tablename__ = 'revision_logs'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    duration_minutes = db.Column(db.Integer, default=0)
    topics_reviewed = db.Column(db.JSON)
    effectiveness_rating = db.Column(db.Integer)  # 1-5
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    material_id = db.Column(db.String(36), db.ForeignKey('course_materials.id'))

class ScheduleAnalytics(db.Model):
    """Analytics and insights about schedule adherence"""
    __tablename__ = 'schedule_analytics'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    planned_study_hours = db.Column(db.Float, default=0)
    actual_study_hours = db.Column(db.Float, default=0)
    completion_rate = db.Column(db.Float, default=0)  # Percentage
    subjects_covered = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class MaterialSummary(db.Model):
    __tablename__ = 'material_summaries'

    id = db.Column(db.String(36), primary_key=True, default=gen_id)

    material_id = db.Column(
        db.String(36),
        db.ForeignKey('course_materials.id', ondelete='CASCADE'),
        nullable=False
    )

    student_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )

    summary_type = db.Column(db.String(50))  # easy / brief / detailed
    summary_text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_summary_student', 'student_id'),
        db.Index('idx_summary_material', 'material_id'),
    )

class QuestionPaper(db.Model):
    __tablename__ = 'question_papers'

    id = db.Column(db.String(36), primary_key=True, default=gen_id)

    material_id = db.Column(
        db.String(36),
        db.ForeignKey('course_materials.id', ondelete='CASCADE'),
        nullable=False
    )

    student_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )

    generation_type = db.Column(db.String(50))  
    # manual / pattern / smart

    config = db.Column(db.JSON)   # marks, sections, MCQ counts, etc
    paper_text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_qp_student', 'student_id'),
        db.Index('idx_qp_material', 'material_id'),
    )

class QuestionPattern(db.Model):
    __tablename__ = 'question_patterns'

    id = db.Column(db.String(36), primary_key=True, default=gen_id)

    student_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )

    source = db.Column(db.String(120))  
    # auto-detected / uploaded / scanned / pdf / image

    raw_text = db.Column(db.Text)        # OCR extracted text
    pattern_json = db.Column(db.JSON)    # Deep learning extracted structure

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_pattern_student', 'student_id'),
    )


class StudyRoom(db.Model):
    """Collaborative study rooms"""
    __tablename__ = 'study_rooms'
    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(120))
    description = db.Column(db.Text)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    is_public = db.Column(db.Boolean, default=True)
    max_members = db.Column(db.Integer, default=50)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
