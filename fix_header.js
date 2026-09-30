const fs = require('fs');
let html = fs.readFileSync('superadmin/index.html', 'utf8');

const targetHeader = `<h2 id="pageTitle"`;

html = html.replace(
  targetHeader,
  `<div class="flex items-center gap-3 md:gap-0">
                <button class="md:hidden p-2 -mr-2 ml-2 text-slate-500 rounded-lg hover:bg-slate-50" onclick="toggleSidebar()">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 id="pageTitle"`
);

// Close the div after the pageSub p tag
html = html.replace(
  `</p>\n            </div>`,
  `</p>\n              </div>\n            </div>`
);

fs.writeFileSync('superadmin/index.html', html);
console.log('Hamburger menu added!');
