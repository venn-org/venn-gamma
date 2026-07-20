// Structured legal/policy content, rendered by components/LegalDoc.jsx.
// Source of truth: terms.md. Placeholder fields kept in [brackets] intentionally.
// Block types: 'p' paragraph, 'h' section heading, 'sub' bold sub-label, 'ul' bullet list.

export const EFFECTIVE = 'Effective July 19, 2026 · Last updated July 19, 2026';

export const LEGAL_DRAFT_NOTICE =
  'Draft template — not legal advice. Placeholder fields in [brackets] must be completed and reviewed by a qualified lawyer before publishing.';

export const TERMS_DOC = {
  title: 'Terms & Conditions',
  subtitle: 'The rules for using Venn',
  blocks: [
    { type: 'p', text: 'These Terms & Conditions ("Terms") form a binding agreement between you ("you" or "User") and [Venn Technologies Pvt. Ltd. — insert registered legal entity name] ("Venn", "we", "us"), the operator of the Venn mobile and web application (the "App" or "Service"), which helps people find and connect with prospective flatmates and rooms/flats to rent. By creating an account or otherwise using the Service, you agree to these Terms. If you do not agree, do not use the Service.' },

    { type: 'h', text: '1. Eligibility' },
    { type: 'p', text: 'You must be at least 18 years old to create an account. By registering, you represent that you are 18 or older, that you have the legal capacity to enter into this agreement, and that all information you provide during onboarding (name, birthday, gender, photos, lifestyle preferences, and any other profile detail) is accurate and belongs to you. We may ask you to verify your identity (for example via phone OTP, email link, or Google sign-in) and may suspend or terminate accounts we reasonably believe are underage, impersonated, or fraudulent.' },

    { type: 'h', text: '2. The Service' },
    { type: 'p', text: 'Venn lets you build a profile, set flatmate/room preferences (budget, move-in date, location, lifestyle), browse other users\' profiles, express interest ("likes"), match when interest is mutual, and message matched users directly in the App. Users identify as either looking for a place ("seeking") or listing a place they have ("owner"). Venn is a discovery and communication tool only — we do not own, manage, lease, broker, or guarantee any property, and we are not a party to any tenancy, licence, or flat-sharing arrangement you enter into with another user.' },

    { type: 'h', text: '3. Account & Profile Responsibilities' },
    { type: 'ul', items: [
      'You are responsible for the accuracy of your profile, including your photos, and for keeping your login credentials confidential.',
      'One account per person. Accounts are for personal, non-commercial use.',
      'You may not misrepresent your identity, age, gender, occupation, or living situation, or use another person\'s photos.',
      'You are solely responsible for what you say in messages and in your bio/prompts, subject to the Community Guidelines.',
      'You may pause or delete your profile at any time from Settings; deletion removes your profile and photos per our Privacy Policy.',
    ] },

    { type: 'h', text: '4. Prohibited Conduct' },
    { type: 'p', text: 'You agree not to:' },
    { type: 'ul', items: [
      'Harass, threaten, defame, stalk, or discriminate against another user on the basis of protected characteristics (religion, caste, gender, sexual orientation, disability, etc.);',
      'Solicit money, gifts, or financial information from other users, or use the Service for scams, phishing, or fraud (including fake listings or fake flatmate profiles);',
      'Post sexually explicit, violent, or otherwise unlawful content, or advertise commercial goods, services, or unrelated properties;',
      'Use bots, scrapers, or automated means to access the Service, or attempt to reverse-engineer, probe, or interfere with its security;',
      'Circumvent blocking/reporting features, contact a user who has blocked you, or retaliate against someone who reported you;',
      'Use the Service if you have been previously banned, or to create a new account after removal for a Terms or Community Guidelines violation.',
    ] },
    { type: 'p', text: 'Violations may result in content removal, warnings, temporary suspension, or permanent termination of your account, at our discretion and without prior notice where safety is at risk.' },

    { type: 'h', text: '5. Reporting, Blocking & Moderation' },
    { type: 'p', text: 'The App lets you block or report another user directly from their profile or a chat. Reports are reviewed by our safety team; we may act on a report by warning, suspending, or banning the reported account, and by removing associated content. Blocking a user ends any active match and chat history between you. We do not disclose the identity of a reporting user to the reported user.' },

    { type: 'h', text: '6. In-Person Meetings & Safety' },
    { type: 'p', text: 'Venn verifies phone numbers and email addresses but does not conduct criminal background checks, credit checks, or identity verification on users or the properties they list. You are solely responsible for exercising judgment and caution when communicating with other users and when arranging or attending an in-person meeting, property viewing, or move-in. See the Community Guidelines & Safety Center for safety recommendations. We are not liable for the conduct of any user, on or off the Service, or for any tenancy or living arrangement you enter into with another user.' },

    { type: 'h', text: '7. Fees' },
    { type: 'p', text: 'The core Service is currently free to use. If Venn introduces paid features (e.g. premium visibility or verification), the applicable pricing and terms will be presented to you before purchase, and this section will be updated accordingly.' },

    { type: 'h', text: '8. Intellectual Property' },
    { type: 'p', text: 'The Venn name, logo, App design, and underlying software are owned by Venn or its licensors and protected by intellectual property laws. You retain ownership of content you post (photos, bio, prompts, messages), and grant us a worldwide, royalty-free licence to host, store, reproduce, and display that content solely to operate and improve the Service (e.g. showing your profile to other users).' },

    { type: 'h', text: '9. Third-Party Services' },
    { type: 'p', text: 'The Service relies on third-party infrastructure, including Firebase (Google) for authentication and Supabase for data storage, and may use Google Sign-In. Your use of those integrations is also subject to the relevant provider\'s own terms.' },

    { type: 'h', text: '10. Disclaimers & Limitation of Liability' },
    { type: 'p', text: 'The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement. We do not guarantee that you will find a flatmate or flat, or that any user or listing is accurate, safe, or legitimate. To the maximum extent permitted by law, Venn and its officers, employees, and affiliates will not be liable for indirect, incidental, special, or consequential damages, or for any loss arising from your interactions with other users or third parties, whether online or in person.' },

    { type: 'h', text: '11. Termination' },
    { type: 'p', text: 'You may delete your account at any time. We may suspend or terminate your account, with or without notice, for violation of these Terms, the Community Guidelines, suspected fraud or safety risk, or extended inactivity. Sections that by their nature should survive termination (intellectual property, disclaimers, limitation of liability, governing law) will survive.' },

    { type: 'h', text: '12. Changes to These Terms' },
    { type: 'p', text: 'We may update these Terms from time to time. Material changes will be notified in-app or by email before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.' },

    { type: 'h', text: '13. Governing Law & Disputes' },
    { type: 'p', text: 'These Terms are governed by the laws of India. Subject to applicable law, the courts of [City/State — insert], India shall have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Service.' },

    { type: 'h', text: '14. Contact' },
    { type: 'p', text: 'Questions about these Terms can be sent to hello@venn.app. For grievances under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, contact our Grievance Officer, [Grievance Officer name — insert], at grievance@venn.app or the address at [Registered office address — insert].' },
  ],
};

export const PRIVACY_DOC = {
  title: 'Privacy Policy',
  subtitle: 'How Venn collects, uses, and protects your data',
  blocks: [
    { type: 'p', text: 'This Privacy Policy explains how [Venn Technologies Pvt. Ltd. — insert registered legal entity name] ("Venn", "we", "us") collects, uses, discloses, and protects information when you use the Venn App. It should be read together with our Terms & Conditions.' },

    { type: 'h', text: '1. Information We Collect' },
    { type: 'sub', text: 'Provided directly by you:' },
    { type: 'ul', items: [
      'Contact & account: phone number, email address, and (if you use Google Sign-In) your Google account identifiers.',
      'Profile: name, birthday (used to compute and display your age), gender, pronouns, bio, prompts, and profile photos.',
      'Preferences: what you\'re looking for (flat/flatmate), budget range, preferred move-in date, preferred areas/cities, preferred gender/age range of flatmates, occupation, and lifestyle answers (food habits, smoking, drinking, pets).',
      'Listing details (if you list a place): flat type, budget, location, move-in date, job/education details you choose to share.',
      'Content: messages you send to matches, likes/comments you leave on profiles, and reports you file against other users.',
    ] },
    { type: 'sub', text: 'Collected automatically:' },
    { type: 'ul', items: [
      'Authentication tokens and sign-in metadata from Firebase Authentication.',
      'Activity data such as your last-active timestamp (used to show "Active now" / "Active Xh ago" status to other users) and basic in-app usage.',
      'Device/browser information and, on web, push-notification subscription details (endpoint and encryption keys) if you opt in to notifications.',
    ] },

    { type: 'h', text: '2. How We Use Your Information' },
    { type: 'ul', items: [
      'To create and operate your account, and to authenticate you securely via Firebase.',
      'To show your profile to other users and to power discovery, filtering, and matching.',
      'To deliver in-app and push notifications (e.g. new likes, matches, and messages).',
      'To operate safety features: processing reports, applying blocks, and removing content or accounts that violate our Terms or Community Guidelines.',
      'To maintain, secure, debug, and improve the Service.',
      'To communicate with you about your account, and to comply with legal obligations.',
    ] },
    { type: 'p', text: 'We do not sell your personal information. We do not use your data to serve third-party advertising.' },

    { type: 'h', text: '3. Who Sees Your Information' },
    { type: 'ul', items: [
      'Other users: your profile (name, age, photos, bio, prompts, and the preferences you\'ve chosen to show) is visible to other users of the Service so matching can work. Messages are visible only to you and the matched recipient.',
      'Service providers: we use Firebase (Google) for authentication and Supabase (PostgreSQL) for data storage; both process data on our behalf under their own data-processing terms and industry-standard security controls, including row-level security policies that restrict who can read or write which records.',
      'Legal & safety: we may disclose information where required by law, to enforce our Terms, or to protect the rights, property, or safety of Venn, our users, or the public — for example when responding to a valid legal request or investigating a safety report.',
    ] },

    { type: 'h', text: '4. Blocking, Reporting & Retention of Safety Data' },
    { type: 'p', text: 'When you block a user, we stop showing that user\'s profile to you (and vice versa) and end any existing match between you. When you report a user, the report (reason, details, and status) is retained so our safety team can investigate and so repeat patterns of abuse can be identified, even if the reported account is later deleted.' },

    { type: 'h', text: '5. Data Retention & Deletion' },
    { type: 'p', text: 'We retain your profile and content for as long as your account is active. You can delete your account at any time from Settings, which removes your profile record and photos from storage. Some information (e.g. reports you were involved in, or records we must keep for legal or fraud-prevention purposes) may be retained for a limited period after deletion as permitted by law.' },

    { type: 'h', text: '6. Your Rights' },
    { type: 'p', text: 'Subject to applicable law (including India\'s Digital Personal Data Protection Act, 2023), you may have the right to access, correct, or delete your personal data, withdraw consent, and lodge a complaint with the relevant data protection authority. You can exercise most of these rights directly in the App (Edit Profile, Preferences, Delete Account) or by contacting us at privacy@venn.app.' },

    { type: 'h', text: '7. Children\'s Privacy' },
    { type: 'p', text: 'The Service is not directed to, and may not be used by, anyone under 18. We do not knowingly collect data from minors; if we learn an account belongs to a minor, we will delete it.' },

    { type: 'h', text: '8. Security' },
    { type: 'p', text: 'We use industry-standard safeguards, including encrypted connections (HTTPS), Firebase-issued authentication tokens validated on every request, and database-level row-level-security policies restricting each user to their own data and data they\'re authorized to see (e.g. matched conversations). No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.' },

    { type: 'h', text: '9. International Data Transfers' },
    { type: 'p', text: 'Our service providers (Firebase/Google, Supabase) may process and store data in data centers located outside your country of residence. Where required, we rely on appropriate contractual and technical safeguards for such transfers.' },

    { type: 'h', text: '10. Changes to This Policy' },
    { type: 'p', text: 'We may update this Privacy Policy from time to time. Material changes will be communicated in-app or by email before taking effect.' },

    { type: 'h', text: '11. Contact' },
    { type: 'p', text: 'Privacy questions or data requests: privacy@venn.app.' },
  ],
};

export const COOKIE_DOC = {
  title: 'Cookie Policy',
  subtitle: 'How Venn uses cookies and similar technologies',
  blocks: [
    { type: 'p', text: 'This Cookie Policy explains how we use cookies, local storage, and similar technologies on the Venn web app (venn.app) and how you can control them. It complements our Privacy Policy.' },

    { type: 'h', text: '1. What Are Cookies?' },
    { type: 'p', text: 'Cookies are small text files stored on your device by your browser. We also use similar browser storage mechanisms — localStorage, sessionStorage, and IndexedDB — which behave like cookies for the purposes of this policy but are not sent with every network request.' },

    { type: 'h', text: '2. How We Use Them' },
    { type: 'sub', text: 'Strictly necessary.' },
    { type: 'p', text: 'Required for the Service to function and cannot be switched off:' },
    { type: 'ul', items: [
      'Firebase Authentication session storage, so you stay signed in between visits.',
      'Temporary, locally-stored phone-verification counters, used to rate-limit OTP requests and prevent SMS abuse (never sent to our servers).',
      'Temporary storage of the email address you used for a magic-link sign-in, so we can complete the login when you click the link.',
    ] },
    { type: 'sub', text: 'Functional.' },
    { type: 'p', text: 'Used to remember your preferences (e.g. onboarding progress) and to enable optional features such as web push notifications, which store a browser-issued subscription endpoint if you opt in.' },
    { type: 'sub', text: 'What we don\'t use.' },
    { type: 'p', text: 'Venn does not use third-party advertising cookies or cross-site tracking cookies, and does not sell data collected via cookies.' },

    { type: 'h', text: '3. Third-Party Cookies' },
    { type: 'p', text: 'Signing in with Google may involve cookies set by Google as part of its authentication flow, governed by Google\'s own privacy and cookie policies.' },

    { type: 'h', text: '4. Managing Cookies' },
    { type: 'p', text: 'Most browsers let you block or delete cookies and local storage through their settings. Because sign-in and OTP rate-limiting rely on local storage, blocking it may prevent you from staying signed in or sending verification codes. You can revoke web push notification permission at any time from your browser\'s site settings.' },

    { type: 'h', text: '5. Changes to This Policy' },
    { type: 'p', text: 'We may update this Cookie Policy as our use of these technologies changes. Material changes will be reflected here with an updated effective date.' },

    { type: 'h', text: '6. Contact' },
    { type: 'p', text: 'Questions about this Cookie Policy: privacy@venn.app.' },
  ],
};

export const SAFETY_DOC = {
  title: 'Community Guidelines & Safety Center',
  subtitle: 'Staying safe while finding your flatmate on Venn',
  blocks: [
    { type: 'p', text: 'Venn connects you with people you\'ll potentially live with — that\'s a bigger step of trust than a typical online interaction. These guidelines set expectations for how our community treats each other, and give practical safety guidance for meeting matches and viewing properties in person.' },

    { type: 'h', text: 'Community Guidelines' },
    { type: 'sub', text: 'Be respectful.' },
    { type: 'p', text: 'Treat every user the way you\'d want to be treated. Harassment, hate speech, threats, discrimination (based on religion, caste, gender, sexual orientation, disability, or any other protected characteristic), and unwanted sexual content are never allowed and will result in account removal.' },
    { type: 'sub', text: 'Be honest.' },
    { type: 'p', text: 'Use your own recent photos, your real age, and accurate details about your living situation, budget, and lifestyle. Misrepresenting who you are undermines the trust the whole matching system depends on.' },
    { type: 'sub', text: 'No solicitation or spam.' },
    { type: 'p', text: 'Don\'t use Venn to advertise unrelated products or services, request money or financial details from other users, or promote listings you don\'t have the right to offer.' },
    { type: 'sub', text: 'Keep it on-platform, at first.' },
    { type: 'p', text: 'We recommend chatting within the app until you\'re comfortable, rather than immediately sharing personal contact details — it keeps a record and keeps our reporting and blocking tools effective.' },
    { type: 'sub', text: 'Report, don\'t retaliate.' },
    { type: 'p', text: 'If someone makes you uncomfortable, use the Report option on their profile or in chat. Our safety team reviews every report. You can also Block a user at any time to immediately stop contact.' },

    { type: 'h', text: 'Safety Tips for Meeting in Person' },
    { type: 'ul', items: [
      'Video call before meeting. A quick call helps confirm the person matches their profile.',
      'Meet in a public place first, or bring a friend along to an initial property viewing when possible.',
      'Tell someone your plans — share who you\'re meeting, where, and when, and share your live location with a friend or family member during the meeting.',
      'Arrange your own transport to and from the meeting; don\'t rely on the other person for a ride, especially the first time.',
      'Avoid sharing sensitive financial information (bank details, ID scans, large deposits) before you\'ve verified the listing and met in person.',
      'Trust your instincts. If something feels off — pressure to pay quickly, a listing that seems too good to be true, or a person who avoids a video call or in-person meeting — pause, and report it to us.',
      'Verify a listing independently where possible (e.g. by viewing the property in person before transferring any money) before committing to a lease or sharing a deposit.',
    ] },

    { type: 'h', text: 'Recognizing Scams' },
    { type: 'p', text: 'Common red flags include requests to pay a deposit or "hold" fee before viewing a property, urgency ("someone else is about to take it"), refusal to video call or meet in person, and requests to move the conversation to an untraceable payment method. If you encounter this, do not send money, and report the account to Venn immediately at safety@venn.app or via the in-app Report option.' },

    { type: 'h', text: 'Reporting & Blocking' },
    { type: 'p', text: 'From any profile or conversation, tap the menu and choose Report or Block. Reporting sends details to our safety team for review, without revealing your identity to the reported user. Blocking immediately ends the match and hides that user from your feed and theirs. In urgent situations involving your immediate physical safety, contact local emergency services first.' },

    { type: 'h', text: 'Contact' },
    { type: 'p', text: 'Safety concerns: safety@venn.app. For anything requiring immediate attention, please also contact local law enforcement.' },
  ],
};
