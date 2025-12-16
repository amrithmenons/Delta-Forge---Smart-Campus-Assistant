// frontend/components/QuizView.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader, Play, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

interface Question {
  id: string;
  question: string;
  options: string[];
  points: number;
  correct_answer?: number;
  explanation?: string;
}

interface Material {
  id: string;
  title: string;
  subject: string;
  processing_status: string;
}

export default function QuizView() {
  const { studentId } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [quizId, setQuizId] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(30);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load materials
  useEffect(() => {
    if (studentId) {
      loadMaterials();
    }
  }, [studentId]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || finished || showExplanation) return;

    if (timer === 0) {
      handleNext();
      return;
    }

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, quiz, finished, showExplanation]);

  const loadMaterials = async () => {
    try {
      const url = `${API_URL}/api/materials/${encodeURIComponent(studentId!)}`;
      const resp = await fetch(url);
      
      if (resp.ok) {
        const parsed = await resp.json();
        const rows = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
        const completed = rows.filter((m: any) => 
          (m.processing_status || '').toLowerCase() === 'completed'
        );
        const mapped = completed.map((m: any) => ({
          id: m.id,
          title: m.title || 'Untitled',
          subject: m.subject || 'General',
          processing_status: 'completed',
        }));
        setMaterials(mapped);
        if (mapped.length > 0) setSelectedMaterial(mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const startQuiz = async () => {
    if (!selectedMaterial || !studentId) {
      alert('Please select a material');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          student_id: studentId,
          quiz_type: 'mcq',
          num_questions: numQuestions,
        }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const data = await resp.json();
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions generated');
      }

      setQuiz(data.questions);
      setQuizId(data.quiz_id);
      setTimer(data.time_per_question || 30);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setFinished(false);
      setShowExplanation(false);
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      alert(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || showExplanation) return;

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    const currentQuestion = quiz![currentIndex];
    const isCorrect = answerIndex === currentQuestion.correct_answer;

    if (isCorrect) {
      setScore((s) => s + (currentQuestion.points || 10));
    }

    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTimer(30);

    if (currentIndex + 1 < quiz!.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setFinished(true);

    try {
      await fetch(`${API_URL}/api/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          student_id: studentId,
          answers: userAnswers,
          score,
          correct: userAnswers.filter((ans, idx) => ans === quiz![idx].correct_answer).length,
          total: quiz!.length,
        }),
      });
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setQuizId('');
    setCurrentIndex(0);
    setTimer(30);
    setScore(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setFinished(false);
    setShowExplanation(false);
  };

  // Quiz setup view
  if (!quiz && !finished) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Generate Quiz</h2>

        {materials.length === 0 ? (
          <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-yellow-800 font-medium">No completed materials available</p>
            <p className="text-yellow-600 text-sm mt-2">
              Upload and process study materials first
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Study Material
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {materials.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.title} ({mat.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !selectedMaterial}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Quiz
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Quiz finished view
  if (finished && quiz) {
    const correctCount = userAnswers.filter((ans, idx) => ans === quiz[idx].correct_answer).length;
    const percentage = Math.round((correctCount / quiz.length) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center p-10 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed! 🎉</h1>
          <div className="text-6xl font-bold text-blue-600 mb-4">{percentage}%</div>
          <p className="text-xl text-gray-700">
            Score: {score} points
          </p>
          <p className="text-lg text-gray-600 mt-2">
            {correctCount} out of {quiz.length} correct
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Review Answers</h3>
          {quiz.map((q, idx) => {
            const userAnswer = userAnswers[idx];
            const isCorrect = userAnswer === q.correct_answer;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border-2 ${
                  isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">
                      Q{idx + 1}: {q.question}
                    </p>
                    <p className="text-sm text-gray-700">
                      Your answer: <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                        {q.options[userAnswer]}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-green-700 mt-1">
                        Correct answer: {q.options[q.correct_answer!]}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={resetQuiz}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Take Another Quiz
        </button>
      </div>
    );
  }

  // Active quiz view
  if (quiz && quiz.length > 0) {
    const currentQuestion = quiz[currentIndex];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <span className="text-sm text-gray-600">
              Question {currentIndex + 1} of {quiz.length}
            </span>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / quiz.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center text-lg font-semibold text-gray-700 ml-6">
            <Clock className="w-5 h-5 mr-2" />
            {timer}s
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQuestion.correct_answer;
              const showResult = showExplanation;

              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-100 border-green-500 text-green-900'
                        : isSelected
                        ? 'bg-red-100 border-red-500 text-red-900'
                        : 'bg-gray-50 border-gray-300 text-gray-700'
                      : isSelected
                      ? 'bg-blue-100 border-blue-500 text-blue-900'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                  } ${selectedAnswer !== null ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center">
                    <span className="font-semibold mr-3">{String.fromCharCode(65 + idx)}.</span>
                    <span>{option}</span>
                    {showResult && isCorrect && (
                      <CheckCircle className="w-5 h-5 ml-auto text-green-600" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 ml-auto text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && currentQuestion.explanation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">💡 Explanation: </span>
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {showExplanation && (
            <button
              onClick={handleNext}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {currentIndex + 1 < quiz.length ? 'Next Question' : 'Finish Quiz'}
            </button>
          )}
        </div>

        <div className="text-center text-sm text-gray-600">
          Current Score: <span className="font-semibold text-blue-600">{score} points</span>
        </div>
      </div>
    );
  }

  return null;
}