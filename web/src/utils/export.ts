import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportComprehensivePDF = async (
  report: any,
  pharmacyName: string,
  dateRange: string,
  filename: string,
) => {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.style.minHeight = "297mm";
  container.style.backgroundColor = "#ffffff";
  container.style.direction = "rtl";
  container.style.fontFamily = "Cairo, Tahoma, sans-serif";
  container.style.color = "#1f2937";

  const generateTable = (headers: string[], rows: any[][]) => {
    return `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 40px; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f3d2e; color: white;">
          ${headers.map((h) => `<th style="padding: 12px 15px; text-align: right; font-weight: bold; border-bottom: 2px solid #0a291f;">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, i) => `
          <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
            ${row.map((cell) => `<td style="padding: 12px 15px; color: #334155;">${cell}</td>`).join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>`;
  };

  container.innerHTML = `
    
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', Tahoma, sans-serif !important; }
      </style>

    <div style="padding: 15mm; background: #ffffff; min-height: 267mm; position: relative;">
      
      <!-- Watermark -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(15, 61, 46, 0.02); font-weight: 900; z-index: 0; pointer-events: none; white-space: nowrap;">
        ${pharmacyName}
      </div>

      <div style="position: relative; z-index: 1;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg style="width: 50px; height: 50px; drop-shadow: 0 2px 4px rgba(0,0,0,0.1);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
                <g transform="rotate(-45 12 12)">
                  <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
                  <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
                </g>
              </svg>
            </div>
            <div>
              <h1 style="margin: 0; color: #0f3d2e; font-size: 28px; font-weight: 900;">التقرير المالي الشامل</h1>
              <h2 style="margin: 5px 0 0 0; color: #64748b; font-size: 16px; font-weight: normal;">صيدلية: <strong style="color: #334155;">${pharmacyName}</strong></h2>
            </div>
          </div>
          <div style="text-align: left; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">تاريخ الإصدار:</span> <span dir="ltr">${new Date().toLocaleDateString("en-GB")}</span>
            </div>
            <div style="font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">فترة التقرير:</span> <span dir="ltr">${dateRange}</span>
            </div>
          </div>
        </div>

        <!-- Executive Summary -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          الملخص المالي
        </h3>
        <div style="display: flex; gap: 15px; margin-bottom: 30px;">
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #10b981; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">إجمالي المبيعات</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #3b82f6; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">الربح الإجمالي</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalProfit || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #ef4444; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">إجمالي المصروفات</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalExpenses || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-right: 4px solid #0f3d2e; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #166534; margin-bottom: 8px; font-weight: bold;">صافي الربح</div>
            <div style="font-size: 26px; font-weight: 900; color: #166534;">₪${(report.netProfit || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Payment Breakdown -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          تحليل طرق الدفع
        </h3>
        <div style="display: flex; gap: 15px; margin-bottom: 40px;">
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">كاش</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.cash || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">بطاقة بنكية</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.card || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">آجل (ذمم)</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.credit || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">تأمين</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.insurance || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Daily Trend Table -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          المبيعات اليومية
        </h3>
        ${generateTable(
          ["التاريخ", "إجمالي المبيعات", "إجمالي الربح"],
          (report.dailyTrend || []).map((t: any) => [
            `<span dir="ltr">${t.date}</span>`,
            `<strong style="color: #0f3d2e;">₪${(t.revenue || 0).toLocaleString()}</strong>`,
            `<strong style="color: #10b981;">₪${(t.profit || 0).toLocaleString()}</strong>`,
          ]),
        )}

        <!-- Top Items Table -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px; page-break-before: auto;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          الأدوية الأكثر مبيعاً
        </h3>
        ${generateTable(
          ["اسم الدواء", "الكمية المباعة", "إجمالي الإيرادات"],
          (report.topItems || []).map((i: any) => [
            i.name,
            `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${i.qty} عبوة</span>`,
            `₪${(i.revenue || 0).toLocaleString()}`,
          ]),
        )}

        <!-- Footer -->
        <div style="margin-top: 50px; text-align: center; border-top: 2px dashed #e2e8f0; padding-top: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f3d2e;">نظام روشتة لإدارة الصيدليات المتقدمة</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">وثيقة مالية رسمية مُصدرة آلياً • لا تحتاج إلى ختم</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename + ".pdf");
  } catch (err) {
    console.error("Error generating PDF", err);
  } finally {
    document.body.removeChild(container);
  }
};

export const exportInvoicePDF = async (
  invoiceData: {
    items: any[];
    subTotal: number;
    discount: number;
    finalTotal: number;
    customerName: string;
  },
  pharmacyName: string,
  invoiceNumber: string,
) => {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.style.minHeight = "297mm";
  container.style.backgroundColor = "#ffffff";
  container.style.direction = "rtl";
  container.style.fontFamily = "Cairo, Tahoma, sans-serif";
  container.style.color = "#1f2937";

  const generateItemsTable = () => {
    return `<table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f3d2e; color: white;">
          <th style="padding: 12px 15px; text-align: right; font-weight: bold; border-bottom: 2px solid #0a291f; width: 40%;">الصنف</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">الكمية</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">السعر الإفرادي</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.items
          .map(
            (item, i) => `
          <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 15px; color: #334155; font-weight: bold;">${item.name}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center;">${item.qty}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center;">₪${item.price}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center; font-weight: bold;">₪${(item.qty * item.price).toLocaleString()}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>`;
  };

  container.innerHTML = `
    
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', Tahoma, sans-serif !important; }
      </style>

    <div style="padding: 15mm; background: #ffffff; min-height: 267mm; position: relative;">
      
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(15, 61, 46, 0.02); font-weight: 900; z-index: 0; pointer-events: none; white-space: nowrap;">
        ${pharmacyName}
      </div>

      <div style="position: relative; z-index: 1;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0f3d2e; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg style="width: 50px; height: 50px; drop-shadow: 0 2px 4px rgba(0,0,0,0.1);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
                <g transform="rotate(-45 12 12)">
                  <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
                  <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
                </g>
              </svg>
            </div>
            <div>
              <h1 style="margin: 0; color: #0f3d2e; font-size: 28px; font-weight: 900;">فاتورة مبيعات</h1>
              <h2 style="margin: 5px 0 0 0; color: #64748b; font-size: 16px;">صيدلية: <strong style="color: #334155;">${pharmacyName}</strong></h2>
            </div>
          </div>
          <div style="text-align: left; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">رقم الفاتورة:</span> <span dir="ltr">#${invoiceNumber}</span>
            </div>
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">التاريخ:</span> <span dir="ltr">${new Date().toLocaleString("en-GB")}</span>
            </div>
            ${invoiceData.customerName ? `<div style="font-size: 13px; color: #64748b;"><span style="font-weight: bold; color: #334155;">العميل:</span> ${invoiceData.customerName}</div>` : ""}
          </div>
        </div>

        ${generateItemsTable()}

        <!-- Totals Section -->
        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <div style="width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #64748b;">
              <span>المجموع الفرعي:</span>
              <span style="font-weight: bold; color: #334155;">₪${invoiceData.subTotal.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; color: #ef4444;">
              <span>الخصم:</span>
              <span style="font-weight: bold;">₪${invoiceData.discount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px dashed #cbd5e1; font-size: 18px; color: #0f3d2e; font-weight: 900;">
              <span>الإجمالي المطلوب:</span>
              <span>₪${invoiceData.finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center; border-top: 2px dashed #e2e8f0; padding-top: 20px;">
          <h3 style="color: #0f3d2e; font-size: 16px; margin: 0 0 5px 0;">شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية</h3>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">تم إصدار هذه الفاتورة من نظام روشتة</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Invoice_" + invoiceNumber + ".pdf");
  } catch (err) {
    console.error("Error generating PDF", err);
  } finally {
    document.body.removeChild(container);
  }
};
