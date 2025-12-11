import jsPDF from "jspdf";

export type DeliveryNoteItem = {
  productCode: string;
  productName: string;
  quantity: number; // Number of crates
  bottlesPerCrate: number; // Bottles per crate
  totalBottles: number; // quantity * bottlesPerCrate
  price: number;
  discount: number;
  discountType: "FIXED" | "PERCENTAGE";
  totalPrice: number;
  notes?: string; // Notes for this item
};

export type DeliveryNoteData = {
  // Company Information
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;

  // Delivery Note Information
  deliveryNoteNo: string;
  deliveryDate: string;
  invoiceNo?: string;
  invoiceDate?: string;

  // Customer Information
  customerName: string;
  customerAddress?: string;

  // Delivery Information
  driverName: string;
  vehicleNumber: string;
  notes?: string;

  // Items
  items: DeliveryNoteItem[];

  // Totals
  subtotal: number;
  discount: number;
  tax: number;
  taxPercentage: number;
  totalAmount: number;

  // Additional Info
  warehouseStaff?: string;
  createdBy?: string;
};

export function generateDeliveryNotePdf(data: DeliveryNoteData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  let y = 50;

  // Header - Company Information
  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text(data.companyName || "CV HM JAYA BERKAH", left, y);
  y += 20;

  doc.setFontSize(10).setFont("helvetica", "normal");
  if (data.companyAddress) {
    doc.text(data.companyAddress, left, y);
    y += 14;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, left, y);
    y += 14;
  }

  // Title
  y += 10;
  doc.setFontSize(14).setFont("helvetica", "bold");
  doc.text("SURAT JALAN", pageWidth / 2, y, { align: "center" });
  y += 30;

  // Delivery Note Information (Right side)
  const rightX = pageWidth - 200;
  let rightY = 50;
  doc.setFontSize(10).setFont("helvetica", "bold");
  doc.text(`No. Surat Jalan: ${data.deliveryNoteNo}`, rightX, rightY);
  rightY += 14;
  doc.setFont("helvetica", "normal");
  doc.text(`Pengiriman: ${data.deliveryDate}`, rightX, rightY);
  rightY += 14;
  if (data.invoiceNo) {
    doc.text(`No. Invoice: ${data.invoiceNo}`, rightX, rightY);
    rightY += 14;
  }
  if (data.invoiceDate) {
    doc.text(`Tgl. Invoice: ${data.invoiceDate}`, rightX, rightY);
    rightY += 14;
  }

  // Customer Information
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Kepada:", left, y);
  y += 16;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(data.customerName, left, y);
  y += 14;
  if (data.customerAddress) {
    doc.text(data.customerAddress, left, y);
    y += 14;
  }

  // Delivery Information
  y += 10;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Informasi Pengiriman:", left, y);
  y += 16;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Driver: ${data.driverName}`, left, y);
  y += 14;
  doc.text(`Kendaraan: ${data.vehicleNumber}`, left, y);
  y += 20;

  // Items Table Header
  doc.setFont("helvetica", "bold").setFontSize(10);
  const tableStartY = y;
  const tableEndX = pageWidth - left;

  // Header background (optional light gray) like invoice
  doc.setFillColor(245, 245, 245);
  doc.rect(left, y - 10, tableEndX - left, 20, "F");

  // Define column positions and widths for better spacing
  const colPositions = {
    no: left,
    code: left + 25,
    name: left + 130, // Moved right to give more space for code
    bottles: left + 320, // Total bottles column
    crates: left + 370, // Number of crates
    notes: left + 420, // Notes column
  };

  // Table headers with better spacing and centering
  const headers = ["No", "Kode", "Nama Produk", "Jumlah", "Krat", "Catatan"];
  const headerPositions = [
    colPositions.no,
    colPositions.code,
    colPositions.name,
    colPositions.bottles,
    colPositions.crates,
    colPositions.notes,
  ];
  const columnWidths = [20, 100, 185, 45, 45, 80]; // Widened code column from 80 to 100

  headers.forEach((header, index) => {
    if (index === 2) {
      // Nama Produk - left aligned
      doc.text(header, headerPositions[index], y);
    } else if (index === 5) {
      // Catatan - left aligned
      doc.text(header, headerPositions[index], y);
    } else {
      // Others - centered
      const headerWidth = doc.getTextWidth(header);
      doc.text(
        header,
        headerPositions[index] + (columnWidths[index] - headerWidth) / 2,
        y
      );
    }
  });

  // Header border like invoice
  y += 9;
  doc.setLineWidth(0.5);
  doc.line(left, y - 19, tableEndX, y - 19); // Top border
  doc.line(left, y, tableEndX, y); // Bottom border of header

  // Vertical lines for header
  doc.line(colPositions.no, y - 19, colPositions.no, y); // Left border
  doc.line(colPositions.code, y - 19, colPositions.code, y); // After No
  doc.line(colPositions.name, y - 19, colPositions.name, y); // After Code
  doc.line(colPositions.bottles, y - 19, colPositions.bottles, y); // After Name
  doc.line(colPositions.crates, y - 19, colPositions.crates, y); // After Jumlah
  doc.line(colPositions.notes, y - 19, colPositions.notes, y); // After Krat
  doc.line(tableEndX, y - 19, tableEndX, y); // Right border

  y += 13;

  // Items with better text wrapping and positioning
  doc.setFont("helvetica", "normal");
  const rowHeight = 18;
  data.items.forEach((item, index) => {
    const currentRowY = y;

    // Number (centered)
    const noText = String(index + 1);
    const noWidth = doc.getTextWidth(noText);
    doc.text(noText, colPositions.no + (20 - noWidth) / 2, y);

    // Product Code (centered)
    const codeWidth = doc.getTextWidth(item.productCode);
    doc.text(item.productCode, colPositions.code + (100 - codeWidth) / 2, y);

    // Product Name - handle long text
    const productName = item.productName;
    if (productName.length > 28) {
      // Split long product names into multiple lines
      const words = productName.split(" ");
      let line1 = "";
      let line2 = "";

      for (let i = 0; i < words.length; i++) {
        if (line1.length + words[i].length < 28) {
          line1 += (line1 ? " " : "") + words[i];
        } else {
          line2 += (line2 ? " " : "") + words[i];
        }
      }

      doc.text(line1, colPositions.name + 5, y);
      if (line2) {
        doc.text(line2, colPositions.name + 5, y + 12);
      }
    } else {
      doc.text(productName, colPositions.name + 5, y);
    }

    // Total Bottles (centered)
    const bottlesText = String(
      item.totalBottles || item.quantity * (item.bottlesPerCrate || 24)
    );
    const bottlesWidth = doc.getTextWidth(bottlesText);
    doc.text(bottlesText, colPositions.bottles + (45 - bottlesWidth) / 2, y);

    // Number of Crates (centered)
    const cratesText = String(item.quantity);
    const cratesWidth = doc.getTextWidth(cratesText);
    doc.text(cratesText, colPositions.crates + (45 - cratesWidth) / 2, y);

    // Notes (left aligned)
    const notesText = item.notes || "-";
    doc.text(notesText, colPositions.notes + 5, y);

    // Row borders like invoice
    doc.setLineWidth(0.3);
    doc.line(
      colPositions.no,
      currentRowY - 8,
      colPositions.no,
      currentRowY + 10
    ); // Left border
    doc.line(
      colPositions.code,
      currentRowY - 8,
      colPositions.code,
      currentRowY + 10
    ); // After No
    doc.line(
      colPositions.name,
      currentRowY - 8,
      colPositions.name,
      currentRowY + 10
    ); // After Code
    doc.line(
      colPositions.bottles,
      currentRowY - 8,
      colPositions.bottles,
      currentRowY + 10
    ); // After Name
    doc.line(
      colPositions.crates,
      currentRowY - 8,
      colPositions.crates,
      currentRowY + 10
    ); // After Jumlah
    doc.line(
      colPositions.notes,
      currentRowY - 8,
      colPositions.notes,
      currentRowY + 10
    ); // After Krat
    doc.line(tableEndX, currentRowY - 8, tableEndX, currentRowY + 10); // Right border

    // Bottom border for each row
    doc.line(left, currentRowY + 10, tableEndX, currentRowY + 10);

    y += rowHeight;
  });

  // Table footer line like invoice
  y += 7;
  doc.setLineWidth(0.5);
  doc.line(left, y, tableEndX, y); // Final bottom border

  y += 20;

  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Catatan:", left, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, left, y);
    y += 20;
  }

  // Signatures
  y += 20;
  const signatureY = y;

  // Company name above signatures
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(data.companyName, left, signatureY);

  y += 16;

  // Warehouse Staff
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Admin" + data.companyName, left, y);
  doc.text("Penerima", left + 400, y);
  doc.text("Driver", left + 200, y);

  y += 60;

  if (data.warehouseStaff) {
    doc.text("(_________________)", left, y);
  } else {
    doc.text("(_________________)", left, y);
  }
  doc.text("(_________________)", left + 400, y);
  doc.text(`(${data.driverName})`, left + 200, y);

  // // Footer
  // if (data.createdBy) {
  //   y += 30;
  //   doc.setFontSize(8);
  //   doc.text(`Dibuat oleh: ${data.createdBy}`, left, y);
  // }

  // Save PDF
  doc.save(`surat_jalan_${data.deliveryNoteNo || "draft"}.pdf`);
}

// Helper function to format currency
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
