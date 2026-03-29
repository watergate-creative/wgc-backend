/**
 * Event Reminder Email Template
 */
export function eventReminderTemplate(vars: {
  appName: string;
  firstName: string;
  eventTitle: string;
  startDate: string;
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
    .header { background: linear-gradient(135deg, #e65100, #f57c00); color: #ffffff; text-align: center; padding: 36px 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 32px 24px; color: #333; }
    .body h2 { color: #e65100; }
    .detail { background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #e65100; }
    .detail p { margin: 6px 0; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 Event Reminder</h1>
    </div>
    <div class="body">
      <h2>Hello ${vars.firstName},</h2>
      <p>This is a friendly reminder that <strong>${vars.eventTitle}</strong> is coming up soon!</p>
      <div class="detail">
        <p><strong>📅 Date:</strong> ${vars.startDate}</p>
        ${vars.dailySchedule ? `<p><strong>🕘 Schedule:</strong> ${vars.dailySchedule}</p>` : ''}
        <p><strong>📍 Location:</strong> ${vars.location}</p>
        ${vars.address ? `<p><strong>🗺️ Address:</strong> ${vars.address}</p>` : ''}
      </div>
      <p>We can't wait to see you there! God bless you! 🙏</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${vars.appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
