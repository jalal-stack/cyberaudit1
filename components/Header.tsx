import React, { useState } from 'react';
import { ShieldIcon, SettingsIcon, GlobeIcon, MenuIcon, XIcon } from './icons';
import { View, useTranslation } from '../App';

interface HeaderProps {
  isAuthenticated: boolean;
  currentView: View;
  setCurrentView: (view: View) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, currentView, setCurrentView, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, language, setLanguage } = useTranslation();

  const navLinkClasses = "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const inactiveClasses = "text-slate-300 hover:text-white hover:bg-slate-700/50";
  const activeClasses = "bg-purple-500/10 text-purple-300";

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setIsMenuOpen(false); // Close menu on navigation
  };
  
  const handleLogoutClick = () => {
    onLogout();
    setIsMenuOpen(false);
  }

  const renderNavLinks = (isMobile: boolean) => {
    const buttonClass = isMobile ? `w-full text-left ${navLinkClasses}` : navLinkClasses;
    if (isAuthenticated) {
      return (
        <>
          <button
            className={`${buttonClass} ${currentView === 'dashboard' ? activeClasses : inactiveClasses}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>{t('header.dashboard')}</span>
          </button>
          <button
            className={`${buttonClass} ${currentView === 'scanner' ? activeClasses : inactiveClasses}`}
            onClick={() => handleNavClick('scanner')}
          >
            <GlobeIcon className="h-4 w-4" />
            <span>{t('header.scanner')}</span>
          </button>
          <button onClick={handleLogoutClick} className={`${buttonClass} ${inactiveClasses}`}>
            {t('header.logout')}
          </button>
        </>
      );
    }
    return (
      <>
        <button
          className={`${buttonClass} ${currentView === 'login' ? activeClasses : inactiveClasses}`}
          onClick={() => handleNavClick('login')}
        >
          <span>{t('header.login')}</span>
        </button>
        <button
          className={`${buttonClass} ${currentView === 'register' ? activeClasses : inactiveClasses}`}
          onClick={() => handleNavClick('register')}
        >
          <span>{t('header.register')}</span>
        </button>
      </>
    );
  };

  const LanguageSwitcher = ({isMobile}: {isMobile: boolean}) => (
     <div className={`flex items-center space-x-2 ${isMobile ? 'px-3 py-2' : ''}`}>
      <button 
        onClick={() => setLanguage('ru')}
        className={`px-2 py-1 rounded-md text-sm transition-colors ${language === 'ru' ? 'bg-purple-500/20 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700/50'}`}
      >
        RU
      </button>
      <div className="w-px h-4 bg-slate-600"></div>
      <button 
        onClick={() => setLanguage('uz')}
        className={`px-2 py-1 rounded-md text-sm transition-colors ${language === 'uz' ? 'bg-purple-500/20 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700/50'}`}
      >
        UZ
      </button>
    </div>
  );

  return (
    <header className="bg-slate-900/70 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <ShieldIcon className="h-8 w-8 text-purple-400" />
            <h1 className="text-xl font-bold text-white">{t('header.title')}</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-1">
              {renderNavLinks(false)}
            </nav>
            <LanguageSwitcher isMobile={false} />
          </div>
          
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">{t('header.openMenu')}</span>
              {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {renderNavLinks(true)}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <LanguageSwitcher isMobile={true} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};