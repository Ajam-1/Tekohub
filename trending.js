// ========================================
// TEKOHUB TRENDING
// ========================================

const trendingList = document.querySelector(".trending-list");


// ========================================
// LOAD TRENDING APPS
// ========================================

async function loadTrendingApps() {

    try {

        const response = await fetch("http://localhost:3000/api/apps");

        if (!response.ok) {
            throw new Error("Failed to load apps");
        }

    const data = await response.json();
const apps = data.apps;

        // Rank apps by downloads first,
        // then rating, then newest upload

        const popularApps = apps.filter(function (app) {
    return (app.downloads || 0) >= 10;
});

        popularApps.sort(function (a, b) {

            if (b.downloads !== a.downloads) {
                return b.downloads - a.downloads;
            }

            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }

            return new Date(b.createdAt) - new Date(a.createdAt);

        });

        // Only show the top 10
        const trendingApps = popularApps.slice(0, 10);

        displayTrendingApps(trendingApps);

    } catch (error) {

        console.error("Error loading trending apps:", error);

        trendingList.innerHTML = `
            <p class="no-results">
                Unable to load trending apps.
            </p>
        `;

    }

}


// ========================================
// DISPLAY TRENDING APPS
// ========================================

function displayTrendingApps(apps) {

    trendingList.innerHTML = "";

    if (apps.length === 0) {

        trendingList.innerHTML = `
            <p class="no-results">
                No apps are trending yet.
            </p>
        `;

        return;
    }


    apps.forEach(function (app, index) {

        const card = document.createElement("div");

        card.className = "trend-card";


        // Format downloads
        let downloads = app.downloads || 0;

        if (downloads >= 1000000) {

            downloads = (downloads / 1000000).toFixed(1) + "M";

        } else if (downloads >= 1000) {

            downloads = (downloads / 1000).toFixed(1) + "K";

        }


        card.innerHTML = `
            <div class="rank">${index + 1}</div>

            <div class="app-icon">
                ${
                    app.logo
                    ? `<img src="http://localhost:3000${app.logo}" alt="${app.name} logo">`
                    : app.name.charAt(0).toUpperCase()
                }
            </div>

            <div class="app-info">

                <h3>${app.name}</h3>

                <p>${app.category}</p>

                <span>
                    ★ ${Number(app.rating || 0).toFixed(1)}
                    • ${downloads} downloads
                </span>

            </div>

            <button onclick="openApp('${app._id}')">
                View App
            </button>
        `;


        trendingList.appendChild(card);

    });

}


// ========================================
// OPEN APP
// ========================================

function openApp(appId) {

    window.location.href = `app.html?id=${appId}`;

}


// ========================================
// START
// ========================================

loadTrendingApps();