// ==========================================
// Subscription Plans API
// ==========================================
app.get("/api/admin/subscription-plans", (req, res) => {
  db.all("SELECT * FROM subscription_plans ORDER BY durationMonths ASC", (err, rows) => {
    if (err) return handleError(res, err);
    res.json({ success: true, plans: rows });
  });
});

app.post("/api/admin/subscription-plans", (req, res) => {
  const { id, name, price, oldPrice, features, durationMonths, isActive } = req.body;
  const planId = id || "plan_" + Date.now();
  db.run(
    "INSERT INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [planId, name, price, oldPrice || null, JSON.stringify(features || []), durationMonths || 1, isActive !== undefined ? isActive : 1],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true, id: planId });
    }
  );
});

app.put("/api/admin/subscription-plans/:id", (req, res) => {
  const { name, price, oldPrice, features, durationMonths, isActive } = req.body;
  db.run(
    "UPDATE subscription_plans SET name = ?, price = ?, oldPrice = ?, features = ?, durationMonths = ?, isActive = ? WHERE id = ?",
    [name, price, oldPrice || null, JSON.stringify(features || []), durationMonths || 1, isActive !== undefined ? isActive : 1, req.params.id],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/admin/subscription-plans/:id", (req, res) => {
  db.run("DELETE FROM subscription_plans WHERE id = ?", [req.params.id], (err) => {
    if (err) return handleError(res, err);
    res.json({ success: true });
  });
});
