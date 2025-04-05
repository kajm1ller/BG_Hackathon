import ScanbotSDK from "scanbot-web-sdk/ui";
import { UIConfig } from "scanbot-web-sdk/@types";

export default function startScanner(config: UIConfig.BarcodeScannerScreenConfiguration) {
	// TODO: Configure as needed
	const result = ScanbotSDK.UI.createBarcodeScanner(config);
	// TODO: Process & present the result as needed
	return result;
}
