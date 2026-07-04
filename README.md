# CyberAudit 🛡️

**CyberAudit** is a comprehensive, full-stack web security vulnerability scanner and auditing platform. It performs multi-layered reconnaissance, deep crawling (up to 50 pages per domain), and security analysis to identify common web vulnerabilities, misconfigurations, and technology stack details.

Built with **React**, **TypeScript**, **Tailwind CSS** on the frontend, and **Express/Node.js** on the backend.

---

## 🎓 Academic Context & AI-Assisted Development

This project was developed as a demonstration of modern cybersecurity concepts and **advanced AI-Assisted Software Engineering**. 

As a prospective student aiming for advanced academic studies in South Korea, my goal was to showcase not just technical coding ability, but **the competent, strategic, and professional use of Artificial Intelligence** in the software development lifecycle (SDLC).

*   **Strategic Human-AI Collaboration:** I conceptualized the system architecture, defined the rigorous security scanning requirements (such as implementing deep multi-page crawling instead of surface-level checks), and directed the entire development process. I utilized AI models as a collaborative "pair-programmer" to accelerate development, refine complex asynchronous logic, and optimize the React/Node.js stack.
*   **Prompt Engineering & Architectural Control:** I acted as the lead architect. Every feature was strictly guided by my prompts, and the generated code was reviewed, debugged, and integrated by me to ensure security, performance, and architectural integrity.
*   **Modern Engineering Practices:** This project highlights my ability to formulate precise technical instructions, manage complex state in a full-stack environment, and leverage cutting-edge AI tools to build scalable, real-world applications.

This approach reflects the future of computer science and software engineering: combining human domain knowledge and critical thinking with AI capabilities to build robust systems efficiently.

---

## 🚀 Features

*   **Deep Crawling Engine:** Scans up to 50 pages per target domain to ensure a full-scope assessment rather than just homepage analysis.
*   **Vulnerability Detection:**
    *   **Cross-Site Scripting (XSS):** Tests for input reflection and missing CSP headers.
    *   **SQL Injection (SQLi):** Detects standard SQL database error messages.
    *   **CORS Misconfigurations:** Identifies overly permissive Cross-Origin Resource Sharing policies.
    *   **Sensitive Data Exposure:** Checks for exposed `.env`, `.git/config`, and `docker-compose.yml` files.
    *   **Admin Panel Discovery:** Scans for common administrative interfaces (`/admin`, `/wp-admin`, etc.).
*   **Infrastructure & Reconnaissance:**
    *   **HTTP Security Headers:** Analyzes the presence of security-critical headers (HSTS, CSP, X-Frame-Options, etc.).
    *   **Technology & CMS Fingerprinting:** Detects frameworks (React, Next.js, Laravel), CMS (WordPress, Shopify), Web Servers, and JS libraries based on deep DOM and header inspection.
    *   **SSL/TLS Analysis:** Validates certificate issuer, expiry, and supported TLS versions.
    *   **Port Scanning:** Checks standard web and management ports (80, 443, 8080, 21, 22, 3306).
    *   **DDoS Protection Identification:** Detects the presence of Cloudflare or other WAF/CDN solutions.
*   **Reporting & Scoring:** Generates a comprehensive security score (0-100) and risk level, with actionable recommendations.
*   **Multi-language Support:** UI available in English (EN), Russian (RU), and Uzbek (UZ).

---

## 🛠️ Technology Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React (Icons), React Router
*   **Backend:** Node.js, Express, TypeScript, node-fetch
*   **Build Tool:** Vite, esbuild

---

## ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/cyberaudit.git
    cd cyberaudit
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    The application will start concurrently (Vite dev server + Express API) at `http://localhost:3000`.

4.  **Build for Production:**
    ```bash
    npm run build
    npm start
    ```

---

## 📁 Project Structure

*   `/src`: Frontend React application.
    *   `/components`: Reusable UI components (Scanner, Dashboard, Header).
    *   `/App.tsx`: Main application entry point & routing.
*   `/server.ts`: Express backend server containing the crawling and scanning logic.
    *   `crawl()`: Custom web crawler.
    *   `scanVulnerabilities()`: Active and passive security testing routines.

---

## ⚠️ Disclaimer

**Educational & Authorized Use Only:** This tool is designed for academic research, security auditing, and educational purposes. Do not use this tool against systems you do not own or have explicit permission to test. The authors are not responsible for any misuse or damage caused by this software.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
