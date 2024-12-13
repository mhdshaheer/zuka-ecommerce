const loadSalesReportPage = async (req,res)=>{
    try {
        res.render('salesReport');
    } catch (error) {
        console.log(error)
    }
}

module.exports ={
    loadSalesReportPage
}