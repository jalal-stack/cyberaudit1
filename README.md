<div align="center">
  <!-- Replace with actual logo -->
  <img src="docs/assets/logo.png" alt="CyberAudit Logo" width="150" />
  
  <h1>CyberAudit 🛡️</h1>
  
  <p><strong>Open-source automated web security assessment platform for vulnerability detection and security analysis.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/react-18-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/typescript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/express-node.js-green?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License" />
  </p>
  
  <p>
    <em>Topics: <code>cybersecurity</code>, <code>web-security</code>, <code>react</code>, <code>express</code>, <code>vulnerability-scanner</code>, <code>security</code>, <code>owasp</code>, <code>typescript</code></em>
  </p>
</div>

---

## 🎓 Academic Context & AI-Assisted Development

This project was developed as a demonstration of modern cybersecurity concepts and **advanced AI-Assisted Software Engineering**. 

As a prospective student aiming for advanced academic studies in South Korea, my goal was to showcase not just technical coding ability, but **the competent, strategic, and professional use of Artificial Intelligence** in the software development lifecycle (SDLC).

*   **Strategic Human-AI Collaboration:** I conceptualized the system architecture, defined the rigorous security scanning requirements (such as implementing deep multi-page crawling instead of surface-level checks), and directed the entire development process. I utilized AI models as a collaborative "pair-programmer" to accelerate development, refine complex asynchronous logic, and optimize the React/Node.js stack.
*   **Prompt Engineering & Architectural Control:** I acted as the lead architect. Every feature was strictly guided by my prompts, and the generated code was reviewed, debugged, and integrated by me to ensure security, performance, and architectural integrity.
*   **Modern Engineering Practices:** This project highlights my ability to formulate precise technical instructions, manage complex state in a full-stack environment, and leverage cutting-edge AI tools to build scalable, real-world applications.

This approach reflects the future of computer science and software engineering: combining human domain knowledge and critical thinking with AI capabilities to build robust systems efficiently.

---

## 📸 Screenshots

*(Add real screenshots to `docs/assets/` directory before pushing to GitHub)*

| Dashboard | Scan Results |
| :---: | :---: |
| <img src="docs/assets/dashboard.png" alt="Dashboard placeholder" width="400"/> | <img src="docs/assets/scan-results.png" alt="Scan Results placeholder" width="400"/> |
| **Security Report** | **Vulnerability Details** |
| <img src="docs/assets/security-report.png" alt="Security Report placeholder" width="400"/> | <img src="docs/assets/vuln-details.png" alt="Vulnerability Details placeholder" width="400"/> |

---

## 🚀 Features

*   **Deep Crawling Engine:** Scans up to 50 pages per target domain to ensure a full-scope assessment rather than just homepage analysis.
*   **Vulnerability Detection:**
    *   **Cross-Site Scripting (XSS):** Tests for input reflection and missing CSP headers.
    *   **SQL Injection (SQLi):** Detects standard SQL database error messages.
    *   **CORS Misconfigurations:** Identifies overly permissive Cross-Origin Resource Sharing policies.
    *   **Sensitive Data Exposure:** Checks for exposed `.env`, `.git/config`, and `docker-compose.yml` files.
    *   **Admin Panel Discovery:** Scans for common administrative interfaces.
*   **Infrastructure & Reconnaissance:**
    *   **HTTP Security Headers:** Analyzes the presence of security-critical headers (HSTS, CSP, X-Frame-Options, etc.).
    *   **Technology & CMS Fingerprinting:** Detects frameworks, CMS, Web Servers, and JS libraries based on deep DOM and header inspection.
    *   **SSL/TLS Analysis:** Validates certificate issuer, expiry, and supported TLS versions.
    *   **Port Scanning:** Checks standard web and management ports.
    *   **DDoS Protection Identification:** Detects the presence of Cloudflare or other WAF/CDN solutions.
*   **Reporting & Scoring:** Generates a comprehensive security score (0-100) and risk level, with actionable recommendations.
*   **Multi-language Support:** UI available in English (EN), Russian (RU), and Uzbek (UZ).

---

## ⚙️ Installation

To run the project locally, ensure you have **Node.js** (v18+) installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/cyberaudit.git
    cd cyberaudit
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application (Development Mode):**
    ```bash
    npm run dev
    ```
    *This single command starts both the Express API backend and the Vite React frontend concurrently.* The application will be accessible at `http://localhost:3000`.

4.  *(Optional)* **Build for Production:**
    ```bash
    npm run build
    npm start
    ```

---

## 📁 Project Structure

```text
cyberaudit/
├── src/                  # React Frontend
│   ├── components/       # Reusable UI components (Dashboard, Scanner, etc.)
│   ├── App.tsx           # Main application entry point & routing
│   ├── index.css         # Tailwind CSS global styles
│   └── types.ts          # TypeScript interfaces
├── docs/                 # Documentation and assets (Screenshots, Architecture)
│   └── assets/           # Images, Logos, and Demo videos
├── server.ts             # Express Backend & Scanning Engine (Crawler, Security logic)
├── package.json          # Project dependencies & scripts
├── vite.config.ts        # Vite bundler configuration
└── .env.example          # Environment variables template
```

---

## 🗺️ Roadmap

- [x] **Current Version:** Deep Crawling & Basic Vulnerability Scanning
- [x] **Multi-language Support:** EN, RU, UZ capabilities
- [ ] **AI Risk Analysis:** Integration with LLMs for intelligent vulnerability contextualization
- [ ] **CVE Integration:** Real-time checking of software versions against the National Vulnerability Database (NVD)
- [ ] **PDF Export:** Downloadable professional security audit reports
- [ ] **REST API:** Open API endpoints for third-party integration

---

## 🎥 Demo Video

*(Link your demo video here showing the application in action)*

[Watch the Demo Video on YouTube](#)

---

## ⚠️ Disclaimer

**Educational & Authorized Use Only:** This tool is designed for academic research, security auditing, and educational purposes. Do not use this tool against systems you do not own or have explicit permission to test. The authors are not responsible for any misuse or damage caused by this software.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
