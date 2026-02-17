import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  subject: string;
  data: Record<string, any>;
  formType: "Call Back" | "Product Enquiry" | "Service Enquiry"| "Contact Us" | "Applying Technician" | "Product Offer";
}

export async function sendAdminEmail({ subject, data, formType }: EmailOptions) {
  // logic to find the customer's email address for the 'Reply' button
  const customerEmail = data.Email || data.email || "";

  const tableRows = Object.entries(data)
    .map(([key, value], index) => {
      // highlighting the 'Category' row specifically if it exists
      const isCategory = key.toLowerCase() === "category" || key.toLowerCase() === "query type";
      const rowBg = isCategory ? "#fff9c4" : (index % 2 === 0 ? "#f9f9f9" : "#ffffff");
      const textColor = isCategory ? "#d32f2f" : "#333333";

      return `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 12px; border: 1px solid #eeeeee; font-weight: bold; width: 35%; color: #555555;">${key}</td>
          <td style="padding: 12px; border: 1px solid #eeeeee; color: ${textColor}; font-weight: ${isCategory ? "bold" : "normal"};">${value || "N/A"}</td>
        </tr>
      `;
    })
    .join("");

  const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #004a99; color: #ffffff; padding: 25px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">New Website Lead</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Source: ${formType} Form</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333333; line-height: 1.5;">Hello Admin,<br>You have received a new enquiry. Details are provided below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th colspan="2" style="background-color: #f2f2f2; padding: 12px; border: 1px solid #eeeeee; text-align: left; color: #004a99; font-size: 14px; text-transform: uppercase;">Submission Details</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        ${customerEmail ? `
        <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #eeeeee; text-align: center;">
          <a href="mailto:${customerEmail}?subject=Re: ${subject}" style="background-color: #004a99; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            Quick Reply to Customer
          </a>
        </div>` : ''}
      </div>

      <div style="background-color: #f4f4f4; color: #777777; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">This is an automated notification from the Ajmera Tyre Website.</p>
      </div>
    </div>
  `;

  console.log("htmlTemplate............> ", htmlTemplate);
  return 
  const mailOptions = {
    from: `"Website Leads" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `[LEAD] ${formType}: ${subject}`,
    html: htmlTemplate,
  };

  return transporter.sendMail(mailOptions);
}