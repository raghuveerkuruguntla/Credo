"use client";

// FAQ accordion. Built on the `motion` package already in the project (no
// radix-accordion dependency) and styled to the landing page's indigo-glass
// system. One open row at a time; rows are hairline-divided inside a single
// glass panel rather than nested cards. Fully keyboard-accessible: each trigger
// is a real <button> with aria-expanded / aria-controls, and the answer is a
// labelled region. Height animates open/closed; under reduced motion the panel
// snaps without animating.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    q: "How does Credo connect to my bank?",
    a: "Through Plaid, the bank-connection service trusted by thousands of finance apps. You log in at your own bank — Credo never sees or stores your bank username or password, only a read-only token that can view balances and transactions but can't move money.",
  },
  {
    q: "How is my financial health score calculated?",
    a: "Your score is the average of five categories: Cash Flow & Income (savings rate, income stability, spending trend), Debt Management (credit utilization, debt payments vs income), Savings & Emergency Prep (months of spending your cash covers), Spending Behavior (discretionary share, recurring price increases) and Obligations & Payments (whether checking covers upcoming bills, and any overdraft or late fees). Each metric is scored 0–100 against a stated target with the formula shown. If there isn't enough data, we tell you instead of guessing a score.",
  },
  {
    q: "What are the insights behind my score?",
    a: "Credo scans your accounts for things that are easy to miss (possible double charges, bills that quietly went up, subscriptions adding up, fees and interest, upcoming bills that could overdraw your checking, thin emergency savings, high card utilization) and files each one under the health category it affects. Each is labelled a risk, an opportunity or an informational insight, with the data behind it. Only risks tied to a scored metric affect your score, and the score changes when your data does, not when you click a button. Credo never moves money or cancels anything for you.",
  },
  {
    q: "Is my financial data safe?",
    a: "Yes. Because Credo connects through Plaid, your bank login never touches our servers, and connections are read-only. The access tokens we store are encrypted with AES-256, all traffic is encrypted in transit over TLS, and we never sell your data. You can disconnect any institution and delete your data at any time.",
  },
  {
    q: "What does it cost?",
    a: "Nothing, and there are no paid tiers. Every feature is included for everyone: your dashboard, financial health score and insights, next best move, forecasting and what-if scenarios, investments, CSV export and the AI coach.",
  },
  {
    q: "What can the AI coach actually do?",
    a: "It answers questions grounded in your real accounts and health score — like \"Can I afford a trip in March?\" or \"Should I pay down my card or save?\" — using your actual data instead of generic advice, and ends with one specific next step. It can also suggest budgets from your spending patterns. There's no monthly question limit, just a sensible rate limit to keep the service fast for everyone.",
  },
  {
    q: "Which accounts can I track?",
    a: "Checking, savings, CDs, IRAs and other investment accounts, credit cards, auto and personal loans, and mortgages across 11,000+ institutions — with balances, transactions, budgets and investments in one dashboard.",
  },
  {
    q: "Can I disconnect or delete my data?",
    a: "Yes. You can disconnect any institution from Accounts at any time, and delete your account from Settings.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <ul className="rounded-[26px] overflow-hidden divide-y divide-white/[0.06]" style={{
      background: "linear-gradient(160deg, rgba(30,26,46,0.42) 0%, rgba(15,13,24,0.46) 100%)",
      border: "1px solid rgba(184,170,255,0.16)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 60px rgba(0,0,0,0.45), 0 0 60px rgba(124,92,224,0.08)",
      backdropFilter: "blur(18px) saturate(140%)",
      WebkitBackdropFilter: "blur(18px) saturate(140%)",
    }}>
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const btnId = `faq-trigger-${i}`;
        return (
          <li key={i}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-[15px] sm:text-base font-semibold text-white">{item.q}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 transition-transform duration-300"
                  style={{ color: "#A99CFF", transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 pt-0 text-[14px] sm:text-[15px] leading-relaxed max-w-[60ch]" style={{ color: "rgba(196,192,216,0.82)" }}>
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
