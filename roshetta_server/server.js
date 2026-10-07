const express = require("express");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "ROSHETTA_SUPER_SECRET_KEY_2026";
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname);
    if (!ext) ext = ".jpg";
    cb(null, "receipt_" + uniqueSuffix + ext);
  },
});
const upload = multer({
  storage: storage,
});
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected via Socket.io:", socket.id);
  socket.on("join_pharmacy", (pharmacyId) => {
    socket.join(pharmacyId);
    console.log("Socket", socket.id, "joined pharmacy room:", pharmacyId);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Helper function to emit sync updates
const emitSyncUpdate = (pharmacyId, action, data = {}) => {
  io.to(pharmacyId).emit("sync_update", {
    action,
    ...data,
    timestamp: Date.now(),
  });
};

// ==========================================
// Automated Backup System (Telegram + Local)
// ==========================================
const cron = require("node-cron");
const axios = require("axios");
const FormData = require("form-data");
const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const TELEGRAM_BOT_TOKEN = "8595340052:AAG-BJlDwY00jt4rK30Z4Oe6rnQEjBqY6mk";
const TELEGRAM_CHAT_ID = "5301822155";

async function sendBackupToTelegram(filePath, fileName) {
  try {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("document", fs.createReadStream(filePath), fileName);
    form.append("caption", "Backup: " + new Date().toLocaleString());

    await axios.post(
      "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendDocument",
      form,
      {
        headers: form.getHeaders(),
      },
    );
    console.log("? Backup sent to Telegram successfully!");
  } catch (error) {
    console.error("? Telegram Backup failed:", error.message);
  }
}

// Run backup every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  console.log("Starting daily backup...");
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = "database_backup_" + date + "_" + time + ".sqlite";
  const backupFilePath = path.join(backupDir, backupFileName);

  fs.copyFile(path.join(__dirname, "roshetta.db"), backupFilePath, (err) => {
    if (err) {
      console.error("Local Backup failed:", err);
    } else {
      console.log("Local Backup completed successfully: " + backupFileName);
      sendBackupToTelegram(backupFilePath, backupFileName);
      fs.readdir(backupDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        files.forEach((file) => {
          if (!file.endsWith(".sqlite")) return;
          const filePath = path.join(backupDir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtime.getTime() > sevenDays) {
              fs.unlink(filePath, (err) => {
                if (!err) console.log("Deleted old local backup: " + file);
              });
            }
          });
        });
      });
    }
  });
});

const handleNotFound = (res) =>
  res.status(404).json({ success: false, error: "Not found" });

const handleError = (res, err) =>
  res.status(500).json({ success: false, error: err.message });

app.use(cors());

// ==========================================
// SECURITY & PERFORMANCE UPGRADES
// ==========================================
app.use(helmet());
app.use(compression()); // Gzip all responses

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// JWT Auth Middleware (Soft Mode)
app.use((req, res, next) => {
  // Allow login and register
  if (req.path === "/api/auth/login" || req.path === "/api/auth/register" || req.path.startsWith("/api/admin")) {
    return next();
  }

  // Check if it's a pharmacy route
  const match = req.path.match(/^\/api\/pharmacies\/([a-zA-Z0-9-]+)/);
  if (match) {
    const pharmacyId = match[1];
    const authHeader = req.headers.authorization;
    
    // SOFT MODE: If no token or invalid token, we allow the request to pass 
    // to keep the mobile app and existing sessions working.
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.includes("null") || authHeader.includes("undefined")) {
      return next(); 
    }
    
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.pharmacy_id === pharmacyId || decoded.role === "superadmin") {
        req.user = decoded;
      }
      return next();
    } catch (err) {
      // SOFT MODE: Ignore invalid tokens for now
      return next();
    }
  }
  
  next();
});

// Real-time Sync Middleware
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    // Check if the path belongs to a pharmacy
    const match = req.path.match(/^\/api\/pharmacies\/([^\/]+)/);
    if (match) {
      const pharmacyId = match[1];
      const originalJson = res.json;
      res.json = function (data) {
        if (data && data.success) {
          emitSyncUpdate(pharmacyId, "auto_update", {
            method: req.method,
            path: req.path,
          });
        }
        return originalJson.call(this, data);
      };
    }
  }
  next();
});

let GLOBAL_MAINTENANCE = false;

// Admin Auth Middleware
app.use("/api/admin", (req, res, next) => {
  if (
    req.path === "/login" ||
    (req.path === "/settings" && req.method === "GET")
  )
    return next();

  // Allow mobile app (which doesn't send x-admin-id) to access its own pharmacy data
  const match = req.path.match(/^\/pharmacies\/([a-zA-Z0-9-]+)/);
  if (match) return next();

  const adminId = req.headers["x-admin-id"];
  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  db.get(
    "SELECT * FROM platform_staff WHERE id = ?",
    [adminId],
    (err, admin) => {
      if (err || !admin) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.admin = admin;
      next();
    },
  );
});

app.use((req, res, next) => {
  if (GLOBAL_MAINTENANCE && !req.path.startsWith("/api/admin")) {
    if (req.path === "/api/auth/login") {
      // Allow super admin to pass if GLOBAL_MAINTENANCE is true, we must check DB manually
      // Actually, since we're outside DB init here, we can use the db object if it's ready,
      // but db might not be fully initialized on first ms. However, login happens later.
      return db.get(
        "SELECT * FROM platform_staff WHERE email = ? AND password = ?",
        [req.body.email, req.body.password],
        (err, admin) => {
          if (admin) return next();
          return res.status(503).json({
            success: false,
            error:
              "النظام حالياً مغلق للصيانة والتحديثات. يرجى المحاولة لاحقاً.",
            isMaintenance: true,
          });
        },
      );
    }
    return res.status(503).json({
      success: false,
      error: "النظام حالياً في وضع الصيانة.",
      isMaintenance: true,
    });
  }
  next();
});

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, "roshetta.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error opening db:", err);
  else
    db.serialize(() => {

  // ==========================================
  // DATABASE PERFORMANCE UPGRADES (INDEXES)
  // ==========================================
  db.run("CREATE INDEX IF NOT EXISTS idx_inventory_pharmacy ON inventory(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_users_pharmacy ON users(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_patients_pharmacy ON patients(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tickets_pharmacy ON tickets(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_expenses_pharmacy ON expenses(pharmacy_id, date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_subscription_requests_pharmacy ON subscription_requests(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_branches_pharmacy ON branches(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_staff_pharmacy ON staff(pharmacy_id)");

      // Pharmacies Table â€” ظƒظ„ طµظٹط¯ظ„ظٹط© ظ„ظ‡ط§ ط³ط¬ظ„ ظ‡ظ†ط§
      db.run(
        `
    CREATE TABLE IF NOT EXISTS pharmacies (
      id TEXT PRIMARY KEY,
      name TEXT,
      subscriptionType TEXT DEFAULT 'basic',
      subscriptionExpiry TEXT,
      createdAt TEXT,
      totalPaid REAL DEFAULT 0,
      phone TEXT
    )
  `,
        (err) => {
          if (!err) {
            const cols = [
              "totalPaid REAL DEFAULT 0",
              "phone TEXT",
              "receiptFooter TEXT",
              "printerSize TEXT DEFAULT '80mm'",
              "showLogo INTEGER DEFAULT 1",
              "isReadOnly INTEGER DEFAULT 0",
            ];
            cols.forEach((c) =>
              db.run(`ALTER TABLE pharmacies ADD COLUMN ${c}`, () => {}),
            );
          }
        },
      );
      db.run(
        'ALTER TABLE sales ADD COLUMN status TEXT DEFAULT "completed"',
        () => {},
      );
      db.run("ALTER TABLE sales ADD COLUMN receiptImage TEXT", () => {});
      db.run("ALTER TABLE sales ADD COLUMN prescriptionId TEXT", () => {});
      db.run(
        "ALTER TABLE subscription_requests ADD COLUMN transferName TEXT",
        () => {},
      );
      db.run(
        "ALTER TABLE subscription_requests ADD COLUMN transferRef TEXT",
        () => {},
      );
      db.run(
        "ALTER TABLE purchase_invoices ADD COLUMN branch_id TEXT",
        () => {},
      );

      // Users Table â€” ط§ظ„ظ…ط¯ظٹط± ظˆط§ظ„ظ…ظˆط¸ظپظˆظ† ظ…ط±طھط¨ط·ظˆظ† ط¨ظ€ pharmacy_id
      db.run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password TEXT,
      role TEXT DEFAULT 'pharmacist',
      managerName TEXT,
      pharmacy_id TEXT,
      FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id)
    )
  `);

      // Inventory Table â€” ظ…ط±طھط¨ط· ط¨طµظٹط¯ظ„ظٹط© ظ…ط­ط¯ط¯ط©
      db.run(
        `
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      barcode TEXT,
      name TEXT,
      scientificName TEXT,
      category TEXT,
      price REAL,
      cost REAL,
      qty INTEGER DEFAULT 0,
      minQty INTEGER DEFAULT 5,
      expiry TEXT,
      lastSaleDate TEXT,
      syncStatus TEXT DEFAULT 'synced'
    )
  `,
        (err) => {
          if (!err) {
            const cols = [
              "lastSaleDate TEXT",
              "isControlled INTEGER DEFAULT 0",
              "units TEXT",
              "batch_number TEXT",
              "branch_id TEXT",
              "pending_qty INTEGER DEFAULT 0",
              "pending_cost REAL DEFAULT 0",
              "pending_price REAL DEFAULT 0",
            ];
            cols.forEach((c) =>
              db.run(`ALTER TABLE inventory ADD COLUMN ${c}`, () => {}),
            );
            // Add batches column for FIFO pricing
            db.run(
              `ALTER TABLE inventory ADD COLUMN batches TEXT DEFAULT '[]'`,
              () => {},
            );
          }
        },
      );

      // Suppliers Table
      db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      company TEXT,
      balance REAL DEFAULT 0,
      notes TEXT,
      syncStatus TEXT DEFAULT 'synced',
      date_added TEXT
    )
  `);

      // Purchase Orders Table
      db.run(
        `
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT,
      date TEXT,
      items TEXT,
      total_cost REAL,
      total REAL,
      status TEXT DEFAULT 'pending'
    )
  `,
        (err) => {
          if (!err) {
            db.run("ALTER TABLE prescriptions ADD COLUMN items TEXT", () => {});
            db.run(
              "ALTER TABLE purchase_orders ADD COLUMN supplier_invoice_number TEXT",
              () => {},
            );
          }
        },
      );

      // Patients Table
      db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      debt REAL DEFAULT 0,
      syncStatus TEXT DEFAULT 'synced'
    )
  `);

      // Sales Table
      db.run(
        `
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      items TEXT,
      total REAL,
      paymentMethod TEXT,
      customer TEXT,
      date TEXT,
      cashierName TEXT,
      branchName TEXT,
      status TEXT DEFAULT 'completed',
      branch_id TEXT,
      notes TEXT
    )
  `,
        () => {
          db.run("ALTER TABLE sales ADD COLUMN branch_id TEXT", () => {});
          db.run("ALTER TABLE sales ADD COLUMN notes TEXT", () => {});
        },
      );

      // Prescriptions Table
      db.run(
        `
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      patient TEXT,
      doctor TEXT,
      date TEXT,
      status TEXT DEFAULT 'pending',
      items TEXT
    )
  `,
        (err) => {
          if (!err) {
            db.run(
              "ALTER TABLE prescriptions ADD COLUMN patient TEXT",
              () => {},
            );
          }
        },
      );

      // Customers Table
      db.run(
        `
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      debt REAL DEFAULT 0,
      lastVisit TEXT
    )
  `,
        (err) => {
          if (!err) {
            db.run("ALTER TABLE customers ADD COLUMN branch_id TEXT", () => {});
          }
        },
      );

      // Branches Table
      db.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      name TEXT,
      addr TEXT,
      status TEXT DEFAULT 'نشط',
      syncStatus TEXT DEFAULT 'synced'
    )
  `);

      // Staff Table
      db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      name TEXT,
      email TEXT,
      password TEXT,
      role TEXT DEFAULT 'pharmacist',
      branch TEXT,
      phone TEXT DEFAULT '',
      salary REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      controlledMedsAccess INTEGER DEFAULT 0,
      syncStatus TEXT DEFAULT 'synced'
    )
  `);

      // Admin Settings Table
      db.run(
        `
    
    CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      date TEXT,
      type TEXT DEFAULT 'info'
    )
  `,
      );

      db.run(
        `
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      adminEmail TEXT,
      adminPassword TEXT,
      systemName TEXT,
      isMaintenance INTEGER DEFAULT 0,
      subscriptionTiers TEXT
    )
  `,
        (err) => {
          if (!err) {
            const adminCols = [
              "monthlyPrice REAL DEFAULT 49",
              "annualPrice REAL DEFAULT 499",
              "lifetimePrice REAL DEFAULT 1499",
              "monthlyOldPrice REAL",
              "annualOldPrice REAL",
              "lifetimeOldPrice REAL",
              "bankName TEXT DEFAULT 'بنك فلسطين'",
              "bankBranch TEXT DEFAULT 'فرع الرمال'",
              "bankAccount TEXT DEFAULT ''",
              "bankIban TEXT DEFAULT ''",
              "bankAccountName TEXT DEFAULT ''",
              "walletNumber TEXT DEFAULT ''",
              "walletName TEXT DEFAULT ''",
              "palpayName TEXT DEFAULT ''",
              "jawwalpayName TEXT DEFAULT ''",
              "whatsappNumber TEXT DEFAULT ''",
              "companyName TEXT DEFAULT ''",
              "devWhatsapp TEXT DEFAULT ''",
              "devInstagram TEXT DEFAULT ''",
              "devWebsite TEXT DEFAULT ''",
            ];
            adminCols.forEach((c) =>
              db.run(`ALTER TABLE admin_settings ADD COLUMN ${c}`, () => {}),
            );

            db.run(
              "ALTER TABLE subscription_requests ADD COLUMN payment_method TEXT DEFAULT ''",
              () => {},
            );
            db.get(
              "SELECT COUNT(*) as count FROM admin_settings",
              (err, row) => {
                if (!err && row.count === 0) {
                  db.run(
                    "INSERT INTO admin_settings (id, adminEmail, adminPassword, systemName, isMaintenance, monthlyPrice, annualPrice, lifetimePrice) VALUES (1, 'admin@roshetta.com', 'admin123', 'روشتة السحابي', 0, 49, 499, 1499)",
                  );
                }
              },
            );
          }
        },
      );
      db.run(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL,
      date TEXT
    )
  `);

      // Batches Table (ط¯ظپط¹ط§طھ ط§ظ„ط£ط¯ظˆظٹط© ظ…ط¹ طھظˆط§ط±ظٹط® ط§ظ„طµظ„ط§ط­ظٹط©)
      db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      drug_id TEXT NOT NULL,
      drug_name TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      qty INTEGER DEFAULT 0,
      purchase_price REAL DEFAULT 0,
      date_added TEXT
    )
  `);

      // Expenses Table (ط§ظ„ظ…طµط±ظˆظپط§طھ ط§ظ„ظٹظˆظ…ظٹط©)
      db.run(
        `
    CREATE TABLE IF NOT EXISTS subscription_requests (
        id TEXT PRIMARY KEY,
        pharmacy_id TEXT,
        plan_type TEXT,
        receipt_url TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      category TEXT,
      description TEXT,
      amount REAL,
      date TEXT,
      created_by TEXT,
      branch_id TEXT
    )
  `,
        () => {
          db.run("ALTER TABLE expenses ADD COLUMN branch_id TEXT", () => {});
        },
      );

      // Shifts Table (ط§ظ„ظˆط±ط¯ظٹط§طھ)
      db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      cashier_name TEXT,
      cashier_email TEXT,
      opening_amount REAL DEFAULT 0,
      closing_amount REAL DEFAULT 0,
      expected_amount REAL DEFAULT 0,
      cash_sales REAL DEFAULT 0,
      card_sales REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      open_time TEXT,
      close_time TEXT,
      notes TEXT
    )
  `);

      // Purchase Invoices Table (ظپظˆط§طھظٹط± ط§ظ„ظ…ط´طھط±ظٹط§طھ ظ…ظ† ط§ظ„ظ…ظˆط±ط¯ظٹظ†)
      db.run(`
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'completed',
      pharmacy_id TEXT NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT,
      items TEXT,
      total_cost REAL,
      paid_amount REAL DEFAULT 0,
      remaining REAL DEFAULT 0,
      invoice_number TEXT,
      date TEXT,
      notes TEXT
    )
  `);

      // Tickets Table
      db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      subject TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      date TEXT,
      replies TEXT DEFAULT '[]'
    )
  `);

      db.run(`
    CREATE TABLE IF NOT EXISTS pharmacy_notifications (
      id TEXT PRIMARY KEY,
      pharmacy_id TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      title TEXT,
      body TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

      // ─── Migrate existing staff table: add phone & salary if missing ───
      db.run("ALTER TABLE staff ADD COLUMN phone TEXT DEFAULT ''", () => {});
      db.run("ALTER TABLE staff ADD COLUMN salary REAL DEFAULT 0", () => {});

      // ─── Auth Endpoints ───────────────────────────────────────────────

      // تسجيل صيدلية جديدة (اشتراك)
    });
});

// ─── Extracted Routes ───
// --- DRY'ed Generic GET Routes ---

const genericParsedRoutes = [
  {
    path: "purchase-orders",
    table: "purchase_orders",
    order: "date DESC",
    resKey: "orders",
  },
  {
    path: "purchases",
    table: "purchase_invoices",
    order: "date DESC",
    resKey: "purchases",
  },
  {
    path: "purchase-invoices",
    table: "purchase_invoices",
    order: "date DESC",
    resKey: "invoices",
  },
];

genericParsedRoutes.forEach((route) => {
  app.get(`/api/pharmacies/:id/${route.path}`, (req, res) => {
    db.all(
      `SELECT * FROM ${route.table} WHERE pharmacy_id = ? ORDER BY ${route.order}`,
      [req.params.id],
      (err, rows) => {
        if (err) return handleError(res, err);
        const parsed = (rows || []).map((r) => ({
          ...r,
          items: JSON.parse(r.items || "[]"),
          ...(route.path === "purchases" && { total: r.total_cost || 0 }),
        }));
        res.json({ success: true, [route.resKey]: parsed });
      },
    );
  });
});

app.get("/api/pharmacies/:id/returns", (req, res) => {
  db.all(
    "SELECT * FROM sales WHERE pharmacy_id = ? AND status = 'refunded' ORDER BY date DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return handleError(res, err);
      const parsed = (rows || []).map((r) => ({
        ...r,
        items: JSON.parse(r.items || "[]"),
        customer: r.customer ? JSON.parse(r.customer) : null,
      }));
      res.json({ success: true, returns: parsed });
    },
  );
});

const genericRoutes = [
  { path: "tickets", table: "tickets", order: "date DESC", resKey: "tickets" },
  {
    path: "prescriptions",
    table: "prescriptions",
    order: "date DESC, id DESC",
    resKey: "prescriptions",
  },
  {
    path: "shifts",
    table: "shifts",
    order: "open_time DESC",
    resKey: "shifts",
  },
];

genericRoutes.forEach((route) => {
  app.get(`/api/pharmacies/:id/${route.path}`, (req, res) => {
    db.all(
      `SELECT * FROM ${route.table} WHERE pharmacy_id = ? ORDER BY ${route.order}`,
      [req.params.id],
      (err, rows) => {
        if (err) return handleError(res, err);
        res.json({ success: true, [route.resKey]: rows || [] });
      },
    );
  });
});

app.post("/api/auth/register", (req, res) => {
  const {
    email,
    password,
    managerName,
    phone,
    pharmacyName,
    subscriptionType,
    defaultBranchName,
    defaultBranchAddr,
    defaultBranchStatus,
  } = req.body;
  if (!email || !password || !pharmacyName) {
    return res.status(400).json({
      success: false,
      error: "الرجاء إدخال جميع الحقول",
    });
  }
  db.get(
    "SELECT email FROM users WHERE email = ?",
    [email],
    (err, existing) => {
      if (existing) {
        return res.status(409).json({
          success: false,
          error: "البريد الإلكتروني مستخدم بالفعل",
        });
      }
      const pharmacyId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const subType = subscriptionType || "trial";

      // Only trial/free gets immediate expiry. Paid plans wait for admin approval.
      let subscriptionExpiry = null;
      let isReadOnly = 1; // locked by default (pending)
      if (subType === "trial" || subType === "free") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);
        subscriptionExpiry = expiryDate.toISOString();
        isReadOnly = 0; // trial/free is immediately active
      }
      db.run(
        "INSERT INTO pharmacies (id, name, subscriptionType, subscriptionExpiry, isActive, isReadOnly, createdAt, phone) VALUES (?, ?, ?, ?, 1, ?, ?, ?)",
        [
          pharmacyId,
          pharmacyName,
          subType,
          subscriptionExpiry,
          isReadOnly,
          createdAt,
          phone || "",
        ],
        (err) => {
          if (err) return handleError(res, err);
          db.run(
            'INSERT INTO users (email, password, role, managerName, pharmacy_id) VALUES (?, ?, "manager", ?, ?)',
            [email, password, managerName || "", pharmacyId],
            (err) => {
              if (err) return handleError(res, err);
              const branchId = crypto.randomUUID();
              const bName = defaultBranchName || "الفرع الرئيسي";
              const bAddr = defaultBranchAddr || "الفرع الرئيسي";
              const bStatus = defaultBranchStatus || "نشط";
              db.run(
                "INSERT INTO branches (id, pharmacy_id, name, addr, status) VALUES (?, ?, ?, ?, ?)",
                [branchId, pharmacyId, bName, bAddr, bStatus],
                (err) => {
                  const sendResponse = () => {
                    const token = jwt.sign({ pharmacy_id: pharmacyId, role: "manager" }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
                      success: true, token,
                      branches: [
                        {
                          id: branchId,
                          name: bName,
                          status: bStatus,
                          addr: bAddr,
                        },
                      ],
                      user: {
                        email,
                        role: "manager",
                        managerName: managerName || "",
                        pharmacyName,
                        pharmacy_id: pharmacyId,
                        subscriptionType: subType,
                        subscriptionExpiry,
                        isReadOnly: isReadOnly === 1,
                      },
                    });
                  };

                  if (subType !== "trial" && subType !== "free") {
                    const reqId =
                      Date.now().toString() +
                      Math.random().toString(36).substring(2, 7);
                    db.run(
                      "INSERT INTO subscription_requests (id, pharmacy_id, plan_type, receipt_url, payment_method, status, createdAt, transferName, transferRef) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      [
                        reqId,
                        pharmacyId,
                        subType,
                        req.body.receiptImage || "",
                        req.body.paymentMethod || "",
                        "pending",
                        new Date().toISOString(),
                        req.body.transferName || "",
                        req.body.transferRef || "",
                      ],
                      (err) => {
                        sendResponse();
                      },
                    );
                  } else {
                    sendResponse();
                  }
                },
              );
            },
          );
        },
      );
    },
  );
});

app.use("/api/pharmacies", (req, res, next) => {
  if (req.method === "GET") return next();
  const pharmacy_id =
    req.path.split("/")[1] || req.body.pharmacy_id || req.query.pharmacy_id;
  if (!pharmacy_id) return next();

  db.get(
    "SELECT isReadOnly, subscriptionType, subscriptionExpiry FROM pharmacies WHERE id = ?",
    [pharmacy_id],
    (err, row) => {
      if (err || !row)
        return res
          .status(404)
          .json({ success: false, error: "Pharmacy not found" });

      if (row.isReadOnly) {
        return res.status(403).json({
          success: false,
          error: "هذه الصيدلية في وضع القراءة فقط. لا يمكن إجراء تعديلات.",
        });
      }

      if (row.subscriptionType !== "lifetime") {
        if (!row.subscriptionExpiry) {
          return res.status(402).json({
            success: false,
            error:
              "حسابك بانتظار تفعيل الاشتراك والدفع. النظام في وضع القراءة فقط.",
            expired: true,
          });
        }
        const expiry = new Date(row.subscriptionExpiry);
        const now = new Date();
        expiry.setDate(expiry.getDate() + 3);
        if (expiry < now) {
          return res.status(402).json({
            success: false,
            error:
              "انتهى اشتراكك. النظام الآن في وضع القراءة فقط. يرجى تجديد الاشتراك.",
            expired: true,
          });
        }
      }

      if (req.method === "POST" && req.path.endsWith("/branches")) {
        db.all(
          "SELECT id FROM branches WHERE pharmacy_id = ?",
          [pharmacy_id],
          (err, branches) => {
            const count = branches ? branches.length : 0;
            if (row.subscriptionType === "trial" && count >= 1)
              return res.status(403).json({
                success: false,
                error: "الباقة التجريبية تسمح بفرع واحد فقط. قم بترقية باقتك.",
              });
            if (row.subscriptionType === "monthly" && count >= 3)
              return res.status(403).json({
                success: false,
                error:
                  "الباقة الشهرية تسمح بـ 3 فروع كحد أقصى. قم بالترقية للباقة السنوية.",
              });
            next();
          },
        );
        return;
      }
      next();
    },
  );
});

// Pay Supplier

app.post(
  "/api/subscriptions/upload-receipt",
  upload.single("receipt"),
  (req, res) => {
    const { pharmacy_id, plan_type, refNumber, paymentMethod } = req.body;
    if (!pharmacy_id || (plan_type !== "trial" && !req.file && !refNumber))
      return res.status(400).json({
        success: false,
        error: "Missing required fields or file",
      });
    const receipt_url = req.file
      ? req.file.filename
      : refNumber
        ? "ref_" + refNumber
        : "trial_activation";
    db.get(
      "SELECT * FROM subscription_requests WHERE pharmacy_id = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1",
      [pharmacy_id],
      (err, existing) => {
        if (existing) {
          db.run(
            "UPDATE subscription_requests SET receipt_url = ?, payment_method = ?, plan_type = ?, createdAt = ? WHERE id = ?",
            [
              receipt_url,
              paymentMethod || existing.payment_method,
              plan_type || existing.plan_type,
              new Date().toISOString(),
              existing.id,
            ],
            (err) => {
              if (err) return handleError(res, err);
              res.json({ success: true, id: existing.id });
            },
          );
        } else {
          const id =
            Date.now().toString() + Math.random().toString(36).substring(2, 7);
          db.run(
            "INSERT INTO subscription_requests (id, pharmacy_id, plan_type, receipt_url, payment_method, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              id,
              pharmacy_id,
              plan_type || "monthly",
              receipt_url,
              paymentMethod || "",
              "pending",
              new Date().toISOString(),
            ],
            (err) => {
              if (err) return handleError(res, err);
              res.json({ success: true, id });
            },
          );
        }
      },
    );
  },
);

app.get("/api/admin/subscription-requests", (req, res) => {
  db.all(
    `SELECT r.*, p.name as pharmacy_name, p.phone as pharmacy_phone 
            FROM subscription_requests r 
            LEFT JOIN pharmacies p ON r.pharmacy_id = p.id 
            ORDER BY r.createdAt DESC`,
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        requests: rows || [],
      });
    },
  );
});

// Update existing subscription request (from read-only mode)
app.put("/api/pharmacies/:id/subscription-request", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { receiptImage, paymentMethod, transferName, transferRef, plan } =
    req.body;
  db.get(
    "SELECT * FROM subscription_requests WHERE pharmacy_id = ? ORDER BY createdAt DESC LIMIT 1",
    [pharmacy_id],
    (err, existing) => {
      if (existing) {
        // Update existing request
        db.run(
          "UPDATE subscription_requests SET receipt_url = ?, payment_method = ?, transferName = ?, transferRef = ?, status = 'pending', createdAt = ? WHERE id = ?",
          [
            receiptImage || existing.receipt_url,
            paymentMethod || existing.payment_method,
            transferName || "",
            transferRef || "",
            new Date().toISOString(),
            existing.id,
          ],
          (err) => {
            if (err) return handleError(res, err);
            res.json({ success: true, message: "تم تحديث طلب الاشتراك بنجاح" });
          },
        );
      } else {
        // Create new request if none exists
        const reqId =
          Date.now().toString() + Math.random().toString(36).substring(2, 7);
        db.run(
          "INSERT INTO subscription_requests (id, pharmacy_id, plan_type, receipt_url, payment_method, status, createdAt, transferName, transferRef) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
          [
            reqId,
            pharmacy_id,
            plan || "monthly",
            receiptImage || "",
            paymentMethod || "",
            new Date().toISOString(),
            transferName || "",
            transferRef || "",
          ],
          (err) => {
            if (err) return handleError(res, err);
            res.json({ success: true, message: "تم إرسال طلب الاشتراك بنجاح" });
          },
        );
      }
    },
  );
});

app.post("/api/admin/subscription-requests/:id/approve", (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT * FROM subscription_requests WHERE id = ?",
    [id],
    (err, request) => {
      if (err || !request)
        return res.status(404).json({
          success: false,
          error: "Request not found",
        });
      const plan = request.plan_type;
      let expireDate = new Date();
      if (plan === "annual")
        expireDate.setFullYear(expireDate.getFullYear() + 1);
      else if (plan === "lifetime")
        expireDate.setFullYear(expireDate.getFullYear() + 100);
      else expireDate.setMonth(expireDate.getMonth() + 1); // monthly

      db.run(
        'UPDATE subscription_requests SET status = "approved" WHERE id = ?',
        [id],
        (err) => {
          if (err) return handleError(res, err);
          db.run(
            "UPDATE pharmacies SET subscriptionType = ?, subscriptionExpiry = ?, isActive = 1, isReadOnly = 0 WHERE id = ?",
            [plan, expireDate.toISOString(), request.pharmacy_id],
            (err) => {
              if (err) return handleError(res, err);
              // Insert congratulations notification for the subscriber
              const planLabels = {
                monthly: "الشهري",
                annual: "السنوي",
                lifetime: "مدى الحياة",
              };
              const planLabel = planLabels[plan] || plan;
              const notifId = require("crypto").randomUUID();
              db.run(
                "INSERT INTO pharmacy_notifications (id, pharmacy_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
                [
                  notifId,
                  request.pharmacy_id,
                  "upgrade",
                  "🎉 مبارك ترقيتك!",
                  `تم تفعيل اشتراكك ${planLabel} بنجاح. يمكنك الآن الاستمتاع بجميع مميزات النظام.`,
                  new Date().toISOString(),
                ],
                () => {
                  // 🔔 Notify the pharmacy via socket in real time
                  io.to(request.pharmacy_id).emit("subscription_approved", {
                    pharmacy_id: request.pharmacy_id,
                    subscriptionType: plan,
                    message: "تم تفعيل اشتراكك بنجاح!",
                  });
                  res.json({
                    success: true,
                    message: "Subscription approved successfully",
                  });
                },
              );
            },
          );
        },
      );
    },
  );
});

app.post("/api/admin/subscription-requests/:id/reject", (req, res) => {
  const { id } = req.params;
  db.run(
    'UPDATE subscription_requests SET status = "rejected" WHERE id = ?',
    [id],
    (err) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        message: "Subscription rejected",
      });
    },
  );
});

// ─── Pharmacy Notifications ───────────────────────────────────────────
app.get("/api/pharmacies/:id/notifications", async (req, res) => {
  const pharmacyId = req.params.id;
  try {
    const notifications = [];

    const runQuery = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) =>
          err ? reject(err) : resolve(rows || []),
        );
      });

    // 1. Private Pharmacy Notifications
    const pNotifs = await runQuery(
      "SELECT * FROM pharmacy_notifications WHERE pharmacy_id = ? ORDER BY created_at DESC LIMIT 50",
      [pharmacyId],
    );
    pNotifs.forEach((n) => {
      notifications.push({
        id: n.id,
        type: n.type || "info",
        title: n.title,
        body: n.body,
        is_read: n.is_read,
        created_at: n.created_at,
      });
    });

    // 2. Global Broadcasts (Last 2 days)
    const broadcasts = await runQuery(
      "SELECT * FROM broadcasts WHERE date >= datetime('now', '-2 days') ORDER BY date DESC LIMIT 50",
    );
    broadcasts.forEach((b) => {
      notifications.push({
        id: `broadcast_` + b.id,
        type: b.type || "info",
        title: b.title,
        body: b.message,
        is_read: 0,
        created_at: b.date,
      });
    });

    // 3. Dynamic: Low Stock
    const lowStock = await runQuery(
      "SELECT id, name, qty, minQty FROM inventory WHERE pharmacy_id = ? AND qty <= minQty",
      [pharmacyId],
    );
    lowStock.forEach((row) => {
      notifications.push({
        id: `low_stock_` + row.id,
        type: "low_stock",
        title: "نقص في المخزون",
        body:
          `الكمية المتبقية من ` +
          row.name +
          ` هي ` +
          row.qty +
          ` (الحد الأدنى: ` +
          row.minQty +
          `)`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    });

    // 4. Dynamic: Expiring Batches
    const expiring = await runQuery(
      "SELECT b.id, i.name as drug_name, b.batch_number, b.expiry_date FROM batches b JOIN inventory i ON b.drug_id = i.id WHERE b.pharmacy_id = ? AND b.qty > 0 AND b.expiry_date != '' AND b.expiry_date IS NOT NULL AND b.expiry_date <= date('now', '+30 days')",
      [pharmacyId],
    );
    expiring.forEach((row) => {
      notifications.push({
        id: `expiring_` + row.id,
        type: "expiring",
        title: "صلاحية قاربت على الانتهاء",
        body:
          `الدفعة ` +
          (row.batch_number || "") +
          ` من ` +
          row.drug_name +
          ` ستنتهي في ` +
          row.expiry_date,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    });

    // 5. Dynamic: High Debt Suppliers
    const debt = await runQuery(
      "SELECT id, name, balance FROM suppliers WHERE pharmacy_id = ? AND balance > 5000",
      [pharmacyId],
    );
    debt.forEach((row) => {
      notifications.push({
        id: `debt_` + row.id,
        type: "high_debt",
        title: "تنبيه مديونية عالية",
        body: `رصيد المورد ` + row.name + ` وصل إلى ` + row.balance.toFixed(2),
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    });

    // Sort all by created_at DESC
    notifications.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    res.json({ success: true, notifications: notifications.slice(0, 100) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/pharmacies/:id/notifications/mark-read", (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE pharmacy_notifications SET is_read = 1 WHERE pharmacy_id = ?",
    [id],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  db.get(
    "SELECT * FROM platform_staff WHERE email = ? AND password = ?",
    [email, password],
    (err, admin) => {
      console.log("LOGIN ATTEMPT:", {
        err,
        admin,
        reqEmail: email,
        reqPass: password,
      });
      if (admin) {
        return res.json({
          success: true,
          user: {
            id: admin.id,
            email: admin.email,
            role: "superadmin",
            platformRole: admin.role, // 'owner' or 'staff'
            managerName: admin.name || "إدارة المنصة",
            pharmacyName: "لوحة تحكم الإدارة",
            pharmacy_id: "super-admin",
          },
        });
      }
      db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, user) => {
          if (err) return handleError(res, err);
          if (!user) {
            db.get(
              "SELECT * FROM staff WHERE email = ? AND password = ?",
              [email, password],
              (err, staff) => {
                if (err || !staff) {
                  return res.status(401).json({
                    success: false,
                    error: "بريد إلكتروني أو كلمة مرور خاطئة",
                  });
                }
                if (role && staff.role !== role) {
                  return res.status(403).json({
                    success: false,
                    error: "لا تملك صلاحية الدخول بهذه الرتبة",
                  });
                }
                db.get(
                  "SELECT * FROM pharmacies WHERE id = ?",
                  [staff.pharmacy_id],
                  (err, pharmacy) => {
                    if (err || !pharmacy)
                      return res.status(404).json({
                        success: false,
                        error: "الصيدلية غير موجودة",
                      });
                    const token = jwt.sign({ pharmacy_id: pharmacy.id, role: staff.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
                      success: true, token,
                      user: {
                        id: staff.id,
                        email: staff.email,
                        managerName: staff.name,
                        pharmacyName: pharmacy.name,
                        subscriptionType: pharmacy.subscriptionType || "basic",
                        subscriptionExpiry: pharmacy.subscriptionExpiry,
                        role: staff.role,
                        pharmacy_id: pharmacy.id,
                        branch: staff.branch,
                        controlledMedsAccess: staff.controlledMedsAccess,
                        isReadOnly:
                          pharmacy.isReadOnly === 1 ||
                          (pharmacy.subscriptionType !== "lifetime" &&
                            (!pharmacy.subscriptionExpiry ||
                              new Date(pharmacy.subscriptionExpiry).getTime() <
                                new Date().getTime())),
                      },
                    });
                  },
                );
              },
            );
            return;
          }
          if (role && user.role !== role && user.role !== "manager") {
            return res.status(403).json({
              success: false,
              error: "لا تملك صلاحية الدخول بهذه الرتبة",
            });
          }
          db.get(
            "SELECT * FROM pharmacies WHERE id = ?",
            [user.pharmacy_id],
            (err, pharmacy) => {
              if (err) return handleError(res, err);
              if (!pharmacy)
                return res.status(404).json({
                  success: false,
                  error: "الصيدلية غير موجودة",
                });
              const token = jwt.sign({ pharmacy_id: pharmacy.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
                success: true, token,
                user: {
                  id: user.id,
                  email: user.email,
                  managerName: user.managerName,
                  pharmacyName: pharmacy.name,
                  subscriptionType: pharmacy.subscriptionType || "basic",
                  subscriptionExpiry: pharmacy.subscriptionExpiry,
                  role: user.role,
                  pharmacy_id: pharmacy.id,
                  branch: "",
                  isReadOnly:
                    pharmacy.isReadOnly === 1 ||
                    (pharmacy.subscriptionType !== "lifetime" &&
                      (!pharmacy.subscriptionExpiry ||
                        new Date(pharmacy.subscriptionExpiry).getTime() <
                          new Date().getTime())),
                },
              });
            },
          );
        },
      );
    },
  );
});

app.get("/api/admin/pharmacies", (req, res) => {
  db.all(
    "SELECT p.*, u.managerName as owner FROM pharmacies p LEFT JOIN users u ON p.id = u.pharmacy_id AND u.role = 'manager'",
    (err, rows) =>
      res.json({
        success: true,
        pharmacies: rows || [],
      }),
  );
});

app.get("/api/admin/pharmacies/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    `
      SELECT p.*, u.email, u.password, u.managerName as owner 
      FROM pharmacies p 
      LEFT JOIN users u ON p.id = u.pharmacy_id AND u.role = 'manager' 
      WHERE p.id = ?
    `,
    [id],
    (err, row) => {
      if (err) return handleError(res, err);
      if (!row) return handleNotFound(res);
      db.get(
        "SELECT id FROM subscription_requests WHERE pharmacy_id = ? AND status = 'pending'",
        [id],
        (err2, reqRow) => {
          res.json({
            success: true,
            pharmacy: row,
            hasPendingRequest: !!reqRow,
          });
        },
      );
    },
  );
});

app.post("/api/admin/pharmacies", (req, res) => {
  const { name, owner, email, password, phone, plan, amountPaid } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ success: false, error: "Missing fields" });

  const phId = "ph-" + Date.now();
  const date = new Date().toISOString();

  let expiryDate = new Date();
  if (plan === "monthly") {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (plan === "annual") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else if (plan === "trial") {
    expiryDate.setDate(expiryDate.getDate() + 14);
  } else if (plan === "lifetime") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 100);
  }
  const expiry = expiryDate.toISOString();

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run(
      "INSERT INTO pharmacies (id, name, subscriptionType, subscriptionExpiry, createdAt, totalPaid, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [phId, name, plan, expiry, date, amountPaid || 0, phone || ""],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: err.message });
        }

        db.run(
          "INSERT INTO users (email, password, role, managerName, pharmacy_id) VALUES (?, ?, 'owner', ?, ?)",
          [email, password, owner || name, phId],
          function (err2) {
            if (err2) {
              db.run("ROLLBACK");
              return res
                .status(500)
                .json({ success: false, error: err2.message });
            }
            db.run("COMMIT", (err3) => {
              if (err3)
                return res
                  .status(500)
                  .json({ success: false, error: err3.message });
              res.json({ success: true, pharmacy_id: phId });
            });
          },
        );
      },
    );
  });
});

app.put("/api/admin/pharmacies/:id", (req, res) => {
  const { id } = req.params;
  const {
    name,
    owner,
    email,
    password,
    plan,
    phone,
    paidAmount,
    subscriptionExpiry,
  } = req.body;
  const subscriptionType = ["annual", "سنوي"].includes(plan)
    ? "annual"
    : ["trial", "تجريبي"].includes(plan)
      ? "trial"
      : ["lifetime", "مدى الحياة"].includes(plan)
        ? "lifetime"
        : "monthly";
  const paid = parseFloat(paidAmount) || 0;

  // Use the provided expiry date directly without recalculating
  let finalExpiry;
  if (subscriptionExpiry) {
    finalExpiry = new Date(subscriptionExpiry).toISOString();
  } else {
    let expireDate = new Date();
    if (subscriptionType === "annual")
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    else if (subscriptionType === "trial")
      expireDate.setDate(expireDate.getDate() + 14);
    else if (subscriptionType === "lifetime")
      expireDate.setFullYear(expireDate.getFullYear() + 100);
    else expireDate.setMonth(expireDate.getMonth() + 1);
    finalExpiry = expireDate.toISOString();
  }
  db.serialize(() => {
    db.run(
      "UPDATE pharmacies SET name = ?, subscriptionType = ?, subscriptionExpiry = ?, phone = ?, totalPaid = ? WHERE id = ?",
      [name, subscriptionType, finalExpiry, phone || "", paid, id],
      function (err) {
        if (err) return handleError(res, err);

        // If password is provided, update it; otherwise keep existing
        if (password && password.trim()) {
          db.run(
            'UPDATE users SET managerName = ?, email = ?, password = ? WHERE pharmacy_id = ? AND role = "manager"',
            [owner, email || "", password.trim(), id],
            function (err) {
              if (err) return handleError(res, err);
              res.json({
                success: true,
              });
            },
          );
        } else {
          db.run(
            'UPDATE users SET managerName = ?, email = ? WHERE pharmacy_id = ? AND role = "manager"',
            [owner, email || "", id],
            function (err) {
              if (err) return handleError(res, err);
              res.json({
                success: true,
              });
            },
          );
        }
      },
    );
  });
});

app.get("/api/admin/users", (req, res) => {
  db.all("SELECT * FROM users", (err, rows) =>
    res.json({
      success: true,
      users: rows || [],
    }),
  );
});

app.put("/api/admin/pharmacies/:id/readonly", (req, res) => {
  const { id } = req.params;
  const { isReadOnly } = req.body;
  db.run(
    "UPDATE pharmacies SET isReadOnly = ? WHERE id = ?",
    [isReadOnly ? 1 : 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        isReadOnly,
      });
    },
  );
});

app.delete("/api/admin/pharmacies/:id", (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run("DELETE FROM pharmacies WHERE id = ?", [id], (err) => {
      if (err) return handleError(res, err);
      db.run("DELETE FROM users WHERE pharmacy_id = ?", [id]);
      db.run("DELETE FROM inventory WHERE pharmacy_id = ?", [id]);
      db.run("DELETE FROM patients WHERE pharmacy_id = ?", [id]);
      db.run("DELETE FROM sales WHERE pharmacy_id = ?", [id]);
      db.run("DELETE FROM branches WHERE pharmacy_id = ?", [id]);
      db.run("DELETE FROM staff WHERE pharmacy_id = ?", [id]);
      res.json({
        success: true,
      });
    });
  });
});

app.get("/api/broadcasts", (req, res) => {
  db.all(
    "SELECT * FROM broadcasts ORDER BY date DESC LIMIT 20",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, broadcasts: rows });
    },
  );
});

app.post("/api/admin/broadcasts", (req, res) => {
  const { title, message, type } = req.body;
  const id = Date.now().toString();
  const date = new Date().toISOString();
  db.run(
    "INSERT INTO broadcasts (id, title, message, date, type) VALUES (?, ?, ?, ?, ?)",
    [id, title, message, date, type || "info"],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    },
  );
});

app.post("/api/admin/pharmacies/:id/renew", (req, res) => {
  const { id } = req.params;
  const { months, amountPaid } = req.body;
  const paid = parseFloat(amountPaid) || 0;
  db.get(
    "SELECT subscriptionExpiry FROM pharmacies WHERE id = ?",
    [id],
    (err, row) => {
      if (err || !row)
        return res.status(404).json({
          success: false,
          error: "Pharmacy not found",
        });
      let currentExpire = new Date();
      const parsed = new Date(row.subscriptionExpiry);
      if (!isNaN(parsed.getTime()) && parsed > currentExpire) {
        currentExpire = parsed;
      }
      currentExpire.setMonth(
        currentExpire.getMonth() + parseInt(months || 1, 10),
      );
      const newExpiry = currentExpire.toISOString();
      db.run(
        "UPDATE pharmacies SET subscriptionExpiry = ?, totalPaid = totalPaid + ? WHERE id = ?",
        [newExpiry, paid, id],
        function (err) {
          if (err) return handleError(res, err);
          db.get(
            "SELECT totalPaid FROM pharmacies WHERE id = ?",
            [id],
            (err, row) => {
              res.json({
                success: true,
                newExpiry,
                totalPaid: row?.totalPaid || 0,
              });
            },
          );
        },
      );
    },
  );
});

app.post("/api/admin/pharmacies/:id/toggle", (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  db.run(
    "UPDATE pharmacies SET isActive = ? WHERE id = ?",
    [isActive ? 1 : 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );

  // â”€â”€â”€ Pharmacy Branches Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/admin/pharmacies/:id/branches", (req, res) => {
  const { id } = req.params;
  db.all("SELECT * FROM branches WHERE pharmacy_id = ?", [id], (err, rows) => {
    if (err) return handleError(res, err);

    if (!rows || rows.length === 0) {
      // Auto-create default branch for backward compatibility with old accounts
      const branchId = require("crypto").randomUUID();
      const bName = "الفرع الرئيسي";
      const bAddr = "المقر الرئيسي";
      const bStatus = "نشط";
      db.run(
        "INSERT INTO branches (id, pharmacy_id, name, addr, status) VALUES (?, ?, ?, ?, ?)",
        [branchId, id, bName, bAddr, bStatus],
        (err2) => {
          if (err2) {
            return res.json({ success: true, branches: [] });
          }
          res.json({
            success: true,
            branches: [
              {
                id: branchId,
                pharmacy_id: id,
                name: bName,
                addr: bAddr,
                status: bStatus,
                syncStatus: "synced",
              },
            ],
          });
        },
      );
      return;
    }

    res.json({
      success: true,
      branches: rows,
    });
  });
});

app.post("/api/admin/pharmacies/:id/branches", (req, res) => {
  const { id } = req.params;
  const { name, addr } = req.body;
  const branchId = crypto.randomUUID();
  db.run(
    "INSERT INTO branches (id, pharmacy_id, name, addr, status) VALUES (?, ?, ?, ?, ?)",
    [branchId, id, name, addr || "", "نشط"],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        id: branchId,
      });
    },
  );
});

app.put("/api/admin/pharmacies/:id/branches/:branchId", (req, res) => {
  const { id, branchId } = req.params;
  const { name, addr } = req.body;
  db.run(
    "UPDATE branches SET name = ?, addr = ? WHERE id = ? AND pharmacy_id = ?",
    [name, addr || "", branchId, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.delete("/api/admin/pharmacies/:id/branches/:branchId", (req, res) => {
  const { id, branchId } = req.params;
  db.run(
    "DELETE FROM branches WHERE id = ? AND pharmacy_id = ?",
    [branchId, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );

  // â”€â”€â”€ Pharmacy Staff Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/admin/pharmacies/:id/staff", (req, res) => {
  const { id } = req.params;
  db.all("SELECT * FROM staff WHERE pharmacy_id = ?", [id], (err, rows) => {
    if (err) return handleError(res, err);
    // Map active to status string for frontend compatibility
    const mapped = rows.map((r) => ({
      ...r,
      status: r.active ? "active" : "suspended",
    }));
    res.json({
      success: true,
      staff: mapped,
    });
  });
});

app.post("/api/admin/pharmacies/:id/staff", (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    password,
    role,
    branch,
    phone,
    salary,
    controlledMedsAccess,
  } = req.body;
  const staffId = crypto.randomUUID();
  db.run(
    "INSERT INTO staff (id, pharmacy_id, name, email, password, role, branch, phone, salary, active, controlledMedsAccess) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      staffId,
      id,
      name,
      email || "",
      password || "",
      role || "pharmacist",
      branch || "",
      phone || "",
      parseFloat(salary) || 0,
      1,
      controlledMedsAccess ? 1 : 0,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        id: staffId,
      });
    },
  );
});

app.put("/api/admin/pharmacies/:id/staff/:staffId", (req, res) => {
  const { id, staffId } = req.params;
  const { name, email, password, role, branch, phone, salary, status, active } =
    req.body;

  let isActive = 1;
  if (active !== undefined) {
    isActive = active ? 1 : 0;
  } else if (status !== undefined) {
    isActive = status === "active" ? 1 : 0;
  }

  db.run(
    "UPDATE staff SET name = ?, email = ?, password = ?, role = ?, branch = ?, phone = ?, salary = ?, active = ? WHERE id = ? AND pharmacy_id = ?",
    [
      name,
      email || "",
      password || "",
      role,
      branch,
      phone || "",
      parseFloat(salary) || 0,
      isActive,
      staffId,
      id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});

app.delete("/api/admin/pharmacies/:id/staff/:staffId", (req, res) => {
  const { id, staffId } = req.params;
  db.run(
    "DELETE FROM staff WHERE id = ? AND pharmacy_id = ?",
    [staffId, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );

  // â”€â”€â”€ Tickets Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/admin/notifications", (req, res) => {
  const notifications = [];
  db.serialize(() => {
    db.all(
      'SELECT id FROM subscription_requests WHERE status = "pending"',
      (err, rows) => {
        if (!err && rows && rows.length > 0) {
          notifications.push({
            id: "sub",
            type: "amber",
            text: "يوجد " + rows.length + " طلب تفعيل قيد الانتظار",
            tab: "subrequests",
          });
        }
        db.all(
          'SELECT id FROM support_tickets WHERE status = "open"',
          (err, rows2) => {
            if (!err && rows2 && rows2.length > 0) {
              notifications.push({
                id: "tik",
                type: "red",
                text: "يوجد " + rows2.length + " تذكرة دعم مفتوحة",
                tab: "tickets",
              });
            }
            db.all(
              "SELECT name, subscriptionExpiry, subscriptionType FROM pharmacies",
              (err, rows3) => {
                if (!err && rows3) {
                  const now = new Date().getTime();
                  const expired = rows3.filter(
                    (p) =>
                      p.subscriptionType !== "lifetime" &&
                      p.subscriptionExpiry &&
                      new Date(p.subscriptionExpiry).getTime() < now,
                  );
                  if (expired.length > 0) {
                    notifications.push({
                      id: "exp",
                      type: "blue",
                      text:
                        "يوجد " + expired.length + " صيدليات انتهى اشتراكها",
                      tab: "pharmacies",
                    });
                  }
                }
                res.json({
                  success: true,
                  notifications,
                });
              },
            );
          },
        );
      },
    );
  });
});

app.get("/api/admin/tickets", (req, res) => {
  db.all(
    `
    SELECT t.*, p.name as pharmacy
    FROM tickets t
    LEFT JOIN pharmacies p ON t.pharmacy_id = p.id
    ORDER BY t.date DESC
  `,
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        tickets: rows,
      });
    },
  );
});

app.post("/api/admin/tickets/:id/reply", (req, res) => {
  const { id } = req.params;
  const { sender, text, date, type } = req.body;
  db.get("SELECT replies FROM tickets WHERE id = ?", [id], (err, row) => {
    if (err || !row)
      return res.status(404).json({
        success: false,
        error: "Ticket not found",
      });
    let replies = [];
    try {
      replies = JSON.parse(row.replies || "[]");
    } catch (e) {
      replies = [];
    }
    replies.push({
      sender,
      text,
      date,
      type,
    });
    db.run(
      "UPDATE tickets SET replies = ? WHERE id = ?",
      [JSON.stringify(replies), id],
      function (err) {
        if (err) return handleError(res, err);
        res.json({
          success: true,
        });
      },
    );
  });
});

app.post("/api/admin/tickets/:id/resolve", (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE tickets SET status = 'resolved' WHERE id = ?",
    [id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.post("/api/admin/tickets", (req, res) => {
  // ظ„ظ„ط¥ظ†ط´ط§ط، ظ„ظ„ط§ط®طھط¨ط§ط± ظپظ‚ط·
  const { id, pharmacy_id, subject, priority, date, text, sender } = req.body;
  const initialReplies = [
    {
      sender,
      text,
      date,
      type: "user",
    },
  ];
  db.run(
    "INSERT INTO tickets (id, pharmacy_id, subject, priority, date, replies) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      pharmacy_id,
      subject,
      priority || "medium",
      date,
      JSON.stringify(initialReplies),
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.post("/api/admin/backup", (req, res) => {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = "manual_backup_" + date + "_" + time + ".sqlite";
  const backupFilePath = path.join(backupDir, backupFileName);

  fs.copyFile(path.join(__dirname, "roshetta.db"), backupFilePath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    sendBackupToTelegram(backupFilePath, backupFileName);
    res.json({ success: true, message: "Backup requested successfully." });
  });
});

app.get("/api/admin/settings", (req, res) => {
  db.get("SELECT * FROM admin_settings WHERE id = 1", (err, row) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      settings: row,
    });
  });
});

app.put("/api/admin/settings", (req, res) => {
  const {
    adminEmail,
    adminPassword,
    systemName,
    isMaintenance,
    monthlyPrice,
    annualPrice,
    lifetimePrice,
    monthlyOldPrice,
    annualOldPrice,
    lifetimeOldPrice,
    bankName,
    bankAccount,
    bankIban,
    bankAccountName,
    walletNumber,
    walletName,
    palpayName,
    jawwalpayName,
    whatsappNumber,
    companyName,
    devWhatsapp,
    devInstagram,
    devWebsite,
  } = req.body;
  const maintenanceVal = isMaintenance ? 1 : 0;
  GLOBAL_MAINTENANCE = maintenanceVal === 1;

  // بناء الاستعلام ديناميكياً: لو الباسورد فاضي ما نغيره
  const hasNewPassword = adminPassword && adminPassword.trim() !== "";

  let sql, params;
  if (hasNewPassword) {
    sql = `UPDATE admin_settings SET 
      adminEmail = ?, adminPassword = ?, systemName = ?, isMaintenance = ?,
      bankName = ?, bankAccount = ?, bankIban = ?, bankAccountName = ?,
      walletNumber = ?, walletName = ?, palpayName = ?, jawwalpayName = ?, whatsappNumber = ?, companyName = ?,
      devWhatsapp = ?, devInstagram = ?, devWebsite = ?
    WHERE id = 1`;
    params = [
      adminEmail,
      adminPassword.trim(),
      systemName,
      maintenanceVal,

      bankName || "",
      bankAccount || "",
      bankIban || "",
      bankAccountName || "",
      walletNumber || "",
      walletName || "",
      palpayName || "",
      jawwalpayName || "",
      whatsappNumber || "",
      companyName || "",
      devWhatsapp || "",
      devInstagram || "",
      devWebsite || "",
    ];
  } else {
    // بدون تغيير الباسورد
    sql = `UPDATE admin_settings SET 
      adminEmail = ?, systemName = ?, isMaintenance = ?,
      bankName = ?, bankAccount = ?, bankIban = ?, bankAccountName = ?,
      walletNumber = ?, walletName = ?, palpayName = ?, jawwalpayName = ?, whatsappNumber = ?, companyName = ?,
      devWhatsapp = ?, devInstagram = ?, devWebsite = ?
    WHERE id = 1`;
    params = [
      adminEmail,
      systemName,
      maintenanceVal,

      bankName || "",
      bankAccount || "",
      bankIban || "",
      bankAccountName || "",
      walletNumber || "",
      walletName || "",
      palpayName || "",
      jawwalpayName || "",
      whatsappNumber || "",
      companyName || "",
      devWhatsapp || "",
      devInstagram || "",
      devWebsite || "",
    ];
  }

  db.run(sql, params, function (err) {
    if (err) return handleError(res, err);
    // لو في كلمة سر جديدة، نغيرها في platform_staff للـ owner
    if (hasNewPassword) {
      db.run(
        "UPDATE platform_staff SET password = ? WHERE role = 'owner'",
        [adminPassword.trim()],
        (err2) => {
          if (err2)
            console.error("Failed to update platform_staff password:", err2);
        },
      );
      // كمان نحدث adminEmail لو تغير
      if (adminEmail) {
        db.run(
          "UPDATE platform_staff SET email = ? WHERE role = 'owner'",
          [adminEmail],
          () => {},
        );
      }
    } else if (adminEmail) {
      // حتى بدون تغيير باسورد، نحدث الإيميل
      db.run(
        "UPDATE platform_staff SET email = ? WHERE role = 'owner'",
        [adminEmail],
        () => {},
      );
    }
    res.json({ success: true, passwordChanged: hasNewPassword });
  });

  // â”€â”€â”€ Sync Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ طµظٹط¯ظ„ظٹط© ظ…ط­ط¯ط¯ط©
  // Pharmacy Data Endpoints (Inventory & Sales) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/pharmacies/:id/dashboard", (req, res) => {
  const { id } = req.params;
  const { branch } = req.query; // could be 'all', branch_id, or branchName
  const todayStr = new Date().toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  db.serialize(() => {
    // 1. Resolve branch correctly to both ID and Name
    db.all(
      "SELECT id, name FROM branches WHERE pharmacy_id = ?",
      [id],
      (err, dbBranches) => {
        const branchesList = dbBranches || [];
        let targetBranchId = null;
        let targetBranchName = null;
        if (branch && branch !== "all") {
          const b = branchesList.find(
            (b) => b.id === branch || b.name === branch,
          );
          if (b) {
            targetBranchId = b.id;
            targetBranchName = b.name;
          }
        }
        let salesToday = 0;
        let invoicesToday = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let expiringCount = 0;
        let alerts = [];

        // Build Queries based on resolved branch
        let salesQuery =
          "SELECT SUM(total) as sum, COUNT(*) as count FROM sales WHERE pharmacy_id = ? AND date LIKE ? AND status != 'refunded'";
        let salesParams = [id, `${todayStr}%`];
        if (targetBranchName) {
          salesQuery += " AND branchName = ?";
          salesParams.push(targetBranchName);
        }
        db.get(salesQuery, salesParams, (err, row) => {
          if (!err && row) {
            salesToday = row.sum || 0;
            invoicesToday = row.count || 0;
          }
          let invQuery =
            "SELECT id, name, qty, minQty, expiry, branch_id FROM inventory WHERE pharmacy_id = ? AND (qty == 0 OR (qty > 0 AND qty <= minQty) OR (expiry != '' AND expiry != 'null' AND expiry IS NOT NULL AND expiry <= ?))";
          let invParams = [id, thirtyDaysFromNow];
          if (targetBranchId) {
            invQuery += " AND branch_id = ?";
            invParams.push(targetBranchId);
          }
          db.all(invQuery, invParams, (err, items) => {
            if (!err && items) {
              items.forEach((item) => {
                const isOutOfStock = item.qty === 0;
                const isLowStock =
                  item.qty > 0 && item.qty <= (item.minQty || 5);
                let isExpiring = false;
                if (item.expiry && item.expiry !== "null") {
                  isExpiring =
                    new Date(item.expiry) <= new Date(thirtyDaysFromNow);
                }
                if (isOutOfStock) {
                  outOfStock++;
                  alerts.push({
                    type: "outOfStock",
                    title: item.name,
                    message: `نفدت الكمية تماماً`,
                    branch_id: item.branch_id,
                  });
                } else if (isLowStock) {
                  lowStock++;
                  alerts.push({
                    type: "lowStock",
                    title: item.name,
                    message: `الكمية المتبقية: ${item.qty} (الحد الأدنى: ${item.minQty || 5})`,
                    branch_id: item.branch_id,
                    qty: item.qty,
                    minQty: item.minQty,
                  });
                }
                if (isExpiring && !isOutOfStock) {
                  expiringCount++;
                  let daysLeft = 0;
                  try {
                    const diffTime = Math.abs(
                      new Date(item.expiry).getTime() - new Date().getTime(),
                    );
                    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  } catch (e) {}
                  alerts.push({
                    type: "expiring",
                    title: item.name,
                    message: `باقي ${daysLeft} يوم`,
                    branch_id: item.branch_id,
                    daysLeft,
                  });
                }
              });
            }
            const branchMap = branchesList.reduce((acc, b) => {
              acc[b.id] = b.name;
              return acc;
            }, {});
            alerts = alerts.map((a) => ({
              ...a,
              branchName: branchMap[a.branch_id] || "الرئيسي",
            }));
            let expensesToday = 0;
            let openShifts = 0;
            let suppliersDebt = 0;
            let expQuery =
              "SELECT SUM(amount) as sum FROM expenses WHERE pharmacy_id = ? AND date LIKE ?";
            let expParams = [id, `${todayStr}%`];
            if (targetBranchName) {
              expQuery += " AND branchName = ?";
              expParams.push(targetBranchName);
            }
            db.get(expQuery, expParams, (err, row) => {
              if (!err && row) expensesToday = row.sum || 0;
              let shiftsQuery =
                "SELECT COUNT(*) as count FROM shifts WHERE pharmacy_id = ? AND status = 'open'";
              let shiftsParams = [id];
              // If shifts had a branch column, we'd filter here. Skipping for now.

              db.get(shiftsQuery, shiftsParams, (err, row) => {
                if (!err && row) openShifts = row.count || 0;
                let debtQuery =
                  "SELECT SUM(remaining) as sum FROM purchase_invoices WHERE pharmacy_id = ?";
                let debtParams = [id];
                if (targetBranchId) {
                  debtQuery += " AND branch_id = ?";
                  debtParams.push(targetBranchId);
                }
                db.get(debtQuery, debtParams, (err, row) => {
                  if (!err && row) suppliersDebt = row.sum || 0;
                  res.json({
                    success: true,
                    stats: {
                      salesToday,
                      invoicesToday,
                      lowStock,
                      outOfStock,
                      expiringCount,
                      expensesToday,
                      openShifts,
                      suppliersDebt,
                    },
                    alerts,
                    branches: branchesList,
                  });
                });
              });
            });
          });
        });
      },
    );
  });
});

app.get("/api/pharmacies/:id/inventory", (req, res) => {
  const { id } = req.params;
  const { branch_id } = req.query;
  let query = "SELECT * FROM inventory WHERE pharmacy_id = ?";
  let params = [id];
  if (branch_id && branch_id !== "all") {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      inventory: rows,
    });
  });

  // Pharmacy Settings update
});

app.put("/api/pharmacies/:id/settings", (req, res) => {
  const { id } = req.params;
  const { name, phone, receiptFooter, printerSize, showLogo } = req.body;
  db.run(
    "UPDATE pharmacies SET name = ?, phone = ?, receiptFooter = ?, printerSize = ?, showLogo = ? WHERE id = ?",
    [
      name,
      phone || "",
      receiptFooter || "",
      printerSize || "80mm",
      showLogo ? 1 : 0,
      id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.post("/api/pharmacies/:id/inventory", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const {
    name,
    scientificName,
    category,
    price,
    cost,
    price_buy,
    price_sell,
    qty,
    minQty,
    expiry,
    expiry_date,
    barcode,
    branch_id,
    units,
    isControlled,
  } = req.body;
  const finalPrice = Number(price !== undefined ? price : price_sell) || 0;
  const finalCost = Number(cost !== undefined ? cost : price_buy) || 0;
  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();

  // UNIQUE NAME CHECK POST
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

  db.run(
    "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, isControlled, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",
    [
      itemId,
      pharmacy_id,
      branch_id || null,
      barcode || "",
      name,
      scientificName || "",
      category || "",
      finalPrice,
      finalCost,
      Number(qty) || 0,
      Number(minQty) || 5,
      finalExpiry,
      units || null,
      req.body.batch_number || "",
      isControlled ? 1 : 0,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        itemId,
      });
    },
  );
  });
});

app.put("/api/pharmacies/:id/inventory/:itemId", (req, res) => {
  const { id: pharmacy_id, itemId } = req.params;
  const {
    name,
    scientificName,
    category,
    price,
    cost,
    price_buy,
    price_sell,
    qty,
    minQty,
    expiry,
    expiry_date,
    barcode,
    branch_id,
    units,
  } = req.body;
  const finalPrice = Number(price !== undefined ? price : price_sell) || 0;
  const finalCost = Number(cost !== undefined ? cost : price_buy) || 0;
  const finalExpiry = expiry || expiry_date || "";

  // UNIQUE NAME CHECK PUT
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });
    }

  db.run(
    "UPDATE inventory SET barcode = ?, name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, branch_id = ?, units = ?, batch_number = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?",
    [
      barcode || "",
      name,
      scientificName || "",
      category || "",
      finalPrice,
      finalCost,
      qty || 0,
      minQty || 5,
      finalExpiry,
      branch_id || null,
      units || null,
      req.body.batch_number || "",
      req.body.isControlled ? 1 : 0,
      itemId,
      pharmacy_id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
  });
});

app.delete("/api/pharmacies/:id/inventory/:itemId", (req, res) => {
  const { id: pharmacy_id, itemId } = req.params;
  db.run(
    `DELETE FROM inventory WHERE id = ? AND pharmacy_id = ?`,
    [itemId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.post("/api/pharmacies/:id/stock-take", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { items } = req.body; // array of { id, actual }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      error: "Invalid items array",
    });
  }
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    items.forEach((item) => {
      db.run(`UPDATE inventory SET qty = ? WHERE id = ? AND pharmacy_id = ?`, [
        item.actual,
        item.id,
        pharmacy_id,
      ]);
    });
    db.run("COMMIT", (err) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    });
  });
});

app.get("/api/pharmacies/:id/sales", (req, res) => {
  const { id } = req.params;
  const { branchName } = req.query;
  let query = "SELECT * FROM sales WHERE pharmacy_id = ?";
  let params = [id];
  if (branchName && branchName !== "all") {
    query += " AND branchName = ?";
    params.push(branchName);
  }
  query += " ORDER BY date DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    const parsedSales = (rows || []).map((s) => {
      let parsedCustomer = null;
      try {
        if (s.customer) parsedCustomer = JSON.parse(s.customer);
      } catch (e) {}
      return {
        ...s,
        items: JSON.parse(s.items || "[]"),
        customer: parsedCustomer,
      };
    });
    res.json({
      success: true,
      sales: parsedSales,
    });
  });
});

app.get("/api/pharmacies/:id/customers/:customerId/sales", (req, res) => {
  const { id, customerId } = req.params;
  // customer column contains a JSON string like {"id":"CUST-XXX", "name": "..."}
  // We can use LIKE to match the id.
  db.all(
    `SELECT * FROM sales WHERE pharmacy_id = ? AND customer LIKE ? ORDER BY date DESC`,
    [id, `%"id":"${customerId}"%`],
    (err, rows) => {
      if (err) return handleError(res, err);
      const parsedSales = (rows || []).map((s) => ({
        ...s,
        items: JSON.parse(s.items || "[]"),
        customer: JSON.parse(s.customer || "null"),
      }));
      res.json({
        success: true,
        sales: parsedSales,
      });
    },
  );
});

app.get("/api/pharmacies/:id/shift/current", (req, res) => {
  const { id } = req.params;
  const { cashierName } = req.query;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let query = "SELECT * FROM sales WHERE pharmacy_id = ? AND date LIKE ?";
  let params = [id, today + "%"];
  if (cashierName && cashierName !== "all") {
    query += " AND cashierName = ?";
    params.push(cashierName);
  }
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    let expectedCash = 0;
    let totalSalesCount = 0;
    let cashSalesCount = 0;
    (rows || []).forEach((sale) => {
      totalSalesCount++;
      if (sale.paymentMethod === "cash") {
        expectedCash += sale.total || 0;
        cashSalesCount++;
      }
    });
    res.json({
      success: true,
      expectedCash,
      totalSalesCount,
      cashSalesCount,
    });
  });
});

app.get("/api/pharmacies/:id/reports", (req, res) => {
  const { id } = req.params;
  const { branch, from, to } = req.query;
  let query = "SELECT * FROM sales WHERE pharmacy_id = ?";
  let params = [id];
  if (branch && branch !== "all") {
    query += " AND branchName = ?";
    params.push(branch);
  }
  if (from) {
    query += " AND date >= ?";
    params.push(from + "T00:00:00.000Z");
  }
  if (to) {
    query += " AND date <= ?";
    params.push(to + "T23:59:59.999Z");
  }
  query += " ORDER BY date ASC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    let totalRevenue = 0;
    let totalProfit = 0;
    const dailySales = {};
    const branchSales = {};
    const itemSales = {};
    const paymentBreakdown = {
      cash: 0,
      bank: 0,
      jawwal: 0,
      palpay: 0,
      maalchat: 0,
      credit: 0,
      other: 0,
    };
    (rows || []).forEach((sale) => {
      if (sale.status === "refunded") return;
      const saleTotal = sale.total || 0;
      totalRevenue += saleTotal;
      const day = sale.date
        ? sale.date.split("T")[0]
        : new Date().toISOString().split("T")[0];
      if (!dailySales[day]) dailySales[day] = 0;
      dailySales[day] += saleTotal;
      const bName = sale.branchName || "غير محدد";
      if (!branchSales[bName]) branchSales[bName] = 0;
      branchSales[bName] += saleTotal;

      // Payment method breakdown
      const pm = (sale.paymentMethod || "").toLowerCase();
      if (pm === "cash" || pm === "نقدي" || pm === "كاش")
        paymentBreakdown.cash += saleTotal;
      else if (pm === "bank" || pm === "بنكي")
        paymentBreakdown.bank += saleTotal;
      else if (pm === "jawwal" || pm === "jawwalpay" || pm === "جوال باي")
        paymentBreakdown.jawwal += saleTotal;
      else if (pm === "palpay" || pm === "بال باي")
        paymentBreakdown.palpay += saleTotal;
      else if (pm === "maalchat" || pm === "مالتشات")
        paymentBreakdown.maalchat += saleTotal;
      else if (pm === "credit" || pm === "آجل" || pm === "ذمم")
        paymentBreakdown.credit += saleTotal;
      else paymentBreakdown.other += saleTotal;
      let items = [];
      try {
        items = JSON.parse(sale.items || "[]");
      } catch (e) {}
      items.forEach((item) => {
        const qty = item.cartQty || 1;
        const price = item.price || 0;
        const cost = item.cost || price * 0.7;
        totalProfit += (price - cost) * qty;
        if (!itemSales[item.id]) {
          itemSales[item.id] = {
            id: item.id,
            name: item.name,
            qty: 0,
            revenue: 0,
          };
        }
        itemSales[item.id].qty += qty;
        itemSales[item.id].revenue += price * qty;
      });
    });
    const dailyTrend = Object.keys(dailySales).map((date) => ({
      date,
      revenue: dailySales[date],
    }));
    const branchPerformance = Object.keys(branchSales).map((name) => ({
      name,
      revenue: branchSales[name],
    }));
          const topItems = Object.values(itemSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      let expensesQuery = 'SELECT * FROM expenses WHERE pharmacy_id = ?';
      let expParams = [id];
      if (branch && branch !== 'all') {
        expensesQuery += ' AND branch_id = ?';
        expParams.push(branch);
      }
      if (from) {
        expensesQuery += ' AND date >= ?';
        expParams.push(from + 'T00:00:00.000Z');
      }
      if (to) {
        expensesQuery += ' AND date <= ?';
        expParams.push(to + 'T23:59:59.999Z');
      }

      db.all(expensesQuery, expParams, (errExp, expRows) => {
        let totalExpenses = 0;
        if (!errExp) {
          (expRows || []).forEach(exp => {
            totalExpenses += (exp.amount || 0);
          });
        }
        
        const netProfit = totalProfit - totalExpenses;

        res.json({
          success: true,
          data: {
            totalRevenue,
            totalProfit,
            totalExpenses,
            netProfit,
            profitMargin:
              totalRevenue > 0
                ? ((totalProfit / totalRevenue) * 100).toFixed(1)
                : 0,
            dailyTrend,
            branchPerformance,
            topItems,
            paymentBreakdown,
          },
        });
      });
  });
});

app.post("/api/pharmacies/:id/sales", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const {
    items,
    total,
    paymentMethod,
    customer,
    cashierName,
    branchName,
    prescriptionId,
  } = req.body;
  const date = new Date().toISOString();

  // Generate a unique 3-char hash for the branch name to ensure English alphanumeric and avoid Bidi printing issues
  let branchHash = 0;
  const safeBranchName = branchName || "Main";
  for (let i = 0; i < safeBranchName.length; i++) {
    branchHash = (branchHash << 5) - branchHash + safeBranchName.charCodeAt(i);
  }
  const branchStr = Math.abs(branchHash)
    .toString(36)
    .substring(0, 3)
    .toUpperCase()
    .padStart(3, "X");

  // 1 char for App (R) + 1 char for Pharmacy (first char of pharmacy_id)
  const appChar = "R";
  const pharmChar = (
    pharmacy_id.replace(/[^A-Za-z0-9]/g, "")[0] || "P"
  ).toUpperCase();

  const prefix = `${appChar}${pharmChar}${branchStr}-`;

  // Find the last invoice number for THIS specific pharmacy using the prefix
  db.get(
    `SELECT id FROM sales WHERE pharmacy_id = ? AND id LIKE ? ORDER BY CAST(SUBSTR(id, LENGTH(?)+1) AS INTEGER) DESC LIMIT 1`,
    [pharmacy_id, prefix + "%", prefix],
    (err, row) => {
      if (err) return handleError(res, err);
      let nextSeq = 1;
      if (row && row.id) {
        const lastSeq = parseInt(row.id.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      const saleId =
        req.body.id || `${prefix}${String(nextSeq).padStart(6, "0")}`;
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(
          `INSERT INTO sales (id, pharmacy_id, items, total, paymentMethod, customer, date, cashierName, branchName, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            pharmacy_id,
            JSON.stringify(items),
            total,
            paymentMethod,
            customer ? JSON.stringify(customer) : null,
            date,
            cashierName,
            branchName,
            req.body.notes || null,
          ],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              // Ensure we only respond if we haven't already
              if (!res.headersSent) {
                return res.status(500).json({
                  success: false,
                  error: err.message,
                });
              }
              return;
            }
            if (items && Array.isArray(items)) {
              items.forEach((cartItem) => {
                const deductAmount =
                  cartItem.deductQty || cartItem.cartQty || cartItem.qty || 1;
                const saleDate = date.split("T")[0];

                // FIFO: Read batches, deduct from oldest first, update price to oldest remaining batch
                db.get(
                  "SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?",
                  [cartItem.id, pharmacy_id],
                  (bErr, invRow) => {
                    let batches = [];
                    try {
                      batches = JSON.parse((invRow && invRow.batches) || "[]");
                    } catch (e) {}

                    let toDeductLeft = deductAmount;
                    let activeBatchPrice = null;
                    let activeBatchCost = null;

                    if (batches.length > 0) {
                      for (
                        let i = 0;
                        i < batches.length && toDeductLeft > 0;
                        i++
                      ) {
                        const batchHas =
                          batches[i].remaining || batches[i].qty || 0;
                        if (batchHas <= 0) continue;
                        const taken = Math.min(toDeductLeft, batchHas);
                        batches[i].remaining = batchHas - taken;
                        toDeductLeft -= taken;
                      }
                      batches = batches.filter((b) => (b.remaining || 0) > 0);
                      if (batches.length > 0) {
                        activeBatchPrice = batches[0].price;
                        activeBatchCost = batches[0].cost;
                      }
                    }

                    const batchesJson = JSON.stringify(batches);
                    if (activeBatchPrice !== null) {
                      db.run(
                        "UPDATE inventory SET qty = MAX(0, qty - ?), batches = ?, price = ?, cost = ?, lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                        [
                          deductAmount,
                          batchesJson,
                          activeBatchPrice,
                          activeBatchCost,
                          saleDate,
                          cartItem.id,
                          pharmacy_id,
                        ],
                      );
                    } else {
                      db.run(
                        "UPDATE inventory SET qty = MAX(0, qty - ?), batches = ?, lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                        [
                          deductAmount,
                          batchesJson,
                          saleDate,
                          cartItem.id,
                          pharmacy_id,
                        ],
                      );
                    }
                  },
                );
              });
            }
            if (customer && customer.id) {
              const visitDate = date.split("T")[0];
              if (
                paymentMethod === "credit" ||
                paymentMethod === "ط¢ط¬ظ„" ||
                paymentMethod === "آجل"
              ) {
                db.run(
                  `UPDATE customers SET debt = debt + ?, lastVisit = ? WHERE id = ? AND pharmacy_id = ?`,
                  [total, visitDate, customer.id, pharmacy_id],
                );
              } else {
                db.run(
                  `UPDATE customers SET lastVisit = ? WHERE id = ? AND pharmacy_id = ?`,
                  [visitDate, customer.id, pharmacy_id],
                );
              }
            }
            if (prescriptionId) {
              db.run(
                `UPDATE prescriptions SET status = 'dispensed' WHERE id = ? AND pharmacy_id = ?`,
                [prescriptionId, pharmacy_id],
              );
            }
            db.run("COMMIT", (err) => {
              if (err) {
                if (!res.headersSent)
                  return res.status(500).json({
                    success: false,
                    error: err.message,
                  });
                return;
              }
              if (!res.headersSent)
                res.json({
                  success: true,
                  saleId,
                });
            });
          },
        );
      });
    },
  );
});

app.put("/api/pharmacies/:id/sales/:saleId/refund", (req, res) => {
  const { id: pharmacy_id, saleId } = req.params;
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Get the sale to see the items
    db.get(
      "SELECT items, status FROM sales WHERE id = ? AND pharmacy_id = ?",
      [saleId, pharmacy_id],
      (err, row) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }
        if (!row) {
          db.run("ROLLBACK");
          return res.status(404).json({
            success: false,
            error: "Sale not found",
          });
        }
        if (row.status === "refunded") {
          db.run("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Sale is already refunded",
          });
        }
        const items = JSON.parse(row.items || "[]");

        // Update sale status
        db.run(
          'UPDATE sales SET status = "refunded" WHERE id = ? AND pharmacy_id = ?',
          [saleId, pharmacy_id],
        );

        // Restore inventory quantities
        if (items && Array.isArray(items)) {
          items.forEach((cartItem) => {
            db.run(
              `UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?`,
              [
                cartItem.deductQty || cartItem.cartQty || cartItem.qty || 1,
                cartItem.id,
                pharmacy_id,
              ],
            );
          });
        }
        db.run("COMMIT", (err) => {
          if (err) return handleError(res, err);
          res.json({
            success: true,
          });
        });
      },
    );
  });
});

app.put("/api/pharmacies/:id/sales/:saleId/refund_partial", (req, res) => {
  const { id: pharmacy_id, saleId } = req.params;
  const { itemsToRefund } = req.body; // Array of { id, qty }

  if (
    !itemsToRefund ||
    !Array.isArray(itemsToRefund) ||
    itemsToRefund.length === 0
  ) {
    return res.status(400).json({
      success: false,
      error: "No items provided for refund",
    });
  }
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.get(
      "SELECT items, total, status FROM sales WHERE id = ? AND pharmacy_id = ?",
      [saleId, pharmacy_id],
      (err, row) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }
        if (!row) {
          db.run("ROLLBACK");
          return res.status(404).json({
            success: false,
            error: "Sale not found",
          });
        }
        if (row.status === "refunded") {
          db.run("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Sale is already refunded",
          });
        }
        let currentItems = JSON.parse(row.items || "[]");
        let currentTotal = row.total || 0;
        let totalRefundAmount = 0;
        let hasError = false;

        // Process each requested refund item
        itemsToRefund.forEach((refundReq) => {
          const itemIdx = currentItems.findIndex((i) => i.id === refundReq.id);
          if (itemIdx === -1) return; // Item not found in sale

          const item = currentItems[itemIdx];
          const itemQty = item.cartQty || item.qty || 1;

          // Cannot refund more than what was bought (accounting for already returned qty if any, but we are modifying cartQty directly)
          const qtyToReturn = Math.min(refundReq.qty, itemQty);
          if (qtyToReturn <= 0) return;

          // Reduce cartQty
          currentItems[itemIdx].cartQty = itemQty - qtyToReturn;

          // Calculate refund amount
          const itemPrice = item.price || 0;
          totalRefundAmount += qtyToReturn * itemPrice;

          // Update inventory for this item
          db.run(
            `UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?`,
            [qtyToReturn, item.id, pharmacy_id],
            (err) => {
              if (err) hasError = true;
            },
          );
        });
        if (hasError) {
          db.run("ROLLBACK");
          return res.status(500).json({
            success: false,
            error: "Error updating inventory",
          });
        }

        // Check if all items are fully returned (cartQty === 0 for all)
        const allFullyReturned = currentItems.every(
          (i) => (i.cartQty !== undefined ? i.cartQty : i.qty) <= 0,
        );
        const newStatus = allFullyReturned ? "refunded" : "completed";
        const newTotal = Math.max(0, currentTotal - totalRefundAmount);

        // Update the sale record
        db.run(
          "UPDATE sales SET items = ?, total = ?, status = ? WHERE id = ? AND pharmacy_id = ?",
          [
            JSON.stringify(currentItems),
            newTotal,
            newStatus,
            saleId,
            pharmacy_id,
          ],
          (err) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({
                success: false,
                error: err.message,
              });
            }
            db.run("COMMIT", (err) => {
              if (err) return handleError(res, err);
              res.json({
                success: true,
                newTotal,
                status: newStatus,
                refundedAmount: totalRefundAmount,
              });
            });
          },
        );
      },
    );
  });
});

app.post("/api/pharmacies/:id/purchase-orders", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { supplier_name, items, total } = req.body;
  const orderId =
    "PO-" +
    new Date().getFullYear() +
    "-" +
    Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
  const date = new Date().toISOString().split("T")[0];
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run(
      `INSERT INTO purchase_orders (id, pharmacy_id, supplier_name, date, items, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        pharmacy_id,
        supplier_name,
        date,
        JSON.stringify(items),
        total,
        "pending",
      ],
    );
    db.run("COMMIT", (err) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        orderId,
      });
    });
  });
});

app.post("/api/pharmacies/:id/prescriptions", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { patient, doctor, date, items } = req.body;

  // Generate pharmacy-specific prefix so IDs are globally unique
  let hash = 0;
  for (let i = 0; i < pharmacy_id.length; i++)
    hash = (hash << 5) - hash + pharmacy_id.charCodeAt(i);
  const prefix =
    "PRX" + Math.abs(hash).toString(36).substring(0, 3).toUpperCase() + "-";
  db.get(
    `SELECT id FROM prescriptions WHERE pharmacy_id = ? AND id LIKE ? ORDER BY CAST(SUBSTR(id, LENGTH(?)+1) AS INTEGER) DESC LIMIT 1`,
    [pharmacy_id, prefix + "%", prefix],
    (err, row) => {
      if (err) return handleError(res, err);
      let nextSeq = 1;
      if (row && row.id) {
        const lastSeq = parseInt(row.id.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      const prxId =
        req.body.id || `${prefix}${String(nextSeq).padStart(3, "0")}`;
      db.run(
        `INSERT INTO prescriptions (id, pharmacy_id, patient, doctor, date, status, items) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [
          prxId,
          pharmacy_id,
          patient,
          doctor,
          date,
          JSON.stringify(items || []),
        ],
        function (err) {
          if (err) return handleError(res, err);
          res.json({
            success: true,
            prxId,
          });
        },
      );
    },
  );
});

app.put("/api/pharmacies/:id/prescriptions/:prxId/dispense", (req, res) => {
  const { id: pharmacy_id, prxId } = req.params;
  db.run(
    'UPDATE prescriptions SET status = "dispensed" WHERE id = ? AND pharmacy_id = ?',
    [prxId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.get("/api/pharmacies/:id/customers", (req, res) => {
  const { id } = req.params;
  const { branch_id } = req.query;
  let query = "SELECT * FROM customers WHERE pharmacy_id = ?";
  let params = [id];
  if (branch_id && branch_id !== "all") {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  query += " ORDER BY lastVisit DESC, id DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      customers: rows || [],
    });
  });
});

app.post("/api/pharmacies/:id/customers", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { name, phone, branch_id } = req.body;
  const date = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < pharmacy_id.length; i++)
    hash = (hash << 5) - hash + pharmacy_id.charCodeAt(i);
  const prefix =
    "CUST" +
    Math.abs(hash).toString(36).substring(0, 4).toUpperCase().padStart(4, "X") +
    "-";
  db.get(
    `SELECT id FROM customers WHERE pharmacy_id = ? AND id LIKE ? ORDER BY CAST(SUBSTR(id, LENGTH(?)+1) AS INTEGER) DESC LIMIT 1`,
    [pharmacy_id, prefix + "%", prefix],
    (err, row) => {
      if (err) return handleError(res, err);
      let nextSeq = 1;
      if (row && row.id) {
        const match = row.id.match(new RegExp("^" + prefix + "(\\d+)$"));
        if (match) nextSeq = parseInt(match[1], 10) + 1;
      }
      const custId =
        req.body.id || `${prefix}${String(nextSeq).padStart(3, "0")}`;
      db.run(
        `INSERT INTO customers (id, pharmacy_id, name, phone, debt, lastVisit, branch_id) VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [custId, pharmacy_id, name, phone, date, branch_id || null],
        function (err) {
          if (err) return handleError(res, err);
          res.json({
            success: true,
            custId,
          });
        },
      );
    },
  );
});

app.put("/api/pharmacies/:id/customers/:custId", (req, res) => {
  const { name, phone, address, notes, family } = req.body;
  const familyJson = family ? JSON.stringify(family) : "[]";
  db.run(
    "UPDATE customers SET name=?, phone=?, address=?, notes=?, family=? WHERE id=? AND pharmacy_id=?",
    [name, phone, address, notes, familyJson, req.params.custId, req.params.id],
    function (err) {
      if (err)
        return res.status(500).json({
          error: err.message,
        });
      res.json({
        success: true,
        changes: this.changes,
      });
    },
  );
});

app.delete("/api/pharmacies/:id/customers/:custId", (req, res) => {
  db.run(
    "DELETE FROM customers WHERE id=? AND pharmacy_id=?",
    [req.params.custId, req.params.id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.put("/api/pharmacies/:id/customers/:custId/debt", (req, res) => {
  const { id: pharmacy_id, custId } = req.params;
  const payment = Number(req.body.payment) || 0;
  const date = new Date().toISOString();
  db.run(
    "UPDATE customers SET debt = COALESCE(debt, 0) - ? WHERE id = ? AND pharmacy_id = ?",
    [payment, custId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);

      // Radical Solution: Fetch customer data and insert the payment directly into the sales table
      db.get(
        "SELECT * FROM customers WHERE id = ? AND pharmacy_id = ?",
        [custId, pharmacy_id],
        (err3, custData) => {
          let custJSON = null;
          if (custData) {
            custJSON = JSON.stringify({
              id: custData.id,
              name: custData.name,
              phone: custData.phone,
            });
          }

          // Use a random 5 digit ID to match frontend paymentRecord ID generation
          const paymentId = Math.floor(
            10000 + Math.random() * 90000,
          ).toString();
          db.run(
            "INSERT INTO sales (id, pharmacy_id, items, total, paymentMethod, customer, date, cashierName, branchName, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              paymentId,
              pharmacy_id,
              "[]",
              payment,
              "تسديد دين",
              custJSON,
              date,
              "غير محدد",
              "الصيدلية الرئيسية",
              "completed",
            ],
            function (err2) {
              if (err2)
                console.error("Error recording debt payment to sales:", err2);
              res.json({
                success: true,
              });
            },
          );
        },
      );
    },
  );
});

app.get("/api/pharmacies/:id/customers/:custId/debt-payments", (req, res) => {
  const { id: pharmacy_id, custId } = req.params;
  db.all(
    "SELECT * FROM debt_payments WHERE pharmacy_id = ? AND customer_id = ? ORDER BY date DESC",
    [pharmacy_id, custId],
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        payments: rows,
      });
    },
  );
});

// ==========================================
// Smart Purchases
// ==========================================

app.post("/api/pharmacies/:id/purchases", (req, res) => {
  const { id } = req.params;
  const { supplier_id, supplier_name, items, total_cost, branch } = req.body;

  const invId = req.body.id || "PINV-" + Date.now();
  const date = new Date().toISOString();

  db.run(
    "INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      invId,
      id,
      supplier_id || "",
      supplier_name,
      JSON.stringify(items || []),
      total_cost,
      0,
      total_cost,
      "",
      date,
      "",
      branch || "Main",
      "draft",
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({ success: true, id: invId });
    },
  );
});

app.delete("/api/pharmacies/:id/purchases/:orderId", (req, res) => {
  const { id, orderId } = req.params;
  db.get(
    "SELECT status FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
    [orderId, id],
    (err, row) => {
      if (err) return handleError(res, err);
      if (row && row.status === "completed")
        return res
          .status(400)
          .json({ success: false, error: "Cannot delete completed invoice" });
      db.run(
        "DELETE FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
        [orderId, id],
        (err2) => {
          if (err2) return handleError(res, err2);
          res.json({ success: true });
        },
      );
    },
  );
});

app.put("/api/pharmacies/:id/purchases/:orderId", async (req, res) => {
  const { id, orderId } = req.params;
  const { status, items, supplierInvoiceNumber } = req.body;

  if (items && items.length > 0) {
    const total_cost = items.reduce((acc, i) => acc + i.qty * (i.cost || 0), 0);
    await new Promise((resolve) => {
      db.run(
        "UPDATE purchase_invoices SET items = ?, total_cost = ?, remaining = ?, invoice_number = ? WHERE id = ? AND pharmacy_id = ?",
        [
          JSON.stringify(items),
          total_cost,
          total_cost,
          supplierInvoiceNumber || "",
          orderId,
          id,
        ],
        resolve,
      );
    });
  }

  if (status === "received") {
    try {
      const port = process.env.PORT || 3001;
      const resp = await fetch(
        `http://localhost:${port}/api/pharmacies/${id}/purchase-invoices/${orderId}/complete`,
        { method: "PUT" },
      );
      const data = await resp.json();
      if (!data.success)
        return res.status(500).json({ success: false, error: data.error });
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  } else {
    res.json({ success: true });
  }
});

app.get("/api/pharmacies/:id/batches", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { drug_id } = req.query;
  let query = "SELECT * FROM batches WHERE pharmacy_id = ?";
  let params = [pharmacy_id];
  if (drug_id) {
    query += " AND drug_id = ?";
    params.push(drug_id);
  }
  query += " ORDER BY expiry_date ASC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      batches: rows || [],
    });
  });

  // ط¥ط¶ط§ظپط© ط¯ظپط¹ط© ط¬ط¯ظٹط¯ط©
});

app.post("/api/pharmacies/:id/batches", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { drug_id, drug_name, batch_number, expiry_date, qty, purchase_price } =
    req.body;
  const batchId = "BATCH-" + Date.now();
  const date_added = new Date().toISOString();
  db.run(
    `INSERT INTO batches (id, pharmacy_id, drug_id, drug_name, batch_number, expiry_date, qty, purchase_price, date_added)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchId,
      pharmacy_id,
      drug_id,
      drug_name,
      batch_number,
      expiry_date,
      qty,
      purchase_price || 0,
      date_added,
    ],
    function (err) {
      if (err) return handleError(res, err);
      // طھط­ط¯ظٹط« ط§ظ„ظƒظ…ظٹط© ظپظٹ ط§ظ„ظ…ط®ط²ظˆظ†
      db.run(
        "UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?",
        [qty, drug_id, pharmacy_id],
      );
      res.json({
        success: true,
        id: batchId,
      });
    },
  );

  // ط­ط°ظپ ط¯ظپط¹ط©
});

app.delete("/api/pharmacies/:id/batches/:batchId", (req, res) => {
  const { id: pharmacy_id, batchId } = req.params;
  db.get(
    "SELECT * FROM batches WHERE id = ? AND pharmacy_id = ?",
    [batchId, pharmacy_id],
    (err, batch) => {
      if (err || !batch)
        return res.status(404).json({
          success: false,
          error: "ط¯ظپط¹ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©",
        });
      db.run("DELETE FROM batches WHERE id = ?", [batchId], function (err2) {
        if (err2)
          return res.status(500).json({
            success: false,
            error: err2.message,
          });
        // خصم الكمية من المخزون مع فحص الأسعار المعلقة
        const deductAmount = batch.qty;
        db.run(
          `UPDATE inventory 
           SET 
             price = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN pending_price ELSE price END,
             cost = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN pending_cost ELSE cost END,
             pending_price = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_price END,
             pending_cost = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_cost END,
             pending_qty = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_qty END,
             qty = MAX(0, qty - ?)
           WHERE id = ? AND pharmacy_id = ?`,
          [
            deductAmount,
            deductAmount,
            deductAmount,
            deductAmount,
            deductAmount,
            deductAmount,
            batch.drug_id,
            pharmacy_id,
          ],
        );
        res.json({
          success: true,
        });
      });
    },
  );

  // ط§ظ„ط£ط¯ظˆظٹط© ط§ظ„ظ‚ط±ظٹط¨ط© ظ…ظ† ط§ظ„ط§ظ†طھظ‡ط§ط، (ط®ظ„ط§ظ„ 60 ظٹظˆظ…)
});

app.get("/api/pharmacies/:id/batches/expiring-soon", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const days = req.query.days || 60;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + parseInt(days));
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  db.all(
    "SELECT * FROM batches WHERE pharmacy_id = ? AND expiry_date <= ? AND expiry_date >= ? AND qty > 0 ORDER BY expiry_date ASC",
    [pharmacy_id, cutoffStr, todayStr],
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        batches: rows || [],
      });
    },
  );

  // â”€â”€â”€ Expenses APIs (ط§ظ„ظ…طµط±ظˆظپط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/pharmacies/:id/expenses", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { from, to, branch_id } = req.query;
  let query = "SELECT * FROM expenses WHERE pharmacy_id = ?";
  let params = [pharmacy_id];
  if (branch_id && branch_id !== "all") {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  if (from) {
    query += " AND date >= ?";
    params.push(from);
  }
  if (from) {
    query += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND date <= ?";
    params.push(to + "T23:59:59.999Z");
  }
  query += " ORDER BY date DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      expenses: rows || [],
    });
  });
});

app.post("/api/pharmacies/:id/expenses", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { category, description, amount, created_by, branch_id } = req.body;
  const expId = "EXP-" + Date.now();
  const date = new Date().toISOString();
  db.run(
    "INSERT INTO expenses (id, pharmacy_id, category, description, amount, date, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      expId,
      pharmacy_id,
      category,
      description || "",
      amount,
      date,
      created_by || "",
      branch_id || null,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        id: expId,
      });
    },
  );
});

app.delete("/api/pharmacies/:id/expenses/:expId", (req, res) => {
  const { id: pharmacy_id, expId } = req.params;
  db.run(
    "DELETE FROM expenses WHERE id = ? AND pharmacy_id = ?",
    [expId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );

  // â”€â”€â”€ Shifts APIs (ط§ظ„ظˆط±ط¯ظٹط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ظپطھط­ ظˆط±ط¯ظٹط© ط¬ط¯ظٹط¯ط©
});

app.post("/api/pharmacies/:id/shifts/open", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { cashier_name, cashier_email, opening_amount } = req.body;
  // ظ†طھط­ظ‚ظ‚ ط£ظ†ظ‡ ظ„ط§ طھظˆط¬ط¯ ظˆط±ط¯ظٹط© ظ…ظپطھظˆط­ط© ظ„ظ‡ط°ط§ ط§ظ„ظƒط§ط´ظٹط±
  db.get(
    "SELECT * FROM shifts WHERE pharmacy_id = ? AND cashier_email = ? AND status = 'open'",
    [pharmacy_id, cashier_email],
    (err, existing) => {
      if (existing)
        return res.status(400).json({
          success: false,
          error:
            "ظٹظˆط¬ط¯ ظˆط±ط¯ظٹط© ظ…ظپطھظˆط­ط© ط¨ط§ظ„ظپط¹ظ„ ظ„ظ‡ط°ط§ ط§ظ„ظƒط§ط´ظٹط±",
        });
      const shiftId = "SHIFT-" + Date.now();
      const open_time = new Date().toISOString();
      db.run(
        `INSERT INTO shifts (id, pharmacy_id, cashier_name, cashier_email, opening_amount, status, open_time)
         VALUES (?, ?, ?, ?, ?, 'open', ?)`,
        [
          shiftId,
          pharmacy_id,
          cashier_name,
          cashier_email,
          opening_amount || 0,
          open_time,
        ],
        function (err2) {
          if (err2)
            return res.status(500).json({
              success: false,
              error: err2.message,
            });
          res.json({
            success: true,
            shiftId,
          });
        },
      );
    },
  );

  // ط¥ط؛ظ„ط§ظ‚ ظˆط±ط¯ظٹط©
});

app.post("/api/pharmacies/:id/shifts/:shiftId/close", (req, res) => {
  const { id: pharmacy_id, shiftId } = req.params;
  const { closing_amount, notes } = req.body;
  const close_time = new Date().toISOString();
  // ظ†ط­ط³ط¨ ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظˆط±ط¯ظٹط© ظ…ظ† ط¬ط¯ظˆظ„ sales
  db.get(
    "SELECT * FROM shifts WHERE id = ? AND pharmacy_id = ?",
    [shiftId, pharmacy_id],
    (err, shift) => {
      if (err || !shift)
        return res.status(404).json({
          success: false,
          error: "ظˆط±ط¯ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©",
        });
      db.all(
        "SELECT * FROM sales WHERE pharmacy_id = ? AND date >= ? AND date <= ?",
        [pharmacy_id, shift.open_time, close_time],
        (err2, sales) => {
          let cash_sales = 0,
            card_sales = 0;
          (sales || []).forEach((s) => {
            if (s.paymentMethod === "cash" || s.paymentMethod === "ظ†ظ‚ط¯ظٹ")
              cash_sales += s.total || 0;
            if (s.paymentMethod === "card" || s.paymentMethod === "ط¨ط·ط§ظ‚ط©")
              card_sales += s.total || 0;
          });
          const expected_amount = parseFloat(shift.opening_amount) + cash_sales;
          db.run(
            `UPDATE shifts SET closing_amount = ?, expected_amount = ?, cash_sales = ?, card_sales = ?, status = 'closed', close_time = ?, notes = ? WHERE id = ?`,
            [
              closing_amount,
              expected_amount,
              cash_sales,
              card_sales,
              close_time,
              notes || "",
              shiftId,
            ],
            function (err3) {
              if (err3)
                return res.status(500).json({
                  success: false,
                  error: err3.message,
                });
              res.json({
                success: true,
                cash_sales,
                card_sales,
                expected_amount,
                closing_amount,
              });
            },
          );
        },
      );
    },
  );

  // ط§ظ„ظˆط±ط¯ظٹط© ط§ظ„ظ…ظپطھظˆط­ط© ط§ظ„ط­ط§ظ„ظٹط© ظ„ظ„ظƒط§ط´ظٹط±
});

app.get("/api/pharmacies/:id/shifts/current", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { cashier_email } = req.query;
  db.get(
    "SELECT * FROM shifts WHERE pharmacy_id = ? AND cashier_email = ? AND status = 'open' ORDER BY open_time DESC",
    [pharmacy_id, cashier_email],
    (err, row) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        shift: row || null,
      });
    },
  );

  // ط¬ظ…ظٹط¹ ط§ظ„ظˆط±ط¯ظٹط§طھ
});

app.get("/api/pharmacies/:id/shifts", (req, res) => {
  const { id: pharmacy_id } = req.params;
  db.all(
    "SELECT * FROM shifts WHERE pharmacy_id = ? ORDER BY open_time DESC",
    [pharmacy_id],
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        shifts: rows || [],
      });
    },
  );

  // â”€â”€â”€ Purchase Invoices APIs (ظپظˆط§طھظٹط± ط§ظ„ظ…ط´طھط±ظٹط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/pharmacies/:id/purchase-invoices", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { branch_id } = req.query;
  let query = "SELECT * FROM purchase_invoices WHERE pharmacy_id = ?";
  let params = [pharmacy_id];
  if (branch_id && branch_id !== "all") {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  query += " ORDER BY date DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({ success: true, invoices: rows || [] });
  });
});

app.post("/api/pharmacies/:id/purchase-invoices", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const {
    supplier_id,
    supplier_name,
    items,
    total_cost,
    paid_amount,
    invoice_number,
    notes,
    branch_id,
    status,
  } = req.body;
  const invId = req.body.id || "PINV-" + Date.now();
  const date = new Date().toISOString();
  const remaining = (total_cost || 0) - (paid_amount || 0);
  const invStatus = status || "completed";

  db.run(
    "INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      invId,
      pharmacy_id,
      supplier_id || "",
      supplier_name,
      JSON.stringify(items || []),
      total_cost,
      paid_amount || 0,
      remaining,
      invoice_number || "",
      date,
      notes || "",
      branch_id || null,
      invStatus,
    ],
    function (err) {
      if (err) return handleError(res, err);
      if (invStatus === "completed") {
        (items || []).forEach((item) => {
          const _effQty1 = Math.round((item.qty || 0) * (item.unit_size || 1));
          const unitsData = JSON.stringify({
            has_parts: item.has_parts,
            part1_name: item.part1_name,
            part1_qty: item.part1_qty,
            part1_price: item.part1_price,
            has_subparts: item.has_subparts,
            part2_name: item.part2_name,
            part2_qty: item.part2_qty,
            part2_price: item.part2_price,
          });
          // FIFO: read existing batches, append new batch, update qty & cost & units
          db.get(
            "SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?",
            [item.id, pharmacy_id],
            (bErr, row) => {
              let batches = [];
              try {
                batches = JSON.parse((row && row.batches) || "[]");
              } catch (e) {}
              // Add new batch
              batches.push({
                qty: _effQty1,
                remaining: _effQty1,
                cost: item.purchase_price || 0,
                price: item.sell_price || 0,
                date: new Date().toISOString(),
              });
              db.run(
                "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
                [
                  _effQty1,
                  item.purchase_price || 0,
                  item.sell_price || 0,
                  unitsData,
                  JSON.stringify(batches),
                  item.id,
                  pharmacy_id,
                ],
              );
            },
          );
        });
        if (supplier_id && remaining > 0) {
          db.run(
            "UPDATE suppliers SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND pharmacy_id = ?",
            [remaining, supplier_id, pharmacy_id],
          );
        }
      }
      res.json({ success: true, id: invId });
    },
  );
});

app.put("/api/pharmacies/:id/purchase-invoices/:invId/complete", (req, res) => {
  const { id: pharmacy_id, invId } = req.params;
  db.get(
    "SELECT * FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
    [invId, pharmacy_id],
    (err, invoice) => {
      if (err) return handleError(res, err);
      if (!invoice)
        return res
          .status(404)
          .json({ success: false, error: "Invoice not found" });
      if (invoice.status === "completed") return res.json({ success: true });

      db.run(
        "UPDATE purchase_invoices SET status = 'completed' WHERE id = ? AND pharmacy_id = ?",
        [invId, pharmacy_id],
        (err) => {
          if (err) return handleError(res, err);
          try {
            const items = JSON.parse(invoice.items || "[]");
            items.forEach((item) => {
              const _effQty2 = Math.round(
                (item.qty || 0) * (item.unit_size || 1),
              );
              const unitsData = JSON.stringify({
                has_parts: item.has_parts,
                part1_name: item.part1_name,
                part1_qty: item.part1_qty,
                part1_price: item.part1_price,
                has_subparts: item.has_subparts,
                part2_name: item.part2_name,
                part2_qty: item.part2_qty,
                part2_price: item.part2_price,
              });
              db.get(
                "SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?",
                [item.id, pharmacy_id],
                (bErr, row) => {
                  let batches = [];
                  try {
                    batches = JSON.parse((row && row.batches) || "[]");
                  } catch (e) {}
                  batches.push({
                    qty: _effQty2,
                    remaining: _effQty2,
                    cost: item.purchase_price || 0,
                    price: item.sell_price || 0,
                    date: new Date().toISOString(),
                  });
                  db.run(
                    "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
                    [
                      _effQty2,
                      item.purchase_price || 0,
                      item.sell_price || 0,
                      unitsData,
                      JSON.stringify(batches),
                      item.id,
                      pharmacy_id,
                    ],
                  );
                },
              );
            });
          } catch (e) {}
          if (invoice.supplier_id && invoice.remaining > 0) {
            db.run(
              "UPDATE suppliers SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND pharmacy_id = ?",
              [invoice.remaining, invoice.supplier_id, pharmacy_id],
            );
          }
          res.json({ success: true });
        },
      );
    },
  );
});

app.put("/api/pharmacies/:id/purchase-invoices/:invId/pay", (req, res) => {
  const { id: pharmacy_id, invId } = req.params;
  const payment = Number(req.body.payment) || 0;
  db.run(
    "UPDATE purchase_invoices SET paid_amount = paid_amount + ?, remaining = MAX(0, remaining - ?) WHERE id = ? AND pharmacy_id = ?",
    [payment, payment, invId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.delete("/api/pharmacies/:id/purchase-invoices/:invId", (req, res) => {
  const { id: pharmacy_id, invId } = req.params;
  db.get(
    "SELECT * FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
    [invId, pharmacy_id],
    (err, invoice) => {
      if (err) return handleError(res, err);
      if (!invoice) return res.json({ success: true });

      if (invoice.status === "completed") {
        try {
          const items = JSON.parse(invoice.items || "[]");
          items.forEach((item) => {
            const effQty3 = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run(
              "UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?",
              [effQty3, item.id, pharmacy_id],
            );
          });
          if (invoice.supplier_id && invoice.remaining > 0) {
            db.run(
              "UPDATE suppliers SET balance = MAX(0, COALESCE(balance, 0) - ?) WHERE id = ? AND pharmacy_id = ?",
              [invoice.remaining, invoice.supplier_id, pharmacy_id],
            );
          }
        } catch (e) {}
      }

      db.run(
        "DELETE FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
        [invId, pharmacy_id],
        function (err) {
          if (err) return handleError(res, err);
          res.json({ success: true });
        },
      );
    },
  );

  // â”€â”€â”€ Suppliers APIs (ط§ظ„ظ…ظˆط±ط¯ظٹظ†) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
});

app.get("/api/pharmacies/:id/suppliers", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { branch_id } = req.query;
  let query = "SELECT * FROM suppliers WHERE pharmacy_id = ?";
  let params = [pharmacy_id];
  if (branch_id && branch_id !== "all") {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  query += " ORDER BY date_added DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({
      success: true,
      suppliers: rows || [],
    });
  });
});

app.post("/api/pharmacies/:id/suppliers", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { name, phone, email, company, notes, branch_id } = req.body;
  const supplierId = "SUP-" + Date.now();
  const date_added = new Date().toISOString();
  db.run(
    "INSERT INTO suppliers (id, pharmacy_id, name, phone, email, company, balance, notes, date_added, branch_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
    [
      supplierId,
      pharmacy_id,
      name,
      phone || "",
      email || "",
      company || "",
      notes || "",
      date_added,
      branch_id || null,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        id: supplierId,
      });
    },
  );
});

app.put("/api/pharmacies/:id/suppliers/:suppId", (req, res) => {
  const { id: pharmacy_id, suppId } = req.params;
  const { name, phone, email, company, notes } = req.body;
  db.run(
    "UPDATE suppliers SET name = ?, phone = ?, email = ?, company = ?, notes = ? WHERE id = ? AND pharmacy_id = ?",
    [
      name,
      phone || "",
      email || "",
      company || "",
      notes || "",
      suppId,
      pharmacy_id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});

app.post("/api/pharmacies/:id/suppliers/:suppId/payment", (req, res) => {
  const { id: pharmacy_id, suppId } = req.params;
  const amount = Number(req.body.amount) || 0;
  db.run(
    "UPDATE suppliers SET balance = COALESCE(balance, 0) - ? WHERE id = ? AND pharmacy_id = ?",
    [amount, suppId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
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
});

const PORT = process.env.ALWAYSDATA_HTTPD_PORT || process.env.PORT || 3001;
const IP = process.env.ALWAYSDATA_HTTPD_IP || process.env.IP || "0.0.0.0";

// ══════════════════════════════════════════════════
// 📊 إحصائيات صيدلية محددة
// ══════════════════════════════════════════════════
app.get("/api/admin/pharmacies/:id/stats", async (req, res) => {
  const { id } = req.params;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const getP = (sql, params = []) => new Promise((resolve) => db.get(sql, params, (e, r) => resolve(r || {})));

  try {
    const monthSales = await getP("SELECT COUNT(*) as cnt, SUM(total) as sum FROM sales WHERE pharmacy_id = ? AND date >= ?", [id, startOfMonth.toISOString()]);
    const totalSales = await getP("SELECT COUNT(*) as cnt, SUM(total) as sum FROM sales WHERE pharmacy_id = ?", [id]);
    const lastSale = await getP("SELECT date, total FROM sales WHERE pharmacy_id = ? ORDER BY date DESC LIMIT 1", [id]);
    const inventory = await getP("SELECT COUNT(*) as cnt, SUM(stock * purchase_price) as sum FROM inventory WHERE pharmacy_id = ?", [id]);
    const staff = await getP("SELECT COUNT(*) as cnt FROM staff WHERE pharmacy_id = ?", [id]);
    const branches = await getP("SELECT COUNT(*) as cnt FROM branches WHERE pharmacy_id = ?", [id]);

    res.json({
      success: true,
      invoicesThisMonth: monthSales.cnt || 0,
      salesThisMonth: monthSales.sum || 0,
      totalInvoices: totalSales.cnt || 0,
      totalSales: totalSales.sum || 0,
      lastSaleDate: lastSale.date || null,
      lastSaleAmount: lastSale.total || 0,
      inventoryItems: inventory.cnt || 0,
      inventoryValue: inventory.sum || 0,
      staffCount: staff.cnt || 0,
      branchCount: branches.cnt || 0,
    });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════
app.put("/api/admin/pharmacies/:id/reset-password", (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword)
    return res
      .status(400)
      .json({ success: false, error: "كلمة المرور مطلوبة" });
  db.run(
    "UPDATE users SET password = ? WHERE pharmacy_id = ? AND role = 'manager'",
    [newPassword, id],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },
  );
});

// ══════════════════════════════════════════════════
// 📩 إشعار خاص لصيدلية واحدة
// ══════════════════════════════════════════════════
app.post("/api/admin/pharmacies/:id/notify", (req, res) => {
  const { id } = req.params;
  const { title, message } = req.body;
  if (!title || !message)
    return res.status(400).json({ success: false, error: "البيانات ناقصة" });

  db.run(
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
      io.to(id).emit("new_notification", { title, body: message, type: "system_alert" });
      res.json({ success: true });
    },
  );
});

// ══════════════════════════════════════════════════
// 🏷️ سعر VIP مخصص لصيدلية
// ══════════════════════════════════════════════════
app.put("/api/admin/pharmacies/:id/custom-price", (req, res) => {
  const { id } = req.params;
  const { customPrice } = req.body;
  db.run(
    "UPDATE pharmacies SET customPrice = ? WHERE id = ?",
    [
      customPrice === null || customPrice === undefined
        ? null
        : parseFloat(customPrice),
      id,
    ],
    function (err) {
      if (err) {
        // Column might not exist yet, try to add it
        db.run(
          "ALTER TABLE pharmacies ADD COLUMN customPrice REAL DEFAULT NULL",
          () => {
            db.run(
              "UPDATE pharmacies SET customPrice = ? WHERE id = ?",
              [customPrice === null ? null : parseFloat(customPrice), id],
              (err2) => {
                if (err2) return res.status(500).json({ success: false });
                res.json({ success: true });
              },
            );
          },
        );
        return;
      }
      res.json({ success: true });
    },
  );
});

// ==========================================
// Platform Staff API
// ==========================================
app.get("/api/admin/platform-staff", (req, res) => {
  db.all(
    "SELECT id, name, email, role, created_at FROM platform_staff",
    [],
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({ success: true, staff: rows });
    },
  );
});

app.post("/api/admin/platform-staff", (req, res) => {
  const { name, email, password, role } = req.body;
  const id = "ps-" + Date.now();
  db.run(
    "INSERT INTO platform_staff (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
    [id, name, email, password, role || "staff"],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});

app.put("/api/admin/platform-staff/:id", (req, res) => {
  const { name, email, password, role } = req.body;
  if (password) {
    db.run(
      "UPDATE platform_staff SET name = ?, email = ?, password = ?, role = ? WHERE id = ?",
      [name, email, password, role, req.params.id],
      (err) => {
        if (err) return handleError(res, err);
        res.json({ success: true });
      },
    );
  } else {
    db.run(
      "UPDATE platform_staff SET name = ?, email = ?, role = ? WHERE id = ?",
      [name, email, role, req.params.id],
      (err) => {
        if (err) return handleError(res, err);
        res.json({ success: true });
      },
    );
  }
});

app.delete("/api/admin/platform-staff/:id", (req, res) => {
  if (req.params.id === "superadmin-owner") {
    return res
      .status(403)
      .json({ success: false, error: "Cannot delete the main owner." });
  }
  db.run("DELETE FROM platform_staff WHERE id = ?", [req.params.id], (err) => {
    if (err) return handleError(res, err);
    res.json({ success: true });
  });
});

app.put("/api/admin/tickets/:id", (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.run(
    "UPDATE tickets SET status = ? WHERE id = ?",
    [status, id],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },
  );
});

// ==========================================
// Subscription Plans API
// ==========================================
app.get("/api/admin/subscription-plans", (req, res) => {
  db.all(
    "SELECT * FROM subscription_plans ORDER BY durationMonths ASC",
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({ success: true, plans: rows });
    },
  );
});

app.get("/api/subscription-plans", (req, res) => {
  db.all(
    "SELECT * FROM subscription_plans WHERE isActive = 1 ORDER BY durationMonths ASC",
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({ success: true, plans: rows });
    },
  );
});

app.post("/api/admin/subscription-plans", (req, res) => {
  const { id, name, price, oldPrice, features, durationMonths, isActive } =
    req.body;
  const planId = id || "plan_" + Date.now();
  db.run(
    "INSERT INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      planId,
      name,
      price,
      oldPrice || null,
      JSON.stringify(features || []),
      durationMonths || 1,
      isActive !== undefined ? isActive : 1,
    ],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true, id: planId });
    },
  );
});

app.put("/api/admin/subscription-plans/:id", (req, res) => {
  const { name, price, oldPrice, features, durationMonths, isActive } =
    req.body;
  db.run(
    "UPDATE subscription_plans SET name = ?, price = ?, oldPrice = ?, features = ?, durationMonths = ?, isActive = ? WHERE id = ?",
    [
      name,
      price,
      oldPrice || null,
      JSON.stringify(features || []),
      durationMonths || 1,
      isActive !== undefined ? isActive : 1,
      req.params.id,
    ],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});

app.delete("/api/admin/subscription-plans/:id", (req, res) => {
  db.run(
    "DELETE FROM subscription_plans WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});

server.listen(PORT, IP, () => {
  db.get(
    "SELECT isMaintenance FROM admin_settings WHERE id = 1",
    (err, row) => {
      if (row) GLOBAL_MAINTENANCE = row.isMaintenance === 1;
      console.log(
        "Server listening on port " + PORT,
        "Maintenance:",
        GLOBAL_MAINTENANCE,
      );
    },
  );
});
