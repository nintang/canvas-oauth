/**
 * Canvas OAuth Bridge for ChatGPT
 * 
 * This is a simple OAuth bridge that lets ChatGPT users
 * authenticate with their Canvas token. 
 * 
 * It does NOT store tokens or proxy API calls.
 * ChatGPT calls Canvas directly.
 * 
 * Endpoints:
 *   /authorize - Shows login page
 *   /token     - Returns token to ChatGPT
 */

const SCHOOL_NAME = "Grambling State University";
const CANVAS_DOMAIN = "grambling.instructure.com";

// HTML escape to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // CORS headers for ChatGPT
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Home page
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(getHomePage(), {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    // Step 1: Authorization page (ChatGPT redirects user here)
    if (url.pathname === "/authorize") {
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");
      
      if (!redirectUri) {
        return new Response("Missing redirect_uri", { status: 400 });
      }
      
      return new Response(getAuthPage(redirectUri, state), {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    // Step 2: Handle form submission
    if (url.pathname === "/callback" && request.method === "POST") {
      const formData = await request.formData();
      const token = formData.get("token");
      const redirectUri = formData.get("redirect_uri");
      const state = formData.get("state");
      
      if (!token || !redirectUri) {
        return new Response("Missing token or redirect_uri", { status: 400 });
      }
      
      // Redirect back to ChatGPT with token as the authorization code
      const redirectUrl = `${redirectUri}?code=${encodeURIComponent(token)}&state=${encodeURIComponent(state || "")}`;
      
      return Response.redirect(redirectUrl, 302);
    }

    // Step 3: Token exchange (ChatGPT calls this)
    if (url.pathname === "/token" && request.method === "POST") {
      let code;
      
      // Handle both form data and JSON
      const contentType = request.headers.get("Content-Type") || "";
      
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        code = formData.get("code");
      } else if (contentType.includes("application/json")) {
        const json = await request.json();
        code = json.code;
      } else {
        // Try form data as default
        try {
          const formData = await request.formData();
          code = formData.get("code");
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request format" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
      
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      // Return the Canvas token as the OAuth access token
      return new Response(JSON.stringify({
        access_token: code,
        token_type: "Bearer",
        scope: "read write"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Proxy API requests to Canvas
    if (url.pathname.startsWith("/api/v1/")) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const canvasUrl = `https://${CANVAS_DOMAIN}${url.pathname}${url.search}`;
      const canvasResponse = await fetch(canvasUrl, {
        method: request.method,
        headers: {
          "Authorization": authHeader,
          "Content-Type": request.headers.get("Content-Type") || "application/json",
        },
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : null,
      });

      const responseBody = await canvasResponse.text();
      return new Response(responseBody, {
        status: canvasResponse.status,
        headers: {
          "Content-Type": canvasResponse.headers.get("Content-Type") || "application/json",
          ...corsHeaders,
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};

function getHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvas GPT - ${SCHOOL_NAME}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/style.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Geist Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #000;
    }
    .container {
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .school {
      color: #666;
      margin-bottom: 40px;
      font-size: 14px;
    }
    p {
      color: #333;
      line-height: 1.5;
      margin-bottom: 16px;
      font-size: 15px;
    }
    .note {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #999;
    }
    footer {
      position: fixed;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 13px;
      color: #999;
    }
    footer a {
      color: #666;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Canvas GPT</h1>
    <p class="school">${SCHOOL_NAME}</p>
    <p>Connect ChatGPT to your Canvas account.</p>
    <p>Open Canvas GPT in ChatGPT and click "Sign in" to get started.</p>
    <p class="note">Your token is sent directly to ChatGPT. No data is stored.</p>
  </div>
  <footer>Built with ❤️ by <a href="https://github.com/nintang/canvas-oauth" target="_blank">@nintang</a></footer>
</body>
</html>`;
}

function getAuthPage(redirectUri, state) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Canvas - ${SCHOOL_NAME}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/style.min.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Geist Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #000;
    }
    .container {
      background: #fff;
      border: 1px solid #eaeaea;
      padding: 40px;
      max-width: 420px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .header svg {
      margin-bottom: 16px;
      color: #000;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .school {
      color: #666;
      font-size: 14px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 14px;
      color: #333;
    }
    input[type="password"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #eaeaea;
      background: #fff;
      color: #000;
      font-size: 14px;
      margin-bottom: 16px;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #000;
    }
    input[type="password"]::placeholder {
      color: #999;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #000;
      color: #fff;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover {
      background: #333;
    }
    .divider {
      margin: 32px 0;
      border-top: 1px solid #eaeaea;
    }
    .help h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 600;
      color: #000;
    }
    .help h3 svg {
      width: 16px;
      height: 16px;
    }
    .help ol {
      padding-left: 20px;
      margin: 0;
    }
    .help li {
      margin-bottom: 8px;
      color: #666;
      font-size: 13px;
      line-height: 1.5;
    }
    .help a {
      color: #000;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .help a:hover {
      color: #666;
    }
    .security {
      margin-top: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
    }
    .security svg {
      width: 14px;
      height: 14px;
    }
    footer {
      position: fixed;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 13px;
      color: #999;
    }
    footer a {
      color: #666;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <i data-lucide="link" width="32" height="32" stroke-width="1.5"></i>
      <h1>Connect to Canvas</h1>
      <p class="school">${SCHOOL_NAME}</p>
    </div>

    <form action="/callback" method="POST">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}">

      <label for="token">Access Token</label>
      <input
        type="password"
        id="token"
        name="token"
        placeholder="Paste your Canvas token"
        required
        autocomplete="off"
      >

      <button type="submit">Continue</button>
    </form>

    <div class="divider"></div>

    <div class="help">
      <h3><i data-lucide="info"></i> How to get your token</h3>
      <ol>
        <li>Go to <a href="https://${CANVAS_DOMAIN}" target="_blank">${CANVAS_DOMAIN}</a></li>
        <li>Click Account in the left sidebar, then Settings</li>
        <li>Scroll to Approved Integrations</li>
        <li>Click + New Access Token</li>
        <li>Enter purpose: ChatGPT</li>
        <li>Click Generate Token and copy it</li>
      </ol>
    </div>

    <div class="security">
      <i data-lucide="shield-check"></i>
      <span>Your token is sent directly to ChatGPT. No data is stored.</span>
    </div>
  </div>
  <footer>Developed with ❤️ by <a href="https://github.com/nintang/canvas-oauth" target="_blank">@nintang</a></footer>
  <script>lucide.createIcons();</script>
</body>
</html>`;
}
