export default AudioPadInfo;
/**
 * A Pad object.
 */
export type Pad = {
    /**
     * If the pad is actively used in the pad file or not.
     */
    avaliable: boolean;
    /**
     * The human readable pad text, `A1` - `J12`.
     */
    label: string;
    /**
     * The filename for the corresponding Wave File, `A0000001.WAV` - `J0000012.WAV`.
     */
    filename: string;
    /**
     * Sample start and end offsets are relative to the original file
     */
    originalSampleStart: number;
    /**
     * SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data
     */
    originalSampleEnd: number;
    /**
     * The length of the RIFF headers before the data chunk is always exactly 512 bytes
     */
    userSampleStart: number;
    /**
     * The sample end value is the length of the file, and when converted correctly this is the length of the whole file
     */
    userSampleEnd: number;
    /**
     * Volume is between 0 and 127
     */
    volume: number;
    /**
     * LoFi: false off, true on
     */
    lofi: boolean | number;
    /**
     * Loop: false off, true on
     */
    loop: boolean | number;
    /**
     * Gate: false off, true on
     */
    gate: boolean | number;
    /**
     * Reverse: false off, true on
     */
    reverse: boolean | number;
    /**
     * Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample
     */
    format: string;
    /**
     * Mono or Stereo
     */
    channels: number | string;
    /**
     * Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
     */
    tempoMode: number | string;
    /**
     * BPM determined by the software. Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm
     */
    originalTempo: number;
    /**
     * User set BPM on the device
     */
    userTempo: number;
};
/**
 * A Pad object.
 * @typedef {object} Pad
 * @property {boolean} avaliable If the pad is actively used in the pad file or not.
 * @property {string} label The human readable pad text, `A1` - `J12`.
 * @property {string} filename The filename for the corresponding Wave File, `A0000001.WAV` - `J0000012.WAV`.
 * @property {number} originalSampleStart Sample start and end offsets are relative to the original file
 * @property {number} originalSampleEnd SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data
 * @property {number} userSampleStart The length of the RIFF headers before the data chunk is always exactly 512 bytes
 * @property {number} userSampleEnd The sample end value is the length of the file, and when converted correctly this is the length of the whole file
 * @property {number} volume Volume is between 0 and 127
 * @property {boolean | number} lofi LoFi: false off, true on
 * @property {boolean | number} loop Loop: false off, true on
 * @property {boolean | number} gate Gate: false off, true on
 * @property {boolean | number} reverse Reverse: false off, true on
 * @property {string} format Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample
 * @property {number | string} channels Mono or Stereo
 * @property {number | string} tempoMode Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
 * @property {number} originalTempo BPM determined by the software. Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm
 * @property {number} userTempo User set BPM on the device
 */
/**
 * Uttori Pad Info - Utility to manipulate the PAD_INFO.BIN file for SP-404 series of samplers.
 * @property {Pad[]} pads - Parsed Pads
 * @example <caption>AudioPadInfo</caption>
 * import fs from 'fs';
 * const data = fs.readFileSync('./PAD_INFO.bin');
 * const { pads } = new AudioPadInfo(data);
 * fs.writeFileSync('./output.json', JSON.stringify(pads, null, 2));
 * console.log('Pads:', pads);
 * ➜ [
 *     {
 *       "avaliable": false,
 *       "label": "A1",
 *       "filename": "A0000001.WAV",
 *       "originalSampleStart": 512,
 *       "originalSampleEnd": 385388,
 *       "userSampleStart": 512,
 *       "userSampleEnd": 385388,
 *       "volume": 87,
 *       "lofi": false,
 *       "loop": false,
 *       "gate": false,
 *       "reverse": true,
 *       "format": "WAVE",
 *       "channels": "Stereo",
 *       "tempoMode": "Off",
 *       "originalTempo": 109.9,
 *       "userTempo": 109.9
 *     },
 *     ...,
 *   {
 *       "avaliable": false,
 *       "label": "J12",
 *       "filename": "J0000012.WAV",
 *       "originalSampleStart": 512,
 *       "originalSampleEnd": 53424,
 *       "userSampleStart": 512,
 *       "userSampleEnd": 53424,
 *       "volume": 127,
 *       "lofi": false,
 *       "loop": false,
 *       "gate": true,
 *       "reverse": false,
 *       "format": "WAVE",
 *       "channels": "Stereo",
 *       "tempoMode": "Off",
 *       "originalTempo": 100,
 *       "userTempo": 100
 *     }
 *   ]
 * @class
 */
declare class AudioPadInfo extends DataBuffer {
    /**
     * Encode JSON values to a valid pad structure.
     * @param {Pad} data - The JSON values to encode.
     * @returns {Buffer} - The new pad Buffer.
     * @static
     */
    static encodePad(data: Pad): Buffer;
    /**
     * Checks to see if a Pad is set to the default values, if so it is likely.
     * @param {Partial<Pad>} pad - The JSON values to check.
     * @param {boolean} [strict] - When strict all values are checked for defaults, otherwise just the offsets are checked.
     * @returns {boolean} - Returns true if the Pad is set the the default values, false otherwise.
     * @static
     */
    static checkDefault(pad: Partial<Pad>, strict?: boolean): boolean;
    /**
     * Convert a numberic value used in the PAD_INFO.bin file for that pad to the pad label like `A1` or `J12`.
     * @param {number} index The numberic value used in the PAD_INFO.bin file.
     * @returns {string} The pad label like `A1` or `J12`.
     * @static
     */
    static getPadLabel(index: number): string;
    /**
     * Convert a pad label like `A1` or `J12` to the numberic value used in the PAD_INFO.bin file for that pad.
     * @param {string} label The pad label like `A1` or `J12`.
     * @returns {number} The numberic value used in the PAD_INFO.bin file.
     * @static
     */
    static getPadIndex(label?: string): number;
    pads: any[];
    /**
     * Parse the PAD_INFO.BIN file, decoding the supported pad info.
     *
     * This is stored alongside the samples in PAD_INFO.BIN and contains 120 × 32-byte records, one for each pad from A1 to J12.
     * In this file, values are stored in big-endian order
     */
    parse(): void;
}
import { DataBuffer } from '@uttori/data-tools';
//# sourceMappingURL=audio-padinfo.d.ts.map