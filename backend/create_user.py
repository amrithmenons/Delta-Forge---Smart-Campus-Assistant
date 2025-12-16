# init_demo_user.py
from app import app, db
from models import User
from werkzeug.security import generate_password_hash
import uuid

def init_demo_user():
    with app.app_context():
        # Check if demo user exists
        demo_email = 'demo@student.com'
        demo_user = User.query.filter_by(email=demo_email).first()
        
        if not demo_user:
            # Create demo user with specific ID
            demo_user = User(
                id='demo-user-123',
                full_name='Demo Student',
                email=demo_email,
                password_hash=generate_password_hash('demo123')
            )
            db.session.add(demo_user)
            db.session.commit()
            print(f"✅ Demo user created!")
            print(f"   Email: {demo_email}")
            print(f"   Password: demo123")
            print(f"   ID: demo-user-123")
        else:
            print(f"✅ Demo user already exists (ID: {demo_user.id})")

if __name__ == '__main__':
    init_demo_user()