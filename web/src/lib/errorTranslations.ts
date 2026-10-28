import toast from "react-hot-toast";
import { useStore } from "../store";

/**
 * Universal Error & Toast Translation Dictionary for Roshetta Web
 * Translates server error codes, HTTP error messages, and system alerts
 * into professional, natural Arabic or English according to the selected app language.
 */

export const ERROR_TRANSLATIONS_AR: Record<string, string> = {
  // Session & Authentication
  "Invalid or expired session; please sign in again": "انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً",
  "Invalid or expired session": "انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً",
  "Authentication required": "يرجى تسجيل الدخول للمتابعة",
  "Authentication required; please sign in again": "يرجى تسجيل الدخول مجدداً للمتابعة",
  "Please sign in again to verify this session": "يرجى تسجيل الدخول مجدداً لتأكيد الجلسة",
  "Account is unavailable; please sign in again": "الحساب غير متاح حالياً؛ يرجى تسجيل الدخول مجدداً",
  "Account permissions changed; please sign in again": "تم تغيير صلاحيات الحساب؛ يرجى تسجيل الدخول مجدداً",
  "This device was signed out": "تم تسجيل الخروج من هذا الجهاز",
  "This device session is unavailable": "جلسة هذا الجهاز لم تعد متاحة؛ يرجى تسجيل الدخول",
  "Invalid device session": "جلسة الجهاز غير صالحة؛ يرجى تسجيل الدخول مجدداً",
  "Device session verification is unavailable": "تعذر التحقق من جلسة الجهاز؛ يرجى المحاولة لاحقاً",
  "Session expiry is missing; please sign in again": "انتهت مدة صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً",
  "Invalid session": "جلسة الدخول غير صالحة؛ يرجى إعادة تسجيل الدخول",
  "Unable to invalidate the session. Please try again.": "تعذر إنهاء الجلسة، يرجى المحاولة ثانية",
  "ACCOUNT_UNAVAILABLE": "الحساب غير متوفر حالياً",
  "AUTHENTICATION_REQUIRED": "تسجيل الدخول مطلوب لإتمام العملية",
  "CREDENTIALS_CHANGED": "تم تغيير بيانات الحساب؛ يرجى تسجيل الدخول مجدداً",
  "DEVICE_SESSION_INVALID": "جلسة الجهاز غير صالحة؛ يرجى تسجيل الدخول مجدداً",
  "DEVICE_SESSION_REVOKED": "تم إلغاء جلسة هذا الجهاز؛ يرجى تسجيل الدخول",
  "DEVICE_SESSION_ALREADY_BOUND": "جلسة الجهاز مرتبطة بحساب آخر مسبقاً",
  "DEVICE_SESSION_MISMATCH": "بيانات جلسة الجهاز غير متطابقة",

  // Permissions & Roles
  "Manager privileges required": "هذا الإجراء يتطلب صلاحيات مدير الصيدلية",
  "MANAGER_REQUIRED": "هذا الإجراء مخصص لمدير الصيدلية فقط",
  "Administrator privileges required": "يتطلب صلاحيات مسؤول المنصة",
  "Administrator permission denied": "تم رفض الإذن من قبل إدارة النظام",
  "Administrator account no longer exists": "حساب المسؤول لم يعد موجوداً",
  "Administrator session is no longer valid": "جلسة المسؤول لم تعد صالحة",
  "ADMINISTRATOR_ACCOUNT_UNAVAILABLE": "حساب المسؤول غير متوفر",
  "ADMINISTRATOR_PERMISSION_DENIED": "تم رفض الصلاحية من إدارة النظام",
  "Admin authentication is temporarily unavailable": "التحقق من المسؤول غير متاح حالياً",
  "Administrator authentication required": "مطلوب مصادقة المسؤول للمتابعة",
  "Reports permission required": "لا تملك صلاحية الوصول إلى التقارير",
  "A valid branch assignment is required": "يجب تعيين فرع صالح للمستخدم",
  "BRANCH_ASSIGNMENT_REQUIRED": "تعيين الفرع مطلوب لإتمام العملية",
  "BRANCH_IS_ARCHIVED": "الفرع المحدد مؤرشف ولا يمكن استخدامه",
  "BRANCH_NAME_CONFLICT": "يوجد فرع مسجل بنفس هذا الاسم مسبقاً",
  "BRANCH_NAME_REQUIRED": "يرجى كتابة اسم الفرع",
  "BRANCH_SCOPE_MISMATCH": "العملية خارج نطاق الفرع المخصص لحسابك",
  "CANNOT_DELETE_CURRENT_ACCOUNT": "لا يمكن حذف الحساب المسجل به حالياً",
  "Cannot delete the main owner.": "لا يمكن حذف حساب المالك الرئيسي",
  "Forbidden": "ليس لديك الصلاحية لإتمام هذه العملية",
  "Forbidden. Invalid Token.": "انتهت صلاحية الرمز، تم رفض الوصول",
  "You do not have permission to access this page": "ليس لديك الصلاحية للوصول إلى هذه الصفحة",

  // Pharmacy & Subscriptions
  "Pharmacy access denied": "تم رفض الوصول إلى بيانات هذه الصيدلية",
  "Pharmacy account is inactive": "حساب الصيدلية غير مفعّل أو موقوف مؤقتاً",
  "Pharmacy no longer exists": "الصيدلية غير مسجلة بالنظام أو تم حذفها",
  "Pharmacy not found": "لم يتم العثور على الصيدلية",
  "PHARMACY_ACCOUNT_REQUIRED": "حساب الصيدلية مطلوب للمتابعة",
  "PHARMACY_INACTIVE": "حساب الصيدلية متوقف حالياً",
  "PHARMACY_NOT_FOUND": "الصيدلية غير موجودة",
  "PHARMACY_SCOPE_MISMATCH": "العملية خارج نطاق الصيدلية المخصصة لك",
  "An active subscription is required": "يلزم اشتراك نشط لاستخدام هذه الميزة",
  "ACTIVE_SUBSCRIPTION_REQUIRED": "يلزم وجود اشتراك فعّال للمتابعة",
  "Subscription plan is unavailable": "خطة الاشتراك غير متوفرة حالياً",
  "Subscription request not found": "طلب الاشتراك غير موجود",
  "Subscription request was not recorded": "لم يتم تسجيل طلب الاشتراك، يرجى المحاولة مجدداً",
  "Subscription request changed; refresh its status": "تم تحديث حالة طلب الاشتراك، يرجى تحديث الصفحة",
  "The submitted request is unavailable; refresh subscription status": "الطلب المقدم غير متاح، يرجى تحديث حالة الاشتراك",
  "Only pending subscription requests can be approved": "يمكن اعتماد الطلبات المعلقة فقط",
  "Unknown or unavailable subscription plan": "خطة الاشتراك المحددة غير صالحة",
  "Payment reference or receipt required": "يرجى إرفاق إيصال الدفع أو رقم الحوالة",
  "Forbidden: Receipt does not belong to this account": "إيصال الدفع غير مخصص لهذا الحساب",
  "Invalid subscription request key": "رقم طلب الاشتراك غير صالح",

  // Inventory & Stock
  "INVENTORY_NAME_CONFLICT": "يوجد صنف بنفس هذا الاسم مسبقاً في المخزون",
  "INVENTORY_ID_CONFLICT": "معرف الصنف مسجل مسبقاً في المخزون",
  "INVENTORY_ITEM_REQUIRES_RECONCILIATION": "يتطلب الصنف تسوية كمية قبل إتمام العملية",
  "INVENTORY_BASELINE_REQUIRED": "تحديث المخزون يتطلب تحديد الكمية السابقة",
  "INVENTORY_BATCH_RECONCILIATION_REQUIRED": "يتطلب تحديث الصنف مطابقة التشغيلات",
  "INVENTORY_COST_RECONCILIATION_REQUIRED": "يتطلب الصنف تسوية سعر التكلفة",
  "INVENTORY_HAS_SALE_HISTORY": "لا يمكن حذف الصنف لوجود حركات مبيعات مرتبطة به",
  "INVENTORY_HAS_PURCHASE_HISTORY": "لا يمكن حذف الصنف لوجود فواتير شراء مرتبطة به",
  "INVENTORY_TRANSFER_REQUIRES_RECONCILIATION": "تحويل الصنف بين الفروع يتطلب تسوية رسمية",
  "STOCK_CHANGED_SINCE_EDIT": "تم تعديل المخزون من جهاز آخر، يرجى تحديث الصفحة",
  "STOCK_CHANGED_SINCE_COUNT": "تم تعديل كمية المخزون أثناء الجرد، يرجى التحديث",
  "INSUFFICIENT_CURRENT_STOCK": "الكمية المطلوبة في المخزون غير كافية",
  "DUPLICATE_STOCK_ITEM": "الصنف مكرر في قائمة الجرد",
  "DUPLICATE_REFUND_ITEM": "الصنف مكرر في طلب المرتجع",
  "ITEM_NOT_IN_SALE": "الصنف غير موجود في الفاتورة المحددة",
  "Error updating inventory": "حدث خطأ أثناء تحديث المخزون",
  "Invalid items array": "بيانات قائمة الأصناف غير صالحة",

  // Customers & Debt
  "CUSTOMER_HAS_UNSETTLED_DEBT": "لا يمكن إتمام العملية لوجود ديون غير مسددة على العميل",
  "CUSTOMER_NOT_FOUND": "لم يتم العثور على حساب العميل",
  "CREDIT_CUSTOMER_REQUIRED": "يجب تحديد العميل لتسجيل عملية البيع بالآجل",
  "DEBT_REQUIRES_FINANCIAL_EVENT": "تعديل رصيد الدين يتطلب تسديداً أو معاملة مالية",
  "DEBT_PAYMENT_RECONCILIATION_REQUIRED": "يتطلب تسديد الدين تسوية المعاملة",
  "PAYMENT_EXCEEDS_CURRENT_DEBT": "المبلغ المدفوع يتجاوز إجمالي الدين المستحق",

  // Suppliers & Purchases
  "SUPPLIER_HAS_UNSETTLED_BALANCE": "لا يمكن حذف المورد لوجود مستحقات مالية غير مسواة",
  "SUPPLIER_HAS_PURCHASE_HISTORY": "لا يمكن حذف المورد لوجود فواتير شراء مسجلة باسمه",
  "SUPPLIER_NOT_FOUND": "المورد غير موجود بالسجلات",
  "BALANCE_REQUIRES_FINANCIAL_EVENT": "تعديل رصيد المورد يتطلب حركة شراء أو دفع مالية",
  "PURCHASE_NOT_FOUND": "فاتورة الشراء غير موجودة",
  "PURCHASE_ALREADY_COMPLETED_RECONCILIATION_REQUIRED": "فاتورة الشراء مكتملة مسبقاً وتتطلب تسوية",
  "PURCHASE_INVENTORY_NOT_FOUND": "أحد أصناف الشراء غير موجود بالمخزون",
  "PURCHASE_ITEMS_REQUIRED": "يجب إضافة صنف واحد على الأقل لفاتورة الشراء",
  "PURCHASE_OVERPAYMENT": "المبلغ المدفوع أكبر من إجمالي فاتورة الشراء",
  "PURCHASE_REVERSAL_REQUIRES_RECONCILIATION": "إلغاء الشراء يتطلب تسوية الأصناف المستلمة",
  "PURCHASE_STOCK_ALREADY_CONSUMED": "تم بيع جزء من بضاعة هذه الفاتورة ولا يمكن استرجاعها مباشرة",
  "PURCHASE_PRICE_TARGET_NOT_FOUND": "الصنف المحدد لتحديث السعر غير موجود",
  "PURCHASE_PRICE_TARGET_REQUIRES_RECONCILIATION": "تحديث سعر الشراء يتطلب تسوية الفاتورة",
  "PURCHASE_QUANTITY_EDIT_REQUIRES_STOCK_ADJUSTMENT": "تعديل كمية الشراء يتطلب تسوية المخزون",
  "LEGACY_PURCHASE_REVERSAL_REQUIRES_RECONCILIATION": "إلغاء الفاتورة السابقة يتطلب تسوية الأصناف",

  // Sales & Shifts
  "SALE_NOT_REFUNDABLE": "لا يمكن استرجاع هذه الفاتورة",
  "Sale is already refunded": "تم استرجاع هذه الفاتورة مسبقاً",
  "Sale not found": "لم يتم العثور على الفاتورة",
  "No items provided for refund": "لم يتم تحديد أي أصناف للاسترجاع",
  "CASHIER_ALREADY_HAS_OPEN_SHIFT": "يوجد وردية عمل مفتوحة مسبقاً لهذا الكاشير",
  "SHIFT_ALREADY_CLOSED_DIFFERENTLY": "تم إغلاق هذه الوردية من قبل مستخدم آخر",
  "SHIFT_END_BEFORE_START": "وقت إغلاق الوردية لا يمكن أن يكون قبل وقت الفتح",
  "SHIFT_OWNER_REQUIRED": "يجب أن تتم العملية بواسطة صاحب الوردية نفسه",
  "SHIFT_ID_REQUIRED": "معرف الوردية مطلوب",
  "EXPENSE_ID_REQUIRED": "معرف المصروف مطلوب",
  "EXPENSE_ID_CONFLICT": "معرف المصروف مسجل مسبقاً",

  // Staff & Users
  "STAFF_NAME_REQUIRED": "يرجى إدخال اسم الموظف",
  "STAFF_NOT_FOUND": "لم يتم العثور على حساب الموظف",
  "STAFF_REQUIRED": "تحديد الموظف مطلوب لإتمام الإجراء",
  "Staff account is suspended": "حساب الموظف موقوف حالياً",
  "Staff member not found": "الموظف غير موجود بالسجلات",
  "INVALID_STAFF_PASSWORD": "كلمة المرور الخاصة بالموظف غير صالحة",
  "INVALID_STAFF_ROLE": "رتبة الموظف المحددة غير صحيحة",
  "Invalid pharmacy role": "رتبة المستخدم بالصيدلية غير صالحة",
  "Invalid platform role": "رتبة المستخدم بالنظام غير صالحة",
  "Invalid staff role": "رتبة الموظف غير صالحة",

  // System, Network & Validation
  "REQUIRED_FIELD": "يرجى ملء جميع الحقول المطلوبة",
  "A stable request_id is required": "معرف الطلب مطلوب لضمان عدم تكرار العملية",
  "EVENT_ID_REQUIRED": "معرف الحركة المالية مطلوب",
  "EVENT_ID_MISMATCH": "معرف المعاملة غير متطابق",
  "EVENT_CONTENT_CONFLICT": "تضارب في بيانات المعاملة، يرجى المحاولة ثانية",
  "EMPTY_UPDATE": "لم يتم تعديل أي حقول لحفظها",
  "INVALID_DATE": "صيغة التاريخ غير صالحة",
  "INVALID_EMAIL": "صيغة البريد الإلكتروني غير صالحة",
  "INVALID_NUMBER": "القيمة المدخلة يجب أن تكون رقماً صالحاً",
  "INVALID_PAYMENT_METHOD": "طريقة الدفع المحددة غير صالحة",
  "INVALID_STRUCTURED_DATA": "بيانات غير صالحة، يرجى مراجعة الحقول",
  "EMAIL_ALREADY_USED": "البريد الإلكتروني مسجل مسبقاً بحساب آخر",
  "Server database is not ready": "قاعدة بيانات الخادم قيد التهيئة، يرجى المحاولة بعد قليل",
  "Database error": "حدث خطأ في قاعدة البيانات",
  "RECORD_NOT_FOUND": "السجل المطلوب غير موجود",
  "Not found": "العنصر المطلوب غير موجود",
  "Ticket not found": "لم يتم العثور على تذكرة الدعم الفني",
  "Settings not found": "لم يتم العثور على الإعدادات المطلوبة",
  "Unable to save settings": "تعذر حفظ الإعدادات، يرجى المحاولة لاحقاً",
  "Missing email": "البريد الإلكتروني مطلوب",
  "Failed": "فشلت العملية، يرجى المحاولة ثانية",
  "Error": "حدث خطأ أثناء تنفيذ العملية",
  "Connection error": "خطأ في الاتصال بالخادم",
  "Network Error": "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت",
  "Failed to fetch": "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة",
  "Load failed": "فشل تحميل البيانات، يرجى التحقق من الاتصال",
  "Could not connect to server": "تعذر الاتصال بالخادم",
  "Cannot connect to server": "تعذر الاتصال بالخادم",
  "Please fill in all fields": "يرجى تعبئة جميع الحقول المطلوبة",
  "Something went wrong": "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً",
  "Invalid credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "Invalid password": "كلمة المرور غير صحيحة",
};

export const ERROR_TRANSLATIONS_EN: Record<string, string> = {
  "INVENTORY_NAME_CONFLICT": "An item with this name already exists in inventory",
  "INVENTORY_ID_CONFLICT": "Item ID already exists in inventory",
  "REQUIRED_FIELD": "Please fill in all required fields",
  "EVENT_ID_REQUIRED": "Transaction event ID is required",
  "CUSTOMER_HAS_UNSETTLED_DEBT": "Cannot proceed: Customer has unsettled debt",
  "SUPPLIER_HAS_UNSETTLED_BALANCE": "Cannot proceed: Supplier has unsettled balance",
  "STOCK_CHANGED_SINCE_EDIT": "Stock was modified by another session; please refresh",
  "CASHIER_ALREADY_HAS_OPEN_SHIFT": "Cashier already has an active open shift",
  "فشل في جلب البيانات": "Failed to fetch data",
  "فشل تغيير حالة الصيدلية": "Failed to update pharmacy status",
  "فشل في حذف الصيدلية": "Failed to delete pharmacy",
  "يرجى تعبئة جميع الحقول": "Please fill in all required fields",
  "خطأ في الاتصال بالخادم": "Server connection error",
  "تعذر الاتصال بالخادم": "Could not connect to server",
  "انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً": "Session expired; please sign in again",
};

/**
 * Translates any raw error message or code into the target language.
 */
export function translateErrorMessage(rawMessage: any, lang: "ar" | "en" = "ar"): string {
  if (rawMessage == null) {
    return lang === "en" ? "An unknown error occurred" : "حدث خطأ غير متوقع";
  }

  const str = String(
    typeof rawMessage === "object" && rawMessage.message ? rawMessage.message : rawMessage
  ).trim();

  if (!str) {
    return lang === "en" ? "An unknown error occurred" : "حدث خطأ غير متوقع";
  }

  // Target language is English
  if (lang === "en") {
    if (ERROR_TRANSLATIONS_EN[str]) return ERROR_TRANSLATIONS_EN[str];
    // If it's a code with underscores, convert to clean words
    if (/^[A-Z0-9_]{3,60}$/.test(str)) {
      return str
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
    return str;
  }

  // Target language is Arabic ('ar'):
  // 1. Direct dictionary match
  if (ERROR_TRANSLATIONS_AR[str]) {
    return ERROR_TRANSLATIONS_AR[str];
  }

  // 2. Case-insensitive dictionary match
  const lower = str.toLowerCase();
  for (const [key, val] of Object.entries(ERROR_TRANSLATIONS_AR)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  // 3. Pattern / Substring matching for phrases
  if (lower.includes("expired session") || lower.includes("invalid session") || lower.includes("sign in again")) {
    return "انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("load failed") ||
    lower.includes("cannot connect") ||
    lower.includes("connection error") ||
    lower.includes("could not connect")
  ) {
    return "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت";
  }
  if (
    lower.includes("permission") ||
    lower.includes("privilege") ||
    lower.includes("forbidden") ||
    lower.includes("not authorized") ||
    lower.includes("access denied") ||
    lower.includes("unauthorized")
  ) {
    return "ليس لديك الصلاحية الكافية لإتمام هذه العملية";
  }
  if (lower.includes("password") && (lower.includes("invalid") || lower.includes("wrong") || lower.includes("match") || lower.includes("incorrect"))) {
    return "كلمة المرور غير صحيحة أو غير متطابقة";
  }
  if (lower.includes("not found")) {
    return "العنصر المطلوب غير موجود بالسجلات";
  }
  if (lower.includes("already exists") || lower.includes("duplicate") || lower.includes("conflict")) {
    return "البيانات مسجلة مسبقاً، يرجى التحقق والتأكد";
  }
  if (lower.includes("required")) {
    return "يرجى تعبئة جميع الحقول المطلوبة";
  }
  if (lower.includes("database error") || lower.includes("database is not ready")) {
    return "حدث خطأ في قاعدة البيانات، يرجى المحاولة لاحقاً";
  }
  if (lower.includes("insufficient") || lower.includes("out of stock")) {
    return "الكمية المطلوبة غير متوفرة في المخزون";
  }
  if (/^server error\s*\(\d+\)/i.test(lower)) {
    return "حدث خطأ غير متوقع من الخادم، يرجى المحاولة لاحقاً";
  }

  // 4. If the message already contains Arabic characters, preserve it
  if (/[\u0600-\u06FF]/.test(str)) {
    return str;
  }

  // 5. If it's an UPPERCASE error code:
  if (/^[A-Z0-9_]{3,60}$/.test(str)) {
    return `حدث خطأ في العملية (${str})، يرجى المحاولة ثانية`;
  }

  // 6. Generic single-word English fallbacks
  if (lower === "failed" || lower === "error" || lower === "unknown error") {
    return "حدث خطأ أثناء تنفيذ العملية";
  }

  return str;
}

/**
 * Patches react-hot-toast singleton methods globally so all toast notifications
 * automatically speak the currently selected application language.
 */
let isToastLocalizationInstalled = false;

export function installToastLocalization() {
  if (isToastLocalizationInstalled || typeof window === "undefined") return;
  isToastLocalizationInstalled = true;

  const originalError = toast.error;
  toast.error = function (message: any, opts?: any) {
    const lang = (useStore.getState().language || "ar") as "ar" | "en";
    let localized = message;
    if (typeof message === "string" || message instanceof Error) {
      localized = translateErrorMessage(message, lang);
    }
    return originalError.call(this, localized, opts);
  };

  const originalCustom = toast.custom;
  toast.custom = function (jsx: any, opts?: any) {
    return originalCustom.call(this, jsx, opts);
  };

  const originalSuccess = toast.success;
  toast.success = function (message: any, opts?: any) {
    const lang = (useStore.getState().language || "ar") as "ar" | "en";
    let localized = message;
    if (typeof message === "string" && lang === "ar") {
      const trimmed = message.trim();
      const enSuccessMap: Record<string, string> = {
        "Saved successfully": "تم الحفظ بنجاح",
        "Updated successfully": "تم التحديث بنجاح",
        "Deleted successfully": "تم الحذف بنجاح",
        "Added successfully": "تمت الإضافة بنجاح",
        "Success": "تمت العملية بنجاح",
        "Operation completed successfully": "تمت العملية بنجاح",
      };
      if (enSuccessMap[trimmed]) {
        localized = enSuccessMap[trimmed];
      }
    }
    return originalSuccess.call(this, localized, opts);
  };
}

if (typeof window !== "undefined") {
  installToastLocalization();
}
