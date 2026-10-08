const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  `       db.run("COMMIT", (err2) => {
          if (err2) return handleError(res, err2);
          res.json({ success: true });
       });
    }
  });
});
      res.json({ success: true, sales: rows });
    }
  );
});`,
  `       db.run("COMMIT", (err2) => {
          if (err2) return handleError(res, err2);
          res.json({ success: true });
       });
    }
  });
});

app.delete("/api/pharmacies/:id/suppliers/:suppId", (req, res) => {
  const { id: pharmacy_id, suppId } = req.params;
  db.run(
    "DELETE FROM suppliers WHERE id = ? AND pharmacy_id = ?",
    [suppId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );

  // ==========================================
  // Notifications Endpoints
  // ==========================================
});`
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Restored deleted logic");
