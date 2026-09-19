// ======================================================
// TEKOHUB SERVER
// CLOUDINARY STORAGE VERSION
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
// CHECK REQUIRED ENVIRONMENT VARIABLES
// ======================================================

const requiredEnv = [
    "MONGODB_URI",
    "JWT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
];

for (const variable of requiredEnv) {

    if (!process.env[variable]) {

        console.error(
            `WARNING: ${variable} is missing.`
        );

    }

}


// ======================================================
// CLOUDINARY CONFIGURATION
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
// TEMPORARY UPLOAD DIRECTORIES
// ======================================================

const tempUploadDir =
    path.join(
        __dirname,
        "temp-uploads"
    );

const appDir =
    path.join(
        tempUploadDir,
        "apps"
    );

const logoDir =
    path.join(
        tempUploadDir,
        "logos"
    );

const screenshotDir =
    path.join(
        tempUploadDir,
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

                    return callback(
                        null,
                        logoDir
                    );

                }


                if (
                    file.fieldname ===
                    "app-file"
                ) {

                    return callback(
                        null,
                        appDir
                    );

                }


                if (
                    file.fieldname ===
                        "screenshots[]" ||
                    file.fieldname ===
                        "screenshots"
                ) {

                    return callback(
                        null,
                        screenshotDir
                    );

                }


                return callback(
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
                    `${Date.now()}-${Math.round(
                        Math.random() * 1000000000
                    )}${extension}`;


                callback(
                    null,
                    uniqueName
                );

            }

    });


// ======================================================
// FILE FILTER
// ======================================================

function fileFilter(
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

            return callback(
                null,
                true
            );

        }


        return callback(
            new Error(
                "App logo must be PNG, JPEG, or WEBP."
            )
        );

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

            return callback(
                null,
                true
            );

        }


        return callback(
            new Error(
                "Supported app files: APK, EXE, MSI, DEB, AppImage, DMG, and APP."
            )
        );

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

            return callback(
                null,
                true
            );

        }


        return callback(
            new Error(
                "Screenshots must be image files."
            )
        );

    }


    return callback(
        new Error(
            `Unexpected file field: ${file.fieldname}`
        )
    );

}


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

            // 100 MB
            fileSize:
                100 * 1024 * 1024

        }

    });


// ======================================================
// AUTHENTICATION
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


async function authenticateUser(req) {

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
// DATABASE
// ======================================================

async function connectDatabase() {

    if (
        !process.env.MONGODB_URI
    ) {

        console.error(
            "MONGODB_URI is missing."
        );

        return false;

    }


    try {

        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                serverSelectionTimeoutMS:
                    10000
            }
        );


        console.log(
            "MongoDB connected successfully."
        );


        return true;

    } catch (error) {

        console.error(
            "MongoDB connection error:",
            error.message
        );


        return false;

    }

}


// ======================================================
// CLOUDINARY UPLOAD
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

                        return reject(
                            error
                        );

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

            cloudinary.uploader.upload_large(
                filePath,
                {
                    ...options,
                    resource_type: "raw"
                },
                function (
                    error,
                    result
                ) {

                    if (error) {

                        return reject(
                            error
                        );

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

    } catch (error) {

        console.error(
            "Cloudinary delete error:",
            error.message
        );

    }

}


// ======================================================
// GET CLOUDINARY PUBLIC ID
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


        let pathname =
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

    } catch (error) {

        return null;

    }

}


// ======================================================
// DELETE TEMPORARY FILE
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

    } catch (error) {

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
                        username.trim(),

                    email:
                        email.toLowerCase(),

                    password:
                        hashedPassword

                });


            await newUser.save();


            return res.status(
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


            return res.status(
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


            if (
                !user
            ) {

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


            return res.json({

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


            return res.status(
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


            return res.json({

                loggedIn:
                    true,

                user:
                    safeUser

            });

        } catch (error) {

            return res.status(
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

        const uploadedCloudinaryAssets = [];

        try {

            // ==================================================
            // AUTHENTICATE
            // ==================================================

            const {
                user
            } =
                await authenticateUser(
                    req
                );


            // ==================================================
            // GET FORM DATA
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


            // ==================================================
            // VALIDATE FORM DATA
            // ==================================================

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


            // ==================================================
            // VALIDATE LOGO
            // ==================================================

            if (
                !req.files ||
                !req.files["app-logo"] ||
                req.files["app-logo"].length === 0
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please upload an app logo."

                });

            }


            // ==================================================
            // VALIDATE APP FILE
            // ==================================================

            if (
                !req.files ||
                !req.files["app-file"] ||
                req.files["app-file"].length === 0
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Please upload an app file."

                });

            }


            const logoFile =
                req.files["app-logo"][0];

            const appFile =
                req.files["app-file"][0];


            temporaryFiles.push(
                logoFile.path
            );

            temporaryFiles.push(
                appFile.path
            );


            // ==================================================
            // UPLOAD LOGO
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
            // UPLOAD APP FILE
            // ==================================================

            const appUpload =
                await uploadLargeRawFile(

                    appFile.path,

                    {
                        folder:
                            "tekohub/apps",

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
            // UPLOAD SCREENSHOTS
            // ==================================================

            const screenshots = [];


            const screenshotFiles =
                req.files["screenshots[]"] || [];


            for (
                const file
                of screenshotFiles
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


                screenshots.push(
                    screenshotUpload.secure_url
                );

            }


            // ==================================================
            // SAVE APP TO DATABASE
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
                        user._id,

                    downloads:
                        0,

                    rating:
                        0

                });


            await newApp.save();


            // ==================================================
            // DELETE TEMP FILES
            // ==================================================

            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

            }


            return res.status(
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


            // ==================================================
            // DELETE CLOUDINARY FILES
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


            // ==================================================
            // DELETE TEMP FILES
            // ==================================================

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


            return res.status(
                500
            ).json({

                message:
                    error.message ||
                    "Server error while uploading app."

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


            return res.json({

                apps:
                    apps

            });

        } catch (error) {

            console.error(
                "Get apps error:",
                error
            );


            return res.status(
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


            return res.json({

                apps:
                    apps

            });

        } catch (error) {

            console.error(
                "Get my apps error:",
                error
            );


            return res.status(
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


            return res.json({

                reviews:
                    reviews

            });

        } catch (error) {

            console.error(
                "Get my reviews error:",
                error
            );


            return res.status(
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


            if (
                !appData
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            return res.json({

                app:
                    appData

            });

        } catch (error) {

            console.error(
                "Get app error:",
                error
            );


            return res.status(
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


            if (
                !appData
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            if (
                appData.uploadedBy.toString() !==
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
            // DELETE LOGO
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
            // DELETE APP FILE
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

            const screenshots =
                Array.isArray(
                    appData.screenshots
                )
                    ? appData.screenshots
                    : [];


            for (
                const screenshot
                of screenshots
            ) {

                const publicId =
                    getCloudinaryPublicId(
                        screenshot,
                        "image"
                    );


                if (
                    publicId
                ) {

                    await deleteCloudinaryAsset(
                        publicId,
                        "image"
                    );

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
            // DELETE DATABASE RECORD
            // ==================================================

            await App.findByIdAndDelete(
                appData._id
            );


            return res.json({

                message:
                    "App deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete app error:",
                error
            );


            return res.status(
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


            if (
                !appData
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            if (
                appData.uploadedBy.toString() !==
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

            const logoFiles =
                req.files["app-logo"] || [];


            if (
                logoFiles.length > 0
            ) {

                const newLogoFile =
                    logoFiles[0];


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

            const appFiles =
                req.files["app-file"] || [];


            if (
                appFiles.length > 0
            ) {

                const newAppFile =
                    appFiles[0];


                temporaryFiles.push(
                    newAppFile.path
                );


                const newAppUpload =
                    await uploadLargeRawFile(

                        newAppFile.path,

                        {
                            folder:
                                "tekohub/apps",

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

            const screenshotFiles =
                req.files["screenshots[]"] || [];


            if (
                screenshotFiles.length > 0
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
                    of screenshotFiles
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


            // ==================================================
            // SAVE
            // ==================================================

            await appData.save();


            // ==================================================
            // DELETE TEMP FILES
            // ==================================================

            for (
                const filePath
                of temporaryFiles
            ) {

                deleteTempFile(
                    filePath
                );

            }


            return res.json({

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


            return res.status(
                500
            ).json({

                message:
                    error.message ||
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


            if (
                !appData
            ) {

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
                rating === undefined ||
                !comment ||
                comment.trim() === ""
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


            return res.status(
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


            return res.status(
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


            return res.json({

                reviews:
                    reviews

            });

        } catch (error) {

            console.error(
                "Get reviews error:",
                error
            );


            return res.status(
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


            // ==================================================
            // APP DOES NOT EXIST
            // ==================================================

            if (
                !appData
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "App not found."

                });

            }


            // ==================================================
            // NO FILE
            // ==================================================

            if (
                !appData.apkFile
            ) {

                return res.status(
                    404
                ).json({

                    message:
                        "This app has no download file."

                });

            }


            // ==================================================
            // CLOUDINARY FILE
            // ==================================================

            if (
                appData.apkFile.startsWith(
                    "https://res.cloudinary.com/"
                )
            ) {

                console.log(
                    "Cloudinary download:",
                    appData.apkFile
                );


                // Increase download count
                appData.downloads =
                    (
                        appData.downloads ||
                        0
                    ) + 1;


                await appData.save();


                // Redirect directly to permanent
                // Cloudinary storage.
                return res.redirect(
                    appData.apkFile
                );

            }


            // ==================================================
            // OLD LOCAL FILE
            // ==================================================

            if (
                appData.apkFile.startsWith(
                    "/uploads/"
                )
            ) {

                const filename =
                    path.basename(
                        appData.apkFile
                    );


                const oldUploadDir =
                    path.join(
                        __dirname,
                        "uploads",
                        "apks"
                    );


                const oldFilePath =
                    path.join(
                        oldUploadDir,
                        filename
                    );


                if (
                    !fs.existsSync(
                        oldFilePath
                    )
                ) {

                    return res.status(
                        404
                    ).json({

                        message:
                            "This app was uploaded using the old storage system. Please upload it again."

                    });

                }


                appData.downloads =
                    (
                        appData.downloads ||
                        0
                    ) + 1;


                await appData.save();


                return res.download(
                    oldFilePath,
                    filename
                );

            }


            // ==================================================
            // UNKNOWN FILE URL
            // ==================================================

            console.error(
                "Unknown app file URL:",
                appData.apkFile
            );


            return res.status(
                404
            ).json({

                message:
                    "The app download file is unavailable. Please upload the app again."

            });

        } catch (error) {

            console.error(
                "Download error:",
                error
            );


            if (
                !res.headersSent
            ) {

                return res.status(
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

        return res.json({

            message:
                "Logged out successfully."

        });

    }
);


// ======================================================
// SERVER TEST
// ======================================================

server.get(
    "/",
    function (
        req,
        res
    ) {

        return res.json({

            status:
                "online",

            message:
                "Tekohub backend is running."

        });

    }
);


// ======================================================
// 404
// ======================================================

server.use(
    function (
        req,
        res
    ) {

        return res.status(
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


        return res.status(
            400
        ).json({

            message:
                error.message ||
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

    const databaseConnected =
        await connectDatabase();


    if (
        !databaseConnected
    ) {

        console.error(
            "Server starting without MongoDB connection."
        );

    }


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
