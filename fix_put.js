const fs = require('fs');
let content = fs.readFileSync('roshetta_server/server.js', 'utf8');

const blockRegex = /app\.put\("\/api\/admin\/tickets\/:id", \(req, res\) => \{[\s\S]*?\}\);\n  \}\);/;

content = content.replace(blockRegex, (match) => {
    // We want to keep the closing brackets of the previous block that got eaten
    return '';
});

// Actually, let's just do it manually.
const putStart = content.indexOf('app.put("/api/admin/tickets/:id", (req, res) => {');
if (putStart !== -1) {
    const putEnd = content.indexOf('});', content.indexOf('res.json({ success: true });')) + 3;
    const block = content.substring(putStart, putEnd + 4); // + \n  });
    content = content.replace(block, '');
    
    const properBlock = `
app.put("/api/admin/tickets/:id", (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.run("UPDATE tickets SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});
`;

    const listenIndex = content.indexOf('app.listen(');
    content = content.substring(0, listenIndex) + properBlock + '\n' + content.substring(listenIndex);
    fs.writeFileSync('roshetta_server/server.js', content);
    console.log("Fixed successfully");
} else {
    console.log("Not found");
}
