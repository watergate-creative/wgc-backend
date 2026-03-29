/**
 * Form Submission Email Template
 *
 * Shared layout for all form types. Per-type content (heading, message)
 * is resolved via the FORM_CONTENT map keyed by FormType value.
 */

export interface FormTemplateVars {
  appName: string;
  fullName: string;
  formType: string;
  data?: Record<string, unknown>;
}

// ─── PER-TYPE CONTENT ──────────────────────────────────────────

interface FormTypeContent {
  heading: string;
  subject: string;
  message: string;
}

export function getFormSubject(formType: string, appName: string): string {
  const content = FORM_CONTENT[formType];
  return content
    ? content.subject.replace(/\{\{appName\}\}/g, appName)
    : `Form Submission Confirmed — ${appName}`;
}

const FORM_CONTENT: Record<string, FormTypeContent> = {
  Volunteer: {
    heading: '🤝 Volunteer Registration',
    subject: 'Thank you for volunteering at {{appName}}!',
    message:
      'Thank you for signing up to volunteer at {{appName}}! Your willingness to serve is a blessing. Our team will review your application and reach out to you shortly with next steps.',
  },
  'Naming Ceremony': {
    heading: '👶 Naming Ceremony Registration',
    subject: 'Naming Ceremony Registration Confirmed — {{appName}}',
    message:
      'We are delighted that you have registered for a naming ceremony at {{appName}}. This is a joyous occasion and we look forward to celebrating with your family. Our team will contact you to confirm the details.',
  },
  'New Comers': {
    heading: '🏠 Welcome to Our Church Family',
    subject: 'Welcome to the Family — {{appName}}!',
    message:
      "Welcome to {{appName}}! We are so glad you visited and took the time to connect with us. You are now part of our family, and we can't wait to grow together in faith. Expect a warm follow-up from our team soon.",
  },
  'Altar Call': {
    heading: '✝️ Altar Call Decision',
    subject: 'A Beautiful Decision — {{appName}}',
    message:
      'What a beautiful and courageous decision you have made today! Heaven is rejoicing with you. We are here to support you every step of the way on this journey. Someone from our pastoral team will be in touch.',
  },
  'Pre-Marital Counselling': {
    heading: '💍 Pre-Marital Counselling',
    subject: 'Pre-Marital Counselling Registration — {{appName}}',
    message:
      'Congratulations on taking this important step together! We have received your pre-marital counselling registration at {{appName}}. Our counselling team will reach out to schedule your sessions.',
  },
  Counselling: {
    heading: '💬 Counselling Request',
    subject: 'Counselling Request Received — {{appName}}',
    message:
      'We have received your counselling request. Please know that your information is handled with the utmost care and confidentiality. A member of our counselling team will contact you to arrange a session.',
  },
  Feedback: {
    heading: '📝 Feedback Received',
    subject: 'Thank you for your Feedback — {{appName}}',
    message:
      'Thank you for sharing your feedback with us! Your thoughts help us serve you and the community better. We genuinely appreciate you taking the time.',
  },
  Testimony: {
    heading: '🌟 Testimony Shared',
    subject: 'Your Testimony has been received — {{appName}}',
    message:
      "Thank you for sharing your testimony! Your story of God's faithfulness is an encouragement to all of us. We are grateful that you trusted us with it.",
  },
};

// ─── TEMPLATE ──────────────────────────────────────────────────

export function formSubmissionTemplate(vars: FormTemplateVars): string {
  const content = FORM_CONTENT[vars.formType];
  const heading = content?.heading || '📋 Form Submission';
  const message = (
    content?.message ||
    `Thank you for your submission to ${vars.appName}. We have received your information and will be in touch if needed.`
  ).replace(/\{\{appName\}\}/g, vars.appName);

  const extraRows = vars.data
    ? Object.entries(vars.data)
        .map(
          ([key, val]) =>
            `<tr><td style="padding:8px 12px;color:#555;font-weight:600;text-transform:capitalize;border-bottom:1px solid #f0f0f0">${key.replace(/([A-Z])/g, ' $1').trim()}</td><td style="padding:8px 12px;color:#333;border-bottom:1px solid #f0f0f0">${String(val)}</td></tr>`,
        )
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#1a237e 0%,#283593 50%,#3949ab 100%);padding:30px 24px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px">${vars.appName}</h1>
      <p style="color:#c5cae9;margin:8px 0 0;font-size:13px">${heading}</p>
    </div>
    <div style="padding:28px 24px">
      <h2 style="color:#1a237e;margin:0 0 16px;font-size:18px">Hello ${vars.fullName},</h2>
      <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 20px">${message}</p>
      ${
        extraRows
          ? `<div style="margin:20px 0;border:1px solid #e8eaf6;border-radius:8px;overflow:hidden">
              <table style="width:100%;border-collapse:collapse;font-size:14px">${extraRows}</table>
            </div>`
          : ''
      }
      <p style="color:#666;line-height:1.6;font-size:14px;margin:20px 0 0">If you have any questions, feel free to reach out to us. God bless you! 🙏</p>
    </div>
    <div style="background:#f8f9fa;padding:16px 24px;text-align:center;border-top:1px solid #e8eaf6">
      <p style="color:#999;font-size:12px;margin:0">&copy; ${new Date().getFullYear()} ${vars.appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
