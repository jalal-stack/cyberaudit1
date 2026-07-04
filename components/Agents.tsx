import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../App';
import { ShieldIcon, ServerIcon, GlobeIcon, BugIcon, FileTextIcon, PlayIcon, LoaderIcon, BrainIcon, TerminalIcon, ScaleIcon } from './icons';
import ReactMarkdown from 'react-markdown';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const agentsList: AgentInfo[] = [
  { id: 'chief', name: 'Chief AI Agent', role: 'Coordinator', icon: BrainIcon, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { id: 'network', name: 'Network Agent', role: 'Network Analysis', icon: ServerIcon, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { id: 'osint', name: 'OSINT Agent', role: 'Intelligence', icon: GlobeIcon, color: 'text-teal-400', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30' },
  { id: 'vuln', name: 'Vulnerability Agent', role: 'Exploitation', icon: BugIcon, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { id: 'web', name: 'Web Security Agent', role: 'App Testing', icon: ShieldIcon, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { id: 'compliance', name: 'Compliance Agent', role: 'Standards', icon: ScaleIcon, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { id: 'report', name: 'Report Agent', role: 'Documentation', icon: FileTextIcon, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
];

interface LogEntry {
  id: number;
  agentId: string;
  message: string;
  timestamp: string;
}

export const Agents: React.FC = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('Check my server 192.168.1.15 and prepare a full report.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (agentId: string, message: string) => {
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      agentId,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);
  };

  const handleStartSimulation = async () => {
    if (!prompt.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setLogs([]);
    setFinalReport(null);
    setActiveAgents([]);
    setCompletedAgents([]);

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Simulation sequence
    setActiveAgents(['chief']);
    addLog('chief', `Received instruction: "${prompt}"`);
    await wait(1500);
    addLog('chief', 'Analyzing intent and breaking down tasks...');
    await wait(1500);
    addLog('chief', 'Task orchestration plan created. Waking up specialized agents.');
    setCompletedAgents(prev => [...prev, 'chief']);
    setActiveAgents([]);
    await wait(800);

    // Network & OSINT parallel
    setActiveAgents(['network', 'osint']);
    addLog('network', `Initiating comprehensive port scan and network topology mapping on target...`);
    addLog('osint', `Querying public databases and threat intelligence feeds for target footprints...`);
    await wait(2000);
    
    addLog('osint', `Found related domain registrations and historical DNS records.`);
    addLog('network', `Discovered open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3306 (MySQL).`);
    await wait(1500);
    setCompletedAgents(prev => [...prev, 'network', 'osint']);
    setActiveAgents([]);

    // Vulnerability & Web
    setActiveAgents(['vuln', 'web']);
    addLog('vuln', `Correlating discovered services (OpenSSH, Nginx, MySQL) against CVE databases...`);
    addLog('web', `Initiating deep web crawl on discovered HTTP/HTTPS endpoints...`);
    await wait(2500);

    addLog('web', `Identified missing Security Headers (HSTS, CSP). Detected potential XSS reflection point in /search.`);
    addLog('vuln', `Found outdated OpenSSH version (CVE-2023-38408). Database service exposed to external interface.`);
    await wait(1500);
    setCompletedAgents(prev => [...prev, 'vuln', 'web']);
    setActiveAgents([]);

    // Compliance
    setActiveAgents(['compliance']);
    addLog('compliance', `Evaluating findings against OWASP Top 10 and NIST frameworks...`);
    await wait(2000);
    addLog('compliance', `Target fails PCI-DSS requirement 6.5 (XSS) and CIS Control 12 (Network Ports).`);
    setCompletedAgents(prev => [...prev, 'compliance']);
    setActiveAgents([]);
    await wait(500);

    // Report
    setActiveAgents(['report', 'chief']);
    addLog('chief', `All diagnostic tasks complete. Handing payload to Report Agent.`);
    addLog('report', `Aggregating findings, severity metrics, and remediation steps into final executive summary...`);
    await wait(2000);
    
    addLog('report', `Report successfully generated and formatted.`);
    setCompletedAgents(prev => [...prev, 'report', 'chief']);
    setActiveAgents([]);
    
    const mockReport = `
# Executive Security Summary

**Target:** Extracted from prompt
**Date:** ${new Date().toLocaleDateString()}
**Overall Risk Score:** **HIGH (Critical)**

## 🛡️ Agent Findings

### 🌐 OSINT Intelligence
* No immediate dark web credential leaks found.
* Historical DNS shows recent migration to current infrastructure.

### 🔌 Network Perimeter (Network Agent)
* **Port 22 (SSH):** Open. Running outdated OpenSSH.
* **Port 80 (HTTP):** Open. Redirects to 443.
* **Port 443 (HTTPS):** Open. Valid Let's Encrypt certificate.
* **Port 3306 (MySQL):** Open to 0.0.0.0. **[CRITICAL]**

### 🕷️ Web Application (Web Security Agent)
* **XSS Vulnerability:** Reflected XSS confirmed in \`/search?q=\` parameter.
* **Headers:** Missing \`Strict-Transport-Security\` and \`Content-Security-Policy\`.

### 🚨 Vulnerability Correlation (Vulnerability Agent)
* **CVE-2023-38408:** OpenSSH forwarded ssh-agent vulnerability. Requires immediate patching.

### 📋 Compliance Status
* **OWASP Top 10:** Fails A03:2021 (Injection) and A05:2021 (Security Misconfiguration).

---
**Remediation Action Plan:**
1. Restrict Port 3306 (MySQL) to localhost or specific trusted IPs via firewall.
2. Update OpenSSH to the latest stable release.
3. Implement input sanitization on the \`/search\` endpoint.
    `;
    setFinalReport(mockReport);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BrainIcon className="h-8 w-8 text-purple-400" />
            {t('header.agents') || "AI Agents Platform"}
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded border border-purple-500/30 uppercase tracking-widest font-mono">Experimental</span>
          </h2>
          <p className="text-slate-400 mt-2">
            Multi-agent orchestration powered by specialized local LLM instances.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Agent Grid */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <ServerIcon className="h-5 w-5 text-slate-400 mr-2" />
              Agent Swarm Status
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {agentsList.map((agent) => {
                const isActive = activeAgents.includes(agent.id);
                const isCompleted = completedAgents.includes(agent.id);
                const Icon = agent.icon;
                
                return (
                  <div 
                    key={agent.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                      isActive 
                        ? `${agent.bgColor} ${agent.borderColor} shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50` 
                        : isCompleted
                          ? 'bg-slate-800/80 border-slate-600 opacity-70'
                          : 'bg-slate-900/50 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isActive ? agent.bgColor : 'bg-slate-800'}`}>
                        <Icon className={`h-5 w-5 ${isActive ? agent.color : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {agent.name}
                        </div>
                        <div className="text-xs text-slate-500">{agent.role}</div>
                      </div>
                    </div>
                    <div>
                      {isActive ? (
                        <div className="flex space-x-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.color.replace('text-', 'bg-')} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.color.replace('text-', 'bg-')} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.color.replace('text-', 'bg-')} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                        </div>
                      ) : isCompleted ? (
                        <div className="text-xs font-mono text-slate-500">STANDBY</div>
                      ) : (
                        <div className="text-xs font-mono text-slate-600">IDLE</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Terminal & Input */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
          
          {/* Output / Terminal */}
          <div className="bg-[#0c0f17] rounded-2xl border border-slate-700 flex-grow flex flex-col overflow-hidden shadow-2xl relative min-h-[400px]">
            <div className="bg-slate-800/80 border-b border-slate-700 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TerminalIcon className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-mono text-slate-300">orchestrator_tty1</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
            </div>
            
            <div className="p-4 font-mono text-sm overflow-y-auto flex-grow max-h-[500px]">
              {logs.length === 0 && !finalReport && (
                <div className="text-slate-500 h-full flex flex-col items-center justify-center opacity-50">
                  <BrainIcon className="h-12 w-12 mb-4" />
                  <p>Awaiting natural language objective...</p>
                </div>
              )}
              
              <div className="space-y-2">
                {logs.map((log) => {
                  const agent = agentsList.find(a => a.id === log.agentId);
                  return (
                    <div key={log.id} className="animate-fade-in flex items-start break-words">
                      <span className="text-slate-500 mr-3 flex-shrink-0">[{log.timestamp}]</span>
                      <span className={`${agent?.color} font-semibold mr-2 flex-shrink-0`}>[{agent?.name}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            </div>
            
            {/* Absolute overlay for final report if done */}
            {finalReport && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 animate-fade-in flex flex-col">
                <div className="bg-slate-800/80 border-b border-slate-700 p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileTextIcon className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-mono text-purple-300">Generated Report</span>
                  </div>
                  <button onClick={() => setFinalReport(null)} className="text-xs text-slate-400 hover:text-white transition-colors underline">
                    View Terminal Logs
                  </button>
                </div>
                <div className="p-6 overflow-y-auto markdown-body text-slate-300 prose prose-invert max-w-none">
                  <ReactMarkdown>{finalReport}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-4">
            <div className="flex items-end gap-4">
              <div className="flex-grow">
                <label className="block text-xs font-medium text-slate-400 mb-2">Natural Language Objective</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                  placeholder="e.g. Check my server 192.168.1.15 and prepare a full report..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-20 disabled:opacity-50"
                />
              </div>
              <button 
                onClick={handleStartSimulation}
                disabled={isProcessing || !prompt.trim()}
                className="h-20 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors duration-200 flex flex-col items-center justify-center gap-2 flex-shrink-0 w-32"
              >
                {isProcessing ? (
                  <>
                    <LoaderIcon className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-6 w-6" />
                    <span className="text-xs">Execute</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
