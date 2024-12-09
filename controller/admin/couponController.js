
const loadCouponPage = async (req,res)=>{
    try {
        res.render('coupon')
    } catch (error) {
            console.log(error)
    }
}

module.exports ={
    loadCouponPage
}