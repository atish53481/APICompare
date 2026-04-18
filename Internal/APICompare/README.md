# API Comparator — Migration Validator v3

A professional-grade tool for validating API migration parity with rich aesthetics, robust auth support, and deep JSON diffing.

## 🎯 Background & Problem Statement

**The Context**
We are actively migrating our systems from an **Outsystems** monolithic architecture to **.NET microservices**. As part of this transition, it is critical that the new service delivery APIs maintain the *exact same behavior and functionality* as the legacy endpoints. Essentially, for any given endpoint, **Request A (Old Outsystems API)** must produce the exact same data as **Request B (New .NET API)**.

**The Problem**
Manually verifying two separate APIs during migration is a highly tedious process. Hitting both endpoints, comparing massive JSON payloads by eye or with disorganized tools, and then manually composing validation reports takes an enormous amount of time and effort.

**The Solution**
This application was built to easily sort out the complexity of API parity testing. It automates the simultaneous execution of both APIs, performs deep, side-by-side behavioral assertions (JSON diffing), and automatically generates shareable migration reports—drastically reducing migration effort and human error.
## 🚀 How to Start

Choose the method that works best for your machine:

### Method 1: The Easiest Way (Windows Only)
Simply **double-click** the file named:
`Start_API_Comparator.bat`
*This starts the custom Node.js server and enables **Postman Mode** (CORS-bypass).*

### Method 2: Using Node.js (Manual)
1. Open your terminal in this folder.
2. Run:
```bash
npm start
```
*Access at:* http://localhost:7788

### Method 3: Using Python
Open your terminal in this folder and run:
```bash
python -m http.server 7788
```
*Access at:* http://localhost:7788

---

## 🔐 Key Features
- **Independent Card Imports**: Import cURL or Postman JSON directly into API 1 or API 2.
- **Multiple Auth Types**: Supports Bearer, Basic, API Key, OAuth 2.0 (Auto-fetch), and JWT (HMAC).
- **Direct API Testing**: Send requests to individual APIs from within the tool.
- **Detailed JSON Diff**: Side-by-side comparison with smart delta detection.
- **Markdown Reporting**: Clean, ready-to-share migration validation reports.

## 📁 File Structure
- `index.html`: Main UI & structure.
- `app.js`: Application logic & auth handlers.
- `styles.css`: Glassmorphism design system.
- `package.json`: Node.js startup configuration.

---
**Project Path:** `c:\Users\atish\Documents\Companyworks\APICompare`
