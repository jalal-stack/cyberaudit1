import express from 'express';
import cors from 'cors';
import tls from 'tls';
import net from 'net';
import whois from 'whois-json';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.env ? 'file://' + __filename : import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // DDoS Scan
  function scanDdos(headers: Record<string, string>, server: string, cookies: Record<string, string>) {
    const detected: string[] = [];
    const serverLower = (server || '').toLowerCase();
    
    if (serverLower.includes('cloudflare') || cookies['__cf_duid'] || headers['cf-ray']) detected.push("Cloudflare");
    if (serverLower.includes('akamai') || headers['xgm-cdn']) detected.push("Akamai");
    if (serverLower.includes('incapsula') || cookies['visid_incap']) detected.push("Imperva");
    if (serverLower.includes('ddos-guard')) detected.push("DDoS-Guard");
    if (serverLower.includes('sucuri') || headers['x-sucuri-id']) detected.push("Sucuri");
    if (serverLower.includes('cloudfront') || headers['x-amz-cf-id']) detected.push("AWS CloudFront (Basic DDoS Protection)");

    return {
      protected: detected.length > 0,
      providers: detected
    };
  }

  // SSL Scan
  function scanSsl(domain: string): Promise<any> {
    return new Promise((resolve) => {
      const socket = tls.connect(443, domain, { servername: domain }, () => {
        const cert = socket.getPeerCertificate();
        resolve({
          valid: socket.authorized || false,
          issuer: cert.issuer?.O || 'Unknown',
          expiry: cert.valid_to,
          tls_version: socket.getProtocol()
        });
        socket.destroy();
      });
      socket.on('error', (err) => resolve({ valid: false, error: err.message }));
      socket.setTimeout(5000, () => { socket.destroy(); resolve({ valid: false, error: "Timeout" }); });
    });
  }

  // Ports Scan
  async function scanPorts(domain: string) {
    const ports = [21, 22, 25, 80, 443, 3306, 8080];
    const open_ports: number[] = [];
    const closed_ports: number[] = [];
    
    await Promise.all(ports.map(port => {
      return new Promise<void>(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => { open_ports.push(port); socket.destroy(); resolve(); });
        socket.on('timeout', () => { closed_ports.push(port); socket.destroy(); resolve(); });
        socket.on('error', () => { closed_ports.push(port); socket.destroy(); resolve(); });
        socket.connect(port, domain);
      });
    }));
    return { open: open_ports.sort((a,b)=>a-b), closed: closed_ports.sort((a,b)=>a-b) };
  }

  // DNS Whois Scan
  async function scanDnsWhois(domain: string) {
    try {
      const w = await whois(domain);
      let country = w.country || w.registrantCountry || null;
      let registrar = w.registrar || null;
      let nameservers = w.nameServer ? w.nameServer.split(/[\s,]+/) : null;

      // naive IP resolution using DNS
      const dns = await import('dns/promises');
      let ip = null;
      try {
        const records = await dns.resolve4(domain);
        ip = records[0] || null;
      } catch (e) {}

      if (ip && (!country || String(country).length < 2)) {
        try {
          const r = await fetch(`http://ip-api.com/json/${ip}`);
          if (r.ok) {
            const geo = await r.json();
            if (geo.country) country = geo.country;
          }
        } catch (e) {}
      }

      return { ip, registrar, nameservers, country };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  // Crawler
  async function crawl(domain: string, maxPages = 50) {
    const visited = new Set<string>();
    const toVisit = [`https://${domain}`];
    const results: { url: string; html: string; headers: Headers; cookies: string }[] = [];
    const concurrency = 10;

    while (toVisit.length > 0 && results.length < maxPages) {
      const batch = toVisit.splice(0, concurrency).filter(u => !visited.has(u));
      if (batch.length === 0) continue;
      batch.forEach(u => visited.add(u));

      const promises = batch.map(async (url) => {
        try {
          const resp = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
          if (!resp.ok) return null;
          const html = await resp.text();
          return { url, html, headers: resp.headers, cookies: resp.headers.get('set-cookie') || '' };
        } catch (e) {
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      for (const res of batchResults) {
        if (!res) continue;
        results.push(res);
        if (results.length >= maxPages) break;
        
        // Extract links
        const regex = /href=["']([^"']+)["']/gi;
        let match;
        while ((match = regex.exec(res.html)) !== null) {
          let link = match[1];
          if (link.startsWith('/') && !link.startsWith('//')) {
            link = `https://${domain}${link}`;
          }
          if (link.startsWith(`https://${domain}`) || link.startsWith(`http://${domain}`)) {
            link = link.split('#')[0];
            if (link.match(/\.(png|jpg|jpeg|gif|css|js|ico|svg|pdf|zip|woff|woff2|ttf|eot)$/i)) continue;
            if (!visited.has(link) && !toVisit.includes(link)) {
              toVisit.push(link);
            }
          }
        }
      }
    }
    return results.length > 0 ? results : [{ url: `https://${domain}`, html: "", headers: new Headers(), cookies: "" }];
  }

  // Headers Scan
  function processHeaders(headers: Headers) {
    const hObj: Record<string, string> = {};
    headers.forEach((v, k) => hObj[k.toLowerCase()] = v.toLowerCase());
    
    const security_headers = [
      'content-security-policy',
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];
    
    const found: Record<string, string> = {};
    const missing: string[] = [];
    
    for (const h of security_headers) {
      if (hObj[h]) found[h] = hObj[h];
      else missing.push(h);
    }
    
    const risk = missing.length > 2 ? "High" : (missing.length > 0 ? "Medium" : "Low");
    return { existing: found, missing, risk_level: risk, raw: hObj };
  }

  // CMS Scan
  function scanCms(pages: { html: string; headers: Headers; cookies: string }[]) {
    const categories: Record<string, string[]> = {};
    
    const add = (cat: string, tech: string) => {
      if (!categories[cat]) categories[cat] = [];
      if (!categories[cat].includes(tech)) categories[cat].push(tech);
    };

    for (const page of pages) {
      const htmlLower = page.html.toLowerCase();
      const cookies = page.cookies;
      
      const getHeader = (h: string) => page.headers.get(h)?.toLowerCase() || '';

      if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress')) add("CMS", "WordPress");
      if (htmlLower.includes('shopify.com') || getHeader('x-shopid') || cookies.includes('_s=')) add("CMS", "Shopify");
      if (htmlLower.includes('joomla')) add("CMS", "Joomla");
      if (htmlLower.includes('drupal') || getHeader('x-generator').includes('drupal')) add("CMS", "Drupal");
      if (htmlLower.includes('magento') || cookies.includes('frontend=')) add("CMS", "Magento");
      if (htmlLower.includes('bitrix') || cookies.includes('bitrix_sm=')) add("CMS", "1C-Bitrix");

      const headersStr = JSON.stringify(Object.fromEntries(page.headers.entries())).toLowerCase();
      if (headersStr.includes('laravel') || cookies.includes('laravel_session=')) add("Frameworks", "Laravel");
      if (htmlLower.includes('_next') || htmlLower.includes('next.js')) add("Frameworks", "Next.js");
      if (htmlLower.includes('nuxt') || htmlLower.includes('_nuxt')) add("Frameworks", "Nuxt.js");
      if (htmlLower.includes('react') || htmlLower.includes('data-reactroot')) add("Frameworks", "React");
      if (htmlLower.includes('ng-app') || htmlLower.includes('angular')) add("Frameworks", "Angular");
      if (htmlLower.includes('data-v-') || htmlLower.includes('vue')) add("Frameworks", "Vue.js");
      if (htmlLower.includes('django') || cookies.includes('csrftoken=')) add("Frameworks", "Django");
      if (getHeader('x-powered-by').includes('express')) add("Frameworks", "Express");

      const server = getHeader('server');
      if (server.includes('nginx')) add("Web Servers", "Nginx");
      if (server.includes('apache')) add("Web Servers", "Apache");
      if (server.includes('litespeed')) add("Web Servers", "LiteSpeed");

      if (getHeader('x-powered-by').includes('php') || cookies.includes('phpsessid=')) add("Programming Languages", "PHP");
      if (getHeader('x-powered-by').includes('asp.net')) add("Programming Languages", "ASP.NET");
      if (getHeader('x-powered-by').includes('python')) add("Programming Languages", "Python");

      if (htmlLower.includes('google-analytics.com') || htmlLower.includes('gtag(') || htmlLower.includes('ga(')) add("Analytics", "Google Analytics");
      if (htmlLower.includes('googletagmanager.com/gtag/js?id=g-')) add("Analytics", "GA4");
      if (htmlLower.includes('yandex.ru/metrika') || htmlLower.includes('mc.yandex.ru')) add("Analytics", "Yandex Metrika");
      if (htmlLower.includes('googletagmanager.com') || htmlLower.includes('gtm.js')) add("Tag Managers", "Google Tag Manager");

      if (htmlLower.includes('manifest.json') || htmlLower.includes('theme-color')) add("Miscellaneous", "PWA");
      if (htmlLower.includes('og:title')) add("Miscellaneous", "Open Graph");

      const jqueryMatch = htmlLower.match(/jquery[^\w]*([0-9\.]+)(?:\.min)?\.js/);
      if (jqueryMatch) add("JS Libraries", `jQuery ${jqueryMatch[1]}`);
      else if (htmlLower.includes('jquery')) add("JS Libraries", "jQuery");
    }

    return { categories: Object.keys(categories).length ? categories : { "None": ["None Detected"] } };
  }

  // Vulnerability Scan
  async function scanVulnerabilities(domain: string, discoveredUrls: string[]) {
    const results = {
      xss: { vulnerable: false, details: "No generic XSS reflection found.", pages: [] as string[] },
      sqli: { vulnerable: false, details: "No standard SQL syntax errors detected in response.", pages: [] as string[] },
      cors: { vulnerable: false, details: "CORS policy seems restrictive." },
      files: { vulnerable: false, found: [] as string[], details: "No obvious sensitive files exposed." },
      admin: { vulnerable: false, found: [] as string[], details: "No standard admin panels detected." },
      scanned_pages: discoveredUrls.length
    };
    
    // Test up to 50 pages
    const urlsToTest = discoveredUrls.slice(0, 50);
    
    // CORS
    try {
      const resp = await fetch(`https://${domain}`, { headers: { "Origin": "https://evil.com" }, redirect: "follow", signal: AbortSignal.timeout(5000) });
      const allowOrigin = resp.headers.get("access-control-allow-origin");
      if (allowOrigin === "*" || allowOrigin === "https://evil.com") {
        results.cors.vulnerable = true;
        results.cors.details = `CORS misconfigured. Returns 'Access-Control-Allow-Origin: ${allowOrigin}'.`;
      }
    } catch(e) {}

    // Files
    const filesToCheck = [".env", ".git/config", "docker-compose.yml"];
    await Promise.all(filesToCheck.map(async file => {
      try {
        const resp = await fetch(`https://${domain}/${file}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
        if (resp.status === 200) {
          const text = (await resp.text()).toLowerCase();
          if (text.includes("<html")) return;
          if (file === ".env" && (text.includes("db_") || text.includes("app_key") || text.includes("="))) results.files.found.push(file);
          else if (file === ".git/config" && text.includes("[core]")) results.files.found.push(file);
          else if (file === "docker-compose.yml" && text.includes("version:")) results.files.found.push(file);
          else if (text.trim().length > 0 && !text.trim().startsWith("<")) results.files.found.push(file);
        }
      } catch(e) {}
    }));
    if (results.files.found.length > 0) {
      results.files.vulnerable = true;
      results.files.details = `Exposed sensitive files: ${results.files.found.join(', ')}`;
    }

    // Admin
    const panels = ["admin", "wp-admin", "login", "dashboard"];
    await Promise.all(panels.map(async panel => {
      try {
        const resp = await fetch(`https://${domain}/${panel}`, { redirect: "follow", signal: AbortSignal.timeout(5000) });
        if (resp.status === 200) {
          const text = (await resp.text()).toLowerCase();
          if (text.includes("password") || text.includes("login") || text.includes("пароль") || text.includes("войти") || text.includes(panel)) {
            results.admin.found.push(`/${panel}`);
          }
        }
      } catch(e) {}
    }));
    if (results.admin.found.length > 0) {
      results.admin.vulnerable = true;
      results.admin.details = `Found admin/login paths: ${results.admin.found.join(', ')}`;
    }

    // XSS
    const xssPayload = '"><script>console.log("xss_test_1337")</script>';
    for (let i = 0; i < urlsToTest.length; i += 10) {
      const chunk = urlsToTest.slice(i, i + 10);
      await Promise.all(chunk.map(async url => {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.append("search", xssPayload);
          testUrl.searchParams.append("q", xssPayload);
          const resp = await fetch(testUrl.toString(), { signal: AbortSignal.timeout(5000) });
          const text = (await resp.text()).toLowerCase();
          
          let localVulnerable = false;
          if (text.includes(xssPayload.toLowerCase())) {
              localVulnerable = true;
          }
          
          if (localVulnerable) {
             results.xss.vulnerable = true;
             results.xss.pages.push(url);
             results.xss.details = "Potential XSS found on some pages due to input reflection.";
          }
        } catch(e) {}
      }));
    }

    // SQLi
    const sqliPayload = "'";
    for (let i = 0; i < urlsToTest.length; i += 10) {
      const chunk = urlsToTest.slice(i, i + 10);
      await Promise.all(chunk.map(async url => {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.append("id", sqliPayload);
          testUrl.searchParams.append("page", sqliPayload);
          const resp = await fetch(testUrl.toString(), { signal: AbortSignal.timeout(5000) });
          const text = (await resp.text()).toLowerCase();
          const sqlErrors = ["you have an error in your sql syntax", "warning: mysql", "unclosed quotation mark after the character string", "quoted string not properly terminated", "pg_query(): query failed", "sqlite3.operationerror", "sql syntax error", "mysql_fetch", "ora-01756"];
          for (const err of sqlErrors) {
            if (text.includes(err)) {
              results.sqli.vulnerable = true;
              results.sqli.pages.push(url);
              results.sqli.details = `Potential SQL Injection found. Database error message detected on some pages.`;
              break;
            }
          }
        } catch(e) {}
      }));
    }

    if (!results.xss.vulnerable && results.xss.pages.length === 0) {
        try {
           const resp = await fetch(`https://${domain}`, { signal: AbortSignal.timeout(3000) });
           if (!resp.headers.get("content-security-policy")) {
               results.xss.details = "Low/Moderate Risk: Missing Content-Security-Policy (CSP) header.";
           }
        } catch(e){}
    }

    results.xss.pages = [...new Set(results.xss.pages)];
    results.sqli.pages = [...new Set(results.sqli.pages)];

    return results;
  }

  // Score Calculation
  function calculateScore(results: any) {
    let score = 100;
    if (!results.ssl?.valid) score -= 30;
    score -= (results.headers?.missing?.length || 0) * 5;
    
    const openP = results.ports?.open || [];
    const riskyModes = openP.filter((p: number) => p !== 80 && p !== 443);
    score -= riskyModes.length * 10;

    if (!results.ddos?.protected) score -= 15;

    const v = results.vulnerabilities || {};
    if (v.xss?.vulnerable) score -= 15;
    if (v.sqli?.vulnerable) score -= 25;
    if (v.cors?.vulnerable) score -= 10;
    if (v.files?.vulnerable) score -= 20;
    if (v.admin?.found?.length > 0) score -= 2;

    score = Math.max(0, Math.min(100, score));
    let riskLevel = "Low";
    if (score < 50) riskLevel = "Critical";
    else if (score < 70) riskLevel = "High";
    else if (score < 90) riskLevel = "Medium";

    return { score, riskLevel };
  }

  // AI Summary
  async function generateAiSummary(domain: string, results: any, score: number, riskLevel: string, language: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "AI analysis unavailable due to missing API key.";
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Act as a Senior Cybersecurity Analyst. Analyze the following scan results for ${domain}.
Score: ${score}/100
Risk Level: ${riskLevel}
Results: ${JSON.stringify(results)}

Provide a professional security analysis, highlighting detected risks, missing protections, and actionable recommendations.
IMPORTANT: Your entire response (summary, title, status, detailed description, recommendation) MUST BE STRICTLY AND COMPLETELY WRITTEN IN ${language}.
Format your response STRICTLY as valid JSON with the following structure:
{
    "score": <integer 0-100>,
    "summary": "<overall summary of the security posture>",
    "details": [
        {
            "title": "<short title, e.g. SSL, Headers>",
            "status": "<PASS, FAIL, or WARN>",
            "summary": "<detailed description of finding>",
            "recommendation": "<how to fix it>"
        }
    ]
}
Do not use markdown wrappers like \`\`\`json, just output the raw JSON.

CRITICAL MULTILINGUAL REQUIREMENT:
You MUST translate and write ALL human-readable text values ("summary", "title", "recommendation" etc) ENTIRELY in the following language: ${language}.
If the language is "Uzbek", you MUST respond fully in the Uzbek language (O'zbek tili).
If the language is "Russian", you MUST respond fully in the Russian language (Русский язык).
Do NOT output English unless specifically requested.`;

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
      });
      let text = response.text || "";
      text = text.trim();
      if (text.startsWith("```json")) text = text.substring(7);
      if (text.startsWith("```")) text = text.substring(3);
      if (text.endsWith("```")) text = text.substring(0, text.length - 3);
      
      const aiData = JSON.parse(text.trim());
      return JSON.stringify({ FORMATTED_JSON: true, data: aiData });
    } catch(e: any) {
      if (e.message && (e.message.includes('429') || e.message.includes('quota'))) {
         if (language === "Russian") return "Анализ ИИ временно недоступен (превышен лимит запросов в бесплатном API Gemini). Пожалуйста, повторите попытку через минуту.";
         if (language === "Uzbek") return "Sun'iy intellekt tahlili vaqtinchalik mavjud emas (Gemini API bepul limitidan oshib ketdi). Iltimos, bir daqiqadan so'ng qayta urinib ko'ring.";
         return "AI analysis is temporarily unavailable (Gemini free tier quota exceeded). Please try again in a minute.";
      }
      return "AI analysis failed to generate. Please try again.";
    }
  }

  // Main Endpoint
  app.get("/api/backend/scan", async (req, res) => {
    let rawDomain = req.query.domain as string;
    let lang = (req.query.lang as string) || "ru";
    if (!rawDomain) {
       res.status(400).json({ detail: "Missing domain parameter" });
       return;
    }
    
    let domain = rawDomain.replace("http://", "").replace("https://", "").split("/")[0];
    
    const results: any = {};
    
    // Start crawl
    const crawledPages = await crawl(domain, 50);
    const mainPage = crawledPages[0] || { url: `https://${domain}`, html: "", headers: new Headers(), cookies: "" };
    
    let respHeaders: Record<string, string> = {};
    let respServer = "";
    let respCookies = mainPage.cookies || "";
    let html = mainPage.html || "";
    
    if (mainPage.headers && mainPage.headers.entries) {
      const hData = processHeaders(mainPage.headers);
      results.headers = hData;
      respHeaders = hData.raw;
      respServer = respHeaders['server'] || '';
    } else {
      results.headers = { error: "Failed to fetch headers" };
    }
    
    results.ssl = await scanSsl(domain);
    results.dns_whois = await scanDnsWhois(domain);
    
    // Pass multiple pages to CMS scan
    results.cms = scanCms(crawledPages);
    
    results.ports = await scanPorts(domain);
    
    const cookiesObj: Record<string, string> = {};
    if (respCookies) {
      const parts = respCookies.split(';');
      for (const p of parts) {
        const [k, v] = p.trim().split('=');
        if (k && v) cookiesObj[k] = v;
        else if (k) cookiesObj[k] = "true";
      }
    }
    
    results.ddos = scanDdos(respHeaders, respServer, cookiesObj);
    
    // Pass discovered URLs to Vulnerabilities scan
    const discoveredUrls = crawledPages.map(p => p.url);
    results.vulnerabilities = await scanVulnerabilities(domain, discoveredUrls);
    
    const { score, riskLevel } = calculateScore(results);
    
    const languageMap: Record<string, string> = { ru: "Russian", uz: "Uzbek", en: "English" };
    const fullLanguageName = languageMap[lang] || "Russian";
    
    const aiSummary = await generateAiSummary(domain, results, score, riskLevel, fullLanguageName);
    
    res.json({
        domain,
        score,
        risk_level: riskLevel,
        results,
        ai_summary: aiSummary,
        timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
