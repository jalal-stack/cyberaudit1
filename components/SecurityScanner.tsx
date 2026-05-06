import React, { useState, useMemo, useEffect } from 'react';
import { ScanResults, ScanId, ScanOption, ScanStatus, ScanResultItem, ScanHistoryItem } from '../types';
import { runSecurityAudit } from '../services/geminiService';
import { GlobeIcon, PlayIcon, ShieldIcon, ServerIcon, LockIcon, DatabaseIcon, TriangleAlertIcon, ZapIcon, CircleCheckIcon, CircleIcon, InfoIcon, LoaderIcon } from './icons';
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
        <div className={`rounded-xl p-6 border ${config.borderColor} ${config.bgColor}`}>
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-700/50">
                    {config.icon}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor}`}>
                            {t(`status.${item.status.toLowerCase()}`)}
                        </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-2">{item.summary}</p>
                    {item.recommendation && (
                        <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
                            <p className="text-sm font-medium text-purple-300">{t('scanner.recommendation')}</p>
                            <p className="text-slate-300 text-sm mt-1">{item.recommendation}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const OverallScore: React.FC<{ score: number, summary: string, t: (key: string) => string }> = ({ score, summary, t }) => {
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };
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
                    <p className="text-slate-300 mt-2 text-center sm:text-left">{summary}</p>
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
      setError(t(err.message) || t('errors.geminiFetchFailed'));
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
  
  if (results) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-2xl font-bold text-white text-center sm:text-left">{t('scanner.resultsFor')} <span className="text-purple-400">{displayedUrl}</span></h3>
                <button
                    onClick={handleStartNewScan}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 w-full sm:w-auto justify-center"
                >
                    <PlayIcon className="h-5 w-5" />
                    <span>{t('scanner.newScanButton')}</span>
                </button>
            </div>
            <OverallScore score={results.overallScore} summary={results.summary} t={t} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.details.map((item, index) => (
                    <ResultCard key={index} item={item} t={t} />
                ))}
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