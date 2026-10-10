const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const portDeclaration = `
const PORT = process.env.PORT || 3001;
const IP = process.env.IP || '0.0.0.0';
`;

code = code.replace('const app = express();', portDeclaration + '\nconst app = express();');

const genericStr = `const genericParsedRoutes = [
  {
    path: "inventory",
    table: "inventory",
    order: "name ASC",
    resKey: "inventory",
  },
  {
    path: "purchase-invoices",
    table: "purchase_invoices",
    order: "date DESC",
    resKey: "invoices",
  },
];

genericParsedRoutes.forEach((route) => {
  app.get(\`/api/pharmacies/:id/\${route.path}\`, (req, res) => {
    db.all(
      \`SELECT * FROM \${route.table} WHERE pharmacy_id = ? ORDER BY \${route.order}\`,
      [req.params.id],
      (err, rows) => {
        if (err) return handleError(res, err);
        const parsed = (rows || []).map((r) => {
          if (r.items) {
            try {
              r.items = JSON.parse(r.items);
            } catch (e) {}
          }
          return r;
        });
        res.json({
          success: true,
          [route.resKey]: parsed,
        });
      },
    );
  });
});`;

code = code.replace(genericStr, "");

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Fixed PORT and removed genericParsedRoutes safely.');
