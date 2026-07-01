import { buildMessage, getSmsTemplateText } from "../app/utils/smsHelpers.js";

describe("buildMessage DLT templates", () => {
  const originalTemplate = process.env.SMS_INDIA_HUB_TEMPLATE_TEXT;
  const originalAppName = process.env.APP_NAME;

  afterEach(() => {
    if (originalTemplate === undefined) {
      delete process.env.SMS_INDIA_HUB_TEMPLATE_TEXT;
    } else {
      process.env.SMS_INDIA_HUB_TEMPLATE_TEXT = originalTemplate;
    }
    if (originalAppName === undefined) {
      delete process.env.APP_NAME;
    } else {
      process.env.APP_NAME = originalAppName;
    }
  });

  it("reads template text only from SMS_INDIA_HUB_TEMPLATE_TEXT env", () => {
    process.env.SMS_INDIA_HUB_TEMPLATE_TEXT =
      "Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC";
    process.env.APP_NAME = "SEVAFAST";

    expect(getSmsTemplateText()).toBe(process.env.SMS_INDIA_HUB_TEMPLATE_TEXT);
    expect(buildMessage("482910")).toBe(
      "Welcome to the SEVAFAST powered by Appzeto.Your OTP for registration is 482910.BGADEC",
    );
  });

  it("throws when SMS_INDIA_HUB_TEMPLATE_TEXT is missing", () => {
    delete process.env.SMS_INDIA_HUB_TEMPLATE_TEXT;

    expect(() => getSmsTemplateText()).toThrow(
      "SMS_INDIA_HUB_TEMPLATE_TEXT is not configured",
    );
  });
});
