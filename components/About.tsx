import React from 'react';
import { useTranslation } from '../App';
import { ShieldIcon, GlobeIcon, ZapIcon, LockIcon } from './icons';
import dashboardImg from '../src/assets/images/dashboard_screenshot_1783149831916.jpg';
import scanResultsImg from '../src/assets/images/scan_results_screenshot_1783149853776.jpg';

export const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold text-white tracking-tight">{t('about.title') || "About CyberAudit"}</h2>
        <p className="text-xl text-slate-400">
          {t('about.subtitle') || "Open-source automated web security assessment platform."}
        </p>
      </div>

      <div className="space-y-6 mb-12">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8">
           <h3 className="text-2xl font-bold text-white mb-6">Interface Preview</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-3">
               <div className="rounded-xl overflow-hidden border border-slate-600 shadow-lg shadow-purple-900/20">
                 <img src={dashboardImg} alt="CyberAudit Dashboard" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
               </div>
               <p className="text-center text-sm text-slate-400 font-medium">Dashboard Overview</p>
             </div>
             <div className="space-y-3">
               <div className="rounded-xl overflow-hidden border border-slate-600 shadow-lg shadow-blue-900/20">
                 <img src={scanResultsImg} alt="CyberAudit Scan Results" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
               </div>
               <p className="text-center text-sm text-slate-400 font-medium">Detailed Scan Results</p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
            <ShieldIcon className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-white">{t('about.goalTitle') || "Project Goal"}</h3>
          <p className="text-slate-300 leading-relaxed">
            {t('about.goalDesc') || "CyberAudit aims to provide a fast, comprehensive, and accessible way to analyze the security posture of web applications. It serves as both a practical auditing tool and an academic research project demonstrating modern cybersecurity and software engineering principles."}
          </p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
            <ZapIcon className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-white">{t('about.architectureTitle') || "Architecture"}</h3>
          <p className="text-slate-300 leading-relaxed">
            {t('about.architectureDesc') || "The platform leverages a scalable React/TypeScript frontend with an Express backend engine. The custom crawling module navigates up to 50 pages per domain to identify vulnerabilities (XSS, SQLi, CORS), missing headers, and infrastructure details simultaneously."}
          </p>
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-600 shadow-lg shadow-blue-900/20">
            <img src="/architecture.png" alt="System Architecture Diagram" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <LockIcon className="h-6 w-6 text-red-400 mr-3" />
          {t('about.limitationsTitle') || "Scope & Limitations"}
        </h3>
        <ul className="space-y-4 text-slate-300">
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            {t('about.limitation1') || "Scanning is restricted to publicly accessible pages and does not bypass authentication."}
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            {t('about.limitation2') || "The SQLi and XSS tests are non-destructive and rely on common error heuristics."}
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">•</span>
            {t('about.limitation3') || "Results should be manually verified by a security professional before taking corrective action."}
          </li>
        </ul>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <GlobeIcon className="h-6 w-6 text-green-400 mr-3" />
          {t('about.roadmapTitle') || "Future Roadmap: Multi-Agent AI Platform"}
        </h3>
        <p className="text-slate-300 mb-6">
          Evolving from a single application to a fully autonomous platform using local LLMs (e.g., LM Studio). Users will be able to input natural language requests like <em>"Check my server 192.168.1.15 and prepare a full report,"</em> and the system will orchestrate specialized AI agents to complete the task:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            '🧠 Chief AI Agent (Coordinator)', 
            '🌐 Network Agent (Network analysis)', 
            '🔍 OSINT Agent (Open-source intelligence)', 
            '🛡️ Vulnerability Agent (CVEs & exploitation)',
            '🌍 Web Security Agent (App testing)',
            '📋 Compliance Agent (Standards & auditing)',
            '📊 Report Agent (Unified reporting)',
            '📚 Knowledge Agent (RAG: MITRE, OWASP)'
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0"></div>
              <span className="text-slate-300 text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
