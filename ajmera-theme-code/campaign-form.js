document.addEventListener("DOMContentLoaded", async () => {

    const citySelect = document.getElementById("city-select");
    const storeSelect = document.getElementById("store-select");
    const vehicleCount = document.getElementById("vehicle-count");

    const showCostBtn = document.getElementById("show-cost-btn");
    const priceWrapper = document.getElementById("price-wrapper");
    const totalPriceEl = document.getElementById("total-price");
    const payNowBtn = document.getElementById("pay-now-btn");

    const formMessage = document.getElementById("form-message");
    const form = document.getElementById("campaign-form");

    // Razorpay publishable key injected via Liquid (section.settings.razorpay_key_id)
    const rzpKey = form.dataset.rzpKey;

    let locationData = [];
    let selectedCityData = null;

    /* ---------------- UI HELPERS ---------------- */

    function clearErrors() {
        document.querySelectorAll(".error-msg").forEach(el => el.remove());
    }

    function clearMessage() {
        formMessage.innerHTML = "";
    }

    function showMessage(message, type = "error") {
        formMessage.innerHTML = message;
        formMessage.style.color = type === "success" ? "green" : "red";
    }

    function showError(input, message) {
        const error = document.createElement("small");
        error.className = "error-msg";
        error.style.color = "red";
        error.innerText = message;
        input.parentNode.appendChild(error);
    }

    function resetPayNowButton() {
        payNowBtn.disabled = false;
        payNowBtn.innerText = "Pay Now";
    }
    function resetPricingUI() {
        priceWrapper.style.display = "none";
        totalPriceEl.textContent = "0";

        resetPayNowButton(); // resetting disabled + text
        clearErrors();
        clearMessage();
    }

    /* ---------------- FETCH CITY DATA ---------------- */

    try {

        const res = await fetch("/apps/ajmeraTyres/api/campaign-location-prices");
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
        showMessage("Unable to load cities.");
    }

    /* ---------------- CITY CHANGE ---------------- */
    storeSelect.addEventListener("change", resetPricingUI);

    citySelect.addEventListener("change", function () {

        const city = this.value;

        // resetting UI 
        resetPricingUI();

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

        clearErrors();
        clearMessage();

        if (!citySelect.value) {
            showError(citySelect, "Please select a city");
            return;
        }

        if (!storeSelect.value) {
            showError(storeSelect, "Please select a store");
            return;
        }

        if (!selectedCityData) return;

        const vehicles = parseInt(vehicleCount.value || 0);

        const total = selectedCityData.price * vehicles;

        totalPriceEl.textContent = total;

        priceWrapper.style.display = "block";

    });

    /* ---------------- PAY NOW ---------------- */

    payNowBtn.addEventListener("click", async () => {

        clearErrors();
        clearMessage();
        payNowBtn.disabled = true;
        payNowBtn.innerText = "Processing...";

        const name = form.querySelector("[name='contact[name]']").value;
        const email = form.querySelector("[name='contact[email]']").value;
        const mobile = form.querySelector("[name='contact[phone]']").value;
        const city = citySelect.value;
        const store = storeSelect.value;
        const date = form.querySelector("[name='contact[booking_date]']").value;

        const numVehicles = parseInt(vehicleCount.value);

        const vehicles = [];

        for (let i = 1; i <= numVehicles; i++) {

            const numberInput = form.querySelector(`[name='contact[vehicle_number_${i}]']`);
            const makeInput = form.querySelector(`[name='contact[vehicle_make_${i}]']`);
            const modelInput = form.querySelector(`[name='contact[vehicle_model_${i}]']`);

            vehicles.push({
                vehicleNumber: numberInput?.value || "",
                vehicleMake: makeInput?.value || "",
                vehicleModel: modelInput?.value || ""
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

        const total = parseInt(totalPriceEl.textContent);

        if (!total || total <= 0) {
            showMessage("Please calculate total cost first.");
            resetPayNowButton();
            return;
        }

        try {
            // step 1: creating order
            const orderRes = await fetch("/apps/ajmeraTyres/api/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ amount: total, payload })
            });

            const orderData = await orderRes.json();

            if (orderData.errors) {

                const errors = orderData.errors;

                if (errors.name) {
                    showError(form.querySelector("[name='contact[name]']"), errors.name);
                }

                if (errors.email) {
                    showError(form.querySelector("[name='contact[email]']"), errors.email);
                }

                if (errors.mobile) {
                    showError(form.querySelector("[name='contact[phone]']"), errors.mobile);
                }

                if (errors.date) {
                    showError(form.querySelector("[name='contact[booking_date]']"), errors.date);
                }

                if (errors.city) {
                    showError(citySelect, errors.city);
                }

                if (errors.store) {
                    showError(storeSelect, errors.store);
                }

                for (let i = 0; i < numVehicles; i++) {

                    if (errors[`vehicle_${i}_number`]) {
                        showError(
                            form.querySelector(`[name='contact[vehicle_number_${i + 1}]']`),
                            errors[`vehicle_${i}_number`]
                        );
                    }

                    if (errors[`vehicle_${i}_make`]) {
                        showError(
                            form.querySelector(`[name='contact[vehicle_make_${i + 1}]']`),
                            errors[`vehicle_${i}_make`]
                        );
                    }

                    if (errors[`vehicle_${i}_model`]) {
                        showError(
                            form.querySelector(`[name='contact[vehicle_model_${i + 1}]']`),
                            errors[`vehicle_${i}_model`]
                        );
                    }

                }

                showMessage("Please correct the highlighted fields.");
                resetPayNowButton();
                return;
            }

            if (!orderData.success) {
                showMessage("Failed to initiate payment");
                resetPayNowButton();
                return;
            }

            const order = orderData.order;

            const options = {
                key: rzpKey,
                amount: order.amount,
                currency: order.currency,
                name: "Ajmera Tyres",
                description: "Campaign Booking",
                order_id: order.id,

                handler: async function (response) {

                    const verifyRes = await fetch("/apps/ajmeraTyres/api/verify-payment", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            // formData is no longer needed here — the webhook fetches
                            // booking details from MongoDB using razorpay_order_id
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        showMessage("Payment successful & booking confirmed!", "success");
                        form.reset();
                        resetPayNowButton();
                        priceWrapper.style.display = "none";
                    } else {
                        showMessage("Payment verification failed");
                        resetPayNowButton();
                    }
                },
                modal: {
                    ondismiss: function () {
                        showMessage("Payment cancelled.");
                        resetPayNowButton();
                    }
                },
                prefill: {
                    name,
                    email,
                    contact: mobile
                },

                theme: {
                    color: "#1e3a8a"
                }
            };

            const rzp = new Razorpay(options);

            rzp.on("payment.failed", function () {
                showMessage("Payment failed. Please try again.");
                resetPayNowButton();
            });

            rzp.open();

        } catch (error) {
            showMessage("Something went wrong. Please try again.");
            resetPayNowButton();
        }
    });

});