const Order = require('../../models/orderSchema');
const exceljs = require('exceljs'); 
const PDFDocument = require("pdfkit");
const httpStatusCode = require('../../helpers/httpStatusCode')


const loadSalesReportPage = async (req, res) => {
  try {
    const { filter, page = 1, startDate: customStart, endDate: customEnd } = req.query;
    const limit = 10;
    const currentPage = parseInt(page);
    const skip = (currentPage - 1) * limit;

    const now = new Date();
    let startDate, endDate;

    if (filter === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (filter === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else if (filter === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filter === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    let query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId");

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("salesReport", {
      orders,
      filter,
      customStart,
      customEnd,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const exportExcel = async (req, res) => {
  const { filter, startDate: customStart, endDate: customEnd } = req.query;

  let startDate, endDate;
  const now = new Date();

  if (filter === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (filter === "weekly") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  } else if (filter === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (filter === "custom" && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  }

  const query = startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
  const orders = await Order.find(query).populate("userId");

  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 40 },
    { header: "Name", key: "billingName", width: 30 },
    { header: "Date", key: "date", width: 12 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total", key: "total", width: 12 },
    { header: "Payment Status", key: "paymentStatus", width: 20 },
    { header: "Payment Method", key: "paymentMethod", width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true };
  orders.forEach(order => {
    worksheet.addRow({
      orderId: order.orderId,
      billingName: order.userId.name,
      date: order.createdAt.toLocaleDateString(),
      discount: order.couponDiscount,
      total: order.finalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    });
  });

  res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  await workbook.xlsx.write(res);
  res.end();
};

const exportPDF = async (req, res) => {
  try {
    const { filter, startDate: customStart, endDate: customEnd } = req.query;

    let startDate, endDate;
    const now = new Date();

    if (filter === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (filter === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else if (filter === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filter === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    const query = startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const orders = await Order.find(query).populate("userId");

    const totalSales = orders.length;
    const totalSalesAmount = orders.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + order.couponDiscount, 0);

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set headers for the PDF response
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Generate the PDF content
    generateHeader(doc);
    generateReportSummary(doc, { filter, totalSales, totalSalesAmount, totalDiscount });
    generateOrdersTable(doc, orders);
    generateFooter(doc);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

function generateHeader(doc) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Zuka E-Commerce", 50, 45)
    .fontSize(10)
    .text("Zuka E-Commerce", 200, 50, { align: "right" })
    .text("123 E-Commerce Lane", 200, 65, { align: "right" })
    .text("Calicut, Kerala, India", 200, 80, { align: "right" })
    .moveDown();
}

function generateReportSummary(doc, { filter, totalSales, totalSalesAmount, totalDiscount }) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Sales Report", 50, 150);

  generateHr(doc, 175);

  const summaryTop = 190;

  doc
    .fontSize(10)
    .text("Filter:", 50, summaryTop)
    .font("Helvetica-Bold")
    .text(filter, 150, summaryTop)
    .font("Helvetica")
    .text("Date Generated:", 50, summaryTop + 15)
    .text(new Date().toLocaleString(), 150, summaryTop + 15)
    .text("Total Sales:", 50, summaryTop + 30)
    .text(totalSales, 150, summaryTop + 30)
    .text("Total Sales Amount:", 50, summaryTop + 45)
    .text(`₹${totalSalesAmount.toFixed(2)}/-`, 150, summaryTop + 45)
    .text("Total Discount:", 50, summaryTop + 60)
    .text(`₹${totalDiscount.toFixed(2)}/-`, 150, summaryTop + 60);

  generateHr(doc, 260);
}

function generateOrdersTable(doc, orders) {
  const tableTop = 280;

  doc.font("Helvetica-Bold");
  generateTableRow(doc, tableTop, "#", "Order ID", "User", "Discount", "Total", "Date");
  generateHr(doc, tableTop + 20);
  doc.font("Helvetica");

  let position = tableTop + 30;

  orders.forEach((order, index) => {
    generateTableRow(
      doc,
      position,
      index + 1,
      order._id,
      order.userId.name || "N/A",
      `₹${order.couponDiscount.toFixed(2)}`,
      `₹${order.finalAmount.toFixed(2)}`,
      new Date(order.createdAt).toLocaleDateString()
    );

    position += 30;

    if (position > doc.page.height - 50) {
      doc.addPage();
      position = 50;
    }
  });
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Generated by Zuka E-Commerce | © " + new Date().getFullYear(),
      50,
      780,
      { align: "center", width: 500 }
    );
}

function generateTableRow(doc, y, col1, col2, col3, col4, col5, col6) {
  doc
    .fontSize(10)
    .text(col1, 50, y)
    .text(col2, 100, y, { width: 90, ellipsis: true })
    .text(col3, 200, y, { width: 90, ellipsis: true })
    .text(col4, 300, y, { width: 60, align: "right" })
    .text(col5, 400, y, { width: 60, align: "right" })
    .text(col6, 500, y, { width: 60, align: "right" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}





module.exports = {
  loadSalesReportPage,
  exportExcel,   // Add exportExcel function to exports
  exportPDF,     // Add exportPDF function to exports
};
