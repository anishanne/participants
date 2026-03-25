import { NextResponse } from "next/server";

const activeVerifications = new Map<
  string,
  {
    phoneNumber: string;
    code: string;
    createdAt: number;
  }
>();

function normalizePhoneNumber(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return null;
}

function formatPhoneNumber(rawValue: string) {
  const normalized = normalizePhoneNumber(rawValue);

  if (!normalized) {
    return rawValue;
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | { action: "start"; phoneNumber: string }
    | { action: "confirm"; verificationId: string; code: string };

  if (body.action === "start") {
    const normalized = normalizePhoneNumber(body.phoneNumber);

    if (!normalized) {
      return NextResponse.json({ error: "Enter a valid US mobile number." }, { status: 400 });
    }

    const verificationId = crypto.randomUUID();
    const code = String(Math.floor(100000 + Math.random() * 900000));

    activeVerifications.set(verificationId, {
      phoneNumber: normalized,
      code,
      createdAt: Date.now()
    });

    return NextResponse.json({
      verificationId,
      phoneNumber: formatPhoneNumber(normalized),
      delivery: "simulated",
      previewCode: code
    });
  }

  const record = activeVerifications.get(body.verificationId);

  if (!record) {
    return NextResponse.json({ error: "Verification expired. Start again." }, { status: 404 });
  }

  if (Date.now() - record.createdAt > 10 * 60 * 1000) {
    activeVerifications.delete(body.verificationId);
    return NextResponse.json({ error: "Verification expired. Start again." }, { status: 410 });
  }

  if (record.code !== body.code) {
    return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
  }

  activeVerifications.delete(body.verificationId);

  return NextResponse.json({
    verified: true,
    phoneNumber: formatPhoneNumber(record.phoneNumber)
  });
}
