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
  function scanCms(html: string, headers: Record<string, string>, cookies: string) {
    const categories: Record<string, string[]> = {};
    const htmlLower = html.toLowerCase();
    
    const add = (cat: string, tech: string) => {
      if (!categories[cat]) categories[cat] = [];
      if (!categories[cat].includes(tech)) categories[cat].push(tech);
    };

    if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress')) add("CMS", "WordPress");
    if (htmlLower.includes('shopify.com') || headers['x-shopid'] || cookies.includes('_s=')) add("CMS", "Shopify");
    if (htmlLower.includes('joomla')) add("CMS", "Joomla");
    if (htmlLower.includes('drupal') || (headers['x-generator'] && headers['x-generator'].includes('drupal'))) add("CMS", "Drupal");
    if (htmlLower.includes('magento') || cookies.includes('frontend=')) add("CMS", "Magento");
    if (htmlLower.includes('bitrix') || cookies.includes('bitrix_sm=')) add("CMS", "1C-Bitrix");

    const headersStr = JSON.stringify(headers);
    if (headersStr.includes('laravel') || cookies.includes('laravel_session=')) add("Frameworks", "Laravel");
    if (htmlLower.includes('_next') || htmlLower.includes('next.js')) add("Frameworks", "Next.js");
    if (htmlLower.includes('nuxt') || htmlLower.includes('_nuxt')) add("Frameworks", "Nuxt.js");
    if (htmlLower.includes('react') || htmlLower.includes('data-reactroot')) add("Frameworks", "React");
    if (htmlLower.includes('ng-app') || htmlLower.includes('angular')) add("Frameworks", "Angular");
    if (htmlLower.includes('data-v-') || htmlLower.includes('vue')) add("Frameworks", "Vue.js");
    if (htmlLower.includes('django') || cookies.includes('csrftoken=')) add("Frameworks", "Django");
    if (headers['x-powered-by']?.includes('express')) add("Frameworks", "Express");

    const server = headers['server'] || '';
    if (server.includes('nginx')) add("Web Servers", "Nginx");
    if (server.includes('apache')) add("Web Servers", "Apache");
    if (server.includes('litespeed')) add("Web Servers", "LiteSpeed");

    if (headers['x-powered-by']?.includes('php') || cookies.includes('phpsessid=')) add("Programming Languages", "PHP");
    if (headers['x-powered-by']?.includes('asp.net')) add("Programming Languages", "ASP.NET");
    if (headers['x-powered-by']?.includes('python')) add("Programming Languages", "Python");

    if (htmlLower.includes('google-analytics.com') || htmlLower.includes('gtag(') || htmlLower.includes('ga(')) add("Analytics", "Google Analytics");
    if (htmlLower.includes('googletagmanager.com/gtag/js?id=g-')) add("Analytics", "GA4");
    if (htmlLower.includes('yandex.ru/metrika') || htmlLower.includes('mc.yandex.ru')) add("Analytics", "Yandex Metrika");
    if (htmlLower.includes('googletagmanager.com') || htmlLower.includes('gtm.js')) add("Tag Managers", "Google Tag Manager");

    if (htmlLower.includes('manifest.json') || htmlLower.includes('theme-color')) add("Miscellaneous", "PWA");
    if (htmlLower.includes('og:title')) add("Miscellaneous", "Open Graph");

    const jqueryMatch = htmlLower.match(/jquery[^\w]*([0-9\.]+)(?:\.min)?\.js/);
    if (jqueryMatch) add("JS Libraries", `jQuery ${jqueryMatch[1]}`);
    else if (htmlLower.includes('jquery')) add("JS Libraries", "jQuery");

    return { categories: Object.keys(categories).length ? categories : { "None": ["None Detected"] } };
  }

  // Vulnerability Scan
  async function scanVulnerabilities(domain: string) {
    const results = {
      xss: { vulnerable: false, details: "No generic XSS reflection found." },
      sqli: { vulnerable: false, details: "No standard SQL syntax errors detected in response." },
      cors: { vulnerable: false, details: "CORS policy seems restrictive." },
      files: { vulnerable: false, found: [] as string[], details: "No obvious sensitive files exposed." },
      admin: { vulnerable: false, found: [] as string[], details: "No standard admin panels detected." }
    };
    
    // CORS
    try {
      const resp = await fetch(`https://${domain}`, { headers: { "Origin": "https://evil.com" }, redirect: "follow" });
      const allowOrigin = resp.headers.get("access-control-allow-origin");
      if (allowOrigin === "*" || allowOrigin === "https://evil.com") {
        results.cors.vulnerable = true;
        results.cors.details = `CORS misconfigured. Returns 'Access-Control-Allow-Origin: ${allowOrigin}'.`;
      }
    } catch(e) {}

    // Files
    const filesToCheck = [".env", ".git/config", "docker-compose.yml"];
    for (const file of filesToCheck) {
      try {
        const resp = await fetch(`https://${domain}/${file}`, { redirect: "manual" });
        if (resp.status === 200) {
          const text = (await resp.text()).toLowerCase();
          if (text.includes("<html")) continue;
          if (file === ".env" && (text.includes("db_") || text.includes("app_key") || text.includes("="))) results.files.found.push(file);
          else if (file === ".git/config" && text.includes("[core]")) results.files.found.push(file);
          else if (file === "docker-compose.yml" && text.includes("version:")) results.files.found.push(file);
          else if (text.trim().length > 0 && !text.trim().startsWith("<")) results.files.found.push(file);
        }
      } catch(e) {}
    }
    if (results.files.found.length > 0) {
      results.files.vulnerable = true;
      results.files.details = `Exposed sensitive files: ${results.files.found.join(', ')}`;
    }

    // Admin
    const panels = ["admin", "wp-admin", "login", "dashboard"];
    for (const panel of panels) {
      try {
        const resp = await fetch(`https://${domain}/${panel}`, { redirect: "follow" });
        if (resp.status === 200) {
          const text = (await resp.text()).toLowerCase();
          if (text.includes("password") || text.includes("login") || text.includes("пароль") || text.includes("войти") || text.includes(panel)) {
            results.admin.found.push(`/${panel}`);
          }
        }
      } catch(e) {}
    }
    if (results.admin.found.length > 0) {
      results.admin.details = `Found admin/login paths: ${results.admin.found.join(', ')}`;
    }

    // XSS
    const xssPayload = '"><script>console.log("xss_test_1337")</script>';
    try {
      const resp = await fetch(`https://${domain}/?search=${encodeURIComponent(xssPayload)}&q=${encodeURIComponent(xssPayload)}`);
      const text = (await resp.text()).toLowerCase();
      const reasons = [];
      if (text.includes(xssPayload.toLowerCase())) reasons.push("Input reflection (payload found entirely in response)");
      
      const csp = resp.headers.get("content-security-policy");
      if (!csp) reasons.push("Missing Content-Security-Policy (CSP) header");
      
      const xssProtect = resp.headers.get("x-xss-protection");
      if (xssProtect === "0") reasons.push("X-XSS-Protection is explicitly disabled");
      
      if (reasons.length > 0) {
        if (reasons.length > 1 || reasons[0].includes("Input reflection")) results.xss.vulnerable = true;
        results.xss.details = (results.xss.vulnerable ? "Potential XSS found: " : "Low/Moderate Risk: ") + reasons.join(", ");
      }
    } catch(e) {}

    // SQLi
    const sqliPayload = "'";
    try {
      const resp = await fetch(`https://${domain}/?id=${encodeURIComponent(sqliPayload)}&page=${encodeURIComponent(sqliPayload)}`);
      const text = (await resp.text()).toLowerCase();
      const sqlErrors = ["you have an error in your sql syntax", "warning: mysql", "unclosed quotation mark after the character string", "quoted string not properly terminated", "pg_query(): query failed", "sqlite3.operationerror", "sql syntax error", "mysql_fetch", "ora-01756"];
      for (const err of sqlErrors) {
        if (text.includes(err)) {
          results.sqli.vulnerable = true;
          results.sqli.details = `Potential SQL Injection found: Database error message detected ('${err}').`;
          break;
        }
      }
    } catch(e) {}

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
    let respHeaders: Record<string, string> = {};
    let respServer = "";
    let respCookies = "";
    let html = "";
    
    try {
      const response = await fetch(`https://${domain}`, { redirect: "follow", timeout: 5000 });
      html = await response.text();
      respHeaders = processHeaders(response.headers).raw;
      respServer = respHeaders['server'] || '';
      respCookies = respHeaders['set-cookie'] || '';
      
      results.headers = processHeaders(response.headers);
    } catch(e) {
      results.headers = { error: String(e) };
    }
    
    results.ssl = await scanSsl(domain);
    results.dns_whois = await scanDnsWhois(domain);
    results.cms = scanCms(html, respHeaders, respCookies);
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
    results.vulnerabilities = await scanVulnerabilities(domain);
    
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
