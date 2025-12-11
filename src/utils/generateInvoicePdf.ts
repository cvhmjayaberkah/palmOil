import jsPDF from "jspdf";

export type InvoiceItem = {
  description: string;
  bottlesPerCrate: number;
  crates: number;
  totalBottles: number;
  pricePerCrate: number;
  discount?: number;
  discountType?: "AMOUNT" | "PERCENTAGE";
  total: number;
};

export type InvoiceData = {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;

  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  poNo?: string;
  quotationNo?: string;

  customerName: string;
  customerAddress?: string;

  items: InvoiceItem[];

  subtotal?: number;
  discount?: number;
  discountType?: "AMOUNT" | "PERCENTAGE";
  tax?: number;
  taxPercentage?: number;
  shippingCost?: number;
  totalAmount: number;

  bankInfo: string;
  bankInfo2?: string;
  accountType1?: string;
  accountType2?: string;
  accountHolderName1?: string;
  accountHolderName2?: string;

  representative: string;
};

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function generateInvoicePdf(data: InvoiceData) {
  // ================================
  //  PERUBAHAN UTAMA DI SINI
  // ================================
  // Ukuran continuous form 9.5 x 11 inci → dalam point: [684, 792]
  const doc = new jsPDF({
    unit: "pt",
    format: [684, 792],
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  let paymentTerms = "BAYAR LANGSUNG";
  if (data.dueDate && data.dueDate !== data.invoiceDate) {
    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(data.dueDate);
    const diff = dueDate.getTime() - invoiceDate.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (diffDays > 0) paymentTerms = `NET ${diffDays} HARI`;
  }

  // ================================
  //  MARGIN DIBESARKAN SEDIKIT
  // ================================
  const left = 50;
  let y = 50;

  // Judul INVOICE
  doc.setFont("helvetica", "normal").setFontSize(18);
  doc.text("INVOICE", pageWidth / 2, y, { align: "center" });
  y += 30;

  // Company info
  doc.setFont("helvetica", "normal").setFontSize(13);
  doc.text(data.companyName, left, y);
  doc.setFont("helvetica", "normal").setFontSize(10);
  y += 14;

  if (data.companyAddress) {
    const fullAddress = data.companyAddress;

    if (fullAddress.includes(" Kab")) {
      const kabIndex = fullAddress.indexOf(" Kab");
      const firstPart = fullAddress.substring(0, kabIndex).trim();
      const secondPart = fullAddress.substring(kabIndex).trim();
      doc.text(firstPart, left, y);
      y += 12;
      doc.text(secondPart, left, y);
      y += 12;
    } else {
      const maxLength = 40;
      const parts = fullAddress.split(",").map(p => p.trim());
      let current = "";
      for (let i = 0; i < parts.length; i++) {
        if ((current + parts[i]).length <= maxLength) {
          current += (current ? ", " : "") + parts[i];
        } else {
          doc.text(current, left, y);
          y += 12;
          current = parts[i];
        }
      }
      if (current) {
        doc.text(current, left, y);
        y += 12;
      }
    }
  }
  if (data.companyPhone) {
    doc.text(data.companyPhone, left, y);
    y += 12;
  }

  // Invoice info kanan
  const rightX = pageWidth - 250;
  let yR = 80;
  doc.setFontSize(10);
  doc.text("No. Invoice   ", rightX, yR);
  doc.text(data.invoiceNo, rightX + 80, yR);
  yR += 13;

  doc.text("Tanggal Order   ", rightX, yR);
  doc.text(data.invoiceDate, rightX + 80, yR);
  yR += 13;

  doc.text("Jatuh Tempo   ", rightX, yR);
  doc.text(paymentTerms, rightX + 80, yR);
  yR += 13;

  doc.text("Quo. No   ", rightX, yR);
  doc.text(data.quotationNo || "-", rightX + 80, yR);

  // Customer Info
  y += 20;
  doc.text("Ditujukan Kepada:", left, y);
  y += 12;
  doc.text(data.customerName, left, y);
  if (data.customerAddress) {
    y += 12;
    doc.text(data.customerAddress, left, y);
  }

  // Tabel Header
  y += 25;
  doc.setFontSize(10);

  const tableX = left;
  const tableWidth = pageWidth - left - left;

  const col1X = tableX;
  const col2X = tableX + 25;
  const col3X = tableX + 160;
  const col4X = tableX + 200;
  const col5X = tableX + 240;
  const col6X = tableX + 320;
  const col7X = tableX + 390;

  const tableEndX = pageWidth - left;

  doc.text("No", col1X + 5, y);
  doc.text("Deskripsi", col2X + 5, y);
  doc.text("Jumlah", col3X + 5, y);
  doc.text("Krat", col4X + 5, y);
  doc.text("Harga/krat", col5X + 5, y);
  doc.text("Potongan", col6X + 5, y);
  doc.text("Total", col7X + 5, y);

  y += 9;
  doc.setLineWidth(0.5);
  doc.line(tableX, y - 19, tableEndX, y - 19);
  doc.line(tableX, y, tableEndX, y);

  doc.line(col1X, y - 19, col1X, y);
  doc.line(col2X, y - 19, col2X, y);
  doc.line(col3X, y - 19, col3X, y);
  doc.line(col4X, y - 19, col4X, y);
  doc.line(col5X, y - 19, col5X, y);
  doc.line(col6X, y - 19, col6X, y);
  doc.line(col7X, y - 19, col7X, y);
  doc.line(tableEndX, y - 19, tableEndX, y);

  y += 8;

  // Tabel Body
  const baseRowHeight = 15;

  data.items.forEach((item, i) => {
    const currentRowY = y;
    let rowHeight = baseRowHeight;

    doc.text((i + 1).toString(), col1X + 5, y + 3);

    const desc = item.description;
    if (desc.length > 25) {
      const words = desc.split(" ");
      let l1 = "",
        l2 = "";
      for (let w of words) {
        if ((l1 + w).length <= 25) l1 += (l1 ? " " : "") + w;
        else l2 += (l2 ? " " : "") + w;
      }
      doc.text(l1, col2X + 5, y + 3);
      if (l2) {
        doc.text(l2, col2X + 5, y + 15);
        rowHeight += 12;
      }
    } else {
      doc.text(desc, col2X + 5, y + 3);
    }

    doc.text(item.totalBottles.toString(), col3X + 5, y + 3);
    doc.text(item.crates.toString(), col4X + 5, y + 3);
    doc.text(formatRupiah(item.pricePerCrate), col5X + 5, y + 3);

    const dTxt =
      item.discount && item.discount > 0
        ? item.discountType === "PERCENTAGE"
          ? `${item.discount}%`
          : formatRupiah(item.discount)
        : "-";

    doc.text(dTxt, col6X + 5, y + 3);

    doc.text(formatRupiah(item.total), col7X + 5, y + 3);

    const rowBottomY = currentRowY + rowHeight - baseRowHeight + 7;

    doc.setLineWidth(0.3);
    doc.line(col1X, currentRowY - 8, col1X, rowBottomY);
    doc.line(col2X, currentRowY - 8, col2X, rowBottomY);
    doc.line(col3X, currentRowY - 8, col3X, rowBottomY);
    doc.line(col4X, currentRowY - 8, col4X, rowBottomY);
    doc.line(col5X, currentRowY - 8, col5X, rowBottomY);
    doc.line(col6X, currentRowY - 8, col6X, rowBottomY);
    doc.line(col7X, currentRowY - 8, col7X, rowBottomY);
    doc.line(tableEndX, currentRowY - 8, tableEndX, rowBottomY);

    doc.line(tableX, rowBottomY, tableEndX, rowBottomY);

    y += rowHeight;
  });

  y += 7;
  doc.setLineWidth(0.5);
  doc.line(tableX, y, tableEndX, y);
  y += 15;

  const subtotal =
    data.subtotal || data.items.reduce((s, it) => s + it.total, 0);
  const discount = data.discount || 0;
  const tax = data.tax || 0;
  const shippingCost = data.shippingCost || 0;

  // Subtotal
  doc.text("Subtotal", col4X + 5, y + 3);
  doc.text(formatRupiah(subtotal), col7X + 5, y + 3);

  doc.setLineWidth(0.3);
  doc.line(col4X, y - 8, col4X, y + 7);
  doc.line(col7X, y - 8, col7X, y + 7);
  doc.line(tableEndX, y - 8, tableEndX, y + 7);
  doc.line(col4X, y - 8, tableEndX, y - 8);
  doc.line(col4X, y + 7, tableEndX, y + 7);
  y += 15;

  if (discount > 0) {
    const discountText =
      data.discountType === "PERCENTAGE"
        ? `Potongan (${discount}%)`
        : "Potongan";
    const discAmount =
      data.discountType === "PERCENTAGE"
        ? (subtotal * discount) / 100
        : discount;

    doc.text(discountText, col4X + 5, y + 3);
    doc.text(`-${formatRupiah(discAmount)}`, col7X + 5, y + 3);

    doc.line(col4X, y - 8, col4X, y + 7);
    doc.line(col7X, y - 8, col7X, y + 7);
    doc.line(tableEndX, y - 8, tableEndX, y + 7);
    doc.line(col4X, y + 7, tableEndX, y + 7);
    y += 15;
  }

  if (tax > 0) {
    const tText = data.taxPercentage
      ? `Pajak (${data.taxPercentage}%)`
      : "Pajak";

    doc.text(tText, col4X + 5, y + 3);
    doc.text(formatRupiah(tax), col7X + 5, y + 3);

    doc.line(col4X, y - 8, col4X, y + 7);
    doc.line(col7X, y - 8, col7X, y + 7);
    doc.line(tableEndX, y - 8, tableEndX, y + 7);
    doc.line(col4X, y + 7, tableEndX, y + 7);
    y += 15;
  }

  doc.text("Biaya Kirim", col4X + 5, y + 3);
  doc.text(formatRupiah(shippingCost), col7X + 5, y + 3);

  doc.line(col4X, y - 8, col4X, y + 7);
  doc.line(col7X, y - 8, col7X, y + 7);
  doc.line(tableEndX, y - 8, tableEndX, y + 7);
  doc.line(col4X, y + 7, tableEndX, y + 7);
  y += 15;

  // TOTAL
  doc.text("TOTAL", col4X + 5, y + 3);
  doc.text(formatRupiah(data.totalAmount), col7X + 5, y + 3);

  y += 12;
  doc.setFontSize(8);
  doc.text("*Sudah termasuk pajak PPN", col4X + 5, y);

  const totalRowHeight = 19;
  doc.setLineWidth(0.5);
  doc.line(col4X, y - 20, col4X, y + 7);
  doc.line(col7X, y - 20, col7X, y + 7);
  doc.line(tableEndX, y - 20, tableEndX, y + 7);
  doc.line(col4X, y - 20, tableEndX, y - 20);
  doc.line(col4X, y + 7, tableEndX, y + 7);

  y += 15;

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Transfer ke:", left, y);
  y += 15;

  const bankInfo1 = data.accountHolderName1
    ? `${data.accountType1 || "BCA"} - ${data.bankInfo} a/n ${
        data.accountHolderName1
      }`
    : data.bankInfo;
  doc.text(bankInfo1, left + 20, y);
  y += 13;

  if (data.bankInfo2) {
    y += 4; // Additional spacing between bank accounts
    const bankInfo2 = data.accountHolderName2
      ? `${data.accountType2 || ""} - ${data.bankInfo2} a/n ${
          data.accountHolderName2
        }`
      : data.bankInfo2;
    doc.text(bankInfo2, left + 20, y);
    y += 13;
  }

  y += 45;
  // Receiver signature on the left, Admin signature on the right
  doc.text("Penerima", pageWidth - 350, y);
  doc.text("Admin " + data.companyName, pageWidth - 180, y);
  y += 45;
  doc.text("", pageWidth - 350, y);
  doc.text("", pageWidth - 180, y);

  doc.save(`invoice_${data.invoiceNo}.pdf`);
}
