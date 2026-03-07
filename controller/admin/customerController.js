const logger = require('../../helpers/logger');
const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
  try {
    let search = '';
    if (req.query.search) {
      search = req.query.search;

    }
    let page = 1;
    if (req.query.page) {
      page = parseInt(req.query.page);
    }
    const limit = 3;
    const userData = await User.find({
      isAdmin: false,
      $or: [
      { name: { $regex: ".*" + search + ".*" } },
      { email: { $regex: ".*" + search + ".*" } }]

    }).
    limit(limit * 1).
    skip((page - 1) * limit).
    exec();

    const count = await User.find({
      isAdmin: false,
      $or: [
      { name: { $regex: ".*" + search + ".*" } },
      { email: { $regex: ".*" + search + ".*" } }]

    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render('customer', {
      userData,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    logger.error("error in customer page", error);
  }
};

const blockUser = async (req, res) => {
  try {
    let userId = req.params.id;
    await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
    res.status(200).json({ success: true, message: 'User blocked' });
  } catch (error) {
    logger.error("error in block user", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const unBlockUser = async (req, res) => {
  try {
    let userId = req.params.id;
    await User.updateOne({ _id: userId }, { $set: { isBlocked: false } });
    res.status(200).json({ success: true, message: 'User unblocked' });
  } catch (error) {
    logger.error("error in unBlock user", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  customerInfo,
  blockUser,
  unBlockUser
};