"use client";

import { useState, useEffect } from "react";

// 定義資料結構
interface Article {
  id: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  created_at: string;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    url: "",
    content: "",
  });

  const fetchArticles = async () => {
    try {
      const res = await fetch("http://localhost:8080/articles");
      const data = await res.json();
      setArticles(data.data || []);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ url: "", content: "" });
        fetchArticles();
      } else {
        alert("提交失敗，請檢查後端 logs");
      }
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 全局背景：深色 Slate-950
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 頂部聚光燈效果 (Spotlight effect) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-slate-900/50 border border-slate-800 rounded-full text-indigo-400 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Powered by Golang & Ollama
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            Gopher<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Digest</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            技術週報生成器．自動化摘要與標籤分類
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左側：表單 */}
          <section className="lg:col-span-4">
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl sticky top-8">
              <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                新增來源
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    URL 連結
                  </label>
                  <input
                    type="url"
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 text-slate-200 text-sm"
                    placeholder="https://example.com/article..."
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex justify-between">
                    <span>補充內容</span>
                    <span className="text-slate-600 normal-case font-normal text-[10px] border border-slate-800 px-1.5 rounded">Optional</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 text-slate-200 text-sm resize-none"
                    placeholder="若無法抓取，請貼上內文..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl font-medium shadow-lg shadow-indigo-500/10 transition-all duration-200 flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/25 active:transform active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">處理中...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">開始分析</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* 右側：列表 */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                最新摘要
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-md font-mono">{articles.length}</span>
              </h2>
            </div>

            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-slate-500 text-sm">暫無資料，請新增文章連結。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article, index) => (
                  <article key={index} className="group bg-slate-900/40 p-6 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-bold text-slate-200 leading-snug group-hover:text-indigo-400 transition-colors">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            {article.title || "Untitled Article"}
                            <svg className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                           <span>{new Date(article.created_at).toLocaleDateString()}</span>
                           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                           <span className="truncate max-w-[200px]">{new URL(article.url).hostname}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-slate-950/50 border border-slate-800/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded bg-indigo-500/10 uppercase tracking-wider">AI Summary</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed text-justify">
                        {article.summary}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {article.tags && article.tags.length > 0 ? (
                        article.tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs rounded border border-transparent group-hover:border-slate-700 transition-colors">
                            #{tag}
                          </span>
                        ))
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}