declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }

  type SpeechRecognition = any;
  type SpeechRecognitionEvent = any;
}

export {};
