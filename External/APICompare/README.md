# API Comparator

🚀 **Live Demo:** [https://api-comparator-v3.vercel.app](https://api-comparator-v3.vercel.app)

This is a frontend web application for comparing APIs. It consists of static HTML, CSS, and JavaScript files.

## How to run locally

Since this is a static website, you don't need any complex build steps. You simply need to serve the files using a local web server, or open the `index.html` file directly in your browser.

### Method 1: Using Python (Recommended)
If you have Python installed, you can start a simple local server. This is the recommended approach to avoid any CORS issues that might occur when opening local files directly.

1. Open your terminal or command prompt.
2. Navigate to the project directory:
   ```bash
   cd path/to/APICompare/External/APICompare
   ```
3. Run the following command:
   ```bash
   # For Python 3
   python -m http.server 8000
   ```
4. Open your web browser and go to: `http://localhost:8000`

### Method 2: Using Node.js (npx serve)
If you have Node.js and npm installed:

1. Open your terminal or command prompt.
2. Navigate to the project directory.
3. Run the following command:
   ```bash
   npx serve .
   ```
4. Open your web browser and navigate to the local URL provided in the terminal output (usually `http://localhost:3000`).

### Method 3: VS Code Live Server Extension
If you are using Visual Studio Code:

1. Install the "Live Server" extension by Ritwick Dey.
2. Open the `index.html` file in VS Code.
3. Right-click anywhere in the file and select "Open with Live Server", or click the "Go Live" button in the bottom right corner of the VS Code window.
4. The application will automatically open in your default web browser.

### Method 4: Direct File Open
You can simply double-click the `index.html` file in your file explorer, which will open it in your default web browser (e.g., `file:///C:/.../index.html`). Note that some features like loading external files or saving state might not work perfectly due to browser security restrictions on `file://` URLs.
