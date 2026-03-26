import { NextResponse } from "next/server";
import twilio from "twilio";
import { formatDisplayPhone } from "@/lib/utils";

const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const activeVerifications = new Map<
  string,
  { phoneNumber: string; code: string; createdAt: number }
>();

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | { action: "start"; phoneNumber: string }
    | { action: "confirm"; verificationId: string; code: string };

  if (body.action === "start") {
    const normalized = normalizePhone(body.phoneNumber);
    if (!normalized) {
      return NextResponse.json({ error: "Enter a valid US mobile number." }, { status: 400 });
    }

    const verificationId = crypto.randomUUID();
    const code = generateCode();

    activeVerifications.set(verificationId, {
      phoneNumber: normalized,
      code,
      createdAt: Date.now()
    });

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (client && fromNumber) {
      try {
        await client.messages.create({
          body: `Your SMT 2026 verification code is: ${code}`,
          from: fromNumber,
          to: `+1${normalized}`
        });
      } catch (error) {
        console.error("Twilio SMS error:", error);
        activeVerifications.delete(verificationId);
        return NextResponse.json({ error: "Could not send verification text. Try again." }, { status: 500 });
      }

      return NextResponse.json({
        verificationId,
        phoneNumber: formatDisplayPhone(normalized),
        delivery: "sms"
      });
    }

    return NextResponse.json({
      verificationId,
      phoneNumber: formatDisplayPhone(normalized),
      delivery: "simulated",
      previewCode: code
    });
  }

  const record = activeVerifications.get(body.verificationId);

  if (!record) {
    return NextResponse.json({ error: "Verification expired. Start again." }, { status: 404 });
  }

  if (Date.now() - record.createdAt > VERIFICATION_EXPIRY_MS) {
    activeVerifications.delete(body.verificationId);
    return NextResponse.json({ error: "Verification expired. Start again." }, { status: 410 });
  }

  if (record.code !== body.code) {
    return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
  }

  activeVerifications.delete(body.verificationId);

  return NextResponse.json({
    verified: true,
    phoneNumber: formatDisplayPhone(record.phoneNumber)
  });
}
