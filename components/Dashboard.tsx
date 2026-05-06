import React, { useState, useMemo } from 'react';
import {
  GlobeIcon,
  CircleCheckIcon,
  AwardIcon,
  UsersIcon,
  TriangleAlertIcon,
  ShieldIcon,
  FileTextIcon,
  SettingsIcon
} from './icons';
import { ScanHistoryItem } from '../types';
import { useTranslation } from '../App';


const StatCard = ({ icon: Icon, value, label, trend, trendLabel, colorClass }: {
  icon: React.FC<{ className?: string; }>;
  value: string;
  label: string;
  trend?: string;
  trendLabel?: string;
  colorClass: string;
}) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-between">
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-700 mb-4">
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
    <div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {trend ? (
        <div className="flex items-center text-xs text-green-400 mt-2">
          <span>{trend}</span>
          {trendLabel && <span className="ml-1 text-slate-500">{trendLabel}</span>}
        </div>
      ) : <div className="mt-2 h-4"></div> }
    </div>
  </div>
);

interface RecentScanItemProps {
    item: ScanHistoryItem;
    onClick: () => void;
    t: (key: string) => string;
}

const RecentScanItem: React.FC<RecentScanItemProps> = ({ item, onClick, t }) => {
    const score = item.results.overallScore;
    const getScoreClasses = (s: number) => {
        if (s >= 80) return 'bg-green-500/10 text-green-300';
        if (s >= 50) return 'bg-yellow-500/10 text-yellow-300';
        return 'bg-red-500/10 text-red-300';
    };

    const getIcon = (s: number) => {
        if (s >= 80) return <ShieldIcon className="w-4 h-4 text-green-400" />;
        return <TriangleAlertIcon className={`w-4 h-4 ${s >= 50 ? 'text-yellow-400' : 'text-red-400'}`} />;
    };

    return (
        <div
            className="flex items-center space-x-4 p-4 rounded-lg transition-colors hover:bg-slate-700/50 cursor-pointer"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onClick()}
            aria-label={`View scan for ${item.url} from ${item.date}`}
        >
            <GlobeIcon className="w-6 h-6 text-slate-400 flex-shrink-0" />
            <div className="flex-grow">
                <p className="text-sm font-medium text-white">{item.url}</p>
                <p className="text-xs text-slate-500">{item.date}</p>
            </div>
            <div className="flex items-center space-x-2">
                <span className={`text-sm font-semibold px-3 py-1 rounded-md ${getScoreClasses(score)}`}>
                    {score} {t('dashboard.scoreUnit')}
                </span>
                {getIcon(score)}
            </div>
        </div>
    );
};


const QuickActionButton = ({ icon: Icon, label }: { icon: React.FC<{className?: string}>, label: string }) => (
    <button className="flex items-center w-full space-x-3 p-4 rounded-lg text-left transition-colors bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700">
        <Icon className="w-5 h-5 text-purple-400" />
        <span className="text-sm text-white font-medium">{label}</span>
    </button>
);


export const Dashboard: React.FC<{ 
  scanHistory: ScanHistoryItem[]; 
  onViewScan: (item: ScanHistoryItem) => void;
  setCurrentView: (view: 'scanner') => void;
}> = ({ scanHistory, onViewScan, setCurrentView }) => {
  const { t } = useTranslation();
  const [filterText, setFilterText] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');

  const filteredAndSortedHistory = useMemo(() => {
    let processedHistory = [...scanHistory];

    if (filterText.trim() !== '') {
      processedHistory = processedHistory.filter(item =>
        item.url.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    processedHistory.sort((a, b) => {
      switch (sortOrder) {
        case 'score-desc':
          return b.results.overallScore - a.results.overallScore;
        case 'score-asc':
          return a.results.overallScore - b.results.overallScore;
        case 'date-desc':
        default:
          return new Date(b.id).getTime() - new Date(a.id).getTime();
      }
    });

    return processedHistory;
  }, [scanHistory, filterText, sortOrder]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">{t('dashboard.title')}</h2>
        <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={GlobeIcon} value="1 247" label={t('dashboard.totalScans')} trend="+12%" trendLabel={t('dashboard.trendWeek')} colorClass="text-purple-400" />
        <StatCard icon={CircleCheckIcon} value="1 089" label={t('dashboard.successfulChecks')} trend={`87${t('dashboard.trendSuccessRate')}`} colorClass="text-green-400" />
        <StatCard icon={AwardIcon} value="892" label={t('dashboard.certificatesIssued')} trend={`72${t('dashboard.trendFromScans')}`} colorClass="text-yellow-400" />
        <StatCard icon={UsersIcon} value="156" label={t('dashboard.activeUsers')} trend="+8%" trendLabel={t('dashboard.trendMonth')} colorClass="text-purple-400" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-white flex-shrink-0">{t('dashboard.recentScans')}</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder={t('dashboard.filterPlaceholder')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full sm:w-auto bg-slate-700/50 border border-slate-600 rounded-md px-2 py-1 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-auto bg-slate-700/50 border border-slate-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              >
                <option value="date-desc">{t('dashboard.sortNewest')}</option>
                <option value="score-desc">{t('dashboard.sortScoreHigh')}</option>
                <option value="score-asc">{t('dashboard.sortScoreLow')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <p>{t('dashboard.historyEmpty')}</p>
                    <p className="text-sm mt-1">{t('dashboard.historyEmptySubtext')}</p>
                </div>
            ) : filteredAndSortedHistory.length > 0 ? (
                filteredAndSortedHistory.map((item) => (
                    <RecentScanItem key={item.id} item={item} onClick={() => onViewScan(item)} t={t} />
                ))
            ) : (
                <div className="text-center py-8 text-slate-400">
                    <p>{t('dashboard.historyNotFound')}</p>
                    <p className="text-sm mt-1">{t('dashboard.historyNotFoundSubtext')}</p>
                </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="space-y-8">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setCurrentView('scanner')}
                  className="flex items-center w-full space-x-3 p-4 rounded-lg text-left transition-colors bg-purple-600 hover:bg-purple-700">
                    <GlobeIcon className="w-5 h-5 text-white" />
                    <span className="text-sm text-white font-medium">{t('dashboard.newScan')}</span>
                </button>
                <QuickActionButton icon={FileTextIcon} label={t('dashboard.exportReports')} />
                <QuickActionButton icon={UsersIcon} label={t('dashboard.manageUsers')} />
                <QuickActionButton icon={SettingsIcon} label={t('dashboard.systemSettings')} />
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.scoreDistribution')}</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-slate-400">{t('dashboard.scoreRangeHigh')}</span>
                  </div>
                  <span className="font-medium text-white">71%</span>
                </li>
                <li className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-slate-400">{t('dashboard.scoreRangeMid')}</span>
                  </div>
                  <span className="font-medium text-white">21%</span>
                </li>
                <li className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-400">{t('dashboard.scoreRangeLow')}</span>
                  </div>
                  <span className="font-medium text-white">8%</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.systemStatus')}</h3>
              <ul className="space-y-3 text-sm">
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.apiServer')}</span>
                      <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-green-300">{t('dashboard.statusOnline')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.database')}</span>
                      <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-green-300">{t('dashboard.statusOnline')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.scanners')}</span>
                      <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-green-300">{t('dashboard.statusActive')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.taskQueue')}</span>
                      <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          <span className="text-yellow-300">3 {t('dashboard.statusInQueue')}</span>
                      </div>
                  </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};