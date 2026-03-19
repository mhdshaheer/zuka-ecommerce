const logger = require('../../helpers/logger');
const User = require('../../models/userSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const constants = require('../../helpers/constants');

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
    const limit = 10;
    const userData = await User.find({
      isAdmin: false,
      $or: [
      { name: { $regex: ".*" + search + ".*", $options: 'i' } },
      { email: { $regex: ".*" + search + ".*", $options: 'i' } }]

    }).
    limit(limit * 1).
    skip((page - 1) * limit).
    exec();

    const count = await User.find({
      isAdmin: false,
      $or: [
      { name: { $regex: ".*" + search + ".*", $options: 'i' } },
      { email: { $regex: ".*" + search + ".*", $options: 'i' } }]

    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render('customer', {
      userData,
      currentPage: page,
      totalPages,
      search: search
    });

  } catch (error) {
    logger.error("error in customer page", error);
  }
};

const blockUser = async (req, res) => {
  try {
    let userId = req.params.id;
    await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_USER_BLOCKED });
  } catch (error) {
    logger.error("error in block user", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const unBlockUser = async (req, res) => {
  try {
    let userId = req.params.id;
    await User.updateOne({ _id: userId }, { $set: { isBlocked: false } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_USER_UNBLOCKED });
  } catch (error) {
    logger.error("error in unBlock user", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

module.exports = {
  customerInfo,
  blockUser,
  unBlockUser
};