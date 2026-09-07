const token = localStorage.getItem("token");

// ================================
// CHECK LOGIN
// ================================

if (!token) {

```
window.location.href =
    "login.html?returnTo=upload.html";
```

}

// ================================
// VERIFY LOGIN
// ================================

async function checkLogin() {

```
try {

    const response = await fetch(
        "https://tekohub.onrender.com/api/me",
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok || !data.loggedIn) {

        localStorage.removeItem("token");

        window.location.href =
            "login.html?returnTo=upload.html";

        return;

    }

    console.log(
        "Logged in as:",
        data.user.username
    );

    setupUpload();

} catch (error) {

    console.error(
        "Authentication error:",
        error
    );

    showMessage(
        "Could not connect to the Tekohub server.",
        "error"
    );

}
```

}

// ================================
// UPLOAD PAGE
// ================================

function setupUpload() {


const uploadForm =
    document.querySelector("#upload-form");

const appName =
    document.querySelector("#app-name");

const appDeveloper =
    document.querySelector("#app-developer");

const appVersion =
    document.querySelector("#app-version");

const appCategory =
    document.querySelector("#app-category");

const appDescription =
    document.querySelector("#app-description");

const appLogo =
    document.querySelector("#app-logo");

const apkInput =
    document.querySelector("#app-file");

const screenshotInput =
    document.querySelector(
        '#screenshots input[type="file"]'
    );

const screenshotPreview =
    document.querySelector(
        ".wherethescreenshotappears"
    );

const uploadButton =
    document.querySelector(".publish-button");



// ================================
// CREATE LOGO PREVIEW
// ================================

const logoPreview =
    document.createElement("div");

logoPreview.className =
    "logo-preview";

appLogo.parentElement.appendChild(
    logoPreview
);



// ================================
// LOGO PREVIEW
// ================================

appLogo.addEventListener(
    "change",
    function () {

        logoPreview.innerHTML = "";

        const file =
            appLogo.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            return;
        }

        const image =
            document.createElement("img");

        image.src =
            URL.createObjectURL(file);

        image.alt =
            "App logo preview";

        logoPreview.appendChild(image);

    }
);



// ================================
// APK FILE DISPLAY
// ================================

const apkInfo =
    document.createElement("div");

apkInfo.className =
    "apk-selected";

apkInput.parentElement.appendChild(
    apkInfo
);


apkInput.addEventListener(
    "change",
    function () {

        apkInfo.textContent = "";

        const file =
            apkInput.files[0];

        if (!file) {
            return;
        }

        apkInfo.textContent =
            `Selected: ${file.name}`;

    }
);



// ================================
// SCREENSHOT PREVIEW
// ================================

screenshotInput.addEventListener(
    "change",
    function () {

        screenshotPreview.innerHTML = "";

        const files =
            Array.from(
                screenshotInput.files
            );


        if (files.length > 5) {

            showMessage(
                "You can upload a maximum of 5 screenshots.",
                "error"
            );

            screenshotInput.value = "";

            return;

        }


        files.forEach(
            function (file, index) {

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    return;

                }


                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "screenshot-card";


                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    URL.createObjectURL(
                        file
                    );

                image.alt =
                    `Screenshot ${index + 1}`;


                const number =
                    document.createElement(
                        "span"
                    );

                number.textContent =
                    `${index + 1}`;


                card.appendChild(image);

                card.appendChild(number);

                screenshotPreview.appendChild(
                    card
                );

            }
        );

    }
);



// ================================
// SUBMIT UPLOAD
// ================================

uploadForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // ================================
        // VALIDATE INFORMATION
        // ================================

        if (
            appName.value.trim() === "" ||
            appDeveloper.value.trim() === "" ||
            appVersion.value.trim() === "" ||
            appCategory.value.trim() === "" ||
            appDescription.value.trim() === ""
        ) {

            showMessage(
                "Please fill in all app information.",
                "error"
            );

            return;

        }



        // ================================
        // CHECK LOGO
        // ================================

        if (
            appLogo.files.length === 0
        ) {

            showMessage(
                "Please select an app logo.",
                "error"
            );

            return;

        }


        const logoFile =
            appLogo.files[0];


        if (
            !logoFile.type.startsWith(
                "image/"
            )
        ) {

            showMessage(
                "Please select a valid image for your app logo.",
                "error"
            );

            return;

        }



       // ================================
// CHECK APP FILE
// ================================

if (apkInput.files.length === 0) {

    showMessage(
        "Please select an app file.",
        "error"
    );

    return;

}

const appFile =
    apkInput.files[0];

const allowedExtensions = [
    ".apk",
    ".exe",
    ".msi",
    ".deb",
    ".appimage",
    ".dmg",
    ".app"
];

const fileName =
    appFile.name.toLowerCase();

const validExtension =
    allowedExtensions.some(function (extension) {

        return fileName.endsWith(extension);

    });

if (!validExtension) {

    showMessage(
        "Please select a supported app file.",
        "error"
    );

    return;

}



        // ================================
        // CHECK SCREENSHOTS
        // ================================

        if (
            screenshotInput.files.length > 5
        ) {

            showMessage(
                "You can upload a maximum of 5 screenshots.",
                "error"
            );

            return;

        }



        // ================================
        // CREATE FORM DATA
        // ================================

        const formData =
            new FormData();


        formData.append(
            "app-name",
            appName.value.trim()
        );


        formData.append(
            "app-developer",
            appDeveloper.value.trim()
        );


        formData.append(
            "app-version",
            appVersion.value.trim()
        );


        formData.append(
            "app-category",
            appCategory.value.trim()
        );


        formData.append(
            "app-description",
            appDescription.value.trim()
        );


        formData.append(
            "app-logo",
            logoFile
        );


        formData.append(
            "app-file",
            apkFile
        );



        // ================================
        // ADD SCREENSHOTS
        // ================================

        for (
            const file of screenshotInput.files
        ) {

            formData.append(
                "screenshots[]",
                file
            );

        }



        // ================================
        // UPLOAD STATE
        // ================================

        setUploading(true);



        // ================================
        // SEND TO BACKEND
        // ================================

        try {

            const response =
                await fetch(
                    "https://tekohub.onrender.com/api/apps",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: formData
                    }
                );


            const data =
                await response.json();



            // ================================
            // SUCCESS
            // ================================

            if (response.ok) {

                showMessage(
                    "Your app has been published successfully!",
                    "success"
                );


                uploadForm.reset();


                screenshotPreview.innerHTML =
                    "";


                logoPreview.innerHTML =
                    "";


                apkInfo.textContent =
                    "";


                console.log(
                    "Uploaded app:",
                    data.app
                );


            } else {

                showMessage(
                    data.message ||
                    "Upload failed.",
                    "error"
                );

            }


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            showMessage(
                "Could not connect to the Tekohub server.",
                "error"
            );

        } finally {

            setUploading(false);

        }

    }
);
```

}

// ================================
// UPLOAD BUTTON STATE
// ================================

function setUploading(uploading) {

```
const button =
    document.querySelector(
        ".publish-button"
    );

if (!button) {
    return;
}


if (uploading) {

    button.disabled = true;

    button.innerHTML =
        `
        <span>Publishing...</span>
        `;

} else {

    button.disabled = false;

    button.innerHTML =
        `
        <span>Publish App</span>
        <span>→</span>
        `;

}
```

}

// ================================
// MESSAGE SYSTEM
// ================================

function showMessage(
message,
type
) {

```
let messageBox =
    document.querySelector(
        ".upload-message"
    );


if (!messageBox) {

    messageBox =
        document.createElement(
            "div"
        );

    messageBox.className =
        "upload-message";

    const form =
        document.querySelector(
            "#upload-form"
        );

    form.insertBefore(
        messageBox,
        form.firstChild
    );

}


messageBox.textContent =
    message;


messageBox.className =
    `upload-message ${type}`;


messageBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
});


setTimeout(
    function () {

        messageBox.className =
            "upload-message";

    },
    5000
);
```

}

// ================================
// START
// ================================

checkLogin();
