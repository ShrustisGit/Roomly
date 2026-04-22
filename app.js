if(process.env.NODE_ENV != "production"){//it is for this project to not send .env info for production
    require('dotenv').config();
}
//console.log(process.env.SECRET); // remove this after you've confirmed it is working

const express=require("express");
const app=express();
const mongoose=require("mongoose");
const port=8080;
const Listing=require("./models/listing.js");//access of listing.js
const methodOverride=require("method-override");
const ejsmate=require("ejs-mate");
const wrapasync=require("./utils/wrapasync.js");
const ExpressError=require("./utils/ExpressError.js");
const {listingSchema,reviewschema}=require("./scehma.js");
const Review =require("./models/review.js");//access of review.js
//const listings=require("./routes/listing.js");
const reviewsRoute=require("./routes/review.js");
const userRoute=require("./routes/user.js");
const session=require("express-session");
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const passportLocalMongoose = require('passport-local-mongoose');
const User=require("./models/user.js");
const Booking=require("./models/booking.js");
const {islogedin,isReviewAuthor}=require("./middleware.js");
const {isLoggedIn}=require("./middleware.js");
const listingcontroller=require("./controllers/listing.js");
const multer  = require("multer");
const{storage}=require("./cloudconfig.js");
const upload = multer({ storage });
const bodyParser = require('body-parser');


const PDFDocument = require('pdfkit');
const fs = require('fs');
const QRCode = require("qrcode");
//to connect view folder to app.js
const path=require("path");
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
//to parse data which came in request 
app.use(express.urlencoded({extended:true}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,"/public")));
//ejsmate 
app.engine("ejs",ejsmate);
//for search items

app.use(express.json());

// Ensure "downloads" directory exists
const downloadsDir = path.join(__dirname, "../downloads");
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true }); // Create folder if missing
}


const sessionOptions={
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,//1week
        maxage:7*24*60*60*1000,
        httpOnly:true
    }
};

//create a seesion id
app.use(session(sessionOptions));
app.use(flash());

//passport for authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.successmsg=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currentUser=req.user;//used in navbar for login logout verifying
    next();
});


//connect to db
const Mongourl="mongodb://127.0.0.1:27017/wanderlust";
main().then(()=>{
    console.log("connected");
}).catch((err)=>{
    console.log(err);
});
async function main(){
    await mongoose.connect(Mongourl);
};
//connection end

// app.use("/",(req,res)=>{
//     res.send("root route");
// });

//serverside validation for creating listing
const validatelisting =(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    if(error){
        let errorMsg=error.details.map((el)=>el.message).join(",");
        throw new  ExpressError(404,errorMsg);
    }
    else{
        next();
    }
};

//login till days
const MongoStore = require("connect-mongo");

app.use(session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: "mongodb://127.0.0.1:27017/wanderlust",
        ttl: 7 * 24 * 60 * 60 // Session expires in 7 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true
    }
}));


app.use(
    session({
        secret: "yourSecretKey",
        resave: false,
        saveUninitialized: false,
    })
);


//app.use("/listings",listings); not working...
app.use("/",reviewsRoute);
app.use("/",userRoute);

// index Route//views/listing/index.ejs access
app.get("/listings",wrapasync(listingcontroller.index));


//create route with error handling
app.post("/listings",islogedin,upload.single("listing[image]"),wrapasync(listingcontroller.createroute));

//upload.single('listing[image]')//used for muter
// app.post("/listings",upload.single('listing[image]'),(req,res)=>{
//     res.send(req.file);
// });
//("/listings",islogedin,validatelisting,wrapasync(listingcontroller.createroute));

//new route
app.get("/listings/new",islogedin,listingcontroller.rendernewlist);


//Edit Route
app.get("/listings/:id/edit",islogedin,wrapasync(listingcontroller.editroute));

// update route
app.put("/listings/:id",islogedin,upload.single("listing[image]"),wrapasync(listingcontroller.updatelising));

//Delete route
app.delete("/listings/:id",islogedin,wrapasync(listingcontroller.deletelisting));

//booking
app.get("/listings/:id/bookings",listingcontroller.booingroute);

//create booking
app.post("/listings/:id",listingcontroller.bookedroute);

//show ur booking
app.get("/listings/bookes",isLoggedIn,listingcontroller.showbooking);

app.get("/bookings/:id/download", listingcontroller.downloadBookingPDF);

app.get("/bookings/verify/:id", async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.render("listings/verifycancel");
        }

        const statusMessage = booking.status === "active" 
            ? "Your booking is ACTIVE" 
            : "Your booking has been CANCELED";

        res.render("listings/verify",{statusMessage});
    } catch (error) {
        console.error(error);
        res.send("<h2>Error verifying booking</h2>");
    }
});





// Cancel a booking
app.post("/bookings/:id/cancel", listingcontroller.cancelBooking);

//search route
app.post("/search",listingcontroller.searchroute);

//show route
app.get("/listings/:id",listingcontroller.showroute);

//error handling for new listing
app.all("*", (req, res, next) =>{
    next (new ExpressError(404, "Page Not Found!"));
});
    
app.use((err, req, res, next) =>{
let { statusCode = 500, message = "Something went wrong!" }= err;
res.status(statusCode).render("error.ejs" ,{message});
//res.status(statusCode).send(message);
});

app.listen(port,(req,res)=>{
    console.log("working");
});