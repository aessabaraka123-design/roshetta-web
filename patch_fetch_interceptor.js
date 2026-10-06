const fs = require('fs');

let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

const injection = `
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
      
      if (url && url.includes('/api/') && !url.includes('/api/auth/') && !url.includes('/api/admin/')) {
        init = init || {};
        init.headers = {
          ...init.headers,
          'Authorization': \`Bearer \${useStore.getState().token}\`
        };
        
        if (init.method && ['POST', 'PUT', 'PATCH'].includes(init.method.toUpperCase()) && !(init.body instanceof FormData)) {
          init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
`;

layout = layout.replace('useEffect(() => {', injection);

fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
console.log('Injected window.fetch interceptor for JWT');
