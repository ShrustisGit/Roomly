const User=require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


module.exports.rendersignupform=(req,res)=>{
    res.render("users/signup.ejs")
};

module.exports.signuproute=async(req,res)=>{
    try{
    let {username ,email, password}=req.body;
    const newUser=new User({email,username});
    const registeredUser=await User.register(newUser,password);
    console.log(registeredUser);
    req.login(registeredUser,(err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","Welcome to Wanderlust");
        res.redirect("/listings");
        
    })
    }catch(error){
        req.flash("error",error.message);
        res.redirect("/signup");
}
    
};

module.exports.renderloginform=(req,res)=>{
    res.render("users/login.ejs")
};

module.exports.login=async(req,res)=>{//passport.authenticate is used to verify that user is exists or not
    req.flash("success","Welcome to Wanderlust");
    let redirectUrl=res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout=(req,res,next)=>{
    req.logOut((err)=>{
    if(err){
        return next(err);
    }
    req.flash("success","you are logedOut!");
    res.redirect("/listings");
})
};


// Render Forgot Password Form
module.exports.renderForgotPasswordForm = (req, res) => {
    res.render("users/forgot-password.ejs");
};

// Handle Forgot Password Request
module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash("error", "No account found with that email.");
            return res.redirect("/forgot-password");
        }

        // Generate a 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // Code expires in 10 minutes
        await user.save();

          // Log the reset code in the console for testing
          //console.log(`Reset Code for ${user.email}: ${resetCode}`);

        // Send email with verification code
        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${resetCode}\nThis code is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        req.flash("success", "A verification code has been sent to your email.");
        res.redirect("/verify-code");
    } catch (error) {
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect("/forgot-password");
    }
};

// Render Code Verification Form
module.exports.renderVerifyCodeForm = (req, res) => {
    res.render("users/verify-code.ejs");
};

// Handle Code Verification
module.exports.verifyCode = async (req, res) => {
    try {
        const { email, resetCode } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.resetCode !== resetCode || user.resetCodeExpires < Date.now()) {
            req.flash("error", "Invalid or expired verification code.");
            return res.redirect("/verify-code");
        }

        req.session.resetEmail = user.email; // Store email in session to use in password reset
        req.flash("success", "Code verified. Set a new password.");
        res.redirect("/reset-password");
    } catch (error) {
        req.flash("error", "Something went wrong.");
        res.redirect("/verify-code");
    }
};

// Render Reset Password Form
module.exports.renderResetPasswordForm = (req, res) => {
    if (!req.session.resetEmail) {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/forgot-password");
    }
    res.render("users/reset-password.ejs");
};

// Handle Password Reset
module.exports.resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.resetEmail;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/forgot-password");
        }

        await user.setPassword(password);
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        await user.save();
        req.session.resetEmail = null; // Clear session

        req.flash("success", "Password successfully reset. Please log in.");
        res.redirect("/login");
    } catch (error) {
        req.flash("error", "Something went wrong.");
        res.redirect("/reset-password");
    }
};


module.exports.resetroute=(req, res) => {
    res.render("users/resetlogin.ejs");
};

module.exports.resetpassroute = async (req, res) => {
    const { username, newPassword } = req.body;
    
    try {
        // Ensure the user is logged in
        if (!req.isAuthenticated()) {
            req.flash("error", "You must be logged in to reset your password.");
            return res.redirect("/login");
        }

        const user = await User.findOne({ username });
        if (!user) {
            req.flash("error", "User not found!");
            return res.redirect("/resetlogin");
        }

        // Ensure only the logged-in user can change their own password
        if (req.user._id.toString() !== user._id.toString()) {
            req.flash("error", "Unauthorized: You can only reset your own password.");
            return res.redirect("/resetlogin");
        }

        // Use setPassword to hash and update the password
        await user.setPassword(newPassword);
        await user.save();
        
        req.flash("success", "Password successfully reset. Please log in.");
        res.redirect("/login");
    } catch (error) {
        req.flash("error", error.message);
        res.redirect("/resetlogin");
    }
};
