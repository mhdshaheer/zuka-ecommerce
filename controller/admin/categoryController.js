const logger = require('../../helpers/logger');
const constants = require('../../helpers/constants');
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const httpStatusCode = require('../../helpers/httpStatusCode');


const categoryInfo = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({}).
    sort({ createdAt: -1 }).
    skip(skip).
    limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render('category', {
      categoryData,
      currentPage: page,
      totalPages,
      totalCategories
    });

  } catch (error) {
    logger.error('error in admin category page...', error);
    res.redirect('/admin/admin-error');
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingCategory = await Category.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } });
    if (existingCategory) {
      return res.status(httpStatusCode.CONFLICT).json({ error: constants.MSG_CATEGORY_ALREADY_EXISTS });
    }
    const newCategory = new Category({
      name,
      description
    });
    await newCategory.save();
    return res.status(httpStatusCode.OK).json({ message: constants.MSG_CATEGORY_ADDED_SUCCESSFULLY, category: newCategory });

  } catch (error) {
    logger.error("add category error", error);
    return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ error: constants.MSG_INTERNAL_SERVER_ERROR_HAI });
  }
};




const addOffer = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { newPrice } = req.body;
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: newPrice } });
    const products = await Product.find({ category: categoryId });

    for (const product of products) {
      const offerPrice = product.regularPrice * ((100 - newPrice) / 100);
      await Product.updateOne(
        { _id: product._id },
        { $set: { offerPrice: offerPrice } }
      );
    }
    res.status(httpStatusCode.CREATED).json({ success: true, message: constants.MSG_OFFER_ADDED_SUCCESSFULLY });
  } catch (error) {
    logger.error("Error in add category offer", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_FAILED_TO_ADD_OFFER, error: err });
  }
};

const removeOffer = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: 0 } });

    //up
    const products = await Product.find({ category: categoryId });
    for (const product of products) {
      const offerPrice = 0;
      await Product.updateOne(
        { _id: product._id },
        { $set: { offerPrice: offerPrice } }
      );
    }
    res.status(httpStatusCode.CREATED).json({ success: true, message: constants.MSG_OFFER_IS_REMOVED_SUCCESSFULLY });
  } catch (error) {
    logger.error("Error in removing category offer", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: true, message: constants.MSG_ERROR_IN_REMOVING_OFFER });
  }
};

const editCategory = async (req, res) => {
  try {

    const { name, description, isListed } = req.body;
    const categoryId = req.params.id;

    let updatedFields = { isListed };
    if (name !== undefined && name.trim() !== '') updatedFields.name = name;
    if (description !== undefined && description.trim() !== '') updatedFields.description = description;

    const updateCategory = await Category.findOneAndUpdate({ _id: categoryId }, updatedFields, { new: true });

    if (!updateCategory) {
      return res.status(httpStatusCode.NOT_FOUND).json({ message: constants.MSG_CATEGORY_NOT_FOUND });
    }
    res.status(httpStatusCode.CREATED).json({ message: constants.MSG_EDIT_SUCCESSFULL, category: updateCategory });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: constants.MSG_FAILED_TO_UPDATE_CATEGORY, error });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  addOffer,
  removeOffer,
  editCategory
};