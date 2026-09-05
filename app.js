const mongoose = require("mongoose");

const appSchema = new mongoose.Schema({


    logo: {
    type: String,
    required: true
},

    name: {
        type: String,
        required: true,
        trim: true
    },

    developer: {
        type: String,
        required: true,
        trim: true
    },

    version: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    apkFile: {
        type: String,
        required: true
    },

    screenshots: {
        type: [String],
        default: []
    },

    downloads: {
        type: Number,
        default: 0
    },

    rating: {
        type: Number,
        default: 0
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("App", appSchema);