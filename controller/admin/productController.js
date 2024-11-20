const Category = require('../../models/categorySchema')
const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema')


const loadProduct = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true }, { name: 1 })
        res.render('add product/productAdd', { categories })

    } catch (error) {
        console.log('error in page load', error);

    }
}

const addProduct = async (req, res) => {
    try {
        console.log(req.files); // Files uploaded to Cloudinary

        const imageUrls = req.files.map(file => file.path); // Cloudinary URLs
        const categoryId = await Category.findOne({name:req.body.category},{_id:1})
        let totalStocks = 0

        console.log(imageUrls)
        // console.log(categoryName)
        const variantArray =JSON.parse(JSON.stringify(req.body.variant))
        const variants = variantArray.map((size,index)=>{
            totalStocks=totalStocks+Number(variantArray[index].stock)
            return {
                size:variantArray[index].size,
                price:Number(variantArray[index].price),
                stock:Number(variantArray[index].stock)
            }
        })
        console.log('stock:',totalStocks)
        console.log(variants)

        const newProduct = new Product({
            productName: req.body.name,
            description: req.body.description,
            category: categoryId,
            // subcategory: req.body.subcategory,
            totalStocks: totalStocks,
            regularPrice: req.body.price,
            offerPrice: req.body.offerPrice,
            color: req.body.colour,
            taxId: req.body.taxId,
            images: imageUrls,
            variant:variants
        });

        await newProduct.save();
        console.log("product added successfully")
        res.status(200).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Error adding product', error });
    }
};



module.exports = {
    loadProduct,
    addProduct
}