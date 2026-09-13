// Pro unlock configuration. Values come from .env (VITE_* are inlined at build time).
export const PRO = {
  price: '$9',
  polarOrgId: import.meta.env.VITE_POLAR_ORG_ID || '',
  checkoutUrl: import.meta.env.VITE_POLAR_CHECKOUT_URL || '',
  apiBase: (import.meta.env.VITE_API_BASE || '').replace(/\/$/, ''),
};
PRO.enabled = Boolean(PRO.polarOrgId && PRO.checkoutUrl);
PRO.refineEnabled = PRO.enabled && Boolean(PRO.apiBase);
