const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.GOOGLE_CALLBACK_URL
},
async (accessToken,refreshToken,profile,done)=>{
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } else {
            // Check if user already exists with the same email
            let existingEmailUser = await User.findOne({ email: profile.emails[0].value });
            if (existingEmailUser) {
                // Link Google ID to existing email account
                existingEmailUser.googleId = profile.id;
                await existingEmailUser.save();
                return done(null, existingEmailUser);
            } else {
                // Create new user if email not found
                user = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                });
                await user.save();
                return done(null, user);
            }
        }
    } catch (error) {
        return done(error,null)
    }
}
));

passport.serializeUser((user,done)=>{
    done(null,user.id);
});

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user);
    })
    .catch(err=>{
        done(err,null)
    })
});

module.exports = passport;