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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #fff;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.2);
    }
    h1 { margin-bottom: 10px; font-size: 28px; }
    .school { color: #ffd700; margin-bottom: 20px; }
    p { color: #ccc; line-height: 1.6; margin-bottom: 20px; }
    .info-box {
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 20px;
      text-align: left;
      margin-top: 20px;
    }
    .info-box h3 { margin-bottom: 10px; color: #ffd700; }
    .info-box ol { padding-left: 20px; }
    .info-box li { margin-bottom: 8px; color: #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎓 Canvas GPT</h1>
    <p class="school">${SCHOOL_NAME}</p>
    <p>This service connects ChatGPT to your Canvas account.</p>
    <p>To use it, open the Canvas GPT in ChatGPT and click "Sign in".</p>
    
    <div class="info-box">
      <h3>How it works:</h3>
      <ol>
        <li>Open Canvas GPT in ChatGPT</li>
        <li>Click "Sign in" when prompted</li>
        <li>Paste your Canvas access token</li>
        <li>Start managing your courses!</li>
      </ol>
    </div>
    
    <div class="info-box">
      <h3>🔒 Privacy:</h3>
      <p>Your token is sent directly to ChatGPT. This page does not store any data.</p>
    </div>
  </div>
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #fff;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      border: 1px solid rgba(255,255,255,0.2);
    }
    h1 { text-align: center; margin-bottom: 10px; font-size: 24px; }
    .school { text-align: center; color: #ffd700; margin-bottom: 30px; }
    label { display: block; margin-bottom: 8px; font-weight: 500; }
    input[type="password"] {
      width: 100%;
      padding: 15px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 10px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 16px;
      margin-bottom: 20px;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #ffd700;
    }
    input[type="password"]::placeholder { color: #888; }
    button {
      width: 100%;
      padding: 15px;
      background: #ffd700;
      color: #1a1a2e;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(255,215,0,0.4);
    }
    .help {
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 20px;
      margin-top: 25px;
    }
    .help h3 { margin-bottom: 12px; color: #ffd700; font-size: 16px; }
    .help ol { padding-left: 20px; }
    .help li { margin-bottom: 8px; color: #ccc; font-size: 14px; line-height: 1.5; }
    .help a { color: #ffd700; }
    .security {
      margin-top: 20px;
      padding: 15px;
      background: rgba(0,255,0,0.1);
      border-radius: 10px;
      font-size: 13px;
      color: #8f8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Connect to Canvas</h1>
    <p class="school">${SCHOOL_NAME}</p>
    
    <form action="/callback" method="POST">
      <input type="hidden" name="redirect_uri" value="${redirectUri || ""}">
      <input type="hidden" name="state" value="${state || ""}">
      
      <label for="token">Canvas Access Token</label>
      <input 
        type="password" 
        id="token" 
        name="token" 
        placeholder="Paste your token here" 
        required
        autocomplete="off"
      >
      
      <button type="submit">Connect to Canvas</button>
    </form>
    
    <div class="help">
      <h3>📋 How to get your token:</h3>
      <ol>
        <li>Go to <a href="https://${CANVAS_DOMAIN}" target="_blank">${CANVAS_DOMAIN}</a></li>
        <li>Click <strong>Account</strong> (left sidebar) → <strong>Settings</strong></li>
        <li>Scroll to <strong>Approved Integrations</strong></li>
        <li>Click <strong>+ New Access Token</strong></li>
        <li>Enter purpose: <strong>ChatGPT</strong></li>
        <li>Click <strong>Generate Token</strong></li>
        <li>Copy the token and paste it above</li>
      </ol>
    </div>
    
    <div class="security">
      🔒 Your token is sent directly to ChatGPT. This page does not store any data.
    </div>
  </div>
</body>
</html>`;
}
