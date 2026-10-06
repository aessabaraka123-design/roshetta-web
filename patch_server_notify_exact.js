const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// The exact block for the notify endpoint
const targetBlock = `    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },
  );
});

// ══════════════════════════════════════════════════
// 🏷️ سعر VIP مخصص لصيدلية`;

const newBlock = `    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      
      io.to(id).emit("new_notification", {
        title,
        body: message,
        type: "system_alert"
      });
      
      res.json({ success: true });
    },
  );
});

// ══════════════════════════════════════════════════
// 🏷️ سعر VIP مخصص لصيدلية`;

server = server.replace(targetBlock, newBlock);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Fixed notify endpoint properly via explicit block matching');
