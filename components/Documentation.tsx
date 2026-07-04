import React from 'react';
import { useTranslation } from '../App';
import { FileTextIcon, ServerIcon, TriangleAlertIcon, ZapIcon } from './icons';

export const Documentation: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold text-white tracking-tight">{t('docs.title') || "Documentation"}</h2>
        <p className="text-xl text-slate-400">
          {t('docs.subtitle') || "Learn how the CyberAudit system works behind the scenes."}
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center space-x-3 bg-slate-800/80">
            <ZapIcon className="h-6 w-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">{t('docs.engineTitle') || "The Crawling Engine"}</h3>
          </div>
          <div className="p-6 space-y-4 text-slate-300">
            <p>
              Unlike traditional single-page scanners, CyberAudit uses a multi-threaded deep-crawling engine.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Breadth-First Search (BFS):</strong> The crawler starts at the domain root and extracts all internal links, following them sequentially.</li>
              <li><strong>Scope Constraints:</strong> It is limited to 50 pages to prevent infinite loops and respect target server resources.</li>
              <li><strong>Concurrent Processing:</strong> Fetches are processed in batches of 10 for optimal speed without triggering rate limits.</li>
            </ul>
          </div>
        </section>

        <section className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center space-x-3 bg-slate-800/80">
            <TriangleAlertIcon className="h-6 w-6 text-red-400" />
            <h3 className="text-xl font-bold text-white">{t('docs.vulnTitle') || "Vulnerability Detection"}</h3>
          </div>
          <div className="p-6 space-y-4 text-slate-300">
            <p>The system performs active and passive checks against discovered endpoints:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <h4 className="font-semibold text-white mb-2">Cross-Site Scripting (XSS)</h4>
                <p className="text-sm">Injects benign payloads into query parameters and analyzes the DOM response for unescaped reflections.</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <h4 className="font-semibold text-white mb-2">SQL Injection (SQLi)</h4>
                <p className="text-sm">Appends SQL-breaking characters (e.g., apostrophes) and looks for standard database syntax errors in the response body.</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <h4 className="font-semibold text-white mb-2">CORS Misconfigurations</h4>
                <p className="text-sm">Tests the 'Access-Control-Allow-Origin' header against forged origin requests.</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <h4 className="font-semibold text-white mb-2">Sensitive Files</h4>
                <p className="text-sm">Actively probes for common files like .env, .git/config, and exposed admin panels.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center space-x-3 bg-slate-800/80">
            <ServerIcon className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">{t('docs.reconTitle') || "Reconnaissance & Scoring"}</h3>
          </div>
          <div className="p-6 space-y-4 text-slate-300">
            <p>
              The scanner builds a profile of the target's technology stack using Wappalyzer-like heuristics, analyzing headers, script tags, and meta tags. 
            </p>
            <p>
              <strong>Security Score Calculation:</strong> The 0-100 score starts at 100 and applies penalities based on severity. Missing HSTS is a critical deduction, while missing X-Frame-Options is a moderate deduction. Vulnerabilities like XSS or SQLi result in automatic "High Risk" classification.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
