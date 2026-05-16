const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();

// ? STRIPE SECRET KEY
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ? MIDDLEWARE
app.use(cors());
app.use(express.json());

// ? YOUR LIVE DOMAIN
const DOMAIN = "https://designworks-unltd.com";

/* ===== CREATE CHECKOUT SESSION ===== */
app.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("REQUEST BODY:", req.body);

    let session;

    /* =========================
       ? INVOICE PAYMENT FLOW
    ========================= */
    if (req.body.amount) {

      const amount = Number(req.body.amount);
      const invoiceNumber = req.body.invoiceNumber;

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      if (!invoiceNumber) {
        return res.status(400).json({ error: "Missing invoice number" });
      }

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],

        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Invoice #${invoiceNumber}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          }
        ],

        mode: "payment",

        // ? FIXED: LIVE DOMAIN
        success_url: `${DOMAIN}/confirmation.html?amount=${amount}&invoice=${invoiceNumber}`,
        cancel_url: `${DOMAIN}/invoice.html`,
      });

      return res.json({ url: session.url });
    }

    /* =========================
       ? CART CHECKOUT FLOW
    ========================= */
    const items = req.body.items;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty || 1,
      })),

      mode: "payment",

      // ? FIXED: LIVE DOMAIN
      success_url: `${DOMAIN}/confirmation.html?amount=${req.body.total}`,
      cancel_url: `${DOMAIN}/cart.html`,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("?? STRIPE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`? Server running on port ${PORT}`);
});