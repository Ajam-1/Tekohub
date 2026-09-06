// ========================================
// TEKOHUB CATEGORY PAGE
// ========================================

const API_URL = "https://tekohub.onrender.com";

const categoryGrid =
    document.querySelector(".category-grid");


// ========================================
// GET CATEGORY FROM URL
// ========================================

const params =
    new URLSearchParams(window.location.search);

const selectedCategory =
    params.get("category");


// ========================================
// CREATE RESULTS SECTION
// ========================================

const resultsSection =
    document.createElement("section");

resultsSection.id =
    "category-results";

resultsSection.innerHTML = `

    <div class="category-results-heading">

        <h2 id="category-title">
            Apps
        </h2>

        <p id="category-description">
            Apps in this category
        </p>

    </div>

    <div class="category-apps"></div>

`;

document.body.insertBefore(
    resultsSection,
    document.querySelector("footer")
);


// ========================================
// GET ELEMENTS
// ========================================

const categoryTitle =
    document.querySelector("#category-title");

const categoryDescription =
    document.querySelector("#category-description");

const categoryApps =
    document.querySelector(".category-apps");


// ========================================
// IF NO CATEGORY SELECTED
// ========================================

if (!selectedCategory) {

    resultsSection.style.display = "none";

}


// ========================================
// LOAD APPS
// ========================================

async function loadCategoryApps() {

    try {

        const response =
            await fetch(`${API_URL}/api/apps`);

        if (!response.ok) {

            throw new Error(
                "Failed to load apps"
            );

        }

        const data =
            await response.json();

        const apps =
            data.apps || [];


        // ========================================
        // FILTER BY CATEGORY
        // ========================================

        const filteredApps =
            apps.filter(function (app) {

                return (
                    app.category &&
                    app.category.toLowerCase() ===
                    selectedCategory.toLowerCase()
                );

            });


        // ========================================
        // UPDATE TITLE
        // ========================================

        categoryTitle.textContent =
            selectedCategory;

        categoryDescription.textContent =
            `Apps in ${selectedCategory}`;


        // ========================================
        // DISPLAY RESULTS
        // ========================================

        displayCategoryApps(filteredApps);


    } catch (error) {

        console.error(
            "Error loading category apps:",
            error
        );

        categoryApps.innerHTML = `

            <p class="category-error">
                Unable to load apps.
            </p>

        `;

    }

}


// ========================================
// DISPLAY CATEGORY APPS
// ========================================

function displayCategoryApps(apps) {

    categoryApps.innerHTML = "";


    // ========================================
    // NO APPS
    // ========================================

    if (apps.length === 0) {

        categoryApps.innerHTML = `

            <div class="no-category-apps">

                <h3>No apps found</h3>

                <p>
                    There are currently no apps
                    in the ${selectedCategory} category.
                </p>

            </div>

        `;

        return;

    }


    // ========================================
    // CREATE APP CARDS
    // ========================================

    apps.forEach(function (app) {

        const card =
            document.createElement("div");

        card.className =
            "category-app-card";


        // ========================================
        // FORMAT DOWNLOADS
        // ========================================

        let downloads =
            app.downloads || 0;

        if (downloads >= 1000000) {

            downloads =
                (downloads / 1000000).toFixed(1) + "M";

        } else if (downloads >= 1000) {

            downloads =
                (downloads / 1000).toFixed(1) + "K";

        }


        // ========================================
        // APP CARD
        // ========================================

        card.innerHTML = `

            <div class="category-app-icon">

                ${
                    app.logo

                    ? `
                        <img
                            src="${API_URL}${app.logo}"
                            alt="${app.name} logo"
                        >
                    `

                    : `
                        <div class="app-placeholder">
                            ${app.name
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    `
                }

            </div>


            <div class="category-app-info">

                <h3>
                    ${app.name}
                </h3>

                <p>
                    ${app.developer || "Unknown developer"}
                </p>

                <span>
                    ★ ${Number(app.rating || 0).toFixed(1)}
                    • ${downloads} downloads
                </span>

            </div>


            <button
                class="view-app-btn"
                data-id="${app._id}"
            >
                View App
            </button>

        `;


        // ========================================
        // VIEW APP BUTTON
        // ========================================

        const viewButton =
            card.querySelector(".view-app-btn");

        viewButton.addEventListener(
            "click",
            function () {

                const appId =
                    this.dataset.id;

                window.location.href =
                    `app.html?id=${appId}`;

            }
        );


        categoryApps.appendChild(card);

    });

}


// ========================================
// START
// ========================================

if (selectedCategory) {

    loadCategoryApps();

}