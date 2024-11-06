const express = require('express')
const User = require('../../models/userSchema');

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

const signup= async(req,res)=>{
    const {name,email,password,confirmPassword}=req.body;
    try {
        const newUser = new User({name,email,password,confirmPassword});
        console.log(newUser)
        await newUser.save();
        console.log('successfully added to database')
        return res.redirect('/signup')


    } catch (error) {
        console.log(error)
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