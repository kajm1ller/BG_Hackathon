import { IScannerCommon } from "./i-scanner-common-handle";
import type { CroppedDetectionResult } from "../core-types";
export interface IDocumentScannerHandle extends IScannerCommon {
    detectAndCrop(): Promise<CroppedDetectionResult | null>;
    enableAutoCapture(): void;
    disableAutoCapture(): void;
    isAutoCaptureEnabled(): boolean;
}
