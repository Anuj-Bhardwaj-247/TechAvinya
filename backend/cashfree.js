import dotenv from 'dotenv';

dotenv.config();

/**
 * Cashfree Payment Gateway Integration Helper
 * API Version: 2023-08-01
 */

export const isCashfreeConfigured = () => {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  return Boolean(appId && appId.trim() !== '' && secretKey && secretKey.trim() !== '');
};

export const getCashfreeBaseUrl = () => {
  const env = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  return env === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
};

export const getCashfreeHeaders = () => {
  return {
    'x-client-id': (process.env.CASHFREE_APP_ID || '').trim(),
    'x-client-secret': (process.env.CASHFREE_SECRET_KEY || '').trim(),
    'x-api-version': process.env.CASHFREE_API_VERSION || '2023-08-01',
    'Content-Type': 'application/json',
  };
};

/**
 * Create a new Cashfree PG Order
 */
export const createCashfreePGOrder = async ({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  eventTitle,
  returnUrl,
  notifyUrl,
}) => {
  if (!isCashfreeConfigured()) {
    console.warn('[Cashfree] Credentials not set in .env. Operating in Sandbox/Demo mode.');
    return {
      success: true,
      isDemo: true,
      order_id: orderId,
      payment_session_id: `session_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_status: 'ACTIVE',
      message: 'Cashfree in Demo Mode (Add CASHFREE_APP_ID & CASHFREE_SECRET_KEY in backend/.env for live payments).',
    };
  }

  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  const payload = {
    order_id: orderId,
    order_amount: Number(amount).toFixed(2),
    order_currency: 'INR',
    customer_details: {
      customer_id: `cust_${String(customerPhone).replace(/\D/g, '').slice(-8)}_${Date.now().toString().slice(-4)}`,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: String(customerPhone).replace(/\D/g, '').slice(-10),
    },
    order_meta: {
      return_url: returnUrl || `https://techavinya.org/enroll?order_id={order_id}`,
      notify_url: notifyUrl || null,
      payment_methods: 'cc,dc,upi,nb',
    },
    order_note: `Tech Avinya 2026 - ${eventTitle || 'Event Registration'}`,
  };

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Cashfree Create Order Error]', data);
      return {
        success: false,
        error: data,
        message: data.message || 'Failed to create Cashfree order.',
      };
    }

    return {
      success: true,
      isDemo: false,
      cf_order_id: data.cf_order_id,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      data,
    };
  } catch (err) {
    console.error('[Cashfree Network Exception]', err);
    return {
      success: false,
      error: err.message,
      message: 'Network error connecting to Cashfree API.',
    };
  }
};

/**
 * Fetch Order status from Cashfree
 */
export const fetchCashfreePGOrder = async (orderId) => {
  if (!isCashfreeConfigured()) {
    return {
      success: true,
      isDemo: true,
      order_id: orderId,
      order_status: 'PAID', // Simulated success in demo mode
    };
  }

  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  try {
    const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data,
        message: data.message || 'Failed to fetch Cashfree order.',
      };
    }

    return {
      success: true,
      isDemo: false,
      data,
      order_status: data.order_status,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: 'Network error fetching Cashfree order.',
    };
  }
};

/**
 * Fetch Payments list for an order
 */
export const fetchCashfreePGPayments = async (orderId) => {
  if (!isCashfreeConfigured()) {
    return {
      success: true,
      isDemo: true,
      payments: [
        {
          payment_status: 'SUCCESS',
          cf_payment_id: `demo_cf_${Date.now()}`,
          bank_reference: `UTR_${Date.now()}`,
          payment_group: 'upi',
          payment_time: new Date().toISOString(),
        },
      ],
    };
  }

  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  try {
    const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data,
        message: data.message || 'Failed to fetch Cashfree payments.',
      };
    }

    return {
      success: true,
      isDemo: false,
      payments: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: 'Network error fetching Cashfree payments.',
    };
  }
};
