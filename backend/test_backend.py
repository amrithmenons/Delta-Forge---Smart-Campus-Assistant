"""
Quick test script to verify your backend is working
Run this to check if all endpoints are accessible
"""

import requests
import json

API_URL = "http://localhost:5000"

def test_endpoint(name, method, url, data=None):
    """Test an endpoint and print results"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"Method: {method}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print("❌ Unknown method")
            return False
        
        print(f"Status: {response.status_code}")
        
        if response.status_code < 400:
            print("✅ SUCCESS")
            try:
                data = response.json()
                print("Response:", json.dumps(data, indent=2)[:500])
            except:
                print("Response:", response.text[:500])
            return True
        else:
            print("❌ FAILED")
            print("Error:", response.text[:500])
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect - Is Flask running?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("="*60)
    print("Backend Test Suite")
    print("="*60)
    print(f"\nTesting backend at: {API_URL}")
    print("Make sure Flask is running before proceeding!")
    input("\nPress Enter to start tests...")
    
    results = {}
    
    # Test 1: System Status
    results['system_status'] = test_endpoint(
        "System Status",
        "GET",
        f"{API_URL}/api/system-status"
    )
    
    # Test 2: List Materials (use a test student ID)
    test_student_id = "test-student-123"
    results['list_materials'] = test_endpoint(
        "List Materials",
        "GET",
        f"{API_URL}/api/materials/{test_student_id}"
    )
    
    # Test 3: Ask Question
    results['ask_question'] = test_endpoint(
        "Ask Question",
        "POST",
        f"{API_URL}/api/ask-question",
        data={
            "student_id": test_student_id,
            "question": "What is machine learning?"
        }
    )
    
    # Test 4: Chat History
    results['chat_history'] = test_endpoint(
        "Get Chat History",
        "GET",
        f"{API_URL}/api/chat-history/{test_student_id}"
    )
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        icon = "✅" if result else "❌"
        print(f"{icon} {test}")
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed! Your backend is working correctly.")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Check the errors above.")
    
    # Check Gemini specifically
    print("\n" + "="*60)
    print("GEMINI CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{API_URL}/api/system-status")
        if response.status_code == 200:
            data = response.json()
            gemini = data.get('gemini', {})
            
            if gemini.get('api_key_set'):
                print(f"✅ Gemini API Key: {gemini.get('api_key_preview')}")
                print(f"✅ Model Initialized: {gemini.get('model_initialized')}")
                
                if gemini.get('model_initialized'):
                    print("\n🎉 Gemini is fully configured and ready!")
                else:
                    print("\n⚠️ API key is set but model not initialized")
                    print("   Check Flask logs for errors")
            else:
                print("❌ Gemini API Key NOT SET")
                print("\n📝 To configure Gemini:")
                print("   1. Get API key from: https://makersuite.google.com/app/apikey")
                print("   2. Set environment variable:")
                print("      export GEMINI_API_KEY='your-key-here'")
                print("   3. Restart Flask")
    except:
        print("❌ Could not check Gemini status")

if __name__ == "__main__":
    main()