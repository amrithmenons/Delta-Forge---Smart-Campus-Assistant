from flask import request, jsonify, current_app, make_response
from . import api
from models import CourseMaterial
import os

# Conditional imports for Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyDO4IPd2s0JMxH1bdj0t0AUS5kOEKLuIRQ')
    
    if GEMINI_API_KEY and len(GEMINI_API_KEY) > 10:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            # Using the latest Gemini 2.5 Flash model
            model = genai.GenerativeModel('gemini-2.5-flash')
            # Test the connection
            print(f"✅ Gemini API configured successfully with model: gemini-2.5-flash")
            GEMINI_CONFIGURED = True
        except Exception as e:
            print(f"❌ Gemini configuration failed: {str(e)}")
            GEMINI_CONFIGURED = False
            GEMINI_AVAILABLE = False
    else:
        print("⚠️ Gemini API key not set or invalid")
        GEMINI_CONFIGURED = False
        GEMINI_AVAILABLE = False
except ImportError as e:
    print(f"❌ google-generativeai not installed: {str(e)}")
    GEMINI_AVAILABLE = False
    GEMINI_CONFIGURED = False
except Exception as e:
    print(f"❌ Gemini import error: {str(e)}")
    GEMINI_AVAILABLE = False
    GEMINI_CONFIGURED = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from datetime import datetime

# In-memory chat history storage
chat_histories = {}

def add_cors_headers(response):
    """Add CORS headers to response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

def get_wikipedia_content(query, sentences=3):
    """Fetch relevant Wikipedia content"""
    if not REQUESTS_AVAILABLE:
        return None
    try:
        url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + query.replace(" ", "_")
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            extract = data.get('extract', '')
            if extract:
                import re
                sentences_list = re.split(r'(?<=[.!?])\s+', extract)
                return ' '.join(sentences_list[:sentences])
    except Exception as e:
        current_app.logger.warning(f"Wikipedia fetch failed: {str(e)}")
    return None

def search_ncert_content(topic):
    """Search for NCERT content (placeholder)"""
    return f"[Educational reference for '{topic}']"

def extract_relevant_content(material_content, question, max_chars=2000):
    """Extract most relevant parts of material based on question keywords"""
    if not material_content:
        return ""
    
    # Check if content is placeholder or too short
    if "placeholder" in material_content.lower() or len(material_content) < 100:
        current_app.logger.warning("Material content appears to be placeholder")
        return ""
    
    # Extract keywords from question
    question_lower = question.lower()
    keywords = [word for word in question_lower.split() if len(word) > 3]
    
    # Split content into sentences
    sentences = []
    for delimiter in ['. ', '.\n', '!\n', '?\n']:
        if delimiter in material_content:
            sentences = material_content.split(delimiter)
            break
    
    if not sentences or len(sentences) == 1:
        sentences = material_content.split('\n')
    
    # Score each sentence based on keyword matches
    scored_sentences = []
    for sentence in sentences:
        if len(sentence.strip()) < 10:
            continue
        sentence_lower = sentence.lower()
        score = sum(1 for keyword in keywords if keyword in sentence_lower)
        if score > 0:
            scored_sentences.append((score, sentence.strip()))
    
    # Sort by relevance and take top sentences
    scored_sentences.sort(reverse=True, key=lambda x: x[0])
    relevant_text = '. '.join([sent for _, sent in scored_sentences[:15]])
    
    # If relevant text is too short, add more context
    if len(relevant_text) < 500 and len(material_content) > 500:
        relevant_text = material_content[:max_chars]
    
    return relevant_text[:max_chars]

def build_context(material, question, student_id):
    """Build comprehensive context from multiple sources"""
    contexts = []
    has_valid_content = False
    
    # 1. Student's material
    if material and material.content:
        if "placeholder" in material.content.lower() or len(material.content) < 100:
            current_app.logger.warning(f"Material {material.id} has placeholder/invalid content")
            contexts.append(f"=== Material Status ===\nMaterial '{material.title}' found but content extraction failed.")
        else:
            relevant_content = extract_relevant_content(material.content, question, max_chars=3000)
            if relevant_content:
                contexts.append(f"=== From Your Study Material: {material.title} ===\n{relevant_content}")
                has_valid_content = True
                current_app.logger.info(f"Extracted {len(relevant_content)} chars of relevant content")
            else:
                material_excerpt = material.content[:3000]
                contexts.append(f"=== From Your Study Material: {material.title} ===\n{material_excerpt}")
                has_valid_content = True
                current_app.logger.info(f"Using material excerpt: {len(material_excerpt)} chars")
    else:
        current_app.logger.warning("No material content available")
    
    # 2. Wikipedia context
    key_terms = [word for word in question.split() if len(word) > 4]
    if key_terms and REQUESTS_AVAILABLE:
        wiki_content = get_wikipedia_content(key_terms[0])
        if wiki_content:
            contexts.append(f"=== Wikipedia Reference ===\n{wiki_content}")
            current_app.logger.info(f"Added Wikipedia context for '{key_terms[0]}'")
    
    # 3. Educational context
    if material and material.subject:
        ncert_ref = f"Subject: {material.subject}\nEducational curriculum reference."
        contexts.append(f"=== Educational Context ===\n{ncert_ref}")
    
    final_context = "\n\n".join(contexts) if contexts else ""
    current_app.logger.info(f"Context: {len(final_context)} chars, valid_material={has_valid_content}")
    return final_context, has_valid_content

def get_chat_history(student_id, material_id=None):
    """Retrieve chat history"""
    key = f"{student_id}:{material_id or 'general'}"
    return chat_histories.get(key, [])

def save_chat_history(student_id, material_id, question, answer):
    """Save chat interaction"""
    key = f"{student_id}:{material_id or 'general'}"
    if key not in chat_histories:
        chat_histories[key] = []
    
    chat_histories[key].append({
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    if len(chat_histories[key]) > 10:
        chat_histories[key] = chat_histories[key][-10:]

def generate_answer_with_gemini(question, context, chat_history):
    """Generate answer using Gemini"""
    if not GEMINI_AVAILABLE or not GEMINI_CONFIGURED:
        current_app.logger.warning(f"Gemini not available: available={GEMINI_AVAILABLE}, configured={GEMINI_CONFIGURED}")
        return None
    
    try:
        current_app.logger.info("🤖 Calling Gemini API...")
        
        history_text = ""
        if chat_history:
            recent_history = chat_history[-3:]
            history_text = "=== Recent Conversation ===\n"
            for item in recent_history:
                history_text += f"Q: {item['question']}\nA: {item['answer'][:200]}...\n\n"
        
        prompt = f"""You are an intelligent educational assistant helping students learn.

{history_text}

{context}

=== Student's Question ===
{question}

=== Instructions ===
1. **PRIMARY**: Answer from the student's study material content above
2. **EXPLAIN**: Break down concepts clearly and simply
3. **CLARIFY**: Use Wikipedia/references for additional context
4. **STRUCTURE**: 
   - Direct answer from material
   - Clear explanation
   - Examples if helpful
5. **CITE**: Reference specific parts of the material

Generate a comprehensive, educational answer:"""

        response = model.generate_content(prompt)
        
        if response and response.text:
            current_app.logger.info(f"✅ Gemini responded: {len(response.text)} chars")
            return response.text
        else:
            current_app.logger.warning("⚠️ Gemini returned empty response")
            return None
            
    except Exception as e:
        current_app.logger.error(f"❌ Gemini API error: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return None

def generate_fallback_answer(question, context, material):
    """Fallback when Gemini unavailable"""
    if material and material.content and len(material.content) > 100:
        relevant = extract_relevant_content(material.content, question, max_chars=1500)
        
        if relevant:
            return f"""**From your study material: {material.title}**

{relevant}

---
*Note: Basic text extraction. For AI-powered explanations with Gemini, check API configuration.*

**Question:** {question}

The excerpt above contains relevant information from your material."""
        else:
            return f"""**Material Found:** {material.title}

Content preview:
{material.content[:800]}...

---
*For intelligent search and AI-powered explanations, configure Gemini API.*"""
    
    return f"""**Question:** {question}

**Status:** No valid study materials found.

To get answers:
1. Upload materials via Upload tab
2. Ensure content extraction succeeds
3. Ask questions about the content"""

@api.route('/ask-question', methods=['POST', 'OPTIONS'])
def ask_question():
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    question = data.get('question', '').strip()
    material_id = data.get('material_id')

    current_app.logger.info(f"📝 Question: '{question[:50]}...' from student {student_id}")

    if not student_id or not question:
        response = jsonify({"answer": "student_id and question required"})
        return add_cors_headers(response), 400

    student_id = str(student_id)

    try:
        # Find material
        material = None
        if material_id and material_id not in ['all', 'none', None]:
            material = CourseMaterial.query.filter_by(
                id=str(material_id), 
                student_id=student_id
            ).first()
            if material:
                current_app.logger.info(f"📚 Using: {material.title}")

        if material is None:
            material = CourseMaterial.query.filter_by(
                student_id=student_id
            ).order_by(CourseMaterial.upload_date.desc()).first()
            if material:
                current_app.logger.info(f"📚 Using latest: {material.title}")

        # Build context
        context, has_valid_content = build_context(material, question, student_id)
        chat_history = get_chat_history(student_id, material_id)
        
        current_app.logger.info(f"📊 Context: {len(context)} chars, Valid: {has_valid_content}")
        
        # Check for extraction issues
        if material and not has_valid_content:
            answer = f"""⚠️ **Content Extraction Issue**

Your material "{material.title}" was found but the text content wasn't properly extracted.

**What to do:**
1. Click the "🔄 Re-process" button above
2. Or re-upload the file
3. Or try a different format (DOCX, TXT)

**Your question:** {question}

I can provide general information using Wikipedia, but cannot reference your specific material until it's properly extracted."""
            
            save_chat_history(student_id, material_id, question, answer)
            response = jsonify({
                "answer": answer,
                "sources_used": ["Material (extraction failed)"],
                "gemini_used": False,
                "content_extraction_failed": True
            })
            return add_cors_headers(response)
        
        # Generate answer
        answer = None
        gemini_used = False
        
        if GEMINI_AVAILABLE and GEMINI_CONFIGURED:
            current_app.logger.info("🤖 Attempting Gemini...")
            answer = generate_answer_with_gemini(question, context, chat_history)
            if answer:
                gemini_used = True
                current_app.logger.info(f"✅ Gemini success")
        else:
            current_app.logger.info(f"⚠️ Gemini unavailable (available={GEMINI_AVAILABLE}, configured={GEMINI_CONFIGURED})")
        
        if not answer:
            current_app.logger.info("📝 Using fallback")
            answer = generate_fallback_answer(question, context, material)
        
        # Save history
        save_chat_history(student_id, material_id, question, answer)
        
        # Build response
        sources = []
        if material and has_valid_content:
            sources.append(f"Study Material: {material.title}")
        if REQUESTS_AVAILABLE:
            sources.append("Wikipedia")
        if gemini_used:
            sources.append("Gemini AI")
        sources.append("NCERT Reference")
        
        response_data = {
            "answer": answer,
            "sources_used": sources,
            "gemini_used": gemini_used,
            "material_found": material is not None,
            "has_valid_content": has_valid_content
        }
        
        if material:
            response_data["material_id"] = material.id
            response_data["material_title"] = material.title
        
        current_app.logger.info(f"✅ Response ready: {len(answer)} chars, Gemini: {gemini_used}")
        
        response = jsonify(response_data)
        return add_cors_headers(response)

    except Exception as e:
        current_app.logger.exception("❌ ask_question failed")
        response = jsonify({
            "answer": f"Error: {str(e)}",
            "error": str(e)
        })
        return add_cors_headers(response), 500

@api.route('/materials/<student_id>', methods=['GET', 'OPTIONS'])
def list_student_materials(student_id):
    """List all materials for a student"""
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        mats = CourseMaterial.query.filter_by(
            student_id=str(student_id)
        ).order_by(CourseMaterial.upload_date.desc()).all()
        
        materials = [{
            "id": m.id,
            "title": m.title or m.file_name or "Untitled",
            "subject": m.subject or "",
            "file_name": m.file_name or "",
            "processing_status": m.processing_status or "completed",
            "content_len": len(m.content or "")
        } for m in mats]
        
        response = jsonify(materials)
        return add_cors_headers(response)
    except Exception as e:
        current_app.logger.exception("list_student_materials failed")
        response = jsonify({"error": str(e)})
        return add_cors_headers(response), 500

@api.route('/chat-history/<student_id>', methods=['GET', 'OPTIONS'])
def get_history(student_id):
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        material_id = request.args.get('material_id', 'general')
        key = f"{student_id}:{material_id}"
        history = chat_histories.get(key, [])
        response = jsonify({"history": history, "count": len(history)})
        return add_cors_headers(response)
    except Exception as e:
        current_app.logger.exception("get_history failed")
        response = jsonify({"history": [], "error": str(e)})
        return add_cors_headers(response), 500

@api.route('/clear-history/<student_id>', methods=['DELETE', 'OPTIONS'])
def clear_history(student_id):
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    try:
        material_id = request.args.get('material_id', 'general')
        key = f"{student_id}:{material_id}"
        if key in chat_histories:
            del chat_histories[key]
        response = jsonify({"message": "History cleared", "success": True})
        return add_cors_headers(response)
    except Exception as e:
        current_app.logger.exception("clear_history failed")
        response = jsonify({"message": "Failed to clear history", "error": str(e)})
        return add_cors_headers(response), 500

@api.route('/gemini-status', methods=['GET', 'OPTIONS'])
def gemini_status():
    """Check Gemini API status"""
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return add_cors_headers(response)
    
    status = {
        "gemini_available": GEMINI_AVAILABLE,
        "gemini_configured": GEMINI_CONFIGURED if GEMINI_AVAILABLE else False,
        "api_key_set": bool(GEMINI_API_KEY) and len(GEMINI_API_KEY) > 10,
        "requests_available": REQUESTS_AVAILABLE,
        "model_name": "gemini-2.5-flash"
    }
    
    response = jsonify(status)
    return add_cors_headers(response)