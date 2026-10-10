import type { Nutrition } from "../domain/model";
export interface RecognitionCandidate {
  name: string;
  nutrition?: Nutrition;
  confidence: number;
}
export interface ImageRecognitionProvider {
  recognize(image: Blob): Promise<RecognitionCandidate[]>;
}
// Future providers must obtain consent before transmitting images. No network calls in the MVP.
export const unavailableProvider: ImageRecognitionProvider = {
  async recognize() {
    throw new Error("在线图像识别尚未接入，请手动填写食品标签。");
  },
};
