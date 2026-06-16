import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { firstName, lastName, birthDate } = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
  };

  // Validate birth date and 18+ requirement (server-side, can't be bypassed)
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ error: "Please enter a valid birth date" }, { status: 400 });
  }
  const dob = new Date(birthDate + "T00:00:00");
  if (isNaN(dob.getTime()) || dob.getFullYear() < 1900) {
    return NextResponse.json({ error: "Please enter a valid birth date" }, { status: 400 });
  }
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 18) {
    return NextResponse.json(
      { error: "You must be at least 18 years old to use Finza." },
      { status: 403 }
    );
  }

  const user = await currentUser();
  const needsName = !user?.firstName;
  if (needsName && (!firstName?.trim() || !lastName?.trim())) {
    return NextResponse.json({ error: "Please enter your first and last name" }, { status: 400 });
  }

  const client = await clerkClient();

  // Set name on the Clerk profile (only if not already present, e.g. from Google)
  if (needsName) {
    await client.users.updateUser(userId, {
      firstName: firstName!.trim(),
      lastName: lastName!.trim(),
    });
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      birthDate,
      onboarded: true,
    },
  });

  return NextResponse.json({ success: true });
}
