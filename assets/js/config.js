/* ==========================================================
   BVKS site defaults. Most of these can now be changed from the admin panel (/admin) once the site is on PHP hosting.
   The admin's saved settings override the values below.
   ========================================================== */
window.BVKS = {
  name_en: "Bal Vikash Kaushal Sanstha",
  name_hi: "बाल विकास कौशल संस्था",
  regNo: "13719",
  president_en: "Shri Subodh Kumar",
  president_hi: "श्री सुबोध कुमार",
  phone: "9818805171",
  whatsapp: "919818805171",
  email: "balvikaskaushalsanstha@gmail.com",       
  address_en: "House No. 429, Gali No. 08, Vinay Nagar, Agwanpur, Faridabad, Haryana - 121003",
  address_hi: "मकान नं. 429, गली नं. 08, विनय नगर, अगवानपुर, फरीदाबाद, हरियाणा - 121003",

  // ---- Payments ----
  // Set paymentsLive:true after Razorpay keys are added in Vercel env vars
  // (see README.md). While false, the donate page runs in DEMO mode.
  paymentsLive: false,
  razorpayKeyId: "",                              // not needed: the server sends its public key id with each payment
  apiBase: "/api",
  apiExt: ".php",                               // PHP API on GoDaddy/cPanel hosting
  monthlyAmount: 100,   // fixed monthly Supporting Member amount (₹)
  minOnce: 1,           // one-time: any amount from ₹1
  maxAmount: 100000,
  // ---- Look ----
  theme: "forest",       // final palette: saffron | forest | teal | plum | clay
  showThemes: false,      // palette preview picker; set to false once a palette is approved
  has80G: true,
  hasFCRA: false,

  // ---- Bank transfer / UPI (PhonePe test setup) ----
  bank: { holder: "Bal Vikash Kaushal Sanstha", account: "", ifsc: "", bankName: "", upi: "8506945362@ybl", upiName: "Bal Vikash Kaushal Sanstha", phonepe: "8506945362" },

  social: { facebook: "", instagram: "", youtube: "" }
};
