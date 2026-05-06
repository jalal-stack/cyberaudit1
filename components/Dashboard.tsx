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
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';


const StatCard = ({ icon: Icon, value, label, trend, trendLabel, colorClass }: {
  icon: React.FC<{ className?: string; }>;
  value: string;
  label: string;
  trend?: string;
  trendLabel?: string;
  colorClass: string;
}) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-between transition-all hover:border-slate-600">
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
            className="flex items-center space-x-4 p-4 rounded-lg transition-all hover:bg-slate-700/50 cursor-pointer group"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onClick()}
            aria-label={`View scan for ${item.url} from ${item.date}`}
        >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-slate-500 transition-colors">
                <GlobeIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-grow">
                <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{item.url}</p>
                <p className="text-xs text-slate-500">{item.date}</p>
            </div>
            <div className="flex items-center space-x-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${getScoreClasses(score)}`}>
                    {score} {t('dashboard.scoreUnit')}
                </span>
                {getIcon(score)}
            </div>
        </div>
    );
};


const QuickActionButton = ({ icon: Icon, label, onClick }: { icon: React.FC<{className?: string}>, label: string, onClick?: () => void }) => (
    <button 
      onClick={onClick}
      className="flex items-center w-full space-x-3 p-4 rounded-lg text-left transition-all bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-500"
    >
        <Icon className="w-5 h-5 text-purple-400" />
        <span className="text-sm text-white font-medium">{label}</span>
    </button>
);


export const Dashboard: React.FC<{ 
  scanHistory: ScanHistoryItem[]; 
  onViewScan: (item: ScanHistoryItem) => void;
  setCurrentView: (view: 'scanner') => void;
  onActionNotImplemented: (name: string) => void;
}> = ({ scanHistory, onViewScan, setCurrentView, onActionNotImplemented }) => {
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

  const chartData = useMemo(() => {
    return [...scanHistory]
      .sort((a, b) => new Date(a.id).getTime() - new Date(b.id).getTime())
      .slice(-10)
      .map(item => ({
        name: item.url.length > 10 ? item.url.substring(0, 7) + '...' : item.url,
        score: item.results.overallScore,
        fullUrl: item.url
      }));
  }, [scanHistory]);

  const distributionData = useMemo(() => {
    const high = scanHistory.filter(s => s.results.overallScore >= 80).length;
    const mid = scanHistory.filter(s => s.results.overallScore >= 50 && s.results.overallScore < 80).length;
    const low = scanHistory.filter(s => s.results.overallScore < 50).length;
    const total = Math.max(scanHistory.length, 1);

    return [
      { name: t('dashboard.scoreRangeHigh'), value: high, color: '#22c55e', percentage: Math.round((high / total) * 100) },
      { name: t('dashboard.scoreRangeMid'), value: mid, color: '#eab308', percentage: Math.round((mid / total) * 100) },
      { name: t('dashboard.scoreRangeLow'), value: low, color: '#ef4444', percentage: Math.round((low / total) * 100) },
    ];
  }, [scanHistory, t]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <button 
          onClick={() => setCurrentView('scanner')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/20 active:scale-95"
        >
          {t('scanner.submitButton')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={GlobeIcon} value="1 247" label={t('dashboard.totalScans')} trend="+12%" trendLabel={t('dashboard.trendWeek')} colorClass="text-purple-400" />
        <StatCard icon={CircleCheckIcon} value="1 089" label={t('dashboard.successfulChecks')} trend={`87${t('dashboard.trendSuccessRate')}`} colorClass="text-green-400" />
        <StatCard icon={AwardIcon} value="892" label={t('dashboard.certificatesIssued')} trend={`72${t('dashboard.trendFromScans')}`} colorClass="text-yellow-400" />
        <StatCard icon={UsersIcon} value="156" label={t('dashboard.activeUsers')} trend="+8%" trendLabel={t('dashboard.trendMonth')} colorClass="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">{t('dashboard.securityScoreHistory')}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value) => [`${value} ${t('dashboard.points')}`, t('dashboard.score')]}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">{t('dashboard.scoreDistribution')}</h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value, name, props) => [`${value} ${t('dashboard.scans')} (${props.payload.percentage}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {distributionData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-400">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg font-semibold text-white flex-shrink-0">{t('dashboard.recentScans')}</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder={t('dashboard.filterPlaceholder')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full sm:w-auto bg-slate-700/50 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-auto bg-slate-700/50 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                <option value="date-desc">{t('dashboard.sortNewest')}</option>
                <option value="score-desc">{t('dashboard.sortScoreHigh')}</option>
                <option value="score-asc">{t('dashboard.sortScoreLow')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            {scanHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <GlobeIcon className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="font-medium">{t('dashboard.historyEmpty')}</p>
                    <p className="text-sm mt-1">{t('dashboard.historyEmptySubtext')}</p>
                </div>
            ) : filteredAndSortedHistory.length > 0 ? (
                filteredAndSortedHistory.map((item) => (
                    <RecentScanItem key={item.id} item={item} onClick={() => onViewScan(item)} t={t} />
                ))
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <TriangleAlertIcon className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="font-medium">{t('dashboard.historyNotFound')}</p>
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
                  className="group flex items-center w-full space-x-3 p-4 rounded-lg text-left transition-all bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/20">
                    <GlobeIcon className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                    <span className="text-sm text-white font-medium">{t('dashboard.newScan')}</span>
                </button>
                <QuickActionButton 
                  icon={FileTextIcon} 
                  label={t('dashboard.exportReports')} 
                  onClick={() => onActionNotImplemented(t('dashboard.exportReports'))} 
                />
                <QuickActionButton 
                  icon={UsersIcon} 
                  label={t('dashboard.manageUsers')} 
                  onClick={() => onActionNotImplemented(t('dashboard.manageUsers'))} 
                />
                <QuickActionButton 
                  icon={SettingsIcon} 
                  label={t('dashboard.systemSettings')} 
                  onClick={() => onActionNotImplemented(t('dashboard.systemSettings'))} 
                />
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.systemStatus')}</h3>
              <ul className="space-y-4 text-sm">
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.apiServer')}</span>
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-green-300 font-medium">{t('dashboard.statusOnline')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.database')}</span>
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-green-300 font-medium">{t('dashboard.statusOnline')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.scanners')}</span>
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-green-300 font-medium">{t('dashboard.statusActive')}</span>
                      </div>
                  </li>
                  <li className="flex justify-between items-center">
                      <span className="text-slate-400">{t('dashboard.taskQueue')}</span>
                      <div className="flex items-center space-x-2 text-yellow-300">
                          <TriangleAlertIcon className="w-4 h-4" />
                          <span className="font-medium">3 {t('dashboard.statusInQueue')}</span>
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

