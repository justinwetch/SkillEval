export function renderOauthCallbackPage(payload: object): string {
  const serialized = JSON.stringify(payload);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>llm-hub OAuth Callback</title>
    <style>
      body { font-family: sans-serif; padding: 24px; line-height: 1.5; }
      pre { background: #f5f5f5; padding: 12px; border-radius: 8px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>Connection result</h1>
    <p>You can close this window and return to your app.</p>
    <pre id="payload"></pre>
    <script>
      const payload = ${serialized};
      document.getElementById('payload').textContent = JSON.stringify(payload, null, 2);
      try {
        if (window.opener) {
          window.opener.postMessage({ source: 'llm-hub-server', payload }, '*');
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ source: 'llm-hub-server', payload }, '*');
        }
      } catch (error) {
        console.error(error);
      }
    </script>
  </body>
</html>`;
}
