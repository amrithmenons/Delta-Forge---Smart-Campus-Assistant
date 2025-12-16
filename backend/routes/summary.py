# # from flask import request, jsonify, Blueprint
# # from models import (
# #     CourseMaterial,
# #     MaterialSummary,
# #     QuestionPaper,
# #     QuestionPattern
# # )
# # from extensions import db
# # import google.generativeai as genai
# # import os
# # import json
# # from functools import wraps
# # import time
# # from flask_jwt_extended import jwt_required, get_jwt_identity

# # # Create blueprint
# # summary_bp = Blueprint('summary', __name__)

# # # =====================================================
# # # GEMINI (DEEP LEARNING MODEL) CONFIGURATION
# # # =====================================================
# # GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDO4IPd2s0JMxH1bdj0t0AUS5kOEKLuIRQ")
# # if not GEMINI_API_KEY:
# #     print("⚠️  WARNING: GEMINI_API_KEY environment variable not set")

# # # Configuration constants
# # MAX_CONTENT_LENGTH = 15000
# # ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp'}
# # MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# # def get_model():
# #     """Get Gemini model with error handling"""
# #     if not GEMINI_API_KEY:
# #         raise RuntimeError("GEMINI_API_KEY not configured. Please set the environment variable.")
# #     try:
# #         genai.configure(api_key=GEMINI_API_KEY)
# #         return genai.GenerativeModel("gemini-2.5-flash")
# #     except Exception as e:
# #         raise RuntimeError(f"Failed to initialize Gemini model: {str(e)}")

# # # =====================================================
# # # UTILITY FUNCTIONS
# # # =====================================================
# # def validate_student_id(student_id):
# #     """Validate student_id parameter (UUID or numeric)"""
# #     if not student_id:
# #         return False
# #     return True

# # def sanitize_text(text, max_length=None):
# #     """Sanitize and truncate text input"""
# #     if not text:
# #         return ""
# #     text = str(text).strip()
# #     if max_length and len(text) > max_length:
# #         text = text[:max_length]
# #     return text

# # def handle_api_errors(f):
# #     """Decorator for consistent error handling"""
# #     @wraps(f)
# #     def decorated_function(*args, **kwargs):
# #         try:
# #             return f(*args, **kwargs)
# #         except ValueError as e:
# #             return jsonify({"error": f"Validation error: {str(e)}"}), 400
# #         except RuntimeError as e:
# #             return jsonify({"error": f"Service error: {str(e)}"}), 503
# #         except Exception as e:
# #             db.session.rollback()
# #             return jsonify({"error": f"Internal error: {str(e)}"}), 500
# #     return decorated_function

# # def generate_ai_content(prompt, max_retries=2):
# #     """Generate content with retry logic"""
# #     for attempt in range(max_retries):
# #         try:
# #             model = get_model()
# #             response = model.generate_content(prompt)
# #             if not response or not response.text:
# #                 raise RuntimeError("Empty response from AI model")
# #             return response.text
# #         except Exception as e:
# #             if attempt == max_retries - 1:
# #                 raise RuntimeError(f"AI generation failed after {max_retries} attempts: {str(e)}")
# #             time.sleep(1)

# # # =====================================================
# # # OCR FOR IMAGES USING GEMINI VISION
# # # =====================================================
# # def extract_text_from_image_gemini(file_path):
# #     """Extract text from image using Gemini Vision API"""
# #     try:
# #         from PIL import Image
        
# #         img = Image.open(file_path)
        
# #         model = genai.GenerativeModel('gemini-2.5-flash')
        
# #         prompt = """Extract all text from this image. This appears to be a question paper or educational document.

# # Instructions:
# # - Extract ALL visible text accurately
# # - Maintain structure (sections, numbering)
# # - Include questions, instructions, and marks
# # - If it's a question paper, preserve the format

# # Extracted Text:"""
        
# #         response = model.generate_content([prompt, img])
        
# #         if response and response.text:
# #             return response.text.strip()
# #         else:
# #             return None
            
# #     except Exception as e:
# #         raise RuntimeError(f"Image OCR failed: {str(e)}")

# # def extract_text_from_pdf_gemini(file_path):
# #     """Extract text from PDF using Gemini"""
# #     try:
# #         # Try to convert PDF to images and use Gemini Vision
# #         from pdf2image import convert_from_path
# #         from PIL import Image
        
# #         # Convert first 10 pages
# #         images = convert_from_path(file_path, first_page=1, last_page=10)
        
# #         model = genai.GenerativeModel('gemini-2.5-flash')
        
# #         extracted_text = ""
        
# #         for i, img in enumerate(images, 1):
# #             prompt = f"""Extract all text from page {i} of this document.

# # Instructions:
# # - Extract ALL visible text accurately
# # - Maintain structure and formatting
# # - Include all questions, instructions, marks, and sections

# # Page {i} Text:"""
            
# #             response = model.generate_content([prompt, img])
            
# #             if response and response.text:
# #                 extracted_text += f"\n\n--- Page {i} ---\n\n{response.text.strip()}\n"
        
# #         return extracted_text.strip() if extracted_text else None
        
# #     except ImportError:
# #         # If pdf2image not available, return error
# #         raise RuntimeError("PDF processing requires poppler. Please install: sudo apt-get install poppler-utils")
# #     except Exception as e:
# #         raise RuntimeError(f"PDF OCR failed: {str(e)}")

# # # =====================================================
# # # 1️⃣ GET ALL MATERIALS (FOR DROPDOWN)
# # # =====================================================
# # @summary_bp.route("/materials", methods=["GET"])
# # @jwt_required()
# # @handle_api_errors
# # def get_materials():
# #     current_user_id = get_jwt_identity()
    
# #     materials = CourseMaterial.query.filter_by(student_id=current_user_id).all()
    
# #     return jsonify({
# #         "materials": [{
# #             "id": m.id,
# #             "title": m.title,
# #             "subject": m.subject,
# #             "content": m.content[:200] + "..." if m.content and len(m.content) > 200 else (m.content or ""),
# #             "created_at": m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None
# #         } for m in materials]
# #     })

# # # =====================================================
# # # 2️⃣ GENERATE EASY-TO-UNDERSTAND SUMMARY
# # # =====================================================
# # @summary_bp.route("/generate-summary", methods=["POST"])
# # @jwt_required()
# # @handle_api_errors
# # def generate_summary():
# #     data = request.get_json()
# #     current_user_id = get_jwt_identity()
    
# #     material_id = data.get("material_id")
    
# #     if not material_id:
# #         return jsonify({"error": "material_id required"}), 400
    
# #     # Verify material belongs to student and has content
# #     material = CourseMaterial.query.filter_by(
# #         id=material_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not material:
# #         return jsonify({"error": "Material not found or access denied"}), 404
    
# #     if not material.content or len(material.content) < 50:
# #         return jsonify({"error": "Material has insufficient content. Please ensure the file was processed correctly."}), 400
    
# #     # Check if summary already exists
# #     existing_summary = MaterialSummary.query.filter_by(
# #         material_id=material_id,
# #         student_id=current_user_id,
# #         summary_type="easy"
# #     ).first()
    
# #     if existing_summary:
# #         return jsonify({
# #             "summary": existing_summary.summary_text,
# #             "summary_id": existing_summary.id,
# #             "message": "Using existing summary"
# #         })
    
# #     content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
# #     prompt = f"""You are a deep learning based AI tutor.

# # Explain the following study material so that ANY student can understand it easily.

# # Rules:
# # - Use very simple English
# # - Provide step-by-step explanation
# # - Use bullet points for clarity
# # - Include real-life examples where relevant
# # - Focus on exam-oriented content
# # - Make it easy to remember

# # Study Material Title: {material.title}
# # Subject: {material.subject}

# # Content:
# # {content}

# # Please provide a clear, structured summary."""
    
# #     summary_text = generate_ai_content(prompt)
    
# #     summary = MaterialSummary(
# #         material_id=material_id,
# #         student_id=current_user_id,
# #         summary_type="easy",
# #         summary_text=summary_text
# #     )
    
# #     db.session.add(summary)
# #     db.session.commit()
    
# #     return jsonify({
# #         "summary": summary_text,
# #         "summary_id": summary.id
# #     })

# # # =====================================================
# # # 3️⃣ UPLOAD QUESTION PAPER (IMAGE / PDF) → AUTO PATTERN
# # # =====================================================
# # @summary_bp.route("/upload-question-paper", methods=["POST"])
# # @jwt_required()
# # @handle_api_errors
# # def upload_question_paper():
# #     current_user_id = get_jwt_identity()
    
# #     if "file" not in request.files:
# #         return jsonify({"error": "No file provided"}), 400
    
# #     file = request.files["file"]
    
# #     if not file.filename:
# #         return jsonify({"error": "No file selected"}), 400
    
# #     # Validate file type
# #     filename = file.filename.lower()
# #     file_ext = os.path.splitext(filename)[1]
    
# #     if file_ext not in ALLOWED_FILE_EXTENSIONS:
# #         return jsonify({"error": f"Unsupported file type: {file_ext}. Allowed: PDF, PNG, JPG"}), 400
    
# #     # Check file size
# #     file.seek(0, os.SEEK_END)
# #     file_size = file.tell()
# #     file.seek(0)
    
# #     if file_size > MAX_FILE_SIZE:
# #         return jsonify({"error": f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)}MB"}), 400
    
# #     # Save file temporarily
# #     import tempfile
# #     with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
# #         file.save(tmp.name)
# #         temp_path = tmp.name
    
# #     try:
# #         # Extract text using Gemini Vision
# #         if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
# #             extracted_text = extract_text_from_image_gemini(temp_path)
# #         elif file_ext == '.pdf':
# #             extracted_text = extract_text_from_pdf_gemini(temp_path)
# #         else:
# #             return jsonify({"error": "Unsupported file type"}), 400
        
# #         # Clean up temp file
# #         os.unlink(temp_path)
        
# #         if not extracted_text or len(extracted_text) < 50:
# #             return jsonify({"error": "Could not extract sufficient text from file. Please ensure the file is clear and readable."}), 400
        
# #         # Analyze pattern with Gemini
# #         prompt = f"""You are an expert exam-pattern analyst.

# # Analyze this question paper and extract its structure.

# # Your task:
# # - Identify the exam type and pattern
# # - Extract sections, marks distribution, and question types
# # - Note any choices or optional questions

# # Return ONLY valid JSON in this exact format:
# # {{
# #   "exam_type": "University / Board / Competitive / Unknown",
# #   "total_marks": <number or null>,
# #   "duration": "<minutes or 'unknown'>",
# #   "sections": [
# #     {{
# #       "section_name": "string",
# #       "marks_per_question": <number or null>,
# #       "number_of_questions": <number>,
# #       "choice": <true/false>,
# #       "question_type": "MCQ / Short / Essay / Mixed / Other"
# #     }}
# #   ]
# # }}

# # Question Paper Text:
# # {extracted_text[:5000]}"""
        
# #         pattern_json = generate_ai_content(prompt)
        
# #         # Clean JSON response
# #         try:
# #             json.loads(pattern_json)
# #         except json.JSONDecodeError:
# #             if "```json" in pattern_json:
# #                 pattern_json = pattern_json.split("```json")[1].split("```")[0].strip()
# #             elif "```" in pattern_json:
# #                 pattern_json = pattern_json.split("```")[1].split("```")[0].strip()
        
# #         # Save pattern
# #         pattern = QuestionPattern(
# #             student_id=current_user_id,
# #             source="auto-detected",
# #             raw_text=extracted_text[:10000],  # Store first 10k chars
# #             pattern_json=pattern_json
# #         )
        
# #         db.session.add(pattern)
# #         db.session.commit()
        
# #         return jsonify({
# #             "message": "Pattern analyzed successfully",
# #             "pattern_id": pattern.id,
# #             "pattern": pattern_json,
# #             "extracted_text_length": len(extracted_text)
# #         })
        
# #     except Exception as e:
# #         # Clean up temp file on error
# #         if os.path.exists(temp_path):
# #             os.unlink(temp_path)
# #         raise e

# # # =====================================================
# # # 4️⃣ GENERATE QUESTION PAPER (MANUAL CONFIG)
# # # =====================================================
# # @summary_bp.route("/generate-smart-questions", methods=["POST"])
# # @jwt_required()
# # @handle_api_errors
# # def generate_smart_questions():
# #     data = request.get_json()
# #     current_user_id = get_jwt_identity()
    
# #     material_id = data.get("material_id")
# #     config = data.get("config")
    
# #     if not material_id or not config:
# #         return jsonify({"error": "material_id and config required"}), 400
    
# #     # Verify material belongs to student
# #     material = CourseMaterial.query.filter_by(
# #         id=material_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not material:
# #         return jsonify({"error": "Material not found or access denied"}), 404
    
# #     if not material.content or len(material.content) < 50:
# #         return jsonify({"error": "Material has insufficient content"}), 400
    
# #     content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
# #     # Validate config
# #     if isinstance(config, str):
# #         try:
# #             config = json.loads(config)
# #         except json.JSONDecodeError:
# #             return jsonify({"error": "Invalid config format"}), 400
    
# #     prompt = f"""Generate an exam question paper based on the configuration below.

# # Material: {material.title}
# # Subject: {material.subject}

# # Requirements:
# # - Follow the marks distribution strictly
# # - Create exam-oriented questions
# # - Ensure questions are clear and unambiguous
# # - Include a comprehensive answer key
# # - Balance difficulty levels appropriately
# # - Ensure questions cover different topics from the material

# # Question Configuration:
# # {json.dumps(config, indent=2)}

# # Study Material:
# # {content}

# # Generate a complete, well-formatted question paper with answer key."""
    
# #     paper_text = generate_ai_content(prompt)
    
# #     paper = QuestionPaper(
# #         material_id=material_id,
# #         student_id=current_user_id,
# #         generation_type="manual",
# #         config=json.dumps(config) if isinstance(config, dict) else config,
# #         paper_text=paper_text
# #     )
    
# #     db.session.add(paper)
# #     db.session.commit()
    
# #     return jsonify({
# #         "question_paper": paper_text,
# #         "paper_id": paper.id
# #     })

# # # =====================================================
# # # 5️⃣ GENERATE QUESTION PAPER FROM SAVED PATTERN
# # # =====================================================
# # @summary_bp.route("/generate-from-pattern", methods=["POST"])
# # @jwt_required()
# # @handle_api_errors
# # def generate_from_pattern():
# #     data = request.get_json()
# #     current_user_id = get_jwt_identity()
    
# #     material_id = data.get("material_id")
# #     pattern_id = data.get("pattern_id")
    
# #     if not material_id or not pattern_id:
# #         return jsonify({"error": "material_id and pattern_id required"}), 400
    
# #     # Verify pattern belongs to student
# #     pattern = QuestionPattern.query.filter_by(
# #         id=pattern_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not pattern:
# #         return jsonify({"error": "Pattern not found or access denied"}), 404
    
# #     # Verify material belongs to student
# #     material = CourseMaterial.query.filter_by(
# #         id=material_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not material:
# #         return jsonify({"error": "Material not found or access denied"}), 404
    
# #     if not material.content or len(material.content) < 50:
# #         return jsonify({"error": "Material has insufficient content"}), 400
    
# #     content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
# #     prompt = f"""Generate a new question paper following this detected exam pattern.

# # Material: {material.title}
# # Subject: {material.subject}

# # Exam Pattern:
# # {pattern.pattern_json}

# # Requirements:
# # - Maintain the exact structure and format
# # - Use the same marks distribution
# # - Match the difficulty level
# # - Create exam-oriented questions from the study material
# # - Include a complete answer key
# # - Ensure all sections are covered

# # Study Material:
# # {content}

# # Generate a complete question paper matching this pattern."""
    
# #     paper_text = generate_ai_content(prompt)
    
# #     paper = QuestionPaper(
# #         material_id=material_id,
# #         student_id=current_user_id,
# #         generation_type="pattern",
# #         config=pattern.pattern_json,
# #         paper_text=paper_text
# #     )
    
# #     db.session.add(paper)
# #     db.session.commit()
    
# #     return jsonify({
# #         "question_paper": paper_text,
# #         "paper_id": paper.id
# #     })

# # # =====================================================
# # # GET OPERATIONS
# # # =====================================================
# # @summary_bp.route("/patterns", methods=["GET"])
# # @jwt_required()
# # @handle_api_errors
# # def get_patterns():
# #     current_user_id = get_jwt_identity()
    
# #     patterns = QuestionPattern.query.filter_by(student_id=current_user_id).all()
    
# #     return jsonify({
# #         "patterns": [{
# #             "id": p.id,
# #             "source": p.source,
# #             "pattern_json": p.pattern_json,
# #             "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
# #         } for p in patterns]
# #     })

# # @summary_bp.route("/papers", methods=["GET"])
# # @jwt_required()
# # @handle_api_errors
# # def get_papers():
# #     current_user_id = get_jwt_identity()
    
# #     papers = QuestionPaper.query.filter_by(student_id=current_user_id).all()
    
# #     return jsonify({
# #         "papers": [{
# #             "id": p.id,
# #             "material_id": p.material_id,
# #             "generation_type": p.generation_type,
# #             "paper_text": p.paper_text,
# #             "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
# #         } for p in papers]
# #     })

# # # =====================================================
# # # DELETE OPERATIONS
# # # =====================================================
# # @summary_bp.route("/delete-summary/<int:summary_id>", methods=["DELETE"])
# # @jwt_required()
# # @handle_api_errors
# # def delete_summary(summary_id):
# #     current_user_id = get_jwt_identity()
    
# #     summary = MaterialSummary.query.filter_by(
# #         id=summary_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not summary:
# #         return jsonify({"error": "Summary not found or access denied"}), 404
    
# #     db.session.delete(summary)
# #     db.session.commit()
    
# #     return jsonify({"message": "Summary deleted successfully"})

# # @summary_bp.route("/delete-question-paper/<int:paper_id>", methods=["DELETE"])
# # @jwt_required()
# # @handle_api_errors
# # def delete_question_paper(paper_id):
# #     current_user_id = get_jwt_identity()
    
# #     paper = QuestionPaper.query.filter_by(
# #         id=paper_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not paper:
# #         return jsonify({"error": "Question paper not found or access denied"}), 404
    
# #     db.session.delete(paper)
# #     db.session.commit()
    
# #     return jsonify({"message": "Question paper deleted successfully"})

# # @summary_bp.route("/delete-question-pattern/<int:pattern_id>", methods=["DELETE"])
# # @jwt_required()
# # @handle_api_errors
# # def delete_question_pattern(pattern_id):
# #     current_user_id = get_jwt_identity()
    
# #     pattern = QuestionPattern.query.filter_by(
# #         id=pattern_id,
# #         student_id=current_user_id
# #     ).first()
    
# #     if not pattern:
# #         return jsonify({"error": "Pattern not found or access denied"}), 404
    
# #     db.session.delete(pattern)
# #     db.session.commit()
    
# #     return jsonify({"message": "Question pattern deleted successfully"})











# from flask import request, jsonify, Blueprint
# from models import (
#     CourseMaterial,
#     MaterialSummary,
#     QuestionPaper,
#     QuestionPattern
# )
# from extensions import db
# import google.generativeai as genai
# import os
# import json
# from functools import wraps
# import time
# from flask_jwt_extended import jwt_required, get_jwt_identity
# import PyPDF2
# from deep_translator import GoogleTranslator

# # Create blueprint
# summary_bp = Blueprint('summary', __name__)

# # =====================================================
# # GEMINI (DEEP LEARNING MODEL) CONFIGURATION
# # =====================================================
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDO4IPd2s0JMxH1bdj0t0AUS5kOEKLuIRQ")
# if not GEMINI_API_KEY:
#     print("⚠️  WARNING: GEMINI_API_KEY environment variable not set")

# # Configuration constants
# MAX_CONTENT_LENGTH = 15000
# ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp'}
# MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# # Supported languages for translation
# SUPPORTED_LANGUAGES = {
#     'en': 'English',
#     'hi': 'Hindi',
#     'ta': 'Tamil',
#     'te': 'Telugu',
#     'ml': 'Malayalam',
#     'kn': 'Kannada',
#     'bn': 'Bengali',
#     'mr': 'Marathi',
#     'es': 'Spanish',
#     'fr': 'French',
#     'de': 'German',
#     'zh-CN': 'Chinese',
#     'ja': 'Japanese',
#     'ar': 'Arabic'
# }

# def get_model(use_flash=True):
#     """Get Gemini model with error handling"""
#     if not GEMINI_API_KEY:
#         raise RuntimeError("GEMINI_API_KEY not configured. Please set the environment variable.")
#     try:
#         genai.configure(api_key=GEMINI_API_KEY)
#         # Use flash for faster responses
#         model_name = "gemini-2.5-flash" if use_flash else "gemini-2.5-flash"
#         return genai.GenerativeModel(model_name)
#     except Exception as e:
#         raise RuntimeError(f"Failed to initialize Gemini model: {str(e)}")

# # =====================================================
# # UTILITY FUNCTIONS
# # =====================================================
# def validate_student_id(student_id):
#     """Validate student_id parameter (UUID or numeric)"""
#     if not student_id:
#         return False
#     return True

# def sanitize_text(text, max_length=None):
#     """Sanitize and truncate text input"""
#     if not text:
#         return ""
#     text = str(text).strip()
#     if max_length and len(text) > max_length:
#         text = text[:max_length]
#     return text

# def handle_api_errors(f):
#     """Decorator for consistent error handling"""
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         try:
#             return f(*args, **kwargs)
#         except ValueError as e:
#             return jsonify({"error": f"Validation error: {str(e)}"}), 400
#         except RuntimeError as e:
#             return jsonify({"error": f"Service error: {str(e)}"}), 503
#         except Exception as e:
#             db.session.rollback()
#             return jsonify({"error": f"Internal error: {str(e)}"}), 500
#     return decorated_function

# def generate_ai_content(prompt, max_retries=2, use_flash=True):
#     """Generate content with retry logic - optimized for speed"""
#     for attempt in range(max_retries):
#         try:
#             model = get_model(use_flash=use_flash)
            
#             # Configure for faster generation
#             generation_config = {
#                 "temperature": 0.7,
#                 "top_p": 0.8,
#                 "top_k": 40,
#                 "max_output_tokens": 4096,
#             }
            
#             response = model.generate_content(
#                 prompt,
#                 generation_config=generation_config
#             )
            
#             if not response or not response.text:
#                 raise RuntimeError("Empty response from AI model")
#             return response.text
#         except Exception as e:
#             if attempt == max_retries - 1:
#                 raise RuntimeError(f"AI generation failed after {max_retries} attempts: {str(e)}")
#             time.sleep(0.5)

# def translate_text(text, target_language='en', source_language='auto'):
#     """Translate text using deep-translator (free, no API key needed)"""
#     try:
#         if target_language == 'en' or target_language == source_language:
#             return text
        
#         # Split into chunks if text is too long (max 5000 chars per request)
#         max_chunk_size = 4500
#         if len(text) <= max_chunk_size:
#             translator = GoogleTranslator(source=source_language, target=target_language)
#             return translator.translate(text)
        
#         # Handle long text by splitting into chunks
#         chunks = [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]
#         translated_chunks = []
        
#         for chunk in chunks:
#             translator = GoogleTranslator(source=source_language, target=target_language)
#             translated_chunks.append(translator.translate(chunk))
#             time.sleep(0.1)  # Small delay to avoid rate limiting
        
#         return ' '.join(translated_chunks)
    
#     except Exception as e:
#         raise RuntimeError(f"Translation failed: {str(e)}")

# # =====================================================
# # IMPROVED OCR - WITHOUT POPPLER DEPENDENCY
# # =====================================================
# def extract_text_from_image_gemini(file_path):
#     """Extract text from image using Gemini Vision API"""
#     try:
#         from PIL import Image
        
#         img = Image.open(file_path)
        
#         # Resize if image is too large
#         max_size = 2048
#         if img.width > max_size or img.height > max_size:
#             img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
#         model = genai.GenerativeModel('gemini-2.5-flash')
        
#         prompt = """Extract all text from this image. This appears to be a question paper or educational document.

# Instructions:
# - Extract ALL visible text accurately
# - Maintain structure (sections, numbering)
# - Include questions, instructions, and marks
# - If it's a question paper, preserve the format

# Extracted Text:"""
        
#         response = model.generate_content([prompt, img])
        
#         if response and response.text:
#             return response.text.strip()
#         else:
#             return None
            
#     except Exception as e:
#         raise RuntimeError(f"Image OCR failed: {str(e)}")

# def extract_text_from_pdf_pypdf2(file_path):
#     """Extract text from PDF using PyPDF2 (no poppler needed)"""
#     try:
#         extracted_text = ""
        
#         with open(file_path, 'rb') as file:
#             pdf_reader = PyPDF2.PdfReader(file)
#             num_pages = len(pdf_reader.pages)
            
#             # Limit to first 10 pages
#             max_pages = min(num_pages, 10)
            
#             for page_num in range(max_pages):
#                 page = pdf_reader.pages[page_num]
#                 text = page.extract_text()
                
#                 if text:
#                     extracted_text += f"\n\n--- Page {page_num + 1} ---\n\n{text.strip()}\n"
        
#         # If PyPDF2 fails to extract text, try Gemini Vision on PDF
#         if not extracted_text or len(extracted_text.strip()) < 100:
#             return extract_pdf_with_gemini_direct(file_path)
        
#         return extracted_text.strip() if extracted_text else None
        
#     except Exception as e:
#         # Fallback to Gemini direct PDF processing
#         try:
#             return extract_pdf_with_gemini_direct(file_path)
#         except:
#             raise RuntimeError(f"PDF text extraction failed: {str(e)}")

# def extract_pdf_with_gemini_direct(file_path):
#     """Extract text from PDF using Gemini's direct PDF support"""
#     try:
#         model = genai.GenerativeModel('gemini-2.5-flash')
        
#         # Upload PDF to Gemini
#         with open(file_path, 'rb') as f:
#             pdf_data = f.read()
        
#         prompt = """Extract all text from this PDF document. This appears to be a question paper or educational document.

# Instructions:
# - Extract ALL visible text accurately from all pages
# - Maintain structure (sections, numbering)
# - Include questions, instructions, and marks
# - Preserve the format

# Extracted Text:"""
        
#         response = model.generate_content([
#             prompt,
#             {"mime_type": "application/pdf", "data": pdf_data}
#         ])
        
#         if response and response.text:
#             return response.text.strip()
#         else:
#             return None
            
#     except Exception as e:
#         raise RuntimeError(f"PDF extraction with Gemini failed: {str(e)}")

# # =====================================================
# # 1️⃣ GET ALL MATERIALS (FOR DROPDOWN)
# # =====================================================
# @summary_bp.route("/materials", methods=["GET"])
# @jwt_required()
# @handle_api_errors
# def get_materials():
#     current_user_id = get_jwt_identity()
    
#     materials = CourseMaterial.query.filter_by(student_id=current_user_id).all()
    
#     return jsonify({
#         "materials": [{
#             "id": m.id,
#             "title": m.title,
#             "subject": m.subject,
#             "content": m.content[:200] + "..." if m.content and len(m.content) > 200 else (m.content or ""),
#             "created_at": m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None
#         } for m in materials]
#     })

# # =====================================================
# # 2️⃣ GENERATE EASY-TO-UNDERSTAND SUMMARY (OPTIMIZED)
# # =====================================================
# @summary_bp.route("/generate-summary", methods=["POST"])
# @jwt_required()
# @handle_api_errors
# def generate_summary():
#     data = request.get_json()
#     current_user_id = get_jwt_identity()
    
#     material_id = data.get("material_id")
#     target_language = data.get("language", "en")  # Default to English
    
#     if not material_id:
#         return jsonify({"error": "material_id required"}), 400
    
#     # Validate language
#     if target_language not in SUPPORTED_LANGUAGES:
#         return jsonify({"error": f"Unsupported language. Supported: {', '.join(SUPPORTED_LANGUAGES.keys())}"}), 400
    
#     # Verify material belongs to student and has content
#     material = CourseMaterial.query.filter_by(
#         id=material_id,
#         student_id=current_user_id
#     ).first()
    
#     if not material:
#         return jsonify({"error": "Material not found or access denied"}), 404
    
#     if not material.content or len(material.content) < 50:
#         return jsonify({"error": "Material has insufficient content. Please ensure the file was processed correctly."}), 400
    
#     # Check if summary already exists for this language
#     existing_summary = MaterialSummary.query.filter_by(
#         material_id=material_id,
#         student_id=current_user_id,
#         summary_type=f"easy_{target_language}"
#     ).first()
    
#     if existing_summary:
#         return jsonify({
#             "summary": existing_summary.summary_text,
#             "summary_id": existing_summary.id,
#             "language": target_language,
#             "message": "Using existing summary"
#         })
    
#     # Truncate content for faster processing
#     content = sanitize_text(material.content, 8000)  # Reduced from 15000
    
#     # Optimized prompt for faster generation
#     prompt = f"""Summarize this study material clearly and concisely for students.

# Title: {material.title}
# Subject: {material.subject}

# Rules:
# 1. Use simple language
# 2. Focus on key concepts only
# 3. Include 3-5 main points
# 4. Add one real-life example
# 5. Keep it brief and exam-focused

# Content:
# {content}

# Provide a concise summary in 300-500 words:"""
    
#     # Use flash model for speed
#     summary_text = generate_ai_content(prompt, use_flash=True)
    
#     # Translate if needed
#     if target_language != 'en':
#         try:
#             summary_text = translate_text(summary_text, target_language=target_language)
#         except Exception as e:
#             # If translation fails, return English version with warning
#             return jsonify({
#                 "summary": summary_text,
#                 "language": "en",
#                 "warning": f"Translation to {target_language} failed: {str(e)}. Showing English version."
#             })
    
#     # Save summary
#     summary = MaterialSummary(
#         material_id=material_id,
#         student_id=current_user_id,
#         summary_type=f"easy_{target_language}",
#         summary_text=summary_text
#     )
    
#     db.session.add(summary)
#     db.session.commit()
    
#     return jsonify({
#         "summary": summary_text,
#         "summary_id": summary.id,
#         "language": target_language
#     })

# # =====================================================
# # GET SUPPORTED LANGUAGES
# # =====================================================
# @summary_bp.route("/supported-languages", methods=["GET"])
# @handle_api_errors
# def get_supported_languages():
#     return jsonify({
#         "languages": [
#             {"code": code, "name": name}
#             for code, name in SUPPORTED_LANGUAGES.items()
#         ]
#     })

# # =====================================================
# # 3️⃣ UPLOAD QUESTION PAPER (IMAGE / PDF) → AUTO PATTERN
# # =====================================================
# @summary_bp.route("/upload-question-paper", methods=["POST"])
# @jwt_required()
# @handle_api_errors
# def upload_question_paper():
#     current_user_id = get_jwt_identity()
    
#     if "file" not in request.files:
#         return jsonify({"error": "No file provided"}), 400
    
#     file = request.files["file"]
    
#     if not file.filename:
#         return jsonify({"error": "No file selected"}), 400
    
#     # Validate file type
#     filename = file.filename.lower()
#     file_ext = os.path.splitext(filename)[1]
    
#     if file_ext not in ALLOWED_FILE_EXTENSIONS:
#         return jsonify({"error": f"Unsupported file type: {file_ext}. Allowed: PDF, PNG, JPG"}), 400
    
#     # Check file size
#     file.seek(0, os.SEEK_END)
#     file_size = file.tell()
#     file.seek(0)
    
#     if file_size > MAX_FILE_SIZE:
#         return jsonify({"error": f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)}MB"}), 400
    
#     # Save file temporarily
#     import tempfile
#     with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
#         file.save(tmp.name)
#         temp_path = tmp.name
    
#     try:
#         # Extract text based on file type
#         if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
#             extracted_text = extract_text_from_image_gemini(temp_path)
#         elif file_ext == '.pdf':
#             extracted_text = extract_text_from_pdf_pypdf2(temp_path)
#         else:
#             return jsonify({"error": "Unsupported file type"}), 400
        
#         # Clean up temp file
#         os.unlink(temp_path)
        
#         if not extracted_text or len(extracted_text) < 50:
#             return jsonify({"error": "Could not extract sufficient text from file. Please ensure the file is clear and readable."}), 400
        
#         # Analyze pattern with Gemini
#         prompt = f"""You are an expert exam-pattern analyst.

# Analyze this question paper and extract its structure.

# Your task:
# - Identify the exam type and pattern
# - Extract sections, marks distribution, and question types
# - Note any choices or optional questions

# Return ONLY valid JSON in this exact format:
# {{
#   "exam_type": "University / Board / Competitive / Unknown",
#   "total_marks": <number or null>,
#   "duration": "<minutes or 'unknown'>",
#   "sections": [
#     {{
#       "section_name": "string",
#       "marks_per_question": <number or null>,
#       "number_of_questions": <number>,
#       "choice": <true/false>,
#       "question_type": "MCQ / Short / Essay / Mixed / Other"
#     }}
#   ]
# }}

# Question Paper Text:
# {extracted_text[:5000]}"""
        
#         pattern_json = generate_ai_content(prompt, use_flash=True)
        
#         # Clean JSON response
#         try:
#             json.loads(pattern_json)
#         except json.JSONDecodeError:
#             if "```json" in pattern_json:
#                 pattern_json = pattern_json.split("```json")[1].split("```")[0].strip()
#             elif "```" in pattern_json:
#                 pattern_json = pattern_json.split("```")[1].split("```")[0].strip()
        
#         # Save pattern
#         pattern = QuestionPattern(
#             student_id=current_user_id,
#             source="auto-detected",
#             raw_text=extracted_text[:10000],  # Store first 10k chars
#             pattern_json=pattern_json
#         )
        
#         db.session.add(pattern)
#         db.session.commit()
        
#         return jsonify({
#             "message": "Pattern analyzed successfully",
#             "pattern_id": pattern.id,
#             "pattern": pattern_json,
#             "extracted_text_length": len(extracted_text)
#         })
        
#     except Exception as e:
#         # Clean up temp file on error
#         if os.path.exists(temp_path):
#             os.unlink(temp_path)
#         raise e

# # =====================================================
# # 4️⃣ GET QUESTION PAPER PLACEHOLDERS
# # =====================================================
# @summary_bp.route("/question-paper-placeholders", methods=["GET"])
# @handle_api_errors
# def get_question_paper_placeholders():
#     """Return placeholder descriptions for question paper creation"""
#     return jsonify({
#         "placeholders": {
#             "exam_type": {
#                 "label": "Exam Type",
#                 "description": "Type of examination (University, Board, Competitive, etc.)",
#                 "example": "University Mid-term Exam",
#                 "options": ["University", "Board", "Competitive", "Internal", "Practice Test"]
#             },
#             "total_marks": {
#                 "label": "Total Marks",
#                 "description": "Total marks for the entire question paper",
#                 "example": "100",
#                 "type": "number"
#             },
#             "duration": {
#                 "label": "Duration",
#                 "description": "Time allowed for the exam (in minutes)",
#                 "example": "180",
#                 "type": "number"
#             },
#             "sections": {
#                 "label": "Sections",
#                 "description": "Different sections of the question paper",
#                 "example": [
#                     {
#                         "section_name": "Section A - Multiple Choice",
#                         "marks_per_question": 1,
#                         "number_of_questions": 20,
#                         "choice": False,
#                         "question_type": "MCQ"
#                     },
#                     {
#                         "section_name": "Section B - Short Answer",
#                         "marks_per_question": 5,
#                         "number_of_questions": 6,
#                         "choice": True,
#                         "question_type": "Short"
#                     }
#                 ],
#                 "fields": {
#                     "section_name": {
#                         "label": "Section Name",
#                         "description": "Name or title of this section",
#                         "example": "Section A - Multiple Choice Questions"
#                     },
#                     "marks_per_question": {
#                         "label": "Marks per Question",
#                         "description": "How many marks each question carries",
#                         "example": "5",
#                         "type": "number"
#                     },
#                     "number_of_questions": {
#                         "label": "Number of Questions",
#                         "description": "Total questions in this section",
#                         "example": "10",
#                         "type": "number"
#                     },
#                     "choice": {
#                         "label": "Has Choice",
#                         "description": "Whether students can choose questions (e.g., 'Attempt any 5 out of 7')",
#                         "example": "true or false",
#                         "type": "boolean"
#                     },
#                     "question_type": {
#                         "label": "Question Type",
#                         "description": "Type of questions in this section",
#                         "example": "MCQ",
#                         "options": ["MCQ", "Short", "Essay", "Numerical", "True/False", "Fill in the Blanks", "Mixed"]
#                     }
#                 }
#             }
#         },
#         "template_examples": [
#             {
#                 "name": "Standard University Exam",
#                 "config": {
#                     "exam_type": "University",
#                     "total_marks": 100,
#                     "duration": "180",
#                     "sections": [
#                         {
#                             "section_name": "Section A - MCQ",
#                             "marks_per_question": 2,
#                             "number_of_questions": 20,
#                             "choice": False,
#                             "question_type": "MCQ"
#                         },
#                         {
#                             "section_name": "Section B - Short Answer",
#                             "marks_per_question": 10,
#                             "number_of_questions": 6,
#                             "choice": True,
#                             "question_type": "Short"
#                         }
#                     ]
#                 }
#             },
#             {
#                 "name": "Competitive Exam",
#                 "config": {
#                     "exam_type": "Competitive",
#                     "total_marks": 200,
#                     "duration": "120",
#                     "sections": [
#                         {
#                             "section_name": "Section A - MCQ",
#                             "marks_per_question": 4,
#                             "number_of_questions": 50,
#                             "choice": False,
#                             "question_type": "MCQ"
#                         }
#                     ]
#                 }
#             }
#         ]
#     })

# # =====================================================
# # 5️⃣ GENERATE QUESTION PAPER (MANUAL CONFIG)
# # =====================================================
# @summary_bp.route("/generate-smart-questions", methods=["POST"])
# @jwt_required()
# @handle_api_errors
# def generate_smart_questions():
#     data = request.get_json()
#     current_user_id = get_jwt_identity()
    
#     material_id = data.get("material_id")
#     config = data.get("config")
#     target_language = data.get("language", "en")
    
#     if not material_id or not config:
#         return jsonify({"error": "material_id and config required"}), 400
    
#     # Verify material belongs to student
#     material = CourseMaterial.query.filter_by(
#         id=material_id,
#         student_id=current_user_id
#     ).first()
    
#     if not material:
#         return jsonify({"error": "Material not found or access denied"}), 404
    
#     if not material.content or len(material.content) < 50:
#         return jsonify({"error": "Material has insufficient content"}), 400
    
#     content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
#     # Validate config
#     if isinstance(config, str):
#         try:
#             config = json.loads(config)
#         except json.JSONDecodeError:
#             return jsonify({"error": "Invalid config format"}), 400
    
#     prompt = f"""Generate an exam question paper based on the configuration below.

# Material: {material.title}
# Subject: {material.subject}

# Requirements:
# - Follow the marks distribution strictly
# - Create exam-oriented questions
# - Ensure questions are clear and unambiguous
# - Include a comprehensive answer key
# - Balance difficulty levels appropriately
# - Ensure questions cover different topics from the material

# Question Configuration:
# {json.dumps(config, indent=2)}

# Study Material:
# {content}

# Generate a complete, well-formatted question paper with answer key."""
    
#     paper_text = generate_ai_content(prompt, use_flash=True)
    
#     # Translate if needed
#     if target_language != 'en':
#         try:
#             paper_text = translate_text(paper_text, target_language=target_language)
#         except Exception as e:
#             # Continue with English version if translation fails
#             pass
    
#     paper = QuestionPaper(
#         material_id=material_id,
#         student_id=current_user_id,
#         generation_type="manual",
#         config=json.dumps(config) if isinstance(config, dict) else config,
#         paper_text=paper_text
#     )
    
#     db.session.add(paper)
#     db.session.commit()
    
#     return jsonify({
#         "question_paper": paper_text,
#         "paper_id": paper.id,
#         "language": target_language
#     })

# # =====================================================
# # 6️⃣ GENERATE QUESTION PAPER FROM SAVED PATTERN
# # =====================================================
# @summary_bp.route("/generate-from-pattern", methods=["POST"])
# @jwt_required()
# @handle_api_errors
# def generate_from_pattern():
#     data = request.get_json()
#     current_user_id = get_jwt_identity()
    
#     material_id = data.get("material_id")
#     pattern_id = data.get("pattern_id")
#     target_language = data.get("language", "en")
    
#     if not material_id or not pattern_id:
#         return jsonify({"error": "material_id and pattern_id required"}), 400
    
#     # Verify pattern belongs to student
#     pattern = QuestionPattern.query.filter_by(
#         id=pattern_id,
#         student_id=current_user_id
#     ).first()
    
#     if not pattern:
#         return jsonify({"error": "Pattern not found or access denied"}), 404
    
#     # Verify material belongs to student
#     material = CourseMaterial.query.filter_by(
#         id=material_id,
#         student_id=current_user_id
#     ).first()
    
#     if not material:
#         return jsonify({"error": "Material not found or access denied"}), 404
    
#     if not material.content or len(material.content) < 50:
#         return jsonify({"error": "Material has insufficient content"}), 400
    
#     content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
#     prompt = f"""Generate a new question paper following this detected exam pattern.

# Material: {material.title}
# Subject: {material.subject}

# Exam Pattern:
# {pattern.pattern_json}

# Requirements:
# - Maintain the exact structure and format
# - Use the same marks distribution
# - Match the difficulty level
# - Create exam-oriented questions from the study material
# - Include a complete answer key
# - Ensure all sections are covered

# Study Material:
# {content}

# Generate a complete question paper matching this pattern."""
    
#     paper_text = generate_ai_content(prompt, use_flash=True)
    
#     # Translate if needed
#     if target_language != 'en':
#         try:
#             paper_text = translate_text(paper_text, target_language=target_language)
#         except Exception as e:
#             pass
    
#     paper = QuestionPaper(
#         material_id=material_id,
#         student_id=current_user_id,
#         generation_type="pattern",
#         config=pattern.pattern_json,
#         paper_text=paper_text
#     )
    
#     db.session.add(paper)
#     db.session.commit()
    
#     return jsonify({
#         "question_paper": paper_text,
#         "paper_id": paper.id,
#         "language": target_language
#     })

# # =====================================================
# # GET OPERATIONS
# # =====================================================
# @summary_bp.route("/patterns", methods=["GET"])
# @jwt_required()
# @handle_api_errors
# def get_patterns():
#     current_user_id = get_jwt_identity()
    
#     patterns = QuestionPattern.query.filter_by(student_id=current_user_id).all()
    
#     return jsonify({
#         "patterns": [{
#             "id": p.id,
#             "source": p.source,
#             "pattern_json": p.pattern_json,
#             "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
#         } for p in patterns]
#     })

# @summary_bp.route("/papers", methods=["GET"])
# @jwt_required()
# @handle_api_errors
# def get_papers():
#     current_user_id = get_jwt_identity()
    
#     papers = QuestionPaper.query.filter_by(student_id=current_user_id).all()
    
#     return jsonify({
#         "papers": [{
#             "id": p.id,
#             "material_id": p.material_id,
#             "generation_type": p.generation_type,
#             "paper_text": p.paper_text,
#             "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
#         } for p in papers]
#     })

# # =====================================================
# # DELETE OPERATIONS
# # =====================================================
# @summary_bp.route("/delete-summary/<int:summary_id>", methods=["DELETE"])
# @jwt_required()
# @handle_api_errors
# def delete_summary(summary_id):
#     current_user_id = get_jwt_identity()
    
#     summary = MaterialSummary.query.filter_by(
#         id=summary_id,
#         student_id=current_user_id
#     ).first()
    
#     if not summary:
#         return jsonify({"error": "Summary not found or access denied"}), 404
    
#     db.session.delete(summary)
#     db.session.commit()
    
#     return jsonify({"message": "Summary deleted successfully"})

# @summary_bp.route("/delete-question-paper/<int:paper_id>", methods=["DELETE"])
# @jwt_required()
# @handle_api_errors
# def delete_question_paper(paper_id):
#     current_user_id = get_jwt_identity()
    
#     paper = QuestionPaper.query.filter_by(
#         id=paper_id,
#         student_id=current_user_id
#     ).first()
    
#     if not paper:
#         return jsonify({"error": "Question paper not found or access denied"}), 404
    
#     db.session.delete(paper)
#     db.session.commit()
    
#     return jsonify({"message": "Question paper deleted successfully"})

# @summary_bp.route("/delete-question-pattern/<int:pattern_id>", methods=["DELETE"])
# @jwt_required()
# @handle_api_errors
# def delete_question_pattern(pattern_id):
#     current_user_id = get_jwt_identity()
    
#     pattern = QuestionPattern.query.filter_by(
#         id=pattern_id,
#         student_id=current_user_id
#     ).first()
    
#     if not pattern:
#         return jsonify({"error": "Pattern not found or access denied"}), 404
    
#     db.session.delete(pattern)
#     db.session.commit()
    
#     return jsonify({"message": "Question pattern deleted successfully"})









from flask import request, jsonify, Blueprint, current_app
from models import (
    CourseMaterial,
    MaterialSummary,
    QuestionPaper,
    QuestionPattern
)
from extensions import db
import google.generativeai as genai
import os
import json
from functools import wraps
import time
from flask_jwt_extended import jwt_required, get_jwt_identity
from deep_translator import GoogleTranslator
from PIL import Image
import io

# Create blueprint
summary_bp = Blueprint('summary', __name__)

# =====================================================
# GEMINI (DEEP LEARNING MODEL) CONFIGURATION
# =====================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDO4IPd2s0JMxH1bdj0t0AUS5kOEKLuIRQ")
if not GEMINI_API_KEY:
    print("⚠️  WARNING: GEMINI_API_KEY environment variable not set")
else:
    print(f"✅ Gemini API Key configured")

# Configuration constants
MAX_CONTENT_LENGTH = 15000
ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Supported languages for translation
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'ml': 'Malayalam',
    'kn': 'Kannada',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'or': 'Oriya',
    'as': 'Assamese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian'
}

def get_model(use_flash=True):
    """Get Gemini model with error handling"""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model_name = "gemini-2.5-flash" if use_flash else "gemini-2.5-pro"
        return genai.GenerativeModel(model_name)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Gemini: {str(e)}")

# =====================================================
# UTILITY FUNCTIONS
# =====================================================
def handle_api_errors(f):
    """Decorator for consistent error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({"error": f"Validation error: {str(e)}"}), 400
        except RuntimeError as e:
            return jsonify({"error": f"Service error: {str(e)}"}), 503
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception("API error")
            return jsonify({"error": f"Internal error: {str(e)}"}), 500
    return decorated_function

def sanitize_text(text, max_length=None):
    """Sanitize and truncate text input"""
    if not text:
        return ""
    text = str(text).strip()
    if max_length and len(text) > max_length:
        text = text[:max_length]
    return text

def generate_ai_content(prompt, max_retries=2, use_flash=True):
    """Generate content with retry logic"""
    for attempt in range(max_retries):
        try:
            model = get_model(use_flash=use_flash)
            
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "max_output_tokens": 8192,
            }
            
            response = model.generate_content(prompt, generation_config=generation_config)
            
            if not response or not response.text:
                raise RuntimeError("Empty response from AI")
            return response.text
        except Exception as e:
            if attempt == max_retries - 1:
                raise RuntimeError(f"AI generation failed: {str(e)}")
            time.sleep(0.5)

# =====================================================
# ENHANCED TRANSLATION WITH SMART CHUNKING
# =====================================================
def smart_translate_text(text, target_language='en', source_language='auto'):
    """
    Smart translation with proper sentence/paragraph chunking
    Uses deep-translator (free, no API key needed)
    """
    try:
        if target_language == 'en' or target_language == source_language:
            return text
        
        if target_language not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {target_language}")
        
        # For short text, translate directly
        if len(text) <= 4500:
            translator = GoogleTranslator(source=source_language, target=target_language)
            return translator.translate(text)
        
        # For long text, split intelligently by paragraphs
        paragraphs = text.split('\n\n')
        translated_paragraphs = []
        
        current_chunk = ""
        for para in paragraphs:
            # If adding this paragraph exceeds chunk size, translate current chunk
            if len(current_chunk) + len(para) > 4500 and current_chunk:
                translator = GoogleTranslator(source=source_language, target=target_language)
                translated_paragraphs.append(translator.translate(current_chunk))
                current_chunk = para
                time.sleep(0.1)  # Rate limiting
            else:
                current_chunk += "\n\n" + para if current_chunk else para
        
        # Translate remaining chunk
        if current_chunk:
            translator = GoogleTranslator(source=source_language, target=target_language)
            translated_paragraphs.append(translator.translate(current_chunk))
        
        return '\n\n'.join(translated_paragraphs)
    
    except Exception as e:
        current_app.logger.exception("Translation failed")
        raise RuntimeError(f"Translation failed: {str(e)}")

# =====================================================
# ADVANCED OCR - NO POPPLER, USING GEMINI VISION + TROCR
# =====================================================
def preprocess_image(image_path):
    """Preprocess image for better OCR"""
    try:
        img = Image.open(image_path)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (maintains aspect ratio)
        max_dimension = 2048
        if max(img.width, img.height) > max_dimension:
            ratio = max_dimension / max(img.width, img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        return img
    except Exception as e:
        raise RuntimeError(f"Image preprocessing failed: {str(e)}")

def extract_text_from_image_gemini_vision(file_path):
    """
    Extract text from image using Gemini Vision API
    NO EXTERNAL OCR DEPENDENCIES NEEDED!
    """
    try:
        img = preprocess_image(file_path)
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = """You are an advanced OCR system. Extract ALL text from this image with perfect accuracy.

Instructions:
1. Extract EVERY word, number, and symbol visible
2. Maintain exact structure: headings, sections, numbering, bullet points
3. Preserve formatting: bold, italics, underline (indicate with markers)
4. Include ALL questions, sub-questions, instructions, marks, and notes
5. If it's a question paper, preserve the exam format exactly
6. If text is in multiple languages, extract all languages
7. If image quality is poor, do your best to interpret unclear text

Important:
- Do NOT skip any content
- Do NOT summarize - extract verbatim
- Include page numbers, headers, footers if present
- Indicate unclear text with [UNCLEAR: best guess]

Extracted Text:"""
        
        response = model.generate_content([prompt, img])
        
        if response and response.text:
            extracted = response.text.strip()
            current_app.logger.info(f"✅ Gemini Vision extracted {len(extracted)} chars")
            return extracted
        else:
            raise RuntimeError("Gemini Vision returned empty response")
            
    except Exception as e:
        current_app.logger.exception("Gemini Vision OCR failed")
        raise RuntimeError(f"Image OCR failed: {str(e)}")

def extract_text_from_pdf_gemini(file_path):
    """
    Extract text from PDF using Gemini's NATIVE PDF support
    NO POPPLER, NO PyPDF2 NEEDED!
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Read PDF as bytes
        with open(file_path, 'rb') as f:
            pdf_bytes = f.read()
        
        prompt = """You are an advanced PDF text extraction system. Extract ALL text from this PDF document.

Instructions:
1. Extract EVERY word from ALL pages
2. Maintain document structure: headings, sections, page breaks
3. Preserve formatting and layout
4. Include ALL questions, instructions, marks, and content
5. Indicate page numbers: "--- Page 1 ---", "--- Page 2 ---", etc.
6. If it's a question paper, preserve the exact exam format
7. Extract tables and maintain their structure

Important:
- Do NOT skip any pages or content
- Do NOT summarize - extract verbatim
- Include headers, footers, page numbers
- Extract text from images within PDF if present

Extracted Text:"""
        
        # Upload PDF to Gemini
        response = model.generate_content([
            prompt,
            {"mime_type": "application/pdf", "data": pdf_bytes}
        ])
        
        if response and response.text:
            extracted = response.text.strip()
            current_app.logger.info(f"✅ Gemini PDF extraction: {len(extracted)} chars")
            return extracted
        else:
            raise RuntimeError("Gemini PDF extraction returned empty response")
            
    except Exception as e:
        current_app.logger.exception("Gemini PDF extraction failed")
        raise RuntimeError(f"PDF extraction failed: {str(e)}")

# =====================================================
# API ROUTES
# =====================================================

@summary_bp.route("/materials", methods=["GET"])
@jwt_required()
@handle_api_errors
def get_materials():
    current_user_id = get_jwt_identity()
    materials = CourseMaterial.query.filter_by(student_id=current_user_id).all()
    
    return jsonify({
        "materials": [{
            "id": m.id,
            "title": m.title,
            "subject": m.subject,
            "content_length": len(m.content) if m.content else 0,
            "content": m.content[:200] + "..." if m.content and len(m.content) > 200 else (m.content or ""),
            "processing_status": getattr(m, 'processing_status', 'completed'),
            "created_at": m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None
        } for m in materials]
    })

@summary_bp.route("/supported-languages", methods=["GET"])
@handle_api_errors
def get_supported_languages():
    """Get list of supported languages for translation"""
    return jsonify({
        "languages": [
            {"code": code, "name": name}
            for code, name in sorted(SUPPORTED_LANGUAGES.items(), key=lambda x: x[1])
        ],
        "default": "en"
    })

@summary_bp.route("/generate-summary", methods=["POST"])
@jwt_required()
@handle_api_errors
def generate_summary():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    material_id = data.get("material_id")
    target_language = data.get("language", "en")
    
    if not material_id:
        return jsonify({"error": "material_id required"}), 400
    
    if target_language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported language. Use /supported-languages to see options"}), 400
    
    # Get material
    material = CourseMaterial.query.filter_by(
        id=material_id,
        student_id=current_user_id
    ).first()
    
    if not material:
        return jsonify({"error": "Material not found"}), 404
    
    if not material.content or len(material.content) < 50:
        return jsonify({"error": "Material has insufficient content"}), 400
    
    # Check for existing summary
    existing_summary = MaterialSummary.query.filter_by(
        material_id=material_id,
        student_id=current_user_id,
        summary_type=f"easy_{target_language}"
    ).first()
    
    if existing_summary:
        return jsonify({
            "summary": existing_summary.summary_text,
            "summary_id": existing_summary.id,
            "language": target_language,
            "language_name": SUPPORTED_LANGUAGES[target_language],
            "message": "Using cached summary"
        })
    
    # Generate summary
    content = sanitize_text(material.content, 8000)
    
    prompt = f"""Create a clear, student-friendly summary of this study material.

Title: {material.title}
Subject: {material.subject}

Guidelines:
1. Use simple, easy-to-understand language
2. Focus on key concepts and main ideas
3. Include 5-7 important points
4. Add 1-2 real-life examples or applications
5. Highlight exam-relevant information
6. Keep it concise (400-600 words)
7. Use bullet points for clarity

Content:
{content}

Summary:"""
    
    current_app.logger.info(f"Generating summary for material {material_id}")
    summary_text = generate_ai_content(prompt, use_flash=True)
    
    # Translate if needed
    if target_language != 'en':
        current_app.logger.info(f"Translating summary to {target_language}")
        try:
            summary_text = smart_translate_text(summary_text, target_language=target_language)
        except Exception as e:
            current_app.logger.error(f"Translation failed: {e}")
            return jsonify({
                "summary": summary_text,
                "language": "en",
                "language_name": "English",
                "warning": f"Translation to {SUPPORTED_LANGUAGES[target_language]} failed. Showing English version."
            })
    
    # Save summary
    summary = MaterialSummary(
        material_id=material_id,
        student_id=current_user_id,
        summary_type=f"easy_{target_language}",
        summary_text=summary_text
    )
    
    db.session.add(summary)
    db.session.commit()
    
    return jsonify({
        "summary": summary_text,
        "summary_id": summary.id,
        "language": target_language,
        "language_name": SUPPORTED_LANGUAGES[target_language]
    })

@summary_bp.route("/upload-question-paper", methods=["POST"])
@jwt_required()
@handle_api_errors
def upload_question_paper():
    """Upload and analyze question paper - NO POPPLER NEEDED"""
    current_user_id = get_jwt_identity()
    
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file
    filename = file.filename.lower()
    file_ext = os.path.splitext(filename)[1]
    
    if file_ext not in ALLOWED_FILE_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {file_ext}"}), 400
    
    # Check size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({"error": f"File too large: {file_size/(1024*1024):.1f}MB. Max: 10MB"}), 400
    
    # Save temporarily
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
        file.save(tmp.name)
        temp_path = tmp.name
    
    try:
        current_app.logger.info(f"Processing {file_ext} file: {filename}")
        
        # Extract text using Gemini (NO POPPLER!)
        if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
            extracted_text = extract_text_from_image_gemini_vision(temp_path)
        elif file_ext == '.pdf':
            extracted_text = extract_text_from_pdf_gemini(temp_path)
        else:
            os.unlink(temp_path)
            return jsonify({"error": "Unsupported file type"}), 400
        
        # Clean up temp file
        os.unlink(temp_path)
        
        if not extracted_text or len(extracted_text) < 50:
            return jsonify({"error": "Could not extract sufficient text. Ensure file is clear and readable."}), 400
        
        current_app.logger.info(f"Extracted {len(extracted_text)} characters. Analyzing pattern...")
        
        # Analyze pattern with Gemini
        prompt = f"""Analyze this question paper and extract its structure as JSON.

Your task:
1. Identify exam type (University/Board/Competitive/Practice)
2. Extract total marks and duration
3. Identify all sections with their details
4. Note question types and marks distribution
5. Identify if sections have choice (e.g., "Attempt 5 out of 7")

Return ONLY valid JSON (no markdown, no extra text):
{{
  "exam_type": "string",
  "total_marks": number,
  "duration": "string (e.g., '180 minutes' or '3 hours')",
  "sections": [
    {{
      "section_name": "string",
      "marks_per_question": number,
      "number_of_questions": number,
      "choice": boolean,
      "question_type": "MCQ|Short|Essay|Numerical|Mixed"
    }}
  ]
}}

Question Paper:
{extracted_text[:6000]}

JSON:"""
        
        pattern_json = generate_ai_content(prompt, use_flash=True)
        
        # Clean JSON
        try:
            json.loads(pattern_json)
        except json.JSONDecodeError:
            if "```json" in pattern_json:
                pattern_json = pattern_json.split("```json")[1].split("```")[0].strip()
            elif "```" in pattern_json:
                pattern_json = pattern_json.split("```")[1].split("```")[0].strip()
            
            # Validate again
            try:
                json.loads(pattern_json)
            except json.JSONDecodeError:
                current_app.logger.error(f"Invalid JSON: {pattern_json}")
                return jsonify({"error": "AI returned invalid pattern. Please try again."}), 500
        
        # Save pattern
        pattern = QuestionPattern(
            student_id=current_user_id,
            source="auto-detected",
            raw_text=extracted_text[:10000],
            pattern_json=pattern_json
        )
        
        db.session.add(pattern)
        db.session.commit()
        
        current_app.logger.info(f"✅ Pattern saved: {pattern.id}")
        
        return jsonify({
            "message": "Question paper analyzed successfully",
            "pattern_id": pattern.id,
            "pattern": json.loads(pattern_json),
            "extracted_text_length": len(extracted_text),
            "preview": extracted_text[:500]
        })
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        current_app.logger.exception("Question paper processing failed")
        raise e

@summary_bp.route("/generate-smart-questions", methods=["POST"])
@jwt_required()
@handle_api_errors
def generate_smart_questions():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    material_id = data.get("material_id")
    config = data.get("config")
    target_language = data.get("language", "en")
    
    if not material_id or not config:
        return jsonify({"error": "material_id and config required"}), 400
    
    # Get material
    material = CourseMaterial.query.filter_by(
        id=material_id,
        student_id=current_user_id
    ).first()
    
    if not material:
        return jsonify({"error": "Material not found"}), 404
    
    if not material.content or len(material.content) < 50:
        return jsonify({"error": "Material has insufficient content"}), 400
    
    content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
    # Validate config
    if isinstance(config, str):
        config = json.loads(config)
    
    prompt = f"""Generate a complete exam question paper based on this configuration.

Material: {material.title}
Subject: {material.subject}

Configuration:
{json.dumps(config, indent=2)}

Requirements:
1. Follow the exact marks distribution
2. Create clear, exam-standard questions
3. Include a comprehensive answer key
4. Balance difficulty levels
5. Cover different topics from the material
6. Format professionally

Study Material:
{content}

Generate the complete question paper with answer key:"""
    
    paper_text = generate_ai_content(prompt, use_flash=True)
    
    # Translate if needed
    if target_language != 'en':
        try:
            paper_text = smart_translate_text(paper_text, target_language=target_language)
        except Exception as e:
            current_app.logger.warning(f"Translation failed: {e}")
    
    # Save paper
    paper = QuestionPaper(
        material_id=material_id,
        student_id=current_user_id,
        generation_type="manual",
        config=json.dumps(config),
        paper_text=paper_text
    )
    
    db.session.add(paper)
    db.session.commit()
    
    return jsonify({
        "question_paper": paper_text,
        "paper_id": paper.id,
        "language": target_language
    })

@summary_bp.route("/generate-from-pattern", methods=["POST"])
@jwt_required()
@handle_api_errors
def generate_from_pattern():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    material_id = data.get("material_id")
    pattern_id = data.get("pattern_id")
    target_language = data.get("language", "en")
    
    if not material_id or not pattern_id:
        return jsonify({"error": "material_id and pattern_id required"}), 400
    
    # Get pattern
    pattern = QuestionPattern.query.filter_by(
        id=pattern_id,
        student_id=current_user_id
    ).first()
    
    if not pattern:
        return jsonify({"error": "Pattern not found"}), 404
    
    # Get material
    material = CourseMaterial.query.filter_by(
        id=material_id,
        student_id=current_user_id
    ).first()
    
    if not material:
        return jsonify({"error": "Material not found"}), 404
    
    if not material.content or len(material.content) < 50:
        return jsonify({"error": "Material has insufficient content"}), 400
    
    content = sanitize_text(material.content, MAX_CONTENT_LENGTH)
    
    prompt = f"""Generate a question paper matching this detected pattern.

Material: {material.title}
Subject: {material.subject}

Pattern (follow exactly):
{pattern.pattern_json}

Requirements:
1. Match the exact structure and format
2. Use the same marks distribution
3. Maintain the difficulty level
4. Create questions from the study material
5. Include answer key
6. Cover all sections

Study Material:
{content}

Generate the question paper:"""
    
    paper_text = generate_ai_content(prompt, use_flash=True)
    
    # Translate if needed
    if target_language != 'en':
        try:
            paper_text = smart_translate_text(paper_text, target_language=target_language)
        except Exception as e:
            current_app.logger.warning(f"Translation failed: {e}")
    
    # Save paper
    paper = QuestionPaper(
        material_id=material_id,
        student_id=current_user_id,
        generation_type="pattern",
        config=pattern.pattern_json,
        paper_text=paper_text
    )
    
    db.session.add(paper)
    db.session.commit()
    
    return jsonify({
        "question_paper": paper_text,
        "paper_id": paper.id,
        "language": target_language
    })

# =====================================================
# GET/DELETE OPERATIONS
# =====================================================

@summary_bp.route("/patterns", methods=["GET"])
@jwt_required()
@handle_api_errors
def get_patterns():
    current_user_id = get_jwt_identity()
    patterns = QuestionPattern.query.filter_by(student_id=current_user_id).all()
    
    return jsonify({
        "patterns": [{
            "id": p.id,
            "source": p.source,
            "pattern_json": p.pattern_json,
            "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in patterns]
    })

@summary_bp.route("/papers", methods=["GET"])
@jwt_required()
@handle_api_errors
def get_papers():
    current_user_id = get_jwt_identity()
    papers = QuestionPaper.query.filter_by(student_id=current_user_id).all()
    
    return jsonify({
        "papers": [{
            "id": p.id,
            "material_id": p.material_id,
            "generation_type": p.generation_type,
            "paper_text": p.paper_text,
            "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in papers]
    })

@summary_bp.route("/delete-summary/<summary_id>", methods=["DELETE"])
@jwt_required()
@handle_api_errors
def delete_summary(summary_id):
    current_user_id = get_jwt_identity()
    summary = MaterialSummary.query.filter_by(id=summary_id, student_id=current_user_id).first()
    
    if not summary:
        return jsonify({"error": "Summary not found"}), 404
    
    db.session.delete(summary)
    db.session.commit()
    
    return jsonify({"message": "Summary deleted successfully"})

@summary_bp.route("/delete-question-paper/<paper_id>", methods=["DELETE"])
@jwt_required()
@handle_api_errors
def delete_question_paper(paper_id):
    current_user_id = get_jwt_identity()
    paper = QuestionPaper.query.filter_by(id=paper_id, student_id=current_user_id).first()
    
    if not paper:
        return jsonify({"error": "Paper not found"}), 404
    
    db.session.delete(paper)
    db.session.commit()
    
    return jsonify({"message": "Question paper deleted successfully"})

@summary_bp.route("/delete-question-pattern/<pattern_id>", methods=["DELETE"])
@jwt_required()
@handle_api_errors
def delete_question_pattern(pattern_id):
    current_user_id = get_jwt_identity()
    pattern = QuestionPattern.query.filter_by(id=pattern_id, student_id=current_user_id).first()
    
    if not pattern:
        return jsonify({"error": "Pattern not found"}), 404
    
    db.session.delete(pattern)
    db.session.commit()
    
    return jsonify({"message": "Pattern deleted successfully"})