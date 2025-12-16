import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Book, Plus, Star, Award, Flame, Target, CheckCircle, Trash2, Activity, Users, LogIn } from 'lucide-react';

interface RevisionLog {
  id: string;
  duration_minutes: number;
  topics_reviewed: string[];
  effectiveness_rating?: number;
  notes?: string;
  created_at: string;
  material_id?: string;
  session_type?: string;
}

interface DayData {
  date: string;
  count: number;
  duration: number;
  level: number;
}

const API_BASE_URL = 'http://localhost:5000/api';

const RevisionTracker: React.FC = () => {
  const [logs, setLogs] = useState<RevisionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    maxStreak: 0,
    thisWeek: 0,
    thisMonth: 0,
    loginCount: 0
  });

  const [newSession, setNewSession] = useState({
    duration_minutes: 30,
    topics_reviewed: '',
    effectiveness_rating: 5,
    notes: '',
    session_type: 'manual'
  });

  const getAuthToken = () => localStorage.getItem('token') || '';
  const getStudentId = () => localStorage.getItem('studentId') || '';

  useEffect(() => {
    loadRevisionLogs();
    trackLoginSession();
  }, []);

  const trackLoginSession = async () => {
    const lastLogin = localStorage.getItem('lastLoginTracked');
    const today = new Date().toDateString();
    
    if (lastLogin !== today) {
      try {
        const token = getAuthToken();
        const studentId = getStudentId();
        
        if (!token || !studentId) return;

        await fetch(`${API_BASE_URL}/revision-logs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            duration_minutes: 0,
            topics_reviewed: ['Login Session'],
            effectiveness_rating: null,
            notes: 'Automatic login tracking',
            session_type: 'login'
          })
        });

        localStorage.setItem('lastLoginTracked', today);
        await loadRevisionLogs();
      } catch (err) {
        console.log('Login tracking skipped');
      }
    }
  };

  const loadRevisionLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      const studentId = getStudentId();
      
      if (!token || !studentId) {
        setError('Please log in to view revision logs');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/revision-logs/${studentId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load revision logs');
      }

      const data = await response.json();
      const logsData = data.logs || [];
      setLogs(logsData);
      calculateStats(logsData);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to load revision logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logsData: RevisionLog[]) => {
    const totalSessions = logsData.filter(log => log.session_type !== 'login').length;
    const totalMinutes = logsData.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const loginCount = logsData.filter(log => log.session_type === 'login').length;
    
    const dates = logsData.map(log => new Date(log.created_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort();
    
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const currentDate = new Date(uniqueDates[i]);
      currentDate.setHours(0, 0, 0, 0);
      
      if (i === uniqueDates.length - 1) {
        const diffToToday = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffToToday > 1) {
          break;
        }
        tempStreak = 1;
        currentStreak = 1;
      } else {
        const prevDate = new Date(uniqueDates[i + 1]);
        prevDate.setHours(0, 0, 0, 0);
        const diff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          tempStreak++;
          currentStreak = tempStreak;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const thisWeek = logsData.filter(log => 
      log.session_type !== 'login' && new Date(log.created_at) >= weekAgo
    ).length;
    const thisMonth = logsData.filter(log => 
      log.session_type !== 'login' && new Date(log.created_at) >= monthAgo
    ).length;

    setStats({
      totalSessions,
      totalMinutes,
      currentStreak,
      maxStreak,
      thisWeek,
      thisMonth,
      loginCount
    });
  };

  const generateHeatmapData = (): DayData[] => {
    const data: { [key: string]: DayData } = {};
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      data[dateStr] = {
        date: dateStr,
        count: 0,
        duration: 0,
        level: 0
      };
    }

    logs.forEach(log => {
      const dateStr = log.created_at?.split('T')[0];
      if (dateStr && data[dateStr]) {
        data[dateStr].count++;
        data[dateStr].duration += log.duration_minutes || 0;
      }
    });

    Object.values(data).forEach(day => {
      if (day.duration === 0) day.level = 0;
      else if (day.duration < 30) day.level = 1;
      else if (day.duration < 60) day.level = 2;
      else if (day.duration < 120) day.level = 3;
      else day.level = 4;
    });

    return Object.values(data);
  };

  const addRevisionSession = async () => {
    try {
      const token = getAuthToken();
      const studentId = getStudentId();
      
      if (!token || !studentId) {
        setError('Please log in to add a session');
        return;
      }

      const topicsArray = newSession.topics_reviewed
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await fetch(`${API_BASE_URL}/revision-logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration_minutes: newSession.duration_minutes,
          topics_reviewed: topicsArray,
          effectiveness_rating: newSession.effectiveness_rating,
          notes: newSession.notes,
          session_type: 'manual'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add session');
      }

      setSuccess('Session logged successfully! 🎉');
      await loadRevisionLogs();
      setShowAddModal(false);
      setNewSession({
        duration_minutes: 30,
        topics_reviewed: '',
        effectiveness_rating: 5,
        notes: '',
        session_type: 'manual'
      });
    } catch (err) {
      console.error('Error adding session:', err);
      setError('Failed to add session. Please try again.');
    }
  };

  const deleteRevisionLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/revision-logs/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSuccess('Session deleted successfully');
      await loadRevisionLogs();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    }
  };

  const heatmapData = generateHeatmapData();
  const weeks: DayData[][] = [];
  
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const getLevelColor = (level: number) => {
    const colors = [
      'bg-gray-100',
      'bg-green-200',
      'bg-green-400',
      'bg-green-600',
      'bg-green-800'
    ];
    return colors[level];
  };

  const getMonthLabels = () => {
    const labels: { month: string; offset: number }[] = [];
    let currentMonth = '';
    
    heatmapData.forEach((day, index) => {
      const date = new Date(day.date);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthName !== currentMonth && index % 7 === 0) {
        currentMonth = monthName;
        labels.push({
          month: monthName,
          offset: Math.floor(index / 7)
        });
      }
    });
    
    return labels;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                Revision Tracker
              </h1>
              <p className="text-gray-600 mt-1">Track your study consistency and build your streak! 🔥</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Log Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
            <CheckCircle className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.totalSessions}</div>
            <div className="text-blue-100 text-sm">Sessions</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
            <Clock className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{Math.floor(stats.totalMinutes / 60)}h</div>
            <div className="text-purple-100 text-sm">Total Time</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 rounded-xl shadow-lg">
            <Flame className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.currentStreak}</div>
            <div className="text-orange-100 text-sm">Day Streak</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
            <Award className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.maxStreak}</div>
            <div className="text-green-100 text-sm">Max Streak</div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 rounded-xl shadow-lg">
            <Target className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.thisWeek}</div>
            <div className="text-pink-100 text-sm">This Week</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
            <TrendingUp className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.thisMonth}</div>
            <div className="text-indigo-100 text-sm">This Month</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white p-4 rounded-xl shadow-lg">
            <LogIn className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{stats.loginCount}</div>
            <div className="text-cyan-100 text-sm">Logins</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              {stats.totalSessions} sessions in the last year
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-4 h-4 rounded ${getLevelColor(level)} border border-gray-200`}
                />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="inline-block">
              {/* Month labels */}
              <div className="flex mb-2">
                <div className="w-8"></div>
                <div className="flex gap-1">
                  {getMonthLabels().map((label, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 font-medium"
                      style={{ 
                        width: `${14 * 4}px`,
                        marginLeft: index === 0 ? '0px' : `${(label.offset - getMonthLabels()[index - 1]?.offset - 4) * 14}px`
                      }}
                    >
                      {label.month}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-1 text-xs text-gray-600 w-8 pr-2">
                  <div className="h-3"></div>
                  <div className="h-3"></div>
                  <div className="h-3">Mon</div>
                  <div className="h-3"></div>
                  <div className="h-3">Wed</div>
                  <div className="h-3"></div>
                  <div className="h-3">Fri</div>
                </div>

                {/* Week columns */}
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)} border border-gray-200 hover:ring-2 hover:ring-blue-400 hover:scale-110 cursor-pointer transition-all`}
                          title={`${day.date}: ${day.count} sessions, ${day.duration} minutes`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-600" />
            Recent Sessions
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading sessions...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No revision sessions yet</p>
              <p className="text-sm">Start logging your study sessions to build your streak!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border transition-all ${
                    log.session_type === 'login'
                      ? 'bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200'
                      : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {log.session_type === 'login' ? (
                          <>
                            <LogIn className="w-4 h-4 text-cyan-600" />
                            <span className="text-sm font-semibold text-cyan-700">Login Session</span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">{log.duration_minutes} min</span>
                            </div>
                            {log.effectiveness_rating && (
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < log.effectiveness_rating!
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {log.topics_reviewed && log.topics_reviewed.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {log.topics_reviewed.map((topic, index) => (
                            <span
                              key={index}
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                log.session_type === 'login'
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {log.notes && log.session_type !== 'login' && (
                        <p className="text-sm text-gray-600 mt-2">{log.notes}</p>
                      )}
                    </div>

                    {log.session_type !== 'login' && (
                      <button
                        onClick={() => deleteRevisionLog(log.id)}
                        className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                Log Revision Session
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newSession.duration_minutes}
                    onChange={(e) => setNewSession({ ...newSession, duration_minutes: Number(e.target.value) })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Topics Reviewed (comma-separated)</label>
                  <input
                    type="text"
                    value={newSession.topics_reviewed}
                    onChange={(e) => setNewSession({ ...newSession, topics_reviewed: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Calculus, Physics, Chemistry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Effectiveness Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setNewSession({ ...newSession, effectiveness_rating: rating })}
                        className="flex-1"
                      >
                        <Star
                          className={`w-8 h-8 mx-auto ${
                            rating <= newSession.effectiveness_rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                  <textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                    placeholder="What did you learn today?"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addRevisionSession}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg"
                >
                  Save Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevisionTracker;