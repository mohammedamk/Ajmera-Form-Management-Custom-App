document.addEventListener("DOMContentLoaded", async () => {

    const citySelect = document.getElementById("city-select");
    const storeSelect = document.getElementById("store-select");
    const vehicleCount = document.getElementById("vehicle-count");

    const showCostBtn = document.getElementById("show-cost-btn");
    const priceWrapper = document.getElementById("price-wrapper");
    const totalPriceEl = document.getElementById("total-price");
    const payNowBtn = document.getElementById("pay-now-btn");

    let locationData = [];
    let selectedCityData = null;

    /* ---------------- FETCH CITY DATA ---------------- */

    try {
        const res = await fetch("/apps/api/campaign-location-prices");
        const json = await res.json();

        if (json.success) {
            locationData = json.data;

            locationData.forEach(item => {
                const option = document.createElement("option");
                option.value = item.city;
                option.textContent = item.city;
                citySelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error("Error fetching location prices", error);
    }

    /* ---------------- CITY CHANGE ---------------- */

    citySelect.addEventListener("change", function () {

        const city = this.value;

        storeSelect.innerHTML = `<option value="">Select Store</option>`;

        selectedCityData = locationData.find(c => c.city === city);

        if (!selectedCityData) return;

        selectedCityData.stores.forEach(store => {
            const option = document.createElement("option");
            option.value = store;
            option.textContent = store;
            storeSelect.appendChild(option);
        });

    });

    /* ---------------- SHOW TOTAL COST ---------------- */

    showCostBtn.addEventListener("click", () => {

        if (!selectedCityData) {
            alert("Please select city");
            return;
        }

        const vehicles = parseInt(vehicleCount.value || 0);

        const total = selectedCityData.price * vehicles;

        totalPriceEl.textContent = total;

        priceWrapper.style.display = "block";

    });

    /* ---------------- PAY NOW ---------------- */

    payNowBtn.addEventListener("click", async () => {

        const form = document.getElementById("campaign-form");

        const name = form.querySelector("[name='contact[name]']").value;
        const email = form.querySelector("[name='contact[email]']").value;
        const mobile = form.querySelector("[name='contact[phone]']").value;
        const city = citySelect.value;
        const store = storeSelect.value;
        const date = form.querySelector("[name='contact[booking_date]']").value;

        const numVehicles = parseInt(vehicleCount.value);

        const vehicles = [];

        for (let i = 1; i <= numVehicles; i++) {

            const number = form.querySelector(`[name='contact[vehicle_number_${i}]']`)?.value || "";
            const make = form.querySelector(`[name='contact[vehicle_make_${i}]']`)?.value || "";
            const model = form.querySelector(`[name='contact[vehicle_model_${i}]']`)?.value || "";

            vehicles.push({
                vehicleNumber: number,
                vehicleMake: make,
                vehicleModel: model
            });

        }

        const payload = {
            data: {
                name,
                email,
                mobile,
                city,
                store,
                date,
                numVehicles,
                vehicles
            }
        };

        try {

            const res = await fetch("/apps/ajmeraTyres/api/campaign", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success) {
                alert("Booking submitted successfully");
                form.reset();
                priceWrapper.style.display = "none";
            } else {
                alert(result.message || "Submission failed");
            }

        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        }

    });

});