// ======================================================
// TEKOHUB SERVER
// ======================================================

// ======================================================
// IMPORTS
// ======================================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ======================================================
// MODELS
// ======================================================

const User = require("./models/user");
const App = require("./models/app");
const Review = require("./models/review");


// ======================================================
// ENVIRONMENT
// ======================================================

dotenv.config();


// ======================================================
// SERVER
// ======================================================

const server = express();


// ======================================================
// BASIC MIDDLEWARE
// ======================================================

server.use(cors());

server.use(express.json());

server.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================================
// UPLOAD DIRECTORIES
// ======================================================

const uploadDir =
    path.join(
        __dirname,
        "uploads"
    );

const apkDir =
    path.join(
        uploadDir,
        "apks"
    );

const logoDir =
    path.join(
        uploadDir,
        "logos"
    );

const screenshotDir =
    path.join(
        uploadDir,
        "screenshots"
    );


// ======================================================
// CREATE UPLOAD DIRECTORIES
// ======================================================

fs.mkdirSync(
    apkDir,
    {
        recursive: true
    }
);

fs.mkdirSync(
    logoDir,
    {
        recursive: true
    }
);

fs.mkdirSync(
    screenshotDir,
    {
        recursive: true
    }
);


// ======================================================
// SERVE UPLOADED FILES
// ======================================================

server.use(
    "/uploads",
    express.static(uploadDir)
);


// ======================================================
// SUPPORTED APP FILE TYPES
// ======================================================

const allowedAppExtensions = [

    ".apk",

    ".exe",

    ".msi",

    ".deb",

    ".appimage",

    ".dmg",

    ".app"

];


// ======================================================
// MULTER STORAGE
// ======================================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                callback
            ) {

                // ------------------------------
                // APP LOGO
                // ------------------------------

                if (
                    file.fieldname ===
                    "app-logo"
                ) {

                    callback(
                        null,
                        logoDir
                    );

                    return;

                }


                // ------------------------------
                // APP FILE
                // ------------------------------

                if (
                    file.fieldname ===
                    "app-file"
                ) {

                    callback(
                        null,
                        apkDir
                    );

                    return;

                }


                // ------------------------------
                // SCREENSHOTS
                // ------------------------------

                if (
                    file.fieldname ===
                        "screenshots[]" ||
                    file.fieldname ===
                        "screenshots"
                ) {

                    callback(
                        null,
                        screenshotDir
                    );

                    return;

                }


                // ------------------------------
                // UNKNOWN FIELD
                // ------------------------------

                callback(
                    new Error(
                        `Unexpected file field: ${file.fieldname}`
                    )
                );

            },


        filename:
            function (
                req,
                file,
                callback
            ) {

                const extension =
                    path
                        .extname(
                            file.originalname
                        )
                        .toLowerCase();


                const uniqueName =
                    Date.now() +
                    "-" +
                    Math.round(
                        Math.random() *
                        1000000000
                    ) +
                    extension;


                callback(
                    null,
                    uniqueName
                );

            }

    });


// ======================================================
// FILE FILTER
// ======================================================

const fileFilter =
    function (
        req,
        file,
        callback
    ) {

        // ==================================================
        // APP LOGO
        // ==================================================

        if (
            file.fieldname ===
            "app-logo"
        ) {

            const allowedLogoTypes = [

                "image/png",

                "image/jpeg",

                "image/webp"

            ];


            if (
                allowedLogoTypes.includes(
                    file.mimetype
                )
            ) {

                callback(
                    null,
                    true
                );

            } else {

                callback(
                    new Error(
                        "App logo must be PNG, JPEG, or WEBP."
                    )
                );

            }

            return;

        }


        // ==================================================
        // APP FILE
        // ==================================================

        if (
            file.fieldname ===
            "app-file"
        ) {

            const extension =
                path
                    .extname(
                        file.originalname
                    )
                    .toLowerCase();


            if (
                allowedAppExtensions.includes(
                    extension
                )
            ) {

                callback(
                    null,
                    true
                );

            } else {

                callback(
                    new Error(
                        "Supported app files: APK, EXE, MSI, DEB, AppImage, DMG, and APP."
                    )
                );

            }

            return;

        }


        // ==================================================
        // SCREENSHOTS
        // ==================================================

        if (
            file.fieldname ===
                "screenshots[]" ||
            file.fieldname ===
                "screenshots"
        ) {

            if (
                file.mimetype &&
                file.mimetype.startsWith(
                    "image/"
                )
            ) {

                callback(
                    null,
                    true
                );

            } else {

                callback(
                    new Error(
                        "Screenshots must be image files."
                    )
                );

            }

            return;

        }


        // ==================================================
        // UNKNOWN FIELD
        // ==================================================

        callback(
            new Error(
                `Unexpected file field: ${file.fieldname}`
            )
        );

    };


// ======================================================
// MULTER
// ======================================================

const upload =
    multer({

        storage:

            storage,

        fileFilter:

            fileFilter,

        limits: {

            // 100 MB per file

            fileSize:
                100 *
                1024 *
                1024

        }

    });


// ======================================================
// AUTHENTICATION HELPER
// ======================================================

function getToken(req) {

    const authHeader =
        req.headers.authorization;


    if (
        !authHeader
    ) {

        return null;

    }


    if (
        !authHeader.startsWith(
            "Bearer "
        )
    ) {

        return null;

    }


    return authHeader
        .split(" ")[1];

}


// ======================================================
// AUTHENTICATE USER
// ======================================================

async function authenticateUser(
    req
) {

    const token =
        getToken(req);


    if (!token) {

        throw new Error(
            "AUTH_REQUIRED"
        );

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

        throw new Error(
            "USER_NOT_FOUND"
        );

    }


    return {
        user,
        decoded
    };

}


// ======================================================
// MONGODB CONNECTION
// ======================================================

async function connectDatabase() {

    try {

        if (
            !process.env.MONGODB_URI
        ) {

            console.error(
                "MONGODB_URI is missing from .env"
            );

            return;

        }


        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                serverSelectionTimeoutMS:
                    10000
            }
        );


        console.log(
            "MongoDB connected successfully"
        );


    } catch (error) {

        console.error(
            "MongoDB connection error:",
            error.message
        );

    }

}


// ======================================================
// SIGN UP
// ======================================================

server.post(
    "/api/signup",
    async function (
        req,
        res
    ) {

        try {

            const {
                username,
                email,
                password
            } = req.body;


            // ------------------------------
            // VALIDATE
            // ------------------------------

            if (
                !username ||
                !email ||
                !password
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please fill in all fields."

                });

            }


            // ------------------------------
            // CHECK EXISTING USER
            // ------------------------------

            const existingUser =
                await User.findOne({

                    $or: [

                        {
                            username:
                                username
                        },

                        {
                            email:
                                email.toLowerCase()
                        }

                    ]

                });


            if (
                existingUser
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Username or email already exists."

                });

            }


            // ------------------------------
            // HASH PASSWORD
            // ------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            // ------------------------------
            // CREATE USER
            // ------------------------------

            const newUser =
                new User({

                    username:
                        username,

                    email:
                        email.toLowerCase(),

                    password:
                        hashedPassword

                });


            await newUser.save();


            // ------------------------------
            // RESPONSE
            // ------------------------------

            res.status(
                201
            ).json({

                message:
                    "Account created successfully."

            });


        } catch (error) {

            console.error(
                "Signup error:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Server error."

            });

        }

    }
);


// ======================================================
// LOGIN
// ======================================================

server.post(
    "/api/login",
    async function (
        req,
        res
    ) {

        try {

            const {
                username,
                password
            } = req.body;


            // ------------------------------
            // VALIDATE
            // ------------------------------

            if (
                !username ||
                !password
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please enter your username/email and password."

                });

            }


            // ------------------------------
            // FIND USER
            // ------------------------------

            const user =
                await User.findOne({

                    $or: [

                        {
                            username:
                                username
                        },

                        {
                            email:
                                username.toLowerCase()
                        }

                    ]

                });


            if (!user) {

                return res.status(
                    401
                ).json({

                    message:
                        "Invalid username/email or password."

                });

            }


            // ------------------------------
            // CHECK PASSWORD
            // ------------------------------

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (
                !passwordMatch
            ) {

                return res.status(
                    401
                ).json({

                    message:
                        "Invalid username/email or password."

                });

            }


            // ------------------------------
            // CREATE TOKEN
            // ------------------------------

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


            // ------------------------------
            // RESPONSE
            // ------------------------------

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


            res.status(
                500
            ).json({

                message:
                    "Server error."

            });

        }

    }
);


// ======================================================
// VERIFY LOGIN
// ======================================================

server.get(
    "/api/me",
    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            const safeUser =
                await User.findById(
                    user._id
                ).select(
                    "-password"
                );


            res.json({

                loggedIn:
                    true,

                user:
                    safeUser

            });


        } catch (error) {

            res.status(
                401
            ).json({

                loggedIn:
                    false,

                message:
                    "Invalid or expired login."

            });

        }

    }
);


// ======================================================
// UPLOAD APP
// ======================================================

server.post(

    "/api/apps",

    upload.fields([

        {
            name:
                "app-logo",

            maxCount:
                1

        },

        {
            name:
                "app-file",

            maxCount:
                1

        },

        {
            name:
                "screenshots[]",

            maxCount:
                5

        }

    ]),

    async function (
        req,
        res
    ) {

        try {

            // ------------------------------
            // AUTHENTICATE
            // ------------------------------

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            // ------------------------------
            // APP INFORMATION
            // ------------------------------

            const name =
                req.body[
                    "app-name"
                ];

            const developer =
                req.body[
                    "app-developer"
                ];

            const version =
                req.body[
                    "app-version"
                ];

            const category =
                req.body[
                    "app-category"
                ];

            const description =
                req.body[
                    "app-description"
                ];


            if (
                !name ||
                !developer ||
                !version ||
                !category ||
                !description
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please provide all app information."

                });

            }


            // ------------------------------
            // CHECK LOGO
            // ------------------------------

            if (
                !req.files ||
                !req.files[
                    "app-logo"
                ] ||
                req.files[
                    "app-logo"
                ].length === 0
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please upload an app logo."

                });

            }


            // ------------------------------
            // CHECK APP FILE
            // ------------------------------

            if (
                !req.files ||
                !req.files[
                    "app-file"
                ] ||
                req.files[
                    "app-file"
                ].length === 0
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please upload an app file."

                });

            }


            // ------------------------------
            // GET FILES
            // ------------------------------

            const logoFile =
                req.files[
                    "app-logo"
                ][0];

            const appFile =
                req.files[
                    "app-file"
                ][0];


            // ------------------------------
            // LOGO URL
            // ------------------------------

            const logo =
                `/uploads/logos/${logoFile.filename}`;


            // ------------------------------
            // APP FILE URL
            // ------------------------------

            const appFileUrl =
                `/uploads/apks/${appFile.filename}`;


            // ------------------------------
            // SCREENSHOTS
            // ------------------------------

            const screenshots = [];


            if (
                req.files[
                    "screenshots[]"
                ]
            ) {

                for (
                    const file
                    of req.files[
                        "screenshots[]"
                    ]
                ) {

                    screenshots.push(
                        `/uploads/screenshots/${file.filename}`
                    );

                }

            }


            // ------------------------------
            // CREATE APP
            // ------------------------------

            const newApp =
                new App({

                    name:
                        name.trim(),

                    developer:
                        developer.trim(),

                    version:
                        version.trim(),

                    category:
                        category,

                    description:
                        description.trim(),

                    logo:
                        logo,

                    // Keep this field name
                    // because your current
                    // MongoDB schema uses it.

                    apkFile:
                        appFileUrl,

                    screenshots:
                        screenshots,

                    uploadedBy:
                        user._id

                });


            await newApp.save();


            // ------------------------------
            // RESPONSE
            // ------------------------------

            res.status(
                201
            ).json({

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
                error.message ===
                "AUTH_REQUIRED"
            ) {

                return res.status(
                    401
                ).json({

                    message:
                        "You must be logged in to upload an app."

                });

            }


            if (
                error.message ===
                "USER_NOT_FOUND"
            ) {

                return res.status(
                    401
                ).json({

                    message:
                        "User not found."

                });

            }


            if (
                error instanceof
                multer.MulterError
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        `Upload error: ${error.message}`

                });

            }


            if (
                error.message
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        error.message

                });

            }


            res.status(
                500
            ).json({

                message:
                    "Server error."

            });

        }

    }

);


// ======================================================
// GET ALL APPS
// ======================================================

server.get(
    "/api/apps",
    async function (
        req,
        res
    ) {

        try {

            const apps =
                await App.find()
                    .sort({

                        createdAt:
                            -1

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


            res.status(
                500
            ).json({

                message:
                    "Failed to get apps."

            });

        }

    }
);


// ======================================================
// GET MY APPS
// ======================================================

server.get(
    "/api/apps/my-apps",
    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            const apps =
                await App.find({

                    uploadedBy:
                        user._id

                }).sort({

                    createdAt:
                        -1

                });


            res.json({

                apps:
                    apps

            });


        } catch (error) {

            console.error(
                "Get my apps error:",
                error
            );


            res.status(
                401
            ).json({

                message:
                    "Invalid or expired login."

            });

        }

    }
);


// ======================================================
// GET MY REVIEWS
// ======================================================

server.get(
    "/api/my-reviews",
    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            const reviews =
                await Review.find({

                    user:
                        user._id

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
                "Get my reviews error:",
                error
            );


            res.status(
                401
            ).json({

                message:
                    "Invalid or expired login."

            });

        }

    }
);


// ======================================================
// GET ONE APP
// ======================================================

server.get(
    "/api/apps/:id",
    async function (
        req,
        res
    ) {

        try {

            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            res.json({

                app:
                    appData

            });


        } catch (error) {

            console.error(
                "Get app error:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to get app."

            });

        }

    }
);


// ======================================================
// DELETE APP
// ======================================================

server.delete(
    "/api/apps/:id",
    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            // ------------------------------
            // CHECK OWNERSHIP
            // ------------------------------

            if (
                appData.uploadedBy
                    .toString() !==
                user._id.toString()
            ) {

                return res.status(
                    403
                ).json({

                    message:
                        "You can only delete your own apps."

                });

            }


            // ------------------------------
            // DELETE LOGO
            // ------------------------------

            if (
                appData.logo
            ) {

                const logoPath =
                    path.join(

                        logoDir,

                        path.basename(
                            appData.logo
                        )

                    );


                if (
                    fs.existsSync(
                        logoPath
                    )
                ) {

                    fs.unlinkSync(
                        logoPath
                    );

                }

            }


            // ------------------------------
            // DELETE APP FILE
            // ------------------------------

            if (
                appData.apkFile
            ) {

                const appFilePath =
                    path.join(

                        apkDir,

                        path.basename(
                            appData.apkFile
                        )

                    );


                if (
                    fs.existsSync(
                        appFilePath
                    )
                ) {

                    fs.unlinkSync(
                        appFilePath
                    );

                }

            }


            // ------------------------------
            // DELETE SCREENSHOTS
            // ------------------------------

            if (
                Array.isArray(
                    appData.screenshots
                )
            ) {

                for (
                    const screenshot
                    of appData.screenshots
                ) {

                    const screenshotPath =
                        path.join(

                            screenshotDir,

                            path.basename(
                                screenshot
                            )

                        );


                    if (
                        fs.existsSync(
                            screenshotPath
                        )
                    ) {

                        fs.unlinkSync(
                            screenshotPath
                        );

                    }

                }

            }


            // ------------------------------
            // DELETE REVIEWS
            // ------------------------------

            await Review.deleteMany({

                app:
                    appData._id

            });


            // ------------------------------
            // DELETE APP
            // ------------------------------

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


            res.status(
                500
            ).json({

                message:
                    "Failed to delete app."

            });

        }

    }
);


// ======================================================
// EDIT APP
// ======================================================

server.put(

    "/api/apps/:id",

    upload.fields([

        {
            name:
                "app-logo",

            maxCount:
                1

        },

        {
            name:
                "app-file",

            maxCount:
                1

        },

        {
            name:
                "screenshots[]",

            maxCount:
                5

        }

    ]),

    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            // ------------------------------
            // FIND APP
            // ------------------------------

            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            // ------------------------------
            // CHECK OWNERSHIP
            // ------------------------------

            if (
                appData.uploadedBy
                    .toString() !==
                user._id.toString()
            ) {

                return res.status(
                    403
                ).json({

                    message:
                        "You can only edit your own apps."

                });

            }


            // ------------------------------
            // GET INFORMATION
            // ------------------------------

            const name =
                req.body[
                    "app-name"
                ];

            const developer =
                req.body[
                    "app-developer"
                ];

            const version =
                req.body[
                    "app-version"
                ];

            const category =
                req.body[
                    "app-category"
                ];

            const description =
                req.body[
                    "app-description"
                ];


            if (
                !name ||
                !developer ||
                !version ||
                !category ||
                !description
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please provide all app information."

                });

            }


            // ------------------------------
            // UPDATE TEXT
            // ------------------------------

            appData.name =
                name.trim();

            appData.developer =
                developer.trim();

            appData.version =
                version.trim();

            appData.category =
                category;

            appData.description =
                description.trim();


            // ==================================================
            // REPLACE LOGO
            // ==================================================

            if (
                req.files &&
                req.files[
                    "app-logo"
                ] &&
                req.files[
                    "app-logo"
                ].length > 0
            ) {

                const oldLogo =
                    appData.logo;


                const newLogoFile =
                    req.files[
                        "app-logo"
                    ][0];


                appData.logo =
                    `/uploads/logos/${newLogoFile.filename}`;


                if (
                    oldLogo
                ) {

                    const oldLogoPath =
                        path.join(

                            logoDir,

                            path.basename(
                                oldLogo
                            )

                        );


                    if (
                        fs.existsSync(
                            oldLogoPath
                        )
                    ) {

                        fs.unlinkSync(
                            oldLogoPath
                        );

                    }

                }

            }


            // ==================================================
            // REPLACE APP FILE
            // ==================================================

            if (
                req.files &&
                req.files[
                    "app-file"
                ] &&
                req.files[
                    "app-file"
                ].length > 0
            ) {

                const oldAppFile =
                    appData.apkFile;


                const newAppFile =
                    req.files[
                        "app-file"
                    ][0];


                appData.apkFile =
                    `/uploads/apks/${newAppFile.filename}`;


                if (
                    oldAppFile
                ) {

                    const oldAppFilePath =
                        path.join(

                            apkDir,

                            path.basename(
                                oldAppFile
                            )

                        );


                    if (
                        fs.existsSync(
                            oldAppFilePath
                        )
                    ) {

                        fs.unlinkSync(
                            oldAppFilePath
                        );

                    }

                }

            }


            // ==================================================
            // REPLACE SCREENSHOTS
            // ==================================================

            if (
                req.files &&
                req.files[
                    "screenshots[]"
                ] &&
                req.files[
                    "screenshots[]"
                ].length > 0
            ) {

                // ------------------------------
                // DELETE OLD SCREENSHOTS
                // ------------------------------

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


                // ------------------------------
                // SAVE NEW SCREENSHOTS
                // ------------------------------

                const newScreenshots = [];


                for (
                    const file
                    of req.files[
                        "screenshots[]"
                    ]
                ) {

                    newScreenshots.push(

                        `/uploads/screenshots/${file.filename}`

                    );

                }


                appData.screenshots =
                    newScreenshots;

            }


            // ------------------------------
            // SAVE
            // ------------------------------

            await appData.save();


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
                error instanceof
                multer.MulterError
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        `Upload error: ${error.message}`

                });

            }


            if (
                error.message
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        error.message

                });

            }


            res.status(
                500
            ).json({

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

    async function (
        req,
        res
    ) {

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            // ------------------------------
            // FIND APP
            // ------------------------------

            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            // ------------------------------
            // REVIEW DATA
            // ------------------------------

            const {
                rating,
                comment
            } = req.body;


            if (
                rating ===
                    undefined ||
                !comment ||
                comment.trim() ===
                    ""
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please provide a rating and review."

                });

            }


            const numericRating =
                Number(
                    rating
                );


            if (
                !Number.isFinite(
                    numericRating
                ) ||
                numericRating < 1 ||
                numericRating > 5
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Rating must be between 1 and 5."

                });

            }


            // ------------------------------
            // CHECK EXISTING REVIEW
            // ------------------------------

            const existingReview =
                await Review.findOne({

                    app:
                        appData._id,

                    user:
                        user._id

                });


            if (
                existingReview
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "You have already reviewed this app."

                });

            }


            // ------------------------------
            // CREATE REVIEW
            // ------------------------------

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


            // ------------------------------
            // RECALCULATE RATING
            // ------------------------------

            const allReviews =
                await Review.find({

                    app:
                        appData._id

                });


            let totalRating =
                0;


            for (
                const currentReview
                of allReviews
            ) {

                totalRating +=
                    Number(
                        currentReview.rating
                    );

            }


            if (
                allReviews.length > 0
            ) {

                const averageRating =
                    totalRating /
                    allReviews.length;


                appData.rating =
                    Number(
                        averageRating.toFixed(
                            1
                        )
                    );

            }


            await appData.save();


            // ------------------------------
            // RESPONSE
            // ------------------------------

            res.status(
                201
            ).json({

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


            res.status(
                500
            ).json({

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

    async function (
        req,
        res
    ) {

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


            res.status(
                500
            ).json({

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

    async function (
        req,
        res
    ) {

        try {

            // ------------------------------
            // FIND APP
            // ------------------------------

            const appData =
                await App.findById(
                    req.params.id
                );


            if (!appData) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            // ------------------------------
            // CHECK APP FILE
            // ------------------------------

            if (
                !appData.apkFile
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App file not found."

                });

            }


            // ------------------------------
            // GET FILENAME
            // ------------------------------

            const appFilename =
                path.basename(
                    appData.apkFile
                );


            // ------------------------------
            // FILE PATH
            // ------------------------------

            const filePath =
                path.join(

                    apkDir,

                    appFilename

                );


            // ------------------------------
            // CHECK FILE
            // ------------------------------

            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                console.error(
                    "App file not found:",
                    filePath
                );


                return res.status(
                    404
                ).json({

                    message:
                        "App file not found."

                });

            }


            // ------------------------------
            // INCREASE DOWNLOADS
            // ------------------------------

            appData.downloads =
                (
                    appData.downloads ||
                    0
                ) + 1;


            await appData.save();


            // ------------------------------
            // CONTENT TYPE
            // ------------------------------

            const extension =
                path
                    .extname(
                        appFilename
                    )
                    .toLowerCase();


            const contentTypes = {

                ".apk":
                    "application/vnd.android.package-archive",

                ".exe":
                    "application/vnd.microsoft.portable-executable",

                ".msi":
                    "application/x-msi",

                ".deb":
                    "application/vnd.debian.binary-package",

                ".appimage":
                    "application/x-executable",

                ".dmg":
                    "application/x-apple-diskimage",

                ".app":
                    "application/octet-stream"

            };


            res.setHeader(

                "Content-Type",

                contentTypes[
                    extension
                ] ||
                "application/octet-stream"

            );


            // ------------------------------
            // DOWNLOAD
            // ------------------------------

            res.download(

                filePath,

                appFilename,

                function (
                    error
                ) {

                    if (
                        error
                    ) {

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


            if (
                !res.headersSent
            ) {

                res.status(
                    500
                ).json({

                    message:
                        "Failed to download app."

                });

            }

        }

    }

);


// ======================================================
// LOGOUT
// ======================================================

server.post(
    "/api/logout",
    function (
        req,
        res
    ) {

        res.json({

            message:
                "Logged out successfully."

        });

    }
);


// ======================================================
// HOME / SERVER TEST
// ======================================================

server.get(
    "/",
    function (
        req,
        res
    ) {

        res.json({

            status:
                "online",

            message:
                "Tekohub backend is running."

        });

    }
);


// ======================================================
// 404 HANDLER
// ======================================================

server.use(
    function (
        req,
        res
    ) {

        res.status(
            404
        ).json({

            message:
                "API route not found."

        });

    }
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

server.use(
    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "Server error:",
            error
        );


        // ------------------------------
        // MULTER ERROR
        // ------------------------------

        if (
            error instanceof
            multer.MulterError
        ) {

            return res.status(
                400
            ).json({

                message:
                    `Upload error: ${error.message}`

            });

        }


        // ------------------------------
        // NORMAL ERROR
        // ------------------------------

        if (
            error &&
            error.message
        ) {

            return res.status(
                400
            ).json({

                message:
                    error.message

            });

        }


        // ------------------------------
        // UNKNOWN ERROR
        // ------------------------------

        res.status(
            500
        ).json({

            message:
                "Something went wrong on the server."

        });

    }
);


// ======================================================
// START SERVER
// ======================================================

const PORT =
    process.env.PORT ||
    3000;


async function startServer() {

    await connectDatabase();


    server.listen(
        PORT,
        function () {

            console.log(
                `Tekohub server running on port ${PORT}`
            );

        }
    );

}


startServer();
