import React, { useState } from 'react';
import { Bot, FileText, Send, Sparkles, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { aiApi, AiChatMessage } from '../../lib/api/aiApi';

export const AiAssistantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'ai',
      content: 'Hello! I am your AssetBridge AI Maintenance Assistant. I can assist you with property diagnostics, emergency water and electrical safety guidelines, provider verification, repair cost estimation, and continuity tracking. How can I help you today?',
      sources: []
    }
  ]);

  const handleSend = async (e: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const userQ = (customQuery || query).trim();
    if (!userQ || isTyping) return;

    setErrorMsg(null);
    const userMessage: AiChatMessage = { role: 'user', content: userQ };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setQuery('');
    setIsTyping(true);

    try {
      // Send bounded history (last 8 messages)
      const historyPayload = updatedMessages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await aiApi.sendChatMessage({
        message: userQ,
        history: historyPayload
      });

      if (res.success && res.data) {
        const aiMessage: AiChatMessage = {
          role: 'ai',
          content: res.data.answer,
          sources: res.data.sources || [],
          domain_used: res.data.domain_used
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setErrorMsg(res.message || 'AI Assistant is temporarily unavailable. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('AI Assistant is temporarily unavailable. Please check your network connection and try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownloadDoc = async (docId: string, title: string) => {
    try {
      setDownloadingDocId(docId);
      setErrorMsg(null);
      const { blob, filename } = await aiApi.downloadDocument(docId, title);

      // Ensure the returned content is a valid blob
      if (!blob || blob.size === 0) {
        throw new Error('Downloaded file is empty.');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.setAttribute('download', filename);
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Delay cleanup to allow browser download manager to capture blob and filename
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to download PDF document:', err);
      setErrorMsg(`Unable to download '${title}'. Please verify that the AI service is operational.`);
    } finally {
      setDownloadingDocId(null);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Assistant</h1>
            <p className="text-xs text-slate-500">Real-time Question-Aware RAG Diagnostic & Maintenance Platform</p>
          </div>
        </div>

        <button
          onClick={() => setMessages([{
            role: 'ai',
            content: 'Conversation reset. How can I assist with your asset maintenance or incident today?',
            sources: []
          }])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset Chat
        </button>
      </div>

      {/* Main AI Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Initial Insights Box with Knowledge Documents */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-slate-800">
              AssetBridge Real-Time Knowledge Base (4 Domain Collections):
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 text-xs text-slate-700">
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
              <span><strong>Incident RAG:</strong> Water Leakage & Emergency Triage Guidelines</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span><strong>Provider RAG:</strong> Contractor Verification (NVQ L4, CIDA) & Distance</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
              <span><strong>Maintenance RAG:</strong> Line-Item Quotations & 12-Month Warranties</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
              <span><strong>Governance RAG:</strong> Manager Approval Gating & 30-Day Follow-Ups</span>
            </p>
          </div>

          {/* Related Documents Chips */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Downloadable RAG Knowledge Documents:
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={downloadingDocId === 'water-leakage-guide'}
                onClick={() => handleDownloadDoc('water-leakage-guide', 'Water Leakage Guide')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition shadow-2xs disabled:opacity-50"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                {downloadingDocId === 'water-leakage-guide' ? 'Downloading...' : 'Water Leakage Guide (PDF)'}
                <Download className="h-3 w-3 text-blue-400" />
              </button>

              <button
                type="button"
                disabled={downloadingDocId === 'emergency-maintenance-checklist'}
                onClick={() => handleDownloadDoc('emergency-maintenance-checklist', 'Emergency Maintenance Checklist')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition shadow-2xs disabled:opacity-50"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                {downloadingDocId === 'emergency-maintenance-checklist' ? 'Downloading...' : 'Emergency Maintenance Checklist (PDF)'}
                <Download className="h-3 w-3 text-blue-400" />
              </button>

              <button
                type="button"
                disabled={downloadingDocId === 'residential-maintenance-guide'}
                onClick={() => handleDownloadDoc('residential-maintenance-guide', 'Residential Maintenance Guide')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-2xs disabled:opacity-50"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                {downloadingDocId === 'residential-maintenance-guide' ? 'Downloading...' : 'Residential Maintenance Guide (PDF)'}
                <Download className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="space-y-4 pt-2 min-h-[220px]">
          {messages.map((m, idx) => (
            <div key={idx} className="space-y-2">
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed max-w-2xl ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto font-medium shadow-xs'
                    : 'bg-slate-100 text-slate-800 font-medium'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>

                {/* Sources Section on AI Bubble */}
                {m.role === 'ai' && m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Retrieved Sources:
                    </span>
                    {m.sources.map((s, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleDownloadDoc(s.document_id, s.title)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 text-[11px] font-semibold transition"
                      >
                        <FileText className="h-3 w-3 text-blue-500" />
                        {s.title}
                        <span className="text-[9px] text-slate-400">({Math.round(s.relevance_score * 100)}%)</span>
                        <Download className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-600 text-xs max-w-sm flex items-center gap-2 animate-pulse">
              <Bot className="h-4 w-4 text-blue-600 animate-spin" />
              <span>AI Assistant is querying RAG knowledge & formulating response...</span>
            </div>
          )}
        </div>

        {/* Quick Question Starters */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400">Suggested Questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What should I do first if there is a water leak?",
              "Should I turn off the main water supply?",
              "What are common causes of pipe leakage?",
              "What should I do if there is an electrical problem?",
              "Who can inspect my property?"
            ].map((suggestedQ, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={(e) => handleSend(e, suggestedQ)}
                disabled={isTyping}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium transition disabled:opacity-50"
              >
                {suggestedQ}
              </button>
            ))}
          </div>
        </div>

        {/* Question Prompt Input */}
        <form onSubmit={(e) => handleSend(e)} className="relative pt-2">
          <input
            type="text"
            placeholder="Ask a question about your asset, incident, or maintenance standards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isTyping}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!query.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-1 h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition shadow-xs disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantPage;
