// Filename: model/Goal.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const goalSchema = new Schema({
    goalName:{
        type:String,
        required:true
    },
    goalAmount: {
        type: Number,
        required: true
    },
    chooseDate: {
        type: Date,
        default: Date.now
    },
    completed: {
        type: Boolean,
        default: false 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model("Goal", goalSchema);
