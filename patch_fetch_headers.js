const fs = require('fs');

let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

const oldInterceptor = `        init = init || {};
        init.headers = {
          ...init.headers,
          'Authorization': \`Bearer \${useStore.getState().token}\`
        };
        
        if (init.method && ['POST', 'PUT', 'PATCH'].includes(init.method.toUpperCase()) && !(init.body instanceof FormData)) {
          init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
        }`;

const newInterceptor = `        init = init || {};
        const headers = new Headers(init.headers);
        headers.set('Authorization', \`Bearer \${useStore.getState().token}\`);
        
        if (init.method && ['POST', 'PUT', 'PATCH'].includes(init.method.toUpperCase()) && !(init.body instanceof FormData)) {
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }
        init.headers = headers;`;

layout = layout.replace(oldInterceptor, newInterceptor);

fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
console.log('Fixed Headers handling in fetch interceptor');
