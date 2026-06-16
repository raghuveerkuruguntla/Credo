import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – Finza",
};

const updated = "June 12, 2026";

export default function TermsPage() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-bold text-stone-50 mb-2">Terms of Service</h1>
      <p className="text-sm text-stone-500 mb-8">Last updated: {updated}</p>

      <div className="space-y-6 text-sm text-stone-400 leading-relaxed">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Finza (the
          &quot;Service&quot;). By creating an account or using the Service, you agree to be bound by
          these Terms. If you do not agree, do not use the Service.
        </p>

        <Section title="1. Eligibility">
          You must be at least 18 years old to use Finza. By using the Service you represent
          that you are 18 or older and that the information you provide is accurate.
        </Section>

        <Section title="2. Not Financial Advice">
          Finza provides financial information, budgeting tools, and AI-generated insights for
          informational and educational purposes only. The Service does <strong className="text-stone-200">not</strong> provide
          financial, investment, tax, accounting, or legal advice, and nothing in the Service should
          be relied upon as such. Finza is not a registered investment adviser, broker-dealer, or
          financial planner. You are solely responsible for your financial decisions. Consult a
          qualified licensed professional before acting on any information provided.
        </Section>

        <Section title="3. Your Account">
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. Authentication is handled by our
          third-party provider. Notify us immediately of any unauthorized use.
        </Section>

        <Section title="4. Connecting Financial Accounts">
          Finza uses Plaid Inc. to connect to your financial institutions. By linking an account,
          you authorize us and Plaid to access read-only information such as balances and
          transactions. We never receive or store your bank login password. Your use of Plaid is also
          subject to Plaid&apos;s end user privacy policy.
        </Section>

        <Section title="5. Subscriptions and Billing">
          Finza offers Free, Plus, and Pro plans. Paid subscriptions are billed in advance on a
          recurring basis through our payment processor, Stripe. You can upgrade, downgrade, or cancel
          at any time through the billing portal; cancellations take effect at the end of the current
          billing period. Fees are non-refundable except where required by law.
        </Section>

        <Section title="6. Acceptable Use">
          You agree not to misuse the Service, including attempting to access other users&apos; data,
          reverse-engineering the Service, or using it for any unlawful purpose. We may suspend or
          terminate accounts that violate these Terms.
        </Section>

        <Section title="7. Disclaimers and Limitation of Liability">
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
          that information displayed is accurate, complete, or current, as it depends on data supplied
          by third parties. To the maximum extent permitted by law, Finza shall not be liable for
          any indirect, incidental, or consequential damages, or for any financial losses arising from
          your use of, or reliance on, the Service.
        </Section>

        <Section title="8. Changes to These Terms">
          We may update these Terms from time to time. Material changes will be communicated through
          the Service. Continued use after changes take effect constitutes acceptance.
        </Section>

        <Section title="9. Contact">
          Questions about these Terms can be sent to support@finza.dev.
        </Section>

        <p className="text-xs text-stone-600 border-t border-white/[0.06] pt-6">
          This document is a general template provided for the Finza application and does not
          constitute legal advice. Have it reviewed by a qualified attorney before relying on it in
          production.
        </p>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-100 mb-2">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
