import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  Upload,
  MessageCircle,
  FileText,
  Brain,
  Calendar,
  Users,
  Clock,
  LogOut
} from 'lucide-react';
import UploadMaterial from './UploadMaterial';
import ChatInterface from './ChatInterface';
import SummaryView from './SummaryView';
import QuizView from './QuizView';
import StudyPlan from './StudyPlan';
// import StudyRooms from './StudyRooms';
import RevisionLogs from './RevisionLogs';

type Tab = 'upload' | 'chat' | 'summary' | 'quiz' | 'plan' | 'revision';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const { user, signOut } = useAuth();

  const tabs = [
    { id: 'upload' as Tab, label: 'Upload', icon: Upload },
    { id: 'chat' as Tab, label: 'Chat', icon: MessageCircle },
    { id: 'summary' as Tab, label: 'Summaries', icon: FileText },
    { id: 'quiz' as Tab, label: 'Quizzes', icon: Brain },
    { id: 'plan' as Tab, label: 'Study Plan', icon: Calendar },
    // { id: 'rooms' as Tab, label: 'Study Rooms', icon: Users },
    { id: 'revision' as Tab, label: 'Revision', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Smart Campus Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeTab === 'upload' && <UploadMaterial />}
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'summary' && <SummaryView />}
          {activeTab === 'quiz' && <QuizView />}
          {activeTab === 'plan' && <StudyPlan />}
          {/* {activeTab === 'rooms' && <StudyRooms />} */}
          {activeTab === 'revision' && <RevisionLogs />}
        </div>
      </div>
    </div>
  );
}
