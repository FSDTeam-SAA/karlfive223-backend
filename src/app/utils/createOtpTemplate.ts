const createOtpTemplate = (
  code: string,
  name?: string,
  companyName: string = "Your Company"
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #374151;">
  <div style="max-width: 600px; margin: 20px auto; padding: 20px;">
    <!-- Main Card -->
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <header style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Verify your Email</h2>
        <p style="margin: 8px 0 0; font-size: 15px; opacity: 0.95; font-weight: 400;">Secure your ${companyName} account</p>
      </header>
      
      <!-- Body -->
      <main style="padding: 40px 32px; text-align: center;">
        <p style="font-size: 16px; margin: 0 0 20px; color: #374151; line-height: 1.5;">
          Hi ${name ? `<strong>${name}</strong>` : "there"},
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 28px; color: #6b7280;">
          We received a request to verify your account. Please use the following one-time verification code:
        </p>
        
        <!-- OTP Box -->
        <div style="display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #eef2ff 0%, #f0f4ff 100%); padding: 24px 40px; border-radius: 16px; border: 2px solid #e0e7ff; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: 700; color: #4f46e5; letter-spacing: 6px; text-shadow: 0 2px 4px rgba(79, 70, 229, 0.1); display: block;">
            ${code}
          </span>
        </div>
        
        <p style="font-size: 14px; color: #9ca3af; margin: 28px 0 0; line-height: 1.5;">
          This code will expire in <strong style="color: #ef4444;">5 minutes</strong>.<br>
          If you didn't request this verification, please ignore this email.
        </p>
      </main>
      
      <!-- Footer -->
      <footer style="background-color: #f8fafc; text-align: center; padding: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.4;">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.<br>
          <span style="font-size: 12px; color: #d1d5db;">This is an automated message, please do not reply.</span>
        </p>
      </footer>
    </div>
  </div>
</body>
</html>
`;

export default createOtpTemplate;
