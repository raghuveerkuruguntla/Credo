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
    a: "Through Plaid, the same secure infrastructure used by Venmo and Robinhood. You log in at your bank — Credo never sees or stores your credentials, only a read-only token that can't move money.",
  },
  {
    q: "Is my financial data safe?",
    a: "Yes. Everything is protected with 256-bit encryption in transit and at rest, connections are read-only, and we never sell your data. You can disconnect any institution and delete your data at any time.",
  },
  {
    q: "Is there really a free plan?",
    a: "Free forever, no credit card required. You get your full dashboard, net worth, this- and last-month spending, and 10 AI questions a month. Upgrade only when you want forecasting, more institutions, or unlimited AI.",
  },
  {
    q: "What can the AI assistant actually do?",
    a: "It answers questions grounded in your real accounts — \"How much did I spend on dining last month?\", \"Can I afford a $2,000 trip in March?\" — and suggests budgets based on your actual patterns rather than generic advice.",
  },
  {
    q: "Which accounts can I track?",
    a: "Checking, savings, credit cards, loans, and investment accounts across 11,000+ institutions. Balances, transactions, budgets, and portfolio holdings all live in one dashboard.",
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
