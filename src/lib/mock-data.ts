export const mockUser = {
  id: "usr_001",
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "AJ",
  plan: "FREE",
  subscriptionTier: "FREE" as "FREE" | "PLUS" | "PRO",
  onboardingCompleted: true,
};

export const mockAccounts = [
  { id: "acc_001", name: "Chase Checking", institution: "Chase", type: "checking", balance: 4821.33, available: 4721.33, mask: "4521", color: "#0070f3", lastSync: "2026-06-11", includeInNetWorth: true, includeInBudget: true, visible: true },
  { id: "acc_002", name: "Chase Savings", institution: "Chase", type: "savings", balance: 12450.00, available: 12450.00, mask: "8832", color: "#0070f3", lastSync: "2026-06-11", includeInNetWorth: true, includeInBudget: false, visible: true },
  { id: "acc_003", name: "Citi Double Cash", institution: "Citi", type: "credit", balance: -2134.56, available: 7865.44, mask: "1234", color: "#e11d48", lastSync: "2026-06-11", includeInNetWorth: true, includeInBudget: true, visible: true },
  { id: "acc_004", name: "Fidelity Brokerage", institution: "Fidelity", type: "brokerage", balance: 18450.75, available: 18450.75, mask: "7890", color: "#16a34a", lastSync: "2026-06-11", includeInNetWorth: true, includeInBudget: false, visible: true },
  { id: "acc_005", name: "Fidelity 401(k)", institution: "Fidelity", type: "retirement", balance: 42300.00, available: 42300.00, mask: "5678", color: "#16a34a", lastSync: "2026-06-11", includeInNetWorth: true, includeInBudget: false, visible: true },
];

export const mockTransactions = [
  { id: "txn_001", date: "2026-06-11", merchant: "Whole Foods Market", account: "acc_003", category: "Groceries", amount: -87.43, status: "posted", tags: ["food"], notes: "" },
  { id: "txn_002", date: "2026-06-10", merchant: "Netflix", account: "acc_003", category: "Subscriptions", amount: -15.99, status: "posted", tags: [], notes: "" },
  { id: "txn_003", date: "2026-06-10", merchant: "Uber", account: "acc_001", category: "Transportation", amount: -24.50, status: "posted", tags: [], notes: "" },
  { id: "txn_004", date: "2026-06-09", merchant: "Employer Direct Deposit", account: "acc_001", category: "Income", amount: 2800.00, status: "posted", tags: [], notes: "" },
  { id: "txn_005", date: "2026-06-09", merchant: "Chipotle", account: "acc_003", category: "Dining", amount: -14.75, status: "posted", tags: [], notes: "" },
  { id: "txn_006", date: "2026-06-08", merchant: "Amazon", account: "acc_003", category: "Shopping", amount: -67.99, status: "posted", tags: [], notes: "" },
  { id: "txn_007", date: "2026-06-08", merchant: "Starbucks", account: "acc_001", category: "Dining", amount: -6.85, status: "posted", tags: [], notes: "" },
  { id: "txn_008", date: "2026-06-07", merchant: "Spotify", account: "acc_003", category: "Subscriptions", amount: -9.99, status: "posted", tags: [], notes: "" },
  { id: "txn_009", date: "2026-06-07", merchant: "CVS Pharmacy", account: "acc_001", category: "Health", amount: -23.14, status: "posted", tags: [], notes: "" },
  { id: "txn_010", date: "2026-06-06", merchant: "Con Edison", account: "acc_001", category: "Utilities", amount: -142.00, status: "posted", tags: [], notes: "" },
  { id: "txn_011", date: "2026-06-06", merchant: "Trader Joe's", account: "acc_001", category: "Groceries", amount: -54.22, status: "posted", tags: [], notes: "" },
  { id: "txn_012", date: "2026-06-05", merchant: "Apple App Store", account: "acc_003", category: "Entertainment", amount: -4.99, status: "posted", tags: [], notes: "" },
  { id: "txn_013", date: "2026-06-05", merchant: "Gym Membership", account: "acc_001", category: "Health", amount: -49.00, status: "posted", tags: [], notes: "" },
  { id: "txn_014", date: "2026-06-04", merchant: "Shell Gas Station", account: "acc_001", category: "Transportation", amount: -58.30, status: "posted", tags: [], notes: "" },
  { id: "txn_015", date: "2026-06-04", merchant: "Target", account: "acc_003", category: "Shopping", amount: -112.45, status: "posted", tags: [], notes: "" },
  { id: "txn_016", date: "2026-06-03", merchant: "Sushi Restaurant", account: "acc_003", category: "Dining", amount: -78.00, status: "posted", tags: [], notes: "" },
  { id: "txn_017", date: "2026-06-03", merchant: "Venmo Transfer", account: "acc_001", category: "Transfers", amount: -200.00, status: "posted", tags: [], notes: "" },
  { id: "txn_018", date: "2026-06-02", merchant: "Hulu", account: "acc_003", category: "Subscriptions", amount: -17.99, status: "posted", tags: [], notes: "" },
  { id: "txn_019", date: "2026-06-01", merchant: "Rent Payment", account: "acc_001", category: "Housing", amount: -1850.00, status: "posted", tags: [], notes: "" },
  { id: "txn_020", date: "2026-06-01", merchant: "Freelance Payment", account: "acc_001", category: "Income", amount: 500.00, status: "posted", tags: [], notes: "" },
];

// ── 12 months of generated transaction history (Jul 2025 – Jun 2026) ──
// Deterministic (seeded) so the data is stable across reloads.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHistory() {
  const rand = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100;

  const groceryStores = ["Whole Foods Market", "Trader Joe's", "Safeway", "Costco"];
  const restaurants = ["Chipotle", "Starbucks", "Sushi Restaurant", "Thai Kitchen", "Five Guys", "Olive Garden"];
  const shops = ["Amazon", "Target", "Best Buy", "Nike Store", "Uniqlo"];
  const transport = ["Uber", "Shell Gas Station", "Lyft", "Metro Card Reload"];
  const entertainment = ["AMC Theatres", "Apple App Store", "Steam Games", "Concert Tickets"];

  const txns: typeof mockTransactions = [];
  let id = 1000;
  const months = [
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  ];

  for (const ym of months) {
    const isCurrentMonth = ym === "2026-06";
    const maxDay = isCurrentMonth ? 11 : 28; // current month only has data through "today"
    const day = (d: number) => `${ym}-${String(Math.min(d, maxDay)).padStart(2, "0")}`;
    const add = (date: string, merchant: string, account: string, category: string, amount: number) => {
      txns.push({ id: `txn_${id++}`, date, merchant, account, category, amount, status: "posted", tags: [], notes: "" });
    };

    // Fixed monthly items
    add(day(1), "Rent Payment", "acc_001", "Housing", -1850);
    add(day(9), "Employer Direct Deposit", "acc_001", "Income", 2800);
    if (!isCurrentMonth) add(day(24), "Employer Direct Deposit", "acc_001", "Income", 2800);
    if (rand() > 0.4) add(day(Math.ceil(rand() * 5)), "Freelance Payment", "acc_001", "Income", between(200, 800));
    add(day(6), "Con Edison", "acc_001", "Utilities", -between(110, 185));
    add(day(2), "Hulu", "acc_003", "Subscriptions", -17.99);
    add(day(7), "Spotify", "acc_003", "Subscriptions", -9.99);
    add(day(10), "Netflix", "acc_003", "Subscriptions", -15.99);
    add(day(5), "Gym Membership", "acc_001", "Health", -49);

    // Variable spending
    const nGroceries = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < nGroceries; i++) add(day(Math.ceil(rand() * maxDay)), pick(groceryStores), pick(["acc_001", "acc_003"]), "Groceries", -between(25, 95));
    const nDining = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < nDining; i++) add(day(Math.ceil(rand() * maxDay)), pick(restaurants), "acc_003", "Dining", -between(8, 78));
    const nShopping = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < nShopping; i++) add(day(Math.ceil(rand() * maxDay)), pick(shops), "acc_003", "Shopping", -between(20, 160));
    const nTransport = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < nTransport; i++) add(day(Math.ceil(rand() * maxDay)), pick(transport), "acc_001", "Transportation", -between(12, 65));
    if (rand() > 0.5) add(day(Math.ceil(rand() * maxDay)), pick(entertainment), "acc_003", "Entertainment", -between(5, 60));
    if (rand() > 0.6) add(day(Math.ceil(rand() * maxDay)), "CVS Pharmacy", "acc_001", "Health", -between(10, 45));
  }

  txns.sort((a, b) => b.date.localeCompare(a.date));
  return txns;
}

// Full 12-month history (≈200 transactions) for the transactions & spending pages
export const mockTransactionsAll = generateHistory();

// Monthly budget per category (for budget-vs-actual comparisons)
export const monthlyBudgets: Record<string, number> = {
  Housing: 2000, Groceries: 400, Dining: 200, Shopping: 150,
  Transportation: 100, Subscriptions: 50, Utilities: 150, Health: 100, Entertainment: 50,
};

export const categoryColors: Record<string, string> = {
  Housing: "#0070f3", Groceries: "#10b981", Dining: "#f97316", Shopping: "#ec4899",
  Transportation: "#8b5cf6", Subscriptions: "#6366f1", Utilities: "#f59e0b",
  Health: "#ef4444", Entertainment: "#06b6d4", Income: "#16a34a", Other: "#94a3b8",
};

export const mockCategories = [
  { id: "cat_income", name: "Income", type: "income", icon: "💰", color: "#16a34a" },
  { id: "cat_housing", name: "Housing", type: "expense", icon: "🏠", color: "#0070f3" },
  { id: "cat_utilities", name: "Utilities", type: "expense", icon: "⚡", color: "#f59e0b" },
  { id: "cat_groceries", name: "Groceries", type: "expense", icon: "🛒", color: "#10b981" },
  { id: "cat_dining", name: "Dining", type: "expense", icon: "🍽️", color: "#f97316" },
  { id: "cat_transport", name: "Transportation", type: "expense", icon: "🚗", color: "#8b5cf6" },
  { id: "cat_shopping", name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899" },
  { id: "cat_entertainment", name: "Entertainment", type: "expense", icon: "🎬", color: "#06b6d4" },
  { id: "cat_health", name: "Health", type: "expense", icon: "❤️", color: "#ef4444" },
  { id: "cat_subscriptions", name: "Subscriptions", type: "expense", icon: "📱", color: "#6366f1" },
  { id: "cat_transfers", name: "Transfers", type: "transfer", icon: "↔️", color: "#94a3b8" },
  { id: "cat_savings", name: "Savings", type: "savings", icon: "💎", color: "#0ea5e9" },
];

export const mockSpendingByCategory = [
  { category: "Housing", amount: 1850, budget: 2000, color: "#0070f3" },
  { category: "Groceries", amount: 141.65, budget: 400, color: "#10b981" },
  { category: "Dining", amount: 99.60, budget: 200, color: "#f97316" },
  { category: "Shopping", amount: 180.44, budget: 150, color: "#ec4899" },
  { category: "Transportation", amount: 82.80, budget: 100, color: "#8b5cf6" },
  { category: "Subscriptions", amount: 43.97, budget: 50, color: "#6366f1" },
  { category: "Utilities", amount: 142.00, budget: 150, color: "#f59e0b" },
  { category: "Health", amount: 72.14, budget: 100, color: "#ef4444" },
  { category: "Entertainment", amount: 4.99, budget: 50, color: "#06b6d4" },
];

export const mockSpendingOverTime = [
  { month: "Jan", groceries: 320, dining: 210, shopping: 180, utilities: 160, transport: 90 },
  { month: "Feb", groceries: 290, dining: 185, shopping: 220, utilities: 150, transport: 75 },
  { month: "Mar", groceries: 355, dining: 240, shopping: 290, utilities: 175, transport: 110 },
  { month: "Apr", groceries: 310, dining: 200, shopping: 195, utilities: 155, transport: 95 },
  { month: "May", groceries: 275, dining: 155, shopping: 140, utilities: 145, transport: 80 },
  { month: "Jun", groceries: 142, dining: 100, shopping: 180, utilities: 142, transport: 83 },
];

// 24 months of net worth history ending June 2026
export const mockNetWorthHistoryFull = [
  { month: "Jul '24", date: "2024-07", netWorth: 54100 },
  { month: "Aug '24", date: "2024-08", netWorth: 55300 },
  { month: "Sep '24", date: "2024-09", netWorth: 54900 },
  { month: "Oct '24", date: "2024-10", netWorth: 56400 },
  { month: "Nov '24", date: "2024-11", netWorth: 57800 },
  { month: "Dec '24", date: "2024-12", netWorth: 59200 },
  { month: "Jan '25", date: "2025-01", netWorth: 60100 },
  { month: "Feb '25", date: "2025-02", netWorth: 59600 },
  { month: "Mar '25", date: "2025-03", netWorth: 61400 },
  { month: "Apr '25", date: "2025-04", netWorth: 62800 },
  { month: "May '25", date: "2025-05", netWorth: 63500 },
  { month: "Jun '25", date: "2025-06", netWorth: 64900 },
  { month: "Jul '25", date: "2025-07", netWorth: 65800 },
  { month: "Aug '25", date: "2025-08", netWorth: 66200 },
  { month: "Sep '25", date: "2025-09", netWorth: 65700 },
  { month: "Oct '25", date: "2025-10", netWorth: 67100 },
  { month: "Nov '25", date: "2025-11", netWorth: 67900 },
  { month: "Dec '25", date: "2025-12", netWorth: 67400 },
  { month: "Jan '26", date: "2026-01", netWorth: 68200 },
  { month: "Feb '26", date: "2026-02", netWorth: 69800 },
  { month: "Mar '26", date: "2026-03", netWorth: 71200 },
  { month: "Apr '26", date: "2026-04", netWorth: 73500 },
  { month: "May '26", date: "2026-05", netWorth: 74600 },
  { month: "Jun '26", date: "2026-06", netWorth: 75887 },
];

export const mockNetWorthHistory = mockNetWorthHistoryFull.slice(-6).map((m) => ({
  month: m.month.split(" ")[0],
  netWorth: m.netWorth,
}));

export const mockHoldings = [
  { id: "h_001", symbol: "VTI", name: "Vanguard Total Stock Market ETF", shares: 45, price: 245.30, value: 11038.50, gain: 1820.50, gainPct: 19.8, color: "#6366f1" },
  { id: "h_002", symbol: "VXUS", name: "Vanguard Total International Stock ETF", shares: 80, price: 61.20, value: 4896.00, gain: 312.00, gainPct: 6.8, color: "#10b981" },
  { id: "h_003", symbol: "BND", name: "Vanguard Total Bond Market ETF", shares: 25, price: 73.50, value: 1837.50, gain: -87.50, gainPct: -4.5, color: "#f59e0b" },
  { id: "h_004", symbol: "CASH", name: "Cash & Equivalents", shares: 678.75, price: 1.00, value: 678.75, gain: 0, gainPct: 0, color: "#94a3b8" },
];

export const mockBudget = {
  month: "June 2026",
  totalBudgeted: 3200,
  totalSpent: 2430.75,
  categories: mockSpendingByCategory,
};

export const mockDashboard = {
  netWorth: 75887.52,
  netWorthChange: 1287.52,
  cash: 17271.33,
  debt: 2134.56,
  investments: 60750.75,
  monthlySpending: 2430.75,
  spendingChange: 11.5,
  budgetPercent: 75.96,
  forecastRisk: "LOW",
};

export const mockAIInsights = [
  { id: "ins_001", type: "warning", title: "Dining spending up 28%", body: "You've spent $99.60 on dining this month, 28% more than May's $77.80. Consider meal prepping to stay within budget." },
  { id: "ins_002", type: "positive", title: "Savings rate looking good", body: "Your savings rate this month is 18.2%, above your goal of 15%. Great work!" },
  { id: "ins_003", type: "info", title: "3 recurring subscriptions detected", body: "Netflix, Spotify, and Hulu total $43.97/month. Review if all are still being used." },
];

export const mockForecastData = [
  { month: "Jun", baseline: 75887, scenario: 75887 },
  { month: "Jul", baseline: 77200, scenario: 78400 },
  { month: "Aug", baseline: 78500, scenario: 80900 },
  { month: "Sep", baseline: 79800, scenario: 83500 },
  { month: "Oct", baseline: 81100, scenario: 86100 },
  { month: "Nov", baseline: 82400, scenario: 88700 },
  { month: "Dec", baseline: 83700, scenario: 91400 },
];

export const mockConversations = [
  {
    id: "conv_001",
    title: "Monthly spending review",
    messages: [
      { role: "user", content: "How much did I spend this month?", time: "2026-06-11T10:00:00Z" },
      { role: "assistant", content: "Based on your connected accounts, you've spent **$2,430.75** this month (June 1–11). Here's the breakdown:\n\n• Housing: $1,850.00 (76%)\n• Groceries: $141.65 (6%)\n• Dining: $99.60 (4%)\n• Shopping: $180.44 (7%)\n• Other: $159.06 (7%)\n\nYou're on track for approximately $3,200–$3,400 total this month. Your budget is $3,200, so you may go slightly over if spending continues at this pace.", time: "2026-06-11T10:00:15Z" },
    ],
  },
];

export const mockPricingTiers = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Get started with the basics — free forever.",
    features: [
      "Connect up to 2 institutions",
      "Basic dashboard",
      "Transaction history",
      "Basic spending analytics",
      "1 budget",
      "10 AI questions/month",
      "2 forecasts/month",
    ],
    cta: "Current plan",
    highlighted: false,
  },
  {
    name: "Plus",
    price: 9.99,
    period: "month",
    description: "More connections, smarter analytics, and better AI.",
    features: [
      "Connect up to 5 institutions",
      "Advanced spending analytics",
      "Custom category rules",
      "50 AI questions/month",
      "Unlimited budgets",
      "Basic what-if simulations",
      "Subscription detection",
      "No ads",
    ],
    cta: "Upgrade to Plus",
    highlighted: true,
  },
  {
    name: "Pro",
    price: 19.99,
    period: "month",
    description: "The full FinPilot experience for serious wealth builders.",
    features: [
      "Unlimited institutions",
      "Advanced AI assistant",
      "Advanced forecasting",
      "Save unlimited simulations",
      "Full investment analytics",
      "Dividend tracking",
      "Data export (CSV/PDF)",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlighted: false,
  },
];
