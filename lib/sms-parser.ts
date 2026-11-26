import { SMSParseResult, TransactionType } from './types';

const CATEGORY_RULES: Record<string, string[]> = {
  'Food & Dining': [
    'swiggy', 'zomato', 'mcdonald', 'kfc', 'dominos', 'burger king', 'pizza hut',
    'starbucks', 'chaayos', 'chai point', 'barbeque', 'cafe', 'restaurant',
    'dhaba', 'bakery', 'eats', 'biryani', 'haldiram', 'sweet', 'food'
  ],
  'Groceries': [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'bb daily', 'dmart', 'spencers',
    'nature basket', 'supermarket', 'kirana', 'milk', 'dairy', 'fresh'
  ],
  'Travel & Fuel': [
    'uber', 'ola', 'rapido', 'metro', 'irctc', 'redbus', 'makemytrip', 'goibibo',
    'petrol', 'fuel', 'indian oil', 'hpcl', 'bpcl', 'shell', 'cng', 'fastag',
    'toll', 'flight', 'indigo', 'air india', 'railways'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tata cliq', 'zara', 'h&m',
    'uniqlo', 'croma', 'reliance retail', 'meesho', 'decathlon', 'lifestyle',
    'shoppers stop', 'retail', 'clothing', 'fashion'
  ],
  'Bills & Utilities': [
    'electricity', 'bescom', 'tata power', 'adani electricity', 'water', 'gas',
    'airtel', 'jio', 'vi', 'vodafone', 'act fibernet', 'broadband', 'billdesk',
    'recharge', 'rent', 'maintenance', 'utility'
  ],
  'Entertainment & Subs': [
    'netflix', 'spotify', 'prime video', 'hotstar', 'youtube', 'apple.com/bill',
    'google play', 'bookmyshow', 'pvr', 'inox', 'cinema', 'sonyliv', 'zee5',
    'playstation', 'steam', 'game'
  ],
  'Health & Medical': [
    'apollo', 'pharmeasy', '1mg', 'tata 1mg', 'netmeds', 'medplus', 'hospital',
    'clinic', 'doctor', 'pharmacy', 'cult.fit', 'gym', 'fitness', 'diagnostics'
  ],
  'Investments & Savings': [
    'zerodha', 'groww', 'angelone', 'upstox', 'coin', 'indmoney', 'kuvera',
    'mutual fund', 'sip', 'ppf', 'nps', 'gold', 'crypto'
  ],
  'Salary & Income': [
    'salary', 'payroll', 'wages', 'client', 'freelance', 'upwork', 'fiverr',
    'dividend', 'interest', 'cashback', 'refund'
  ]
};

const EXPLICIT_SELF_TRANSFER_PHRASES = [
  'self transfer', 'transfer to own', 'trf to own', 'own a/c', 'to own account',
  'within bank', 'linked a/c', 'internal transfer', 'to my account'
];

export function parseBankSMS(
  rawText: string,
  defaultDate = new Date(),
  myAccounts: string[] = []
): SMSParseResult {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { success: false, confidence: 0, error: 'Empty SMS text provided' };
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect if it's a CREDIT (Money Coming In) vs DEBIT (Money Going Out)
  let isCredit = false;
  let isDebit = false;

  const creditMatches = [
    'credited', 'received', 'deposited', 'added to your', 'refund of', 'cashback of',
    'salary credited', 'cr to', 'transfer from', 'received rs', 'received inr',
    'has been credited', 'account credited'
  ];
  const debitMatches = [
    'debited', 'spent', 'paid', 'sent rs', 'sent inr', 'transferred to',
    'purchase of', 'withdrawn', 'dr from', 'deducted', 'payment of', 'charged',
    'has been debited', 'account debited'
  ];

  for (const kw of creditMatches) {
    if (lower.includes(kw)) {
      isCredit = true;
      break;
    }
  }

  for (const kw of debitMatches) {
    if (lower.includes(kw)) {
      isDebit = true;
      break;
    }
  }

  // 2. SMART SELF-TRANSFER DETECTION:
  // 🛡️ CRITICAL RULE: Client payments (CREDIT) are ALWAYS Income/Inflow!
  // Self-transfer is ONLY triggered when:
  // a) Explicit phrase: "self transfer", "transfer to own a/c"
  // b) OR your account is being DEBITED to another of your own accounts (e.g. "debited ... transfer to <myOtherAccount>")
  let isSelfTransfer = false;

  for (const phrase of EXPLICIT_SELF_TRANSFER_PHRASES) {
    if (lower.includes(phrase)) {
      isSelfTransfer = true;
      break;
    }
  }

  // Check if it's a DEBIT transfer directed TO one of user's other accounts
  if (!isSelfTransfer && isDebit && myAccounts && myAccounts.length > 0) {
    for (const acc of myAccounts) {
      const cleanAcc = acc.trim().toLowerCase();
      if (!cleanAcc) continue;

      // Check if SMS says: "to <myAccount>", "transfer to <myAccount>", "towards <myAccount>", "vpa <myAccount>"
      const destinationPatterns = [
        new RegExp(`(?:to|towards|vpa|into)\\s+[^.]*?${escapeRegex(cleanAcc)}`, 'i'),
        new RegExp(`transfer(?:red)?\\s+to\\s+[^.]*?${escapeRegex(cleanAcc)}`, 'i')
      ];

      for (const pattern of destinationPatterns) {
        if (pattern.test(lower)) {
          isSelfTransfer = true;
          break;
        }
      }
      if (isSelfTransfer) break;
    }
  }

  // 3. Finalize Transaction Type
  let type: TransactionType = 'outflow';

  if (isSelfTransfer) {
    type = 'transfer';
  } else if (isCredit && !isDebit) {
    // Client payments or incoming transfers are 100% INFLOW!
    type = 'inflow';
  } else if (isDebit && !isCredit) {
    type = 'outflow';
  } else if (isCredit && isDebit) {
    // Disambiguate context
    if (lower.includes('credited to') || lower.includes('received from') || lower.includes('credited by')) {
      type = 'inflow';
    } else {
      type = 'outflow';
    }
  } else {
    type = lower.includes('credited') || lower.includes('cr') ? 'inflow' : 'outflow';
  }

  // 4. Extract Amount
  const amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const reverseAmountRegex = /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i;

  let amountStr: string | null = null;
  const match1 = text.match(amountRegex);
  if (match1 && match1[1]) {
    amountStr = match1[1];
  } else {
    const match2 = text.match(reverseAmountRegex);
    if (match2 && match2[1]) {
      amountStr = match2[1];
    }
  }

  if (!amountStr) {
    return {
      success: false,
      confidence: 0,
      error: 'Could not detect transaction amount from SMS'
    };
  }

  const cleanedAmount = parseFloat(amountStr.replace(/,/g, ''));
  if (isNaN(cleanedAmount) || cleanedAmount <= 0) {
    return {
      success: false,
      confidence: 0,
      error: 'Invalid amount extracted'
    };
  }

  // 5. Extract Merchant / Sender / Beneficiary
  let merchant = isSelfTransfer
    ? 'Self Account Transfer'
    : type === 'inflow'
    ? 'Incoming Payment / Client'
    : 'Direct Payment';
  
  if (!isSelfTransfer) {
    const merchantPatterns = [
      /(?:to|at|towards)\s+(?:vpa\s+)?([*A-Za-z0-9._@\- ]+?)(?:\s+by|\s+on|\s+ref|\s+upi|\s+dated|\s+bal|\s+not you|\.|\n|$)/i,
      /info[:\s]+([*A-Za-z0-9._@\- ]+?)(?:\s+avbl|\s+bal|\.|\n|$)/i,
      /beneficiary[:\s]+([*A-Za-z0-9._@\- ]+?)(?:\s+on|\.|\n|$)/i,
      /transfer\s+to\s+([*A-Za-z0-9._@\- ]+?)(?:\s+on|\s+ref|\.|\n|$)/i,
      /paid\s+to\s+([*A-Za-z0-9._@\- ]+?)(?:\s+on|\s+via|\.|\n|$)/i,
      /(?:from|by)\s+(?:vpa\s+)?([*A-Za-z0-9._@\- ]+?)(?:\s+on|\s+ref|\s+dated|\.|\n|$)/i
    ];

    for (const regex of merchantPatterns) {
      const m = text.match(regex);
      if (m && m[1]) {
        let candidate = m[1].trim();
        candidate = candidate.replace(/[.*]+$/, '').trim();
        const candidateLower = candidate.toLowerCase();
        if (
          candidate.length >= 2 &&
          !candidateLower.startsWith('your a/c') &&
          !candidateLower.startsWith('upi') &&
          !candidateLower.startsWith('card')
        ) {
          merchant = candidate;
          break;
        }
      }
    }

    if (merchant.toUpperCase().startsWith('VPS*')) {
      merchant = merchant.substring(4);
    }
  }

  // 6. Account / Card number
  let account = 'Bank Account';
  const accountRegex = /(?:card|a\/c|acct|account)\s*(?:no\.?)?\s*([xX*]*\d{3,5})/i;
  const accMatch = text.match(accountRegex);
  if (accMatch && accMatch[1]) {
    account = text.toLowerCase().includes('card') ? `Card ${accMatch[1]}` : `A/C ${accMatch[1]}`;
  }

  // 7. Reference number
  let reference: string | undefined = undefined;
  const refRegex = /(?:by\s+upi|upi\s+ref(?:\s+no)?|ref(?:\s+no)?|rrn|utr|txn\s+id)[:\s]+([0-9a-zA-Z]{6,16})/i;
  const refMatch = text.match(refRegex);
  if (refMatch && refMatch[1]) {
    reference = refMatch[1].trim();
  }

  // 7b. Extract Explicit Time if present in SMS (e.g. "at 13:45" or "1:45 PM")
  const txDate = new Date(defaultDate);
  const timeRegex = /(?:at\s+|time\s+)?(\b\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[4]?.toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      txDate.setHours(hours, minutes, 0, 0);
    }
  }

  // 8. Auto-Categorize
  let category = isSelfTransfer
    ? 'Self Transfer'
    : type === 'inflow'
    ? 'Salary & Income'
    : 'Other Expenses';

  if (!isSelfTransfer) {
    const searchCorpus = `${merchant} ${lower}`;
    for (const [catName, keywords] of Object.entries(CATEGORY_RULES)) {
      for (const kw of keywords) {
        if (searchCorpus.includes(kw)) {
          category = catName;
          break;
        }
      }
      if (category !== (type === 'inflow' ? 'Salary & Income' : 'Other Expenses')) {
        break;
      }
    }
  }

  return {
    success: true,
    amount: cleanedAmount,
    type,
    category,
    merchant: capitalizeWords(merchant),
    account,
    reference,
    date: txDate.toISOString(),
    confidence: isSelfTransfer ? 0.99 : reference ? 0.95 : 0.85
  };
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
