const express = require('express');
const app = express();
const path = require('path')
const env = require("dotenv").config();
const userRouter = require('./routes/userRouter')
const db = require('./config/db');
db();


app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use(express.static('public'));
app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])

app.use("/",userRouter)


const PORT = 5000 || process.env.PORT
app.listen(PORT, ()=>{
    console.log(`server is running on ${PORT}`)
})


module.exports = app;