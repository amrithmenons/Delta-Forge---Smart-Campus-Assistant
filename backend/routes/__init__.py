"""
API Routes Package - Main Blueprint
Fixed to work with your existing structure
"""
from flask import Blueprint

print("🔵 Creating API blueprint...")

# Create the API blueprint
api = Blueprint('api', __name__)

# Import all route modules AFTER blueprint creation
# This prevents circular import issues
try:
    from . import auth
    print("✅ Auth routes loaded")
except Exception as e:
    print(f"⚠️ Auth routes failed: {e}")

try:
    from . import materials
    print("✅ Materials routes loaded")
except Exception as e:
    print(f"⚠️ Materials routes failed: {e}")

try:
    from . import qa
    print("✅ QA routes loaded")
except Exception as e:
    print(f"⚠️ QA routes failed: {e}")

try:
    from . import quiz
    print("✅ Quiz routes loaded")
except Exception as e:
    print(f"⚠️ Quiz routes failed: {e}")

try:
    from . import revision
    print("✅ Revision routes loaded")
except Exception as e:
    print(f"⚠️ Revision routes failed: {e}")

try:
    from . import study_plan
    print("✅ Study plan routes loaded")
except Exception as e:
    print(f"⚠️ Study plan routes failed: {e}")

try:
    from . import study_rooms
    print("✅ Study rooms routes loaded")
except Exception as e:
    print(f"⚠️ Study rooms routes failed: {e}")

try:
    from . import summary
    print("✅ Summary routes loaded")
except Exception as e:
    print(f"⚠️ Summary routes failed: {e}")

# NOTE: schedule_routes.py is imported separately in app.py
# We don't import it here to avoid conflicts
print("📝 Note: Schedule routes loaded separately via schedule_bp in app.py")

print("🎉 API routes package initialized")

# Export the api blueprint
__all__ = ['api']