// import { useState, useEffect } from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { API_URL } from '../lib/config';
// import { Users, Plus, Send, Link as LinkIcon, FileText, Video } from 'lucide-react';

// interface StudyRoom {
//   id: string;
//   name: string;
//   subject: string;
//   description: string;
//   created_at: string;
// }

// interface Resource {
//   id: string;
//   title: string;
//   resource_type: string;
//   content: string;
//   url: string;
//   created_at: string;
//   students: { full_name: string };
// }

// export default function StudyRooms() {
//   const { studentId } = useAuth();
//   const [rooms, setRooms] = useState<StudyRoom[]>([]);
//   const [showCreateForm, setShowCreateForm] = useState(false);
//   const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
//   const [resources, setResources] = useState<Resource[]>([]);
//   const [newRoom, setNewRoom] = useState({ name: '', subject: '', description: '' });
//   const [newResource, setNewResource] = useState({
//     title: '',
//     type: 'note',
//     content: '',
//     url: '',
//   });

//   useEffect(() => {
//     loadRooms();
//   }, []);

//   useEffect(() => {
//     if (selectedRoom) {
//       loadResources(selectedRoom);
//     }
//   }, [selectedRoom]);

//   const loadRooms = async () => {
//     try {
//       const response = await fetch(`${API_URL}/api/study-rooms`);
//       const data = await response.json();

//       if (response.ok) {
//         setRooms(data.rooms);
//       }
//     } catch (error) {
//       console.error('Error loading rooms:', error);
//     }
//   };

//   const loadResources = async (roomId: string) => {
//     try {
//       const response = await fetch(`${API_URL}/api/study-rooms/${roomId}/resources`);
//       const data = await response.json();

//       if (response.ok) {
//         setResources(data.resources);
//       }
//     } catch (error) {
//       console.error('Error loading resources:', error);
//     }
//   };

//   const createRoom = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!studentId) return;

//     try {
//       const response = await fetch(`${API_URL}/api/study-rooms`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           ...newRoom,
//           created_by: studentId,
//         }),
//       });

//       if (response.ok) {
//         setNewRoom({ name: '', subject: '', description: '' });
//         setShowCreateForm(false);
//         loadRooms();
//       }
//     } catch (error) {
//       console.error('Error creating room:', error);
//     }
//   };

//   const joinRoom = async (roomId: string) => {
//     if (!studentId) return;

//     try {
//       const response = await fetch(`${API_URL}/api/study-rooms/${roomId}/join`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           student_id: studentId,
//         }),
//       });

//       if (response.ok) {
//         setSelectedRoom(roomId);
//       }
//     } catch (error) {
//       console.error('Error joining room:', error);
//     }
//   };

//   const shareResource = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!selectedRoom || !studentId) return;

//     try {
//       const response = await fetch(
//         `${API_URL}/api/study-rooms/${selectedRoom}/resources`,
//         {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             student_id: studentId,
//             resource_type: newResource.type,
//             title: newResource.title,
//             content: newResource.content,
//             url: newResource.url,
//           }),
//         }
//       );

//       if (response.ok) {
//         setNewResource({ title: '', type: 'note', content: '', url: '' });
//         loadResources(selectedRoom);
//       }
//     } catch (error) {
//       console.error('Error sharing resource:', error);
//     }
//   };

//   const getResourceIcon = (type: string) => {
//     switch (type) {
//       case 'link':
//         return <LinkIcon className="w-5 h-5" />;
//       case 'video':
//         return <Video className="w-5 h-5" />;
//       default:
//         return <FileText className="w-5 h-5" />;
//     }
//   };

//   if (selectedRoom) {
//     const room = rooms.find((r) => r.id === selectedRoom);

//     return (
//       <div>
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h2 className="text-2xl font-bold">{room?.name}</h2>
//             <p className="text-gray-600">{room?.subject}</p>
//           </div>
//           <button
//             onClick={() => setSelectedRoom(null)}
//             className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
//           >
//             Back to Rooms
//           </button>
//         </div>

//         <div className="mb-6 p-6 bg-gray-50 rounded-lg">
//           <h3 className="text-lg font-semibold mb-4">Share Resource</h3>
//           <form onSubmit={shareResource} className="space-y-4">
//             <div className="flex space-x-4">
//               <button
//                 type="button"
//                 onClick={() => setNewResource({ ...newResource, type: 'note' })}
//                 className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
//                   newResource.type === 'note'
//                     ? 'border-blue-600 bg-blue-50 text-blue-700'
//                     : 'border-gray-300 text-gray-700'
//                 }`}
//               >
//                 <FileText className="w-5 h-5 mx-auto mb-1" />
//                 Note
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setNewResource({ ...newResource, type: 'link' })}
//                 className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
//                   newResource.type === 'link'
//                     ? 'border-blue-600 bg-blue-50 text-blue-700'
//                     : 'border-gray-300 text-gray-700'
//                 }`}
//               >
//                 <LinkIcon className="w-5 h-5 mx-auto mb-1" />
//                 Link
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setNewResource({ ...newResource, type: 'video' })}
//                 className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
//                   newResource.type === 'video'
//                     ? 'border-blue-600 bg-blue-50 text-blue-700'
//                     : 'border-gray-300 text-gray-700'
//                 }`}
//               >
//                 <Video className="w-5 h-5 mx-auto mb-1" />
//                 Video
//               </button>
//             </div>

//             <input
//               type="text"
//               value={newResource.title}
//               onChange={(e) =>
//                 setNewResource({ ...newResource, title: e?.target?.value ?? "" })
//               }
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//               placeholder="Resource title"
//               required
//             />

//             {newResource.type === 'note' ? (
//               <textarea
//                 value={newResource.content}
//                 onChange={(e) =>
//                   setNewResource({ ...newResource, content: e?.target?.value ?? "" })
//                 }
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 rows={4}
//                 placeholder="Write your note here..."
//                 required
//               />
//             ) : (
//               <input
//                 type="url"
//                 value={newResource.url}
//                 onChange={(e) =>
//                   setNewResource({ ...newResource, url: e?.target?.value ?? "" })
//                 }
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 placeholder="Enter URL"
//                 required
//               />
//             )}

//             <button
//               type="submit"
//               className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
//             >
//               <Send className="w-5 h-5 mr-2" />
//               Share Resource
//             </button>
//           </form>
//         </div>

//         <div>
//           <h3 className="text-xl font-semibold mb-4">Shared Resources</h3>
//           <div className="space-y-3">
//             {resources.length === 0 ? (
//               <p className="text-gray-500 text-center py-8">No resources shared yet</p>
//             ) : (
//               resources.map((resource) => (
//                 <div key={resource.id} className="p-4 bg-white border border-gray-200 rounded-lg">
//                   <div className="flex items-start">
//                     <div className="text-blue-600 mr-3 mt-1">
//                       {getResourceIcon(resource.resource_type)}
//                     </div>
//                     <div className="flex-1">
//                       <h4 className="font-medium text-gray-900">{resource.title}</h4>
//                       <p className="text-sm text-gray-500 mb-2">
//                         Shared by {resource.students.full_name}
//                       </p>
//                       {resource.content && (
//                         <p className="text-gray-700 whitespace-pre-wrap">{resource.content}</p>
//                       )}
//                       {resource.url && (
//                         <a
//                           href={resource.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-blue-600 hover:underline text-sm"
//                         >
//                           {resource.url}
//                         </a>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-6">
//         <h2 className="text-2xl font-bold">Study Rooms</h2>
//         <button
//           onClick={() => setShowCreateForm(!showCreateForm)}
//           className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//         >
//           <Plus className="w-5 h-5 mr-2" />
//           Create Room
//         </button>
//       </div>

//       {showCreateForm && (
//         <form onSubmit={createRoom} className="mb-6 p-6 bg-gray-50 rounded-lg space-y-4">
//           <input
//             type="text"
//             value={newRoom.name}
//             onChange={(e) => setNewRoom({ ...newRoom, name: e?.target?.value ?? "" })}
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//             placeholder="Room name"
//             required
//           />
//           <input
//             type="text"
//             value={newRoom.subject}
//             onChange={(e) => setNewRoom({ ...newRoom, subject: e?.target?.value ?? "" })}
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//             placeholder="Subject"
//             required
//           />
//           <textarea
//             value={newRoom.description}
//             onChange={(e) => setNewRoom({ ...newRoom, description: e?.target?.value ?? "" })}
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//             rows={3}
//             placeholder="Description (optional)"
//           />
//           <div className="flex space-x-4">
//             <button
//               type="submit"
//               className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
//             >
//               Create
//             </button>
//             <button
//               type="button"
//               onClick={() => setShowCreateForm(false)}
//               className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
//             >
//               Cancel
//             </button>
//           </div>
//         </form>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {rooms.length === 0 ? (
//           <p className="text-gray-500 text-center py-8 col-span-2">No study rooms yet</p>
//         ) : (
//           rooms.map((room) => (
//             <div
//               key={room.id}
//               className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
//             >
//               <div className="flex items-start justify-between mb-3">
//                 <Users className="w-6 h-6 text-blue-600" />
//               </div>
//               <h3 className="text-lg font-semibold text-gray-900 mb-1">{room.name}</h3>
//               <p className="text-sm text-blue-600 mb-2">{room.subject}</p>
//               {room.description && (
//                 <p className="text-sm text-gray-600 mb-4">{room.description}</p>
//               )}
//               <button
//                 onClick={() => joinRoom(room.id)}
//                 className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
//               >
//                 Join Room
//               </button>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }




import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Send, FileText, Video, MessageCircle, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:5000';

interface Room {
  id: string;
  name: string;
  subject: string;
  description: string;
}

interface Message {
  id: string;
  student_name: string;
  content: string;
  created_at: string;
}

interface Resource {
  id: string;
  title: string;
  resource_type: string;
  content?: string;
  url?: string;
  student_name: string;
  created_at: string;
}

export default function StudyRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'resources'>('chat');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Resources state
  const [resources, setResources] = useState<Resource[]>([]);
  const [showShareResource, setShowShareResource] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'note',
    content: '',
    url: ''
  });
  
  // Form states
  const [newRoom, setNewRoom] = useState({ name: '', subject: '', description: '' });

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom && view === 'chat') {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom, view]);

  useEffect(() => {
    if (selectedRoom && view === 'resources') {
      loadResources();
    }
  }, [selectedRoom, view]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/study-rooms`);
      const data = await res.json();
      if (res.ok) setRooms(data.rooms);
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const createRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/api/study-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRoom, created_by: 'student123' })
      });
      if (res.ok) {
        setNewRoom({ name: '', subject: '', description: '' });
        setShowCreateRoom(false);
        loadRooms();
      }
    } catch (err) {
      console.error('Error creating room:', err);
    }
  };

  const joinRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    setView('chat');
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(`${API_URL}/api/study-rooms/${selectedRoom}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/study-rooms/${selectedRoom}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'student123',
          content: newMessage
        })
      });
      if (res.ok) {
        setNewMessage('');
        loadMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const loadResources = async () => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(`${API_URL}/api/study-rooms/${selectedRoom}/resources`);
      const data = await res.json();
      if (res.ok) setResources(data.resources || []);
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  };

  const shareResource = async () => {
    try {
      const res = await fetch(`${API_URL}/api/study-rooms/${selectedRoom}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'student123',
          resource_type: newResource.type,
          title: newResource.title,
          content: newResource.content,
          url: newResource.url
        })
      });
      if (res.ok) {
        setNewResource({ title: '', type: 'note', content: '', url: '' });
        setShowShareResource(false);
        loadResources();
      }
    } catch (err) {
      console.error('Error sharing resource:', err);
    }
  };

  const currentRoom = rooms.find(r => r.id === selectedRoom);

  if (selectedRoom) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{currentRoom?.name}</h2>
            <p className="text-gray-600">{currentRoom?.subject}</p>
          </div>
          <button
            onClick={() => setSelectedRoom(null)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Rooms
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setView('chat')}
            className={`flex items-center px-4 py-2 border-b-2 transition ${view === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat
          </button>
          <button
            onClick={() => setView('resources')}
            className={`flex items-center px-4 py-2 border-b-2 transition ${view === 'resources' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          >
            <FileText className="w-5 h-5 mr-2" />
            Resources
          </button>
        </div>

        {/* CHAT VIEW */}
        {view === 'chat' && (
          <div className="bg-white rounded-lg shadow">
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-600">
                      {msg.student_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.student_name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* RESOURCES VIEW */}
        {view === 'resources' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Shared Resources</h3>
              <button
                onClick={() => setShowShareResource(!showShareResource)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Share Resource
              </button>
            </div>

            {showShareResource && (
              <div className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
                <div className="flex gap-2">
                  {['note', 'link', 'video'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewResource({ ...newResource, type })}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 capitalize ${
                        newResource.type === type
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Title"
                  required
                />
                {newResource.type === 'note' ? (
                  <textarea
                    value={newResource.content}
                    onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={4}
                    placeholder="Content"
                    required
                  />
                ) : (
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="URL"
                    required
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={shareResource}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareResource(false)}
                    className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {resources.map((res, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600">
                      {res.resource_type === 'link' && <ExternalLink className="w-6 h-6" />}
                      {res.resource_type === 'video' && <Video className="w-6 h-6" />}
                      {res.resource_type === 'note' && <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{res.title}</h4>
                      {res.content && <p className="text-gray-700 whitespace-pre-wrap mt-2">{res.content}</p>}
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block mt-2"
                        >
                          {res.url}
                        </a>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Shared by {res.student_name || 'Unknown'} • {new Date(res.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Study Rooms</h2>
        <button
          onClick={() => setShowCreateRoom(!showCreateRoom)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Room
        </button>
      </div>

      {showCreateRoom && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
          <input
            type="text"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Room name"
            required
          />
          <input
            type="text"
            value={newRoom.subject}
            onChange={(e) => setNewRoom({ ...newRoom, subject: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Subject"
            required
          />
          <textarea
            value={newRoom.description}
            onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={3}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={createRoom}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateRoom(false)}
              className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <div key={room.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">{room.name}</h3>
            <p className="text-sm text-blue-600 mb-2">{room.subject}</p>
            {room.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{room.description}</p>
            )}
            <button
              onClick={() => joinRoom(room.id)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Join Room
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}