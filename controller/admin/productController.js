const loadProduct = async (req,res)=>{
    try {
        res.render('add product/productAdd')
    } catch (error) {
        console.log('error in page load',error);

    }
}
const addProduct = async (req,res)=>{
    try {
        console.log(req.body)
    } catch (error) {
        
    }
}


module.exports = {
    loadProduct,
    addProduct
}