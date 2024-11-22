const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {

    if (req.session.admin) {
        try {
            let search = '';
            if (req.query.search) {
                search = req.query.search;
                console.log(search)
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
                    { email: { $regex: ".*" + search + ".*" } },
                ]
            })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            const count = await User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: ".*" + search + ".*" } },
                    { email: { $regex: ".*" + search + ".*" } },
                ]
            }).countDocuments();

            const totalPages = Math.ceil(count / limit);

            res.render('customer', {
                userData,
                currentPage: page,
                totalPages,
            });

        } catch (error) {
            console.log("error in customer page", error);
        }
    } else {
        res.redirect('/admin/login')
    }
}

const blockUser = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect(`/admin/users`);
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in block user", error)
    }
}

const unBlockUser = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in unBlock user", error)
    }
}

module.exports = {
    customerInfo,
    blockUser,
    unBlockUser
}