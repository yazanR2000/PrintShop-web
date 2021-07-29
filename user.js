const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
var findOrCreate = require('mongoose-findorcreate');
var cartSchema = new mongoose.Schema({
    _id : String,
    image: {},
    size: String,
    color: String,
    quantity: Number,
    price: String,
    path: String
});
var profilePic = new mongoose.Schema({
        img:
        {
            data: Buffer,
            contentType: String
        }
});
var userSchema = new mongoose.Schema({
    email: String,
    firstname:String,
    lastname:String,
    phoneNumber:String,
    googleId: String,
    facebookId:String,
    cart:[cartSchema],
    cartTotal:{type : Number, default : 0},
    oreder:[],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

module.exports = mongoose.model('user',userSchema);