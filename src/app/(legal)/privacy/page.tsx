import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – FinPilot",
};

const updated = "June 12, 2026";

export default function PrivacyPage() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold text-stone-50 mb-2">Privacy Policy</h1>
      <p className="text-sm text-stone-500 mb-8">Last updated: {updated}</p>

      <div className="space-y-6 text-sm text-stone-400 leading-relaxed">
        <p>
          This Privacy Policy explains how FinPilot (&quot;we&quot;, &quot;us&quot;) collects, uses,
          and protects your information when you use our personal finance application (the
          &quot;Service&quot;).
        </p>

        <Section title="1. Information We Collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-stone-200">Account information:</strong> your name, email address, and date of birth, provided during sign-up.</li>
            <li><strong className="text-stone-200">Financial data:</strong> when you connect a financial institution through Plaid, we receive read-only data such as account balances and transaction history. We never receive or store your bank login password.</li>
            <li><strong className="text-stone-200">Usage data:</strong> limited technical information needed to operate the Service, such as feature usage counts.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and personalize the Service, including dashboards, budgets, forecasts, and AI insights.</li>
            <li>To process subscription payments through our payment processor.</li>
            <li>To maintain the security and integrity of the Service.</li>
          </ul>
        </Section>

        <Section title="3. AI Processing">
          When you use the AI Assistant or AI budget suggestions, a summary of your financial data is
          sent to our AI provider to generate a response. This data is used only to produce your
          response and is not used to train third-party models. AI output is informational only and is
          not financial advice.
        </Section>

        <Section title="4. Third-Party Service Providers">
          We rely on trusted providers to operate FinPilot: Plaid (bank connections), our
          authentication provider (sign-in and account management), Stripe (payment processing), and
          our database and hosting providers. Each processes your data only as needed to provide their
          service and under their own privacy commitments.
        </Section>

        <Section title="5. How We Protect Your Data">
          Data is encrypted in transit using TLS and stored with encryption at rest. Access tokens for
          financial connections are treated as sensitive credentials. We restrict access to personal
          data to what is necessary to operate the Service. No method of transmission or storage is
          100% secure, and we cannot guarantee absolute security.
        </Section>

        <Section title="6. Data Sharing">
          We do not sell your personal or financial information. We share data only with the service
          providers described above, or when required by law.
        </Section>

        <Section title="7. Your Choices and Rights">
          You can disconnect a financial institution at any time, edit your profile, or delete your
          account, which removes your associated data. Depending on your location, you may have
          additional rights to access, correct, or delete your personal data.
        </Section>

        <Section title="8. Data Retention">
          We retain your information for as long as your account is active. When you delete your
          account, we delete or anonymize your personal and financial data, except where retention is
          required by law.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. Material changes will be communicated
          through the Service.
        </Section>

        <Section title="10. Contact">
          For privacy questions or requests, contact privacy@finpilot.app.
        </Section>

        <p className="text-xs text-stone-600 border-t border-white/[0.06] pt-6">
          This document is a general template provided for the FinPilot application and does not
          constitute legal advice. Have it reviewed by a qualified attorney and tailored to your
          actual data practices and jurisdiction before relying on it in production.
        </p>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-100 mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
