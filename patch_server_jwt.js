const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

if (!server.includes("jsonwebtoken")) {
  server = server.replace(
    'const express = require("express");',
    `const express = require("express");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "ROSHETTA_SUPER_SECRET_KEY_2026";`
  );
}

// Add JWT validation middleware
if (!server.includes('JWT Auth Middleware')) {
  server = server.replace(
    '// Real-time Sync Middleware',
    `// JWT Auth Middleware
app.use((req, res, next) => {
  // Allow login and register
  if (req.path === "/api/auth/login" || req.path === "/api/auth/register" || req.path.startsWith("/api/admin")) {
    return next();
  }

  // Check if it's a pharmacy route
  const match = req.path.match(/^\\/api\\/pharmacies\\/([a-zA-Z0-9-]+)/);
  if (match) {
    const pharmacyId = match[1];
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing Token" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.pharmacy_id !== pharmacyId && decoded.role !== "superadmin") {
        return res.status(403).json({ success: false, error: "Forbidden: Token mismatch" });
      }
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid Token" });
    }
  }
  
  next();
});

// Real-time Sync Middleware`
  );
}

// 1. Inject token into Register response
server = server.replace(
  /res\.json\(\{\s*success:\s*true,\s*branches:\s*\[[\s\S]*?\],\s*user:\s*\{[\s\S]*?\},\s*\}\);/g,
  (match) => {
    return `const token = jwt.sign({ pharmacy_id: pharmacyId, role: "manager" }, JWT_SECRET, { expiresIn: '30d' });\n        ${match.replace('success: true,', 'success: true, token,')}`;
  }
);

// 2. Inject token into Login response (Staff)
server = server.replace(
  /res\.json\(\{\s*success:\s*true,\s*user:\s*\{\s*id:\s*staff\.id,[\s\S]*?\}\s*\}\);/g,
  (match) => {
    return `const token = jwt.sign({ pharmacy_id: pharmacy.id, role: staff.role }, JWT_SECRET, { expiresIn: '30d' });\n        ${match.replace('success: true,', 'success: true, token,')}`;
  }
);

// 3. Inject token into Login response (Manager)
server = server.replace(
  /res\.json\(\{\s*success:\s*true,\s*user:\s*\{\s*id:\s*user\.id,[\s\S]*?\}\s*\}\);/g,
  (match) => {
    return `const token = jwt.sign({ pharmacy_id: pharmacy.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });\n        ${match.replace('success: true,', 'success: true, token,')}`;
  }
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Backend patched with JWT');
