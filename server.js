const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("./models/user");
const App = require("./models/app");
const Review = require("./models/review");

dotenv.config();

const server = express();


// ======================================================
// BASIC SERVER SETUP
// ======================================================

server.use(cors());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));


// ======================================================
// UPLOAD DIRECTORIES
// ======================================================

const uploadDir = path.join(__dirname, "uploads");

const apkDir = path.join(uploadDir, "apks");
const logoDir = path.join(uploadDir, "logos");
const screenshotDir = path.join(uploadDir, "screenshots");


// Create folders automatically

fs.mkdirSync(apkDir, { recursive: true });
fs.mkdirSync(logoDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });


// ======================================================
// SERVE UPLOADED FILES
// ======================================================

server.use(
    "/uploads",
    express.static(uploadDir)
);


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        // APP LOGO
        if (file.fieldname === "app-logo") {

            cb(null, logoDir);

        }

        // APK
        else if (file.fieldname === "app-file") {

            cb(null, apkDir);

        }

        // SCREENSHOTS
        else if (
            file.fieldname === "screenshots[]" ||
            file.fieldname === "screenshots"
        ) {

            cb(null, screenshotDir);

        }

        // UNKNOWN FIELD
        else {

            cb(
                new Error(
                    `Unexpected file field: ${file.fieldname}`
                )
            );

        }

    },


    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000000) +
            extension;

        cb(null, uniqueName);

    }

});


// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = function (req, file, cb) {

    // ==================================================
    // APP LOGO
    // ==================================================

    if (file.fieldname === "app-logo") {

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "App logo must be PNG, JPEG, or WEBP."
                )
            );

        }

    }


    // ==================================================
    // APK
    // ==================================================

    else if (file.fieldname === "app-file") {

        const extension =
            path.extname(file.originalname).toLowerCase();

        if (extension === ".apk") {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only APK files are allowed."
                )
            );

        }

    }


    // ==================================================
    // SCREENSHOTS
    // ==================================================

    else if (
        file.fieldname === "screenshots[]" ||
        file.fieldname === "screenshots"
    ) {

        if (file.mimetype.startsWith("image/")) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Screenshots must be image files."
                )
            );

        }

    }


    // ==================================================
    // UNKNOWN FIELD
    // ==================================================

    else {

        cb(
            new Error(
                `Unexpected file field: ${file.fieldname}`
            )
        );

    }

};


// ======================================================
// MULTER
// ======================================================

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {

        // 100 MB maximum per file
        fileSize: 100 * 1024 * 1024

    }

});


// ======================================================
// MONGODB
// ======================================================

mongoose
    .connect(process.env.MONGODB_URI)
    .then(function () {

        console.log("MongoDB connected successfully");

    })
    .catch(function (error) {

        console.error(
            "MongoDB connection error:",
            error
        );

    });


// ======================================================
// SIGN UP
// ======================================================

server.post("/api/signup", async function (req, res) {

    try {

        const {
            username,
            email,
            password
        } = req.body;


        if (!username || !email || !password) {

            return res.status(400).json({

                message:
                    "Please fill in all fields."

            });

        }


        const existingUser =
            await User.findOne({

                $or: [

                    {
                        username: username
                    },

                    {
                        email:
                            email.toLowerCase()
                    }

                ]

            });


        if (existingUser) {

            return res.status(400).json({

                message:
                    "Username or email already exists."

            });

        }


        const hashedPassword =
            await bcrypt.hash(password, 10);


        const newUser = new User({

            username: username,

            email:
                email.toLowerCase(),

            password:
                hashedPassword

        });


        await newUser.save();


        res.status(201).json({

            message:
                "Account created successfully."

        });


    } catch (error) {

        console.error(
            "Signup error:",
            error
        );


        res.status(500).json({

            message:
                "Server error."

        });

    }

});


// ======================================================
// LOGIN
// ======================================================

server.post("/api/login", async function (req, res) {

    try {

        const {
            username,
            password
        } = req.body;


        if (!username || !password) {

            return res.status(400).json({

                message:
                    "Please enter your username/email and password."

            });

        }


        const user =
            await User.findOne({

                $or: [

                    {
                        username: username
                    },

                    {
                        email:
                            username.toLowerCase()
                    }

                ]

            });


        if (!user) {

            return res.status(401).json({

                message:
                    "Invalid username/email or password."

            });

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                message:
                    "Invalid username/email or password."

            });

        }


        const token =
            jwt.sign(

                {

                    userId:
                        user._id,

                    username:
                        user.username,

                    email:
                        user.email

                },

                process.env.JWT_SECRET,

                {

                    expiresIn:
                        "30d"

                }

            );


        res.json({

            message:
                "Login successful.",

            token:
                token,

            user: {

                username:
                    user.username,

                email:
                    user.email

            }

        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({

            message:
                "Server error."

        });

    }

});


// ======================================================
// VERIFY LOGIN
// ======================================================

server.get("/api/me", async function (req, res) {

    try {

        const authHeader =
            req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({

                loggedIn: false,

                message:
                    "Not logged in."

            });

        }


        const token =
            authHeader.split(" ")[1];


        if (!token) {

            return res.status(401).json({

                loggedIn: false,

                message:
                    "No token provided."

            });

        }


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        const user =
            await User.findById(
                decoded.userId
            ).select("-password");


        if (!user) {

            return res.status(401).json({

                loggedIn: false,

                message:
                    "User no longer exists."

            });

        }


        res.json({

            loggedIn: true,

            user: user

        });


    } catch (error) {

        res.status(401).json({

            loggedIn: false,

            message:
                "Invalid or expired login."

        });

    }

});


// ======================================================
// UPLOAD APP
// ======================================================

server.post(

    "/api/apps",

    upload.fields([

        {
            name: "app-logo",

            maxCount: 1

        },

        {
            name: "app-file",

            maxCount: 1

        },

        {
            name: "screenshots[]",

            maxCount: 5

        }

    ]),


    async function (req, res) {

        try {

            // ==================================================
            // CHECK LOGIN
            // ==================================================

            const authHeader =
                req.headers.authorization;


            if (!authHeader) {

                return res.status(401).json({

                    message:
                        "You must be logged in to upload an app."

                });

            }


            const token =
                authHeader.split(" ")[1];


            if (!token) {

                return res.status(401).json({

                    message:
                        "No token provided."

                });

            }


            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            const user =
                await User.findById(
                    decoded.userId
                );


            if (!user) {

                return res.status(401).json({

                    message:
                        "User not found."

                });

            }


            // ==================================================
            // APP INFORMATION
            // ==================================================

            const name =
                req.body["app-name"];

            const developer =
                req.body["app-developer"];

            const version =
                req.body["app-version"];

            const category =
                req.body["app-category"];

            const description =
                req.body["app-description"];


            if (
                !name ||
                !developer ||
                !version ||
                !category ||
                !description
            ) {

                return res.status(400).json({

                    message:
                        "Please provide all app information."

                });

            }


            // ==================================================
            // CHECK LOGO
            // ==================================================

            if (
                !req.files ||
                !req.files["app-logo"] ||
                req.files["app-logo"].length === 0
            ) {

                return res.status(400).json({

                    message:
                        "Please upload an app logo."

                });

            }


            // ==================================================
            // CHECK APK
            // ==================================================

            if (
                !req.files ||
                !req.files["app-file"] ||
                req.files["app-file"].length === 0
            ) {

                return res.status(400).json({

                    message:
                        "Please upload an APK file."

                });

            }


            const logoFile =
                req.files["app-logo"][0];


            const apkFile =
                req.files["app-file"][0];


            // ==================================================
            // LOGO URL
            // ==================================================

            const logo =
                `/uploads/logos/${logoFile.filename}`;


            // ==================================================
            // APK URL
            // ==================================================

            const apk =
                `/uploads/apks/${apkFile.filename}`;


            // ==================================================
            // SCREENSHOTS
            // ==================================================

            const screenshots = [];


            if (
                req.files["screenshots[]"]
            ) {

                for (
                    const file
                    of req.files["screenshots[]"]
                ) {

                    screenshots.push(

                        `/uploads/screenshots/${file.filename}`

                    );

                }

            }


            // ==================================================
            // CREATE APP
            // ==================================================

            const newApp =
                new App({

                    name:
                        name,

                    developer:
                        developer,

                    version:
                        version,

                    category:
                        category,

                    description:
                        description,

                    logo:
                        logo,

                    apkFile:
                        apk,

                    screenshots:
                        screenshots,

                    uploadedBy:
                        user._id

                });


            await newApp.save();


            // ==================================================
            // RESPONSE
            // ==================================================

            res.status(201).json({

                message:
                    "App uploaded successfully!",

                app:
                    newApp

            });


        } catch (error) {

            console.error(
                "App upload error:",
                error
            );


            if (
                error instanceof multer.MulterError
            ) {

                return res.status(400).json({

                    message:
                        `Upload error: ${error.message}`

                });

            }


            if (error.message) {

                return res.status(400).json({

                    message:
                        error.message

                });

            }


            res.status(500).json({

                message:
                    "Server error."

            });

        }

    }

);


// ======================================================
// GET ALL APPS
// ======================================================

server.get("/api/apps", async function (req, res) {

    try {

        const apps =
            await App.find()
                .sort({
                    createdAt: -1
                });


        res.json({

            apps:
                apps

        });


    } catch (error) {

        console.error(
            "Get apps error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to get apps."

        });

    }

});


// ======================================================
// GET MY APPS
// ======================================================

server.get("/api/apps/my-apps", async function (req, res) {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                message: "Not logged in."
            });

        }

        const token =
            authHeader.split(" ")[1];

        if (!token) {

            return res.status(401).json({
                message: "No token provided."
            });

        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        const apps =
            await App.find({
                uploadedBy: decoded.userId
            }).sort({
                createdAt: -1
            });

        res.json({
            apps: apps
        });

    } catch (error) {

        console.error(
            "Get my apps error:",
            error
        );

        res.status(500).json({
            message: "Failed to get your apps."
        });

    }

});

// ================================
// GET MY REVIEWS
// ================================

server.get("/api/my-reviews", async (req, res) => {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                message: "Not logged in."
            });

        }


        const token =
            authHeader.split(" ")[1];

        if (!token) {

            return res.status(401).json({
                message: "No token provided."
            });

        }


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        const user =
            await User.findById(
                decoded.userId
            );

        if (!user) {

            return res.status(401).json({
                message: "User not found."
            });

        }


        const reviews =
            await Review.find({
                user: user._id
            }).sort({
                createdAt: -1
            });


        res.json({
            reviews: reviews
        });


    } catch (error) {

        console.error(
            "Get my reviews error:",
            error
        );

        res.status(500).json({
            message: "Failed to get your reviews."
        });

    }

});

// ======================================================
// GET ONE APP
// ======================================================

server.get("/api/apps/:id", async function (req, res) {

    try {

        const appData =
            await App.findById(
                req.params.id
            );


        if (!appData) {

            return res.status(404).json({

                message:
                    "App not found."

            });

        }


        // ==================================================
        // GET ACTUAL APK FILE SIZE
        // ==================================================

        let appSize = "Unknown";


        if (appData.apkFile) {

            const apkFilename =
                path.basename(
                    appData.apkFile
                );


            const apkPath =
                path.join(
                    apkDir,
                    apkFilename
                );


            if (fs.existsSync(apkPath)) {

                const stats =
                    fs.statSync(apkPath);


                const sizeInBytes =
                    stats.size;


                const sizeInKB =
                    sizeInBytes / 1024;


                const sizeInMB =
                    sizeInBytes /
                    (1024 * 1024);


                if (sizeInMB >= 1) {

                    appSize =
                        `${sizeInMB.toFixed(1)} MB`;

                } else {

                    appSize =
                        `${sizeInKB.toFixed(1)} KB`;

                }

            }

        }


        // ==================================================
        // SEND APP DATA
        // ==================================================

        res.json({

            app: {

                ...appData.toObject(),

                size:
                    appSize

            }

        });


    } catch (error) {

        console.error(
            "Get app error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to get app."

        });

    }

});

// ======================================================
// DELETE APP
// ======================================================

server.delete("/api/apps/:id", async function (req, res) {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Not logged in."
            });
        }

        const token =
            authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "No token provided."
            });
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        const appData =
            await App.findById(req.params.id);

        if (!appData) {
            return res.status(404).json({
                message: "App not found."
            });
        }

        // Make sure the user owns this app
        if (
            appData.uploadedBy.toString() !==
            decoded.userId.toString()
        ) {
            return res.status(403).json({
                message:
                    "You can only delete your own apps."
            });
        }

        // Delete logo
        if (appData.logo) {

            const logoPath =
                path.join(
                    logoDir,
                    path.basename(appData.logo)
                );

            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
            }
        }

        // Delete APK
        if (appData.apkFile) {

            const apkPath =
                path.join(
                    apkDir,
                    path.basename(appData.apkFile)
                );

            if (fs.existsSync(apkPath)) {
                fs.unlinkSync(apkPath);
            }
        }

        // Delete screenshots
        if (Array.isArray(appData.screenshots)) {

            for (
                const screenshot
                of appData.screenshots
            ) {

                const screenshotPath =
                    path.join(
                        screenshotDir,
                        path.basename(screenshot)
                    );

                if (fs.existsSync(screenshotPath)) {
                    fs.unlinkSync(screenshotPath);
                }

            }
        }

        // Delete reviews belonging to the app
        await Review.deleteMany({
            app: appData._id
        });

        // Delete app from MongoDB
        await App.findByIdAndDelete(
            appData._id
        );

        res.json({
            message:
                "App deleted successfully."
        });

    } catch (error) {

        console.error(
            "Delete app error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to delete app."
        });
    }

});

// ======================================================
// EDIT APP
// ======================================================

server.put(

    "/api/apps/:id",

    upload.fields([

        {
            name: "app-logo",
            maxCount: 1
        },

        {
            name: "app-file",
            maxCount: 1
        },

        {
            name: "screenshots[]",
            maxCount: 5
        }

    ]),

    async function (req, res) {

        try {

            // ==================================================
            // CHECK LOGIN
            // ==================================================

            const authHeader =
                req.headers.authorization;

            if (!authHeader) {

                return res.status(401).json({
                    message: "Not logged in."
                });

            }

            const token =
                authHeader.split(" ")[1];

            if (!token) {

                return res.status(401).json({
                    message: "No token provided."
                });

            }

            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            // ==================================================
            // FIND APP
            // ==================================================

            const appData =
                await App.findById(
                    req.params.id
                );

            if (!appData) {

                return res.status(404).json({
                    message: "App not found."
                });

            }


            // ==================================================
            // CHECK OWNERSHIP
            // ==================================================

            if (
                appData.uploadedBy.toString() !==
                decoded.userId.toString()
            ) {

                return res.status(403).json({

                    message:
                        "You can only edit your own apps."

                });

            }


            // ==================================================
            // GET APP INFORMATION
            // ==================================================

            const name =
                req.body["app-name"];

            const developer =
                req.body["app-developer"];

            const version =
                req.body["app-version"];

            const category =
                req.body["app-category"];

            const description =
                req.body["app-description"];


            if (
                !name ||
                !developer ||
                !version ||
                !category ||
                !description
            ) {

                return res.status(400).json({

                    message:
                        "Please provide all app information."

                });

            }


            // ==================================================
            // UPDATE TEXT INFORMATION
            // ==================================================

            appData.name =
                name;

            appData.developer =
                developer;

            appData.version =
                version;

            appData.category =
                category;

            appData.description =
                description;


            // ==================================================
            // REPLACE LOGO
            // ==================================================

            if (
                req.files &&
                req.files["app-logo"] &&
                req.files["app-logo"].length > 0
            ) {

                const oldLogo =
                    appData.logo;

                const newLogoFile =
                    req.files["app-logo"][0];

                appData.logo =
                    `/uploads/logos/${newLogoFile.filename}`;


                // Delete old logo

                if (oldLogo) {

                    const oldLogoPath =
                        path.join(
                            logoDir,
                            path.basename(oldLogo)
                        );

                    if (
                        fs.existsSync(oldLogoPath)
                    ) {

                        fs.unlinkSync(
                            oldLogoPath
                        );

                    }

                }

            }


            // ==================================================
            // REPLACE APK
            // ==================================================

            if (
                req.files &&
                req.files["app-file"] &&
                req.files["app-file"].length > 0
            ) {

                const oldAPK =
                    appData.apkFile;

                const newAPKFile =
                    req.files["app-file"][0];

                appData.apkFile =
                    `/uploads/apks/${newAPKFile.filename}`;


                // Delete old APK

                if (oldAPK) {

                    const oldAPKPath =
                        path.join(
                            apkDir,
                            path.basename(oldAPK)
                        );

                    if (
                        fs.existsSync(oldAPKPath)
                    ) {

                        fs.unlinkSync(
                            oldAPKPath
                        );

                    }

                }

            }


            // ==================================================
            // REPLACE SCREENSHOTS
            // ==================================================

            if (
                req.files &&
                req.files["screenshots[]"] &&
                req.files["screenshots[]"].length > 0
            ) {

                // Delete old screenshots

                if (
                    Array.isArray(
                        appData.screenshots
                    )
                ) {

                    for (
                        const screenshot
                        of appData.screenshots
                    ) {

                        const oldScreenshotPath =
                            path.join(
                                screenshotDir,
                                path.basename(
                                    screenshot
                                )
                            );

                        if (
                            fs.existsSync(
                                oldScreenshotPath
                            )
                        ) {

                            fs.unlinkSync(
                                oldScreenshotPath
                            );

                        }

                    }

                }


                // Add new screenshots

                const newScreenshots = [];

                for (
                    const file
                    of req.files["screenshots[]"]
                ) {

                    newScreenshots.push(

                        `/uploads/screenshots/${file.filename}`

                    );

                }

                appData.screenshots =
                    newScreenshots;

            }


            // ==================================================
            // SAVE CHANGES
            // ==================================================

            await appData.save();


            // ==================================================
            // RESPONSE
            // ==================================================

            res.json({

                message:
                    "App updated successfully.",

                app:
                    appData

            });


        } catch (error) {

            console.error(
                "Edit app error:",
                error
            );


            if (
                error instanceof multer.MulterError
            ) {

                return res.status(400).json({

                    message:
                        `Upload error: ${error.message}`

                });

            }


            res.status(500).json({

                message:
                    "Failed to update app."

            });

        }

    }

);

// ======================================================
// SUBMIT REVIEW
// ======================================================

server.post(

    "/api/apps/:id/reviews",

    async function (req, res) {

        try {

            const authHeader =
                req.headers.authorization;


            if (!authHeader) {

                return res.status(401).json({

                    message:
                        "You must be logged in to review this app."

                });

            }


            const token =
                authHeader.split(" ")[1];


            if (!token) {

                return res.status(401).json({

                    message:
                        "No token provided."

                });

            }


            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            const user =
                await User.findById(
                    decoded.userId
                );


            if (!user) {

                return res.status(401).json({

                    message:
                        "User not found."

                });

            }


            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(404).json({

                    message:
                        "App not found."

                });

            }


            const {
                rating,
                comment
            } = req.body;


            if (
                rating === undefined ||
                !comment ||
                comment.trim() === ""
            ) {

                return res.status(400).json({

                    message:
                        "Please provide a rating and review."

                });

            }


            const numericRating =
                Number(rating);


            if (
                numericRating < 1 ||
                numericRating > 5
            ) {

                return res.status(400).json({

                    message:
                        "Rating must be between 1 and 5."

                });

            }


            const existingReview =
                await Review.findOne({

                    app:
                        appData._id,

                    user:
                        user._id

                });


            if (existingReview) {

                return res.status(400).json({

                    message:
                        "You have already reviewed this app."

                });

            }


            const review =
                new Review({

                    app:
                        appData._id,

                    user:
                        user._id,

                    username:
                        user.username,

                    rating:
                        numericRating,

                    comment:
                        comment.trim()

                });


            await review.save();


            // ==================================================
            // RECALCULATE RATING
            // ==================================================

            const allReviews =
                await Review.find({

                    app:
                        appData._id

                });


            let totalRating = 0;


            for (
                const currentReview
                of allReviews
            ) {

                totalRating +=
                    currentReview.rating;

            }


            const averageRating =
                totalRating /
                allReviews.length;


            appData.rating =
                Number(
                    averageRating.toFixed(1)
                );


            await appData.save();


            res.status(201).json({

                message:
                    "Review submitted successfully.",

                review:
                    review

            });


        } catch (error) {

            console.error(
                "Review error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to submit review."

            });

        }

    }

);


// ======================================================
// GET REVIEWS
// ======================================================

server.get(

    "/api/apps/:id/reviews",

    async function (req, res) {

        try {

            const reviews =
                await Review.find({

                    app:
                        req.params.id

                }).sort({

                    createdAt:
                        -1

                });


            res.json({

                reviews:
                    reviews

            });


        } catch (error) {

            console.error(
                "Get reviews error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to get reviews."

            });

        }

    }

);


// ======================================================
// DOWNLOAD APP
// ======================================================

server.get(

    "/api/apps/:id/download",

    async function (req, res) {

        try {

            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(404).json({

                    message:
                        "App not found."

                });

            }


            // ==================================================
            // GET APK FILENAME
            // ==================================================

            const apkFilename =
                path.basename(
                    appData.apkFile
                );


            const filePath =
                path.join(
                    apkDir,
                    apkFilename
                );


            // ==================================================
            // CHECK FILE
            // ==================================================

            if (!fs.existsSync(filePath)) {

                console.error(
                    "APK not found:",
                    filePath
                );


                return res.status(404).json({

                    message:
                        "APK file not found."

                });

            }


            // ==================================================
            // INCREASE DOWNLOAD COUNT
            // ==================================================

           await App.findByIdAndUpdate(
    req.params.id,
    {
        $inc: {
            downloads: 1
        }
    }
);

            // ==================================================
            // DOWNLOAD
            // ==================================================

            res.download(
                filePath,
                apkFilename,
                function (error) {

                    if (error) {

                        console.error(
                            "File download error:",
                            error
                        );

                    }

                }
            );


        } catch (error) {

            console.error(
                "Download error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to download app."

            });

        }

    }

);

// ======================================================
// LOGOUT
// ======================================================

server.post(
    "/api/logout",
    function (req, res) {

        res.json({

            message:
                "Logged out successfully."

        });

    }
);


// ======================================================
// HOME TEST
// ======================================================

server.get(
    "/",
    function (req, res) {

        res.send(
            "Tekohub backend is running"
        );

    }
);


// ======================================================
// MULTER / UPLOAD ERROR HANDLER
// ======================================================

server.use(
    function (error, req, res, next) {

        console.error(
            "Server error:",
            error
        );


        if (
            error instanceof multer.MulterError
        ) {

            return res.status(400).json({

                message:
                    `Upload error: ${error.message}`

            });

        }


        if (
            error &&
            error.message
        ) {

            return res.status(400).json({

                message:
                    error.message

            });

        }


        res.status(500).json({

            message:
                "Something went wrong on the server."

        });

    }
);


// ======================================================
// START SERVER
// ======================================================

const PORT = 3000;


server.listen(
    PORT,
    function () {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

    }
);