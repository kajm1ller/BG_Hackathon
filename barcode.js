var button = document.getElementById("recycle-button");
button.addEventListener("click", openScanner);

const myLicenseKey =
    "UdO0ub45U65cYvURaNgoijMN6hptpv" +
    "hDs4W+VE9si8YBroO8OXvFBVqYEdP6" +
    "heOw2ziZ/1IhpMMA4O0GlP5DactqdF" +
    "yiN0PHf33Hic8TfeqHtb9uFp/M85EC" +
    "Xi4sbN1uD+vummKd19kBEMGQSq9Ogi" +
    "7mNw80NOJKeaM+YpwUIU2kbOPsRwLJ" +
    "EupcjspPJJ/uAxN/S8pdBE0yyHI0F1" +
    "y8yy4274Ot7sNSv/WAVe02H9XgbHX5" +
    "iewhciRLFnRzvypsymEunaBGrt3e2V" +
    "3E7hUCFN63kaqac004lpizdqS+ftjM" +
    "UV+OR2aV3jvCeE14q7gkFX9GkFZxRv" +
    "HQr1BvLyBKwQ==\nU2NhbmJvdFNESw" +
    "psb2NhbGhvc3R8MTI3LjAuMC4xOjMw" +
    "MDEKMTc0NDU4ODc5OQo4Mzg4NjA3Cj" +
    "g=\n";

initializeScanbotSDK();

async function initializeScanbotSDK() {
    scanbotSDK = await ScanbotSDK.initialize({
        licenseKey: myLicenseKey,
        enginePath:
            "https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.1.0/bundle/bin/barcode-scanner/",
    });
}

async function openScanner() {
    let scanner;
    const configuration = {
        containerId: "centerArea",
        onBarcodesDetected: (result) => {
            scanner.dispose();
            const format = result.barcodes[0].format;
            const text = result.barcodes[0].text;
            showResult(result);
        },
    };
    scanner = await scanbotSDK.createBarcodeScanner(configuration);
}

function showResult(res) {
    const result = res.barcodes[0];
    const p_text = document.createElement("p");
    console.log(`barcode: ${result.format} -> ${result.text}`);
    p_text.textContent = `barcode: ${result.format} -> ${result.text}`;
    const result_div = document.getElementById("centerArea");
    result_div.appendChild(p_text);
}
