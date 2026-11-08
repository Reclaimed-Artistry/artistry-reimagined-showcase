# Selah Paystack support payments

The support form uses Paystack's hosted checkout. The browser never receives the Paystack secret key, and Selah does not collect or store card details.

## Vercel environment variable

Add `PAYSTACK_SECRET_KEY` in the Vercel project’s **Settings → Environment Variables**. Do not prefix it with `VITE_` and do not put it in client-side code. Use a Paystack test secret key for Preview while testing, and the live secret key for Production after confirming the account is ready to accept NGN payments. Redeploy after changing the variable.

The flow does not need a Paystack public key: the server initializes checkout with the secret key, Paystack hosts the payment page, and Selah verifies the returned reference server-side. Never commit or share secret keys in source control.

The callback returns to Selah’s About page; the verification endpoint only displays success after Paystack confirms a successful NGN transaction. Donations are one-time and voluntary.
