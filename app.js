const express = require('express');
const app = express();
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require('path');
const morgan = require('morgan')
const passport = require("./config/passport")
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter')
const adminRouter = require("./routes/adminRouter");
const paymentRouter = require('./routes/paymentRouter')
const db = require('./config/db');
const axios = require('axios');
const nocache = require('nocache')

db();
app.use(nocache())
app.use(morgan('tiny'))
app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use(express.static('public'));
app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secret:false,
        httponly:true,
        maxAge:72*60*60*1000
    }
}))


app.use(passport.initialize());
app.use(passport.session())

app.use("/",userRouter);
app.use("/admin",adminRouter);
app.use("/payment",paymentRouter);


const PORT = 5000 || process.env.PORT
app.listen(PORT, ()=>{
    console.log(`server is running on ${PORT}`)
})


module.exports = app;