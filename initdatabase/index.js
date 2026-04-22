const mongoose=require("mongoose");
const initdata=require("./data.js");
const Listing=require("../models/listing.js")//access of listing.js


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

const initdb=async ()=>{
    await Listing.deleteMany();                                                                   
    initdata.data=initdata.data.map((obj)=>({...obj,owner:"6798d1cc454626f3a1adebd3",rooms:10}));//create new array initdata.data and store old object as (...obj)and added owner id
    // initside.data=initside.data.map((obj)=>({...obj,}))
    await Listing.insertMany(initdata.data);//data from data.js,initdata from top at initiallization
    console.log("data inserted"); 
};
initdb();