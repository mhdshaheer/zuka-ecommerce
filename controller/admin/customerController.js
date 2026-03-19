const logger = require('../../helpers/logger');
const User = require('../../models/userSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const constants = require('../../helpers/constants');

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 10;
    
    // Escape special regex characters to prevent crashes
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Using $ne: true is safer as it includes both false and undefined/null values
    const filter = {
      isAdmin: { $ne: true },
      $or: [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ]
    };

    const userData = await User.find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(filter);
    const totalPages = Math.ceil(count / limit);

    if (req.query.ajax === 'true') {
      return res.json({
        userData,
        currentPage: page,
        totalPages,
        search
      });
    }

    res.render('customer', {
      userData,
      currentPage: page,
      totalPages,
      search: search
    });

  } catch (error) {
    logger.error("CRITICAL ERROR in customerInfo controller:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR || 500).json({ 
      success: false, 
      message: "Server query failed", 
      error: error.toString() 
    });
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