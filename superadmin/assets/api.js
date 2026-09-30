const API = "https://aessaaessa.alwaysdata.net";

// Session Management
function getSession() {
  const session = localStorage.getItem("sa_session");
  return session ? JSON.parse(session) : null;
}

function saveSession(user) {
  localStorage.setItem("sa_session", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("sa_session");
}

// Intercept fetch to add any headers if needed in the future
async function apiFetch(endpoint, options = {}) {
  const session = getSession();
  if (session && session.id) {
    options.headers = {
      ...options.headers,
      "x-admin-id": session.id,
    };
  }

  const response = await fetch(`${API}${endpoint}`, options);
  
  if (response.status === 401) {
    clearSession();
    window.location.reload();
  }
  
  return response;
}

// Auth APIs
async function apiLogin(email, password) {
  const r = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "manager" }),
  });
  return r.json();
}

// Admin APIs
async function apiGetDashboard() {
  const [pRes, tRes, sRes, uRes] = await Promise.all([
    apiFetch("/api/admin/pharmacies").then((r) => r.json()),
    apiFetch("/api/admin/tickets").then((r) => r.json()),
    apiFetch("/api/admin/settings").then((r) => r.json()),
    apiFetch("/api/admin/users")
      .then((r) => r.json())
      .catch(() => ({ users: [] })),
  ]);
  return { pRes, tRes, sRes, uRes };
}

async function apiGetPharmacies() {
  return apiFetch("/api/admin/pharmacies").then((r) => r.json());
}

async function apiSavePharmacy(id, body) {
  const url = id ? `/api/admin/pharmacies/${id}` : `/api/admin/pharmacies`;
  return apiFetch(url, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function apiTogglePharmacy(id, currentStatus) {
  return apiFetch(`/api/admin/pharmacies/${id}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: !currentStatus }),
  }).then((r) => r.json());
}

async function apiDeletePharmacy(id) {
  return apiFetch(`/api/admin/pharmacies/${id}`, { method: "DELETE" }).then(
    (r) => r.json(),
  );
}

async function apiGetUsers() {
  return apiFetch("/api/admin/users").then((r) => r.json());
}

async function apiGetPharmacySales(pharmacyId) {
  // Arbitrary wide date range for total sales
  return apiFetch(
    `/api/pharmacies/${pharmacyId}/sales?from=2020-01-01&to=2030-12-31`,
  ).then((r) => r.json());
}

async function apiGetTickets() {
  return apiFetch("/api/admin/tickets").then((r) => r.json());
}

async function apiUpdateTicket(id, status) {
  return apiFetch(`/api/admin/tickets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function apiGetSettings() {
  return apiFetch("/api/admin/settings?t=" + Date.now()).then((r) => r.json());
}

async function apiSaveSettings(body) {
  return apiFetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function apiGetSubRequests() {
  return apiFetch("/api/admin/subscription-requests").then((r) => r.json());
}
async function apiApproveSubRequest(id) {
  return apiFetch(`/api/admin/subscription-requests/${id}/approve`, {
    method: "POST",
  }).then((r) => r.json());
}
async function apiRejectSubRequest(id) {
  return apiFetch(`/api/admin/subscription-requests/${id}/reject`, {
    method: "POST",
  }).then((r) => r.json());
}

async function apiGetPharmacyDetails(id) {
  const [ph, branches, staff] = await Promise.all([
    apiFetch(`/api/admin/pharmacies/${id}`).then((r) => r.json()),
    apiFetch(`/api/admin/pharmacies/${id}/branches`).then((r) => r.json()),
    apiFetch(`/api/admin/pharmacies/${id}/staff`).then((r) => r.json()),
  ]);
  return {
    pharmacy: ph.pharmacy,
    branches: branches.branches || [],
    staff: staff.staff || [],
  };
}
async function apiToggleReadOnly(id, isReadOnly) {
  return apiFetch(`/api/admin/pharmacies/${id}/readonly`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isReadOnly }),
  }).then((r) => r.json());
}
async function apiAddStaff(pharmacyId, body) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}
async function apiDeleteStaff(pharmacyId, staffId) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/staff/${staffId}`, {
    method: "DELETE",
  }).then((r) => r.json());
}
async function apiAddBranch(pharmacyId, body) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/branches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}
async function apiDeleteBranch(pharmacyId, branchId) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/branches/${branchId}`, {
    method: "DELETE",
  }).then((r) => r.json());
}

async function apiUpdateStaff(pharmacyId, staffId, body) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/staff/${staffId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function apiUpdateBranch(pharmacyId, branchId, body) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/branches/${branchId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function apiGetNotifications() {
  return apiFetch("/api/admin/notifications").then((r) => r.json());
}

async function apiGetPlans() {
  return apiFetch("/api/admin/subscription-plans").then((r) => r.json());
}

async function apiSavePlan(id, body) {
  const url = id ? `/api/admin/subscription-plans/${id}` : "/api/admin/subscription-plans";
  return apiFetch(url, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function apiDeletePlan(id) {
  return apiFetch(`/api/admin/subscription-plans/${id}`, { method: "DELETE" }).then((r) => r.json());
}

async function apiBroadcast(title, message, type) {
  return apiFetch(`/api/admin/broadcasts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, message, type }),
  }).then((r) => r.json());
}

async function apiRenewSubscription(pharmacyId, months, amountPaid) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/renew`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ months, amountPaid }),
  }).then((r) => r.json());
}

async function apiResetPharmacyPassword(pharmacyId, newPassword) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  }).then((r) => r.json());
}

async function apiNotifyPharmacy(pharmacyId, title, message) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, message }),
  }).then((r) => r.json());
}

async function apiSetCustomPrice(pharmacyId, customPrice) {
  return apiFetch(`/api/admin/pharmacies/${pharmacyId}/custom-price`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customPrice: customPrice === "" ? null : parseFloat(customPrice) }),
  }).then((r) => r.json());
}
