const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toISOString().slice(0, 10);
};

const buildDeliveryRows = (deliveries = []) =>
  deliveries
    .map(
      (delivery, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatDate(delivery.date))}</td>
          <td>${escapeHtml(delivery.address || "-")}</td>
          <td>${escapeHtml(delivery.phone || "-")}</td>
          <td>${escapeHtml(delivery.status || "-")}</td>
          <td>${escapeHtml(delivery.driver || "-")}</td>
          <td style="text-align:right;white-space:nowrap">${formatMoney(delivery.price)} ₮</td>
        </tr>`
    )
    .join("");

const buildHtml = (username, report) => {
  const difference =
    (Number(report.totalPrice) || 0) - (Number(report.salary) || 0);
  const summaryRows = [
    ["Нийт хүргэлт", report.totalDeliveries],
    ["Хүргэсэн", report.deliveredDeliveries],
    ["Буцаасан", report.status5Deliveries],
    ["Захиалгын тоо", report.orderCount || 0],
    ["Нийт тооцоо", `${formatMoney(report.totalPrice)} ₮`],
    ["Тооцоо", `${formatMoney(report.salary)} ₮`],
    ["Зөрүү", `${formatMoney(difference)} ₮`],
  ]
    .map(
      ([label, value]) =>
        `<tr><th>${label}</th><td style="text-align:right">${value}</td></tr>`
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937">
        <div style="max-width:760px;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="padding:20px 24px;background:#1677ff;color:#fff">
            <div style="font-size:12px;opacity:.8">1018 DELIVERY</div>
            <h2 style="margin:4px 0 0">Хүргэлтийн тайлан</h2>
          </div>
          <div style="padding:24px">
            <p>Сайн байна уу, <strong>${escapeHtml(username)}</strong>.</p>
            <p><strong>${escapeHtml(report.dateRange)}</strong> хугацааны тайлан:</p>
            <table class="summary">${summaryRows}</table>
            <h3 style="margin-top:28px">Хүргэлтийн дэлгэрэнгүй</h3>
            <table class="details">
              <thead><tr><th>№</th><th>Огноо</th><th>Хаяг</th><th>Утас</th><th>Төлөв</th><th>Жолооч</th><th>Үнэ</th></tr></thead>
              <tbody>${buildDeliveryRows(report.deliveries)}</tbody>
            </table>
          </div>
        </div>
        <style>
          table { width:100%; border-collapse:collapse; font-size:13px; }
          th, td { border:1px solid #e5e7eb; padding:9px; text-align:left; }
          th { background:#f8fafc; }
          .summary { max-width:460px; }
          .details { min-width:680px; }
        </style>
      </body>
    </html>`;
};

async function sendMerchantReportEmail(to, username, report) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email is not configured. Set RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.RESEND_FROM ||
        process.env.SMTP_FROM ||
        "1018 Delivery <noreply@1018.mn>",
      to: [to],
      subject: `Хүргэлтийн тайлан — ${username} (${report.dateRange})`,
      html: buildHtml(username, report),
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Email provider rejected the request");
  }
  return result;
}

module.exports = { sendMerchantReportEmail };
