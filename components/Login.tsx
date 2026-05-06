import React from 'react';
import { AtSignIcon, LockIcon } from './icons';
import { useTranslation } from '../App';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin();
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">{t('login.title')}</h2>
            <p className="text-slate-400 mt-2">{t('login.welcome')}</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('login.emailLabel')}</label>
              <div className="relative">
                <AtSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  placeholder={t('login.emailPlaceholder')}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('login.passwordLabel')}</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : t('login.loginButton')}
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-sm text-slate-400">
              {t('login.noAccount')}{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                {t('login.switchToRegister')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};