const Listing=require("../models/listing.js");//access of listing.js
const Booking=require("../models/booking.js");
const User=require("../models/user.js");
const PDFDocument = require("pdfkit");
const path=require("path");
const fs = require('fs');
const QRCode = require("qrcode");

// Function to calculate next Sunday at midnight
function getNextSundayMidnight() {
    let now = new Date();
    let nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay())); // Move to next Sunday
    nextSunday.setHours(0, 0, 0, 0); // Set to midnight
    return nextSunday.getTime();
}

let resetTime = getNextSundayMidnight(); // Store the next reset time

// Weekly reset interval
setInterval(async () => {
    const now = Date.now();
    if (now >= resetTime) {
        await Listing.resetRooms();
        resetTime = getNextSundayMidnight(); // Update reset time
    }
}, 1000 * 60 * 60); // Check every hour

module.exports.index=async(req,res)=>{
    
    let resetTime = getNextSundayMidnight(); 
    let page = parseInt(req.query.page) || 1;
    let limit = 18;
    let skip = (page - 1) * limit;
    let totalCards = await Listing.countDocuments();
    let totalPages = Math.ceil(totalCards / limit);
    // let allListing=await Listing.find({}).skip(skip).limit(limit);
    // Fetch listings and populate reviews
    let allListing = await Listing.find({})
        .skip(skip)
        .limit(limit)
        .populate({
            path: "reviews",
            select: "rating", // Only fetch the rating field
        });

    // Calculate average rating for each listing
    allListing = allListing.map((listing) => {
        let totalRating = listing.reviews.reduce((sum, review) => sum + review.rating, 0);
        listing.avgRating = listing.reviews.length > 0 ? (totalRating / listing.reviews.length).toFixed(1) : "No Reviews";
        return listing;
    });
    
    res.render("listings/index.ejs",{allListing,totalPages,page,resetTime });
};

module.exports.rendernewlist=(req,res)=>{
    //console.log(req.User);
    res.render("listings/new.ejs");
};
module.exports.createroute=async(req,res,next)=>{
    let url =req.file.path;
    let filename=req.file.filename;
    const newListing=new Listing(req.body.listing);
    newListing.owner=req.user._id;//to add new list using owner id
    newListing.image={url,filename};
    await newListing.save();
    req.flash("success","Added a new List!");
    res.redirect("/listings");
    };
   

module.exports.editroute=async(req,res)=>{
    //if editing list then past info is present on editing page
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing){
        req.flash("error","List you want to edit is not found!");
        res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url; 
    originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250");    
    res.render("listings/edit.ejs",{listing,originalImageUrl});
};


module.exports.updatelising=async(req,res)=>{
    // if(!req.body.listing){
    //     throw new ExpressError(400,"Send valid data")
    // }
    let {id}=req.params;
    let listing =await Listing.findByIdAndUpdate(id,{...req.body.listing});//...used to decounstruct body
    //for uploading file
    let url =req.file.path;
    let filename=req.file.filename;
    listing.image={url,filename};
    await listing.save();
    req.flash("success","List Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.deletelisting=async(req,res)=>{
    let {id}=req.params;
    let deleting=await Listing.findByIdAndDelete(id);
    console.log(deleting);
    req.flash("success","List Deleted!");
    res.redirect("/listings");
};
module.exports.booingroute = async (req, res) => {
    if (!req.user) {
        req.flash("error", "You must be logged in to view bookings.");
        return res.redirect("/login");
    }

    let listing = await Listing.findById(req.params.id).populate({
        path: "bookings",
        populate: { path: "author", select: "username" } // Ensure author is populated
    });

    // Filter only the logged-in user's bookings
    let userBookings = listing.bookings.filter(booking => 
        booking.author && booking.author.username === req.user.username
    );

    res.render("listings/booking.ejs", { listing, currentUser: req.user, userBookings });
};

module.exports.bookedroute = async (req, res) => {
    if (!req.user) {
        req.flash("error", "You must be logged in to book.");
        return res.redirect("/login");
    }

    let listing = await Listing.findById(req.params.id);
    let { noofrooms } = req.body.booking;

    if (!listing || noofrooms <= 0 || noofrooms > listing.rooms) {
        req.flash("error", "Invalid room request!");
        return res.redirect(`/listings/${req.params.id}/booking`);
    }

    let newBooking = new Booking(req.body.booking);
    newBooking.author = req.user._id; // Store ObjectId, NOT username
    listing.bookings.push(newBooking);
    listing.rooms -= noofrooms;
    await newBooking.save();
    await listing.save();
    req.flash("success", "Booked successfully!");
    res.redirect("/listings");
};


// module.exports.cancelBooking = async (req, res) => {
    
//     const { id } = req.params; // Get the booking ID from the request
//     await Booking.findByIdAndDelete(id); // Delete the booking from the database
//     req.flash("success", "Booking Cancelled!");
//     res.redirect("/listings");

// };


module.exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params; // Get booking ID from request

        // Fetch booking details
        const booking = await Booking.findById(id).populate("listingid");

        if (!booking) {
            req.flash("error", "Booking not found!");
            return res.redirect("/listings");
        }

        // Fetch the associated listing
        const listing = await Listing.findById(booking.listingid);

        if (!listing) {
            req.flash("error", "Associated listing not found!");
            return res.redirect("/listings");
        }

        // Restore the rooms in the listing
        listing.rooms += booking.noofrooms;
        
        // Remove the booking reference from the listing
        listing.bookings = listing.bookings.filter(bid => bid.toString() !== id);

        await listing.save();

        // Now delete the booking
        await Booking.findByIdAndDelete(id);

        req.flash("success", "Opps,Booking Cancelled...!");
        res.redirect("/listings");

    } catch (error) {
        console.error("Error canceling booking:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/listings");
    }
};


module.exports.downloadBookingPDF = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch booking details
        const booking = await Booking.findById(id).populate("listingid").populate("author");

        if (!booking) {
            req.flash("error", "Booking not found!");
            return res.redirect("/listings");
        }

         // Generate QR Code with booking status
         const qrCodeData = `Booking ID: ${booking._id}\nStatus: ${booking.status}`;
         const qrCodePath = path.join(__dirname, `../public/qrcode_${id}.png`);
         await QRCode.toFile(qrCodePath, qrCodeData);

        // Create a new PDF document
        const doc = new PDFDocument();
        const filePath = path.join(__dirname, `../public/booking_${id}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        

        // Add booking details to the PDF
        doc.fontSize(18).text("Booking Details", { align: "center" }).moveDown();
        // doc.fontSize(12).text(`Booking ID: ${booking._id}`);
        // doc.text(`User: ${booking.author.username} (${booking.author.email})`);
        doc.text(`Booking for: ${booking.hotelname}`);
        doc.text(`USerName: ${booking.name}`);
        doc.text(`Checkin: ${booking.checkin.toDateString()}`);
        doc.text(`CheckOut: ${booking.checkout.toDateString()}`);
        doc.text(`Location: ${booking.location}`);
        doc.text(`Country: ${booking.country}`);
        doc.text(`Number of Rooms: ${booking.noofrooms}`);
        doc.text(`Total Price: ${booking.totalPrice} INR`);
        doc.text(`Status: ${booking.status}`);


        
        // Generate QR Code
        const qrCodeURL = `http://localhost:8080/bookings/verify/${booking._id}`;
        const qrCodePaths = path.join(__dirname, `../public/qrcode_${id}.png`);

        await QRCode.toFile(qrCodePaths, qrCodeURL);

        // doc.text(`Booking Date: ${booking.createdAt.toDateString()}`);
        // Add QR Code to the PDF
        doc.image(qrCodePath, { fit: [150, 150], align: "center" }).moveDown();
        // doc.text("Scan this QR code to check booking status", { align: "center" });


        doc.end();

        // Send the PDF file as a response when it's ready
        stream.on("finish", () => {
            res.download(filePath, `Booking_${id}.pdf`, (err) => {
                if (err) {
                    console.error("Error downloading PDF:", err);
                    res.status(500).send("Error generating PDF");
                }
                fs.unlinkSync(filePath); // Delete the file after sending
                fs.unlinkSync(qrCodePath); // Delete the QR code image after sending
            });
        });

    } catch (error) {
        console.error("Error generating PDF:", error);
        req.flash("error", "Something went wrong while generating the PDF.");
        res.redirect("/listings");
    }
};


module.exports.showbooking = async (req, res) => {
    let {id}=req.params;
    let listing = await Listing.findById(id);
    if (!req.user) {
        req.flash("error", "You must be logged in to view your bookings.");
        return res.redirect("/login");
    }

    // Find all bookings for the logged-in user
    let userBookings = await Booking.find({ author: req.user._id }).populate("author").populate("listing");

    res.render("listings/bookes.ejs", { userBookings, currentUser: req.user,listing });
};

module.exports.searchroute=async(req,res)=>{
    // let {id}=req.params;
    // const listing=await Listing.findById(id);
    
    let allListing=await Listing.find({});
    
    let { searchTearm , minPrice, maxPrice  } = req.body; // Get search term from user input
    let filter = {};

    if (searchTearm) {
        const searchSpecialChar = searchTearm.replace(/\s+/g, "\\s+");

        filter.$or = [
            { location: { $regex: new RegExp(searchSpecialChar, "i") } },
            { country: { $regex: new RegExp(searchSpecialChar, "i") } },
        ];
    }
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    try {
    let listingss = await Listing.find(filter);
    res.render("listings/search.ejs", { allListing, listingss });
} catch (error) {
        res.status(500).send("Error fetching products");
    }
};

// module.exports.bookedroute=(req,res)=>{
//     //console.log(req.User);
//     res.render("listings/booked.ejs");
// };

module.exports.showroute=async(req,res)=>{
    let resetTime = getNextSundayMidnight(); 
    let {id}=req.params;
    let allListing=await Listing.find({});
    const listing=await Listing.findById(id).
    populate({
        path:"reviews",
        populate:{
            path:"author"
        },
    }).populate("owner");
    
    if(!listing){
        req.flash("error","List you serach is not found!");
        res.redirect("/listings");
    }
    const relatedListings = await Listing.find({
        location: listing.location,
        _id: { $ne: listing._id },
      }); // Limit to 4 related listings
      
    res.render("listings/show.ejs",{listing,relatedListings, currentUser: req.user,resetTime });
};