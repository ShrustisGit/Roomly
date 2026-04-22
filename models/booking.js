const mongoose=require("mongoose");
const { checkout } = require("../routes/review");
const Schema=mongoose.Schema;

const bookingschema=new Schema({
    hotelname:"String",
    listingid:"String",
    name:"String",
    noofrooms:Number,
    checkin:{
        type:Date,
    },
    checkout:{
        type:Date,
    },
    totalPrice: Number,
    location:"String",
    country:"String",
    image:"String",
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    status: { type: String, enum: ["active", "canceled"], default: "active" } // Status field
 
});
module.exports=mongoose.model("Booking",bookingschema);
