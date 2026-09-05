const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({

    app: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "App",
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    username: {
        type: String,
        required: true
    },

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    comment: {
        type: String,
        required: true,
        trim: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Review", reviewSchema);