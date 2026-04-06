// Simulates backend API calls with realistic delays and occasional errors

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const genRef = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;

export const api = {

  async initiateDeposit({ amount, method }) {
    await delay(1500);
    // 5% chance of failure to simulate real-world errors
    if (Math.random() < 0.05) {
      throw new Error('Payment processor temporarily unavailable. Please try again.');
    }
    return {
      reference: genRef('DEP'),
      status: method === 'card' ? 'completed' : 'pending',
      message: method === 'bank'
        ? 'Bank transfer initiated. Funds will arrive in 1–3 business days.'
        : 'Deposit successful. Your balance has been updated.',
    };
  },

  async initiateTransfer({ amount, recipientEmail, note }) {
    await delay(1600);
    if (Math.random() < 0.05) {
      throw new Error('Transfer failed. Please check recipient details and try again.');
    }
    return {
      reference: genRef('TRF'),
      status: 'completed',
      message: 'Transfer sent successfully.',
    };
  },

  async initiateWithdrawal({ amount, bankDetails }) {
    await delay(1800);
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 4) {
      throw new Error('Invalid account number. Please check your bank details.');
    }
    if (Math.random() < 0.05) {
      throw new Error('Withdrawal request failed. Please try again or contact support.');
    }
    return {
      reference: genRef('WDR'),
      status: 'pending',
      message: 'Withdrawal submitted. Funds will arrive in 1–3 business days.',
    };
  },
};
