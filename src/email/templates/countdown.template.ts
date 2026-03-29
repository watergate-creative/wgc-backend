/**
 * Countdown Email Template
 */
export function countdownTemplate(vars: {
  appName: string;
  firstName: string;
  eventTitle: string;
  startDate: string;
  daysRemaining: number;
  dailySchedule?: string;
  location: string;
  address?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #004d40, #00796b); color: #ffffff; text-align: center; padding: 36px 24px; }
    .header h1 { margin: 0; font-size: 28px; }
    .body { padding: 32px 24px; color: #333; }
    .body h2 { color: #004d40; }
    .countdown { text-align: center; margin: 24px 0; padding: 20px; background: #e0f2f1; border-radius: 8px; font-size: 24px; font-weight: bold; color: #004d40; border: 2px dashed #00796b; }
    .detail { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #004d40; }
    .detail p { margin: 6px 0; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏳ ${vars.daysRemaining} Day${vars.daysRemaining > 1 ? 's' : ''} to Go!</h1>
    </div>
    <div class="body">
      <h2>Hello ${vars.firstName},</h2>
      <p>The highly anticipated <strong>${vars.eventTitle}</strong> is just around the corner!</p>
      <div class="countdown">
        ${vars.daysRemaining} Day${vars.daysRemaining > 1 ? 's' : ''} Remaining
      </div>
      <div class="detail">
        <p><strong>📅 Date:</strong> ${vars.startDate}</p>
        ${vars.dailySchedule ? `<p><strong>🕘 Schedule:</strong> ${vars.dailySchedule}</p>` : ''}
        <p><strong>📍 Location:</strong> ${vars.location}</p>
        ${vars.address ? `<p><strong>🗺️ Address:</strong> ${vars.address}</p>` : ''}
      </div>
      <p>Please prepare your heart, invite a friend, and get ready for a mighty move of God. We can't wait to host you!</p>
      <p>God bless you! 🙏</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${vars.appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
