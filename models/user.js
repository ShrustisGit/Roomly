const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userschema=new Schema({
    email:{
        type:String,
        required:true
    },
    username:String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    resetCode: String,  // Stores the verification code
    resetCodeExpires: Date // Expiry time for the code
});

userschema.plugin(passportLocalMongoose,);  


module.exports = mongoose.model('User', userschema);