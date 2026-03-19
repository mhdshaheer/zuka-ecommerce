const logger = require('../../helpers/logger');
const Order = require('../../models/orderSchema');
const exceljs = require('exceljs');
const PDFDocument = require("pdfkit");
const httpStatusCode = require('../../helpers/httpStatusCode');
const constants = require('../../helpers/constants');

const getOrderUserName = async (order) => {
  if (order.userId && order.userId.name) {
    return order.userId.name;
  }
  try {
    const Address = require('../../models/addressSchema');
    const addressDoc = await Address.findOne(
      { 'address._id': order.address },
      { 'address.$': 1 }
    );
    if (addressDoc && addressDoc.address && addressDoc.address.length > 0) {
      return addressDoc.address[0].name;
    }
  } catch (error) {
    logger.error("Error fetching fallback name for sales report:", error);
  }
  return "Deleted User";
};

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

    const ordersList = await Order.find(query).
    sort({ createdAt: -1 }).
    skip(skip).
    limit(limit).
    populate("userId");

    const ordersWithFallback = await Promise.all(ordersList.map(async (order) => {
      const orderObj = order.toObject();
      orderObj.fallbackName = await getOrderUserName(order);
      return orderObj;
    }));

    const totalOrdersCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    const allFilteredOrders = await Order.find(query);
    const totalSales = allFilteredOrders.length;
    const totalRevenue = allFilteredOrders.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
    const totalDiscount = allFilteredOrders.reduce((acc, curr) => acc + (curr.couponDiscount || 0), 0);

    res.render("salesReport", {
      orders: ordersWithFallback,
      filter,
      customStart,
      customEnd,
      currentPage,
      totalPages,
      totalSales,
      totalRevenue,
      totalDiscount
    });
  } catch (error) {
    logger.error("Sales report page error:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
  }
};

const exportExcel = async (req, res) => {
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
    const orders = await Order.find(query).populate("userId").sort({ createdAt: -1 });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 40 },
      { header: "Name", key: "billingName", width: 30 },
      { header: "Date", key: "date", width: 12 },
      { header: "Discount", key: "discount", width: 12 },
      { header: "Total", key: "total", width: 12 },
      { header: "Payment Status", key: "paymentStatus", width: 20 },
      { header: "Payment Method", key: "paymentMethod", width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    for (const order of orders) {
      worksheet.addRow({
        orderId: order.orderId,
        billingName: await getOrderUserName(order),
        date: order.createdAt.toLocaleDateString(),
        discount: order.couponDiscount || 0,
        total: order.finalAmount || 0,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod
      });
    }

    res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export Excel error:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
  }
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
    const orders = await Order.find(query).populate("userId").sort({ createdAt: -1 });

    const totalSales = orders.length;
    const totalSalesAmount = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    generateHeader(doc);
    generateReportSummary(doc, { filter: filter || 'Overall', totalSales, totalSalesAmount, totalDiscount });
    
    // Process names for PDF
    const ordersWithFallback = await Promise.all(orders.map(async (order) => {
        const orderObj = order.toObject();
        orderObj.fallbackName = await getOrderUserName(order);
        return orderObj;
    }));
    
    generateOrdersTable(doc, ordersWithFallback);
    generateFooter(doc);

    doc.end();
  } catch (error) {
    logger.error("Error generating PDF:", error);
    if (!res.headersSent) {
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
    }
  }
};

function generateHeader(doc) {
  doc.
  fillColor("#444444").
  fontSize(20).
  text("Zuka E-Commerce", 50, 45).
  fontSize(10).
  text("Zuka E-Commerce", 200, 50, { align: "right" }).
  text("123 E-Commerce Lane", 200, 65, { align: "right" }).
  text("Calicut, Kerala, India", 200, 80, { align: "right" }).
  moveDown();
}

function generateReportSummary(doc, { filter, totalSales, totalSalesAmount, totalDiscount }) {
  doc.
  fillColor("#444444").
  fontSize(20).
  text("Sales Report", 50, 150);

  generateHr(doc, 175);

  const summaryTop = 190;

  doc.
  fontSize(10).
  text("Filter:", 50, summaryTop).
  font("Helvetica-Bold").
  text((filter || 'Overall').toUpperCase(), 150, summaryTop).
  font("Helvetica").
  text("Date Generated:", 50, summaryTop + 15).
  text(new Date().toLocaleString(), 150, summaryTop + 15).
  text("Total Sales Count:", 50, summaryTop + 30).
  text(totalSales.toString(), 150, summaryTop + 30).
  text("Total Revenue:", 50, summaryTop + 45).
  text(`₹${totalSalesAmount.toFixed(2)}/-`, 150, summaryTop + 45).
  text("Total Discount Applied:", 50, summaryTop + 60).
  text(`₹${totalDiscount.toFixed(2)}/-`, 150, summaryTop + 60);

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
      order.orderId || "N/A",
      order.fallbackName || "Deleted User",
      `₹${(order.couponDiscount || 0).toFixed(2)}`,
      `₹${(order.finalAmount || 0).toFixed(2)}`,
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
  doc.
  fontSize(10).
  text(
    "Generated by Zuka E-Commerce | © " + new Date().getFullYear(),
    50,
    780,
    { align: "center", width: 500 }
  );
}

function generateTableRow(doc, y, col1, col2, col3, col4, col5, col6) {
  doc.
  fontSize(10).
  text(col1, 50, y).
  text(col2, 100, y, { width: 90, ellipsis: true }).
  text(col3, 200, y, { width: 90, ellipsis: true }).
  text(col4, 300, y, { width: 60, align: "right" }).
  text(col5, 400, y, { width: 60, align: "right" }).
  text(col6, 500, y, { width: 60, align: "right" });
}

function generateHr(doc, y) {
  doc.
  strokeColor("#aaaaaa").
  lineWidth(1).
  moveTo(50, y).
  lineTo(550, y).
  stroke();
}

module.exports = {
  loadSalesReportPage,
  exportExcel,
  exportPDF
};