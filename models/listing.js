const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    image: { url: String, filename: String },
    price: Number,
    side: String,
    location: String,
    country: String,
    rooms: Number, // Available rooms
    initialRooms: Number, // Store initial room count for reset
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    bookings: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
    owner: { type: Schema.Types.ObjectId, ref: "User" }
});

// Middleware to delete associated reviews when listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

// Function to reset available rooms
listingSchema.statics.resetRooms = async function () {
    const listings = await this.find();
    for (let listing of listings) {
        listing.rooms = listing.initialRooms;
        await listing.save();
    }
    console.log("All listings' room counts have been reset!");
};

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;

// Schedule the reset function to run every week
const scheduleResetRooms = () => {
    setInterval(async () => {
        console.log("Running weekly room reset...");
        await Listing.resetRooms();
    }, 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
};

// Start the reset scheduler when the app runs
scheduleResetRooms();
