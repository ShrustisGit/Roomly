const express = require('express');
const router = express.Router();
const User=require("../models/user.js");
const wrapasync = require('../utils/wrapasync.js');
const passport = require('passport');
const {saveRedirectUrl}=require("../middleware.js");
const usercontroller=require("../controllers/users.js");


router.get("/signup",usercontroller.rendersignupform);
router.post("/signup",wrapasync(usercontroller.signuproute));
//log in
router.get("/login",usercontroller.renderloginform);

router.post("/login",saveRedirectUrl,
    passport.authenticate("local", { failureRedirect: '/login',failureFlash:true }),usercontroller.login);

//logout
router.get("/logout",usercontroller.logout);


router.get("/forgot-password", usercontroller.renderForgotPasswordForm);
router.post("/forgot-password", usercontroller.forgotPassword);

router.get("/verify-code", usercontroller.renderVerifyCodeForm);
router.post("/verify-code", usercontroller.verifyCode);

router.get("/reset-password", usercontroller.renderResetPasswordForm);
router.post("/reset-password", usercontroller.resetPassword);


// Render Reset Password Form
router.get("/resetlogin",usercontroller.resetroute );

// Handle Reset Password Logic
router.post("/resetlogin",usercontroller.resetpassroute );

module.exports = router; 