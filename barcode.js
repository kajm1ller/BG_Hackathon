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

async function showResult(res) {
    const result = res.barcodes[0];
    const p_text = document.createElement("p");
    console.log(`barcode: ${result.format} -> ${result.text}`);

    let barcode = result.text;

	switch (barcode) {
        case "070847811169":
            title = "Monster Energy Drink Original 16 Oz";
			info = `The Monster Rehab Energy Drink comes in aluminum cans, which are highly recyclable. 
			Aluminum can be recycled infinitely without significant loss of quality and is accepted in virtually all recycling programs. 
			Recycling aluminum saves a significant amount of energy compared to producing new aluminum. While the can has a coating and a 
			printed label, these are typically handled during the aluminum recycling process where the cans are shredded and melted at 
			high temperatures.ecyclability Score: 5`
            break;
        default:
            title = "";
    }

    p_text.textContent = `${title} \n ${info}`;
    const result_div = document.getElementById("centerArea");
    result_div.appendChild(p_text);
}



