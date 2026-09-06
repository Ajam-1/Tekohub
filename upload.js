const token = localStorage.getItem("token");


// ================================
// CHECK LOGIN
// ================================

if (!token) {
    window.location.href = "login.html?returnTo=upload.html";
}


// ================================
// VERIFY LOGIN
// ================================

async function checkLogin() {

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

        console.log("Logged in as:", data.user.username);

        setupUpload();

    } catch (error) {

        console.error("Authentication error:", error);

        alert(
            "Could not connect to the Tekohub server."
        );

    }

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


    // ================================
    // SCREENSHOT PREVIEW
    // ================================

    screenshotInput.addEventListener(
        "change",
        function () {

            const files = screenshotInput.files;

            screenshotPreview.innerHTML = "";

            for (const file of files) {

                if (!file.type.startsWith("image/")) {
                    continue;
                }

                const image =
                    document.createElement("img");

                image.src =
                    URL.createObjectURL(file);

                image.style.width = "100%";
                image.style.height = "190px";
                image.style.objectFit = "cover";
                image.style.borderRadius = "12px";

                screenshotPreview.appendChild(image);

            }

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

                alert(
                    "Please fill in all app information."
                );

                return;
            }


            if (appLogo.files.length === 0) {

    alert("Please select an app logo.");

    return;
}

const logoFile = appLogo.files[0];

if (!logoFile.type.startsWith("image/")) {

    alert("Please select a valid image for your app logo.");

    return;
}

            // ================================
            // CHECK APK
            // ================================

            if (apkInput.files.length === 0) {

                alert("Please select an APK file.");

                return;
            }

            const apkFile = apkInput.files[0];

            if (
                !apkFile.name
                    .toLowerCase()
                    .endsWith(".apk")
            ) {

                alert(
                    "Please select a valid APK file."
                );

                return;
            }


            // ================================
            // CREATE FORM DATA
            // ================================

            const formData = new FormData();

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
            // SEND TO BACKEND
            // ================================

            try {

                alert("Uploading app...");

                const response = await fetch(
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

                    alert(
                        "App uploaded successfully!"
                    );

                    uploadForm.reset();

                    screenshotPreview.innerHTML = "";

                    console.log(
                        "Uploaded app:",
                        data.app
                    );

                } else {

                    alert(
                        data.message ||
                        "Upload failed."
                    );

                }

            } catch (error) {

                console.error(
                    "Upload error:",
                    error
                );

                alert(
                    "Could not connect to the Tekohub server."
                );

            }

        }
    );

}


checkLogin();