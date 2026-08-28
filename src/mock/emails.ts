import { Email } from '../types/email';

export const INITIAL_MOCK_EMAILS: Email[] = [
  {
    id: 'email-101',
    threadId: 'thread-01',
    sender: {
      name: 'Elena Rostova',
      email: 'elena.rostova@techvector.io',
      avatarUrl: '',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    cc: [
      { name: 'Marcus Sterling', email: 'm.sterling@techvector.io' }
    ],
    subject: 'Q3 Product Architecture Review & AI Service Migration',
    snippet: 'Hi Alex, following up on our sync earlier today. I’ve attached the revised schema diagrams for the backend AI pipeline...',
    body: `Hi Alex,

Following up on our sync earlier today. I have reviewed the proposed transition plan for migrating our background processing pipeline to the new asynchronous worker tier.

Key architectural takeaways:
1. Event streaming: We will isolate the ingestion pipeline from direct HTTP client requests.
2. Latency target: Sub-120ms token time-to-first-byte (TTFB) for streaming responses.
3. Resilience: Fallback strategy when rate limits are approached on high concurrency spikes.

I have attached the updated sequence diagrams and migration checklist. Let me know if 2:00 PM tomorrow works for a quick 20-minute run-through with Marcus and the core team.

Best regards,
Elena Rostova
Lead Systems Architect | TechVector`,
    date: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    labels: ['Architecture', 'High Priority'],
    category: 'primary',
    priority: 'high',
    attachments: [
      { id: 'att-1', name: 'architecture_migration_v2.pdf', size: '2.4 MB', type: 'application/pdf' },
      { id: 'att-2', name: 'latency_benchmark_table.xlsx', size: '480 KB', type: 'application/vnd.ms-excel' }
    ],
    aiSummary: 'Elena followed up with revised architecture diagrams for the AI pipeline migration, targeting sub-120ms TTFB and requesting a 20-minute sync tomorrow at 2:00 PM.',
    aiSentiment: 'urgent',
    aiActionItems: [
      'Confirm availability for 20-min sync tomorrow at 2:00 PM with Elena and Marcus',
      'Review attached architecture_migration_v2.pdf'
    ],
    aiSuggestedReply: 'Hi Elena, thanks for the updated diagrams. 2:00 PM tomorrow works well on my end—I’ll send over a calendar invite.'
  },
  {
    id: 'email-102',
    threadId: 'thread-02',
    sender: {
      name: 'Google Cloud Platform',
      email: 'billing-reports@cloud.google.com',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Monthly Cloud Infrastructure Usage & Cost Optimization Report',
    snippet: 'Your project monthly statement for Cloud Run and Firestore is now ready. Summary of cost distribution and recommended quotas...',
    body: `Dear Google Cloud Administrator,

Your billing statement for the previous billing period is now available in the Google Cloud Console.

Summary:
- Total Compute Engine / Cloud Run vCPU Hours: 1,420 hrs
- Firestore Read/Write Operations: Within tier free quota
- Network Egress: 42.1 GB

Optimization suggestions:
- Consider configuring minimum idle instances on low-traffic endpoints to eliminate cold starts.
- Clean up unused container images from Artifact Registry.

To view detailed cost breakdowns or download invoice summaries, visit the Google Cloud Billing Console.

Thank you,
Google Cloud Platform Team`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(), // 2.5 hrs ago
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['Billing', 'Infrastructure'],
    category: 'updates',
    priority: 'normal',
    aiSummary: 'Monthly Google Cloud billing statement ready. Cloud Run and Firestore usage are within expected tiers with suggestions on container cleanup.',
    aiSentiment: 'neutral',
  },
  {
    id: 'email-103',
    threadId: 'thread-03',
    sender: {
      name: 'Dr. Sarah Lin',
      email: 's.lin@neuralfrontier.edu',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Keynote Panel Invitation: Next-Gen Context Windows in Agentic Systems',
    snippet: 'Dear Alex, on behalf of the Neural Frontier Symposium committee, we would like to formally invite you to participate as a panelist...',
    body: `Dear Alex,

On behalf of the Neural Frontier Symposium 2026 organizing committee, we would like to formally invite you to participate as a featured panelist in our upcoming session:

Session: "Scaling Context Windows & Agentic Multi-Step Reasoning"
Date: October 14th, 2026
Location: San Francisco, CA (Virtual attendance option also supported)

Your recent contributions to pragmatic LLM workflow design and email parsing workflows caught our attention. The panel will also feature researchers from Stanford AI Lab and DeepMind.

Could you confirm your potential availability by Friday, September 4th? We will cover all conference passes and speaker accommodations.

Warm regards,
Dr. Sarah Lin
Symposium Chair | Neural Frontier Research Initiative`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hrs ago
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    labels: ['Speaking', 'Conference'],
    category: 'primary',
    priority: 'high',
    aiSummary: 'Dr. Sarah Lin invited you to be a panelist at the Neural Frontier Symposium on Oct 14 in SF discussing context window scaling. RSVP requested by Sep 4.',
    aiSentiment: 'action_required',
    aiActionItems: [
      'Respond to Dr. Sarah Lin regarding panelist availability by Sept 4th'
    ],
    aiSuggestedReply: 'Dear Dr. Lin, thank you very much for the invitation. I would be delighted to join the panel on October 14th.'
  },
  {
    id: 'email-104',
    threadId: 'thread-04',
    sender: {
      name: 'GitHub Security',
      email: 'security-alerts@github.com',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: '[Security Advisory] 1 new vulnerability detected in dependency tree',
    snippet: 'A moderate severity security alert has been identified in automated dependency audit for intelligent-email-assistant repo...',
    body: `Security Alert Notification:

Repository: organization/intelligent-email-assistant
Severity: Moderate
Advisory: Dependabot detected 1 vulnerable dependency in package-lock.json

Details:
- Package: @fast-xml-parser
- Affected versions: < 4.4.1
- Patched version: 4.4.1

Recommendation:
Run 'npm audit fix' or update the package specification in package.json to the latest approved release.

This notification was automatically sent according to your repository security settings.`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hrs ago
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['DevOps', 'Security'],
    category: 'updates',
    priority: 'normal',
    aiSummary: 'Automated Dependabot notification recommending dependency update for package @fast-xml-parser to v4.4.1.',
    aiSentiment: 'neutral',
  },
  {
    id: 'email-105',
    threadId: 'thread-05',
    sender: {
      name: 'Devon Vance',
      email: 'devon.v@designcraft.co',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Updated UI Kit & Component Spacing Tokens for Email Client',
    snippet: 'Hey Alex, I just uploaded the refined Figma components incorporating the clean typography ratios and 16px container padding math...',
    body: `Hey Alex,

Just wrapped up the visual system refinements. As discussed in our design review:

- We standardized button horizontal padding to exactly 2x vertical padding.
- Neutral colors now have a subtle warm tint (<4% HSB saturation) to prevent harsh pure monochrome contrast.
- Corner radii are capped at 12px for standard cards, preserving high-density list ergonomics.

You can inspect the Figma frame at your convenience. Let me know if any token names in the Tailwind config need slight renaming.

Cheers,
Devon`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // Yesterday
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['Design', 'UI/UX'],
    category: 'primary',
    priority: 'normal',
    aiSummary: 'Devon provided updated UI tokens and Figma specs following design review rules (padding ratios, warm neutral palette, 12px radii).',
    aiSentiment: 'neutral',
  },
  {
    id: 'email-106',
    threadId: 'thread-06',
    sender: {
      name: 'Stripe Payments',
      email: 'notifications@stripe.com',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Daily Payout Processed - TechVector Enterprise Tier ($4,850.00 USD)',
    snippet: 'A payout of $4,850.00 USD has been submitted to your bank account ending in 4082. Funds will typically settle within 1-2 business days...',
    body: `Hello Alex,

We’ve sent $4,850.00 USD to your bank account ending in 4082.

Transfer details:
- Reference: STRIPE-PO-98214-X
- Expected settlement date: September 1st, 2026
- Charges included: 14 customer subscription renewals
- Processing fees deducted: $142.30

To view a breakdown of every fee and charge included in this transfer, visit your Stripe Dashboard.

Thank you,
The Stripe Team`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['Finance', 'Payouts'],
    category: 'financial',
    priority: 'low',
  },
  {
    id: 'email-112',
    threadId: 'thread-12',
    sender: {
      name: 'Acme SaaS Cloud',
      email: 'promotions@acmecloud.io',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Exclusive: 40% Off Annual Developer Pro Tier — 3 Days Left!',
    snippet: 'Upgrade before Friday midnight to lock in 40% savings on dedicated compute nodes and 10TB cloud storage...',
    body: `Hi Alex,

For the next 72 hours only, get 40% off the Acme Cloud Developer Pro plan!

Features included:
- Unlimited serverless workers
- 10TB NVMe storage
- Priority 24/7 engineering support

Use promo code DEV40 at checkout before Friday, September 5th at 11:59 PM PST.

Claim your discount today!
The Acme Cloud Growth Team`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['Promotions', 'Deals'],
    category: 'promotions',
    priority: 'low',
  },
  {
    id: 'email-113',
    threadId: 'thread-13',
    sender: {
      name: 'David Miller',
      email: 'david.miller@familymail.org',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Catching up this weekend? Coffee or dinner in Hayes Valley',
    snippet: 'Hey Alex! Hope you are having a great week. It has been a while since we caught up. Are you free this Saturday around 11 AM...',
    body: `Hey Alex!

Hope you’re having a great week and the new AI project launch went smoothly.

It’s been a while since we caught up in person. Are you around this Saturday (Sept 2nd) for coffee or lunch in Hayes Valley? Let me know if 11:30 AM works, or we can do Sunday afternoon instead.

Hope to see you soon!
David`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    labels: ['Personal', 'Catchup'],
    category: 'personal',
    priority: 'normal',
  },
  {
    id: 'email-107',
    threadId: 'thread-07',
    sender: {
      name: 'Maya Patel',
      email: 'maya.p@enterprise-solutions.com',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Contract Draft & Data Security Addendum (Enterprise Pilot)',
    snippet: 'Hi Alex, attached is the revised Master Services Agreement and DPA for our upcoming trial. Please review Section 4 regarding data retention...',
    body: `Hi Alex,

Attached is our standard Master Services Agreement (MSA) along with the Data Processing Addendum (DPA) customized for our 90-day pilot deployment.

Please take a look at:
- Section 4.2: Data encryption at rest and in transit
- Section 7.1: Zero-training policy confirmation for proprietary email metadata
- Section 12: SLA and escalation contacts

Once your legal team signs off, we can route via DocuSign and initiate workspace onboarding.

Best,
Maya Patel
VP of Business Partnerships | Enterprise Solutions Group`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    folder: 'inbox',
    isRead: true,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    labels: ['Legal', 'Contracts'],
    category: 'primary',
    priority: 'high',
    attachments: [
      { id: 'att-3', name: 'MSA_TechVector_Pilot_Final.docx', size: '1.2 MB', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { id: 'att-4', name: 'DPA_Security_Addendum.pdf', size: '890 KB', type: 'application/pdf' }
    ],
    aiSummary: 'Maya sent the Enterprise Pilot MSA and DPA for legal review, highlighting data encryption and zero-training policies in Section 4 & 7.',
    aiSentiment: 'action_required',
    aiActionItems: [
      'Review Section 4.2 (Encryption) and Section 7.1 (Zero-training) with legal',
      'Provide final sign-off for DocuSign routing'
    ]
  },
  {
    id: 'email-108',
    threadId: 'thread-08',
    sender: {
      name: 'Alex Rivera',
      email: 'alex.rivera@workspace.internal',
    },
    recipients: [
      { name: 'Dr. Sarah Lin', email: 's.lin@neuralfrontier.edu' }
    ],
    subject: 'Re: Keynote Panel Invitation: Next-Gen Context Windows in Agentic Systems',
    snippet: 'Dear Dr. Lin, thank you for the honor of this invitation. I am happy to confirm my availability for the October 14th keynote panel...',
    body: `Dear Dr. Lin,

Thank you for the honor of this invitation. I am very happy to confirm my participation in the panel on "Scaling Context Windows & Agentic Multi-Step Reasoning" on October 14th.

I will plan to attend in person in San Francisco. Please let me know once the speaker questionnaire and prep brief are ready.

Looking forward to collaborating with you and the symposium team!

Warm regards,
Alex Rivera`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    folder: 'sent',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: false,
    labels: ['Sent', 'Conference'],
    category: 'primary',
    priority: 'normal',
  },
  {
    id: 'email-109',
    threadId: 'thread-09',
    sender: {
      name: 'Alex Rivera',
      email: 'alex.rivera@workspace.internal',
    },
    recipients: [
      { name: 'Elena Rostova', email: 'elena.rostova@techvector.io' }
    ],
    subject: 'Re: Q3 Product Architecture Review & AI Service Migration',
    snippet: 'Hi Elena, 2:00 PM tomorrow works well on my calendar. I will review the attached diagrams before our meeting...',
    body: `Hi Elena,

2:00 PM tomorrow works well on my calendar. I will review the architecture diagram and latency tables in advance.

Looking forward to finalizing the worker pool topology!

Alex`,
    date: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    folder: 'sent',
    isRead: true,
    isStarred: true,
    isArchived: false,
    isTrash: false,
    labels: ['Sent', 'Architecture'],
    category: 'primary',
    priority: 'high',
  },
  {
    id: 'email-110',
    threadId: 'thread-10',
    sender: {
      name: 'Product Hunt Newsletter',
      email: 'digest@producthunt.com',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Top AI Development Tools trending this week (Issue #342)',
    snippet: 'Discover the top 10 developer tools voted by the community: Fast inference engines, automated UI scaffolding, and terminal AI...',
    body: `Today's top trending launches in Developer Tools:

1. CodeForge AI - Instant code generation with static validation
2. TerminalSync - Multi-machine command syncing
3. VectorDB Lite - Lightweight embedded vector index

Read full reviews and discussions on Product Hunt.`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    folder: 'archived',
    isRead: true,
    isStarred: false,
    isArchived: true,
    isTrash: false,
    labels: ['Newsletter', 'Archived'],
    category: 'promotions',
    priority: 'low',
  },
  {
    id: 'email-111',
    threadId: 'thread-11',
    sender: {
      name: 'Unsolicited Sales Rep',
      email: 'outreach@leadbooster-spam.net',
    },
    recipients: [
      { name: 'Alex Rivera', email: 'alex.rivera@workspace.internal' }
    ],
    subject: 'Quick question about 10x lead generation automation?',
    snippet: 'Hey Alex, do you have 15 minutes to discuss how our cold email scraper can book 100 meetings a week for your startup...',
    body: `Hey Alex,

Are you open to having 50 new qualified calls booked automatically on your calendar every single week?

Let me know if you have 10 minutes this Thursday for a quick pitch.

Unsubscribe if not interested.`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    folder: 'trash',
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrash: true,
    labels: ['Spam', 'Trash'],
    category: 'promotions',
    priority: 'low',
  }
];
