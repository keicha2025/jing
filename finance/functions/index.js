const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setDoc, doc, getDoc, Timestamp } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const yahooFinance = require("yahoo-finance2").default;

admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function to fetch stock prices.
 * Logic: Checks Firestore cache first. If older than 1 hour, fetches from Yahoo Finance.
 */
exports.getStockPrice = onCall({ region: "us-central1" }, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { symbols } = request.data;
    if (!symbols || !Array.isArray(symbols)) {
        throw new HttpsError("invalid-argument", "The function must be called with an array of 'symbols'.");
    }

    const results = {};
    const now = Date.now();
    const CACHE_DURATION = 3600 * 1000; // 1 hour

    try {
        for (const symbol of symbols) {
            const cacheRef = db.collection("stockCache").doc(symbol);
            const cacheSnap = await cacheRef.get();

            if (cacheSnap.exists) {
                const data = cacheSnap.data();
                const lastUpdated = data.updatedAt.toMillis();
                if (now - lastUpdated < CACHE_DURATION) {
                    results[symbol] = data.price;
                    continue;
                }
            }

            // Fetch from Yahoo Finance if not in cache or expired
            try {
                const quote = await yahooFinance.quote(symbol);
                const price = quote.regularMarketPrice;

                if (price) {
                    await cacheRef.set({
                        price,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        symbol
                    });
                    results[symbol] = price;
                }
            } catch (err) {
                console.error(`Error fetching price for ${symbol}:`, err);
                // If Yahoo fails but we have old cache, use it as fallback
                if (cacheSnap.exists) {
                    results[symbol] = cacheSnap.data().price;
                }
            }
        }

        return { success: true, prices: results };
    } catch (error) {
        console.error("Global error in getStockPrice:", error);
        throw new HttpsError("internal", error.message);
    }
});
