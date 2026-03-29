/**
 * Registration Confirmation Email Template
 */
export function registrationConfirmationTemplate(vars: {
  appName: string;
  firstName: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  dailySchedule?: string;
  location: string;
  address?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 40px 0; }
    .main { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .hero { background: linear-gradient(135deg, #111827, #374151); padding: 48px 32px; text-align: center; color: #ffffff; }
    .hero h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .hero p { margin: 12px 0 0; font-size: 16px; color: #9ca3af; }
    .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
    .content h2 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
    .event-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 6px solid #3b82f6; }
    .event-card ul { list-style: none; padding: 0; margin: 0; }
    .event-card li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; display: flex; align-items: flex-start; }
    .event-card li:last-child { border-bottom: none; padding-bottom: 0; }
    .event-card strong { color: #111827; min-width: 90px; display: inline-block; }
    .cta-box { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
    .footer { background-color: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero">
        <h1>${vars.appName}</h1>
        <p>Registration Confirmed</p>
      </div>
      <div class="content">
        <h2>Hello ${vars.firstName},</h2>
        <p>You're all set! Your registration for <strong>${vars.eventTitle}</strong> has been successfully confirmed. We are thrilled to host you and believe God is preparing something special for this event.</p>
        
        <div class="event-card">
          <ul>
            <li><strong>📅 Date:</strong> <span>${vars.startDate} ${vars.startDate !== vars.endDate ? ` — ${vars.endDate}` : ''}</span></li>
            ${vars.dailySchedule ? `<li><strong>🕘 Schedule:</strong> <span>${vars.dailySchedule}</span></li>` : ''}
            <li><strong>📍 Venue:</strong> <span>${vars.location}</span></li>
            ${vars.address ? `<li><strong>🗺️ Address:</strong> <span>${vars.address}</span></li>` : ''}
          </ul>
        </div>

        <div class="cta-box">
          <a href="#" class="cta-button">Mark Your Calendar</a>
        </div>

        <p>If you have any questions or need special accommodations, please don't hesitate to reach out to our team.</p>
        <p>Prepared with joy,<br><strong>The ${vars.appName} Team</strong> 🕊️</p>
      </div>
      <div class="footer">
        <p>You received this email because you registered for an event at ${vars.appName}.</p>
        <p>&copy; ${new Date().getFullYear()} ${vars.appName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
