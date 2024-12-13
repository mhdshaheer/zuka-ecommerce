const Offer = require('../../models/offerSchema')

const loadOfferPage = async (req,res)=>{
    try {
        res.render('offer');
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    loadOfferPage
}