const fs = require('fs');
let html = fs.readFileSync('superadmin/index.html', 'utf8');

// 1. App container
html = html.replace(
  '<div id="app" class="hidden h-screen overflow-hidden flex flex-col md:flex-row">',
  '<div id="app" class="hidden h-screen overflow-hidden flex flex-row relative w-full">'
);

// 2. Sidebar + overlay
html = html.replace(
  '<aside\n        class="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col"\n      >',
  `<div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden" onclick="toggleSidebar()"></div>
      <aside id="mobileSidebar" class="fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col transition-transform transform translate-x-full md:translate-x-0 md:static md:w-64">`
);

// 3. Nav layout (always vertical now)
html = html.replace(
  'class="flex-1 px-3 py-4 flex flex-row md:flex-col gap-2 md:gap-0 space-y-0 md:space-y-0.5 overflow-x-auto md:overflow-y-auto"',
  'class="flex-1 px-3 py-4 flex flex-col gap-0 space-y-0.5 overflow-y-auto"'
);

// 4. Header with hamburger button
html = html.replace(
  `          <header
            class="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10"
          >
            <div>`,
  `          <header class="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <div class="flex items-center gap-3">
              <button class="md:hidden p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-50" onclick="toggleSidebar()">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>`
);

// We need to inject the toggleSidebar function in the HTML head or bottom script.
// It's better to put it right at the end of body.
if (!html.includes('function toggleSidebar()')) {
  html = html.replace('</body>', `
    <script>
      function toggleSidebar() {
        const sidebar = document.getElementById("mobileSidebar");
        const overlay = document.getElementById("sidebarOverlay");
        
        if (sidebar.classList.contains("translate-x-full")) {
          sidebar.classList.remove("translate-x-full");
          overlay.classList.remove("hidden");
        } else {
          sidebar.classList.add("translate-x-full");
          overlay.classList.add("hidden");
        }
      }
      
      // Auto close sidebar when clicking a tab on mobile
      document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 768) {
            const sidebar = document.getElementById("mobileSidebar");
            const overlay = document.getElementById("sidebarOverlay");
            sidebar.classList.add("translate-x-full");
            overlay.classList.add("hidden");
          }
        });
      });
    </script>
  </body>`);
}

fs.writeFileSync('superadmin/index.html', html);
console.log('Mobile sidebar applied');
