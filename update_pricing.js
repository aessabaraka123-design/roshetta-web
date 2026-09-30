const fs = require('fs');
let code = fs.readFileSync('web/src/app/pricing/page.tsx', 'utf8');

// 1. Update the map loop to add theme-{id} classes
code = code.replace(
  '<div key={p.id} className={card \}>',
  '<div key={p.id} className={card theme-\ \}>'
);

code = code.replace(
  '<button onClick={() => router.push(/register?plan=\)} className={cta \}>',
  '<button onClick={() => router.push(/register?plan=\)} className={cta theme-\}>'
);

// 2. Add the CSS rules
const cssInjection = \
    /* Custom Themes */
    .card.theme-free { background: var(--paper); border: 1px solid var(--line); }
    .cta.theme-free { background: var(--sage); color: #fff; box-shadow: 0 14px 30px -12px rgba(111,163,201,0.65); border: none; }
    
    .card.theme-monthly { background: linear-gradient(180deg, #FFFFFF 0%, #E8F4FA 100%); border: 1px solid var(--sage-soft); }
    .cta.theme-monthly { background: var(--deep); color: #fff; box-shadow: 0 14px 30px -12px rgba(27,58,92,0.5); border: none; }
    
    .card.featured.theme-annual { background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%); }
    .card.featured.theme-annual .ribbon { background: linear-gradient(135deg, var(--gold), #B8853F); color: #fff; }
    .cta.theme-annual { background: linear-gradient(135deg, var(--gold), #B8853F); color: #fff; box-shadow: 0 14px 30px -12px rgba(199,154,87,0.65); border: none; }
    
    .card.featured.theme-lifetime { 
      background: linear-gradient(180deg, #0B1724 0%, #060D15 100%); 
      box-shadow: 0 35px 80px -25px rgba(10,21,35,0.8); 
    }
    .card.featured.theme-lifetime .ribbon { background: linear-gradient(135deg, #1BB896, #0D8268); color: #fff; }
    .card.featured.theme-lifetime:hover { box-shadow: 0 45px 90px -20px rgba(27,184,150,0.25); transform: translateY(-19px); }
    .card.featured.theme-lifetime .plan-name { color: #E8F5F2; }
    .card.featured.theme-lifetime .price .cur { color: #1BB896; }
    .card.featured.theme-lifetime .check { background: rgba(27,184,150,0.15); border-color: transparent; }
    .card.featured.theme-lifetime .check svg path { stroke: #1BB896; }
    .cta.theme-lifetime { background: linear-gradient(135deg, #1BB896, #0D8268); color: #fff; box-shadow: 0 14px 30px -12px rgba(27,184,150,0.5); border: none; }
    
    footer{
\;

code = code.replace('footer{', cssInjection);

fs.writeFileSync('web/src/app/pricing/page.tsx', code);
console.log('done');
