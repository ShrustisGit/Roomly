const Review =require("../models/review");
const Listing=require("../models/listing");

module.exports.addnewreview=async(req,res)=>{
    let listing=await Listing.findById(req.params.id);
    let newReview= new Review(req.body.review);//store at backend
    newReview.author=req.user._id;//review only login person
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success","Review Added!");
    res.redirect(`/listings/${listing._id}`);
    };

    
module.exports.deletereview=async(req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","Review Deleted!");
    res.redirect(`/listings/${id}`);
};