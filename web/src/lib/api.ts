const API_BASE_URL = "http://localhost:3000/api";

/**
 * دالة مركزية للتخاطب مع سيرفر النظام (Backend)
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });

    // محاولة جلب JSON إذا أمكن
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || "Connection Error");
    }

    return data;
  } catch (error) {
    throw error;
  }
}
