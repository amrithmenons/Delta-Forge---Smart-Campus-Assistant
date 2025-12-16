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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
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
