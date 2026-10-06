const fs = require('fs');
let c = fs.readFileSync('web/src/components/SocketProvider.tsx', 'utf8');

c = c.replace('const user = useStore((state) => state.user);', 'const user = useStore((state) => state.user);\n  const language = useStore((state: any) => state.language);');

fs.writeFileSync('web/src/components/SocketProvider.tsx', c, 'utf8');
console.log('Fixed SocketProvider language variable');
