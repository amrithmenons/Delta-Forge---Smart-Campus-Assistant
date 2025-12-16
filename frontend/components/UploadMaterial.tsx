// ============================================
// FILE 1: frontend/components/UploadMaterial.tsx
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload,
  File as FileIcon,
  CheckCircle,
  XCircle,
  Loader,
  Trash2,
  Sparkles,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

interface Material {
  id: string;
  title: string;
  subject: string;
  file_type: string;
  upload_date: string;
  processing_status: 'processing' | 'completed' | 'failed' | string;
}

export default function UploadMaterial(): JSX.Element {
  const auth = useAuth();

  const studentId = useMemo<string | null>(() => {
    const a: any = auth;
    const tryId =
      a?.studentId ??
      a?.student_id ??
      a?.user?.id ??
      a?.user?.uid ??
      a?.user?.sub ??
      a?.uid ??
      a?.id ??
      null;
    return tryId ? String(tryId) : null;
  }, [auth]);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [autoDetectSubject, setAutoDetectSubject] = useState(true);
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadMaterials();
  }, [studentId]);

  const normalizeRow = (d: any): Material => {
    const id = String(d.id ?? d._id ?? d.material_id ?? '');
    const title = d.title ?? d.file_name ?? 'Untitled';
    const subject = d.subject || 'Uncategorized';
    const file_type = d.file_type ?? 'file';
    const upload_date = d.upload_date ?? d.created_at ?? new Date().toISOString();
    const processing_status = d.processing_status ?? 'processing';
    return { id, title, subject, file_type, upload_date, processing_status };
  };

  const loadMaterials = async () => {
    if (!studentId) {
      setMaterials([]);
      return;
    }

    try {
      const url = `${API_URL}/api/materials/${encodeURIComponent(studentId)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const parsed = await resp.json();
        const rows = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
        setMaterials(rows.map(normalizeRow));
      } else {
        setMaterials([]);
      }
    } catch (err) {
      console.error('Backend fetch error:', err);
      setMaterials([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => setIsDragging(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(fileName);
      }
    }
  };

  const uploadWithFormData = async (file: globalThis.File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_id', studentId!);
    formData.append('title', title);
    formData.append('subject', autoDetectSubject ? '' : subject);

    return fetch(`${API_URL}/api/upload-material`, {
      method: 'POST',
      body: formData,
    });
  };

  const uploadWithBase64 = async (file: globalThis.File) => {
    return new Promise<Response>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 50;
          setUploadProgress(progress);
        }
      };
      
      reader.onload = async () => {
        try {
          setUploadProgress(50);
          
          const base64 = reader.result as string;
          const resp = await fetch(`${API_URL}/api/upload-material`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_id: studentId,
              title,
              subject: autoDetectSubject ? '' : subject,
              file_type: file.name.split('.').pop(),
              file_data: base64,
            }),
          });
          
          setUploadProgress(100);
          resolve(resp);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId || !file || !title) {
      setMessage('Please fill in title and select a file');
      return;
    }

    setUploading(true);
    setMessage('');
    setUploadProgress(0);

    try {
      const fileSizeMB = file.size / (1024 * 1024);
      let resp: Response;

      if (fileSizeMB > 5) {
        setMessage(`📤 Uploading large file (${fileSizeMB.toFixed(1)} MB)...`);
        resp = await uploadWithFormData(file);
      } else {
        setMessage('📤 Uploading...');
        resp = await uploadWithBase64(file);
      }

      const body = await resp.json().catch(() => ({}));
      
      if (resp.ok) {
        const detectedSubject = body.subject || subject || 'General';
        setMessage(
          `✅ Success! File uploaded and processed. ${
            autoDetectSubject ? `Detected subject: ${detectedSubject}` : ''
          }`
        );
        
        setTitle('');
        setSubject('');
        setFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        await loadMaterials();
      } else {
        setMessage(`❌ Upload failed: ${body.error ?? 'server error'}`);
      }
    } catch (err) {
      console.error('Upload error', err);
      setMessage('❌ Upload failed - network error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteMaterial = async (materialId: string) => {
    const confirmed = window.confirm('Delete this material?');
    if (!confirmed) return;
    
    setDeletingIds((s) => ({ ...s, [materialId]: true }));
    const prev = materials;
    setMaterials((m) => m.filter((x) => x.id !== materialId));
    
    try {
      await fetch(`${API_URL}/api/delete-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: materialId, student_id: studentId }),
      });
      
      setMessage('✅ Material deleted');
    } catch (err) {
      console.error('Delete failed', err);
      setMaterials(prev);
      setMessage('❌ Delete failed');
    } finally {
      setDeletingIds((s) => {
        const copy = { ...s };
        delete copy[materialId];
        return copy;
      });
    }
  };

  const groupedMaterials = materials.reduce<Record<string, Material[]>>((acc, m) => {
    const key = m.subject?.trim() || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
  
  const sortedSubjects = Object.keys(groupedMaterials).sort((a, b) => a.localeCompare(b));

  const formatFileSize = (bytes: number) => {
    if (!file) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Upload Study Materials</h2>

      <form onSubmit={handleUpload} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Chapter 5: Calculus Notes"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          
          <div className="flex items-center space-x-3 mb-2">
            <input
              type="checkbox"
              id="autoDetect"
              checked={autoDetectSubject}
              onChange={(e) => setAutoDetectSubject(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="autoDetect" className="flex items-center text-sm text-gray-700 cursor-pointer">
              <Sparkles className="w-4 h-4 mr-1 text-blue-600" />
              Auto-detect subject using AI
            </label>
          </div>
          
          {!autoDetectSubject && (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Mathematics, Physics, History..."
            />
          )}
          
          {autoDetectSubject && (
            <p className="text-xs text-gray-500 mt-1">
              💡 AI will automatically detect the subject from your file content
            </p>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            Drag and drop your file here, or click to select
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports: PDF, DOCX, PPTX, TXT • Max size: 100 MB
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Select File
          </button>

          {file && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center text-sm text-gray-700">
                <FileIcon className="w-4 h-4 mr-2 text-blue-600" />
                <span className="font-medium">{file.name}</span>
                <span className="ml-2 text-gray-500">({formatFileSize(file.size)})</span>
              </div>
            </div>
          )}
        </div>

        {uploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-center text-gray-600">
              {uploadProgress < 50 ? 'Reading file...' : 'Uploading...'}
              {uploadProgress > 0 && ` ${Math.round(uploadProgress)}%`}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file || !title}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Upload and Process
            </>
          )}
        </button>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.includes('✅') || message.toLowerCase().includes('success')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.includes('📤')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <div>
        <h3 className="text-xl font-semibold mb-4">Your Materials</h3>

        {materials.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-2">No materials uploaded yet</p>
            <p className="text-gray-400 text-sm">Upload your first study material to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedSubjects.map((subjectKey) => (
              <section key={subjectKey}>
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {subjectKey}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({groupedMaterials[subjectKey].length})
                  </span>
                </h4>
                
                <div className="space-y-3">
                  {groupedMaterials[subjectKey].map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center flex-1">
                        <FileIcon className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 truncate">{mat.title}</h5>
                          <p className="text-sm text-gray-500">
                            {mat.file_type?.toUpperCase() ?? 'FILE'} •{' '}
                            {new Date(mat.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 ml-4">
                        {mat.processing_status === 'completed' && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-xs ml-1">Ready</span>
                          </div>
                        )}
                        {mat.processing_status === 'processing' && (
                          <div className="flex items-center text-blue-600">
                            <Loader className="w-5 h-5 animate-spin" />
                            <span className="text-xs ml-1">Processing</span>
                          </div>
                        )}
                        {mat.processing_status === 'failed' && (
                          <div className="flex items-center text-red-600">
                            <XCircle className="w-5 h-5" />
                            <span className="text-xs ml-1">Failed</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteMaterial(mat.id)}
                          disabled={!!deletingIds[mat.id]}
                          className="p-2 hover:bg-red-50 rounded-md transition"
                          title="Delete material"
                        >
                          {deletingIds[mat.id] ? (
                            <Loader className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
