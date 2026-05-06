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
    allow_credentials=True,
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
        return {
            "ip": ip,
            "registrar": w.registrar if hasattr(w, 'registrar') else None,
            "nameservers": w.name_servers if hasattr(w, 'name_servers') else None,
            "country": w.country if hasattr(w, 'country') else None
        }
    except Exception as e:
        return {"error": str(e)}

def scan_cms(domain: str):
    try:
        url = f"https://{domain}"
        response = requests.get(url, timeout=5)
        html = response.text.lower()
        headers = str(response.headers).lower()
        cms = []
        if 'wp-content' in html or 'wordpress' in html: cms.append("WordPress")
        if 'shopify.com' in html or 'shopify' in headers: cms.append("Shopify")
        if 'joomla' in html: cms.append("Joomla")
        if 'drupal' in html or 'drupal' in headers: cms.append("Drupal")
        if 'laravel' in headers or 'laravel_session' in response.cookies.keys(): cms.append("Laravel")
        if '_next' in html or 'next.js' in html: cms.append("Next.js")
        
        return {"detected": cms if cms else ["None Detected"]}
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
        Format as plain text or markdown.
        Very IMPORTANT: Output the entire response in the {language} language.
        """
        response = model.generate_content(prompt)
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
    results["ssl"] = scan_ssl(domain)
    results["headers"] = scan_headers(domain)
    results["dns_whois"] = scan_dns_whois(domain)
    results["cms"] = scan_cms(domain)
    results["ports"] = scan_ports(ip)
    
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
