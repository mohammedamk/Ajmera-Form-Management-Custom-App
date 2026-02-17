async function handleFormSubmission(form) {

  const popupId = form.closest(".custompopup-modal").id;
  console.log("Popup Submitted:", popupId);

  let formData = {};

  form.querySelectorAll("input, textarea, select").forEach((field) => {
    if (!field.name || field.type === "hidden") return;

    const key = field.name.replace("contact[", "").replace("]", "");

    if (field.type === "checkbox") {
      formData[key] = field.checked;
    } else if (field.type === "radio") {
      if (field.checked) {
        formData[key] = field.value;
      }
    } else {
      formData[key] = field.value;
    }
  });

  form.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      clearSuccessMessage(form);
      const key = field.name.replace("contact[", "").replace("]", "");

      const errorElement = form.querySelector(
        `.field-error[data-error-for="${key}"]`
      );

      if (errorElement) {
        errorElement.textContent = "";
        errorElement.classList.remove("active");
      }
    });
  });



  let payload = {};
  let api = "";

  console.log("formData....", formData)

  if (popupId === "custpopup-contactus") {
    payload = {
      data: {
        name: formData.name || "",
        email: formData.email || "",
        mobile: formData["mobile-number"] || "",
        city: formData.city || "",
        message: formData.message || "",
        consent: formData.userconsent || false
      },
    };
    api = "api/contact-us";

  } else if (popupId === "custpopup-callbackreq" || popupId === "custpopup-callbackreqbottom") {
    payload = {
      data: {
        queryType: formData["request-type"],
        name: formData.name || "",
        email: formData.email,
        mobile: formData["mobile-number"],
        city: formData.city,
        message: formData.message || "",
        consent: formData.userconsent || false,
        vehicleNumber: formData["vehicle-number"] || ""
      },
    };
    api = "api/request-callback";
  } else if (popupId === "offerpage") {
     payload = {
      data: {
        name: formData.name || "",
        email: formData.email || "",
        mobile: formData["mobile-number"] || "",
        city: formData.city || "",
        offer: formData.offer || "",
        message: formData.message || "",
        consent: formData.userconsent || false
      },
    };
    api = "api/product-offer";
  } else if (popupId === "product-enquiry"){
    payload = {
      data: {
        name: formData.name || "",
        email: formData.email || "",
        mobile: formData["mobile-number"] || "",
        city: formData.city || "",
        product: formData.product || "",
        message: formData.message || "",
        consent: formData.userconsent || false
      },
    };
    api = "api/product-enquiry";
  } else if (popupId === "service-enquiry"){
    payload = {
      data: {
        name: formData.name || "",
        email: formData.email || "",
        mobile: formData["mobile-number"] || "",
        city: formData.city || "",
        service: formData.service || "",
        message: formData.message || "",
        consent: formData.userconsent || false
      },
    };
    api = "api/service-enquiry";
  } else if (popupId === "careers-apply-form") {
    payload = {
      data: {
        name: formData.name || "",
        email: formData.email || "",
        mobile: formData["mobile-number"] || "",
        city: formData.city || "",
        role: formData.role || "",
        portfolio: formData.portfolio || ""
      },
    };
    api = "api/apply-technician";
  }


  console.log("Sending Payload:", payload);
  console.log("Sending API:", api);
  if (payload && api){
    try {
      const response = await fetch(`/apps/devAjmeraTyres/${api}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
  
      console.log("Backend Response:", result);
  
      clearErrors(form);
      clearSuccessMessage(form);
      if (!response.ok) {
        if (result.errors) {
          showFieldErrors(form, result.errors);
        }
        return;
      }
  
      console.log("Form submitted successfully!");
      showSuccessMessage(form, "Thank you! Your form was submitted successfully.");
      // form.reset();
  
    } catch (error) {
      console.error("Error while processing form:", error);
    }
  }
}

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.classList.remove("active");
  });
}

function showFieldErrors(form, errors) {
  Object.keys(errors).forEach((fieldName) => {
    const errorElement = form.querySelector(
      `.field-error[data-error-for="${fieldName}"]`
    );

    if (errorElement) {
      errorElement.textContent = errors[fieldName];
      errorElement.classList.add("active");
    }
  });
}

function showSuccessMessage(form, message) {
  const successBox = form.querySelector(".form-success-message");

  if (successBox) {
    successBox.textContent = message;
    successBox.classList.add("active");

    setTimeout(() => {
      successBox.textContent = "";
      successBox.classList.remove("active");
    }, 4000);
  }
}

function clearSuccessMessage(form) {
  const successBox = form.querySelector(".form-success-message");

  if (successBox) {
    successBox.textContent = "";
    successBox.classList.remove("active");
  }
}

