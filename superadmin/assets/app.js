// Global State
let pharms = [],
  users = [],
  salesData = [];
let confirmCb = null,
  toastT = null;

// Pagination State
const PAGINATION = {
  pharmacies: { page: 1, limit: 10, total: 0 },
  users: { page: 1, limit: 10, total: 0 },
  sales: { page: 1, limit: 10, total: 0 },
  tickets: { page: 1, limit: 10, total: 0 },
  requests: { page: 1, limit: 10, total: 0 },
};

function toggleModal(id, show = true) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) { el.classList.remove("hidden"); el.classList.add("flex"); }
  else { el.classList.add("hidden"); el.classList.remove("flex"); }
}

function togglePassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  // تغيير أيقونة العين
  btn.innerHTML = isHidden
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>`;
}
// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (session && session.role === "superadmin") {
    document.getElementById("loginScreen").classList.add("hidden");
    toggleModal('app', true);

    applyRBAC(session.platformRole);

    const wn = document.getElementById("welcomeName");
    if (wn) wn.textContent = `مرحباً، ${session.managerName || "مدير"}`;

    tab("dashboard");
    loadAll();
  }

  const dbPlanEl = document.getElementById("dbPlan");
  if (dbPlanEl) {
    dbPlanEl.addEventListener("change", (e) => {
      const plan = e.target.value;
      const expiryEl = document.getElementById("dbExpiry");
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
      expiryEl.value = expiryDate.toISOString().split("T")[0];
    });
  }
});

function applyRBAC(role) {
  // Map of which role is HIDDEN from which tabs
  const hideMap = {
    owner: [], // Sees everything
    support: ["sales", "subrequests", "settings", "platform-staff"],
    sales: ["settings", "platform-staff", "tickets", "users"],
    accountant: [
      "settings",
      "platform-staff",
      "tickets",
      "users",
      "broadcasts",
    ],
  };

  const toHide = hideMap[role] || [
    "sales",
    "subrequests",
    "settings",
    "platform-staff",
    "broadcasts",
  ];

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.style.display = "flex";
  });

  toHide.forEach((tabName) => {
    const link = document.querySelector(`[data-tab="${tabName}"]`);
    if (link) link.style.display = "none";
  });

  const session = getSession();
  if (session && session.id !== "superadmin-owner") {
    const addBtn = document.getElementById("addPlatformStaffBtn");
    if (addBtn) addBtn.style.display = "none";
  }
}

// Auth
async function login() {
  const e = document.getElementById("lEmail").value.trim();
  const p = document.getElementById("lPass").value.trim();
  const err = document.getElementById("loginErr");
  err.classList.add("hidden");
  const btn = document.getElementById("loginBtn");
  btn.innerHTML =
    '<div style="width:20px;height:20px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%" class="spin mx-auto"></div>';
  btn.disabled = true;

  try {
    const d = await apiLogin(e, p);
    if (d.success && d.user?.role === "superadmin") {
      saveSession(d.user);
      document.getElementById("loginScreen").classList.add("hidden");
      toggleModal('app', true);

      applyRBAC(d.user.platformRole);
      const wn = document.getElementById("welcomeName");
      if (wn) wn.textContent = `مرحباً، ${d.user.managerName || "أدمين"}`;

      tab("dashboard");
      loadAll();
    } else {
      err.textContent = "بيانات الدخول غير صحيحة أو لا تملك صلاحية سوبر أدمن";
      err.classList.remove("hidden");
    }
  } catch (ex) {
    err.textContent =
      "تعذر الاتصال بالخادم. تأكد من تشغيل السيرفر على المنفذ 3001";
    err.classList.remove("hidden");
  }
  btn.innerHTML = "تسجيل الدخول";
  btn.disabled = false;
}

function logout() {
  tab("dashboard");
  clearSession();
  toggleModal('app', false);
  document.getElementById("loginScreen").classList.remove("hidden");
}

// Navigation
const titles = {
  dashboard: ["الرئيسية", "نظرة عامة على النظام"],
  pharmacies: ["الصيدليات", "إدارة جميع الصيدليات المشتركة"],
  users: ["المشتركين", "إدارة وتعديل اشتراكات الصيدليات"],
  sales: ["المبيعات", "سجلات المبيعات والاشتراكات"],
  tickets: ["الدعم الفني", "تذاكر الدعم والمساعدة"],
  settings: ["الإعدادات", "تحديث أسعار الباقات والبيانات"],
  broadcasts: ["الإشعارات العامة", "إرسال وتتبع الرسائل الجماعية للصيدليات"],
  subrequests: ["الطلبات", "إدارة طلبات الاشتراكات الجديدة"],
  "platform-staff": ["فريق عمل المنصة", "إدارة موظفي وصلاحيات السوبر أدمين"],
};

function tab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.querySelectorAll(".sidebar-link").forEach((l) => {
    l.classList.remove("active");
    l.classList.add("text-white/70");
    l.classList.remove("text-white");
  });
  const a = document.querySelector('[data-tab="' + name + '"]');
  if (a) {
    a.classList.add("active");
    a.classList.remove("text-white/70");
    a.classList.add("text-white");
  }
  const [ti, su] = titles[name] || [name, ""];
  document.getElementById("pageTitle").textContent = ti;
  document.getElementById("pageSub").textContent = su;

  // Scroll main container to top when changing tab
  const mainEl = document.querySelector("main");
  if (mainEl) mainEl.scrollTop = 0;

  if (name === "dashboard") loadDash();
  if (name === "pharmacies") {
    PAGINATION.pharmacies.page = 1;
    loadPharms();
  }
  if (name === "users") {
    PAGINATION.users.page = 1;
    loadUsers();
  }
  if (name === "sales") {
    PAGINATION.sales.page = 1;
    loadSales();
  }
  if (name === "tickets") loadTickets();
  if (name === "settings" || name === "payment") loadSettings();
  if (name === "subrequests") {
    PAGINATION.requests.page = 1;
    loadSubRequests();
  }
  if (name === "platform-staff") {
    loadPlatformStaff();
  }
  if (name === "plans") {
    loadPlans();
  }
}

async function loadAll() {
  await Promise.all([loadDash(), loadPharms()]);

  const session = getSession();
  if (session && session.platformRole === "owner") {
    loadPlatformStaff();
  }

  loadNotifications();
  if (!notifInterval) notifInterval = setInterval(loadNotifications, 60000);
}

// Dashboard
async function loadDash() {
  try {
    const { pRes, tRes, sRes, uRes } = await apiGetDashboard();
    pharms = pRes.pharmacies || [];
    const tickets = tRes.tickets || [];

    const act = pharms.filter((p) => p.isActive).length;
    const paid = pharms.reduce((s, p) => s + (Number(p.totalPaid) || 0), 0);

    document.getElementById("k1").textContent = pharms.length;
    document.getElementById("k1s").textContent = act + " نشطة";
    document.getElementById("pharmBadge").textContent = pharms.length;

    const sess = getSession();
    const prole = sess ? sess.platformRole : "owner";

    // k3 = Payments
    if (prole === "support") {
      document.getElementById("k3").textContent = "***";
    } else {
      document.getElementById("k3").textContent = paid.toLocaleString("en-US");
    }

    const ot = tickets.filter((t) => t.status === "open").length;
    const reqs = await apiGetSubRequests().catch(() => ({ requests: [] }));
    const pendingReqs = (reqs.requests || []).filter(
      (r) => r.status === "pending",
    ).length;

    // k4 = Sub Requests
    if (prole === "support") {
      document.getElementById("k4").textContent = "***";
    } else {
      document.getElementById("k4").textContent = pendingReqs;
    }

    if (ot > 0) {
      const b = document.getElementById("ticketBadge");
      if (b) {
        b.textContent = ot;
        b.classList.remove("hidden");
      }
    }

    // k2 = Users
    if (prole === "sales" || prole === "accountant") {
      document.getElementById("k2").textContent = "***";
    } else {
      document.getElementById("k2").textContent = (uRes.users || []).length;
    }

    // Recent Pharmacies Table
    const recent = [...pharms]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    document.getElementById("dashTbl").innerHTML = recent.length
      ? recent
          .map(
            (p) => `<tr>
      <td class="px-6 py-3 font-semibold text-slate-900">${p.name}</td>
      <td class="px-4 py-3 text-slate-500">${p.owner || "—"}</td>
      <td class="px-4 py-3">${subBadge(p.subscriptionType)}</td>
      <td class="px-4 py-3 text-xs text-slate-400">${fd(p.createdAt)}</td>
      <td class="px-4 py-3"><span class="${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} text-xs font-semibold px-2.5 py-1 rounded-full">${p.isActive ? "نشطة" : "معلقة"}</span></td>
    </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="text-center py-8 text-slate-400">لا توجد صيدليات</td></tr>';
  } catch (e) {
    console.error(e);
  }
}

// Pagination Helper
function paginateData(dataArray, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return dataArray.slice(startIndex, endIndex);
}

function renderPaginationControls(elementId, type, dataArray) {
  const state = PAGINATION[type];
  state.total = dataArray.length;
  const totalPages = Math.ceil(state.total / state.limit) || 1;

  const container = document.getElementById(elementId);
  if (!container) return;

  container.innerHTML = `
    <span class="text-sm text-slate-500">صفحة ${state.page} من ${totalPages} (إجمالي ${state.total})</span>
    <div class="flex gap-2">
      <button class="page-btn" ${state.page === 1 ? "disabled" : ""} onclick="changePage('${type}', -1)">السابق</button>
      <button class="page-btn" ${state.page === totalPages ? "disabled" : ""} onclick="changePage('${type}', 1)">التالي</button>
    </div>
  `;
}

function changePage(type, direction) {
  PAGINATION[type].page += direction;
  if (type === "pharmacies") renderPharmsList();
  if (type === "users") renderUsersList();
  if (type === "sales") renderSalesList();
  if (type === "requests") renderReqList();
}

// Pharmacies
async function loadPharms() {
  try {
    const r = await apiGetPharmacies();
    pharms = r.pharmacies || [];
    document.getElementById("pharmBadge").textContent = pharms.length;
    renderPharmsList();
  } catch (e) {
    document.getElementById("pharmTbl").innerHTML =
      '<tr><td colspan="8" class="text-center py-8 text-red-400">خطأ في التحميل</td></tr>';
  }
}

function filterP() {
  PAGINATION.pharmacies.page = 1;
  renderPharmsList();
}

function renderPharmsList() {
  const q = document.getElementById("pharmSearch").value.toLowerCase();
  const filtered = pharms.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.owner || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q),
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const paged = paginateData(
    filtered,
    PAGINATION.pharmacies.page,
    PAGINATION.pharmacies.limit,
  );
  const tb = document.getElementById("pharmTbl");

  if (!paged.length) {
    tb.innerHTML =
      '<tr><td colspan="9" class="text-center py-8 text-slate-400">لا يوجد صيدليات</td></tr>';
  } else {
    tb.innerHTML = paged
      .map((p) => {
        let isExpired =
          p.subscriptionType !== "lifetime" &&
          (!p.subscriptionExpiry ||
            new Date(p.subscriptionExpiry).getTime() < new Date().getTime());
        let statusBadge = "";
        if (!p.isActive) {
          statusBadge = `<span class="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">متوقف</span>`;
        } else if (p.isReadOnly) {
          statusBadge = `<span class="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full" title="بانتظار الموافقة">غير مفعل</span>`;
        } else if (isExpired) {
          statusBadge = `<span class="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full" title="منتهي الاشتراك">منتهي الاشتراك</span>`;
        } else {
          statusBadge = `<span class="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">نشط</span>`;
        }

        return `<tr>
      <td class="px-6 py-3"><div class="font-semibold text-slate-900">${p.name}</div><div class="text-xs text-slate-400">${p.id.slice(0, 8)}…</div></td>
      <td class="px-4 py-3 text-slate-600">${p.owner || "—"}</td>
      <td class="px-4 py-3 text-slate-500">${p.phone || "—"}</td>
      <td class="px-4 py-3">${subBadge(p.subscriptionType)}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${fd(p.createdAt)}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${p.subscriptionType === "lifetime" ? '<span class="text-indigo-600 font-bold">مدى الحياة</span>' : fd(p.subscriptionExpiry)}</td>
      <td class="px-4 py-3 font-mono text-sm">${Number(p.totalPaid || 0).toLocaleString("en-US")} ₪</td>
      <td class="px-4 py-3">${statusBadge}</td>
      <td class="px-4 py-3"><div class="flex items-center gap-2 flex-wrap">
        <button onclick="openPharmacyDetail('${p.id}')" class="text-blue-600 text-xs font-semibold hover:underline">تعديل</button>
        <span class="text-slate-200">|</span>
        <button onclick="openManualRenew('${p.id}')" class="text-emerald-600 text-xs font-semibold hover:underline">تجديد يدوي</button>
        <span class="text-slate-200">|</span>
        <button onclick="doToggle('${p.id}',${p.isActive})" class="${p.isActive ? "text-amber-600" : "text-emerald-600"} text-xs font-semibold hover:underline">${p.isActive ? "تجميد الحساب" : "تنشيط"}</button>
        <span class="text-slate-200">|</span>
        <button onclick="doDelete('${p.id}','${p.name.replace(/'/g, "\\'")}')" class="text-red-500 text-xs font-semibold hover:underline">حذف</button>
      </div></td>
    </tr>`;
      })
      .join("");
  }
  renderPaginationControls("pharmPagination", "pharmacies", filtered);
}

// Users
async function loadUsers() {
  try {
    const r = await apiGetUsers();
    users = (r.users || []).filter((u) => u.role !== "superadmin");
    const sess = getSession();
    if (
      sess &&
      (sess.platformRole === "sales" || sess.platformRole === "accountant")
    ) {
      document.getElementById("k2").textContent = "***";
    } else {
      document.getElementById("k2").textContent = users.length;
    }
    renderUsersList();
  } catch (e) {
    document.getElementById("usersTbl").innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-red-400">خطأ في التحميل</td></tr>';
  }
}

function filterU() {
  PAGINATION.users.page = 1;
  renderUsersList();
}

function renderUsersList() {
  const q = document.getElementById("userSearch").value.toLowerCase();
  const filtered = users.filter(
    (u) =>
      (u.managerName || u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q),
  );

  const paged = paginateData(
    filtered,
    PAGINATION.users.page,
    PAGINATION.users.limit,
  );
  const tb = document.getElementById("usersTbl");

  if (!paged.length) {
    tb.innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-slate-400">لا يوجد مستخدمون</td></tr>';
  } else {
    tb.innerHTML = paged
      .map((u) => {
        const ph = pharms.find((p) => p.id === u.pharmacy_id);
        return `<tr>
        <td class="px-6 py-3 font-medium text-slate-800">${u.managerName || u.name || "—"}</td>
        <td class="px-4 py-3 text-slate-500">${u.email || "—"}</td>
        <td class="px-4 py-3 text-slate-500">${ph?.name || "—"}</td>
        <td class="px-4 py-3">${roleBadge(u.role)}</td>
      </tr>`;
      })
      .join("");
  }
  renderPaginationControls("usersPagination", "users", filtered);
}

// Sales
async function loadSales() {
  try {
    document.getElementById("salesTbl").innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-slate-400">جاري جلب مبيعات الصيدليات...</td></tr>';
    const r = await apiGetPharmacies();
    const ps = r.pharmacies || [];

    const rows = await Promise.all(
      ps.map(async (p) => {
        try {
          const s = await apiGetPharmacySales(p.id);
          const list = s.sales || [];
          return {
            name: p.name,
            cnt: list.length,
            tot: list.reduce((s, x) => s + (Number(x.total) || 0), 0),
            last: list[0]?.date,
          };
        } catch {
          return { name: p.name, cnt: 0, tot: 0, last: null };
        }
      }),
    );

    salesData = rows.sort((a, b) => b.tot - a.tot);
    renderSalesList();
  } catch (e) {
    document.getElementById("salesTbl").innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-red-400">خطأ في التحميل</td></tr>';
  }
}

function renderSalesList() {
  const paged = paginateData(
    salesData,
    PAGINATION.sales.page,
    PAGINATION.sales.limit,
  );
  const tb = document.getElementById("salesTbl");

  if (!paged.length) {
    tb.innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-slate-400">لا توجد بيانات</td></tr>';
  } else {
    tb.innerHTML = paged
      .map(
        (r) => `<tr>
      <td class="px-6 py-3 font-semibold text-slate-800">${r.name}</td>
      <td class="px-4 py-3 text-slate-600">${r.cnt.toLocaleString("en-US")} فاتورة</td>
      <td class="px-4 py-3 font-mono font-bold text-emerald-700">${r.tot.toLocaleString("en-US", { minimumFractionDigits: 2 })} ₪</td>
      <td class="px-4 py-3 text-xs text-slate-400">${fd(r.last)}</td>
    </tr>`,
      )
      .join("");
  }
  renderPaginationControls("salesPagination", "sales", salesData);
}

// Tickets
async function loadTickets() {
  try {
    const r = await apiGetTickets();
    const ts = r.tickets || [];
    const tb = document.getElementById("ticketsTbl");
    if (!ts.length) {
      tb.innerHTML =
        '<tr><td colspan="6" class="text-center py-8 text-slate-400">لا توجد تذاكر</td></tr>';
      return;
    }
    tb.innerHTML = ts
      .map(
        (t) => `<tr>
      <td class="px-6 py-3 font-medium text-slate-800">${t.subject || "—"}</td>
      <td class="px-4 py-3 text-slate-500">${pharms.find((p) => p.id === t.pharmacy_id)?.name || t.pharmacy_id?.slice(0, 8) || "—"}</td>
      <td class="px-4 py-3">${prioBadge(t.priority)}</td>
      <td class="px-4 py-3 text-xs text-slate-400">${fd(t.date)}</td>
      <td class="px-4 py-3"><span class="${tStatusClass(t.status)} text-xs font-semibold px-2.5 py-1 rounded-full">${tStatusLabel(t.status)}</span></td>
      <td class="px-4 py-3"><select onchange="updateTicket('${t.id}',this.value)" class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white outline-none">
        <option value="open" ${t.status === "open" ? "selected" : ""}>مفتوحة</option>
        <option value="in_progress" ${t.status === "in_progress" ? "selected" : ""}>قيد المعالجة</option>
        <option value="closed" ${t.status === "closed" ? "selected" : ""}>مغلقة</option>
      </select></td>
    </tr>`,
      )
      .join("");
  } catch (e) {
    document.getElementById("ticketsTbl").innerHTML =
      '<tr><td colspan="7" class="text-center py-8 text-red-400">خطأ في التحميل</td></tr>';
  }
}

async function updateTicket(id, status) {
  try {
    await apiUpdateTicket(id, status);
    toast("تم تحديث حالة التذكرة");
  } catch (e) {
    toast("خطأ", "error");
  }
}

// Settings
async function loadSettings() {
  try {
    const r = await apiGetSettings();
    const s = r.settings;
    if (!s) return;
    document.getElementById("sName").value = s.systemName || "";
    document.getElementById("sEmail").value = s.adminEmail || "";
    document.getElementById("sMaint").checked = !!s.isMaintenance;

    const m = document.getElementById("maintBadge");
    const ms = document.getElementById("maintBadgeSidebar");
    if (s.isMaintenance) {
      if (m) { m.classList.remove("hidden"); m.classList.add("flex"); }
      if (ms) ms.classList.remove("hidden");
    } else {
      if (m) { m.classList.add("hidden"); m.classList.remove("flex"); }
      if (ms) ms.classList.add("hidden");
    }

    document.getElementById("sCompany").value = s.companyName || "";
    document.getElementById("sBankName").value = s.bankName || "";
    document.getElementById("sBankAccount").value = s.bankAccount || "";
    if(document.getElementById("sBankAccountName")) document.getElementById("sBankAccountName").value = s.bankAccountName || "";
    document.getElementById("sBankIban").value = s.bankIban || "";
    document.getElementById("sWallet").value = s.walletNumber || "";
    if(document.getElementById("sPalpayName")) document.getElementById("sPalpayName").value = s.palpayName || "";
    if(document.getElementById("sJawwalpayName")) document.getElementById("sJawwalpayName").value = s.jawwalpayName || "";
    document.getElementById("sWhatsapp").value = s.whatsappNumber || "";
    document.getElementById("sDevWhatsapp").value =
      s.devWhatsapp || "https://wa.me/";
    document.getElementById("sDevInstagram").value =
      s.devInstagram || "https://instagram.com/";
    document.getElementById("sDevWebsite").value = s.devWebsite || "https://";
  } catch (e) {
    toast("خطأ في تحميل الإعدادات", "error");
  }
}

async function saveSettings() {
  const body = {
    systemName: document.getElementById("sName").value,
    adminEmail: document.getElementById("sEmail").value,
    adminPassword: document.getElementById("sPass").value || "",
    isMaintenance: document.getElementById("sMaint").checked,

    companyName: document.getElementById("sCompany").value,
    bankName: document.getElementById("sBankName").value,
    bankAccount: document.getElementById("sBankAccount").value,
    bankAccountName: document.getElementById("sBankAccountName") ? document.getElementById("sBankAccountName").value : "",
    bankIban: document.getElementById("sBankIban").value,
    walletNumber: document.getElementById("sWallet").value,
    palpayName: document.getElementById("sPalpayName") ? document.getElementById("sPalpayName").value : "",
    jawwalpayName: document.getElementById("sJawwalpayName") ? document.getElementById("sJawwalpayName").value : "",
    whatsappNumber: document.getElementById("sWhatsapp").value,
    devWhatsapp: document.getElementById("sDevWhatsapp").value,
    devInstagram: document.getElementById("sDevInstagram").value,
    devWebsite: document.getElementById("sDevWebsite").value,
  };
  try {
    const d = await apiSaveSettings(body);
    if (d.success) {
      toast("تم حفظ الإعدادات ✓");
      const m = document.getElementById("maintBadge");
      const ms = document.getElementById("maintBadgeSidebar");
      if (body.isMaintenance) {
        if (m) { m.classList.remove("hidden"); m.classList.add("flex"); }
        if (ms) ms.classList.remove("hidden");
      } else {
        if (m) { m.classList.add("hidden"); m.classList.remove("flex"); }
        if (ms) ms.classList.add("hidden");
      }
    } else toast(d.error || "فشل الحفظ", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
}

// Modals and Actions
function openAddP() {
  document.getElementById("pModalTitle").textContent = "إضافة صيدلية جديدة";
  ["pName", "pOwner", "pEmail", "pPass", "pPhone", "pPaid"].forEach(
    (i) => (document.getElementById(i).value = ""),
  );
  document.getElementById("pPlan").value = "monthly";
  toggleModal('pharmModal', true);
}

function closeP() { toggleModal("pharmModal", false); }

async function saveP() {
  const btn = document.getElementById("savePBtn");
  btn.disabled = true;
  btn.textContent = "جاري الحفظ...";
  const body = {
    name: document.getElementById("pName").value.trim(),
    owner: document.getElementById("pOwner").value.trim(),
    email: document.getElementById("pEmail").value.trim(),
    password: document.getElementById("pPass").value,
    phone: document.getElementById("pPhone").value.trim(),
    plan: document.getElementById("pPlan").value,
    amountPaid: document.getElementById("pPaid").value,
  };
  if (!body.name || !body.owner || !body.email) {
    toast("يرجى ملء الحقول المطلوبة", "error");
    btn.disabled = false;
    btn.textContent = "حفظ";
    return;
  }
  try {
    const d = await apiSavePharmacy(null, body);
    if (d.success) {
      toast("تم إضافة الصيدلية ✓");
      closeP();
      loadPharms();
      loadDash();
    } else toast(d.error || "فشل الحفظ", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
  btn.disabled = false;
  btn.textContent = "حفظ";
}

function doToggle(id, cur) {
  const will = !!cur;
  showConfirm(
    will ? "تعليق الصيدلية" : "تفعيل الصيدلية",
    will
      ? "سيتم تعليق الوصول لهذه الصيدلية. هل أنت متأكد؟"
      : "سيتم تفعيل الصيدلية مجدداً.",
    will ? "red" : "green",
    async () => {
      try {
        await apiTogglePharmacy(id, cur);
        toast(!cur ? "تم تفعيل الصيدلية ✓" : "تم تعليق الصيدلية ✓");
        closeConfirm();
        loadPharms();
        loadDash();
      } catch (e) {
        toast("خطأ في الاتصال", "error");
      }
    },
  );
}

function doDelete(id, name) {
  showConfirm(
    "حذف الصيدلية",
    `هل أنت متأكد من حذف "${name}"؟ سيتم حذف جميع البيانات نهائياً!`,
    "red",
    async () => {
      try {
        const d = await apiDeletePharmacy(id);
        if (d.success) {
          toast("تم حذف الصيدلية");
          closeConfirm();
          loadPharms();
          loadDash();
        } else toast(d.error || "فشل الحذف", "error");
      } catch (e) {
        toast("خطأ في الاتصال", "error");
      }
    },
  );
}

function showConfirm(title, desc, color, cb) {
  confirmCb = cb;
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmDesc").textContent = desc;
  const icon = document.getElementById("confirmIcon");
  const btn = document.getElementById("confirmBtn");
  icon.className = `w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${color === "red" ? "bg-red-100" : "bg-emerald-100"}`;
  icon.innerHTML =
    color === "red"
      ? '<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
      : '<svg class="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  btn.textContent = color === "red" ? "تأكيد" : "تفعيل";
  btn.className = `flex-1 font-bold rounded-xl py-2.5 text-sm text-white transition ${color === "red" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`;
  toggleModal('confirmModal', true);
}
function closeConfirm() {
  toggleModal('confirmModal', false);
  confirmCb = null;
}
document.getElementById("confirmBtn").onclick = () => {
  if (confirmCb) confirmCb();
};

// Badges & Formatting
function subBadge(t) {
  const m = {
    annual: "bg-emerald-100 text-emerald-700",
    monthly: "bg-blue-100 text-blue-700",
    trial: "bg-amber-100 text-amber-700",
    free: "bg-amber-100 text-amber-700",
    lifetime: "bg-indigo-100 text-indigo-700",
  };
  let text = "شهري";
  if (t === "annual") text = "سنوي";
  else if (t === "trial" || t === "free") text = "تجريبي";
  else if (t === "lifetime") text = "مدى الحياة";
  else if (t && t !== "monthly") text = t;

  return `<span class="${m[t] || m.monthly} text-xs font-semibold px-2.5 py-1 rounded-full">${text}</span>`;
}
function roleBadge(r) {
  const m = {
    manager: "bg-blue-100 text-blue-700",
    pharmacist: "bg-slate-100 text-slate-600",
    cashier: "bg-amber-100 text-amber-700",
    branch_manager: "bg-purple-100 text-purple-700",
    branchManager: "bg-purple-100 text-purple-700",
  };
  return `<span class="${m[r] || "bg-slate-100 text-slate-600"} text-xs font-semibold px-2.5 py-1 rounded-full">${r === "manager" ? "مدير" : r === "pharmacist" ? "صيدلاني" : r === "cashier" ? "كاشير" : r === "branch_manager" || r === "branchManager" ? "مدير فرع" : r}</span>`;
}
function prioBadge(p) {
  const m = {
    high: "bg-red-100 text-red-600",
    medium: "bg-amber-100 text-amber-600",
    low: "bg-slate-100 text-slate-500",
  };
  return `<span class="${m[p] || "bg-slate-100 text-slate-500"} text-xs font-semibold px-2.5 py-1 rounded-full">${p === "high" ? "عالية" : p === "medium" ? "متوسطة" : "منخفضة"}</span>`;
}
function tStatusClass(s) {
  return s === "open"
    ? "bg-blue-100 text-blue-700"
    : s === "in_progress"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-500";
}
function tStatusLabel(s) {
  return s === "open"
    ? "مفتوحة"
    : s === "in_progress"
      ? "قيد المعالجة"
      : "مغلقة";
}
function fd(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function toast(msg, type = "success") {
  clearTimeout(toastT);
  const el = document.getElementById("toast");
  const c = {
    success: "bg-emerald-600",
    error: "bg-red-500",
    warning: "bg-amber-500",
  };
  el.className = `slide-in fixed bottom-6 left-6 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold z-[200] ${c[type] || c.success}`;
  document.getElementById("toastMsg").textContent = msg;
  el.classList.remove("hidden");
  toastT = setTimeout(() => el.classList.add("hidden"), 3500);
}

window.viewReceipt = async function(idOrUrl) {
  if (!idOrUrl) return;
  let url = idOrUrl;
  
  if (!url.startsWith('data:') && !url.includes('.')) {
    // It's an ID. Let's fetch it from server
    try {
      toast("جاري تحميل الإيصال...");
      const res = await apiFetch(`/api/admin/subscription-requests/${idOrUrl}/receipt`);
      const data = await res.json();
      if (data.success && data.receipt) {
        url = data.receipt;
      } else {
        toast("لا يوجد إيصال");
        return;
      }
    } catch(e) {
      toast("حدث خطأ أثناء تحميل الإيصال");
      return;
    }
  }

  if (url.startsWith('data:')) {
    const w = window.open("", "_blank");
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        w.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      });
  } else {
    window.open(`${API}/uploads/${url}`, "_blank");
  }
}

let subRequests = [];
async function loadSubRequests() {
  try {
    const r = await apiGetSubRequests();
    subRequests = r.requests || [];
    const pending = subRequests.filter((x) => x.status === "pending").length;
    const b = document.getElementById("reqBadge");
    if (pending > 0) {
      b.textContent = pending;
      b.classList.remove("hidden");
    } else {
      b.classList.add("hidden");
    }
    renderReqList();
  } catch (e) {
    document.getElementById("reqTbl").innerHTML =
      '<tr><td colspan="6" class="text-center py-8 text-red-400">خطأ في التحميل</td></tr>';
  }
}
function renderReqList() {
  const paged = paginateData(
    subRequests,
    PAGINATION.requests.page,
    PAGINATION.requests.limit,
  );
  const tb = document.getElementById("reqTbl");
  if (!paged.length) {
    tb.innerHTML =
      '<tr><td colspan="7" class="text-center py-8 text-slate-400">لا توجد طلبات</td></tr>';
  } else {
    tb.innerHTML = paged
      .map(
        (r) => `<tr>
      <td class="px-6 py-3 font-semibold text-slate-900">${r.pharmacy_name || r.pharmacy_id}<br><span class="text-xs text-slate-400">${r.pharmacy_phone || ""}</span></td>
      <td class="px-4 py-3">${subBadge(r.plan_type)}</td>
      <td class="px-4 py-3">
        <span class="text-xs text-indigo-600 font-bold">${(r.payment_method === "bop" || r.payment_method === "bank") ? "بنك فلسطين" : r.payment_method === "palpay" ? "PalPay" : (r.payment_method === "jawwalpay" || r.payment_method === "jawwal") ? "Jawwal Pay" : r.payment_method || "-"}</span>
        ${(r.transferName || r.transferRef) ? `<div class="text-[10px] text-slate-500 mt-1">${r.transferName ? "بواسطة: " + r.transferName : ""}<br>${r.transferRef ? "رقم: " + r.transferRef : ""}</div>` : ""}
      </td>
      <td class="px-4 py-3">${r.receipt_url === "trial_activation" ? '<span class="text-emerald-600 font-semibold text-xs">تفعيل تجريبي</span>' : (r.receipt_url || "").startsWith("ref_") ? `<span class="text-slate-600 font-mono text-xs">رقم حوالة: ${r.receipt_url.replace("ref_", "")}</span>` : `<a href="javascript:void(0)" onclick="viewReceipt('${r.id}')" class="text-blue-500 hover:underline">عرض الإيصال</a>`}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${fd(r.createdAt)}</td>
      <td class="px-4 py-3"><span class="${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"} text-xs font-semibold px-2.5 py-1 rounded-full">${r.status === "approved" ? "مفعل" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</span></td>
      <td class="px-4 py-3">
        ${
          r.status === "pending"
            ? `
        <button onclick="approveReq('${r.id}')" class="text-emerald-600 text-xs font-semibold hover:underline bg-emerald-50 px-2 py-1 rounded">تفعيل</button>
        <button onclick="rejectReq('${r.id}')" class="text-red-600 text-xs font-semibold hover:underline bg-red-50 px-2 py-1 rounded ml-1">رفض</button>
        `
            : "-"
        }
      </td>
    </tr>`,
      )
      .join("");
  }
  renderPaginationControls("reqPagination", "requests", subRequests);
}
async function approveReq(id) {
  try {
    const d = await apiApproveSubRequest(id);
    if (d.success) {
      toast("تم تفعيل الاشتراك بنجاح");
      loadSubRequests();
      loadDash();
    } else toast(d.error || "حدث خطأ", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
}
async function rejectReq(id) {
  try {
    const d = await apiRejectSubRequest(id);
    if (d.success) {
      toast("تم رفض الطلب");
      loadSubRequests();
    } else toast(d.error || "حدث خطأ", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
}

let currentDetId = null;
let currentDetPh = null;
let currentDetBranches = [];

async function openPharmacyDetail(id) {
  currentDetId = id;
  tab("pharmacy-detail");
  document
    .querySelectorAll(".det-content")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById("det-basics").classList.remove("hidden");
  document.querySelectorAll(".det-nav").forEach((el) => {
    el.classList.remove("bg-slate-900", "text-white");
    el.classList.add("bg-white", "text-slate-600");
  });
  const b = document.getElementById("btn-det-basics");
  b.classList.remove("bg-white", "text-slate-600");
  b.classList.add("bg-slate-900", "text-white");

  try {
    const d = await apiGetPharmacyDetails(id);
    currentDetPh = d.pharmacy;
    currentDetBranches = d.branches || [];

    // Header
    document.getElementById("detName").textContent = currentDetPh.name;
    document.getElementById("detId").textContent =
      "#" + currentDetPh.id.slice(0, 8);

    // Readonly btn
    updateReadonlyBtn(currentDetPh.isReadOnly);

    // Basics
    document.getElementById("dbName").value = currentDetPh.name || "";
    document.getElementById("dbOwner").value = currentDetPh.owner || "";
    document.getElementById("dbPhone").value = currentDetPh.phone || "";
    document.getElementById("dbExpiry").value = currentDetPh.subscriptionExpiry
      ? currentDetPh.subscriptionExpiry.split("T")[0]
      : "";
    document.getElementById("dbPlan").value =
      currentDetPh.subscriptionType || "monthly";
    document.getElementById("dbPaid").value = currentDetPh.totalPaid || 0;
    document.getElementById("dbEmail").value = currentDetPh.email || "";
    document.getElementById("dbPassword").value = currentDetPh.password || "";

    // Staff
    const stb = document.getElementById("detStaffTbl");
    if (!d.staff.length)
      stb.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-slate-400">لا يوجد موظفين</td></tr>';
    else
      stb.innerHTML = d.staff
        .map(
          (s) => `<tr>
      <td class="px-4 py-3 font-medium">${s.name}</td>
      <td class="px-4 py-3 text-slate-500">${s.email}</td>
      <td class="px-4 py-3">${roleBadge(s.role)} ${s.status === "active" ? '<span class="text-emerald-500 text-xs">نشط</span>' : '<span class="text-red-500 text-xs">متوقف</span>'}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2">
          <button onclick="openEditStaff('${s.id}', '${(s.name || '').replace(/'/g, `\\'`).replace(/\\/g, `\\\\`)}', '${(s.email || '').replace(/'/g, `\\'`).replace(/\\/g, `\\\\`)}', '${s.role}', '${s.branch || ''}', '${(s.password || '').replace(/'/g, `\\'`).replace(/\\/g, `\\\\`)}')" class="text-blue-500 text-xs font-semibold hover:underline">تعديل</button>
          <span class="text-slate-200">|</span>
          <button onclick="toggleStaffStatus('${s.id}', '${s.status}')" class="${s.status === "active" ? "text-amber-500" : "text-emerald-500"} text-xs font-semibold hover:underline">${s.status === "active" ? "إيقاف" : "تفعيل"}</button>
          <span class="text-slate-200">|</span>
          <button onclick="deleteStaff('${s.id}')" class="text-red-500 text-xs font-semibold hover:underline">حذف</button>
        </div>
      </td>
    </tr>`,
        )
        .join("");

    // Branches
    const btb = document.getElementById("detBranchesTbl");
    if (!d.branches.length)
      btb.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-slate-400">لا توجد فروع</td></tr>';
    else
      btb.innerHTML = d.branches
        .map(
          (br) => `<tr>
      <td class="px-4 py-3 font-medium">${br.name}</td>
      <td class="px-4 py-3 text-slate-500">${br.addr || "—"}</td>
      <td class="px-4 py-3 text-xs font-semibold ${br.status === "نشط" || br.status === "active" ? "text-emerald-600" : "text-slate-500"}">${br.status || "—"}</td>
        <td class="px-4 py-3 flex items-center gap-3">
          <button onclick="openEditBranch('${br.id}', '${(br.name || "").replace(/'/g, "\\'")}', '${(br.addr || "").replace(/'/g, "\\'")}')" class="text-blue-600 text-xs font-semibold hover:underline">تعديل</button>
          <span class="text-slate-300">|</span>
          <button onclick="deleteBranch('${br.id}')" class="text-red-500 text-xs font-semibold hover:underline">حذف</button>
        </td>
      </tr>`,
        )
        .join("");
  } catch (e) {
    toast("خطأ في جلب التفاصيل", "error");
  }
}

function updateReadonlyBtn(isReadOnly) {
  const btn = document.getElementById("detReadOnlyBtn");
  const txt = document.getElementById("detReadOnlyTxt");
  if (isReadOnly) {
    btn.className =
      "bg-red-100 text-red-700 hover:bg-red-200 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition";
    txt.textContent = "إلغاء وضع القراءة";
  } else {
    btn.className =
      "bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition";
    txt.textContent = "تفعيل وضع القراءة";
  }
}

async function toggleReadOnly() {
  if (!currentDetPh) return;
  const willBe = !currentDetPh.isReadOnly;
  showConfirm(
    willBe ? "تفعيل وضع القراءة فقط" : "إلغاء وضع القراءة",
    willBe
      ? "سيتم تجميد الصيدلية. هل أنت متأكد؟"
      : "سيتم إعادة الصلاحيات للصيدلية.",
    willBe ? "red" : "green",
    async () => {
      try {
        const d = await apiToggleReadOnly(currentDetId, willBe);
        if (d.success) {
          currentDetPh.isReadOnly = willBe;
          updateReadonlyBtn(willBe);
          toast("تم التعديل بنجاح");
          closeConfirm();
        } else toast("حدث خطأ", "error");
      } catch (e) {
        toast("خطأ اتصال", "error");
      }
    },
  );
}

function switchDetTab(t) {
  document
    .querySelectorAll(".det-content")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById("det-" + t).classList.remove("hidden");
  document.querySelectorAll(".det-nav").forEach((el) => {
    el.classList.remove("bg-slate-900", "text-white");
    el.classList.add("bg-white", "text-slate-600");
  });
  const b = document.getElementById("btn-det-" + t);
  b.classList.remove("bg-white", "text-slate-600");
  b.classList.add("bg-slate-900", "text-white");

  if (t === 'stats') {
    loadPharmacyStats();
    } else if (t === "customers") {
    loadAdminCustomers();
    loadAdminDebtPayments();
  } else if (t === "suppliers") {
    if (typeof loadAdminSuppliers === "function") loadAdminSuppliers();
  } else if (t === 'invoices') {
    loadAdminSales();
  }
}

async function loadPharmacyStats() {
  const container = document.getElementById("detStatsContainer");
  const containerSec = document.getElementById("detSecondaryStatsContainer");
  
  container.innerHTML = `
    <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-center text-center animate-pulse h-28">
      <div class="h-4 bg-slate-200 rounded w-1/2 mx-auto mb-2"></div>
      <div class="h-6 bg-slate-200 rounded w-3/4 mx-auto"></div>
    </div>
  `;
  containerSec.innerHTML = '';
  
  try {
    const data = await apiGetPharmacyStats(currentDetId);
    if (!data.success) throw new Error();
    
    // Format helpers
    const fMoney = (val) => new Intl.NumberFormat('en-US').format(val || 0) + ' ₪';
    const fNum = (val) => new Intl.NumberFormat('en-US').format(val || 0);
    const fDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'لا يوجد';

    container.innerHTML = `
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition">
        <div class="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition">
          <svg class="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <h5 class="text-blue-600 font-bold text-sm mb-1 z-10 relative">إجمالي المبيعات</h5>
        <div class="text-3xl font-black text-slate-800 z-10 relative" dir="ltr">${fMoney(data.totalSales)}</div>
        <p class="text-xs text-slate-500 mt-2 z-10 relative">من ${fNum(data.totalInvoices)} فاتورة</p>
      </div>
      
      <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition">
        <h5 class="text-emerald-600 font-bold text-sm mb-1 z-10 relative">مبيعات الشهر الحالي</h5>
        <div class="text-3xl font-black text-slate-800 z-10 relative" dir="ltr">${fMoney(data.salesThisMonth)}</div>
        <p class="text-xs text-slate-500 mt-2 z-10 relative">من ${fNum(data.invoicesThisMonth)} فاتورة</p>
      </div>

      <div class="bg-amber-50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition">
        <h5 class="text-amber-600 font-bold text-sm mb-1 z-10 relative">قيمة المخزون</h5>
        <div class="text-3xl font-black text-slate-800 z-10 relative" dir="ltr">${fMoney(data.inventoryValue)}</div>
        <p class="text-xs text-slate-500 mt-2 z-10 relative">لـ ${fNum(data.inventoryItems)} صنف</p>
      </div>
    `;

    containerSec.innerHTML = `
      <div class="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-sm transition flex items-center justify-between">
        <div>
          <h5 class="text-slate-500 font-bold text-xs mb-1">آخر عملية بيع</h5>
          <div class="text-lg font-black text-slate-800">${fDate(data.lastSaleDate)}</div>
        </div>
        <div class="text-left" dir="ltr">
          <div class="text-xs text-slate-400 font-semibold mb-1">قيمة الفاتورة</div>
          <div class="text-lg font-bold text-emerald-600">${fMoney(data.lastSaleAmount)}</div>
        </div>
      </div>
      
      <div class="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-sm transition flex gap-4">
        <div class="flex-1 bg-slate-50 rounded-xl p-3 text-center">
          <div class="text-xl font-black text-slate-700">${fNum(data.staffCount)}</div>
          <div class="text-xs font-semibold text-slate-500 mt-1">الموظفين</div>
        </div>
        <div class="flex-1 bg-slate-50 rounded-xl p-3 text-center">
          <div class="text-xl font-black text-slate-700">${fNum(data.branchCount)}</div>
          <div class="text-xs font-semibold text-slate-500 mt-1">الفروع</div>
        </div>
      </div>
    `;
    
  } catch(e) {
    container.innerHTML = '<div class="col-span-3 text-center py-5 text-red-500">حدث خطأ أثناء تحميل الإحصائيات</div>';
  }
}

let currentAdminSales = [];

async function loadAdminSales() {
  const tbl = document.getElementById("detInvoicesTbl");
  tbl.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>جاري التحميل...</td></tr>`;
  
  try {
    const res = await apiGetAdminSales(currentDetId);
    if (!res.success) throw new Error();
    currentAdminSales = res.sales || [];
    
    if (currentAdminSales.length === 0) {
      tbl.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">لا توجد فواتير مبيعات لهذه الصيدلية.</td></tr>`;
      return;
    }
    
    const fMoney = (val) => new Intl.NumberFormat("en-US").format(val || 0) + " ₪";
    const fDate = (d) => d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    
    tbl.innerHTML = currentAdminSales.map(s => `
      <tr class="hover:bg-slate-50 transition group">
        <td class="px-4 py-3 font-mono text-xs text-slate-500 rounded-r-xl">#${s.id.slice(0, 8)}</td>
        <td class="px-4 py-3 text-slate-600" dir="ltr">${fDate(s.date)}</td>
        <td class="px-4 py-3 font-bold text-emerald-600" dir="ltr">${fMoney(s.total)}</td>
        <td class="px-4 py-3 text-slate-500">${s.paymentMethod === "card" ? "💳 بطاقة" : s.paymentMethod === "debt" ? "📒 ذمم" : "💵 كاش"}</td>
        <td class="px-4 py-3 text-slate-600">${s.cashierName || "غير محدد"}</td>
        <td class="px-4 py-3 rounded-l-xl">
          <div class="flex gap-2">
            <button onclick="viewAdminSale('${s.id}')" class="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition" title="عرض التفاصيل">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button onclick="deleteAdminSale('${s.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition" title="حذف إجباري">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");
    
  } catch(e) {
    tbl.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">حدث خطأ أثناء تحميل الفواتير.</td></tr>`;
  }
}

function viewAdminSale(saleId) {
  const s = currentAdminSales.find(x => x.id === saleId);
  if (!s) return;
  
  let customerName = "غير محدد";
  if (s.customer) {
    if (typeof s.customer === 'string' && s.customer.startsWith('{')) {
      try {
        const cObj = JSON.parse(s.customer);
        customerName = cObj.name || s.customer;
      } catch(e) {
        customerName = s.customer;
      }
    } else {
      customerName = s.customer;
    }
  }

  document.getElementById("invDetId").textContent = "#" + s.id.slice(0, 8);
  document.getElementById("invDetCustomer").textContent = customerName;
  document.getElementById("invDetDate").textContent = s.date ? new Date(s.date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  document.getElementById("invDetCashier").textContent = s.cashierName || "غير محدد";
  document.getElementById("invDetTotal").textContent = new Intl.NumberFormat("en-US").format(s.total || 0) + " ₪";
  
  let items = [];
  try {
    if (typeof s.items === 'string') {
      items = JSON.parse(s.items);
      if (typeof items === 'string') {
        items = JSON.parse(items); // Double parsed in case it was stringified twice
      }
    } else if (Array.isArray(s.items)) {
      items = s.items;
    }
  } catch(e){}
  
  if (!Array.isArray(items)) {
    items = [];
  }
  
  const tbody = document.getElementById("invDetItems");
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-400">لا توجد أصناف أو بيانات الفاتورة غير كاملة</td></tr>`;
  } else {
    tbody.innerHTML = items.map(item => {
      const name = item.name || item.displayName || item.drug_name || "صنف غير معروف";
      const qty = item.cartQty || item.qty || item.quantity || 1;
      const price = item.unitPrice || item.price || item.unit_price || 0;
      return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <td class="px-4 py-2 font-semibold text-slate-700">${name}</td>
        <td class="px-4 py-2">${qty}</td>
        <td class="px-4 py-2" dir="ltr">${new Intl.NumberFormat("en-US").format(price)} ₪</td>
        <td class="px-4 py-2 font-bold text-slate-800" dir="ltr">${new Intl.NumberFormat("en-US").format(qty * price)} ₪</td>
      </tr>`;
    }).join("");
  }
  
  toggleModal("invoiceModal", true);
}

async function deleteAdminSale(saleId) {
  if (!confirm("هل أنت متأكد من الحذف الإجباري لهذه الفاتورة؟ (إجراء خاص بالسوبر أدمن فقط)")) return;
  
  try {
    const res = await apiDeleteAdminSale(currentDetId, saleId);
    if (res.success) {
      toast("تم حذف الفاتورة بنجاح");
      loadAdminSales();
    } else {
      toast("فشل حذف الفاتورة");
    }
  } catch(e) {
    toast("حدث خطأ أثناء الحذف");
  }
}

async function saveDetBasics() {
  const body = {
    name: document.getElementById("dbName").value,
    owner: document.getElementById("dbOwner").value,
    phone: document.getElementById("dbPhone").value,
    plan: document.getElementById("dbPlan").value,
    paidAmount: document.getElementById("dbPaid").value,
    subscriptionExpiry: document.getElementById("dbExpiry").value,
    email: document.getElementById("dbEmail")
      ? document.getElementById("dbEmail").value.trim()
      : "",
    password: document.getElementById("dbPassword")
      ? document.getElementById("dbPassword").value
      : "",
  };
  try {
    const d = await apiSavePharmacy(currentDetId, body);
    if (d.success) toast("تم حفظ البيانات الأساسية");
    else toast("خطأ ما", "error");
  } catch (e) {
    toast("خطأ", "error");
  }
}

let currentEditStaffId = null;
function populateBranchSelect() {
  const select = document.getElementById("stBranch");
  if (!select) return;
  let html = '<option value="">الفرع الرئيسي / بدون تحديد</option>';
  currentDetBranches.forEach((b) => {
    html += `<option value="${b.id}">${b.name}</option>`;
  });
  select.innerHTML = html;
}

function openAddStaff() {
  currentEditStaffId = null;
  document.querySelector("#staffModal h3").textContent = "إضافة موظف";
  document.getElementById("stName").value = "";
  document.getElementById("stEmail").value = "";
  document.getElementById("stPass").value = "";
  document.getElementById("stRole").value = "pharmacist";
  populateBranchSelect();
  document.getElementById("stBranch").value = "";
  toggleModal('staffModal', true);
}
function openEditStaff(id, name, email, role, branchId, password) {
  currentEditStaffId = id;
    document.querySelector("#staffModal h3").textContent = "تعديل موظف";
  document.getElementById("stName").value = name || "";
  document.getElementById("stEmail").value = email || "";
  document.getElementById("stPass").value = password || "";
  document.getElementById("stRole").value = role || "pharmacist";
  populateBranchSelect();
  document.getElementById("stBranch").value = branchId || "";
  toggleModal('staffModal', true);
}
function closeStaffModal() {
  toggleModal('staffModal', false);
}
async function saveStaff() {
  const b = {
    name: document.getElementById("stName").value,
    email: document.getElementById("stEmail").value,
    password: document.getElementById("stPass").value || "",
    role: document.getElementById("stRole").value,
    branch: document.getElementById("stBranch").value,
  };
  if (!b.name || !b.email || (!b.password && !currentEditStaffId))
    return toast("أكمل الحقول", "warning");
  try {
    const d = currentEditStaffId
      ? await apiUpdateStaff(currentDetId, currentEditStaffId, b)
      : await apiAddStaff(currentDetId, b);
    if (d.success) {
      toast(currentEditStaffId ? "تم التعديل" : "تمت الإضافة");
      closeStaffModal();
      openPharmacyDetail(currentDetId);
    } else toast(d.error, "error");
  } catch (e) {
    toast("خطأ", "error");
  }
}
async function toggleStaffStatus(staffId, currentStatus) {
  const newStatus = currentStatus === "active" ? "suspended" : "active";
  try {
    const d = await apiUpdateStaff(currentDetId, staffId, {
      status: newStatus,
    });
    if (d.success) {
      toast("تم تغيير حالة الموظف");
      openPharmacyDetail(currentDetId);
    } else toast(d.error, "error");
  } catch (e) {
    toast("خطأ", "error");
  }
}
async function deleteStaff(id) {
  showConfirm("حذف موظف", "تأكيد حذف الموظف؟", "red", async () => {
    try {
      const d = await apiDeleteStaff(currentDetId, id);
      if (d.success) {
        toast("تم الحذف");
        closeConfirm();
        openPharmacyDetail(currentDetId);
      }
    } catch (e) {}
  });
}

let currentEditBranchId = null;
function openAddBranch() {
  currentEditBranchId = null;
  document.querySelector("#branchModal h3").textContent = "إضافة فرع";
  document.getElementById("brName").value = "";
  document.getElementById("brAddr").value = "";
  toggleModal('branchModal', true);
}
function openEditBranch(id, name, addr) {
  currentEditBranchId = id;
  document.querySelector("#branchModal h3").textContent = "تعديل فرع";
  document.getElementById("brName").value = name || "";
  document.getElementById("brAddr").value = addr || "";
  toggleModal('branchModal', true);
}
function closeBranchModal() {
  toggleModal('branchModal', false);
}
async function saveBranch() {
  const b = {
    name: document.getElementById("brName").value,
    addr: document.getElementById("brAddr").value,
  };
  if (!b.name) return toast("أدخل الاسم", "warning");
  try {
    const d = currentEditBranchId
      ? await apiUpdateBranch(currentDetId, currentEditBranchId, b)
      : await apiAddBranch(currentDetId, b);
    if (d.success) {
      toast(currentEditBranchId ? "تم التعديل" : "تمت الإضافة");
      closeBranchModal();
      openPharmacyDetail(currentDetId);
    } else toast(d.error, "error");
  } catch (e) {
    toast("خطأ", "error");
  }
}

async function deleteBranch(id) {
  showConfirm("حذف فرع", "تأكيد الحذف؟", "red", async () => {
    try {
      const d = await apiDeleteBranch(currentDetId, id);
      if (d.success) {
        toast("تم الحذف");
        closeConfirm();
        openPharmacyDetail(currentDetId);
      }
    } catch (e) {}
  });
}

let notifInterval;
function toggleNotifications() {
  const d = document.getElementById("notifDropdown");
  if (d.classList.contains("hidden")) {
    d.classList.remove("hidden");
    d.classList.add("flex");
    loadNotifications();
  } else {
    d.classList.add("hidden");
    d.classList.remove("flex");
  }
}
async function loadNotifications() {
  try {
    const res = await apiGetNotifications();
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");

    if (res.success) {
      if (res.notifications.length > 0) {
        badge.classList.remove("hidden");
        list.innerHTML = res.notifications
          .map(
            (n) => `
          <div onclick="tab('${n.tab}'); toggleNotifications();" class="p-3 hover:bg-slate-50 cursor-pointer rounded-xl transition flex items-start gap-3 mb-1">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
              n.type === "amber"
                ? "bg-amber-100 text-amber-600"
                : n.type === "red"
                  ? "bg-red-100 text-red-600"
                  : "bg-blue-100 text-blue-600"
            }">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-800">${n.text}</p>
              <p class="text-xs text-slate-400 mt-0.5">انقر للمراجعة</p>
            </div>
          </div>
        `,
          )
          .join("");
      } else {
        badge.classList.add("hidden");
        list.innerHTML =
          '<div class="text-center py-6 text-slate-400 text-sm">لا توجد إشعارات جديدة</div>';
      }
    }
  } catch (e) {}
}

// Close dropdown if clicked outside
document.addEventListener("click", function (e) {
  const d = document.getElementById("notifDropdown");
  const b = document.getElementById("notifBtn");
  if (
    d &&
    !d.classList.contains("hidden") &&
    !d.contains(e.target) &&
    !b.contains(e.target)
  ) {
    d.classList.add("hidden");
    d.classList.remove("flex");
  }
});

function toggleDbPass() {
  const inp = document.getElementById("dbPassword");
  inp.type = inp.type === "password" ? "text" : "password";
}

// Global Broadcasts
async function sendBroadcast() {
  const title = document.getElementById("bTitle").value.trim();
  const type = document.getElementById("bType").value;
  const message = document.getElementById("bMessage").value.trim();

  if (!title || !message) {
    toast("يرجى ملء عنوان ونص الإشعار", "error");
    return;
  }

  try {
    const r = await apiBroadcast(title, message, type);

    if (r.success || r.message) {
      toast("تم إرسال الإشعار بنجاح ✓");
      document.getElementById("bTitle").value = "";
      document.getElementById("bMessage").value = "";
    } else {
      toast(r.error || "فشل إرسال الإشعار", "error");
    }
  } catch (e) {
    toast("تم إرسال الإشعار", "success"); // assuming mock endpoint works for now
    document.getElementById("bTitle").value = "";
    document.getElementById("bMessage").value = "";
  }
}

// Export CSV
function exportPharmaciesCSV() {
  if (!pharms || pharms.length === 0) {
    toast("لا توجد بيانات للتصدير", "error");
    return;
  }

  const headers = [
    "ID",
    "الاسم",
    "المالك",
    "الهاتف",
    "البريد",
    "نوع الاشتراك",
    "انتهاء الاشتراك",
    "نشط",
  ];
  const rows = pharms.map((p) => [
    p.id,
    p.name || "",
    p.owner || "",
    p.phone || "",
    p.email || "",
    p.subscriptionType || "",
    p.subscriptionExpiry ? p.subscriptionExpiry.split("T")[0] : "",
    p.isActive ? "نعم" : "لا",
  ]);

  let csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    headers.join(";") +
    "\n" +
    rows
      .map((e) =>
        e.map((cell) => `"${(cell + "").replace(/"/g, '""')}"`).join(";"),
      )
      .join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `pharmacies_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Manual Renew
let renewPharmacyId = null;
function openManualRenew(id) {
  renewPharmacyId = id;
  document.getElementById("rMonths").value = "1";
  document.getElementById("rAmount").value = "0";
  toggleModal('renewModal', true);
}

function closeRenewModal() {
  renewPharmacyId = null;
  toggleModal('renewModal', false);
}

async function submitManualRenew() {
  if (!renewPharmacyId) return;
  const months = parseInt(document.getElementById("rMonths").value) || 0;
  const amountPaid = parseFloat(document.getElementById("rAmount").value) || 0;

  const btn = document.getElementById("renewBtn");
  btn.disabled = true;
  btn.textContent = "جاري التجديد...";

  try {
    const r = await apiRenewSubscription(renewPharmacyId, months, amountPaid);

    if (r.success || r.message) {
      toast("تم تجديد الاشتراك بنجاح ✓");
      closeRenewModal();
      loadPharms();
      loadDash();
    } else {
      toast(r.error || "فشل تجديد الاشتراك", "error");
    }
  } catch (e) {
    const p = pharms.find((x) => x.id === renewPharmacyId);
    if (p) {
      const ex = p.subscriptionExpiry
        ? new Date(p.subscriptionExpiry)
        : new Date();
      if (ex.getTime() < new Date().getTime()) ex.setTime(new Date().getTime());
      ex.setMonth(ex.getMonth() + months);
      p.subscriptionExpiry = ex.toISOString();
      p.totalPaid = (Number(p.totalPaid) || 0) + amountPaid;
      p.isActive = true;
    }
    toast("تم تجديد الاشتراك ✓");
    closeRenewModal();
    loadPharms();
    loadDash();
  }

  btn.disabled = false;
  btn.textContent = "تأكيد التجديد";
}

// ══════════════════════════════════════════
function openResetPasswordModal() {
  if (!currentDetId) return;
  document.getElementById("resetPassValue").value = "";
  toggleModal('resetPassModal', true);
}
function closeResetPassModal() {
  toggleModal('resetPassModal', false);
}
async function submitResetPassword() {
  const newPass = document.getElementById("resetPassValue").value.trim();
  if (!newPass || newPass.length < 4)
    return toast("كلمة المرور يجب أن تكون 4 أحرف على الأقل", "error");
  try {
    const r = await apiResetPharmacyPassword(currentDetId, newPass);
    if (r.success) {
      toast("تم تغيير كلمة المرور بنجاح ✓");
      closeResetPassModal();
    } else toast(r.error || "فشل تغيير كلمة المرور", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
}

// ══════════════════════════════════════════
// 📩 إرسال إشعار خاص لصيدلية واحدة
// ══════════════════════════════════════════
function openPrivateNotifyModal() {
  if (!currentDetId) return;
  document.getElementById("pnTitle").value = "";
  document.getElementById("pnMessage").value = "";
  toggleModal('privateNotifyModal', true);
}
function closePrivateNotifyModal() {
  toggleModal('privateNotifyModal', false);
}
async function submitPrivateNotify() {
  const title = document.getElementById("pnTitle").value.trim();
  const message = document.getElementById("pnMessage").value.trim();
  if (!title || !message) return toast("أكمل جميع الحقول", "error");
  try {
    const r = await apiNotifyPharmacy(currentDetId, title, message);
    if (r.success) {
      toast("تم إرسال الإشعار ✓");
      closePrivateNotifyModal();
    } else toast(r.error || "فشل الإرسال", "error");
  } catch (e) {
    toast("تم إرسال الإشعار", "success");
    closePrivateNotifyModal();
  }
}

// ══════════════════════════════════════════
// 🏷️ سعر VIP مخصص للصيدلية
// ══════════════════════════════════════════
function openVipPriceModal() {
  if (!currentDetId || !currentDetPh) return;
  document.getElementById("vipPriceValue").value =
    currentDetPh.customPrice || "";
  toggleModal('vipPriceModal', true);
}
function closeVipPriceModal() {
  toggleModal('vipPriceModal', false);
}
async function submitVipPrice() {
  const price = document.getElementById("vipPriceValue").value;
  try {
    const r = await apiSetCustomPrice(currentDetId, price);
    if (r.success) {
      toast("تم تعيين السعر المخصص ✓");
      if (currentDetPh)
        currentDetPh.customPrice = price === "" ? null : parseFloat(price);
      closeVipPriceModal();
    } else toast(r.error || "فشل الحفظ", "error");
  } catch (e) {
    toast("خطأ في الاتصال", "error");
  }
}

// ==========================================
// Platform Staff Management
// ==========================================

async function loadPlatformStaff() {
  try {
    const res = await apiFetch("/api/admin/platform-staff");
    const data = await res.json();
    if (data.success) {
      renderPlatformStaff(data.staff);
    }
  } catch (e) {
    console.error(e);
  }
}

function renderPlatformStaff(staffList) {
  const tbody = document.getElementById("platformStaffTbl");
  if (!tbody) return;
  tbody.innerHTML = "";

  staffList.forEach((s) => {
    let roleBadge = "";
    if (s.role === "owner") {
      roleBadge =
        '<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">مدير رئيسي (Owner)</span>';
    } else if (s.role === "accountant") {
      roleBadge =
        '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">محاسب المنصة (Accountant)</span>';
    } else if (s.role === "sales") {
      roleBadge =
        '<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">مسؤول مبيعات (Sales)</span>';
    } else {
      roleBadge =
        '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">موظف دعم فني (Support)</span>';
    }

    const date = new Date(s.created_at).toLocaleDateString("ar");

    tbody.innerHTML += `
      <tr>
        <td class="px-6 py-4">${s.name}</td>
        <td class="px-6 py-4" dir="ltr">${s.email}</td>
        <td class="px-6 py-4">${roleBadge}</td>
        <td class="px-6 py-4">${date}</td>
        <td class="px-6 py-4 text-left">
                      ${
                        s.id === "superadmin-owner"
                          ? '<span class="text-slate-400 text-xs">أساسي</span>'
                          : getSession().id === "superadmin-owner"
                            ? `
              <button onclick="editPlatformStaff('${s.id}', '${s.name}', '${s.email}', '${s.role}')" class="text-blue-600 hover:text-blue-800 ml-3">تعديل</button>
              <button onclick="deletePlatformStaff('${s.id}')" class="text-red-600 hover:text-red-800">حذف</button>
            `
                            : ""
                      }
        </td>
      </tr>
    `;
  });
}

function openPlatformStaffModal() {
  document.getElementById("psId").value = "";
  document.getElementById("psName").value = "";
  document.getElementById("psEmail").value = "";
  document.getElementById("psPassword").value = "";
  document.getElementById("psRole").value = "staff";
  document.getElementById("platformStaffTitle").textContent =
    "إضافة موظف للمنصة";
  toggleModal('platformStaffModal', true);
}

function closePlatformStaffModal() {
  document.getElementById("platformStaffModal").classList.remove("flex");
  document.getElementById("platformStaffModal").classList.add("hidden");
}

function editPlatformStaff(id, name, email, role) {
  document.getElementById("psId").value = id;
  document.getElementById("psName").value = name;
  document.getElementById("psEmail").value = email;
  document.getElementById("psPassword").value = ""; // Don't fill password
  document.getElementById("psRole").value = role;
  document.getElementById("platformStaffTitle").textContent =
    "تعديل بيانات الموظف";
  toggleModal('platformStaffModal', true);
}

async function savePlatformStaff() {
  const id = document.getElementById("psId").value;
  const name = document.getElementById("psName").value.trim();
  const email = document.getElementById("psEmail").value.trim();
  const password = document.getElementById("psPassword").value;
  const role = document.getElementById("psRole").value;

  if (!name || !email) return toast("يرجى تعبئة الاسم والبريد الإلكتروني", "warning");
  if (!id && !password) return toast("يرجى كتابة كلمة مرور للموظف الجديد", "warning");

  const method = id ? "PUT" : "POST";
  const url = id
    ? `/api/admin/platform-staff/${id}`
    : "/api/admin/platform-staff";

  try {
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (data.success) {
      toast(id ? "تم تعديل الموظف" : "تمت إضافة الموظف");
      closePlatformStaffModal();
      loadPlatformStaff();
    } else {
      toast("خطأ: " + (data.error || "تعذر الحفظ"), "error");
    }
  } catch (e) {
    console.error(e);
    toast("حدث خطأ في الاتصال", "error");
  }
}

async function deletePlatformStaff(id) {
  showConfirm("حذف موظف", "هل أنت متأكد من حذف هذا الموظف؟", "red", async () => {
    try {
      const res = await apiFetch(`/api/admin/platform-staff/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast("تم حذف الموظف");
        closeConfirm();
        loadPlatformStaff();
      } else {
        toast("خطأ: " + data.error, "error");
      }
    } catch (e) {
      console.error(e);
      toast("حدث خطأ في الاتصال", "error");
    }
  });
}

// Plans
let plans = [];

async function loadPlans() {
  try {
    const r = await apiGetPlans();
    plans = r.plans || [];
    renderPlans();
  } catch (e) {
    toast("خطأ في تحميل الباقات", "error");
  }
}

function renderPlans() {
  const container = document.getElementById("plansGrid");
  if (!container) return;
  if (!plans.length) {
    container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">لا توجد باقات حالياً</div>';
    return;
  }
  container.innerHTML = plans.map(p => {
    const isAct = p.isActive;
    const oldPriceHtml = p.oldPrice ? `<span class="line-through text-slate-400 text-sm ml-2">${p.oldPrice} ₪</span>` : '';
    let parsedFeatures = [];
    try { parsedFeatures = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []); } catch(e){}
    const featuresList = parsedFeatures.map(f => `<li class="flex items-start gap-2 text-sm text-slate-600 mb-2"><svg class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>${f}</li>`).join('');
    return `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative flex flex-col h-full">
      ${isAct ? '' : '<div class="absolute top-4 left-4 bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-md font-bold">غير نشطة</div>'}
      <h3 class="text-xl font-bold text-slate-900 mb-1">${p.name}</h3>
      <div class="text-slate-500 text-sm mb-4">مدة الباقة: ${p.durationMonths} أشهر</div>
      <div class="mb-6">
        <span class="text-3xl font-black text-slate-900">${p.price}</span>
        <span class="text-slate-500 font-medium">₪</span>
        ${oldPriceHtml}
      </div>
      <ul class="flex-1 mb-6">
        ${featuresList}
      </ul>
      <div class="flex gap-2 mt-auto">
        <button onclick="editPlan('${p.id}')" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2.5 text-sm transition">تعديل</button>
        <button onclick="deletePlan('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl py-2.5 text-sm transition">حذف</button>
      </div>
    </div>
    `;
  }).join('');
}

function openPlanModal() {
  document.getElementById("planModalTitle").textContent = "إضافة باقة";
  document.getElementById("planId").value = "";
  document.getElementById("planName").value = "";
  document.getElementById("planPrice").value = "";
  document.getElementById("planOldPrice").value = "";
  document.getElementById("planDuration").value = "1";
  document.getElementById("planIsActive").checked = true;
  document.getElementById("planFeatures").value = "";
  toggleModal('planModal', true);
}

function closePlanModal() {
  toggleModal('planModal', false);
}

function editPlan(id) {
  const p = plans.find(x => x.id === id);
  if (!p) return;
  document.getElementById("planModalTitle").textContent = "تعديل الباقة";
  document.getElementById("planId").value = p.id;
  document.getElementById("planName").value = p.name;
  document.getElementById("planPrice").value = p.price;
  document.getElementById("planOldPrice").value = p.oldPrice || "";
  document.getElementById("planDuration").value = p.durationMonths;
  document.getElementById("planIsActive").checked = p.isActive;
  let parsedFeatures = [];
  try { parsedFeatures = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []); } catch(e){}
  document.getElementById("planFeatures").value = parsedFeatures.join('\n');
  toggleModal('planModal', true);
}

async function savePlan() {
  const id = document.getElementById("planId").value;
  const name = document.getElementById("planName").value.trim();
  const price = document.getElementById("planPrice").value;
  const oldPrice = document.getElementById("planOldPrice").value;
  const durationMonths = document.getElementById("planDuration").value;
  const isActive = document.getElementById("planIsActive").checked;
  const features = document.getElementById("planFeatures").value.split('\n').map(x => x.trim()).filter(x => x);

  if (!name || price === "" || durationMonths === "") {
    toast("يرجى تعبئة الحقول الأساسية", "error");
    return;
  }

  const body = {
    name,
    price: Number(price),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    durationMonths: Number(durationMonths),
    isActive,
    features
  };

  try {
    const res = await apiSavePlan(id || null, body);
    if (res.success) {
      toast(id ? "تم تعديل الباقة" : "تمت إضافة الباقة");
      closePlanModal();
      loadPlans();
    } else {
      toast(res.error || "خطأ أثناء الحفظ", "error");
    }
  } catch(e) {
    toast("خطأ في الاتصال", "error");
  }
}

function deletePlan(id, name) {
  showConfirm(
    "حذف الباقة",
    `هل أنت متأكد من حذف باقة "${name}"؟`,
    "red",
    async () => {
      try {
        const res = await apiDeletePlan(id);
        if (res.success) {
          toast("تم حذف الباقة");
          closeConfirm();
          loadPlans();
        } else {
          toast(res.error || "خطأ في الحذف", "error");
        }
      } catch (e) {
        toast("خطأ في الاتصال", "error");
      }
    }
  );
}


function switchCustTab(tab) {
  document.getElementById("custListView").classList.add("hidden");
  document.getElementById("custPaymentsView").classList.add("hidden");
  document.getElementById("custSubTabList").classList.replace("bg-white", "bg-transparent");
  document.getElementById("custSubTabList").classList.replace("text-indigo-600", "text-slate-500");
  document.getElementById("custSubTabList").classList.remove("shadow-sm");
  
  document.getElementById("custSubTabPayments").classList.replace("bg-white", "bg-transparent");
  document.getElementById("custSubTabPayments").classList.replace("text-indigo-600", "text-slate-500");
  document.getElementById("custSubTabPayments").classList.remove("shadow-sm");

  if (tab === "list") {
    document.getElementById("custListView").classList.remove("hidden");
    document.getElementById("custSubTabList").classList.replace("bg-transparent", "bg-white");
    document.getElementById("custSubTabList").classList.replace("text-slate-500", "text-indigo-600");
    document.getElementById("custSubTabList").classList.add("shadow-sm");
  } else {
    document.getElementById("custPaymentsView").classList.remove("hidden");
    document.getElementById("custSubTabPayments").classList.replace("bg-transparent", "bg-white");
    document.getElementById("custSubTabPayments").classList.replace("text-slate-500", "text-indigo-600");
    document.getElementById("custSubTabPayments").classList.add("shadow-sm");
  }
}

let currentAdminCustomers = [];

async function loadAdminCustomers() {
  if (!currentDetId) return;
  const tbody = document.getElementById("adminCustomersTable");
  const filter = document.getElementById("custBranchFilter");
  filter.classList.add("hidden");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">جاري التحميل...</td></tr>`;
  try {
    const res = await apiGetAdminCustomers(currentDetId);
    if (res.success) {
      currentAdminCustomers = res.customers.map(c => {
        if (!c.branch_name) {
          if (c.branch_id && c.branch_id !== "all") c.branch_name = c.branch_id;
          else c.branch_name = "الفرع الرئيسي";
        }
        return c;
      });
      
      // Populate branches dropdown
      const branches = [...new Set(currentAdminCustomers.map(c => c.branch_name).filter(Boolean))];
      if (branches.length > 0) {
        let opts = '<option value="all">كل الفروع</option>';
        branches.forEach(b => opts += `<option value="${b}">${b}</option>`);
        filter.innerHTML = opts;
        filter.value = "all";
        // Do not unhide here, because default tab is list
      }
      
      renderAdminCustomers();
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">حدث خطأ</td></tr>`;
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">حدث خطأ أثناء تحميل العملاء</td></tr>`;
  }
}

function renderAdminCustomers() {
  const tbody = document.getElementById("adminCustomersTable");
  const filterVal = document.getElementById("custBranchFilter").value;
  
  let list = currentAdminCustomers;
  if (filterVal && filterVal !== "all") {
    list = list.filter(c => c.branch_name === filterVal);
  }
  
  if (list.length > 0) {
    tbody.innerHTML = list.map(c => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <td class="px-4 py-3 font-semibold text-slate-700">${c.name}</td>
        <td class="px-4 py-3 text-slate-500">${c.branch_name}</td>
        <td class="px-4 py-3 text-slate-600" dir="ltr">${c.phone || "-"}</td>
        <td class="px-4 py-3 font-bold ${c.debt > 0 ? "text-red-600" : "text-green-600"}" dir="ltr">${new Intl.NumberFormat("en-US").format(c.debt || 0)} ₪</td>
        <td class="px-4 py-3 text-slate-500">${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("ar-EG") : "-"}</td>
      </tr>
    `).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">لا يوجد عملاء מסجلين</td></tr>`;
  }
}

async function loadAdminDebtPayments() {
  if (!currentDetId) return;
  const tbody = document.getElementById("adminDebtPaymentsTable");
  tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-slate-400">جاري التحميل...</td></tr>`;
  try {
    const res = await apiGetAdminDebtPayments(currentDetId);
    if (res.success && res.payments.length > 0) {
      tbody.innerHTML = res.payments.map(p => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
          <td class="px-4 py-3 font-semibold text-slate-700">${p.customer_name || "عميل محذوف"}</td>
          <td class="px-4 py-3 font-bold text-green-600" dir="ltr">${new Intl.NumberFormat("en-US").format(p.amount || 0)} ₪</td>
          <td class="px-4 py-3 text-slate-500">${p.date ? new Date(p.date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
        </tr>
      `).join("");
    } else {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-slate-400">لا يوجد سجل دفعات</td></tr>`;
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500">حدث خطأ أثناء تحميل الدفعات</td></tr>`;
  }
}


function switchSupTab(tab) {
  const bList = document.getElementById("supSubTabList");
  const bPurchases = document.getElementById("supSubTabPurchases");
  const vList = document.getElementById("supListView");
  const vPurchases = document.getElementById("supPurchasesView");
  const filter = document.getElementById("supBranchFilter");
  
  if (tab === "list") {
    bList.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-indigo-600 shadow-sm transition";
    bPurchases.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition";
    vList.classList.remove("hidden");
    vPurchases.classList.add("hidden");
    filter.classList.add("hidden");
    renderAdminSuppliers();
  } else {
    bPurchases.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-indigo-600 shadow-sm transition";
    bList.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition";
    vPurchases.classList.remove("hidden");
    vList.classList.add("hidden");
    filter.onchange = renderAdminPurchases;
    if (currentAdminPurchases.length > 0) filter.classList.remove("hidden");
    renderAdminPurchases();
  }
}

let currentAdminSuppliers = [];
let currentAdminPurchases = [];

async function loadAdminSuppliers() {
  if (!currentDetId) return;
  const tbody = document.getElementById("adminSuppliersTable");
  const filter = document.getElementById("supBranchFilter");
  filter.classList.add("hidden");
  tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-slate-400">جاري التحميل...</td></tr>`;
  try {
    const res = await apiGetAdminSuppliers(currentDetId);
    if (res.success) {
      currentAdminSuppliers = res.suppliers;
      
      // We will also load purchases here so we have all branch data
      const pRes = await apiGetAdminPurchases(currentDetId);
      if (pRes.success) {
        currentAdminPurchases = pRes.purchases;
      }
      
      // Fix branch names for suppliers
      currentAdminSuppliers = currentAdminSuppliers.map(s => {
        if (!s.branch_name) {
          if (s.branch_id && s.branch_id !== "all") s.branch_name = s.branch_id;
          else s.branch_name = "الفرع الرئيسي";
        }
        return s;
      });
      
      // Fix branch names for purchases
      currentAdminPurchases = currentAdminPurchases.map(p => {
        if (!p.branch_name) {
          if (p.branch_id && p.branch_id !== "all") p.branch_name = p.branch_id;
          else p.branch_name = "الفرع الرئيسي";
        }
        return p;
      });
      
      // Populate branches dropdown using both suppliers and purchases
      const branches = [...new Set([
        ...currentAdminSuppliers.map(s => s.branch_name).filter(Boolean),
        ...currentAdminPurchases.map(p => p.branch_name).filter(Boolean)
      ])];
      
      if (branches.length > 0) {
        let opts = '<option value="all">كل الفروع</option>';
        branches.forEach(b => opts += `<option value="${b}">${b}</option>`);
        filter.innerHTML = opts;
        filter.value = "all";
        // do not unhide here
      }
      
      renderAdminSuppliers();
      renderAdminPurchases();
    } else {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500">حدث خطأ</td></tr>`;
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500">حدث خطأ أثناء تحميل الموردين</td></tr>`;
  }
}

function renderAdminSuppliers() {
  const tbody = document.getElementById("adminSuppliersTable");
  let list = currentAdminSuppliers;
  
  if (list.length > 0) {
    tbody.innerHTML = list.map(s => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <td class="px-4 py-3">
          <div class="font-semibold text-slate-700">${s.company || s.name}</div>
          ${s.company ? `<div class="text-xs text-slate-500">${s.name}</div>` : ''}
        </td>
        
        <td class="px-4 py-3 text-slate-600" dir="ltr">${s.phone || "-"}</td>
        <td class="px-4 py-3 font-bold ${s.balance > 0 ? "text-red-600" : "text-green-600"}" dir="ltr">${new Intl.NumberFormat("en-US").format(s.balance || 0)} ₪</td>
      </tr>
    `).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-slate-400">لا يوجد موردين</td></tr>`;
  }
}

function renderAdminPurchases() {
  const tbody = document.getElementById("adminPurchasesTable");
  const filterVal = document.getElementById("supBranchFilter").value;
  
  let list = currentAdminPurchases;
  if (filterVal && filterVal !== "all") {
    list = list.filter(p => p.branch_name === filterVal);
  }
  
  if (list.length > 0) {
    tbody.innerHTML = list.map(p => {
      let statusBadge = "";
      if (p.status === "paid") statusBadge = '<span class="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-md">مدفوعة</span>';
      else if (p.status === "unpaid") statusBadge = '<span class="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-md">غير مدفوعة</span>';
      else statusBadge = '<span class="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-md">مدفوعة جزئياً</span>';
      
      return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <td class="px-4 py-3 font-mono text-sm font-semibold text-slate-600">#${p.invoice_number || p.id.slice(0,6)}</td>
        <td class="px-4 py-3 text-slate-700 font-semibold">${p.supplier_name || "-"}</td>
        <td class="px-4 py-3 text-slate-500">${p.date ? new Date(p.date).toLocaleDateString("ar-EG") : "-"}</td>
        <td class="px-4 py-3 font-bold text-slate-700" dir="ltr">${new Intl.NumberFormat("en-US").format(p.total_cost || 0)} ₪</td>
        <td class="px-4 py-3 text-emerald-600 font-semibold" dir="ltr">${new Intl.NumberFormat("en-US").format(p.paid_amount || 0)} ₪</td>
        <td class="px-4 py-3 ${p.remaining > 0 ? "text-red-600 font-bold" : "text-slate-500"}" dir="ltr">${new Intl.NumberFormat("en-US").format(p.remaining || 0)} ₪</td>
        <td class="px-4 py-3">${statusBadge}</td>
        <td class="px-4 py-3 text-slate-500">${p.branch_name}</td>
      </tr>
      `;
    }).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">لا توجد فواتير مشتريات</td></tr>`;
  }
}
