class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._targetRate = 16000;
    this._ratio = sampleRate / this._targetRate;
    this._frac = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    while (this._frac < input.length) {
      const idx = Math.floor(this._frac);
      const s = Math.max(-1, Math.min(1, input[idx] || 0));
      this._buf.push((s < 0 ? s * 0x8000 : s * 0x7fff) | 0);
      this._frac += this._ratio;
    }
    this._frac -= input.length;

    // ~32ms frames @ 16 kHz for snappier barge-in
    while (this._buf.length >= 512) {
      const chunk = this._buf.splice(0, 512);
      let sumSq = 0;
      for (let i = 0; i < chunk.length; i++) {
        const v = chunk[i] / 32768;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / chunk.length);
      const ab = new ArrayBuffer(chunk.length * 2);
      const view = new Int16Array(ab);
      for (let i = 0; i < chunk.length; i++) view[i] = chunk[i];
      this.port.postMessage({ pcm: ab, rms }, [ab]);
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
