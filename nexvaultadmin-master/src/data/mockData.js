export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const adminStats = {
  totalUsers: 14852,
  activeUsers: 12180,
  totalTransactions: 98432,
  totalVolume: 48900000,
  pendingKyc: 34,
  monthlyGrowth: 18.4,
};

export const chartData = [
  { month: 'Jan', income: 18000, expense: 12000 },
  { month: 'Feb', income: 24000, expense: 15000 },
  { month: 'Mar', income: 32000, expense: 19000 },
  { month: 'Apr', income: 28000, expense: 18000 },
  { month: 'May', income: 45000, expense: 22000 },
  { month: 'Jun', income: 58000, expense: 28000 },
  { month: 'Jul', income: 64000, expense: 32000 },
];

const getRelativeDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

export const transactionsList = [
  { id: "tx_908124", userName: "Marcus Vance",    userEmail: "marcus.vance@stripe.com",      amount: 14500,  type: "Deposit",    status: "success", date: getRelativeDate(0)  },
  { id: "tx_129843", userName: "Elena Rostova",   userEmail: "elena.r@yandex.com",           amount: 8900,   type: "Transfer",   status: "success", date: getRelativeDate(0)  },
  { id: "tx_348291", userName: "Sarah Jenkins",   userEmail: "sarah.j@hashicorp.com",        amount: 25000,  type: "Deposit",    status: "success", date: getRelativeDate(1)  },
  { id: "tx_738129", userName: "Oliver Hansen",   userEmail: "oliver.hansen@lego.dk",        amount: 1200,   type: "Withdrawal", status: "pending", date: getRelativeDate(2)  },
  { id: "tx_998231", userName: "Lucas Silva",     userEmail: "lucas.silva@nubank.com.br",    amount: 45000,  type: "Deposit",    status: "success", date: getRelativeDate(4)  },
  { id: "tx_562341", userName: "Amina Diallo",    userEmail: "a.diallo@orange.sn",           amount: 500,    type: "Withdrawal", status: "failed",  date: getRelativeDate(10) },
  { id: "tx_628312", userName: "Thomas Mueller",  userEmail: "t.mueller@sap.com",            amount: 98000,  type: "Transfer",   status: "success", date: getRelativeDate(12) },
  { id: "tx_506921", userName: "Isabella Rossi",  userEmail: "i.rossi@ferrari.it",           amount: 125000, type: "Deposit",    status: "success", date: getRelativeDate(22) },
  { id: "tx_667231", userName: "Nikhil Sharma",   userEmail: "nikhil.sharma@tcs.in",         amount: 4200,   type: "Transfer",   status: "success", date: getRelativeDate(45) },
];

export const adminUsers = [
  { id: "usr_91283", name: "Marcus Vance",    email: "marcus.vance@stripe.com",      dob: "Oct 14, 1994", kyc: "verified",   status: "active",    balance: 145800, transactions: 245, joined: "Jan 12, 2024", documentType: "Passport",        documentId: "PP-984321A" },
  { id: "usr_48291", name: "Elena Rostova",   email: "elena.r@yandex.com",           dob: "Feb 05, 1991", kyc: "verified",   status: "active",    balance: 89400,  transactions: 189, joined: "Feb 18, 2024", documentType: "National ID",     documentId: "ID-108249B" },
  { id: "usr_73812", name: "Kenji Sato",      email: "kenji.sato@sony.co.jp",        dob: "Aug 22, 1997", kyc: "pending",    status: "active",    balance: 0,      transactions: 0,   joined: "May 02, 2026", documentType: "Passport",        documentId: "PP-729831J" },
  { id: "usr_10293", name: "Sarah Jenkins",   email: "sarah.j@hashicorp.com",        dob: "Dec 30, 1988", kyc: "verified",   status: "active",    balance: 420500, transactions: 612, joined: "Jul 29, 2023", documentType: "Driving License", documentId: "DL-672981Z" },
  { id: "usr_56234", name: "Amina Diallo",    email: "a.diallo@orange.sn",           dob: "Jun 18, 2002", kyc: "unverified", status: "suspended", balance: 0,      transactions: 0,   joined: "Apr 15, 2026", documentType: "National ID",     documentId: "ID-908234K" },
  { id: "usr_38472", name: "Oliver Hansen",   email: "oliver.hansen@lego.dk",        dob: "Nov 09, 1993", kyc: "verified",   status: "active",    balance: 62300,  transactions: 92,  joined: "Oct 05, 2024", documentType: "Passport",        documentId: "PP-289412M" },
  { id: "usr_29103", name: "Chloe Dupont",    email: "chloe.dupont@loreal.fr",       dob: "Mar 25, 1995", kyc: "pending",    status: "active",    balance: 0,      transactions: 0,   joined: "May 20, 2026", documentType: "National ID",     documentId: "ID-510928P" },
  { id: "usr_99823", name: "Lucas Silva",     email: "lucas.silva@nubank.com.br",    dob: "Jul 02, 1990", kyc: "verified",   status: "active",    balance: 175400, transactions: 310, joined: "Dec 01, 2023", documentType: "Passport",        documentId: "PP-891023X" },
  { id: "usr_47382", name: "Sophia Martinez", email: "sophia.m@mercadolibre.com.ar", dob: "Jan 12, 1998", kyc: "unverified", status: "active",    balance: 3100,   transactions: 4,   joined: "Mar 11, 2026", documentType: "Driving License", documentId: "DL-473928L" },
  { id: "usr_62831", name: "Thomas Mueller",  email: "t.mueller@sap.com",            dob: "May 14, 1987", kyc: "verified",   status: "active",    balance: 295000, transactions: 412, joined: "Sep 22, 2023", documentType: "National ID",     documentId: "ID-110928S" },
  { id: "usr_88231", name: "Liam Gallagher",  email: "l.gallagher@oasis.co.uk",      dob: "Sep 21, 1992", kyc: "unverified", status: "disabled",  balance: 1200,   transactions: 12,  joined: "Jan 30, 2025", documentType: "Driving License", documentId: "DL-883921W" },
  { id: "usr_11928", name: "Zahra Ahmadi",    email: "zahra@ahmadi-tech.io",          dob: "Apr 04, 1996", kyc: "verified",   status: "active",    balance: 512000, transactions: 789, joined: "Jun 14, 2023", documentType: "Passport",        documentId: "PP-339841C" },
  { id: "usr_30495", name: "David Kim",       email: "david.kim@samsung.com",        dob: "Dec 12, 2000", kyc: "pending",    status: "active",    balance: 0,      transactions: 0,   joined: "Apr 28, 2026", documentType: "Driving License", documentId: "DL-203948V" },
  { id: "usr_50692", name: "Isabella Rossi",  email: "i.rossi@ferrari.it",            dob: "Jun 03, 1995", kyc: "verified",   status: "active",    balance: 840200, transactions: 934, joined: "Nov 03, 2022", documentType: "Passport",        documentId: "PP-502938H" },
  { id: "usr_66723", name: "Nikhil Sharma",   email: "nikhil.sharma@tcs.in",          dob: "Mar 11, 1991", kyc: "verified",   status: "active",    balance: 41600,  transactions: 76,  joined: "Aug 17, 2024", documentType: "National ID",     documentId: "ID-667283R" },
];
