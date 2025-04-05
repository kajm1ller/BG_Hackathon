(async function () {
    const sdk = await ScanbotSDK.initialize({
        licenseKey: "",
        enginePath:
            "https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.1.0/bundle/bin/complete/",
    });
    // Configure the scanner as needed
    const config = new ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
    // Create the scanner with the config object
    const result = await ScanbotSDK.UI.createBarcodeScanner(config);
    // Result can be null if the user cancels the scanning process
    console.log(result.items?.length + " barcodes found");
})();
