const fetch = require('node-fetch');

(async () => {
  // Try to read token from local storage or mock API? The API needs auth.
  // We don't have auth easily. But maybe we can just grep the mock server source if it's local?
  // Prism mock server is at https://app.didattica.polito.it/mock/api
  // Let's just fetch from it directly using the exact URL without auth, as it might ignore auth for mock data, or maybe it needs a fake token.
  try {
    const r = await fetch('https://app.didattica.polito.it/mock/api/lectures', {
      headers: { Authorization: "Bearer test", 'Accept-Language': 'en' }
    });
    const c = await r.text();
    console.log(c.substring(0, 1000));
  } catch(e) { console.error(e); }
})();
