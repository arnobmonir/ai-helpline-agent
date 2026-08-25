/** Amber IT support facts & speech patterns from docs/Support docs. */

export const HELPLINE_NUMBER = "09611-123123";
export const SALES_NUMBER = "09611-933933";
export const IP_PHONE_NUMBER = "09611-99666";
export const OFFICE_WHATSAPP = "01958036170–01958036174";

export const CONTACT = {
  helpline: HELPLINE_NUMBER,
  sales: SALES_NUMBER,
  ipPhone: IP_PHONE_NUMBER,
  officeWhatsapp: OFFICE_WHATSAPP,
  officeHours: "প্রতিদিন সকাল ৯টা থেকে রাত ১০টা",
  supportHours: "Customer Care 24/7; field support সাধারণত সকাল ৮টা–রাত ১০টা",
  connectionHandover:
    "সপ্তাহের কর্মদিবস সকাল ৯টা–সন্ধ্যা ৬টা (শুক্রবারে connection handover হয় না)",
};

/** How Nusrat should sound — mirror real Amber IT CRM / sales scripts. */
export const SPEECH_STYLE = {
  address: "স্যার / ম্যাডাম (sir / madam) — polite Dhaka Bangla",
  empathy: [
    "বুঝতে পারছি স্যার।",
    "বিষয়টির জন্য আন্তরিকভাবে দুঃখিত।",
    "ঠিক আছে স্যার।",
  ],
  confirm: [
    "অনুগ্রহ করে আপনার Customer ID বা Registered Mobile Number-টি বলুন।",
    "একটু জানাবেন কোন ধরনের সমস্যা পাচ্ছেন?",
  ],
  close: [
    "Amber IT-র সাথে থাকার জন্য ধন্যবাদ।",
    "কোনো সমস্যা হলে আমাদের জানাবেন। ভালো থাকবেন।",
    "আসসালামু আলাইকুম।",
  ],
};

/** Locked opening line — keep identical in prompt, greeting nudge, and pitch docs. */
export const NUSRAT_GREETING =
  "আসসালামু আলাইকুম। Amber IT Customer Care থেকে নুসরাত বলছি। আপনাকে কীভাবে হেল্প করতে পারি?";

export const PAYMENT_SCRIPTS = {
  bkash: [
    "bKash অ্যাপ বা *247# ডায়াল করুন।",
    "Pay Bill → Internet → Amber IT সিলেক্ট করুন।",
    "SMS-এ পাওয়া Customer ID দিন।",
    "Contact Number লিখুন, Amount দিন, PIN দিয়ে পেমেন্ট সম্পন্ন করুন।",
  ],
  nagad: [
    "Nagad অ্যাপ বা *167# ডায়াল করুন।",
    "Bill Pay → Amber IT সিলেক্ট করুন।",
    "Customer ID বা Registered Mobile দিন, Amount যাচাই করে PIN দিয়ে পেমেন্ট করুন।",
  ],
  rocket: [
    "Rocket অ্যাপ বা *322# ডায়াল করুন।",
    "Bill Pay → Amber IT সিলেক্ট করুন।",
    "Customer ID বা Registered Mobile দিন, Amount যাচাই করে PIN দিয়ে পেমেন্ট করুন।",
  ],
  note: "যেকোনো bKash/Nagad/Rocket অ্যাকাউন্ট থেকে পেমেন্ট করা যায়; শুধু Customer ID সঠিক হতে হবে। myswift অ্যাপ/পোর্টালও ব্যবহার করা যায়।",
};

export const TROUBLESHOOTING = {
  noInternet: {
    title: "No internet / ONU lights",
    steps: [
      "ONU-তে কোন বাতি জ্বলছে জিজ্ঞাসা করুন — Power, PON, LOS (লাল), LAN।",
      "LOS লাল/ব্লিংক হলে fiber/signal ইস্যু — এলাকায় outage চেক, তারপর টিকেট।",
      "Power অফ হলে অ্যাডাপ্টার ও সockets চেক করতে বলুন।",
      "PON সবুজ কিন্তু LAN নেই — LAN কেবল ও রাউটার রিবুট।",
      "ONU ৩০ সেকেন্ড পাওয়ার-সাইকেল করে আবার চেক করতে বলুন।",
      "প্রয়োজনে টিকেট খুলে টিকেট আইডি পড়ে শোনান; ফাইবার টিমকে জানানো হবে।",
    ],
  },
  slowSpeed: {
    title: "Slow / buffering",
    steps: [
      "LAN কেবল দিয়ে Speed Test করতে বলুন (Wi-Fi আলাদা)।",
      "একসাথে কয়টি ডিভাইস চলছে জিজ্ঞাসা করুন।",
      "রাউটার ৫–১০ মিনিট বন্ধ রেখে আবার চালু করতে পরামর্শ দিন।",
      "সমস্যা থাকলে টিকেট/সাপোর্ট টিমে ফরোয়ার্ড।",
    ],
  },
  billing: {
    title: "Billing / unpaid",
    steps: [
      "CID বা registered mobile নিশ্চিত করুন।",
      "বকেয়া টাকা ও তারিখ বলুন।",
      "bKash / Nagad / Rocket Pay Bill (Amber IT) বা myswift দিয়ে পেমেন্ট গাইড করুন।",
      "পেমেন্টের পর সাধারণত কয়েক মিনিটের মধ্যে সার্ভিস ফিরে আসে; Confirmation SMS আসে।",
    ],
  },
  upgradeDowngrade: {
    title: "Upgrade / downgrade",
    steps: [
      "বর্তমান প্যাকেজ ও কাঙ্ক্ষিত Mbps নিশ্চিত করুন।",
      "মূল্য + ৫% VAT বলুন; ৩০ Mbps+ এ Free Installation অফার।",
      "প্যাকেজ চেঞ্জ অ্যাকটিভ কানেকশনে সাধারণত চার্জমুক্ত; শুধু ৳500 (20 Mbps) প্যাকেজে এক বছরের আগে ডাউনগ্রেডে ৳1000 চার্জ।",
      "কমার্শিয়াল টিকেট খুলুন।",
    ],
  },
  newConnection: {
    title: "New connection",
    guidance:
      "নতুন কানেকশনের জন্য Sales 09611-933933 অথবা অনলাইন রেজিস্ট্রেশন। পেমেন্ট + ডকুমেন্টের পর সাধারণত ৩ ওয়ার্কিং ডে / ৭২ ঘণ্টার মধ্যে কানেকশন।",
    salesNumber: SALES_NUMBER,
  },
};

export const KEY_FACTS = `
Quick facts (do not invent outside this):
- Helpline / Customer Care: ${HELPLINE_NUMBER} (24/7)
- Sales / general: ${SALES_NUMBER} (press 1 or 3) — roughly 9am–10pm
- After registration: 6-digit Customer ID; pay via bKash/Nagad/Rocket; then documents; connection within 3 working days (72 working hours)
- Billing cycle: 30 days prepaid from activation date; first month advance; no security deposit
- Refund: if Amber IT cannot provide connection, full refund within 2 working days
- Docs: NID/birth certificate copy + 1 passport-size photo / selfie
- ONU: company provides GPON/XPON ONU; customer buys own Wi-Fi router
- FTTH optical fiber; unlimited usage (no FUP); PPPoE; Real IP only on 250 Mbps home package
- Cache bandwidth approx: 20–50→300, 100→400, 125–250→500 Mbps
- Upstream/IIG: Summit, Level3, Bdhub, BTCL
- Do NOT share engineer personal mobile numbers (privacy)
- Friday: no connection handover; office daily 9am–10pm
`.trim();
