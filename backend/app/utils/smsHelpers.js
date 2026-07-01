import crypto from "crypto";

const DEFAULT_OTP_LENGTH = 6;

export function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "").slice(-10);
}

export function toIndianNumber(mobile) {
  const normalized = normalizeMobile(mobile);
  return normalized ? `91${normalized}` : "";
}

export function getOtpLength() {
  const parsed = parseInt(process.env.OTP_LENGTH || `${DEFAULT_OTP_LENGTH}`, 10);
  return Number.isFinite(parsed) && parsed >= 4 ? parsed : DEFAULT_OTP_LENGTH;
}

export function generateOTP(length = getOtpLength()) {
  const safeLength = Math.max(6, Number(length || DEFAULT_OTP_LENGTH));
  const min = 10 ** (safeLength - 1);
  const max = 10 ** safeLength;
  return crypto.randomInt(min, max).toString();
}

export function getSmsTemplateText() {
  const template = String(process.env.SMS_INDIA_HUB_TEMPLATE_TEXT || "").trim();
  if (!template) {
    const error = new Error(
      "SMS_INDIA_HUB_TEMPLATE_TEXT is not configured. Set the approved DLT template text in backend/.env",
    );
    error.statusCode = 500;
    throw error;
  }
  return template;
}

function replaceDltVarPlaceholders(template, values) {
  let valueIndex = 0;
  return template.replace(/##var##/gi, () => {
    const value = values[Math.min(valueIndex, values.length - 1)] || "";
    valueIndex += 1;
    return value;
  });
}

function replaceNamedPlaceholders(template, { appName, otpStr, minutesStr }) {
  let msg = template
    .replace(/\{\{OTP\}\}/gi, otpStr)
    .replace(/\{\{MINUTES\}\}/gi, minutesStr)
    .replace(/\{\{APP_NAME\}\}/gi, appName)
    .replace(/\{otp\}/gi, otpStr)
    .replace(/\{OTP\}/g, otpStr)
    .replace(/\{APP_NAME\}/gi, appName)
    .replace(/\{app_name\}/gi, appName)
    .replace(/\{MINUTES\}/gi, minutesStr)
    .replace(/\{minutes\}/gi, minutesStr)
    .replace(/\$\{otp\}/gi, otpStr)
    .replace(/\$\{minutes\}/gi, minutesStr)
    .replace(/\$\{appName\}/gi, appName)
    .replace(/\$\{APP_NAME\}/g, appName);

  const genericPlaceholders = [
    "{#var#}",
    "{#VAR#}",
    "{#var1#}",
    "{#var2#}",
    "{#var3#}",
  ];
  const replacementOrder = [appName, otpStr, minutesStr];

  genericPlaceholders.forEach((placeholder) => {
    let occurrence = 0;
    while (msg.includes(placeholder)) {
      const replacement =
        replacementOrder[Math.min(occurrence, replacementOrder.length - 1)];
      msg = msg.replace(placeholder, replacement);
      occurrence += 1;
    }
  });

  return msg;
}

export function buildMessage(otp) {
  const template = getSmsTemplateText();
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
  const appName = String(process.env.APP_NAME || "").trim();
  const otpStr = String(otp);
  const minutesStr = String(minutes);
  const values = [appName, otpStr, minutesStr];

  if (/##var##/i.test(template)) {
    return replaceDltVarPlaceholders(template, values);
  }

  return replaceNamedPlaceholders(template, { appName, otpStr, minutesStr });
}
