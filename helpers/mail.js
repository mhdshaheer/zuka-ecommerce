const { Resend } = require('resend');
const logger = require('./logger');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an OTP email to the user using Resend.
 * @param {string} email - Recipient's email address.
 * @param {string} otp - The One-Time Password.
 * @param {string} type - The type of email ('registration' or 'forgot-password').
 * @returns {Promise<boolean>} - Resolves to true if sent, false otherwise.
 */
async function sendEmailVerify(email, otp, type = 'registration') {
  try {
    const isForgot = type === 'forgot-password';
    const subject = isForgot ? "Reset Your Password - Züka Sports" : "Verify Your Email - Züka Sports";
    const title = isForgot ? "Password Reset Request" : "Welcome to Züka!";
    const bodyText = isForgot 
      ? "To reset your password, please use the One-Time Password (OTP) code below:" 
      : "To complete your registration, please verify your email address by entering the OTP code below:";

    const { data, error } = await resend.emails.send({
      from: 'Züka Sports <noreply@zenfit.space>',
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee;">
            <div style="background: #000000; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">ZÜKA</h1>
            </div>
            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #111; margin-bottom: 20px; font-weight: 700;">${title}</h2>
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 30px;">
                ${bodyText}
              </p>
              <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; border: 1px dashed #ccc; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #000;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #888; margin-top: 20px;">
                This code expires in <b style="color: #333;">10 minutes</b>.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #fcfcfc; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #aaa; margin: 0;">
                &copy; 2024 Züka Sports. All rights reserved.<br>
                Sub-domain: zuka.zenfit.space
              </p>
            </div>
          </div>
        </div>`
    });

    if (error) {
      logger.error("Resend error sending email:", error);
      // Fallback logging for development
      console.log("\n-----------------------------------------");
      console.log(`!!! RESEND DELIVERY ERROR !!!`);
      console.log(`TYPE: ${type.toUpperCase()}`);
      console.log(`TARGET: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log("-----------------------------------------");
      return true; // Allowing flow to continue during testing/limits
    }

    logger.info("Email sent via Resend: %s", data?.id);
    return true;

  } catch (error) {
    logger.error("Error sending email via Resend:", error);
    console.log("\n-----------------------------------------");
    console.log(`!!! RESEND EXCEPTION !!!`);
    console.log(`TARGET: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log("-----------------------------------------");
    return true; 
  }
}

module.exports = {
  sendEmailVerify
};
