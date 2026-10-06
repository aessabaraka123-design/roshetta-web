const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const regex = /app\.post\("\/api\/admin\/pharmacies\/:id\/notify"[\s\S]*?res\.json\(\{ success: true \}\);[\s\S]*?\}\);/;

server = server.replace(regex, (match) => {
  return match.replace(
    'res.json({ success: true });',
    `io.to(id).emit("new_notification", { title, body: message, type: "system_alert" });
      res.json({ success: true });`
  );
});

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Fixed notify endpoint via robust regex');
