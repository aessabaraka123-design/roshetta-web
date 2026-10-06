const fs = require('fs');

let store = fs.readFileSync('web/src/store/index.ts', 'utf8');

if (!store.includes("token: string | null")) {
  store = store.replace(
    'user: User | null;',
    'user: User | null;\n  token: string | null;'
  );

  store = store.replace(
    'login: (user: User) => void;',
    'login: (user: User, token?: string) => void;'
  );

  store = store.replace(
    'user: null,',
    'user: null,\n      token: null,'
  );

  store = store.replace(
    'login: (user) => set({ user }),',
    'login: (user, token) => set({ user, token }),'
  );

  store = store.replace(
    'logout: () => set({ user: null, posCart: [] }),',
    'logout: () => set({ user: null, token: null, posCart: [] }),'
  );

  fs.writeFileSync('web/src/store/index.ts', store, 'utf8');
  console.log('Fixed store.ts to include token');
}

let loginFile = fs.readFileSync('web/src/app/login/page.tsx', 'utf8');
if (!loginFile.includes('loginFn(data.user, data.token)')) {
  loginFile = loginFile.replace(
    'loginFn(data.user);',
    'loginFn(data.user, data.token);'
  );
  fs.writeFileSync('web/src/app/login/page.tsx', loginFile, 'utf8');
  console.log('Fixed login/page.tsx to pass token');
}

let registerFile = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');
if (!registerFile.includes('loginFn(data.user, data.token)')) {
  registerFile = registerFile.replace(
    'loginFn(data.user);',
    'loginFn(data.user, data.token);'
  );
  fs.writeFileSync('web/src/app/register/page.tsx', registerFile, 'utf8');
  console.log('Fixed register/page.tsx to pass token');
}
