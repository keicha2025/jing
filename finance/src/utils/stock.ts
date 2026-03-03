export const fetchStockPrice = async (ticker: string) => {
    // Mock API call
    console.log(`Fetching price for ${ticker}...`);
    return new Promise<{ price: number; currency: string }>((resolve) => {
        setTimeout(() => {
            // Return a random price for demo purposes
            const mockPrice = ticker.includes('.TW') ? Math.random() * 1000 : Math.random() * 500;
            resolve({
                price: Number(mockPrice.toFixed(2)),
                currency: ticker.includes('.TW') ? 'TWD' : 'USD'
            });
        }, 1000);
    });
};
