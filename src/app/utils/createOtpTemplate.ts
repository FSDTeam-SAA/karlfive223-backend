const createOtpTemplate = (
  code: string,
  name?: string,
  companyName: string = "Your Company"
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verification</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background-color:#f3f4f6; color:#374151;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:600px; margin:auto; padding:20px;">
    <tr>
      <td>
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.06); overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#4f46e5,#6366f1); padding:28px 20px; color:#fff;">
              <h2 style="margin:0; font-size:22px; font-weight:600;">Verify Your Email</h2>
              <p style="margin:6px 0 0; font-size:14px; opacity:0.9;">Secure your ${companyName} account</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:36px 28px; text-align:center;">
              <p style="font-size:15px; margin:0 0 16px; color:#374151;">
                Hi ${name ? `<strong>${name}</strong>` : "there"},
              </p>
              <p style="font-size:15px; color:#6b7280; margin:0 0 28px; line-height:1.6;">
                We received a request to verify your account. Please use the following one-time code:
              </p>
              
              <!-- OTP -->
              <div style="display:inline-block; padding:18px 32px; background:linear-gradient(135deg,#eef2ff,#f9faff); border:2px solid #e0e7ff; border-radius:10px; margin:12px 0;">
                <span style="font-size:32px; font-weight:700; color:#4f46e5; letter-spacing:6px; text-shadow:0 1px 3px rgba(79,70,229,0.2);">
                  ${code}
                </span>
              </div>
              
              <p style="font-size:13px; color:#9ca3af; margin:24px 0 0; line-height:1.5;">
                This code will expire in <strong style="color:#ef4444;">5 minutes</strong>.<br />
                If you didn’t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; text-align:center; padding:20px; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.<br />
                <span style="font-size:11px; color:#d1d5db;">This is an automated message. Do not reply.</span>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default createOtpTemplate;
