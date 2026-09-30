const fs = require('fs');
let code = fs.readFileSync('C:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_server/server.js', 'utf8');

code = code.replace(/monthlyPrice = \?, annualPrice = \?, lifetimePrice = \?, monthlyOldPrice = \?, annualOldPrice = \?, lifetimeOldPrice = \?,\s*/g, "");
code = code.replace(/monthlyPrice !== undefined && monthlyPrice !== null && monthlyPrice !== \"\" \? monthlyPrice : 49,/g, "");
code = code.replace(/annualPrice !== undefined && annualPrice !== null && annualPrice !== \"\" \? annualPrice : 499,/g, "");
code = code.replace(/lifetimePrice !== undefined && lifetimePrice !== null && lifetimePrice !== \"\" \? lifetimePrice : 1499,/g, "");
code = code.replace(/monthlyOldPrice \|\| null,/g, "");
code = code.replace(/annualOldPrice \|\| null,/g, "");
code = code.replace(/lifetimeOldPrice \|\| null,/g, "");

fs.writeFileSync('C:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_server/server.js', code, 'utf8');
