import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScanResults, ScanId, ScanOption, ScanStatus, ScanResultItem, ScanHistoryItem } from '../types';
import { runSecurityAudit } from '../services/geminiService';
import { GlobeIcon, PlayIcon, ShieldIcon, ServerIcon, LockIcon, DatabaseIcon, TriangleAlertIcon, ZapIcon, CircleCheckIcon, CircleIcon, InfoIcon, LoaderIcon, BugIcon, FileTextIcon, NetworkIcon } from './icons';
import { useTranslation, Language } from '../App';

const ScanTypeOption: React.FC<{ option: ScanOption; isChecked: boolean; onChange: (id: ScanId) => void; }> = ({ option, isChecked, onChange }) => {
  const Icon = option.icon;
  const borderClass = isChecked ? 'border-purple-500' : 'border-slate-700 hover:border-slate-600';
  const bgClass = isChecked ? 'bg-purple-600/10' : 'bg-slate-800/50';

  return (
    <label
      className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors duration-200 ${borderClass} ${bgClass}`}
      onClick={() => onChange(option.id)}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={() => {}} 
      />
      <Icon className="h-5 w-5 text-purple-400" />
      <span className="text-sm text-white flex-1">{option.label}</span>
      {isChecked ? (
        <CircleCheckIcon className="h-5 w-5 text-purple-400 ml-auto" />
      ) : (
        <CircleIcon className="h-5 w-5 text-slate-600 ml-auto" />
      )}
    </label>
  );
};

const ResultCard: React.FC<{ item: ScanResultItem, t: (key: string) => string }> = ({ item, t }) => {
    const statusConfig = {
        [ScanStatus.PASS]: {
            icon: <CircleCheckIcon className="text-green-400" />,
            bgColor: 'bg-green-600/10',
            borderColor: 'border-green-500/20',
            textColor: 'text-green-300'
        },
        [ScanStatus.FAIL]: {
            icon: <TriangleAlertIcon className="text-red-400" />,
            bgColor: 'bg-red-600/10',
            borderColor: 'border-red-500/20',
            textColor: 'text-red-300'
        },
        [ScanStatus.WARN]: {
            icon: <InfoIcon className="text-yellow-400" />,
            bgColor: 'bg-yellow-600/10',
            borderColor: 'border-yellow-500/20',
            textColor: 'text-yellow-300'
        },
    };

    const config = statusConfig[item.status] || statusConfig[ScanStatus.WARN];

    return (
        <div className={`h-full rounded-xl p-6 border ${config.borderColor} ${config.bgColor} flex flex-col`}>
            <div className="flex items-start space-x-4 h-full">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-700/50 mt-1">
                    {config.icon}
                </div>
                <div className="flex-1 flex flex-col h-full min-w-0">
                    <div className="flex justify-between items-start gap-3">
                        <h4 className="text-lg font-semibold text-white break-words">{item.title}</h4>
                        <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${config.bgColor} ${config.textColor}`}>
                            {t(`status.${item.status.toLowerCase()}`)}
                        </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-3 leading-relaxed flex-grow whitespace-pre-wrap">{item.summary}</p>
                    {item.recommendation && (
                        <div className="mt-5 p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{t('scanner.recommendation')}</p>
                            <p className="text-slate-300 text-sm mt-1.5">{item.recommendation}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
};

const OverallScore: React.FC<{ score: number, summary: string, t: (key: string) => string }> = ({ score, summary, t }) => {
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8">
             <div className="flex flex-col sm:flex-row items-center sm:space-x-8 space-y-4 sm:space-y-0">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 120 120">
                        <circle className="text-slate-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="52" cx="60" cy="60" />
                        <circle
                            className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="52"
                            cx="60"
                            cy="60"
                            transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${getScoreColor(score)}`}>
                        {score}
                    </span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white text-center sm:text-left">{t('scanner.overallScore')}</h3>
                    <div className="text-slate-300 mt-6 text-left text-sm sm:text-base">
                        <ReactMarkdown
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2 flex items-center gap-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2 flex items-center gap-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mt-6 mb-3 flex items-center gap-2" {...props} />,
                                h4: ({node, ...props}) => <h4 className="text-base font-semibold text-white mt-4 mb-2 flex items-center gap-2" {...props} />,
                                ul: ({node, ...props}) => <ul className="space-y-2 mt-4 ml-6 list-disc text-slate-300" {...props} />,
                                ol: ({node, ...props}) => <ol className="space-y-2 mt-4 ml-6 list-decimal text-slate-300" {...props} />,
                                li: ({node, ...props}) => <li className="pl-2" {...props} />,
                                p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed text-slate-300" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-white font-semibold flex items-center gap-2" {...props} />
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                </div>
             </div>
        </div>
    );
};

const ScanInProgress: React.FC<{
  url: string;
  scanLabels: string[];
  currentStepIndex: number;
  t: (key: string) => string;
}> = ({ url, scanLabels, currentStepIndex, t }) => {
  const allSteps = [...scanLabels, t('scanner.finalizingReport')];

  const getStatusIcon = (index: number) => {
    if (index < currentStepIndex) {
      return <CircleCheckIcon className="h-5 w-5 text-green-400" />;
    }
    if (index === currentStepIndex) {
      return <LoaderIcon className="h-5 w-5 text-purple-400 animate-spin" />;
    }
    return <CircleIcon className="h-5 w-5 text-slate-600" />;
  };
  
  const getTextColor = (index: number) => {
    if (index < currentStepIndex) return 'text-green-300';
    if (index === currentStepIndex) return 'text-purple-300 font-semibold';
    return 'text-slate-500';
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 flex flex-col items-center">
      <div className="relative w-40 h-40">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-2 border-2 border-slate-700/50 rounded-full"></div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-full h-1/2 bg-gradient-to-b from-purple-500/50 to-transparent rounded-t-full"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
              <ShieldIcon className="w-16 h-16 text-purple-400" />
          </div>
      </div>
      <h2 className="text-2xl font-bold text-white mt-8">{t('scanner.scanningInProgressTitle')} <span className="text-purple-400">{url}</span></h2>
      <p className="text-slate-400 mt-2">{t('scanner.scanningInProgressSubtitle')}</p>
      
      <div className="w-full max-w-md mt-8 space-y-4">
        {allSteps.map((label, index) => (
            <div key={label} className="flex items-center space-x-4 p-3 bg-slate-800/50 rounded-lg">
                <div className={`flex-shrink-0 ${index === currentStepIndex ? 'scale-110' : ''} transition-transform`}>
                    {getStatusIcon(index)}
                </div>
                <span className={`text-sm ${getTextColor(index)} transition-colors`}>{label}</span>
            </div>
        ))}
      </div>
    </div>
  );
};


export const SecurityScanner: React.FC<{
  onScanComplete: (url: string, results: ScanResults) => void;
  initialData?: ScanHistoryItem | null;
  onNewScan: () => void;
}> = ({ onScanComplete, initialData, onNewScan }) => {
  const { t, language } = useTranslation();
  const [url, setUrl] = useState<string>('');
  
  const SCAN_OPTIONS: ScanOption[] = useMemo(() => [
    { id: ScanId.SSL, label: t('scanner.scanOptions.ssl'), icon: LockIcon },
    { id: ScanId.PORTS, label: t('scanner.scanOptions.ports'), icon: ServerIcon },
    { id: ScanId.HEADERS, label: t('scanner.scanOptions.headers'), icon: ShieldIcon },
    { id: ScanId.CMS, label: t('scanner.scanOptions.cms'), icon: DatabaseIcon },
    { id: ScanId.API, label: t('scanner.scanOptions.api'), icon: NetworkIcon },
    { id: ScanId.LEAKS, label: t('scanner.scanOptions.leaks'), icon: TriangleAlertIcon },
    { id: ScanId.DDOS, label: t('scanner.scanOptions.ddos'), icon: ZapIcon },
  ], [t]);

  const initialScanTypes = useMemo(() => SCAN_OPTIONS.reduce((acc, option) => {
    acc[option.id] = true;
    return acc;
  }, {} as Record<ScanId, boolean>), [SCAN_OPTIONS]);

  const [scanTypes, setScanTypes] = useState<Record<ScanId, boolean>>(initialScanTypes);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentScanStep, setCurrentScanStep] = useState(0);

  const displayedUrl = useMemo(() => initialData?.url || url, [initialData, url]);

  useEffect(() => {
    if (initialData) {
      setResults(initialData.results);
      setUrl(initialData.url);
      setError(null);
      setIsLoading(false);
    }
  }, [initialData]);

  const selectedScanLabels = useMemo(() => {
    return SCAN_OPTIONS.filter(opt => scanTypes[opt.id]).map(opt => opt.label);
  }, [scanTypes, SCAN_OPTIONS]);
  
  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading) {
      setCurrentScanStep(0);
      const totalSteps = selectedScanLabels.length;
      
      intervalId = window.setInterval(() => {
        setCurrentScanStep(prevStep => {
          if (prevStep < totalSteps) { 
            return prevStep + 1;
          }
          return totalSteps;
        });
      }, 2000); 
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading, selectedScanLabels.length]);

  const handleScanTypeChange = (id: ScanId) => {
    setScanTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const handleStartNewScan = () => {
    setResults(null);
    setUrl('');
    setError(null);
    setScanTypes(initialScanTypes);
    onNewScan();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim() || selectedScanLabels.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const geminiTranslations = {
        analysisNotGeneratedSummary: t('gemini.analysisNotGeneratedSummary'),
        analysisNotGeneratedRecommendation: t('gemini.analysisNotGeneratedRecommendation'),
      }
      const auditResults = await runSecurityAudit(url, selectedScanLabels, geminiTranslations, language);
      setResults(auditResults);
      onScanComplete(url, auditResults);
    } catch (err: any) {
      const msg = err.message || '';
      const translated = t(msg);
      if (translated === msg && msg !== '') {
         // The translation key wasn't found, so it just returned the raw error (e.g. "Failed to fetch"). Use fallback.
         setError(t('errors.geminiFetchFailed'));
      } else {
         setError(translated || t('errors.geminiFetchFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <ScanInProgress 
        url={url} 
        scanLabels={selectedScanLabels} 
        currentStepIndex={currentScanStep}
        t={t} 
      />
    );
  }
  
  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById('report-content');
      if (!element) return;
      
      // Add a loading class or style if needed
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0f172a', // slate-900
        windowWidth: 1200,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CyberAudit_Report_${displayedUrl.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF", e);
    }
  };

  if (results) {
    const criticalIssues = results.details.filter(d => d.status === 'FAIL').length + (results.rawVulnerabilities?.xss?.vulnerable || results.rawVulnerabilities?.sqli?.vulnerable ? 1 : 0);
    const warnings = results.details.filter(d => d.status === 'WARN').length;
    const passed = results.details.filter(d => d.status === 'PASS').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-white text-center sm:text-left">{t('scanner.resultsFor')} <span className="text-purple-400">{displayedUrl}</span></h3>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center">
                    <button
                        onClick={exportToPDF}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                        <FileTextIcon className="h-5 w-5" />
                        <span>Export PDF</span>
                    </button>
                    <button
                        onClick={handleStartNewScan}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                        <PlayIcon className="h-5 w-5" />
                        <span>{t('scanner.newScanButton')}</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div id="report-content" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-400 uppercase font-semibold tracking-wider mb-2">Security Score</span>
                        <div className={`text-5xl font-bold ${getScoreColor(results.overallScore)}`}>
                            {results.overallScore}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-red-500/30 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-400 uppercase font-semibold tracking-wider mb-2">Critical Issues</span>
                        <div className="text-4xl font-bold text-red-400 flex items-center gap-2">
                            <TriangleAlertIcon className="h-8 w-8" />
                            {criticalIssues}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-yellow-500/30 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-400 uppercase font-semibold tracking-wider mb-2">Warnings</span>
                        <div className="text-4xl font-bold text-yellow-400 flex items-center gap-2">
                            <ShieldIcon className="h-8 w-8" />
                            {warnings}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-green-500/30 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-400 uppercase font-semibold tracking-wider mb-2">Passed Checks</span>
                        <div className="text-4xl font-bold text-green-400 flex items-center gap-2">
                            <CircleCheckIcon className="h-8 w-8" />
                            {passed}
                        </div>
                    </div>
                </div>

                <OverallScore score={results.overallScore} summary={results.summary} t={t} />
            
            {!!results.rawVulnerabilities && Object.keys(results.rawVulnerabilities).length > 0 && !results.rawVulnerabilities.error && (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 md:p-8 mt-6 mb-6">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                        <div className="flex items-center space-x-3">
                            <BugIcon className="h-6 w-6 text-red-500" />
                            <h3 className="text-2xl font-bold text-white">{t('scanner.vulnLabels.title') || "Code Vulnerabilities (XSS / SQLi)"}</h3>
                        </div>
                        {results.rawVulnerabilities.scanned_pages !== undefined && (
                            <div className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                {t('scanner.vulnLabels.scannedPages') || "Pages scanned:"} {results.rawVulnerabilities.scanned_pages}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.rawVulnerabilities.xss && (
                            <div className={`p-5 rounded-xl border ${results.rawVulnerabilities.xss.vulnerable ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${results.rawVulnerabilities.xss.vulnerable ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`}></div>
                                    <span className="text-base font-semibold text-white">{t('scanner.vulnLabels.xssTitle') || "Cross-Site Scripting (XSS)"}</span>
                                </div>
                                <p className={`text-sm ${results.rawVulnerabilities.xss.vulnerable ? 'text-red-300 font-medium' : 'text-slate-400'}`}>
                                    {results.rawVulnerabilities.xss.details}
                                </p>
                            </div>
                        )}
                        {results.rawVulnerabilities.sqli && (
                            <div className={`p-5 rounded-xl border ${results.rawVulnerabilities.sqli.vulnerable ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${results.rawVulnerabilities.sqli.vulnerable ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`}></div>
                                    <span className="text-base font-semibold text-white">{t('scanner.vulnLabels.sqliTitle') || "SQL Injection (SQLi)"}</span>
                                </div>
                                <p className={`text-sm ${results.rawVulnerabilities.sqli.vulnerable ? 'text-red-300 font-medium' : 'text-slate-400'}`}>
                                    {results.rawVulnerabilities.sqli.details}
                                </p>
                            </div>
                        )}
                        {results.rawVulnerabilities.cors && (
                            <div className={`p-5 rounded-xl border ${results.rawVulnerabilities.cors.vulnerable ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${results.rawVulnerabilities.cors.vulnerable ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`}></div>
                                    <span className="text-base font-semibold text-white">{t('scanner.vulnLabels.corsTitle') || "CORS Policy"}</span>
                                </div>
                                <p className={`text-sm ${results.rawVulnerabilities.cors.vulnerable ? 'text-red-300 font-medium' : 'text-slate-400'}`}>
                                    {results.rawVulnerabilities.cors.details}
                                </p>
                            </div>
                        )}
                        {results.rawVulnerabilities.files && (
                            <div className={`p-5 rounded-xl border ${results.rawVulnerabilities.files.vulnerable ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${results.rawVulnerabilities.files.vulnerable ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`}></div>
                                    <span className="text-base font-semibold text-white">{t('scanner.vulnLabels.filesTitle') || "Sensitive Files Leakage"}</span>
                                </div>
                                <p className={`text-sm ${results.rawVulnerabilities.files.vulnerable ? 'text-red-300 font-medium' : 'text-slate-400'}`}>
                                    {results.rawVulnerabilities.files.details}
                                </p>
                            </div>
                        )}
                        {results.rawVulnerabilities.admin && (
                            <div className={`p-5 rounded-xl border ${results.rawVulnerabilities.admin.found?.length > 0 ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${results.rawVulnerabilities.admin.found?.length > 0 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`}></div>
                                    <span className="text-base font-semibold text-white">{t('scanner.vulnLabels.adminTitle') || "Open Admin Panels"}</span>
                                </div>
                                <p className={`text-sm ${results.rawVulnerabilities.admin.found?.length > 0 ? 'text-yellow-300 font-medium' : 'text-slate-400'}`}>
                                    {results.rawVulnerabilities.admin.details}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {(results as any).rawApi && (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 md:p-8 mt-6 mb-6">
                    <div className="flex items-center space-x-3 mb-6 border-b border-slate-700 pb-4">
                        <NetworkIcon className="h-6 w-6 text-purple-400" />
                        <h3 className="text-2xl font-bold text-white">{t('scanner.apiLabels.title') || "API Scanners (REST/GraphQL)"}</h3>
                    </div>
                    <div className={`p-5 rounded-xl border ${(results as any).rawApi.found ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-900/50 border-slate-800/50'}`}>
                         <div className="flex items-center space-x-2 mb-3">
                             <div className={`w-3 h-3 rounded-full ${(results as any).rawApi.found ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-slate-500'}`}></div>
                             <span className="text-base font-semibold text-white">API Endpoints</span>
                         </div>
                         <p className={`text-sm ${(results as any).rawApi.found ? 'text-purple-300 font-medium' : 'text-slate-400'}`}>
                             {(results as any).rawApi.details}
                         </p>
                         {(results as any).rawApi.found && (results as any).rawApi.endpoints.length > 0 && (
                            <div className="mt-4">
                                <span className="text-xs text-slate-400 uppercase tracking-wider">{t('scanner.apiLabels.endpoints') || "Discovered Endpoints:"}</span>
                                <ul className="mt-2 space-y-1">
                                    {(results as any).rawApi.endpoints.slice(0, 5).map((ep: string, idx: number) => (
                                        <li key={idx} className="text-xs text-slate-300 bg-slate-900/50 px-2 py-1 rounded border border-slate-800 truncate">{ep}</li>
                                    ))}
                                    {(results as any).rawApi.endpoints.length > 5 && (
                                        <li className="text-xs text-slate-500 italic mt-1">...and {(results as any).rawApi.endpoints.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                         )}
                         {(results as any).rawApi.found && (results as any).rawApi.vulnerabilities && (results as any).rawApi.vulnerabilities.length > 0 && (
                            <div className="mt-6 border-t border-slate-700/50 pt-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <TriangleAlertIcon className="h-4 w-4 text-orange-400" />
                                    <span className="text-sm font-semibold text-orange-400">{t('scanner.apiLabels.vulnerabilities') || "API Vulnerabilities Found:"}</span>
                                </div>
                                <ul className="space-y-2">
                                    {(results as any).rawApi.vulnerabilities.map((vuln: string, idx: number) => (
                                        <li key={idx} className="text-sm text-slate-300 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-lg flex items-start">
                                            <span className="mr-2 mt-0.5">•</span>
                                            <span>{vuln}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}
                    </div>
                </div>
            )}
            
            {!!results.rawDnsWhois && Object.keys(results.rawDnsWhois).length > 0 && !results.rawDnsWhois.error && (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 md:p-8 mt-6 mb-6">
                    <div className="flex items-center space-x-3 mb-6 border-b border-slate-700 pb-4">
                        <GlobeIcon className="h-6 w-6 text-green-400" />
                        <h3 className="text-2xl font-bold text-white">{t('scanner.dnsLabels.title') || "Domain Information (DNS/WHOIS)"}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {results.rawDnsWhois.ip && (
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 flex flex-col">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('scanner.dnsLabels.ip')}</span>
                                <span className="text-base text-white font-medium">{results.rawDnsWhois.ip}</span>
                            </div>
                        )}
                        {results.rawDnsWhois.registrar && (
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 flex flex-col">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('scanner.dnsLabels.registrar')}</span>
                                <span className="text-base text-white font-medium break-all">{results.rawDnsWhois.registrar}</span>
                            </div>
                        )}
                        {results.rawDnsWhois.country && (
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 flex flex-col">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('scanner.dnsLabels.country')}</span>
                                <span className="text-base text-white font-medium">{results.rawDnsWhois.country}</span>
                            </div>
                        )}
                        {results.rawDnsWhois.nameservers && (
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 flex flex-col">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('scanner.dnsLabels.nameservers')}</span>
                                <div className="text-sm text-white font-medium">
                                    {Array.isArray(results.rawDnsWhois.nameservers) ? (
                                        <ul className="list-disc pl-4 mt-1 space-y-1">
                                            {results.rawDnsWhois.nameservers.map((ns: string, i: number) => <li key={i} className="break-all">{ns}</li>)}
                                        </ul>
                                    ) : (
                                        <span className="break-all">{String(results.rawDnsWhois.nameservers)}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {results.rawTechnologies && Object.keys(results.rawTechnologies).length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 md:p-8 mt-6 mb-6">
                    <div className="flex items-center space-x-3 mb-6 border-b border-slate-700 pb-4">
                        <DatabaseIcon className="h-6 w-6 text-blue-400" />
                        <h3 className="text-2xl font-bold text-white">{t('scanner.technologiesLabel') || "Technologies & CMS (Wappalyzer Analog)"}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Object.entries(results.rawTechnologies).map(([category, techs], idx) => {
                             const translatedCategory = t(`scanner.techCategories.${category}`);
                             const displayCategory = translatedCategory && translatedCategory !== `scanner.techCategories.${category}` ? translatedCategory : category;
                             return (
                             <div key={idx} className="space-y-4">
                                <h4 className="text-[17px] font-semibold text-slate-300">{displayCategory}</h4>
                                <div className="space-y-3">
                                    {techs.map((tech, techIdx) => {
                                        const translatedTech = tech === "None Detected" ? t("scanner.techCategories.None") : tech;
                                        return (
                                        <div key={techIdx} className="flex items-center bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50 group hover:bg-slate-800 transition-colors">
                                            {/* Generic app icon representation */}
                                            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center mr-3 shrink-0">
                                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{translatedTech.substring(0,1).toUpperCase()}</span>
                                            </div>
                                            <span className="text-slate-200 group-hover:text-white transition-colors font-medium text-sm">
                                                {translatedTech}
                                            </span>
                                        </div>
                                    )})}
                                </div>
                             </div>
                        ); })} 
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.details.map((item, index) => (
                    <ResultCard key={index} item={item} t={t} />
                ))}
            </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t('scanner.title')}</h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          {t('scanner.subtitle')}
        </p>
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('scanner.scanUrlLabel')}</label>
            <div className="relative">
              <GlobeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                placeholder={t('scanner.scanUrlPlaceholder')}
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{t('scanner.scanUrlHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-4">{t('scanner.scanTypesLabel')}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SCAN_OPTIONS.map(option => (
                <ScanTypeOption key={option.id} option={option} isChecked={scanTypes[option.id]} onChange={handleScanTypeChange} />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !url.trim() || selectedScanLabels.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <LoaderIcon className="h-5 w-5 animate-spin" />
                <span>{t('scanner.scanningButton')}</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5" />
                <span>{t('scanner.submitButton')}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg p-4 text-center">
            {error}
        </div>
      )}

      {!isLoading && !results && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center space-x-3 mb-4">
                    <ShieldIcon className="h-8 w-8 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">{t('scanner.infoCards.comprehensive.title')}</h3>
                </div>
                <p className="text-slate-300 text-sm">{t('scanner.infoCards.comprehensive.text')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center space-x-3 mb-4">
                    <CircleCheckIcon className="h-8 w-8 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">{t('scanner.infoCards.certification.title')}</h3>
                </div>
                <p className="text-slate-300 text-sm">{t('scanner.infoCards.certification.text')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center space-x-3 mb-4">
                    <InfoIcon className="h-8 w-8 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">{t('scanner.infoCards.recommendations.title')}</h3>
                </div>
                <p className="text-slate-300 text-sm">{t('scanner.infoCards.recommendations.text')}</p>
            </div>
        </div>
      )}

    </div>
  );
};