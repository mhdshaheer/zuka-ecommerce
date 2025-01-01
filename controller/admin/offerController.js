const Offer = require('../../models/offerSchema')

const loadOfferPage = async (req,res)=>{
    try {
        res.render('offer');
    } catch (error) {
        res.redirect("/admin/login")
        console.log(error)
    }
}

module.exports = {
    loadOfferPage
}