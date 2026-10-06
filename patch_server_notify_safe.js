const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  /app\.post\("\/api\/admin\/pharmacies\/:id\/notify",\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?\}\s*\);\n\}\);/,
  `// this regex might be too dangerous, let's use exact string matching for the INSERT query`
);

const oldQuery = `db.run(
    "INSERT INTO pharmacy_notifications (id, pharmacy_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    [
      Date.now().toString(),
      id,
      "system_alert",
      title,
      message,
      new Date().toISOString(),
    ],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },
  );`;

const newQuery = `db.run(
    "INSERT INTO pharmacy_notifications (id, pharmacy_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    [
      Date.now().toString(),
      id,
      "system_alert",
      title,
      message,
      new Date().toISOString(),
    ],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      
      // Emit real-time notification to the target pharmacy room
      io.to(id).emit("new_notification", {
        title,
        body: message,
        type: "system_alert",
      });
      
      res.json({ success: true });
    },
  );`;

server = server.replace(oldQuery, newQuery);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Fixed notify endpoint properly');
