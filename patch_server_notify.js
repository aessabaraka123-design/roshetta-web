const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  `    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },`,
  `    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      io.to(id).emit('new_notification', { title, body: message, type: 'system_alert' });
      res.json({ success: true });
    },`
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Fixed server.js socket emit for private notifications');
