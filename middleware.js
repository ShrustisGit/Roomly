const ExpressError=require("./utils/ExpressError.js");
const {listingSchema,reviewschema}=require("./scehma.js");
const Review =require("./models/review.js");


module.exports.islogedin=(req,res,next)=>{
    console.log(req.user);
    if(!req.isAuthenticated()){
        //post login page
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","You must have logged in to add list!");
        return res.redirect("/login");
    }
    next();
};
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to view bookings.");
        return res.redirect("/login");
    }
    next();
};


module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
};

module.exports.isReviewAuthor=async(req,res,next)=>{
    let {id,reviewId}=req.params;
    let review=await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currentUser._id)){
        req.flash("error","You are not an Author");
        return res.redirect(`/listings/${id}`);
    }
    next();
};
