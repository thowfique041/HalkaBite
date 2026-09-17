import React from 'react';

type LegalPageProps = { kind: 'privacy' | 'terms' };

const content = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'HalkaBite uses the information you provide to operate your account, process orders, coordinate restaurants and delivery partners, and keep the platform secure.',
    sections: [
      ['Information we use', 'Account details, delivery addresses, order history, payment-reference information, device sessions, and messages you choose to send through HalkaBite.'],
      ['How it is used', 'To provide ordering and delivery services, prevent abuse, resolve support requests, and improve service reliability.'],
      ['Your choices', 'You can update profile information, review active sessions, revoke devices, and request account assistance through support.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'By using HalkaBite, you agree to provide accurate account and delivery information and to use the service lawfully.',
    sections: [
      ['Orders', 'Prices, availability, preparation times, and delivery estimates may change. Review the final checkout summary before placing an order.'],
      ['Payments and cancellations', 'Payment availability depends on each restaurant. Cancellation eligibility depends on the current order status.'],
      ['Acceptable use', 'Do not misuse accounts, payment references, reviews, messaging, or delivery workflows. Access may be restricted to protect users and partners.'],
    ],
  },
} as const;

const LegalPage: React.FC<LegalPageProps> = ({ kind }) => {
  const page = content[kind];
  return <main className="mx-auto min-h-[65vh] max-w-4xl px-4 py-12">
    <p className="text-sm font-semibold uppercase tracking-[.2em] text-primary-400">HalkaBite</p>
    <h1 className="mt-3 text-4xl font-black">{page.title}</h1>
    <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">{page.intro}</p>
    <div className="mt-10 space-y-5">{page.sections.map(([title, body]) => <section key={title} className="card p-6">
      <h2 className="text-xl font-bold">{title}</h2><p className="mt-3 leading-7 text-white/60">{body}</p>
    </section>)}</div>
    <p className="mt-8 text-sm text-white/45">Questions? Email <a className="text-primary-400 hover:underline" href="mailto:support@halkabite.com">support@halkabite.com</a>.</p>
  </main>;
};

export default LegalPage;
