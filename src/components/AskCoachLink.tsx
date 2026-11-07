"use client";

// "Ask the coach" link used across the app: queues the question in session
// storage and opens /ai, where it is sent automatically. Nothing goes in the URL.

import Link from "next/link";
import type { ReactNode } from "react";
import { queueCoachQuestion } from "@/lib/coachClient";

export default function AskCoachLink({ question, className, children }: { question: string; className?: string; children: ReactNode }) {
  return (
    <Link href="/ai" className={className} onClick={() => queueCoachQuestion(question)}>
      {children}
    </Link>
  );
}
