// ======================================================
// TEKOHUB SERVER
// CLOUDINARY STORAGE VERSION
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
const cloudinary = require("cloudinary").v2;


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
// CLOUDINARY
// ======================================================

cloudinary.config({

    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
        process.env.CLOUDINARY_API_KEY,

    api_secret:
        process.env.CLOUDINARY_API_SECRET

});


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
// TEMPORARY UPLOAD DIRECTORIES
// ======================================================

const uploadDir =
    path.join(
        __dirname,
        "temp-uploads"
    );

const appDir =
    path.join(
        uploadDir,
        "apps"
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
// CREATE TEMPORARY DIRECTORIES
// ======================================================

fs.mkdirSync(
    appDir,
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


                if (
                    file.fieldname ===
                    "app-file"
                ) {

                    callback(
                        null,
                        appDir
                    );

                    return;

                }


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
// CLOUDINARY HELPERS
// ======================================================

function uploadToCloudinary(
    filePath,
    options
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            cloudinary.uploader.upload(
                filePath,
                options,
                function (
                    error,
                    result
                ) {

                    if (error) {

                        reject(
                            error
                        );

                        return;

                    }

                    resolve(
                        result
                    );

                }
            );

        }
    );

}


// ======================================================
// CLOUDINARY LARGE RAW FILE UPLOAD
// ======================================================

function uploadLargeRawFile(
    filePath,
    options
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const uploadStream =
                cloudinary.uploader.upload_large(
                    filePath,
                    options,
                    function (
                        error,
                        result
                    ) {

                        if (error) {

                            reject(
                                error
                            );

                            return;

                        }

                        resolve(
                            result
                        );

                    }
                );

        }
    );

}


// ======================================================
// DELETE CLOUDINARY ASSET
// ======================================================

async function deleteCloudinaryAsset(
    publicId,
    resourceType
) {

    if (
        !publicId
    ) {

        return;

    }


    try {

        await cloudinary.uploader.destroy(

            publicId,

            {

                resource_type:
                    resourceType,

                type:
                    "upload",

                invalidate:
                    true

            }

        );

    } catch (
        error
    ) {

        console.error(
            "Cloudinary delete error:",
            error.message
        );

    }

}


// ======================================================
// GET CLOUDINARY PUBLIC ID FROM URL
// ======================================================

function getCloudinaryPublicId(
    url,
    resourceType
) {

    if (
        !url ||
        !url.includes(
            "res.cloudinary.com"
        )
    ) {

        return null;

    }


    try {

        const parsedUrl =
            new URL(
                url
            );


        const pathname =
            parsedUrl.pathname;


        const marker =
            `/${resourceType}/upload/`;


        const index =
            pathname.indexOf(
                marker
            );


        if (
            index === -1
        ) {

            return null;

        }


        let publicId =
            pathname.substring(
                index +
                marker.length
            );


        publicId =
            publicId.replace(
                /^v[0-9]+\//,
                ""
            );


        if (
            resourceType ===
            "raw"
        ) {

            return publicId;

        }


        const extension =
            path.extname(
                publicId
            );


        if (
            extension
        ) {

            publicId =
                publicId.substring(
                    0,
                    publicId.length -
                    extension.length
                );

        }


        return publicId;

    } catch (
        error
    ) {

        return null;

    }

}


// ======================================================
// CLEAN TEMP FILE
// ======================================================

function deleteTempFile(
    filePath
) {

    if (
        !filePath
    ) {

        return;

    }


    try {

        if (
            fs.existsSync(
                filePath
            )
        ) {

            fs.unlinkSync(
                filePath
            );

        }

    } catch (
        error
    ) {

        console.error(
            "Temporary file cleanup error:",
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


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


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


            res.status(
                201
            ).json({

                message:
                    "Account created successfully."

            });


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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

        const temporaryFiles = [];

        let uploadedCloudinaryAssets = [];

        try {

            const {
                user
            } =
                await authenticateUser(
                    req
                );


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


            const logoFile =
                req.files[
                    "app-logo"
                ][0];


            const appFile =
                req.files[
                    "app-file"
                ][0];


            temporaryFiles.push(
                logoFile.path
            );

            temporaryFiles.push(
                appFile.path
            );


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

                    temporaryFiles.push(
                        file.path
                    );

                }

            }


            // ==================================================
            // UPLOAD LOGO TO CLOUDINARY
            // ==================================================

            const logoUpload =
                await uploadToCloudinary(

                    logoFile.path,

                    {

                        folder:
                            "tekohub/logos",

                        resource_type:
                            "image"

                    }

                );


            uploadedCloudinaryAssets.push({

                publicId:
                    logoUpload.public_id,

                resourceType:
                    "image"

            });


            // ==================================================
            // UPLOAD APP FILE TO CLOUDINARY
            // ==================================================

            const appUpload =
                await uploadLargeRawFile(

                    appFile.path,

                    {

                        folder:
                            "tekohub/apps",

                        resource_type:
                            "raw",

                        use_filename:
                            true,

                        unique_filename:
                            true

                    }

                );


            uploadedCloudinaryAssets.push({

                publicId:
                    appUpload.public_id,

                resourceType:
                    "raw"

            });


            // ==================================================
            // SCREENSHOTS
            // ==================================================

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

                    const screenshotUpload =
                        await uploadToCloudinary(

                            file.path,

                            {

                                folder:
                                    "tekohub/screenshots",

                                resource_type:
                                    "image"

                            }

                        );


                    uploadedCloudinaryAssets.push({

                        publicId:
                            screenshotUpload.public_id,

                        resourceType:
                            "image"

                    });


                    screenshots.push(
                        screenshotUpload.secure_url
                    );

                }

            }


            // ==================================================
            // CREATE APP
            // ==================================================

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
                        logoUpload.secure_url,

                    apkFile:
                        appUpload.secure_url,

                    screenshots:
                        screenshots,

                    uploadedBy:
                        user._id

                });


            await newApp.save();


            // ==================================================
            // DELETE TEMPORARY FILES
            // ==================================================

            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

            }


            res.status(
                201
            ).json({

                message:
                    "App uploaded successfully!",

                app:
                    newApp

            });


        } catch (
            error
        ) {

            console.error(
                "App upload error:",
                error
            );


            // ==================================================
            // REMOVE CLOUDINARY FILES IF DATABASE SAVE FAILED
            // ==================================================

            for (
                const asset
                of uploadedCloudinaryAssets
            ) {

                await deleteCloudinaryAsset(

                    asset.publicId,

                    asset.resourceType

                );

            }


            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

            }


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


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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


            // ==================================================
            // DELETE LOGO FROM CLOUDINARY
            // ==================================================

            const logoPublicId =
                getCloudinaryPublicId(
                    appData.logo,
                    "image"
                );


            if (
                logoPublicId
            ) {

                await deleteCloudinaryAsset(

                    logoPublicId,

                    "image"

                );

            }


            // ==================================================
            // DELETE APP FILE FROM CLOUDINARY
            // ==================================================

            const appPublicId =
                getCloudinaryPublicId(
                    appData.apkFile,
                    "raw"
                );


            if (
                appPublicId
            ) {

                await deleteCloudinaryAsset(

                    appPublicId,

                    "raw"

                );

            }


            // ==================================================
            // DELETE SCREENSHOTS
            // ==================================================

            if (
                Array.isArray(
                    appData.screenshots
                )
            ) {

                for (
                    const screenshot
                    of appData.screenshots
                ) {

                    const screenshotPublicId =
                        getCloudinaryPublicId(
                            screenshot,
                            "image"
                        );


                    if (
                        screenshotPublicId
                    ) {

                        await deleteCloudinaryAsset(

                            screenshotPublicId,

                            "image"

                        );

                    }

                }

            }


            // ==================================================
            // DELETE REVIEWS
            // ==================================================

            await Review.deleteMany({

                app:
                    appData._id

            });


            // ==================================================
            // DELETE APP
            // ==================================================

            await App.findByIdAndDelete(
                appData._id
            );


            res.json({

                message:
                    "App deleted successfully."

            });


        } catch (
            error
        ) {

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

        const temporaryFiles = [];

        const uploadedCloudinaryAssets = [];

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

                const newLogoFile =
                    req.files[
                        "app-logo"
                    ][0];


                temporaryFiles.push(
                    newLogoFile.path
                );


                const newLogoUpload =
                    await uploadToCloudinary(

                        newLogoFile.path,

                        {

                            folder:
                                "tekohub/logos",

                            resource_type:
                                "image"

                        }

                    );


                uploadedCloudinaryAssets.push({

                    publicId:
                        newLogoUpload.public_id,

                    resourceType:
                        "image"

                });


                const oldLogoPublicId =
                    getCloudinaryPublicId(
                        appData.logo,
                        "image"
                    );


                appData.logo =
                    newLogoUpload.secure_url;


                if (
                    oldLogoPublicId
                ) {

                    await deleteCloudinaryAsset(

                        oldLogoPublicId,

                        "image"

                    );

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

                const newAppFile =
                    req.files[
                        "app-file"
                    ][0];


                temporaryFiles.push(
                    newAppFile.path
                );


                const newAppUpload =
                    await uploadLargeRawFile(

                        newAppFile.path,

                        {

                            folder:
                                "tekohub/apps",

                            resource_type:
                                "raw",

                            use_filename:
                                true,

                            unique_filename:
                                true

                        }

                    );


                uploadedCloudinaryAssets.push({

                    publicId:
                        newAppUpload.public_id,

                    resourceType:
                        "raw"

                });


                const oldAppPublicId =
                    getCloudinaryPublicId(
                        appData.apkFile,
                        "raw"
                    );


                appData.apkFile =
                    newAppUpload.secure_url;


                if (
                    oldAppPublicId
                ) {

                    await deleteCloudinaryAsset(

                        oldAppPublicId,

                        "raw"

                    );

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

                const oldScreenshots =
                    Array.isArray(
                        appData.screenshots
                    )
                        ? appData.screenshots
                        : [];


                for (
                    const screenshot
                    of oldScreenshots
                ) {

                    const oldPublicId =
                        getCloudinaryPublicId(
                            screenshot,
                            "image"
                        );


                    if (
                        oldPublicId
                    ) {

                        await deleteCloudinaryAsset(

                            oldPublicId,

                            "image"

                        );

                    }

                }


                const newScreenshots = [];


                for (
                    const file
                    of req.files[
                        "screenshots[]"
                    ]
                ) {

                    temporaryFiles.push(
                        file.path
                    );


                    const screenshotUpload =
                        await uploadToCloudinary(

                            file.path,

                            {

                                folder:
                                    "tekohub/screenshots",

                                resource_type:
                                    "image"

                            }

                        );


                    uploadedCloudinaryAssets.push({

                        publicId:
                            screenshotUpload.public_id,

                        resourceType:
                            "image"

                    });


                    newScreenshots.push(
                        screenshotUpload.secure_url
                    );

                }


                appData.screenshots =
                    newScreenshots;

            }


            await appData.save();


            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

            }


            res.json({

                message:
                    "App updated successfully.",

                app:
                    appData

            });


        } catch (
            error
        ) {

            console.error(
                "Edit app error:",
                error
            );


            for (
                const asset
                of uploadedCloudinaryAssets
            ) {

                await deleteCloudinaryAsset(

                    asset.publicId,

                    asset.resourceType

                );

            }


            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

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


            res.status(
                201
            ).json({

                message:
                    "Review submitted successfully.",

                review:
                    review

            });


        } catch (
            error
        ) {

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


        } catch (
            error
        ) {

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


            // ==================================================
            // CLOUDINARY FILE
            // ==================================================

            if (
                appData.apkFile.includes(
                    "res.cloudinary.com"
                )
            ) {

                appData.downloads =
                    (
                        appData.downloads ||
                        0
                    ) + 1;


                await appData.save();


                const appFilename =
                    path.basename(
                        appData.apkFile
                    );


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


                // ==================================================
                // REDIRECT TO CLOUDINARY
                // ==================================================

                return res.redirect(
                    appData.apkFile
                );

            }


            // ==================================================
            // LEGACY LOCAL FILE
            // ==================================================

            const appFilename =
                path.basename(
                    appData.apkFile
                );


            const legacyAppDir =
                path.join(
                    __dirname,
                    "uploads",
                    "apks"
                );


            const filePath =
                path.join(

                    legacyAppDir,

                    appFilename

                );


            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App file not found. This app was uploaded using the old storage system and must be uploaded again."

                });

            }


            appData.downloads =
                (
                    appData.downloads ||
                    0
                ) + 1;


            await appData.save();


            return res.download(

                filePath,

                appFilename

            );


        } catch (
            error
        ) {

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