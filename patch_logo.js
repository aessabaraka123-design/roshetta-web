const fs = require('fs');
let code = fs.readFileSync('web/src/components/icons.tsx', 'utf8');

const targetSVG = `export const LogoMark = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
    <g transform="rotate(-45 12 12)">
      <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
      <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
    </g>
  </svg>
);`;

const newImg = `export const LogoMark = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="/logo.jpg" 
    alt="Roshetta Logo" 
    className={\`\${className} rounded-lg object-cover shadow-sm bg-white\`} 
  />
);`;

if (code.includes(targetSVG)) {
  code = code.replace(targetSVG, newImg);
  fs.writeFileSync('web/src/components/icons.tsx', code, 'utf8');
  console.log("Replaced LogoMark SVG with img tag");
} else {
  console.log("Could not find LogoMark SVG in icons.tsx");
}
