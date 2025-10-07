import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  MessageCircle,
  Search,
  Filter,
  Download,
  Trash2,
  Eye
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type?: string;
  size?: number;
  uploadDate?: string;
  preview?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  images?: string[];
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'chat'>('upload');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const formData = new FormData();
    formData.append('file', files[0]);
    // Optionally add title
    // formData.append('title', files[0].name);
    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchDocuments();
      } else {
        alert(data.detail || 'Upload failed');
      }
    } catch (err) {
      alert('Upload error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name && doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuestion,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: userMessage.content,
          doc_id: selectedDocument?.id || undefined,
          top_k: 4
        })
      });
      const data = await res.json();
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer || 'No answer found.',
        timestamp: new Date().toLocaleTimeString(),
        images: []
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: 'Error connecting to backend.',
        timestamp: new Date().toLocaleTimeString(),
        images: []
      }]);
    }
    setIsLoading(false);
  };
  // Auto-scroll chat input into view when messages change (Ask Question section)
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chatInputRef.current.focus();
    }
  }, [chatMessages]);

  // Fetch documents from backend
  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents.map((d: any) => ({ id: d.doc_id, name: d.title })));
      }
    } catch (err) {
      // handle error
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Text to Document</h1>
                <p className="text-sm text-slate-500">AI-powered document analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-slate-100 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-slate-700">{documents.length} Documents</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'library', label: 'Library', icon: FileText },
              { id: 'chat', label: 'Ask Questions', icon: MessageCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload Your Documents</h2>
              <p className="text-lg text-slate-600">Drop your files here or click to browse</p>
            </div>
            
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 transition-colors duration-300 bg-white shadow-sm"
            >
              <Upload className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <p className="text-xl font-semibold text-slate-700 mb-2">Drop files here</p>
              <p className="text-slate-500 mb-6">Supports PDF, DOC, DOCX, TXT files up to 10MB</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Choose Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Recent Uploads */}
            {documents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Uploads</h3>
                <div className="space-y-3">
                  {documents.slice(-3).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">{doc.name}</p>
                          <p className="text-sm text-slate-500">{formatFileSize(doc.size ?? 0)} • {doc.uploadDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors duration-200">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Document Library</h2>
                <p className="text-slate-600">Manage and preview your uploaded documents</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                  <Filter className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                <FileText className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                <p className="text-xl font-semibold text-slate-700 mb-2">No documents found</p>
                <p className="text-slate-500 mb-6">Upload some documents to get started</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  Upload Documents
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-slate-400 hover:text-green-600 transition-colors duration-200">
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2 truncate">{doc.name}</h3>
                      <div className="text-sm text-slate-500 space-y-1">
                        <p>{formatFileSize(doc.size ?? 0)}</p>
                        <p>Uploaded {doc.uploadDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-200px)]">
            {/* Document Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full">
                <h3 className="font-semibold text-slate-900 mb-4">Available Documents</h3>
                <div className="space-y-2">
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                        selectedDocument?.id === doc.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-900 truncate">{doc.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Ask Questions About Your Documents</h3>
                  <p className="text-sm text-slate-500">Get answers with supporting images and references</p>
                </div>

                {/* Chat Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                      <p className="text-slate-500">Start a conversation by asking a question about your documents</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-2xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`p-4 rounded-2xl ${
                              message.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            <p className="mb-2">{message.content}</p>
                            {message.images && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {message.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt="Response"
                                    className="rounded-lg w-full h-32 object-cover"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 px-2">
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 p-4 rounded-2xl max-w-xs">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-slate-500">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-slate-200">
                  <form onSubmit={handleQuestionSubmit} className="flex space-x-3">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      placeholder="Ask a question about your documents..."
                      className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!currentQuestion.trim() || isLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Ask
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;