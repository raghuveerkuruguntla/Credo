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
    a: "Your score is the average of four indicators, each scored 0–100 against a clear target: emergency cushion (cash ÷ monthly spending, target 6 months), debt payments (loan and card payments ÷ income, target under 20%), credit utilization (card balances ÷ limits, target under 10%), and savings rate (target 20%). Every number links back to the accounts and transactions it came from, and indicators without data are left out rather than guessed.",
  },
  {
    q: "Is my financial data safe?",
    a: "Yes. Because Credo connects through Plaid, your bank login never touches our servers, and connections are read-only. The access tokens we store are encrypted with AES-256, all traffic is encrypted in transit over TLS, and we never sell your data. You can disconnect any institution and delete your data at any time.",
  },
  {
    q: "Is there really a free plan?",
    a: "Free forever, no credit card required. You get your full dashboard, net worth, your financial health score with your next best move, and 10 AI coach questions a month. Upgrade when you want forecasting and what-if scenarios, more institutions, or more coach questions.",
  },
  {
    q: "What can the AI coach actually do?",
    a: "It answers questions grounded in your real accounts and health score — like \"Can I afford a trip in March?\" or \"Should I pay down my card or save?\" — using your actual data instead of generic advice, and ends with one specific next step. On paid plans it can also suggest budgets from your spending patterns.",
  },
  {
    q: "Which accounts can I track?",
    a: "Checking, savings, CDs, IRAs and other investment accounts, credit cards, auto and personal loans, and mortgages across 11,000+ institutions — with balances, transactions, and budgets in one dashboard. Investment balances and allocation are available on the Pro plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Anytime, in two clicks, no retention hoops. Paid plans stay active until the end of your billing period, then you drop back to Free — your data stays intact.",
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
