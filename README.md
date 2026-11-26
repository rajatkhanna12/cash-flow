# 🛡️ CashFlow Guard (Cash Flow & Expense Reporting System)

Ek automated personal & business **Cash Flow & Expense Tracking System** jo **iPhone Shortcuts Automation** ke sath seamlessly connect hota hai.

---

## 🌟 Features

1. **Automated Bank SMS Ingestion via iPhone:**
   - Bank/UPI ka SMS aate hi background mein webhook (`/api/sms`) par deliver hota hai.
   - Smart parser Amount, Inflow/Outflow (Credit/Debit), Merchant (Swiggy, Amazon, Uber etc.), aur Category extract karta hai.
   - Duplicate transactions automatically skip ho jati hain.

2. **Real-time Cash Flow Metrics:**
   - **Total Inflow (Income):** Mahine ka total paisa jo aaya.
   - **Total Outflow (Expense):** Mahine ka total kharch.
   - **Net Cash Flow (Savings):** `Inflow - Outflow` aur Savings rate %.
   - **Daily Burn Rate & Projection:** Mahine ke aakhir tak kitna kharch hone ka andaza hai.

3. **Expense Guardrails (Kharch Rokne Ke Liye):**
   - Category-wise Monthly Budgets (Food, Groceries, Shopping, Travel, etc.).
   - Visual progress bars.
   - **80% Alert:** Yellow warning badge.
   - **100% Danger Alert:** Red alert banner on top of dashboard.

4. **Live SMS Tester & Simulator:**
   - Dashboard ke andar hi bank SMS paste karke live test karne ka feature.

5. **iPhone Setup Guide:**
   - Visual step-by-step setup guide with 1-click copyable Webhook URL aur API Key.

---

## 🚀 Vercel Par Deploy Kaise Karein (Step-by-Step)

### Option A: GitHub + Vercel Dashboard (1-Click)
1. Is project ko apne GitHub repository mein push karein:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CashFlow Guard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/cashflow-tracker.git
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) par login karein aur **"Add New Project"** select karein.
3. Apna GitHub repo import karein.
4. **Environment Variables** add karein:
   * `SMS_WEBHOOK_SECRET` = `cf_secret_2026` (ya apna custom secret)
   * *(Optional)* `DATABASE_URL` = Agar Neon ya Supabase (PostgreSQL) use karna hai for 24/7 cloud persistence. (Neon.tech par 1 minute mein free Postgres ban jata hai).
5. **Deploy** par click karein!

---

### Option B: Vercel CLI se Direct Deploy
```bash
npm i -g vercel
vercel
```

---

## 📱 iPhone Shortcut Setup Summary

1. iPhone par **Shortcuts** app kholiye ➔ **Automation** tab ➔ **New Automation (+)**.
2. Select **Message**:
   - Message Contains: `debited, credited, spent, received, A/C, INR, Rs`
   - Run Immediately: **Yes**
3. Action: **Get Contents of URL**
   - URL: `https://<your-vercel-domain>.vercel.app/api/sms`
   - Method: **POST**
   - Headers: `x-api-key`: `cf_secret_2026`
   - Request Body: JSON
     ```json
     {
       "text": "Shortcut Input",
       "sender": "Sender"
     }
     ```
4. Save! Ab har payment SMS aate hi dashboard live update ho jayega.
