const express = require('express')
const User = require('../../models/userSchema');
const nodemailer= require('nodemailer')
const env= require("dotenv").config()

//===================================================

const loadSignup = async(req,res)=>{
    try {
        res.render('signup')
    } catch (error) {
        console.log('sign up page not found');
        res.status(500).send('Server error')
    }
}
const loadLogin = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log('Login page not found');
        res.status(500).send('Server error')
    }
}

// const signup= async(req,res)=>{
//     const {name,email,password,confirmPassword}=req.body;
//     try {
//         const newUser = new User({name,email,password,confirmPassword});
//         console.log(newUser)
//         await newUser.save();
//         console.log('successfully added to database')
//         return res.redirect('/signup')


//     } catch (error) {
//         console.log(error)
//     }
// }

function generateOtp(){
    return Math.floor(100000 + Math.random()*90000).toString();
}
async function sendEmailVerify(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP : ${otp}</b>`
        });

        return info.accepted.length>0


    } catch (error) {
        console.log("Error Sending mail",error);
        return false;
    }
}

const signup = async(req,res)=>{
    try {
        const {name,email,password,confirmPassword}=req.body;
        if(password!=confirmPassword){
            return res.render("signup",{message:"passwords do not match"});

        }

        const finduser = await User.findOne({email});
        if(finduser){
            return res.render("signup",{message:"User with this email already exist"})
        }
        const otp = generateOtp()

        const emailSent = await sendEmailVerify(email,otp);
        if(!emailSent){
            return res.json("email error");
        }
        req.session.userOtp = otp;
        req.session.userData = {name,email,password};

        res.render("verify-otp");
        console.log("otp sent",otp);
     
    } catch (error) {
        console.error("signup error",error);
        res.redirect('/page_404');
    }
}



const loadHomePage = async (req,res)=>{
    try {
        
        return res.render('home');

    } catch (error) {
        console.log('Home page not found!');
        res.status(500).send('Server error')
    }

}
const pageNotFound = async (req,res)=>{
    try {
        res.render('page_404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    loadSignup,
    loadLogin,
    loadHomePage,
    pageNotFound,
    signup

}