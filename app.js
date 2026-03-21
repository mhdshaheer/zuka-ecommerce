const express = require('express');
const logger = require('./helpers/logger');
const app = express();
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require('path');
// const morgan = require('morgan')
const passport = require("./config/passport");
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter');
const adminRouter = require("./routes/adminRouter");
const paymentRouter = require('./routes/paymentRouter');
const db = require('./config/db');
const axios = require('axios');
const nocache = require('nocache');

console.log("App initialization started...");
db();
app.set('trust proxy', 1);
app.use(nocache());
// app.use(morgan('tiny'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static('public'));
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo.MongoStore || connectMongo;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
  }
}));



app.use(passport.initialize());
app.use(passport.session());

const Wishlist = require('./models/wishlistSchema');
const Cart = require('./models/cartSchema');

app.use(async (req, res, next) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (user) {
      const [wishlist, cart] = await Promise.all([
        Wishlist.findOne({ userId: user._id }),
        Cart.findOne({ userId: user._id })
      ]);
      res.locals.wishlistCount = wishlist ? wishlist.products.length : 0;
      res.locals.cartCount = cart ? cart.items.length : 0;
      res.locals.wishlistProductIds = wishlist ? wishlist.products.map(p => p.productId.toString()) : [];
    } else {
      res.locals.wishlistCount = 0;
      res.locals.cartCount = 0;
      res.locals.wishlistProductIds = [];
    }
    next();
  } catch (error) {
    logger.error("Error in header data middleware:", error);
    res.locals.wishlistCount = 0;
    res.locals.cartCount = 0;
    res.locals.wishlistProductIds = [];
    next();
  }
});

app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/payment", paymentRouter);

app.use((req, res) => {
  res.render('page_404');
});

app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log(`Server is listening on 0.0.0.0:${process.env.PORT || 5000}`);
  logger.info(`Server running on port ${process.env.PORT || 5000}`);
});



module.exports = app;