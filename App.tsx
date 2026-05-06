import React, { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { SecurityScanner } from './components/SecurityScanner';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ScanHistoryItem, ScanResults } from './types';

// --- I18N (Internationalization) Setup ---

const translations = {
  ru: {
    common: {
      comingSoon: "Скоро появится!",
    },
    header: {
      title: "CyberAudit",
      dashboard: "Панель управления",
      scanner: "Сканер безопасности",
      logout: "Выйти",
      login: "Войти",
      register: "Регистрация",
      openMenu: "Открыть главное меню",
    },
    login: {
      title: "Вход в CyberAudit",
      welcome: "Добро пожаловать!",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Пароль",
      passwordPlaceholder: "••••••••",
      loginButton: "Войти",
      noAccount: "Нет аккаунта?",
      switchToRegister: "Зарегистрироваться",
    },
    register: {
      title: "Создать аккаунт",
      subtitle: "Начните свой путь к безопасности.",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Пароль",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "Подтвердите пароль",
      registerButton: "Зарегистрироваться",
      hasAccount: "Уже есть аккаунт?",
      switchToLogin: "Войти",
    },
    dashboard: {
      title: "Панель управления",
      subtitle: "Обзор активности платформы кибербезопасности",
      totalScans: "Всего сканирований",
      successfulChecks: "Успешных проверок",
      certificatesIssued: "Выдано сертификатов",
      activeUsers: "Активных пользователей",
      trendWeek: "за неделю",
      trendSuccessRate: "% успешности",
      trendFromScans: "% от сканирований",
      trendMonth: "за месяц",
      recentScans: "Последние сканирования",
      filterPlaceholder: "Фильтр по URL...",
      sortNewest: "Сначала новые",
      sortScoreHigh: "Высокий балл",
      sortScoreLow: "Низкий балл",
      historyEmpty: "История сканирований пуста.",
      historyEmptySubtext: "Запустите свое первое сканирование, чтобы увидеть результаты здесь.",
      historyNotFound: "Сканирования не найдены.",
      historyNotFoundSubtext: "Попробуйте изменить фильтр или сбросить его.",
      securityScoreHistory: "История оценок безопасности",
      points: "Баллов",
      score: "Оценка",
      scans: "Сканирований",
      scoreUnit: "Баллов",
      quickActions: "Быстрые действия",
      newScan: "Новое сканирование",
      exportReports: "Экспорт отчетов",
      manageUsers: "Управление пользователями",
      systemSettings: "Настройки системы",
      scoreDistribution: "Распределение оценок",
      scoreRangeHigh: "80-100 баллов",
      scoreRangeMid: "60-79 баллов",
      scoreRangeLow: "0-59 баллов",
      systemStatus: "Статус системы",
      apiServer: "API сервер",
      database: "База данных",
      scanners: "Сканеры",
      taskQueue: "Очередь задач",
      statusOnline: "Онлайн",
      statusActive: "Активны",
      statusInQueue: "в очереди",
    },
    scanner: {
      title: "Сканер безопасности веб-сайтов",
      subtitle: "Комплексная проверка безопасности вашего веб-сайта включая SSL, порты, заголовки безопасности, CMS уязвимости и защиту от DDoS атак.",
      scanUrlLabel: "Название сайта для сканирования",
      scanUrlPlaceholder: "example.com",
      scanUrlHint: "Введите только название сайта без http:// или https://",
      scanTypesLabel: "Типы сканирования",
      scanOptions: {
        ssl: "Анализ SSL/HTTPS",
        ports: "Сканирование портов",
        headers: "HTTP заголовки безопасности",
        cms: "CMS и уязвимости",
        leaks: "Проверка утечек данных",
        ddos: "DDoS защита",
      },
      submitButton: "Начать сканирование",
      scanningButton: "Сканирование...",
      resultsFor: "Результаты для",
      newScanButton: "Новое сканирование",
      overallScore: "Общая оценка безопасности",
      recommendation: "Рекомендация:",
      scanningInProgressTitle: "Идет сканирование",
      scanningInProgressSubtitle: "Пожалуйста, подождите, мы анализируем ваш сайт...",
      finalizingReport: "Завершение и подготовка отчета...",
      infoCards: {
        comprehensive: {
          title: "Комплексная проверка",
          text: "Многоуровневая проверка безопасности включающая все основные аспекты защиты веб-сайта."
        },
        certification: {
          title: "Сертификация",
          text: "При оценке 80+ баллов вы получите сертификат безопасности. При меньшей оценке - детальный отчет с рекомендациями."
        },
        recommendations: {
          title: "Рекомендации",
          text: "Получите персонализированные рекомендации по улучшению безопасности и возможность повторной проверки."
        }
      }
    },
    status: {
      pass: "ПРОЙДЕНО",
      fail: "ПРОВАЛЕНО",
      warn: "ПРЕДУПРЕЖДЕНИЕ",
    },
    errors: {
      geminiFetchFailed: "Не удалось получить отчет о безопасности от ИИ. Пожалуйста, попробуйте еще раз.",
    },
    gemini: {
      analysisNotGeneratedSummary: "Анализ для этого типа сканирования не был сгенерирован.",
      analysisNotGeneratedRecommendation: "Попробуйте запустить сканирование еще раз с более конкретным запросом."
    },
    exampleReport: {
      overallScore: 67,
      summary: 'Веб-сайт kun.uz демонстрирует умеренный уровень безопасности с сильной защитой от DDoS-атак, однако имеет существенные недостатки в настройке HTTP-заголовков безопасности и требует улучшений в конфигурации SSL/HTTPS, управлении портами, обновлении CMS и потенциальной защите данных.',
      details: [
        { title: 'Анализ SSL/HTTPS', status: 'WARN', summary: 'Веб-сайт использует действительный SSL-сертификат, однако конфигурация поддерживает устаревшие версии TLS (TLS 1.0/1.1) и может быть улучшена за счет использования более сильных наборов шифров для повышения надежности шифрования и прямой секретности.', recommendation: 'Отключите поддержку устаревших версий TLS (TLS 1.0 и 1.1). Установите приоритет и настройте более сильные, современные наборы шифров (например, AES-256-GCM, CHACHA20-POLY1305) и обеспечьте постоянное достижение совершенной прямой секретности.' },
        { title: 'Сканирование портов', status: 'WARN', summary: 'Стандартные веб-порты (80 и 443) открыты корректно, однако несколько нестандартных портов, потенциально используемых для управления или внутренних служб, оказались доступны извне, что увеличивает поверхность атаки.', recommendation: 'Проверьте все открытые порты и ограничьте доступ к несущественным службам. Внедрите строгие правила брандмауэра для разрешения доступа только необходимым IP-адресам к административным или внутренним портам.' },
        { title: 'HTTP заголовки безопасности', status: 'FAIL', summary: 'Несколько критически важных HTTP-заголовков безопасности, включая Content Security Policy (CSP), HTTP Strict Transport Security (HSTS) с правильным max-age и X-Frame-Options, отсутствуют или настроены неоптимально, что делает сайт уязвимым для распространенных веб-атак.', recommendation: 'Внедрите или улучшите все критически важные HTTP-заголовки безопасности: примените HSTS с достаточным max-age, внедрите надежную Content Security Policy, установите X-Frame-Options в DENY или SAMEORIGIN и убедитесь, что X-Content-Type-Options установлен в nosniff.' },
        { title: 'CMS и уязвимости', status: 'WARN', summary: 'Используемая система управления контентом (CMS) или некоторые ее компоненты и плагины кажутся немного устаревшими, что может подвергнуть веб-сайт известным уязвимостям.', recommendation: 'Создайте строгий график установки исправлений для ядра CMS, тем и всех плагинов. Регулярно сканируйте на наличие известных уязвимостей и своевременно применяйте обновления. Удалите все неиспользуемые или ненужные плагины и темы.' },
        { title: 'Проверка утечек данных', status: 'WARN', summary: 'Прямого взлома основной базы данных пользователей kun.uz подтверждено не было, однако несколько адресов электронной почты, связанных с доменом (например, сотрудников, администраторов), были обнаружены в сторонних утечках данных.', recommendation: 'Поощряйте всех пользователей, особенно сотрудников, использовать надежные, уникальные пароли и включать многофакторную аутентификацию (MFA). Внедрите систему для отслеживания появления учетных данных, связанных с доменом, в будущих утечках.' },
        { title: 'DDoS защита', status: 'PASS', summary: 'Веб-сайт, по-видимому, работает через авторитетную сеть доставки контента (CDN) с надежными возможностями смягчения DDoS-атак, эффективно защищая от распространенных объемных и атак на уровне приложений.', recommendation: '' },
      ]
    }
  },
  uz: {
    common: {
      comingSoon: "Tez orada!",
    },
    header: {
      title: "CyberAudit",
      dashboard: "Boshqaruv paneli",
      scanner: "Xavfsizlik skaneri",
      logout: "Chiqish",
      login: "Kirish",
      register: "Ro'yxatdan o'tish",
      openMenu: "Asosiy menyuni ochish",
    },
    login: {
      title: "CyberAudit'ga kirish",
      welcome: "Xush kelibsiz!",
      emailLabel: "Email",
      emailPlaceholder: "siz@misol.com",
      passwordLabel: "Parol",
      passwordPlaceholder: "••••••••",
      loginButton: "Kirish",
      noAccount: "Hisobingiz yo'qmi?",
      switchToRegister: "Ro'yxatdan o'tish",
    },
    register: {
      title: "Hisob yaratish",
      subtitle: "Xavfsizlik sari yo'lingizni boshlang.",
      emailLabel: "Email",
      emailPlaceholder: "siz@misol.com",
      passwordLabel: "Parol",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "Parolni tasdiqlang",
      registerButton: "Ro'yxatdan o'tish",
      hasAccount: "Hisobingiz bormi?",
      switchToLogin: "Kirish",
    },
    dashboard: {
      title: "Boshqaruv paneli",
      subtitle: "Kiberxavfsizlik platformasi faoliyati sharhi",
      totalScans: "Jami skanerlashlar",
      successfulChecks: "Muvaffaqiyatli tekshiruvlar",
      certificatesIssued: "Berilgan sertifikatlar",
      activeUsers: "Faol foydalanuvchilar",
      trendWeek: "hafta davomida",
      trendSuccessRate: "% muvaffaqiyatli",
      trendFromScans: "% skanerlashlardan",
      trendMonth: "oy davomida",
      recentScans: "So'nggi skanerlashlar",
      filterPlaceholder: "URL bo'yicha filtr...",
      sortNewest: "Avval yangilari",
      sortScoreHigh: "Yuqori ball",
      sortScoreLow: "Past ball",
      historyEmpty: "Skanerlash tarixi bo'sh.",
      historyEmptySubtext: "Natijalarni bu yerda ko'rish uchun birinchi skanerlashni boshlang.",
      historyNotFound: "Skanerlashlar topilmadi.",
      historyNotFoundSubtext: "Filtrni o'zgartirib ko'ring yoki uni olib tashlang.",
      securityScoreHistory: "Xavfsizlik ballari tarixi",
      points: "Ball",
      score: "Ball",
      scans: "Skanerlashlar",
      scoreUnit: "Ball",
      quickActions: "Tezkor amallar",
      newScan: "Yangi skanerlash",
      exportReports: "Hisobotlarni eksport qilish",
      manageUsers: "Foydalanuvchilarni boshqarish",
      systemSettings: "Tizim sozlamalari",
      scoreDistribution: "Baholar taqsimoti",
      scoreRangeHigh: "80-100 ball",
      scoreRangeMid: "60-79 ball",
      scoreRangeLow: "0-59 ball",
      systemStatus: "Tizim holati",
      apiServer: "API server",
      database: "Ma'lumotlar bazasi",
      scanners: "Skanerlar",
      taskQueue: "Vazifalar navbati",
      statusOnline: "Onlayn",
      statusActive: "Faol",
      statusInQueue: "navbatda",
    },
    scanner: {
      title: "Veb-sayt xavfsizlik skaneri",
      subtitle: "Veb-saytingiz xavfsizligini, jumladan SSL, portlar, xavfsizlik sarlavhalari, CMS zaifliklari va DDoS hujumlaridan himoyani kompleks tekshirish.",
      scanUrlLabel: "Skanerlash uchun sayt nomi",
      scanUrlPlaceholder: "misol.com",
      scanUrlHint: "Faqat sayt nomini http:// yoki https://siz kiriting",
      scanTypesLabel: "Skanerlash turlari",
      scanOptions: {
        ssl: "SSL/HTTPS tahlili",
        ports: "Portlarni skanerlash",
        headers: "HTTP xavfsizlik sarlavhalari",
        cms: "CMS va zaifliklar",
        leaks: "Ma'lumotlar sizib chiqishini tekshirish",
        ddos: "DDoS himoyasi",
      },
      submitButton: "Skanerlashni boshlash",
      scanningButton: "Skanerlanmoqda...",
      resultsFor: "uchun natijalar",
      newScanButton: "Yangi skanerlash",
      overallScore: "Umumiy xavfsizlik bahosi",
      recommendation: "Tavsiya:",
      scanningInProgressTitle: "Skanerlash davom etmoqda",
      scanningInProgressSubtitle: "Iltimos, kuting, biz sizning saytingizni tahlil qilmoqdamiz...",
      finalizingReport: "Hisobotni yakunlash va tayyorlash...",
      infoCards: {
        comprehensive: {
          title: "Kompleks tekshiruv",
          text: "Veb-sayt himoyasining barcha asosiy jihatlarini o'z ichiga olgan ko'p darajali xavfsizlik tekshiruvi."
        },
        certification: {
          title: "Sertifikatlash",
          text: "80+ ball olganingizda xavfsizlik sertifikatiga ega bo'lasiz. Kamroq ball olsangiz - tavsiyalar bilan batafsil hisobot."
        },
        recommendations: {
          title: "Tavsiyalar",
          text: "Xavfsizlikni yaxshilash bo'yicha shaxsiy tavsiyalar va qayta tekshirish imkoniyatini oling."
        }
      }
    },
    status: {
      pass: "O'TDI",
      fail: "MUVAFAQQIYATSIZ",
      warn: "OGOHLANTIRISH",
    },
    errors: {
      geminiFetchFailed: "Sun'iy intellektdan xavfsizlik hisobotini olishning iloji bo'lmadi. Iltimos, qaytadan urunib ko'ring.",
    },
    gemini: {
      analysisNotGeneratedSummary: "Ushbu turdagi skanerlash uchun tahlil yaratilmadi.",
      analysisNotGeneratedRecommendation: "Aniqroq so'rov bilan skanerlashni qayta boshlab ko'ring."
    },
    exampleReport: {
      overallScore: 67,
      summary: "kun.uz veb-sayti kuchli DDoS-himoyasi bilan o'rtacha xavfsizlik darajasini namoyish etadi, biroq HTTP xavfsizlik sarlavhalarini sozlashda jiddiy kamchiliklarga ega va SSL/HTTPS konfiguratsiyasi, portlarni boshqarish, CMS'ni yangilash va ma'lumotlarni himoya qilish sohalarida yaxshilanishni talab qiladi.",
      details: [
        { title: 'SSL/HTTPS tahlili', status: 'WARN', summary: "Veb-sayt haqiqiy SSL-sertifikatidan foydalanadi, ammo konfiguratsiya eskirgan TLS versiyalarini (TLS 1.0/1.1) qo'llab-quvvatlaydi va shifrlash ishonchliligi hamda to'g'ridan-to'g'ri maxfiylikni oshirish uchun kuchliroq shifrlar to'plamidan foydalangan holda yaxshilanishi mumkin.", recommendation: "Eskirgan TLS (TLS 1.0 va 1.1) versiyalarini qo'llab-quvvatlashni o'chirib qo'ying. Kuchliroq, zamonaviy shifrlar to'plamlariga (masalan, AES-256-GCM, CHACHA20-POLY1305) ustunlik bering va mukammal to'g'ridan-to'g'ri maxfiylik doimiy ravishda ta'minlanishiga ishonch hosil qiling." },
        { title: 'Portlarni skanerlash', status: 'WARN', summary: "Standart veb-portlar (80 va 443) to'g'ri ochilgan, ammo boshqaruv yoki ichki xizmatlar uchun ishlatilishi mumkin bo'lgan bir nechta nostandart portlar tashqi tomondan kirish uchun ochiq bo'lib, hujum yuzasini oshiradi.", recommendation: "Barcha ochiq portlarni ko'rib chiqing va muhim bo'lmagan xizmatlarga kirishni cheklang. Ma'muriy yoki ichki portlar uchun faqat kerakli IP-manzillarga ruxsat berish uchun qattiq xavfsizlik devori qoidalarini joriy qiling." },
        { title: 'HTTP xavfsizlik sarlavhalari', status: 'FAIL', summary: "Content Security Policy (CSP), to'g'ri max-age bilan HTTP Strict Transport Security (HSTS) va X-Frame-Options kabi bir nechta muhim HTTP xavfsizlik sarlavhalari yo'q yoki optimal sozlanmagan, bu esa saytni keng tarqalgan veb-hujumlarga nisbatan zaif qoldiradi.", recommendation: "Barcha muhim HTTP xavfsizlik sarlavhalarini joriy qiling yoki yaxshilang: yetarli max-age bilan HSTS'ni qo'llang, ishonchli Content Security Policy'ni joriy qiling, X-Frame-Options'ni DENY yoki SAMEORIGIN'ga o'rnating va X-Content-Type-Options'ning nosniff'ga o'rnatilganligiga ishonch hosil qiling." },
        { title: 'CMS va zaifliklar', status: 'WARN', summary: "Foydalanilayotgan kontentni boshqarish tizimi (CMS) yoki uning ba'zi komponentlari va plaginlari biroz eskirgan ko'rinadi, bu esa veb-saytni ma'lum zaifliklarga duchor qilishi mumkin.", recommendation: "CMS yadrosi, temalar va barcha plaginlar uchun qat'iy tuzatishlar jadvalini yarating. Ma'lum zaifliklarni muntazam ravishda skanerlang va yangilanishlarni zudlik bilan qo'llang. Ishlatilmaydigan yoki keraksiz plaginlar va temalarni olib tashlang." },
        { title: "Ma'lumotlar sizib chiqishini tekshirish", status: 'WARN', summary: "kun.uz'ning asosiy foydalanuvchilar ma'lumotlar bazasining to'g'ridan-to'g'ri buzilganligi tasdiqlanmadi, biroq domen bilan bog'liq bir nechta elektron pochta manzillari (masalan, xodimlar, ma'murlar) uchinchi tomon ma'lumotlarining sizib chiqishida topilgan.", recommendation: "Barcha foydalanuvchilarni, ayniqsa xodimlarni, kuchli, noyob parollardan foydalanishga va ko'p faktorli autentifikatsiyani (MFA) yoqishga undash. Kelajakdagi sizib chiqishlarda domen bilan bog'liq hisob ma'lumotlarining paydo bo'lishini kuzatish uchun tizimni joriy qiling." },
        { title: 'DDoS himoyasi', status: 'PASS', summary: "Veb-sayt, ehtimol, DDoS hujumlarini yumshatishning mustahkam imkoniyatlariga ega bo'lgan nufuzli kontent yetkazib berish tarmog'i (CDN) orqali ishlaydi va keng tarqalgan hajmli va dastur darajasidagi hujumlardan samarali himoya qiladi.", recommendation: "" }
      ]
    }
  }
};


export type Language = 'ru' | 'uz';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ru');

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  const { language } = context;

  const t = (key: string): any => {
    const keys = key.split('.');
    let result = translations[language] as any;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to Russian if key not found
        let fallbackResult = translations.ru as any;
        for (const fk of keys) {
           fallbackResult = fallbackResult?.[fk];
        }
        if (fallbackResult === undefined) return key;
        return fallbackResult;
      }
    }
    return result || key;
  };

  return { t, language, setLanguage: context.setLanguage };
};


// --- Main App Component ---

export type View = 'dashboard' | 'scanner' | 'login' | 'register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('login');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [viewingResults, setViewingResults] = useState<ScanHistoryItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const { t, language } = useTranslation();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('isAuthenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        setCurrentView('dashboard');
      }

      const storedHistory = localStorage.getItem('scanHistory');
      if (storedHistory) {
        setScanHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
      setScanHistory([]);
    }
  }, []);

  const displayedScanHistory = useMemo(() => {
    if (scanHistory.length > 0) {
      return scanHistory;
    }

    const exampleReportData = t('exampleReport') as ScanResults;
    if (!exampleReportData || !exampleReportData.details) {
      return []; // Return empty if translations are not ready
    }
    
    const exampleHistoryItem: ScanHistoryItem = {
      id: 'example-kun-uz',
      url: 'kun.uz',
      date: new Date().toLocaleString(language === 'uz' ? 'uz' : 'ru', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      results: exampleReportData,
    };
    return [exampleHistoryItem];
  }, [scanHistory, t, language]);

  const addScanToHistory = (url: string, results: ScanResults) => {
    const newHistoryItem: ScanHistoryItem = {
      id: new Date().toISOString(),
      url,
      date: new Date().toLocaleString(language === 'uz' ? 'uz' : 'ru', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      results,
    };

    setScanHistory(prevHistory => {
      const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 10); // Keep last 10
      localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };
  
  const handleViewScan = (historyItem: ScanHistoryItem) => {
    setViewingResults(historyItem);
    setCurrentView('scanner');
  };

  const handleSetView = (view: View) => {
    if (view === 'scanner') {
        setViewingResults(null);
    }
    setCurrentView(view);
  }

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setCurrentView('login');
  };

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      if (currentView === 'register') {
        return <Register onRegister={handleLogin} onSwitchToLogin={() => setCurrentView('login')} />;
      }
      return <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentView('register')} />;
    }

    if (currentView === 'dashboard') {
      return (
        <Dashboard 
          scanHistory={displayedScanHistory} 
          onViewScan={handleViewScan} 
          setCurrentView={handleSetView}
          onActionNotImplemented={(name) => showToast(`${t('header.title')}: ${name} ${t('common.comingSoon')}`, 'info')}
        />
      );
    }
    if (currentView === 'scanner') {
      return (
        <SecurityScanner
          onScanComplete={addScanToHistory}
          initialData={viewingResults}
          onNewScan={() => {
            setViewingResults(null);
            if (currentView !== 'scanner') {
              setCurrentView('scanner');
            }
          }}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Header 
        isAuthenticated={isAuthenticated}
        currentView={currentView} 
        setCurrentView={handleSetView}
        onLogout={handleLogout}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce-in">
          <div className={`px-6 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center space-x-3 ${
            toast.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-purple-500/20 border-purple-500/50 text-purple-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-400' : 'bg-purple-400'}`}></div>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;