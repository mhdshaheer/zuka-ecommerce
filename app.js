const express = require('express');
const app = express();
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require('path');
const morgan = require('morgan')
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter')
const db = require('./config/db');
db();

app.use(morgan('common'))
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

app.use("/",userRouter)


const PORT = 5000 || process.env.PORT
app.listen(PORT, ()=>{
    console.log(`server is running on ${PORT}`)
})


module.exports = app;