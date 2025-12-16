import google.generativeai as genai

genai.configure(api_key='AIzaSyDO4IPd2s0JMxH1bdj0t0AUS5kOEKLuIRQ')

for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"✅ {model.name}")