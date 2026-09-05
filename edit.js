const token = localStorage.getItem("token");


// ================================
// CHECK LOGIN
// ================================

if (!token) {

    const currentPage =
        window.location.pathname.split("/").pop() +
        window.location.search;

    window.location.href =
        "login.html?returnTo=" +
        encodeURIComponent(currentPage);

}


// ================================
// GET APP ID
// ================================

const params =
    new URLSearchParams(window.location.search);

const appId =
    params.get("id");


// ================================
// ELEMENTS
// ================================

const form =
    document.querySelector("#edit-form");

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

const appFile =
    document.querySelector("#app-file");

const screenshots =
    document.querySelector("#screenshots");

const saveButton =
    document.querySelector("#save-button");

const message =
    document.querySelector("#message");


// ================================
// CHECK APP ID
// ================================

if (!appId) {

    message.textContent =
        "No app was selected.";

    saveButton.disabled = true;

} else {

    loadApp();

}


// ================================
// LOAD APP
// ================================

async function loadApp() {

    try {

        const response =
            await fetch(
                `http://localhost:3000/api/apps/${appId}`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not load app."
            );

        }

        const app =
            data.app;

        appName.value =
            app.name || "";

        appDeveloper.value =
            app.developer || "";

        appVersion.value =
            app.version || "";

        appCategory.value =
            app.category || "";

        appDescription.value =
            app.description || "";

    } catch (error) {

        console.error(
            "Load app error:",
            error
        );

        message.textContent =
            error.message ||
            "Could not load app.";

        saveButton.disabled = true;

    }

}


// ================================
// SUBMIT EDIT
// ================================

form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        if (!appId) {
            return;
        }

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

        message.textContent = "";

        const formData =
            new FormData();

        // ============================
        // APP INFORMATION
        // ============================

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
            appCategory.value
        );

        formData.append(
            "app-description",
            appDescription.value.trim()
        );


        // ============================
        // NEW LOGO
        // ============================

        if (appLogo.files.length > 0) {

            formData.append(
                "app-logo",
                appLogo.files[0]
            );

        }


        // ============================
        // NEW APK
        // ============================

        if (appFile.files.length > 0) {

            formData.append(
                "app-file",
                appFile.files[0]
            );

        }


        // ============================
        // NEW SCREENSHOTS
        // ============================

        for (
            const file
            of screenshots.files
        ) {

            formData.append(
                "screenshots[]",
                file
            );

        }


        // ============================
        // SEND UPDATE
        // ============================

        try {

            const response =
                await fetch(
                    `http://localhost:3000/api/apps/${appId}`,
                    {
                        method: "PUT",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: formData
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to update app."
                );

            }

            message.textContent =
                "App updated successfully.";

            saveButton.textContent =
                "Saved!";

            setTimeout(
                function() {

                    window.location.href =
                        "profile.html";

                },
                1000
            );

        } catch (error) {

            console.error(
                "Edit error:",
                error
            );

            message.textContent =
                error.message ||
                "Could not update app.";

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Changes";

        }

    }
);