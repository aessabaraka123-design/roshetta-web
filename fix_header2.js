const fs = require('fs');
let html = fs.readFileSync('superadmin/index.html', 'utf8');

// The current malformed block:
/*
            <div>
              <div class="flex items-center gap-3 md:gap-0">
                <button class="md:hidden p-2 -mr-2 ml-2 text-slate-500 rounded-lg hover:bg-slate-50" onclick="toggleSidebar()">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 id="pageTitle" class="text-lg font-bold">«·—∆Ì”Ì…</h2>
              <p id="pageSub" class="text-xs text-slate-400 mt-0.5">
                ...
              </p>
              </div>
            </div>
*/

// Let's rewrite it cleanly
const start = html.indexOf('<header');
const end = html.indexOf('<div class="flex items-center gap-3">', start);
if (start !== -1 && end !== -1) {
  const newHeader = \          <header
            class="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10"
          >
            <div class="flex items-center gap-4">
              <button class="md:hidden p-2 -mr-2 text-slate-500 rounded-lg hover:bg-slate-50" onclick="toggleSidebar()">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 id="pageTitle" class="text-lg font-bold">«·—∆Ì”Ì…</h2>
                <p id="pageSub" class="text-xs text-slate-400 mt-0.5">
                  ‰Ÿ—… ⁄«„… ⁄·Ï «·‰Ÿ«„
                </p>
              </div>
            </div>
            \;
  html = html.substring(0, start) + newHeader + html.substring(end);
  fs.writeFileSync('superadmin/index.html', html);
  console.log('Header fixed properly');
}
