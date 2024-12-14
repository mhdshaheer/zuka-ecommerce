const Order = require('../../models/orderSchema');
const exceljs = require('exceljs'); 
const puppeteer = require('puppeteer');

const loadSalesReportPage = async (req, res) => {
  try {
    const { filter, page = 1 } = req.query;
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
    }

    // Build the query
    let query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Fetch filtered and paginated orders
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId");

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);


    res.render("salesReport", {
      orders,
      filter,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


const exportExcel = async (req, res) => {
  const { filter } = req.query;

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
  }

  const query = startDate && endDate ? { createdAt: { $gte: startDate, $lt: endDate } } : {};
  const orders = await Order.find(query).populate("userId");

  // Create Excel file
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 40 },
    { header: 'Name', key: 'billingName', width: 30 },
    { header: 'Date', key: 'date' , width: 12},
    { header: 'Discount', key: 'discount' , width: 12 ,alignment: { horizontal: 'left' }},
    { header: 'Total', key: 'total', width: 12 ,alignment: { horizontal: 'left' } },
    { header: 'Payment Status', key: 'paymentStatus', width: 20 },
    { header: 'Payment Method', key: 'paymentMethod' , width: 20 },
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach(column => {
    column.alignment = { horizontal: 'left' };
  });
  orders.forEach(order => {
    worksheet.addRow({
      orderId: order.orderId,
      billingName: order.userId.name,
      date: order.createdAt.toLocaleDateString(),
      discount:order.couponDiscount,
      total: order.finalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    });
  });

  res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await workbook.xlsx.write(res);
  res.end();
};

// Function to export data to PDF
const exportPDF = async (req, res) => {
    try {
      const { filter } = req.query;
  
      // Fetch filtered orders
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
      }
  
      const query = startDate && endDate ? { createdAt: { $gte: startDate, $lt: endDate } } : {};
      const orders = await Order.find(query).populate("userId");
  
      // Generate HTML content for PDF
      const htmlContent = await new Promise((resolve, reject) => {
        res.render('pdfTemplate', { orders, filter }, (err, html) => {
          if (err) {
            reject(err);
          } else {
            resolve(html);
          }
        });
      });
  
      // Initialize Puppeteer and generate PDF from HTML content
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
  
      const pdfBuffer = await page.pdf({ format: 'A4' });
  
      // Set response headers to trigger download
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      
      // Send the PDF file as the response
      res.end(pdfBuffer);
  
      // Close the browser after generating the PDF
      await browser.close();
  
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  

module.exports = {
  loadSalesReportPage,
  exportExcel,   // Add exportExcel function to exports
  exportPDF,     // Add exportPDF function to exports
};

  
  
  

// module.exports ={
//     loadSalesReportPage
// }