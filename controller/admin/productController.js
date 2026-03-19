const logger = require('../../helpers/logger');
const constants = require('../../helpers/constants');
const Category = require('../../models/categorySchema');
const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const HttpStatusCode = require('../../helpers/httpStatusCode');


const loadProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true }, { name: 1 });
    res.render('add product/productAdd', { categories });

  } catch (error) {
    res.redirect("/admin/login");
    logger.error('error in page load', error);

  }
};

const addProduct = async (req, res) => {
  try {
    const imageUrls = req.files.map((file) => file.path); // Cloudinary URLs
    const categoryId = await Category.findOne({ name: req.body.category }, { _id: 1 });
    if (!categoryId) {
      return res.status(httpStatusCode.BAD_REQUEST).json({ message: "Invalid Category Selected" });
    }
    let totalStocks = 0;

    let variantArray;
    if (typeof req.body.variant === 'string') {
      variantArray = JSON.parse(req.body.variant);
    } else {
      variantArray = req.body.variant;
    }

    const variants = variantArray.map((v) => {
      totalStocks += Number(v.stock);
      return {
        size: v.size,
        price: Number(v.price),
        stock: Number(v.stock)
      };
    });

    const newProduct = new Product({
      productName: req.body.name,
      description: req.body.description,
      category: categoryId._id,
      totalStocks: totalStocks,
      regularPrice: req.body.price,
      offerPrice: req.body.offerPrice,
      color: req.body.colour,
      images: imageUrls,
      variant: variants
    });

    await newProduct.save();
    res.status(httpStatusCode.OK).json({ message: constants.MSG_PRODUCT_ADDED_SUCCESSFULLY });
  } catch (error) {
    logger.error('Error adding product:', error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: constants.MSG_ERROR_ADDING_PRODUCT, error });
  }
};

const productList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const query = search ? { productName: { $regex: search, $options: "i" } } : {};

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query).
    populate('category').
    sort({ createdAt: -1 }).
    skip(skip).
    limit(limit);
    const category = await Category.find();

    if (req.query.ajax === 'true') {
      return res.json({
        products,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit
      });
    }

    res.render('add product/productList', {
      products,
      category,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      limit
    });
  } catch (error) {
    logger.error("Error in product list", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("Server error while fetching products");
  }

};


const editProduct = async (req, res) => {
  try {
    const { productName, description, category, regularPrice, offerPrice, color } = req.body;
    const productId = req.params.id;

    let updatedFields = {};
    const categoryFound = await Category.findOne({ name: category }, { _id: 1 });
    if (productName !== undefined && productName.trim() !== '') updatedFields.productName = productName;
    if (description !== undefined && description.trim() !== '') updatedFields.description = description;
    if (categoryFound) updatedFields.category = categoryFound._id;
    if (regularPrice !== undefined && regularPrice.trim() !== '') updatedFields.regularPrice = Number(regularPrice);
    if (offerPrice !== undefined && offerPrice.trim() !== '') updatedFields.offerPrice = Number(regularPrice) * ((100 - Number(offerPrice)) / 100);
    if (color !== undefined && color.trim() !== '') updatedFields.color = color;


    const updateProduct = await Product.findOneAndUpdate({ _id: productId }, updatedFields, { new: true });
    if (!updateProduct) {
      return res.status(httpStatusCode.NOT_FOUND).json({ message: constants.MSG_PRODUCT_NOT_FOUND });
    }
    res.status(httpStatusCode.CREATED).json({ message: constants.MSG_PRODUCT_EDIT_SUCCESSFULL });

  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: constants.MSG_FAILED_TO_UPDATE_PRODUCT, error });
  }
};

const blockProduct = async (req, res) => {
  try {
    let productId = req.params.id;
    await Product.updateOne({ _id: productId }, { $set: { isBlocked: true } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_PRODUCT_BLOCKED });
  } catch (error) {
    logger.error("error in block product", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};
const unBlockProduct = async (req, res) => {
  try {
    let productId = req.params.id;
    await Product.updateOne({ _id: productId }, { $set: { isBlocked: false } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_PRODUCT_UNBLOCKED });
  } catch (error) {
    logger.error("error in unblock product", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const updateImages = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(httpStatusCode.NOT_FOUND).json({ message: constants.MSG_PRODUCT_NOT_FOUND });
    }

    let currentImages = [...product.images];
    const newImages = req.files;
    let indexes = req.body.indexes;

    if (!Array.isArray(indexes)) {
      indexes = [indexes];
    }

    newImages.forEach((file, i) => {
      const targetIndex = parseInt(indexes[i]);
      if (!isNaN(targetIndex)) {
        currentImages[targetIndex] = file.path;
      }
    });

    const updateImg = await Product.updateOne({ _id: productId }, {
      images: currentImages
    });

    res.status(httpStatusCode.OK).json({ message: constants.MSG_PRODUCT_UPDATED });

  } catch (error) {
    logger.error("error in update images", error);
  }
};



const editVariantLoad = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findOne({ _id: productId });
    res.render('add product/editVariant', {
      product
    });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const variantUpdate = async (req, res) => {
  try {
    const variantId = req.params.variantId;
    const { variantPrice, variantStock } = req.body;

    await Product.updateOne({ 'variant._id': variantId }, { $set: { 'variant.$.stock': variantStock, 'variant.$.price': variantPrice } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_SUCCESS });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const blockVariant = async (req, res) => {
  try {
    const variantId = req.params.variantId;
    await Product.updateOne({ 'variant._id': variantId }, { $set: { 'variant.$.isBlocked': true } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_PRODUCT_BLOCKED });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};
const unblockVariant = async (req, res) => {
  try {
    const variantId = req.params.variantId;
    await Product.updateOne({ 'variant._id': variantId }, { $set: { 'variant.$.isBlocked': false } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_PRODUCT_UNBLOCKED });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const addVariant = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { variantSize, variantPrice, variantStock } = req.body;
    const sizeFound = await Product.findOne({ _id: productId, 'variant.size': variantSize });
    if (sizeFound) {
      return res.status(HttpStatusCode.FORBIDDEN).json({ message: `Size : ${variantSize} already exists for this product.` });
    }
    const newVariant = {
      stock: variantStock,
      price: variantPrice,
      size: variantSize
    };
    await Product.updateOne({ _id: productId }, { $push: { variant: newVariant } });
    const product = await Product.findOne({ _id: productId });
    res.status(HttpStatusCode.OK).json({ product });
  } catch (error) {
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
module.exports = {
  loadProduct,
  addProduct,
  productList,
  editProduct,
  blockProduct,
  unBlockProduct,
  updateImages,

  editVariantLoad,
  variantUpdate,
  blockVariant,
  unblockVariant,
  addVariant
};