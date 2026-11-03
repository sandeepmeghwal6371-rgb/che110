
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. HTML ELEMENTS
    // =====================================

    const form = document.getElementById("route-form");
    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");
    const compareBtn = document.getElementById("compare-btn");
    const sampleBtn = document.getElementById("sample-btn");
    const results = document.getElementById("results");
    const errorBox = document.getElementById("error-message");
    const mapStatus = document.getElementById("map-status");

    let map = null;
    let routeLayer = null;
    let startMarker = null;
    let endMarker = null;

    // =====================================
    // 2. TRAVEL DATA
    // Emission factors are estimates.
    // =====================================

    const modes = [
        {
            id: "car",
            name: "Petrol Car",
            icon: "🚗",
            speed: 38,
            emission: 192,
            fuelRate: 7
        },
        {
            id: "motorcycle",
            name: "Motorcycle",
            icon: "🏍️",
            speed: 35,
            emission: 75,
            fuelRate: 3
        },
        {
            id: "bus",
            name: "City Bus",
            icon: "🚌",
            speed: 25,
            emission: 105,
            fuelRate: 0
        },
        {
            id: "cycling",
            name: "Bicycle",
            icon: "🚲",
            speed: 15,
            emission: 0,
            fuelRate: 0
        },
        {
            id: "walking",
            name: "Walking",
            icon: "🚶",
            speed: 5,
            emission: 0,
            fuelRate: 0
        }
    ];

    // =====================================
    // 3. INITIALIZE MAP
    // =====================================

    function initializeMap() {

        if (typeof L === "undefined") {
            mapStatus.textContent = "Leaflet failed to load";
            showError("Map library could not load. Check your internet connection and reload the page.");
            return;
        }

        map = L.map("map").setView([31.326, 75.576], 11);

        // NEW MAP PROVIDER: ESRI

        const esriTiles =
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

        L.tileLayer(esriTiles, {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }).addTo(map);

        mapStatus.textContent = "Map ready";
    }

    initializeMap();

    // =====================================
    // 4. ERROR HANDLING
    // =====================================

    function showError(message) {
        errorBox.textContent = message;
    }

    function clearError() {
        errorBox.textContent = "";
    }

    // =====================================
    // 5. FIND LOCATION
    // =====================================

    async function findLocation(place) {

        const url =
            "https://photon.komoot.io/api/?q=" +
            encodeURIComponent(place) +
            "&limit=1";

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "Location search service is unavailable. Please try again later."
            );
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error(
                "Location not found: " + place +
                ". Try adding the city and state."
            );
        }

        const point = data.features[0];

        return {
            lat: point.geometry.coordinates[1],
            lon: point.geometry.coordinates[0],
            name: point.properties.name || place
        };
    }

    // =====================================
    // 6. FIND ROAD ROUTE
    // =====================================

    async function findRoadRoute(start, end) {

        const url =
            `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Road routing service unavailable.");
        }

        const data = await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes ||
            data.routes.length === 0
        ) {
            throw new Error("No road route could be calculated.");
        }

        return {
            distance: data.routes[0].distance / 1000,
            time: data.routes[0].duration / 60,
            geometry: data.routes[0].geometry
        };
    }

    // =====================================
    // 7. DISTANCE FALLBACK
    // =====================================

    function straightDistance(a, b) {

        const rad = x => x * Math.PI / 180;

        const dLat = rad(b.lat - a.lat);
        const dLon = rad(b.lon - a.lon);

        const lat1 = rad(a.lat);
        const lat2 = rad(b.lat);

        const value =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;

        return 6371 * 2 *
            Math.atan2(
                Math.sqrt(value),
                Math.sqrt(1 - value)
            );
    }

    // =====================================
    // 8. DRAW ROUTE ON MAP
    // =====================================

    function drawRoute(start, end, geometry) {

        if (!map) return;

        // Remove previous route and markers.

        if (routeLayer) map.removeLayer(routeLayer);
        if (startMarker) map.removeLayer(startMarker);
        if (endMarker) map.removeLayer(endMarker);

        startMarker = L.marker([
            start.lat,
            start.lon
        ]).addTo(map).bindPopup("Starting Point");

        endMarker = L.marker([
            end.lat,
            end.lon
        ]).addTo(map).bindPopup("Destination");

        if (geometry && geometry.coordinates) {

            const coordinates =
                geometry.coordinates.map(point => [
                    point[1],
                    point[0]
                ]);

            routeLayer = L.polyline(coordinates, {
                color: "#28745c",
                weight: 6,
                opacity: 0.9
            }).addTo(map);

            map.fitBounds(routeLayer.getBounds(), {
                padding: [35, 35]
            });

        } else {

            // Show a straight connector if road routing fails.
            // This is NOT a road route.

            routeLayer = L.polyline([
                [start.lat, start.lon],
                [end.lat, end.lon]
            ], {
                color: "#d17a54",
                weight: 4,
                dashArray: "8, 8"
            }).addTo(map);

            map.fitBounds(routeLayer.getBounds(), {
                padding: [35, 35]
            });
        }

        setTimeout(() => {
            map.invalidateSize();
        }, 250);
    }

    // =====================================
    // 9. FORMAT TIME
    // =====================================

    function formatTime(minutes) {

        const total = Math.max(1, Math.round(minutes));

        if (total < 60) {
            return total + " min";
        }

        const hours = Math.floor(total / 60);
        const remaining = total % 60;

        return hours + " hr " + remaining + " min";
    }

    // =====================================
    // 10. CALCULATE TRAVEL COMPARISON
    // =====================================

    function calculateComparison(distance, carTime, approximate) {

        const comparisons = modes.map(mode => {

            const actualDistance =
                (mode.id === "walking" || mode.id === "cycling")
                    ? distance * 1.08
                    : distance;

            const time =
                mode.id === "car"
                    ? carTime
                    : (actualDistance / mode.speed) * 60;

            const fuel =
                mode.fuelRate > 0
                    ? actualDistance * mode.fuelRate / 100
                    : 0;

            const co2 =
                actualDistance * mode.emission / 1000;

            return {
                ...mode,
                distance: actualDistance,
                time: time,
                fuel: fuel,
                co2: co2
            };
        });

        showComparison(comparisons, distance, approximate);
    }

    // =====================================
    // 11. DISPLAY RESULTS
    // =====================================

    function showComparison(data, distance, approximate) {

        const best = [...data].sort(
            (a, b) => a.co2 - b.co2
        )[0];

        const car = data.find(item => item.id === "car");

        const saved = Math.max(0, car.co2 - best.co2);

        document.getElementById("route-summary").textContent =
            "Road distance: " + distance.toFixed(2) +
            " km | " +
            (approximate
                ? "Approximate distance"
                : "Road route calculated");

        document.getElementById("best-option").textContent =
            "Lowest estimated direct emissions: " +
            best.name + ". Estimated CO2: " +
            best.co2.toFixed(3) + " kg.";

        const table = document.getElementById("comparison-body");

        table.innerHTML = "";

        data.forEach(item => {

            const row = document.createElement("tr");

            const fuelText = item.fuelRate > 0
                ? item.fuel.toFixed(2) + " L petrol"
                : item.id === "bus"
                    ? "Shared passenger estimate"
                    : "No fuel";

            row.innerHTML = `
                <td>
                    <div class="mode-cell">
                        <span class="mode-icon">${item.icon}</span>
                        <span>
                            ${item.name}
                            ${item.id === best.id
                                ? '<span class="recommended">LOWEST CO2</span>'
                                : ''}
                        </span>
                    </div>
                </td>
                <td>${item.distance.toFixed(2)} km</td>
                <td>${formatTime(item.time)}</td>
                <td>${fuelText}</td>
                <td class="emission">${item.co2.toFixed(3)} kg</td>
            `;

            table.appendChild(row);
        });

        document.getElementById("saved-amount").textContent =
            saved.toFixed(2);

        document.getElementById("impact-title").textContent =
            "Make a greener travel choice.";

        document.getElementById("impact-copy").textContent =
            "Choosing " + best.name +
            " instead of a petrol car could avoid approximately " +
            saved.toFixed(2) +
            " kg of direct CO2 emissions on this journey.";

        document.getElementById("estimate-note").textContent =
            "Assumptions: Petrol car 192 g CO2/km and 7 L/100 km; " +
            "motorcycle 75 g CO2/km and 3 L/100 km; bus 105 g CO2 " +
            "per passenger-km; bicycle and walking zero direct " +
            "operational CO2. Actual emissions vary by vehicle, " +
            "occupancy, traffic, energy source and route. " +
            "Walking and cycling distances are approximate. " +
            (approximate
                ? "Road routing failed; the distance is estimated using a straight-line calculation."
                : "");

        results.hidden = false;

        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 12. MAIN PLANNER
    // =====================================

    async function planRoute(origin, destination) {

        clearError();

        if (!origin || !destination) {
            showError("Please enter both locations.");
            return;
        }

        if (origin.toLowerCase() === destination.toLowerCase()) {
            showError("Starting point and destination must be different.");
            return;
        }

        compareBtn.disabled = true;
        compareBtn.textContent = "Calculating route...";

        mapStatus.textContent = "Finding locations...";
        results.hidden = true;

        try {

            // Find both locations.

            const [start, end] = await Promise.all([
                findLocation(origin),
                findLocation(destination)
            ]);

            let distance;
            let duration;
            let geometry = null;
            let approximate = false;

            mapStatus.textContent = "Finding road route...";

            // Try road routing.

            try {

                const route = await findRoadRoute(start, end);

                distance = route.distance;
                duration = route.time;
                geometry = route.geometry;

            } catch (routeError) {

                // Straight-line estimate if routing service fails.

                distance = straightDistance(start, end) * 1.25;
                duration = distance / 38 * 60;
                approximate = true;
            }

            if (!Number.isFinite(distance) || distance <= 0) {
                throw new Error("Invalid route distance.");
            }

            // Display route.

            drawRoute(start, end, geometry);

            mapStatus.textContent =
                approximate
                    ? "Approximate connector shown"
                    : "Road route loaded";

            // Calculate travel options.

            calculateComparison(
                distance,
                duration,
                approximate
            );

        } catch (error) {

            console.error("EcoRoute error:", error);

            mapStatus.textContent = "Route unavailable";

            showError(error.message || "Unable to calculate the route. Please try again.");

        } finally {

            compareBtn.disabled = false;
            compareBtn.textContent = "Compare Travel Options →";
        }
    }

    // =====================================
    // 13. FORM SUBMISSION
    // =====================================

    form.addEventListener("submit", function(event) {

        event.preventDefault();

        planRoute(
            originInput.value.trim(),
            destinationInput.value.trim()
        );
    });

    // =====================================
    // 14. SAMPLE ROUTE
    // =====================================

    sampleBtn.addEventListener("click", function() {

        originInput.value =
            "Lovely Professional University, Phagwara, Punjab, India";

        destinationInput.value =
            "Jalandhar City Railway Station, Punjab, India";

        planRoute(
            originInput.value,
            destinationInput.value
        );
    });

    console.log("EcoRoute successfully initialized!");

});
