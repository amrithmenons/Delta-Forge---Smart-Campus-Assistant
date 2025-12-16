from flask import request, jsonify, current_app, make_response
from . import api
from extensions import db
from models import CourseMaterial, Quiz, QuizQuestion, QuizAttempt
from datetime import datetime
import json

# Conditional imports for Gemini
try:
    import google.generativeai as genai
    import os
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    if GEMINI_API_KEY and len(GEMINI_API_KEY) > 10:
        genai.configure(api_key=GEMINI_API_KEY)
        quiz_model = genai.GenerativeModel('gemini-2.5-flash')
        GEMINI_AVAILABLE = True
    else:
        GEMINI_AVAILABLE = False
except:
    GEMINI_AVAILABLE = False

def add_cors_headers(response):
    """Add CORS headers to response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response


def generate_quiz_with_gemini(content, num_questions, quiz_type='mcq'):
    """Generate quiz questions using Gemini AI"""
    if not GEMINI_AVAILABLE:
        return None
    
    try:
        current_app.logger.info(f"🤖 Generating {num_questions} {quiz_type} questions with Gemini...")
        
        # Take a reasonable sample of content
        content_sample = content[:5000] if len(content) > 5000 else content
        
        prompt = f"""Based on this educational content, generate {num_questions} multiple choice questions.

Content:
{content_sample}

Instructions:
1. Create {num_questions} challenging but fair questions
2. Each question should have 4 options (A, B, C, D)
3. Questions should test understanding, not just memorization
4. Include varied difficulty levels
5. Mark the correct answer clearly

Return ONLY a JSON array in this exact format:
[
  {{
    "question": "What is...?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": 0,
    "explanation": "Brief explanation why this is correct"
  }}
]

Return ONLY the JSON array, no other text or markdown formatting."""

        response = quiz_model.generate_content(prompt)
        
        if response and response.text:
            # Clean up response - remove markdown code blocks if present
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            questions = json.loads(text)
            current_app.logger.info(f"✅ Generated {len(questions)} questions")
            return questions
            
    except Exception as e:
        current_app.logger.error(f"❌ Gemini quiz generation failed: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
    
    return None


def generate_fallback_quiz(material, num_questions):
    """Generate simple fallback quiz when Gemini unavailable"""
    questions = []
    
    for i in range(num_questions):
        questions.append({
            "question": f"Question {i+1}: What is a key concept from {material.title}?",
            "options": [
                "Concept A - First major topic",
                "Concept B - Second major topic",
                "Concept C - Third major topic",
                "Concept D - Fourth major topic"
            ],
            "correct_answer": 0,
            "explanation": f"This is based on the study material '{material.title}'. For AI-generated questions, configure Gemini API."
        })
    
    return questions


@api.route('/generate-quiz', methods=['POST', 'OPTIONS'])
def generate_quiz():
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        data = request.get_json(silent=True) or {}
        
        material_id = data.get('material_id')
        student_id = data.get('student_id')
        quiz_type = data.get('quiz_type', 'mcq')
        num_questions = int(data.get('num_questions', 5))
        
        current_app.logger.info(f"📝 Generating quiz: material={material_id}, questions={num_questions}")
        
        # Validate inputs
        if not material_id or not student_id:
            response = jsonify({
                "error": "material_id and student_id required",
                "quiz_id": None,
                "questions": []
            })
            return add_cors_headers(response), 400
        
        # Get material
        material = CourseMaterial.query.filter_by(
            id=str(material_id),
            student_id=str(student_id)
        ).first()
        
        if not material:
            response = jsonify({
                "error": "Material not found",
                "quiz_id": None,
                "questions": []
            })
            return add_cors_headers(response), 404
        
        if not material.content or len(material.content) < 100:
            response = jsonify({
                "error": "Material content not ready or too short",
                "quiz_id": None,
                "questions": []
            })
            return add_cors_headers(response), 400
        
        # Generate questions
        questions_data = None
        gemini_used = False
        
        if GEMINI_AVAILABLE:
            questions_data = generate_quiz_with_gemini(material.content, num_questions, quiz_type)
            if questions_data:
                gemini_used = True
        
        if not questions_data:
            current_app.logger.info("📝 Using fallback quiz generation")
            questions_data = generate_fallback_quiz(material, num_questions)
        
        # Create Quiz in database
        quiz = Quiz(
            material_id=str(material_id),
            created_by=str(student_id),
            quiz_type=quiz_type,
            total_questions=len(questions_data),
            time_per_question=30
        )
        db.session.add(quiz)
        db.session.flush()  # Get quiz.id
        
        # Create QuizQuestions in database
        quiz_questions = []
        for q_data in questions_data:
            question = QuizQuestion(
                quiz_id=quiz.id,
                question=q_data['question'],
                options=q_data['options'],  # Store as JSON
                correct_answer=str(q_data.get('correct_answer', 0)),  # Store index as string
                explanation=q_data.get('explanation', ''),
                points=10
            )
            db.session.add(question)
            quiz_questions.append(question)
        
        db.session.commit()
        
        current_app.logger.info(f"✅ Quiz created: ID={quiz.id}, Questions={len(quiz_questions)}, Gemini={gemini_used}")
        
        # Return quiz data
        response_data = {
            "quiz_id": quiz.id,
            "time_per_question": quiz.time_per_question,
            "total_questions": len(quiz_questions),
            "gemini_used": gemini_used,
            "questions": [
                {
                    "id": q.id,
                    "question": q.question,
                    "options": q.options,
                    "points": q.points,
                    "correct_answer": int(q.correct_answer),
                    "explanation": q.explanation
                }
                for q in quiz_questions
            ]
        }
        
        response = jsonify(response_data)
        return add_cors_headers(response), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("❌ generate_quiz failed")
        response = jsonify({
            "error": f"Quiz generation failed: {str(e)}",
            "quiz_id": None,
            "questions": []
        })
        return add_cors_headers(response), 500


@api.route('/submit-quiz', methods=['POST', 'OPTIONS'])
def submit_quiz():
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        data = request.get_json(silent=True) or {}
        
        quiz_id = data.get('quiz_id')
        student_id = data.get('student_id')
        answers = data.get('answers', [])  # List of selected answer indices
        score = data.get('score', 0)
        correct = data.get('correct', 0)
        total = data.get('total', 0)
        
        current_app.logger.info(f"📊 Quiz submission: ID={quiz_id}, Score={score}/{total}")
        
        if not quiz_id or not student_id:
            response = jsonify({"error": "quiz_id and student_id required"})
            return add_cors_headers(response), 400
        
        # Verify quiz exists
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            response = jsonify({"error": "Quiz not found"})
            return add_cors_headers(response), 404
        
        # Calculate actual score from database questions if answers provided
        if answers:
            questions = QuizQuestion.query.filter_by(quiz_id=quiz_id).all()
            actual_correct = 0
            actual_score = 0
            
            for i, answer in enumerate(answers):
                if i < len(questions):
                    question = questions[i]
                    # correct_answer is stored as string, convert both to int
                    if answer == int(question.correct_answer):
                        actual_correct += 1
                        actual_score += question.points
            
            correct = actual_correct
            score = actual_score
        
        # Create QuizAttempt in database
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            score=score,
            correct_answers=correct,
            total_questions=total
        )
        db.session.add(attempt)
        db.session.commit()
        
        current_app.logger.info(f"✅ Quiz submitted: {correct}/{total} correct, Score: {score}")
        
        response = jsonify({
            "message": "Quiz submitted successfully",
            "attempt_id": attempt.id,
            "score": score,
            "correct": correct,
            "total": total,
            "percentage": round((correct / total * 100) if total > 0 else 0, 1)
        })
        return add_cors_headers(response), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("❌ submit_quiz failed")
        response = jsonify({"error": f"Submission failed: {str(e)}"})
        return add_cors_headers(response), 500


@api.route('/quiz-history/<student_id>', methods=['GET', 'OPTIONS'])
def get_quiz_history(student_id):
    """Get quiz history for a student"""
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        # Get all attempts from database
        attempts = QuizAttempt.query.filter_by(student_id=str(student_id))\
            .order_by(QuizAttempt.completed_at.desc())\
            .all()
        
        attempts_data = []
        for attempt in attempts:
            # Get quiz details
            quiz = Quiz.query.get(attempt.quiz_id)
            material = CourseMaterial.query.get(quiz.material_id) if quiz else None
            
            attempts_data.append({
                "id": attempt.id,
                "quiz_id": attempt.quiz_id,
                "score": attempt.score,
                "correct_answers": attempt.correct_answers,
                "total_questions": attempt.total_questions,
                "percentage": round((attempt.correct_answers / attempt.total_questions * 100) if attempt.total_questions > 0 else 0, 1),
                "completed_at": attempt.completed_at.isoformat(),
                "material_title": material.title if material else "Unknown",
                "quiz_type": quiz.quiz_type if quiz else "mcq"
            })
        
        response = jsonify({
            "attempts": attempts_data,
            "total": len(attempts_data)
        })
        return add_cors_headers(response), 200
        
    except Exception as e:
        current_app.logger.exception("❌ get_quiz_history failed")
        response = jsonify({"error": str(e), "attempts": []})
        return add_cors_headers(response), 500


@api.route('/gemini-quiz-status', methods=['GET', 'OPTIONS'])
def gemini_quiz_status():
    """Check if Gemini is available for quiz generation"""
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    status = {
        "gemini_available": GEMINI_AVAILABLE,
        "quiz_generation": "AI-powered" if GEMINI_AVAILABLE else "Fallback mode"
    }
    
    response = jsonify(status)

    return add_cors_headers(response)
