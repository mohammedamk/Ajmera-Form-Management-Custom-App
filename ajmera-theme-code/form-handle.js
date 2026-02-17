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


  let payload = {};
  let api = "";

  console.log("formData....",formData)

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

  } else if (popupId === "custpopup-callbackreq") {
    payload = {
      data: {
        queryType: formData.request-type,
        name: formData.name || "",
        email: formData.email,
        mobile: formData.mobile-number,
        city: formData.city,
        message: formData.message || "",
        consent: ""
      },
    };
    api = "api/request-callback";
  }

  console.log("Sending Payload:", payload);
  console.log("Sending API:", api);

  try {
    const response = await fetch(
      `/apps/devAjmeraTyres/${api}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json()
    console.log("data..........>",data)
    if (response.ok) {
      console.log("Form submitted successfully!");
      form.reset();
    } else {
      console.log("Failed to submit form.");
    }

  } catch (error) {
    console.error("Error while processing form:", error);
  }
}
