import os
import socket
import ssl
import requests
import whois
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
import google.generativeai as genai
import ipaddress

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./scanner.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ScanResult(Base):
    __tablename__ = "scan_results"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON)
    score = Column(Integer)
    ai_summary = Column(String)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CyberAudit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your Vercel frontend URL
    allow_credentials=False, # Must be False if allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SSRF and Abuse Protection
def is_safe_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            return False
        return True
    except ValueError:
        return False

def get_ip_from_domain(domain):
    try:
        ip = socket.gethostbyname(domain)
        return ip
    except Exception:
        return None

# Modules for Real Scans
def scan_ddos(domain: str, headers: dict, server: str, cookies: dict):
    # This checks for direct indicators of DDoS protection in headers or cookies
    detected = []
    
    server_lower = server.lower()
    
    # Cloudflare
    if 'cloudflare' in server_lower or '__cf_duid' in cookies or 'cf-ray' in dict(headers).keys():
        detected.append("Cloudflare")
        
    # Akamai
    if 'akamai' in server_lower or 'xgm-cdn' in dict(headers).keys():
        detected.append("Akamai")
        
    # Imperva / Incapsula
    if 'incapsula' in server_lower or 'visid_incap' in cookies:
         detected.append("Imperva")
         
    # DDoS-Guard
    if 'ddos-guard' in server_lower:
         detected.append("DDoS-Guard")
         
    # Sucuri
    if 'sucuri' in server_lower or 'x-sucuri-id' in dict(headers).keys():
         detected.append("Sucuri")
         
    # AWS Shield / CloudFront
    if 'cloudfront' in server_lower or 'x-amz-cf-id' in dict(headers).keys():
         detected.append("AWS CloudFront (Basic DDoS Protection)")

    protected = len(detected) > 0
    return {
        "protected": protected,
        "providers": detected
    }

def scan_ssl(domain: str):
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                issuer_dict = dict(x[0] for x in cert.get('issuer', []))
                return {
                    "valid": True,
                    "issuer": issuer_dict.get('organizationName', 'Unknown'),
                    "expiry": cert.get('notAfter'),
                    "tls_version": ssock.version()
                }
    except Exception as e:
        return {"valid": False, "error": str(e)}

def scan_headers(domain: str):
    try:
        url = f"https://{domain}"
        response = requests.get(url, timeout=5, allow_redirects=True)
        headers = response.headers
        security_headers = [
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy'
        ]
        found = {h: headers.get(h) for h in security_headers if h in headers}
        missing = [h for h in security_headers if h not in headers]
        risk = "High" if len(missing) > 2 else "Medium" if len(missing) > 0 else "Low"
        return {"existing": found, "missing": missing, "risk_level": risk}
    except Exception as e:
         return {"error": str(e)}

def scan_dns_whois(domain: str):
    try:
        w = whois.whois(domain)
        ip = get_ip_from_domain(domain)
        
        country = None
        if isinstance(w, dict) and 'country' in w:
            country = w.get('country')
        elif hasattr(w, 'country'):
            country = w.country
            
        if isinstance(country, list):
            country = country[0] if country else None
            
        if ip and (not country or len(str(country)) < 2 or str(country).lower() == 'none'):
            try:
                geo_resp = requests.get(f"http://ip-api.com/json/{ip}", timeout=3)
                if geo_resp.status_code == 200:
                    api_country = geo_resp.json().get("country")
                    if api_country:
                        country = api_country
            except:
                pass
                
        registrar = None
        if isinstance(w, dict) and 'registrar' in w:
            registrar = w.get('registrar')
        elif hasattr(w, 'registrar'):
            registrar = w.registrar
            
        if isinstance(registrar, list):
            registrar = registrar[0] if registrar else None
            
        nameservers = None
        if isinstance(w, dict) and 'name_servers' in w:
            nameservers = w.get('name_servers')
        elif hasattr(w, 'name_servers'):
            nameservers = w.name_servers

        return {
            "ip": ip,
            "registrar": registrar,
            "nameservers": nameservers,
            "country": country
        }
    except Exception as e:
        return {"error": str(e)}

def scan_cms(domain: str):
    try:
        url = f"https://{domain}"
        response = requests.get(url, timeout=5, allow_redirects=True)
        html = response.text.lower()
        headers = {k.lower(): v.lower() for k, v in response.headers.items()}
        cookies = response.cookies.get_dict()
        
        categories = {}
        def add(cat, tech):
            if cat not in categories: categories[cat] = []
            if tech not in categories[cat]: categories[cat].append(tech)
        
        # CMS & E-commerce
        if 'wp-content' in html or 'wordpress' in html: add("CMS", "WordPress")
        if 'shopify.com' in html or 'shopify' in headers.get('x-shopid', '') or '_s' in cookies: add("CMS", "Shopify")
        if 'joomla' in html: add("CMS", "Joomla")
        if 'drupal' in html or 'x-generator' in headers and 'drupal' in headers['x-generator']: add("CMS", "Drupal")
        if 'magento' in html or 'frontend' in cookies: add("CMS", "Magento")
        if 'bitrix' in html or 'bitrix_sm' in cookies: add("CMS", "1C-Bitrix")

        # Frameworks
        if 'laravel' in str(headers) or 'laravel_session' in cookies: add("Frameworks", "Laravel")
        if '_next' in html or 'next.js' in html: add("Frameworks", "Next.js")
        if 'nuxt' in html or '_nuxt' in html: add("Frameworks", "Nuxt.js")
        if 'react' in html or 'data-reactroot' in html: add("Frameworks", "React")
        if 'ng-app' in html or 'angular' in html: add("Frameworks", "Angular")
        if 'vue' in html or 'data-v-' in html: add("Frameworks", "Vue.js")
        if 'django' in html or 'csrftoken' in cookies: add("Frameworks", "Django")
        if 'x-powered-by' in headers and 'express' in headers['x-powered-by']: add("Frameworks", "Express")

        # Web Servers
        server = headers.get('server', '')
        if 'nginx' in server: add("Web Servers", "Nginx")
        if 'apache' in server: add("Web Servers", "Apache")
        if 'litespeed' in server: add("Web Servers", "LiteSpeed")

        # Programming Languages
        if 'x-powered-by' in headers:
            powered_by = headers['x-powered-by']
            if 'php' in powered_by: add("Programming Languages", "PHP")
            if 'asp.net' in powered_by: add("Programming Languages", "ASP.NET")
            if 'python' in powered_by: add("Programming Languages", "Python")

        if 'phpsessid' in cookies: add("Programming Languages", "PHP")
        
        # Analytics
        if 'google-analytics.com' in html or 'gtag(' in html or 'ga(' in html: add("Analytics", "Google Analytics")
        if 'googletagmanager.com/gtag/js?id=g-' in html or "gtag('config'" in html.replace('"', "'") and '-g-' in html.lower(): add("Analytics", "GA4")
        if 'yandex.ru/metrika' in html or 'mc.yandex.ru' in html: add("Analytics", "Yandex Metrika")
        
        # Tag Managers
        if 'googletagmanager.com' in html or 'gtm.js' in html: add("Tag Managers", "Google Tag Manager")

        # Ads
        if 'adfox' in html or 'adfox.ru' in html: add("Ads", "ADFOX")
        
        # Fonts & Icons
        if 'fonts.googleapis.com' in html or 'fonts.gstatic.com' in html: add("Fonts", "Google Font API")
        if 'use.fontawesome.com' in html or 'font-awesome' in html: add("Fonts", "FontAwesome")
        
        # Miscellaneous
        if 'manifest.json' in html or 'theme-color' in html: add("Miscellaneous", "PWA")
        if 'og:title' in html or 'og:image' in html: add("Miscellaneous", "Open Graph")
        if 'h3' in headers.get('alt-svc', ''): add("Miscellaneous", "HTTP/3")
        
        # Media Components
        if 'jplayer' in html.lower(): add("Video/Audio Player", "jPlayer")
        
        # JS Libraries
        if 'jszip' in html.lower(): add("JS Libraries", "JSZip")
        if 'highlight.js' in html.lower() or 'hljs' in html.lower(): add("JS Libraries", "Highlight.js")
        if 'monaco-editor' in html.lower(): add("JS Libraries", "Monaco Editor")
        if 'type="text/typescript"' in html or '.ts"' in html: add("JS Libraries", "TypeScript")
        if 'aos.js' in html.lower() or 'aos.css' in html.lower() or 'aos-' in html.lower(): add("JS Libraries", "AOS")
        if 'swiper' in html.lower(): add("JS Libraries", "Swiper")

        import re
        jquery_match = re.search(r'jquery[^\w]*([0-9\.]+)(?:\.min)?\.js', html)
        if jquery_match:
            add("JS Libraries", f"jQuery {jquery_match.group(1)}")
        elif 'jquery' in html.lower():
            add("JS Libraries", "jQuery")
            
        return {"categories": categories if categories else {"None": ["None Detected"]}}
    except Exception as e:
        return {"error": str(e)}

def scan_ports(ip: str):
    ports = [21, 22, 25, 80, 443, 3306, 8080]
    open_ports = []
    closed_ports = []
    for port in ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((ip, port))
            if result == 0:
                open_ports.append(port)
            else:
                closed_ports.append(port)
            sock.close()
        except:
            pass
    return {"open": open_ports, "closed": closed_ports}

def calculate_score(results: dict):
    score = 100
    ssl_data = results.get("ssl", {})
    if not ssl_data.get("valid"):
        score -= 30
    
    headers_data = results.get("headers", {})
    missing = headers_data.get("missing", [])
    score -= len(missing) * 5
    
    ports_data = results.get("ports", {})
    open_p = ports_data.get("open", [])
    risky_ports = [p for p in open_p if p not in [80, 443]]
    score -= len(risky_ports) * 10
    
    # Add negative score if no DDoS protection is found
    ddos_data = results.get("ddos", {})
    if not ddos_data.get("protected"):
        score -= 15 # Heavily penalize the lack of DDoS protection

    score = max(0, min(100, score))
    
    risk_level = "Low"
    if score < 50: risk_level = "Critical"
    elif score < 70: risk_level = "High"
    elif score < 90: risk_level = "Medium"
    
    return score, risk_level

def generate_ai_summary(domain, results, score, risk_level, language):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI analysis unavailable due to missing API key."
    
    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        Act as a Senior Cybersecurity Analyst. Analyze the following scan results for {domain}.
        Score: {score}/100
        Risk Level: {risk_level}
        Results: {results}
        
        Provide a professional security analysis, highlighting detected risks, missing protections, and actionable recommendations.
        IMPORTANT: Your entire response (summary, title, status, detailed description, recommendation) MUST BE STRICTLY AND COMPLETELY WRITTEN IN {language}.
        Format your response STRICTLY as valid JSON with the following structure:
        {{
            "score": <integer 0-100>,
            "summary": "<overall summary of the security posture>",
            "details": [
                {{
                    "title": "<short title, e.g. SSL, Headers>",
                    "status": "<PASS, FAIL, or WARN>",
                    "summary": "<detailed description of finding>",
                    "recommendation": "<how to fix it>"
                }}
            ]
        }}
        Do not use markdown wrappers like ```json, just output the raw JSON.
        
        CRITICAL MULTILINGUAL REQUIREMENT:
        You MUST translate and write ALL human-readable text values ("summary", "title", "recommendation" etc) ENTIRELY in the following language: {language}.
        If the language is "Uzbek", you MUST respond fully in the Uzbek language (O'zbek tili).
        If the language is "Russian", you MUST respond fully in the Russian language (Русский язык).
        Do NOT output English unless specifically requested.
        """
        response = model.generate_content(prompt)
        try:
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            ai_data = json.loads(text.strip())
            # Return a special JSON string that we will identify on the frontend
            return json.dumps({
                "FORMATTED_JSON": True,
                "data": ai_data
            })
        except Exception as e:
            return response.text

    except Exception as e:
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            if language == "Russian":
                return "Анализ ИИ временно недоступен (превышен лимит запросов в бесплатном API Gemini). Пожалуйста, повторите попытку через минуту."
            elif language == "Uzbek":
                return "Sun'iy intellekt tahlili vaqtinchalik mavjud emas (Gemini API bepul limitidan oshib ketdi). Iltimos, bir daqiqadan so'ng qayta urinib ko'ring."
            else:
                return "AI analysis is temporarily unavailable (Gemini free tier quota exceeded). Please try again in a minute."
        return f"AI analysis failed to generate. Please try again."

# REST API Endpoints
@app.get("/scan")
def run_scan(domain: str = Query(..., description="Domain without protocol"), lang: str = Query("ru", description="Output language (ru, uz, en)"), db: Session = Depends(get_db)):
    domain = domain.strip().replace("http://", "").replace("https://", "").split("/")[0]
    
    ip = get_ip_from_domain(domain)
    if not ip:
        raise HTTPException(status_code=400, detail="Could not resolve domain locally.")
        
    if not is_safe_ip(ip):
        raise HTTPException(status_code=403, detail="Scanning private/internal IPs is forbidden.")
        
    results = {}
    
    # We fetch headers/server/cookies early for reuse, including ddos scan
    try:
        url_req = f"https://{domain}"
        response = requests.get(url_req, timeout=5, allow_redirects=True)
        resp_headers = {k.lower(): v.lower() for k, v in response.headers.items()}
        resp_server = resp_headers.get('server', '')
        resp_cookies = response.cookies.get_dict()
    except:
        resp_headers = {}
        resp_server = ""
        resp_cookies = {}

    results["ssl"] = scan_ssl(domain)
    results["headers"] = scan_headers(domain) # Note: can be optimized further by reusing response, but logic relies tightly on original request obj now
    results["dns_whois"] = scan_dns_whois(domain)
    results["cms"] = scan_cms(domain)
    results["ports"] = scan_ports(ip)
    results["ddos"] = scan_ddos(domain, resp_headers, resp_server, resp_cookies)
    
    score, risk_level = calculate_score(results)
    
    language_map = {"ru": "Russian", "uz": "Uzbek", "en": "English"}
    full_language_name = language_map.get(lang, "Russian")
    
    ai_summary = generate_ai_summary(domain, results, score, risk_level, full_language_name)
    
    scan_record = ScanResult(
        domain=domain,
        data=results,
        score=score,
        ai_summary=ai_summary
    )
    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)
    
    return {
        "id": scan_record.id,
        "domain": domain,
        "score": score,
        "risk_level": risk_level,
        "results": results,
        "ai_summary": ai_summary,
        "timestamp": scan_record.timestamp
    }

@app.get("/history")
def get_history(limit: int = 10, db: Session = Depends(get_db)):
    scans = db.query(ScanResult).order_by(ScanResult.timestamp.desc()).limit(limit).all()
    return [{"id": s.id, "domain": s.domain, "score": s.score, "timestamp": s.timestamp} for s in scans]

@app.get("/report/{scan_id}")
def get_report(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
         raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "id": scan.id,
        "domain": scan.domain,
        "score": scan.score,
        "results": scan.data,
        "ai_summary": scan.ai_summary,
        "timestamp": scan.timestamp
    }

@app.get("/")
def read_root():
    return {"message": "CyberAudit API Backend is running.", "endpoints": ["/scan", "/history", "/report/{id}"]}
