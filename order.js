const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    userID: String,
    date: String,
    FNAME: String,
    LNAME: String,
    PN: String,
    city: String,
    order: [],
});

module.exports = mongoose.model('order', orderSchema);