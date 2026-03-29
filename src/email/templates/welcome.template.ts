/**
 * Welcome Email Template
 */
export function welcomeTemplate(vars: {
  appName: string;
  firstName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a237e, #283593); color: #ffffff; text-align: center; padding: 36px 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 32px 24px; color: #333; }
    .body h2 { color: #1a237e; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${vars.appName}!</h1>
    </div>
    <div class="body">
      <h2>Hello ${vars.firstName},</h2>
      <p>Welcome to ${vars.appName}! Your account has been created successfully.</p>
      <p>You can now browse our events, register for upcoming programs, and stay connected with our community.</p>
      <p>God bless you! 🙏</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${vars.appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
