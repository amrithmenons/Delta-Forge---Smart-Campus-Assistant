import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Moon, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface ScheduleSlot {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  type: string;
  subject?: string;
  color?: string;
}

interface Routine {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days: string[];
}

interface Exam {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
}

interface Subject {
  name: string;
  hours: number;
  priority: number;
}

interface DaySchedule {
  date: string;
  day_name: string;
  slots: ScheduleSlot[];
}

interface WeekSchedule {
  week_start: string;
  week_end: string;
  days: DaySchedule[];
}

export default function ScheduleBuilder() {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'builder' | 'routines' | 'exams'>('calendar');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([{ name: '', hours: 5, priority: 1 }]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [studyDuration, setStudyDuration] = useState(90);
  const [breakDuration, setBreakDuration] = useState(15);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const getStudentId = () => {
    // Your app stores it as 'studentId' in localStorage
    const studentId = localStorage.getItem('studentId') || 
                      localStorage.getItem('student_id') || 
                      localStorage.getItem('user_id');
    
    // If still not found, try to parse from userInfo
    if (!studentId) {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          return userInfo.id || userInfo.studentId || userInfo.student_id;
        } catch (e) {
          console.error('Error parsing userInfo:', e);
        }
      }
    }
    
    console.log('Student ID found:', studentId); // Debug log
    return studentId;
  };

  useEffect(() => {
    setIsLoading(false);
    loadRoutines();
    loadExams();
  }, []);

  useEffect(() => {
    if (view === 'calendar') {
      // Force a fresh load when switching to calendar view
      const loadData = async () => {
        await loadWeekSchedule();
      };
      loadData();
    }
  }, [selectedDate, view]);

  const loadRoutines = async () => {
    try {
      const studentId = getStudentId();
      if (!studentId) return;
      
      const res = await fetch(`${API_URL}/routines?student_id=${studentId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setRoutines(await res.json());
    } catch (e) {
      console.error('Error loading routines:', e);
    }
  };

  const loadExams = async () => {
    try {
      const studentId = getStudentId();
      if (!studentId) return;
      
      const res = await fetch(`${API_URL}/exams?student_id=${studentId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setExams(await res.json());
    } catch (e) {
      console.error('Error loading exams:', e);
    }
  };

  const loadWeekSchedule = async () => {
    try {
      const studentId = getStudentId();
      if (!studentId) return;
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/schedule/weekly?student_id=${studentId}&start_date=${dateStr}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setWeekSchedule(await res.json());
    } catch (e) {
      console.error('Error loading week schedule:', e);
    }
  };

  const generateSchedule = async () => {
    const valid = subjects.filter(s => s.name.trim());
    if (!valid.length) {
      alert('Please add at least one subject');
      return;
    }

    const studentId = getStudentId();
    if (!studentId) {
      alert('Please log in to generate a schedule');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/schedule/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          subjects: valid.map(s => ({ name: s.name, hours_per_week: s.hours, priority: s.priority })),
          start_date: dateRange.start,
          end_date: dateRange.end,
          study_duration: studyDuration,
          break_duration: breakDuration
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Schedule generated successfully! Created ${result.slots_created || 0} slots.`);
        
        // Force reload all data
        await Promise.all([
          loadWeekSchedule(),
          loadRoutines(),
          loadExams()
        ]);
        
        // Switch to calendar view
        setView('calendar');
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Schedule generation error:', error);
        alert(`Failed to generate schedule: ${error.error || error.msg || 'Server error'}`);
      }
    } catch (e) {
      console.error('Error generating schedule:', e);
      alert('Failed to connect to server. Please ensure the backend is running.');
    }
  };

  const saveRoutine = async (routine: Omit<Routine, 'id'>) => {
    try {
      const studentId = getStudentId();
      const url = editingRoutine ? `${API_URL}/routine/${editingRoutine.id}` : `${API_URL}/routine`;
      await fetch(url, {
        method: editingRoutine ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...routine, student_id: studentId })
      });
      loadRoutines();
      setShowRoutineModal(false);
      setEditingRoutine(null);
    } catch (e) {
      console.error('Error saving routine:', e);
    }
  };

  const deleteRoutine = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    try {
      const studentId = getStudentId();
      await fetch(`${API_URL}/routine/${id}?student_id=${studentId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      loadRoutines();
    } catch (e) {
      console.error('Error deleting routine:', e);
    }
  };

  const saveExam = async (exam: Omit<Exam, 'id'>) => {
    try {
      const studentId = getStudentId();
      const url = editingExam ? `${API_URL}/exam/${editingExam.id}` : `${API_URL}/exam`;
      await fetch(url, {
        method: editingExam ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...exam, student_id: studentId })
      });
      loadExams();
      setShowExamModal(false);
      setEditingExam(null);
    } catch (e) {
      console.error('Error saving exam:', e);
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    try {
      const studentId = getStudentId();
      await fetch(`${API_URL}/exam/${id}?student_id=${studentId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      loadExams();
    } catch (e) {
      console.error('Error deleting exam:', e);
    }
  };

  const deleteSlot = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    try {
      const studentId = getStudentId();
      await fetch(`${API_URL}/schedule/slot/${id}?student_id=${studentId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      loadWeekSchedule();
    } catch (e) {
      console.error('Error deleting slot:', e);
    }
  };

  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 6; h <= 22; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Schedule Builder</h1>
              <p className="text-sm text-gray-500 mt-1">Plan your study sessions efficiently</p>
            </div>
          </div>

          <div className="flex space-x-2">
            {(['calendar', 'builder', 'routines', 'exams'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {view === 'calendar' && weekSchedule && weekSchedule.days && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Week of {new Date(weekSchedule.week_start).toLocaleDateString()}
              </h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 86400000))} 
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Previous Week
                </button>
                <button 
                  onClick={() => setSelectedDate(new Date())} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Today
                </button>
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 86400000))} 
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Next Week
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 gap-2 min-w-[1200px]">
                <div className="font-semibold text-sm text-gray-600 pt-12">
                  {getTimeSlots().map(time => (
                    <div key={time} className="h-12 border-b border-gray-200 flex items-center">
                      {time}
                    </div>
                  ))}
                </div>

                {weekSchedule.days.map(day => (
                  <div key={day.date} className="border-l border-gray-200">
                    <div className="sticky top-0 bg-white border-b-2 border-blue-600 p-2 text-center">
                      <div className="font-bold">{day.day_name.substring(0, 3)}</div>
                      <div className="text-sm text-gray-600">{new Date(day.date).getDate()}</div>
                    </div>

                    {getTimeSlots().map(time => (
                      <div key={time} className="h-12 border-b border-gray-100 relative">
                        {day.slots.filter(slot => slot.start === time).map(slot => (
                          <div
                            key={slot.id}
                            className={`absolute inset-0 m-0.5 rounded p-1 text-xs group ${
                              slot.type === 'exam' ? 'bg-red-100 border-l-4 border-red-500' :
                              slot.type === 'routine' ? 'bg-purple-100 border-l-4 border-purple-500' :
                              slot.type === 'break' ? 'bg-green-100 border-l-4 border-green-500' :
                              'bg-blue-100 border-l-4 border-blue-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate flex-1">{slot.title}</span>
                              <button 
                                onClick={() => deleteSlot(slot.id)} 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                            <div className="text-gray-600">{slot.start}-{slot.end}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'calendar' && (!weekSchedule || !weekSchedule.days) && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No schedule data available</p>
            <p className="text-sm text-gray-500 mt-2">Generate a schedule to get started</p>
          </div>
        )}

        {view === 'builder' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Build Your Schedule</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Subjects</label>
              {subjects.map((subject, idx) => (
                <div key={idx} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={subject.name}
                    onChange={(e) => {
                      const ns = [...subjects];
                      ns[idx].name = e.target.value;
                      setSubjects(ns);
                    }}
                    placeholder="Subject name"
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={subject.hours}
                    onChange={(e) => {
                      const ns = [...subjects];
                      ns[idx].hours = parseInt(e.target.value) || 5;
                      setSubjects(ns);
                    }}
                    placeholder="Hours/week"
                    className="w-24 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={subject.priority}
                    onChange={(e) => {
                      const ns = [...subjects];
                      ns[idx].priority = parseInt(e.target.value);
                      setSubjects(ns);
                    }}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1">Normal</option>
                    <option value="2">High</option>
                    <option value="3">Urgent</option>
                  </select>
                  {subjects.length > 1 && (
                    <button
                      onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSubjects([...subjects, { name: '', hours: 5, priority: 1 }])}
                className="flex items-center text-blue-600 hover:text-blue-700 mt-2 transition"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Subject
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Study Session Duration: {studyDuration} minutes
                </label>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={studyDuration}
                  onChange={(e) => setStudyDuration(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Break Duration: {breakDuration} minutes
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={generateSchedule}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center transition"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Generate Smart Schedule
            </button>
          </div>
        )}

        {view === 'routines' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Daily Routines</h2>
              <button
                onClick={() => { setEditingRoutine(null); setShowRoutineModal(true); }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Routine
              </button>
            </div>

            <div className="space-y-4">
              {routines.map(r => (
                <div key={r.id} className="p-4 border rounded-lg flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Moon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{r.name}</h3>
                      <p className="text-gray-600">{r.start_time} - {r.end_time}</p>
                      <p className="text-sm text-gray-500">{r.days.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { setEditingRoutine(r); setShowRoutineModal(true); }} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteRoutine(r.id)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {routines.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Moon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No routines added yet</p>
                  <p className="text-sm mt-2">Add your daily routines like sleep, meals, exercise</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'exams' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Exam Schedule</h2>
              <button
                onClick={() => { setEditingExam(null); setShowExamModal(true); }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exam
              </button>
            </div>

            <div className="space-y-4">
              {exams.map(e => (
                <div key={e.id} className="p-4 border rounded-lg flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{e.subject}</h3>
                      <p className="text-gray-600">{new Date(e.exam_date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">{e.start_time} - {e.end_time}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { setEditingExam(e); setShowExamModal(true); }} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteExam(e.id)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {exams.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No exams scheduled yet</p>
                  <p className="text-sm mt-2">Add your upcoming exams to plan better</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showRoutineModal && (
          <RoutineModal 
            routine={editingRoutine} 
            onSave={saveRoutine} 
            onClose={() => { setShowRoutineModal(false); setEditingRoutine(null); }} 
          />
        )}

        {showExamModal && (
          <ExamModal 
            exam={editingExam} 
            onSave={saveExam} 
            onClose={() => { setShowExamModal(false); setEditingExam(null); }} 
          />
        )}
      </div>
    </div>
  );
}

function RoutineModal({ routine, onSave, onClose }: { 
  routine: Routine | null; 
  onSave: (r: Omit<Routine, 'id'>) => void; 
  onClose: () => void 
}) {
  const [data, setData] = useState<Omit<Routine, 'id'>>(
    routine || { name: '', start_time: '06:00', end_time: '07:00', days: [] }
  );
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">{routine ? 'Edit' : 'Add'} Routine</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Routine Name</label>
            <input 
              type="text" 
              value={data.name} 
              onChange={(e) => setData({ ...data, name: e.target.value })} 
              placeholder="e.g., Morning Exercise, Sleep" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input 
                type="time" 
                value={data.start_time} 
                onChange={(e) => setData({ ...data, start_time: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input 
                type="time" 
                value={data.end_time} 
                onChange={(e) => setData({ ...data, end_time: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Days</label>
            <div className="flex space-x-2">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => {
                    const newDays = data.days.includes(day) 
                      ? data.days.filter(d => d !== day) 
                      : [...data.days, day];
                    setData({ ...data, days: newDays });
                  }}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    data.days.includes(day) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex space-x-2 mt-6">
          <button 
            onClick={() => onSave(data)} 
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Save Routine
          </button>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamModal({ exam, onSave, onClose }: { 
  exam: Exam | null; 
  onSave: (e: Omit<Exam, 'id'>) => void; 
  onClose: () => void 
}) {
  const [data, setData] = useState<Omit<Exam, 'id'>>(
    exam || { 
      subject: '', 
      exam_date: new Date().toISOString().split('T')[0], 
      start_time: '09:00', 
      end_time: '12:00' 
    }
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">{exam ? 'Edit' : 'Add'} Exam</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input 
              type="text" 
              value={data.subject} 
              onChange={(e) => setData({ ...data, subject: e.target.value })} 
              placeholder="e.g., Mathematics, Physics" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exam Date</label>
            <input 
              type="date" 
              value={data.exam_date} 
              onChange={(e) => setData({ ...data, exam_date: e.target.value })} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input 
                type="time" 
                value={data.start_time} 
                onChange={(e) => setData({ ...data, start_time: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input 
                type="time" 
                value={data.end_time} 
                onChange={(e) => setData({ ...data, end_time: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex space-x-2 mt-6">
          <button 
            onClick={() => onSave(data)} 
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Save Exam
          </button>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}