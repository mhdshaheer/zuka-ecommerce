const express = require('express')
const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require("dotenv").config()

//===================================================

const loadSignup = async (req, res) => {
    try {
        res.render('signup')
    } catch (error) {
        console.log('sign up page not found');
        res.status(500).send('Server error')
    }
}
const loadLogin = async (req, res) => {
    try {
        if(!req.session.user){
            res.render('login')
        }else{
            res.redirect('/');
        }

    } catch (error) {
        console.log('Login page not found');
        res.redirect('/page_404')
    }
}


function generateOtp() {
    return Math.floor(100000 + Math.random() * 90000).toString();
}

const resentOtp = async (req, res) => {
; 
    try {
 
        const { email } = req?.session?.userData;
        
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        let otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sendEmailVerify(email,otp);
        console.log(emailSent);
        
        if(emailSent){
            console.log("Resent otp",otp);
            res.status(200).json({success:true,message:"otp resent successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resent otp,Please try again"})
        }

    } catch (error) {
        console.error("error resenting otp");
        res.status(500).json({success:false,message:"Internal server error,please try again"})
    }
}

async function sendEmailVerify(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        // Send the email
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "otp test",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,

        });



        return info.accepted.length > 0


    } catch (error) {
        console.log("Error Sending mail", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        if (password != confirmPassword) {
            return res.render("signup", { message: "passwords do not match" });

        }

        const finduser = await User.findOne({ email });
        if (finduser) {
            return res.render("signup", { message: "User with this email already exist" })
        }
        const otp = generateOtp()

        const emailSent = await sendEmailVerify(email, otp);
        if (!emailSent) {
            return res.json("email error");
        }
        req.session.userOtp = otp;
        req.session.userData = { name, email, password };
console.log(req.session.userData);

        res.render("verify-otp");
        console.log("otp sent", otp);

    } catch (error) {
        console.error("signup error", error);
        res.redirect('/pageNotFound');
    }
}

const securePassword = async (password) => {
    try {
        const passHash = await bcrypt.hash(password, 10);
        return passHash;
    } catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("otp is:", otp);
        if (otp == req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash
            });
            await saveUserData.save();

            console.log("Added to database...")

            req.session.user = saveUserData._id;

            res.json({ success: true, redirectUrl: "/" });
            console.log("redirected to home ")
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP , Please try again" })
        }
    } catch (error) {
        console.error("Error verifying OTP ", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
}



const loadHomePage = async (req, res) => {
    try {

        return res.render('home');

    } catch (error) {
        console.log('Home page not found!');
        res.status(500).send('Server error')
    }

}
const pageNotFound = async (req, res) => {
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
    verifyOtp,
    resentOtp,
    signup

}