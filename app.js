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

app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/payment", paymentRouter);

app.use((req, res) => {
  res.render('page_404');
});

app.listen(process.env.PORT || 5000, () => {
  logger.info(`Server running on port ${process.env.PORT || 5000}`);
});



module.exports = app;