const mongoose = require('mongoose');
 
const schemaA = new mongoose.Schema({
    title:String,
    topic:String,
    products:[],
});

module.exports = mongoose.model('item',schemaA);
