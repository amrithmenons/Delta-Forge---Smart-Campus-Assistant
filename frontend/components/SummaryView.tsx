
// import React, { useState, useEffect } from 'react';
// import { Upload, FileText, Brain, Trash2, Download, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

// // Types
// interface Material {
//   id: string;
//   title: string;
//   subject: string;
//   content: string;
//   content_length: number;
//   processing_status: string;
// }

// interface Summary {
//   id: string;
//   material_id: string;
//   summary_text: string;
//   created_at: string;
// }

// interface QuestionPattern {
//   id: string;
//   source: string;
//   pattern_json: string;
//   created_at: string;
// }

// interface QuestionPaper {
//   id: string;
//   material_id: string;
//   paper_text: string;
//   generation_type: string;
//   created_at: string;
// }

// interface QuestionConfig {
//   sections: Array<{
//     section_name: string;
//     marks_per_question: number;
//     number_of_questions: number;
//     question_type: string;
//   }>;
//   total_marks: number;
//   duration: string;
// }

// const API_BASE_URL = 'http://localhost:5000/api';

// const AIStudyPlatform: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<'summary' | 'pattern' | 'questions'>('summary');
  
//   // State
//   const [materials, setMaterials] = useState<Material[]>([]);
//   const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
//   const [summary, setSummary] = useState<string>('');
//   const [patterns, setPatterns] = useState<QuestionPattern[]>([]);
//   const [papers, setPapers] = useState<QuestionPaper[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string>('');
//   const [success, setSuccess] = useState<string>('');
  
//   // Question config state
//   const [questionConfig, setQuestionConfig] = useState<QuestionConfig>({
//     sections: [
//       { section_name: 'Section A', marks_per_question: 2, number_of_questions: 10, question_type: 'MCQ' }
//     ],
//     total_marks: 100,
//     duration: '3 hours'
//   });

//   // Load materials on mount
//   useEffect(() => {
//     const token = getAuthToken();
//     if (token) {
//       loadMaterials();
//       loadPatterns();
//       loadPapers();
//     } else {
//       setError('Please log in to access AI Study Assistant');
//     }
//   }, []);

//   // Get token from localStorage
//   const getAuthToken = () => {
//     const token = localStorage.getItem('token');
//     return token;
//   };

//   // Handle token expiration
//   const handleTokenExpired = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('studentId');
//     setError('Your session has expired. Please log in again.');
//     // Optionally redirect to login
//     setTimeout(() => {
//       window.location.href = '/login';
//     }, 2000);
//   };

//   // API Helper with Authorization
//   const apiCall = async (endpoint: string, options: RequestInit = {}) => {
//     try {
//       const token = getAuthToken();
      
//       if (!token) {
//         throw new Error('Not authenticated. Please log in.');
//       }

//       const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//         ...options,
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
//           ...options.headers,
//         },
//       });
      
//       if (response.status === 401) {
//         const data = await response.json().catch(() => ({}));
//         if (data.msg && data.msg.includes('expired')) {
//           handleTokenExpired();
//         }
//         throw new Error('Session expired. Please log in again.');
//       }
      
//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
//         throw new Error(errorData.error || `Request failed with status ${response.status}`);
//       }
      
//       return await response.json();
//     } catch (err) {
//       console.error('API call error:', err);
//       throw err;
//     }
//   };

//   // Load Materials
//   const loadMaterials = async () => {
//     try {
//       console.log('Loading materials...');
//       const data = await apiCall('/materials');
//       console.log('Materials loaded:', data);
//       setMaterials(data.materials || []);
      
//       if (data.materials && data.materials.length === 0) {
//         setError('No materials found. Please upload some course materials first using the Upload tab.');
//       }
//     } catch (err) {
//       console.error('Error loading materials:', err);
//       setError((err as Error).message);
//     }
//   };

//   // Load Patterns
//   const loadPatterns = async () => {
//     try {
//       const data = await apiCall('/patterns');
//       setPatterns(data.patterns || []);
//     } catch (err) {
//       console.error('Error loading patterns:', err);
//     }
//   };

//   // Load Papers
//   const loadPapers = async () => {
//     try {
//       const data = await apiCall('/papers');
//       setPapers(data.papers || []);
//     } catch (err) {
//       console.error('Error loading papers:', err);
//     }
//   };

//   // Generate Summary
//   const generateSummary = async () => {
//     if (!selectedMaterial) {
//       setError('Please select a material first');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccess('');

//     try {
//       const data = await apiCall('/generate-summary', {
//         method: 'POST',
//         body: JSON.stringify({
//           material_id: selectedMaterial
//         })
//       });

//       setSummary(data.summary);
//       setSuccess(data.message || 'Summary generated successfully!');
//     } catch (err) {
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Upload Question Paper Pattern
//   const uploadQuestionPaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const token = getAuthToken();
//     if (!token) {
//       setError('Not authenticated. Please log in.');
//       return;
//     }

//     const formData = new FormData();
//     formData.append('file', file);

//     setLoading(true);
//     setError('');
//     setSuccess('');

//     try {
//       const response = await fetch(`${API_BASE_URL}/upload-question-paper`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//         },
//         body: formData
//       });

//       if (response.status === 401) {
//         handleTokenExpired();
//         throw new Error('Session expired. Please log in again.');
//       }

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
//         throw new Error(errorData.error || 'Upload failed');
//       }

//       const data = await response.json();
      
//       const newPattern: QuestionPattern = {
//         id: data.pattern_id,
//         source: 'auto-detected',
//         pattern_json: data.pattern,
//         created_at: new Date().toISOString()
//       };
      
//       setPatterns([...patterns, newPattern]);
//       setSuccess('Question paper pattern analyzed successfully!');
      
//       // Reset file input
//       e.target.value = '';
//     } catch (err) {
//       console.error('Upload error:', err);
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate Questions (Manual Config)
//   const generateQuestionsManual = async () => {
//     if (!selectedMaterial) {
//       setError('Please select a material first');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccess('');

//     try {
//       const data = await apiCall('/generate-smart-questions', {
//         method: 'POST',
//         body: JSON.stringify({
//           material_id: selectedMaterial,
//           config: questionConfig
//         })
//       });

//       const newPaper: QuestionPaper = {
//         id: data.paper_id,
//         material_id: selectedMaterial,
//         paper_text: data.question_paper,
//         generation_type: 'manual',
//         created_at: new Date().toISOString()
//       };
      
//       setPapers([...papers, newPaper]);
//       setSuccess('Question paper generated successfully!');
//     } catch (err) {
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate Questions from Pattern
//   const generateQuestionsFromPattern = async (patternId: string) => {
//     if (!selectedMaterial) {
//       setError('Please select a material first');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccess('');

//     try {
//       const data = await apiCall('/generate-from-pattern', {
//         method: 'POST',
//         body: JSON.stringify({
//           material_id: selectedMaterial,
//           pattern_id: patternId
//         })
//       });

//       const newPaper: QuestionPaper = {
//         id: data.paper_id,
//         material_id: selectedMaterial,
//         paper_text: data.question_paper,
//         generation_type: 'pattern',
//         created_at: new Date().toISOString()
//       };
      
//       setPapers([...papers, newPaper]);
//       setSuccess('Question paper generated from pattern!');
//     } catch (err) {
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Add Section to Config
//   const addSection = () => {
//     setQuestionConfig({
//       ...questionConfig,
//       sections: [
//         ...questionConfig.sections,
//         { section_name: `Section ${String.fromCharCode(65 + questionConfig.sections.length)}`, marks_per_question: 5, number_of_questions: 5, question_type: 'Short Answer' }
//       ]
//     });
//   };

//   // Update Section
//   const updateSection = (index: number, field: string, value: any) => {
//     const newSections = [...questionConfig.sections];
//     newSections[index] = { ...newSections[index], [field]: value };
//     setQuestionConfig({ ...questionConfig, sections: newSections });
//   };

//   // Remove Section
//   const removeSection = (index: number) => {
//     setQuestionConfig({
//       ...questionConfig,
//       sections: questionConfig.sections.filter((_, i) => i !== index)
//     });
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <Brain className="w-8 h-8 text-indigo-600" />
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-800">AI Study Assistant</h1>
//                 <p className="text-gray-600">Powered by Deep Learning - Generate summaries and question papers instantly</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Notifications */}
//         {error && (
//           <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center">
//                 <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
//                 <p className="text-red-700">{error}</p>
//               </div>
//               <button
//                 onClick={() => setError('')}
//                 className="text-red-500 hover:text-red-700 text-xl"
//               >
//                 ×
//               </button>
//             </div>
//           </div>
//         )}

//         {success && (
//           <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center">
//                 <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
//                 <p className="text-green-700">{success}</p>
//               </div>
//               <button
//                 onClick={() => setSuccess('')}
//                 className="text-green-500 hover:text-green-700 text-xl"
//               >
//                 ×
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Material Selection */}
//         <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
//           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//             <BookOpen className="w-5 h-5 text-indigo-600" />
//             Select Study Material
//           </h2>
//           {materials.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500 mb-4">No materials available yet.</p>
//               <p className="text-sm text-gray-400">Upload course materials using the Upload tab to get started.</p>
//             </div>
//           ) : (
//             <select
//               value={selectedMaterial || ''}
//               onChange={(e) => setSelectedMaterial(e.target.value)}
//               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//             >
//               <option value="">Choose a material...</option>
//               {materials.map((material) => (
//                 <option key={material.id} value={material.id}>
//                   {material.title} ({material.subject}) - {material.content_length} chars
//                 </option>
//               ))}
//             </select>
//           )}
//         </div>

//         {/* Tabs */}
//         <div className="bg-white rounded-lg shadow-lg mb-6">
//           <div className="flex border-b">
//             <button
//               onClick={() => setActiveTab('summary')}
//               className={`flex-1 py-4 px-6 font-semibold transition-colors ${
//                 activeTab === 'summary'
//                   ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
//                   : 'text-gray-600 hover:bg-gray-50'
//               }`}
//             >
//               <FileText className="w-5 h-5 inline mr-2" />
//               Generate Summary
//             </button>
//             <button
//               onClick={() => setActiveTab('pattern')}
//               className={`flex-1 py-4 px-6 font-semibold transition-colors ${
//                 activeTab === 'pattern'
//                   ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
//                   : 'text-gray-600 hover:bg-gray-50'
//               }`}
//             >
//               <Upload className="w-5 h-5 inline mr-2" />
//               Upload Pattern
//             </button>
//             <button
//               onClick={() => setActiveTab('questions')}
//               className={`flex-1 py-4 px-6 font-semibold transition-colors ${
//                 activeTab === 'questions'
//                   ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
//                   : 'text-gray-600 hover:bg-gray-50'
//               }`}
//             >
//               <Brain className="w-5 h-5 inline mr-2" />
//               Generate Questions
//             </button>
//           </div>

//           <div className="p-6">
//             {/* Summary Tab */}
//             {activeTab === 'summary' && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-4">Generate Easy-to-Understand Summary</h3>
//                 <p className="text-gray-600 mb-4">
//                   Our AI will create a simple, exam-oriented summary with examples and key points.
//                 </p>
//                 <button
//                   onClick={generateSummary}
//                   disabled={loading || !selectedMaterial}
//                   className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
//                 >
//                   {loading ? 'Generating...' : 'Generate Summary'}
//                 </button>

//                 {summary && (
//                   <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
//                     <h4 className="font-semibold text-lg mb-3">Generated Summary:</h4>
//                     <div className="prose max-w-none whitespace-pre-wrap">{summary}</div>
//                     <button
//                       onClick={() => {
//                         navigator.clipboard.writeText(summary);
//                         setSuccess('Copied to clipboard!');
//                       }}
//                       className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
//                     >
//                       <Download className="w-4 h-4 inline mr-1" />
//                       Copy to Clipboard
//                     </button>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Pattern Upload Tab */}
//             {activeTab === 'pattern' && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-4">Upload Question Paper Pattern</h3>
//                 <p className="text-gray-600 mb-4">
//                   Upload a previous question paper (PDF or image) and our AI will analyze its pattern.
//                 </p>
                
//                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
//                   <input
//                     type="file"
//                     id="pattern-upload"
//                     accept=".pdf,.png,.jpg,.jpeg"
//                     onChange={uploadQuestionPaper}
//                     disabled={loading}
//                     className="hidden"
//                   />
//                   <label htmlFor="pattern-upload" className="cursor-pointer">
//                     <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                     <p className="text-gray-600 mb-2">
//                       {loading ? 'Processing...' : 'Click to upload or drag and drop'}
//                     </p>
//                     <p className="text-sm text-gray-500">PDF, PNG, JPG (Max 10MB)</p>
//                   </label>
//                 </div>

//                 {patterns.length > 0 && (
//                   <div className="mt-6">
//                     <h4 className="font-semibold text-lg mb-3">Saved Patterns:</h4>
//                     <div className="space-y-3">
//                       {patterns.map((pattern) => (
//                         <div key={pattern.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                           <div className="flex justify-between items-start">
//                             <div className="flex-1">
//                               <p className="font-semibold">Pattern #{pattern.id}</p>
//                               <p className="text-sm text-gray-600 mt-1">
//                                 Source: {pattern.source}
//                               </p>
//                               <details className="mt-2">
//                                 <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-700">
//                                   View Pattern Details
//                                 </summary>
//                                 <pre className="text-xs mt-2 bg-white p-3 rounded border overflow-auto max-h-40">
//                                   {JSON.stringify(JSON.parse(pattern.pattern_json), null, 2)}
//                                 </pre>
//                               </details>
//                             </div>
//                             <button
//                               onClick={() => generateQuestionsFromPattern(pattern.id)}
//                               disabled={loading || !selectedMaterial}
//                               className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400 text-sm"
//                             >
//                               Use Pattern
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Questions Tab */}
//             {activeTab === 'questions' && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-4">Configure Question Paper</h3>
                
//                 <div className="space-y-4 mb-6">
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-sm font-medium mb-2">Total Marks</label>
//                       <input
//                         type="number"
//                         value={questionConfig.total_marks}
//                         onChange={(e) => setQuestionConfig({...questionConfig, total_marks: Number(e.target.value)})}
//                         className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium mb-2">Duration</label>
//                       <input
//                         type="text"
//                         value={questionConfig.duration}
//                         onChange={(e) => setQuestionConfig({...questionConfig, duration: e.target.value})}
//                         className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                         placeholder="e.g., 3 hours"
//                       />
//                     </div>
//                   </div>

//                   <div className="border-t pt-4">
//                     <div className="flex justify-between items-center mb-3">
//                       <h4 className="font-semibold">Sections</h4>
//                       <button
//                         onClick={addSection}
//                         className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
//                       >
//                         + Add Section
//                       </button>
//                     </div>

//                     {questionConfig.sections.map((section, index) => (
//                       <div key={index} className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200">
//                         <div className="grid grid-cols-2 gap-3 mb-3">
//                           <input
//                             type="text"
//                             value={section.section_name}
//                             onChange={(e) => updateSection(index, 'section_name', e.target.value)}
//                             className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                             placeholder="Section name"
//                           />
//                           <select
//                             value={section.question_type}
//                             onChange={(e) => updateSection(index, 'question_type', e.target.value)}
//                             className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                           >
//                             <option>MCQ</option>
//                             <option>Short Answer</option>
//                             <option>Long Answer</option>
//                             <option>Essay</option>
//                             <option>Mixed</option>
//                           </select>
//                         </div>
//                         <div className="grid grid-cols-3 gap-3">
//                           <input
//                             type="number"
//                             value={section.number_of_questions}
//                             onChange={(e) => updateSection(index, 'number_of_questions', Number(e.target.value))}
//                             className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                             placeholder="Questions"
//                           />
//                           <input
//                             type="number"
//                             value={section.marks_per_question}
//                             onChange={(e) => updateSection(index, 'marks_per_question', Number(e.target.value))}
//                             className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
//                             placeholder="Marks each"
//                           />
//                           <button
//                             onClick={() => removeSection(index)}
//                             className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
//                           >
//                             <Trash2 className="w-4 h-4 inline" />
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 <button
//                   onClick={generateQuestionsManual}
//                   disabled={loading || !selectedMaterial}
//                   className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
//                 >
//                   {loading ? 'Generating...' : 'Generate Question Paper'}
//                 </button>

//                 {papers.length > 0 && (
//                   <div className="mt-6">
//                     <h4 className="font-semibold text-lg mb-3">Generated Papers:</h4>
//                     <div className="space-y-3">
//                       {papers.map((paper) => (
//                         <div key={paper.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                           <p className="font-semibold">Paper #{paper.id}</p>
//                           <p className="text-sm text-gray-600">Type: {paper.generation_type}</p>
//                           <details className="mt-2">
//                             <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-700">
//                               View Question Paper
//                             </summary>
//                             <div className="mt-2 bg-white p-3 rounded border max-h-96 overflow-auto">
//                               <pre className="whitespace-pre-wrap text-sm">{paper.paper_text}</pre>
//                             </div>
//                           </details>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AIStudyPlatform;




















import React, { useState, useEffect } from 'react';
import { Upload, FileText, Brain, Trash2, Download, BookOpen, CheckCircle, AlertCircle, Loader2, Languages, Eye, Copy, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

// Types
interface Material {
  id: string;
  title: string;
  subject: string;
  content: string;
  content_length: number;
  processing_status: string;
  created_at?: string;
}

interface Language {
  code: string;
  name: string;
}

interface Summary {
  id: string;
  material_id: string;
  summary_text: string;
  language?: string;
  language_name?: string;
  created_at: string;
}

interface QuestionPattern {
  id: string;
  source: string;
  pattern_json: string | any;
  created_at: string;
}

interface QuestionPaper {
  id: string;
  material_id: string;
  paper_text: string;
  generation_type: string;
  created_at: string;
}

interface QuestionConfig {
  sections: Array<{
    section_name: string;
    marks_per_question: number;
    number_of_questions: number;
    question_type: string;
  }>;
  total_marks: number;
  duration: string;
  exam_type?: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const AIStudyPlatform: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'pattern' | 'questions'>('summary');
  
  // State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [summaryLanguage, setSummaryLanguage] = useState<string>('en');
  const [patterns, setPatterns] = useState<QuestionPattern[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  
  // Question config state
  const [questionConfig, setQuestionConfig] = useState<QuestionConfig>({
    sections: [
      { section_name: 'Section A', marks_per_question: 2, number_of_questions: 10, question_type: 'MCQ' }
    ],
    total_marks: 100,
    duration: '3 hours',
    exam_type: 'University'
  });

  // Load data on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadMaterials();
      loadPatterns();
      loadPapers();
      loadLanguages();
    } else {
      setError('Please log in to access AI Study Assistant');
    }
  }, []);

  // Get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Handle token expiration
  const handleTokenExpired = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    setError('Your session has expired. Please log in again.');
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  };

  // API Helper with Authorization
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...options.headers,
        },
      });
      
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (data.msg && data.msg.includes('expired')) {
          handleTokenExpired();
        }
        throw new Error('Session expired. Please log in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('API call error:', err);
      throw err;
    }
  };

  // Load Materials
  const loadMaterials = async () => {
    try {
      const data = await apiCall('/materials');
      setMaterials(data.materials || []);
      
      if (data.materials && data.materials.length === 0) {
        setError('No materials found. Please upload course materials first.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Load Languages
  const loadLanguages = async () => {
    try {
      const data = await apiCall('/supported-languages');
      setLanguages(data.languages || []);
    } catch (err) {
      console.error('Error loading languages:', err);
    }
  };

  // Load Patterns
  const loadPatterns = async () => {
    try {
      const data = await apiCall('/patterns');
      setPatterns(data.patterns || []);
    } catch (err) {
      console.error('Error loading patterns:', err);
    }
  };

  // Load Papers
  const loadPapers = async () => {
    try {
      const data = await apiCall('/papers');
      setPapers(data.papers || []);
    } catch (err) {
      console.error('Error loading papers:', err);
    }
  };

  // Generate Summary
  const generateSummary = async () => {
    if (!selectedMaterial) {
      setError('Please select a material first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiCall('/generate-summary', {
        method: 'POST',
        body: JSON.stringify({
          material_id: selectedMaterial,
          language: selectedLanguage
        })
      });

      setSummary(data.summary);
      setSummaryLanguage(data.language_name || 'English');
      setSuccess(data.message || 'Summary generated successfully!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Upload Question Paper Pattern
  const uploadQuestionPaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getAuthToken();
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/upload-question-paper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (response.status === 401) {
        handleTokenExpired();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      await loadPatterns();
      setSuccess('Question paper pattern analyzed successfully!');
      
      e.target.value = '';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Questions (Manual Config)
  const generateQuestionsManual = async () => {
    if (!selectedMaterial) {
      setError('Please select a material first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiCall('/generate-smart-questions', {
        method: 'POST',
        body: JSON.stringify({
          material_id: selectedMaterial,
          config: questionConfig,
          language: selectedLanguage
        })
      });

      await loadPapers();
      setSuccess('Question paper generated successfully!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Questions from Pattern
  const generateQuestionsFromPattern = async (patternId: string) => {
    if (!selectedMaterial) {
      setError('Please select a material first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiCall('/generate-from-pattern', {
        method: 'POST',
        body: JSON.stringify({
          material_id: selectedMaterial,
          pattern_id: patternId,
          language: selectedLanguage
        })
      });

      await loadPapers();
      setSuccess('Question paper generated from pattern!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Pattern
  const deletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return;

    try {
      await apiCall(`/delete-question-pattern/${patternId}`, { method: 'DELETE' });
      setPatterns(patterns.filter(p => p.id !== patternId));
      setSuccess('Pattern deleted successfully');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Delete Paper
  const deletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await apiCall(`/delete-question-paper/${paperId}`, { method: 'DELETE' });
      setPapers(papers.filter(p => p.id !== paperId));
      setSuccess('Paper deleted successfully');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  // Download as text file
  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccess('Downloaded successfully!');
  };

  // Add Section to Config
  const addSection = () => {
    setQuestionConfig({
      ...questionConfig,
      sections: [
        ...questionConfig.sections,
        { 
          section_name: `Section ${String.fromCharCode(65 + questionConfig.sections.length)}`, 
          marks_per_question: 5, 
          number_of_questions: 5, 
          question_type: 'Short Answer' 
        }
      ]
    });
  };

  // Update Section
  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...questionConfig.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setQuestionConfig({ ...questionConfig, sections: newSections });
  };

  // Remove Section
  const removeSection = (index: number) => {
    if (questionConfig.sections.length <= 1) {
      setError('At least one section is required');
      return;
    }
    setQuestionConfig({
      ...questionConfig,
      sections: questionConfig.sections.filter((_, i) => i !== index)
    });
  };

  // Calculate total marks
  const calculateTotalMarks = () => {
    return questionConfig.sections.reduce((sum, section) => 
      sum + (section.marks_per_question * section.number_of_questions), 0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI Study Assistant
                </h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Powered by AI - Generate summaries & question papers instantly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-green-500 hover:text-green-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Material Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Select Study Material
          </h2>
          {materials.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2 font-medium">No materials available yet</p>
              <p className="text-sm text-gray-400">Upload course materials to get started with AI assistance</p>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedMaterial || ''}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">Choose a material...</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title} - {material.subject} ({(material.content_length / 1000).toFixed(1)}K chars)
                  </option>
                ))}
              </select>
              
              {/* Language Selection */}
              {languages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Output Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden border border-gray-100">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'summary'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              Generate Summary
            </button>
            <button
              onClick={() => setActiveTab('pattern')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'pattern'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload Pattern
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'questions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-5 h-5" />
              Generate Questions
            </button>
          </div>

          <div className="p-6">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Generate Easy-to-Understand Summary</h3>
                  <p className="text-gray-600">
                    AI will create a comprehensive, exam-oriented summary with examples and key points in your selected language.
                  </p>
                </div>
                
                <button
                  onClick={generateSummary}
                  disabled={loading || !selectedMaterial}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Summary
                    </>
                  )}
                </button>

                {summary && (
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-lg border-2 border-indigo-100 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Generated Summary ({summaryLanguage})
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(summary)}
                          className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 px-3 py-1 rounded hover:bg-indigo-50 transition-all"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          onClick={() => downloadAsFile(summary, `summary-${Date.now()}.txt`)}
                          className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 px-3 py-1 rounded hover:bg-indigo-50 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="prose max-w-none whitespace-pre-wrap bg-white p-4 rounded-lg shadow-sm">
                      {summary}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pattern Upload Tab */}
            {activeTab === 'pattern' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Upload Question Paper Pattern</h3>
                  <p className="text-gray-600">
                    Upload a previous question paper (PDF or image) and AI will analyze its pattern using advanced OCR.
                  </p>
                </div>
                
                <div className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-all bg-gradient-to-br from-indigo-50 to-purple-50">
                  <input
                    type="file"
                    id="pattern-upload"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp"
                    onChange={uploadQuestionPaper}
                    disabled={loading}
                    className="hidden"
                  />
                  <label htmlFor="pattern-upload" className="cursor-pointer">
                    {loading ? (
                      <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-3 animate-spin" />
                    ) : (
                      <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                    )}
                    <p className="text-gray-700 mb-2 font-medium">
                      {loading ? 'Processing with AI...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500">PDF, PNG, JPG, JPEG, GIF, BMP, WEBP (Max 10MB)</p>
                  </label>
                </div>

                {patterns.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Saved Patterns ({patterns.length})
                    </h4>
                    <div className="space-y-3">
                      {patterns.map((pattern) => {
                        const patternData = typeof pattern.pattern_json === 'string' 
                          ? JSON.parse(pattern.pattern_json) 
                          : pattern.pattern_json;
                        
                        return (
                          <div key={pattern.id} className="bg-gradient-to-r from-white to-indigo-50 p-4 rounded-lg border-2 border-indigo-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-5 h-5 text-indigo-600" />
                                  <p className="font-semibold text-lg">Pattern #{pattern.id}</p>
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                    {pattern.source}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Exam: {patternData.exam_type || 'N/A'} | 
                                  Marks: {patternData.total_marks || 'N/A'} | 
                                  Duration: {patternData.duration || 'N/A'}
                                </p>
                                <button
                                  onClick={() => setExpandedPattern(expandedPattern === pattern.id ? null : pattern.id)}
                                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                >
                                  {expandedPattern === pattern.id ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      View Details
                                    </>
                                  )}
                                </button>
                                {expandedPattern === pattern.id && (
                                  <div className="mt-3 bg-white p-4 rounded-lg border overflow-auto max-h-64 shadow-inner">
                                    <pre className="text-xs">
                                      {JSON.stringify(patternData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => generateQuestionsFromPattern(pattern.id)}
                                  disabled={loading || !selectedMaterial}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                                >
                                  Use Pattern
                                </button>
                                <button
                                  onClick={() => deletePattern(pattern.id)}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Configure Question Paper</h3>
                  <p className="text-gray-600">
                    Customize your question paper structure and let AI generate exam-quality questions.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg border-2 border-indigo-100">
                  <h4 className="font-semibold mb-4 text-indigo-900">Paper Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Exam Type</label>
                      <select
                        value={questionConfig.exam_type}
                        onChange={(e) => setQuestionConfig({...questionConfig, exam_type: e.target.value})}
                        className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option>University</option>
                        <option>Board</option>
                        <option>Competitive</option>
                        <option>Practice</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Total Marks</label>
                      <input
                        type="number"
                        value={questionConfig.total_marks}
                        onChange={(e) => setQuestionConfig({...questionConfig, total_marks: Number(e.target.value)})}
                        className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Duration</label>
                      <input
                        type="text"
                        value={questionConfig.duration}
                        onChange={(e) => setQuestionConfig({...questionConfig, duration: e.target.value})}
                        className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., 3 hours"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-lg">Sections Configuration</h4>
                    <button
                      onClick={addSection}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      + Add Section
                    </button>
                  </div>

                  <div className="space-y-4">
                    {questionConfig.sections.map((section, index) => (
                      <div key={index} className="bg-gradient-to-r from-gray-50 to-indigo-50 p-4 rounded-lg border-2 border-indigo-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Section Name</label>
                            <input
                              type="text"
                              value={section.section_name}
                              onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="e.g., Section A"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Question Type</label>
                            <select
                              value={section.question_type}
                              onChange={(e) => updateSection(index, 'question_type', e.target.value)}
                              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option>MCQ</option>
                              <option>Short Answer</option>
                              <option>Long Answer</option>
                              <option>Essay</option>
                              <option>Numerical</option>
                              <option>Mixed</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Questions</label>
                            <input
                              type="number"
                              value={section.number_of_questions}
                              onChange={(e) => updateSection(index, 'number_of_questions', Number(e.target.value))}
                              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700">Marks Each</label>
                            <input
                              type="number"
                              value={section.marks_per_question}
                              onChange={(e) => updateSection(index, 'marks_per_question', Number(e.target.value))}
                              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              min="1"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => removeSection(index)}
                              disabled={questionConfig.sections.length <= 1}
                              className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Total for this section: {section.number_of_questions * section.marks_per_question} marks
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="font-semibold text-indigo-900">
                      Calculated Total: {calculateTotalMarks()} marks
                    </p>
                  </div>
                </div>

                <button
                  onClick={generateQuestionsManual}
                  disabled={loading || !selectedMaterial}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating Question Paper...
                    </>
                  ) : (
                    <>
                      <Brain className="w-6 h-6" />
                      Generate Question Paper
                    </>
                  )}
                </button>

                {papers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Generated Papers ({papers.length})
                    </h4>
                    <div className="space-y-3">
                      {papers.map((paper) => (
                        <div key={paper.id} className="bg-gradient-to-r from-white to-purple-50 p-4 rounded-lg border-2 border-purple-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <p className="font-semibold">Paper #{paper.id}</p>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                  {paper.generation_type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Material: {materials.find(m => m.id === paper.material_id)?.title || 'Unknown'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setExpandedPaper(expandedPaper === paper.id ? null : paper.id)}
                                className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-purple-50 transition-all"
                              >
                                <Eye className="w-4 h-4" />
                                {expandedPaper === paper.id ? 'Hide' : 'View'}
                              </button>
                              <button
                                onClick={() => copyToClipboard(paper.paper_text)}
                                className="text-indigo-600 hover:text-indigo-700 p-2 rounded-lg hover:bg-indigo-50 transition-all"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadAsFile(paper.paper_text, `question-paper-${paper.id}.txt`)}
                                className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-all"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePaper(paper.id)}
                                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {expandedPaper === paper.id && (
                            <div className="mt-3 bg-white p-4 rounded-lg border-2 border-gray-200 max-h-96 overflow-auto shadow-inner">
                              <pre className="whitespace-pre-wrap text-sm font-mono">
                                {paper.paper_text}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Powered by AI | Advanced OCR with Vision API
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIStudyPlatform;