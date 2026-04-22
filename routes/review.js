const express = require('express');
const router = express.Router({mergeParams:true});
const wrapasync=require("../utils/wrapasync.js");
const ExpressError=require("../utils/ExpressError.js");
const {reviewschema}=require("../scehma.js");
const Listing=require("../models/listing.js");
const Review =require("../models/review.js");//access of review.js
const { islogedin,isReviewAuthor } = require('../middleware.js');
const reviewcontroller=require("../controllers/reviews..js");

//serverside validation for review
const validateReview =(req,res,next)=>{
    let {error}=reviewschema.validate(req.body);
    
    if(error){
        let errorMsg=error.details.map((el)=>el.message).join(" ");
        throw new  ExpressError(404,errorMsg);
    }
    else{
        next();
    }
};



//adding review
router.post("/listings/:id/reviews",islogedin,validateReview,wrapasync(reviewcontroller.addnewreview));


//deleting review
router.delete("/listings/:id/reviews/:reviewId",isReviewAuthor,islogedin,wrapasync(reviewcontroller.deletereview));

module.exports = router; // Export the router directly
