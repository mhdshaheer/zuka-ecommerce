# Zuka Ecommerce 🛒

Zuka Ecommerce is a feature-rich, full-stack e-commerce platform built with modern web technologies. It provides a seamless shopping experience for users and a robust management dashboard for administrators.

## 🚀 Features

### For Customers
- **Authentication**: Secure login/signup system with Google OAuth and OTP verification via Resend.
- **Product Discovery**: Browse products by category, search functionality, and filtering.
- **Cart & Wishlist**: Manage items you want to buy now or save for later.
- **Wallet System**: Integrated wallet for easy payments and refunds.
- **Coupons & Offers**: Apply discount coupons and enjoy product/category-specific offers.
- **Checkout & Payments**: Secure checkout process with Razorpay integration and Wallet payment options.
- **Order Management**: Track order history and download PDF invoices.
- **Profile Management**: Manage personal information, multiple addresses, and passwords.

### For Administrators
- **Dashboard**: Comprehensive overview of sales statistics and business performance.
- **User Management**: Monitor and manage customer accounts (block/unblock functionality).
- **Category Management**: Create and organize product categories with dedicated offer management.
- **Product Management**: Complete CRUD operations for products, including multi-image handling (Cloudinary) and variant management.
- **Order Tracking**: Manage customer orders and update delivery statuses.
- **Coupon System**: Create and manage promotional coupons.
- **Sales Reports**: Generate and export detailed sales reports in Excel and PDF formats.

## 🛠️ Tech Stack

- **Backend**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (using [Mongoose](https://mongoosejs.com/))
- **Templating Engine**: [EJS](https://ejs.co/)
- **Authentication**: [Passport.js](http://www.passportjs.org/) (Local & Google OAuth)
- **Payment Gateway**: [Razorpay](https://razorpay.com/)
- **Cloud Storage**: [Cloudinary](https://cloudinary.com/) (for product/banner images)
- **Email Service**: [Resend](https://resend.com/) (for OTPs and notifications)
- **Reporting**: [ExcelJS](https://github.com/exceljs/exceljs), [PDFKit](https://pdfkit.org/), [Puppeteer](https://pptr.dev/)
- **Logging**: [Winston](https://github.com/winstonjs/winston)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community)

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mhdshaheer/zuka-ecommerce.git
   cd zuka-ecommerce
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add the following configurations:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   
   # Passport Google Auth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Razorpay
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   
   # Resend Email
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Run the application**:
   ```bash
   # For development
   npm run dev
   
   # For production
   npm start
   ```

## 📂 Project Structure

```text
├── config/             # Configuration files (DB, Passport)
├── controller/         # Request handlers (Admin & User)
├── helpers/            # Utility functions and helper modules
├── middlewares/        # Custom Express middlewares
├── models/             # Mongoose schemas/models
├── public/             # Static files (CSS, JS, Images)
├── routes/             # Route definitions
├── views/              # EJS templates (Admin & User)
├── app.js              # Application entry point
└── package.json        # Dependencies and scripts
```

## 📄 License

This project is licensed under the ISC License.
