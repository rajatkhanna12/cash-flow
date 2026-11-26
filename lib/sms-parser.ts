import { SMSParseResult, TransactionType } from './types';

// Category mapping based on merchant keywords
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

export function parseBankSMS(rawText: string, defaultDate = new Date()): SMSParseResult {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { success: false, confidence: 0, error: 'Empty SMS text provided' };
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Transaction Type (Inflow vs Outflow)
  let type: TransactionType = 'outflow';
  let isCredit = false;
  let isDebit = false;

  const creditMatches = [
    'credited', 'received', 'deposited', 'added to', 'refund of', 'cashback of',
    'salary credited', 'cr to', 'transfer from', 'received rs', 'received inr'
  ];
  const debitMatches = [
    'debited', 'spent', 'paid', 'sent rs', 'sent inr', 'transferred to',
    'purchase of', 'withdrawn', 'dr from', 'deducted', 'payment of', 'charged'
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

  // If both or neither match, check phrasing context
  if (isCredit && !isDebit) {
    type = 'inflow';
  } else if (isDebit && !isCredit) {
    type = 'outflow';
  } else if (isCredit && isDebit) {
    // E.g., "Rs 500 debited from A/C ... credited to ..."
    // The subject's account is usually debited
    if (lower.includes('debited from your') || lower.includes('debited by') || lower.includes('your a/c is debited')) {
      type = 'outflow';
    } else if (lower.includes('credited to your') || lower.includes('your a/c is credited')) {
      type = 'inflow';
    } else {
      type = 'outflow';
    }
  } else {
    // Default fallback heuristics
    if (lower.includes('credited') || lower.includes('cr') || lower.includes('received')) {
      type = 'inflow';
    } else {
      type = 'outflow';
    }
  }

  // 2. Extract Amount
  // Matches: Rs. 500, Rs 500.50, INR 1,234.00, ₹450, etc.
  const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
  const reverseAmountRegex = /([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i;

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

  // Clean comma from amount
  const cleanedAmount = parseFloat(amountStr.replace(/,/g, ''));
  if (isNaN(cleanedAmount) || cleanedAmount <= 0) {
    return {
      success: false,
      confidence: 0,
      error: 'Invalid amount extracted'
    };
  }

  // 3. Extract Merchant / Beneficiary / VPA
  let merchant = 'Unknown Merchant';
  
  // Try pattern: "to <merchant> on" or "to VPA <vpa>" or "at <merchant>" or "Info: <info>"
  const merchantPatterns = [
    /(?:to|at|towards)\s+(?:vpa\s+)?([A-Za-z0-9._@\- ]+?)(?:\s+on|\s+ref|\s+upi|\s+dated|\s+bal|\s+not you|\.|\n|$)/i,
    /info[:\s]+([A-Za-z0-9._@\-* ]+?)(?:\s+avbl|\s+bal|\.|\n|$)/i,
    /beneficiary[:\s]+([A-Za-z0-9._@\- ]+?)(?:\s+on|\.|\n|$)/i,
    /transfer\s+to\s+([A-Za-z0-9._@\- ]+?)(?:\s+on|\s+ref|\.|\n|$)/i,
    /paid\s+to\s+([A-Za-z0-9._@\- ]+?)(?:\s+on|\s+via|\.|\n|$)/i,
    /from\s+(?:vpa\s+)?([A-Za-z0-9._@\- ]+?)(?:\s+on|\s+ref|\.|\n|$)/i
  ];

  for (const regex of merchantPatterns) {
    const m = text.match(regex);
    if (m && m[1]) {
      let candidate = m[1].trim();
      // Remove trailing words like "Bank", clean special characters
      candidate = candidate.replace(/[.*]+$/, '').trim();
      // Filter out junk
      if (candidate.length >= 2 && !candidate.toLowerCase().startsWith('your a/c')) {
        // If it's a UPI ID like xyz@okaxis, format it nicely
        if (candidate.includes('@')) {
          const upiHandle = candidate.split('@')[0];
          merchant = upiHandle.toUpperCase();
        } else {
          merchant = candidate;
        }
        break;
      }
    }
  }

  // If still unknown or raw vpa prefix:
  if (merchant === 'Unknown Merchant' || merchant.length < 2) {
    if (type === 'inflow') {
      merchant = 'Incoming Transfer / Income';
    } else {
      merchant = 'Direct Payment';
    }
  }

  // Clean merchant name if it has VPS* prefix (common in ICICI/HDFC)
  if (merchant.toUpperCase().startsWith('VPS*')) {
    merchant = merchant.substring(4);
  }

  // 4. Extract Account Number
  let account = 'Bank Account';
  const accountRegex = /(?:a\/c|acct|account)\s*(?:no\.?)?\s*([xX*]*\d{3,5})/i;
  const accMatch = text.match(accountRegex);
  if (accMatch && accMatch[1]) {
    account = `A/C ${accMatch[1]}`;
  }

  // 5. Extract Reference / UTR Number
  let reference: string | undefined = undefined;
  const refRegex = /(?:upi\s+ref(?:\s+no)?|ref(?:\s+no)?|rrn|utr|txn\s+id)[:\s]+([0-9a-zA-Z]{6,16})/i;
  const refMatch = text.match(refRegex);
  if (refMatch && refMatch[1]) {
    reference = refMatch[1].trim();
  }

  // 6. Categorize based on Merchant name or SMS text
  let category = type === 'inflow' ? 'Salary & Income' : 'Other Expenses';
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

  // High confidence if amount and type were found
  const confidence = reference ? 0.95 : 0.85;

  return {
    success: true,
    amount: cleanedAmount,
    type,
    category,
    merchant: capitalizeWords(merchant),
    account,
    reference,
    date: defaultDate.toISOString(),
    confidence
  };
}

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
