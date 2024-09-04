
import { DataBuffer } from '@uttori/data-tools';
import AudioMIDI from '@uttori/audio-midi';

let debug = (..._) => {}; try { const { default: d } = await import('debug'); debug = d('Uttori.AudioPattern'); } catch {}

/**
 * @typedef {object} Note
 * @property {number} ticks The delay in ticks until the next track.
 * @property {number} midiNote The MIDI note value (47-106).
 * @property {number} bankSwitch The channel offset (00=ABCDE, 01=FGHIJ).
 * @property {number} pitchMode The pitch mode of Step Sequencer notes.
 * @property {number} velocity The velocity of the note (0-127).
 * @property {number} unknown3 An unknown value, commonly 64 / 0x40.
 * @property {number} length The length of the note in ticks (2 Bytes).
 * @property {number} sampleNumber The calculated sample number based on MIDI note and bank switch.
 * @property {string} padLabel The label of the pad, constructed from the sample number and bank.
 */

/**
 * @typedef {object} PadMapping
 * @property {number} midiNote The MIDI note numeric value.
 * @property {string} pad The human friendly pad label.
 * @property {number} bankSwitch The value for the bank switch byte.
 */

/**
 * AudioPattern - Roland SP-404SX / SP-404 MKii Pattern Utility
 * A utility to read, modify and write pattern files from a Roland SP-404SX / SP-404 MKii `PTN` files.
 * Can also convert patterns to MIDI or convert from MIDI to pattern.
 * Several values are not saved into the pattern but are configured when recording a pattern:
 * - BPM
 * - Quantization Strength / Shuffle Rate
 * - Quantization Grid Size
 * - Metronome Volume
 *
 * Substep on Sequencer Mode actually generates multiple notes depending on the substep type offset by a set number of ticks, no other designation is set on the note.
 *
 * Notes in the pattern grid will typically line up, but if the last note or a note near the end plays a sample beyond the length of the bar, there needs to be place holder notes for however long that is.
 * @example <caption>AudioPattern</caption>
 * const data = fs.readFileSync('./PTN00025.BIN');
 * const file = new AudioPattern(data);
 * console.log('Notes:', file.notes);
 * @class
 * @augments DataBuffer
 */
class AudioPattern extends DataBuffer {
  /**
   * Creates a new AudioPattern.
   * @param {number[]|ArrayBuffer|Buffer|DataBuffer|Int8Array|Int16Array|Int32Array|number|string|Uint8Array|Uint16Array|Uint32Array|undefined} [input] The data to process.
   * @param {object} options The options for parsing the pattern.
   * @param {number} [options.bytesPerNote] The number of bytes for each note; default is 8.
   * @param {number} [options.padsPerBank] The number of pads per bank, 12 or 16 for the MKii; default is 16.
   * @param {boolean} [options.og] When true, process for the original SP404s, when false for the MKii; default is false.
   * @class
   */
  constructor(input, options = { bytesPerNote: 8, padsPerBank: 16, og: false }) {
    super(input);

    /** @type {number} The number of bars in the pattern, so 1 bar is 1. */
    this.bars = 0;
    /** @type {number} The time signature of the pattern, `0` = 4/4, `1` is 3/4, `2` is 2/4, `3` = 1/4, `4` is 5/4, `5` is 6/4, `7` is 7/4. */
    this.timeSignature = 0;
    /** @type {Note[]} */
    this.notes = [];

    /** @type {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes. */
    this.defaultMap = AudioPattern.defaultMap;

    this.parse(options);
  }

  static get defaultPPQOG() { return 96; }

  static get defaultPPQ() { return 480; }

  /**
   * The default mapping of pads `A1` to `J16` to MIDI notes.
   * @returns {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes.
   */
  static get defaultMap() {
    return {
      // Bank A
      'A1': { midiNote: 47, pad: 'A1', bankSwitch: 64 },
      'A2': { midiNote: 48, pad: 'A2', bankSwitch: 64 },
      'A3': { midiNote: 49, pad: 'A3', bankSwitch: 64 },
      'A4': { midiNote: 50, pad: 'A4', bankSwitch: 64 },
      'A5': { midiNote: 51, pad: 'A5', bankSwitch: 64 },
      'A6': { midiNote: 52, pad: 'A6', bankSwitch: 64 },
      'A7': { midiNote: 53, pad: 'A7', bankSwitch: 64 },
      'A8': { midiNote: 54, pad: 'A8', bankSwitch: 64 },
      'A9': { midiNote: 55, pad: 'A9', bankSwitch: 64 },
      'A10': { midiNote: 56, pad: 'A10', bankSwitch: 64 },
      'A11': { midiNote: 57, pad: 'A11', bankSwitch: 64 },
      'A12': { midiNote: 58, pad: 'A12', bankSwitch: 64 },
      'A13': { midiNote: 59, pad: 'A13', bankSwitch: 64 },
      'A14': { midiNote: 60, pad: 'A14', bankSwitch: 64 },
      'A15': { midiNote: 61, pad: 'A15', bankSwitch: 64 },
      'A16': { midiNote: 62, pad: 'A16', bankSwitch: 64 },

      // Bank B
      'B1': { midiNote: 63, pad: 'B1', bankSwitch: 64 },
      'B2': { midiNote: 64, pad: 'B2', bankSwitch: 64 },
      'B3': { midiNote: 65, pad: 'B3', bankSwitch: 64 },
      'B4': { midiNote: 66, pad: 'B4', bankSwitch: 64 },
      'B5': { midiNote: 67, pad: 'B5', bankSwitch: 64 },
      'B6': { midiNote: 68, pad: 'B6', bankSwitch: 64 },
      'B7': { midiNote: 69, pad: 'B7', bankSwitch: 64 },
      'B8': { midiNote: 70, pad: 'B8', bankSwitch: 64 },
      'B9': { midiNote: 71, pad: 'B9', bankSwitch: 64 },
      'B10': { midiNote: 72, pad: 'B10', bankSwitch: 64 },
      'B11': { midiNote: 73, pad: 'B11', bankSwitch: 64 },
      'B12': { midiNote: 74, pad: 'B12', bankSwitch: 64 },
      'B13': { midiNote: 75, pad: 'B13', bankSwitch: 64 },
      'B14': { midiNote: 76, pad: 'B14', bankSwitch: 64 },
      'B15': { midiNote: 77, pad: 'B15', bankSwitch: 64 },
      'B16': { midiNote: 78, pad: 'B16', bankSwitch: 64 },

      // Bank C
      'C1': { midiNote: 79, pad: 'C1', bankSwitch: 64 },
      'C2': { midiNote: 80, pad: 'C2', bankSwitch: 64 },
      'C3': { midiNote: 81, pad: 'C3', bankSwitch: 64 },
      'C4': { midiNote: 82, pad: 'C4', bankSwitch: 64 },
      'C5': { midiNote: 83, pad: 'C5', bankSwitch: 64 },
      'C6': { midiNote: 84, pad: 'C6', bankSwitch: 64 },
      'C7': { midiNote: 85, pad: 'C7', bankSwitch: 64 },
      'C8': { midiNote: 86, pad: 'C8', bankSwitch: 64 },
      'C9': { midiNote: 87, pad: 'C9', bankSwitch: 64 },
      'C10': { midiNote: 88, pad: 'C10', bankSwitch: 64 },
      'C11': { midiNote: 89, pad: 'C11', bankSwitch: 64 },
      'C12': { midiNote: 90, pad: 'C12', bankSwitch: 64 },
      'C13': { midiNote: 91, pad: 'C13', bankSwitch: 64 },
      'C14': { midiNote: 92, pad: 'C14', bankSwitch: 64 },
      'C15': { midiNote: 93, pad: 'C15', bankSwitch: 64 },
      'C16': { midiNote: 94, pad: 'C16', bankSwitch: 64 },

      // Bank D
      'D1': { midiNote: 95, pad: 'D1', bankSwitch: 64 },
      'D2': { midiNote: 96, pad: 'D2', bankSwitch: 64 },
      'D3': { midiNote: 97, pad: 'D3', bankSwitch: 64 },
      'D4': { midiNote: 98, pad: 'D4', bankSwitch: 64 },
      'D5': { midiNote: 99, pad: 'D5', bankSwitch: 64 },
      'D6': { midiNote: 100, pad: 'D6', bankSwitch: 64 },
      'D7': { midiNote: 101, pad: 'D7', bankSwitch: 64 },
      'D8': { midiNote: 102, pad: 'D8', bankSwitch: 64 },
      'D9': { midiNote: 103, pad: 'D9', bankSwitch: 64 },
      'D10': { midiNote: 104, pad: 'D10', bankSwitch: 64 },
      'D11': { midiNote: 105, pad: 'D11', bankSwitch: 64 },
      'D12': { midiNote: 106, pad: 'D12', bankSwitch: 64 },
      'D13': { midiNote: 107, pad: 'D13', bankSwitch: 64 },
      'D14': { midiNote: 108, pad: 'D14', bankSwitch: 64 },
      'D15': { midiNote: 109, pad: 'D15', bankSwitch: 64 },
      'D16': { midiNote: 110, pad: 'D16', bankSwitch: 64 },

      // Bank E
      'E1': { midiNote: 111, pad: 'E1', bankSwitch: 64 },
      'E2': { midiNote: 112, pad: 'E2', bankSwitch: 64 },
      'E3': { midiNote: 113, pad: 'E3', bankSwitch: 64 },
      'E4': { midiNote: 114, pad: 'E4', bankSwitch: 64 },
      'E5': { midiNote: 115, pad: 'E5', bankSwitch: 64 },
      'E6': { midiNote: 116, pad: 'E6', bankSwitch: 64 },
      'E7': { midiNote: 117, pad: 'E7', bankSwitch: 64 },
      'E8': { midiNote: 118, pad: 'E8', bankSwitch: 64 },
      'E9': { midiNote: 119, pad: 'E9', bankSwitch: 64 },
      'E10': { midiNote: 120, pad: 'E10', bankSwitch: 64 },
      'E11': { midiNote: 121, pad: 'E11', bankSwitch: 64 },
      'E12': { midiNote: 122, pad: 'E12', bankSwitch: 64 },
      'E13': { midiNote: 123, pad: 'E13', bankSwitch: 64 },
      'E14': { midiNote: 124, pad: 'E14', bankSwitch: 64 },
      'E15': { midiNote: 125, pad: 'E15', bankSwitch: 64 },
      'E16': { midiNote: 126, pad: 'E16', bankSwitch: 64 },

      // Bank F
      'F1': { midiNote: 47, pad: 'F1', bankSwitch: 65 },
      'F2': { midiNote: 48, pad: 'F2', bankSwitch: 65 },
      'F3': { midiNote: 49, pad: 'F3', bankSwitch: 65 },
      'F4': { midiNote: 50, pad: 'F4', bankSwitch: 65 },
      'F5': { midiNote: 51, pad: 'F5', bankSwitch: 65 },
      'F6': { midiNote: 52, pad: 'F6', bankSwitch: 65 },
      'F7': { midiNote: 53, pad: 'F7', bankSwitch: 65 },
      'F8': { midiNote: 54, pad: 'F8', bankSwitch: 65 },
      'F9': { midiNote: 55, pad: 'F9', bankSwitch: 65 },
      'F10': { midiNote: 56, pad: 'F10', bankSwitch: 65 },
      'F11': { midiNote: 57, pad: 'F11', bankSwitch: 65 },
      'F12': { midiNote: 58, pad: 'F12', bankSwitch: 65 },
      'F13': { midiNote: 59, pad: 'F13', bankSwitch: 65 },
      'F14': { midiNote: 60, pad: 'F14', bankSwitch: 65 },
      'F15': { midiNote: 61, pad: 'F15', bankSwitch: 65 },
      'F16': { midiNote: 62, pad: 'F16', bankSwitch: 65 },

      // Bank G
      'G1': { midiNote: 63, pad: 'G1', bankSwitch: 65 },
      'G2': { midiNote: 64, pad: 'G2', bankSwitch: 65 },
      'G3': { midiNote: 65, pad: 'G3', bankSwitch: 65 },
      'G4': { midiNote: 66, pad: 'G4', bankSwitch: 65 },
      'G5': { midiNote: 67, pad: 'G5', bankSwitch: 65 },
      'G6': { midiNote: 68, pad: 'G6', bankSwitch: 65 },
      'G7': { midiNote: 69, pad: 'G7', bankSwitch: 65 },
      'G8': { midiNote: 70, pad: 'G8', bankSwitch: 65 },
      'G9': { midiNote: 71, pad: 'G9', bankSwitch: 65 },
      'G10': { midiNote: 72, pad: 'G10', bankSwitch: 65 },
      'G11': { midiNote: 73, pad: 'G11', bankSwitch: 65 },
      'G12': { midiNote: 74, pad: 'G12', bankSwitch: 65 },
      'G13': { midiNote: 75, pad: 'G13', bankSwitch: 65 },
      'G14': { midiNote: 76, pad: 'G14', bankSwitch: 65 },
      'G15': { midiNote: 77, pad: 'G15', bankSwitch: 65 },
      'G16': { midiNote: 78, pad: 'G16', bankSwitch: 65 },

      // Bank H
      'H1': { midiNote: 79, pad: 'H1', bankSwitch: 65 },
      'H2': { midiNote: 80, pad: 'H2', bankSwitch: 65 },
      'H3': { midiNote: 81, pad: 'H3', bankSwitch: 65 },
      'H4': { midiNote: 82, pad: 'H4', bankSwitch: 65 },
      'H5': { midiNote: 83, pad: 'H5', bankSwitch: 65 },
      'H6': { midiNote: 84, pad: 'H6', bankSwitch: 65 },
      'H7': { midiNote: 85, pad: 'H7', bankSwitch: 65 },
      'H8': { midiNote: 86, pad: 'H8', bankSwitch: 65 },
      'H9': { midiNote: 87, pad: 'H9', bankSwitch: 65 },
      'H10': { midiNote: 88, pad: 'H10', bankSwitch: 65 },
      'H11': { midiNote: 89, pad: 'H11', bankSwitch: 65 },
      'H12': { midiNote: 90, pad: 'H12', bankSwitch: 65 },
      'H13': { midiNote: 91, pad: 'H13', bankSwitch: 65 },
      'H14': { midiNote: 92, pad: 'H14', bankSwitch: 65 },
      'H15': { midiNote: 93, pad: 'H15', bankSwitch: 65 },
      'H16': { midiNote: 94, pad: 'H16', bankSwitch: 65 },

      // Bank I
      'I1': { midiNote: 95, pad: 'I1', bankSwitch: 65 },
      'I2': { midiNote: 96, pad: 'I2', bankSwitch: 65 },
      'I3': { midiNote: 97, pad: 'I3', bankSwitch: 65 },
      'I4': { midiNote: 98, pad: 'I4', bankSwitch: 65 },
      'I5': { midiNote: 99, pad: 'I5', bankSwitch: 65 },
      'I6': { midiNote: 100, pad: 'I6', bankSwitch: 65 },
      'I7': { midiNote: 101, pad: 'I7', bankSwitch: 65 },
      'I8': { midiNote: 102, pad: 'I8', bankSwitch: 65 },
      'I9': { midiNote: 103, pad: 'I9', bankSwitch: 65 },
      'I10': { midiNote: 104, pad: 'I10', bankSwitch: 65 },
      'I11': { midiNote: 105, pad: 'I11', bankSwitch: 65 },
      'I12': { midiNote: 106, pad: 'I12', bankSwitch: 65 },
      'I13': { midiNote: 107, pad: 'I13', bankSwitch: 65 },
      'I14': { midiNote: 108, pad: 'I14', bankSwitch: 65 },
      'I15': { midiNote: 109, pad: 'I15', bankSwitch: 65 },
      'I16': { midiNote: 110, pad: 'I16', bankSwitch: 65 },

      // Bank J
      'J1': { midiNote: 111, pad: 'J1', bankSwitch: 65 },
      'J2': { midiNote: 112, pad: 'J2', bankSwitch: 65 },
      'J3': { midiNote: 113, pad: 'J3', bankSwitch: 65 },
      'J4': { midiNote: 114, pad: 'J4', bankSwitch: 65 },
      'J5': { midiNote: 115, pad: 'J5', bankSwitch: 65 },
      'J6': { midiNote: 116, pad: 'J6', bankSwitch: 65 },
      'J7': { midiNote: 117, pad: 'J7', bankSwitch: 65 },
      'J8': { midiNote: 118, pad: 'J8', bankSwitch: 65 },
      'J9': { midiNote: 119, pad: 'J9', bankSwitch: 65 },
      'J10': { midiNote: 120, pad: 'J10', bankSwitch: 65 },
      'J11': { midiNote: 121, pad: 'J11', bankSwitch: 65 },
      'J12': { midiNote: 122, pad: 'J12', bankSwitch: 65 },
      'J13': { midiNote: 123, pad: 'J13', bankSwitch: 65 },
      'J14': { midiNote: 124, pad: 'J14', bankSwitch: 65 },
      'J15': { midiNote: 125, pad: 'J15', bankSwitch: 65 },
      'J16': { midiNote: 126, pad: 'J16', bankSwitch: 65 },
    }
  }

  /**
   * The default mapping of pads `A1` to `J12` to MIDI notes for the OG SP404.
   * https://support.roland.com/hc/en-us/articles/201932129-SP-404-Playing-the-SP-404-via-MIDI
   * @returns {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes.
   */
  static get defaultMapOG() {
    return {
      // Bank A
      'A1': { midiNote: 47, pad: 'A1', bankSwitch: 0 },
      'A2': { midiNote: 48, pad: 'A2', bankSwitch: 0 },
      'A3': { midiNote: 49, pad: 'A3', bankSwitch: 0 },
      'A4': { midiNote: 50, pad: 'A4', bankSwitch: 0 },
      'A5': { midiNote: 51, pad: 'A5', bankSwitch: 0 },
      'A6': { midiNote: 52, pad: 'A6', bankSwitch: 0 },
      'A7': { midiNote: 53, pad: 'A7', bankSwitch: 0 },
      'A8': { midiNote: 54, pad: 'A8', bankSwitch: 0 },
      'A9': { midiNote: 55, pad: 'A9', bankSwitch: 0 },
      'A10': { midiNote: 56, pad: 'A10', bankSwitch: 0 },
      'A11': { midiNote: 57, pad: 'A11', bankSwitch: 0 },
      'A12': { midiNote: 58, pad: 'A12', bankSwitch: 0 },

      // Bank B
      'B1': { midiNote: 59, pad: 'B1', bankSwitch: 0 },
      'B2': { midiNote: 60, pad: 'B2', bankSwitch: 0 },
      'B3': { midiNote: 61, pad: 'B3', bankSwitch: 0 },
      'B4': { midiNote: 62, pad: 'B4', bankSwitch: 0 },
      'B5': { midiNote: 63, pad: 'B5', bankSwitch: 0 },
      'B6': { midiNote: 64, pad: 'B6', bankSwitch: 0 },
      'B7': { midiNote: 65, pad: 'B7', bankSwitch: 0 },
      'B8': { midiNote: 66, pad: 'B8', bankSwitch: 0 },
      'B9': { midiNote: 67, pad: 'B9', bankSwitch: 0 },
      'B10': { midiNote: 68, pad: 'B10', bankSwitch: 0 },
      'B11': { midiNote: 69, pad: 'B11', bankSwitch: 0 },
      'B12': { midiNote: 70, pad: 'B12', bankSwitch: 0 },

      // Bank C
      'C1': { midiNote: 71, pad: 'C1', bankSwitch: 0 },
      'C2': { midiNote: 72, pad: 'C2', bankSwitch: 0 },
      'C3': { midiNote: 73, pad: 'C3', bankSwitch: 0 },
      'C4': { midiNote: 74, pad: 'C4', bankSwitch: 0 },
      'C5': { midiNote: 75, pad: 'C5', bankSwitch: 0 },
      'C6': { midiNote: 76, pad: 'C6', bankSwitch: 0 },
      'C7': { midiNote: 77, pad: 'C7', bankSwitch: 0 },
      'C8': { midiNote: 78, pad: 'C8', bankSwitch: 0 },
      'C9': { midiNote: 79, pad: 'C9', bankSwitch: 0 },
      'C10': { midiNote: 80, pad: 'C10', bankSwitch: 0 },
      'C11': { midiNote: 81, pad: 'C11', bankSwitch: 0 },
      'C12': { midiNote: 82, pad: 'C12', bankSwitch: 0 },

      // Bank D
      'D1': { midiNote: 83, pad: 'D1', bankSwitch: 0 },
      'D2': { midiNote: 84, pad: 'D2', bankSwitch: 0 },
      'D3': { midiNote: 85, pad: 'D3', bankSwitch: 0 },
      'D4': { midiNote: 86, pad: 'D4', bankSwitch: 0 },
      'D5': { midiNote: 87, pad: 'D5', bankSwitch: 0 },
      'D6': { midiNote: 88, pad: 'D6', bankSwitch: 0 },
      'D7': { midiNote: 89, pad: 'D7', bankSwitch: 0 },
      'D8': { midiNote: 90, pad: 'D8', bankSwitch: 0 },
      'D9': { midiNote: 91, pad: 'D9', bankSwitch: 0 },
      'D10': { midiNote: 92, pad: 'D10', bankSwitch: 0 },
      'D11': { midiNote: 93, pad: 'D11', bankSwitch: 0 },
      'D12': { midiNote: 94, pad: 'D12', bankSwitch: 0 },

      // Bank E
      'E1': { midiNote: 95, pad: 'E1', bankSwitch: 0 },
      'E2': { midiNote: 96, pad: 'E2', bankSwitch: 0 },
      'E3': { midiNote: 97, pad: 'E3', bankSwitch: 0 },
      'E4': { midiNote: 98, pad: 'E4', bankSwitch: 0 },
      'E5': { midiNote: 99, pad: 'E5', bankSwitch: 0 },
      'E6': { midiNote: 100, pad: 'E6', bankSwitch: 0 },
      'E7': { midiNote: 101, pad: 'E7', bankSwitch: 0 },
      'E8': { midiNote: 102, pad: 'E8', bankSwitch: 0 },
      'E9': { midiNote: 103, pad: 'E9', bankSwitch: 0 },
      'E10': { midiNote: 104, pad: 'E10', bankSwitch: 0 },
      'E11': { midiNote: 105, pad: 'E11', bankSwitch: 0 },
      'E12': { midiNote: 106, pad: 'E12', bankSwitch: 0 },

      // Bank F
      'F1': { midiNote: 107, pad: 'F1', bankSwitch: 0 },
      'F2': { midiNote: 108, pad: 'F2', bankSwitch: 0 },
      'F3': { midiNote: 109, pad: 'F3', bankSwitch: 0 },
      'F4': { midiNote: 110, pad: 'F4', bankSwitch: 0 },
      'F5': { midiNote: 111, pad: 'F5', bankSwitch: 0 },
      'F6': { midiNote: 112, pad: 'F6', bankSwitch: 0 },
      'F7': { midiNote: 113, pad: 'F7', bankSwitch: 0 },
      'F8': { midiNote: 114, pad: 'F8', bankSwitch: 0 },
      'F9': { midiNote: 115, pad: 'F9', bankSwitch: 0 },
      'F10': { midiNote: 116, pad: 'F10', bankSwitch: 0 },
      'F11': { midiNote: 117, pad: 'F11', bankSwitch: 0 },
      'F12': { midiNote: 118, pad: 'F12', bankSwitch: 0 },

      // Bank G
      'G1': { midiNote: 71, pad: 'G1', bankSwitch: 64 },
      'G2': { midiNote: 72, pad: 'G2', bankSwitch: 64 },
      'G3': { midiNote: 73, pad: 'G3', bankSwitch: 64 },
      'G4': { midiNote: 74, pad: 'G4', bankSwitch: 64 },
      'G5': { midiNote: 75, pad: 'G5', bankSwitch: 64 },
      'G6': { midiNote: 76, pad: 'G6', bankSwitch: 64 },
      'G7': { midiNote: 77, pad: 'G7', bankSwitch: 64 },
      'G8': { midiNote: 78, pad: 'G8', bankSwitch: 64 },
      'G9': { midiNote: 79, pad: 'G9', bankSwitch: 64 },
      'G10': { midiNote: 80, pad: 'G10', bankSwitch: 64 },
      'G11': { midiNote: 81, pad: 'G11', bankSwitch: 64 },
      'G12': { midiNote: 82, pad: 'G12', bankSwitch: 64 },

      // Bank H
      'H1': { midiNote: 83, pad: 'H1', bankSwitch: 64 },
      'H2': { midiNote: 84, pad: 'H2', bankSwitch: 64 },
      'H3': { midiNote: 85, pad: 'H3', bankSwitch: 64 },
      'H4': { midiNote: 86, pad: 'H4', bankSwitch: 64 },
      'H5': { midiNote: 87, pad: 'H5', bankSwitch: 64 },
      'H6': { midiNote: 88, pad: 'H6', bankSwitch: 64 },
      'H7': { midiNote: 89, pad: 'H7', bankSwitch: 64 },
      'H8': { midiNote: 90, pad: 'H8', bankSwitch: 64 },
      'H9': { midiNote: 91, pad: 'H9', bankSwitch: 64 },
      'H10': { midiNote: 92, pad: 'H10', bankSwitch: 64 },
      'H11': { midiNote: 93, pad: 'H11', bankSwitch: 64 },
      'H12': { midiNote: 94, pad: 'H12', bankSwitch: 64 },

      // Bank I
      'I1': { midiNote: 95, pad: 'I1', bankSwitch: 64 },
      'I2': { midiNote: 96, pad: 'I2', bankSwitch: 64 },
      'I3': { midiNote: 97, pad: 'I3', bankSwitch: 64 },
      'I4': { midiNote: 98, pad: 'I4', bankSwitch: 64 },
      'I5': { midiNote: 99, pad: 'I5', bankSwitch: 64 },
      'I6': { midiNote: 100, pad: 'I6', bankSwitch: 64 },
      'I7': { midiNote: 101, pad: 'I7', bankSwitch: 64 },
      'I8': { midiNote: 102, pad: 'I8', bankSwitch: 64 },
      'I9': { midiNote: 103, pad: 'I9', bankSwitch: 64 },
      'I10': { midiNote: 104, pad: 'I10', bankSwitch: 64 },
      'I11': { midiNote: 105, pad: 'I11', bankSwitch: 64 },
      'I12': { midiNote: 106, pad: 'I12', bankSwitch: 64 },

      // Bank J
      'J1': { midiNote: 107, pad: 'J1', bankSwitch: 64 },
      'J2': { midiNote: 108, pad: 'J2', bankSwitch: 64 },
      'J3': { midiNote: 109, pad: 'J3', bankSwitch: 64 },
      'J4': { midiNote: 110, pad: 'J4', bankSwitch: 64 },
      'J5': { midiNote: 111, pad: 'J5', bankSwitch: 64 },
      'J6': { midiNote: 112, pad: 'J6', bankSwitch: 64 },
      'J7': { midiNote: 113, pad: 'J7', bankSwitch: 64 },
      'J8': { midiNote: 114, pad: 'J8', bankSwitch: 64 },
      'J9': { midiNote: 115, pad: 'J9', bankSwitch: 64 },
      'J10': { midiNote: 116, pad: 'J10', bankSwitch: 64 },
      'J11': { midiNote: 117, pad: 'J11', bankSwitch: 64 },
      'J12': { midiNote: 118, pad: 'J12', bankSwitch: 64 },
    }
  }

  /**
   * Parse the pattern into notes and extract the bar count from the footer.
   * @param {object} options The options for parsing the pattern.
   * @param {number} [options.bytesPerNote] The number of bytes for each note; default is 8.
   * @param {number} [options.padsPerBank] The number of pads per bank, 12 or 16 for the MKii; default is 16.
   * @param {boolean} [options.og] When true, process for the original SP404s, when false for the MKii; default is false.
   */
  parse = ({ bytesPerNote = 8, padsPerBank = 16, og = false }) => {
    this.notes = [];

    /** @type {number} The total number notes in the pattern (minus 2 for the footer). */
    const totalNotes = (this.remainingBytes() / bytesPerNote) - 2;
    debug('parse totalNotes:', totalNotes);
    let i = 0;
    let realNote = 0;
    while (i < totalNotes) {
      // Ticks, the delay until the next track.
      const ticks = this.readUInt8();
      // MIDI Note (47-106)
      const midiNote = this.readUInt8();
      // Channel Offset (00=ABCDE, 01=FGHIJ)
      const bankSwitch = this.readUInt8();
      // Pitch Mode
      // When not step sequencer, value is 0.
      // When step sequence pattern:
      //   0 => Pitch Pad
      // 129 => -12 Pitch
      // 130 => -11 Pitch
      // 131 => -10 Pitch
      // 139 => -2 Pitch
      // 141 => +0 Pitch
      // 142 => +1 Pitch
      // 143 => +2 Pitch
      // 144 => +3 Pitch
      // 145 => +4 Pitch
      // 146 => +5 Pitch
      // 147 => +6 Pitch
      // 148 => +7 Pitch
      // 149 => +8 Pitch
      // 150 => +9 Pitch
      // 151 => +10 Pitch
      // 152 => +11 Pitch
      const pitchMode = this.readUInt8();
      // Velocity (0 - 127)
      const velocity = this.readUInt8();
      // Unknown 3: 64 / 0x40 / 1000000
      // Occasionally: 0 / 0 / 0
      const unknown3 = this.readUInt8();
      // Length (Ticks, 2 Bytes)
      const length = this.readUInt16(true);
      // Calculate the sample number from the MIDI note.

      // OG and MKii differ in how these are handled.
      let sampleNumber;
      if (og) {
        if (bankSwitch === 0) {
          sampleNumber = midiNote - 46;
        } else if (bankSwitch === 64) {
          sampleNumber = midiNote - 46 + (padsPerBank * 5);
        } else {
          debug('parse Unexpected value for og bankSwitch:', bankSwitch);
          sampleNumber = 160;
        }
      } else {
        // In recent patterns, bankSwitch was set to 64 rather than 1 or 0.
        // This seems to be firmware dependent, with 64 being the newest value.
        // When parsing a pattern playing long notes that were stopped manually with a second tap, the bankswitch value was 65.
        if (bankSwitch === 0 || bankSwitch === 64) {
          sampleNumber = midiNote - 46;
        } else if (bankSwitch === 1 || bankSwitch === 65) {
          sampleNumber = midiNote - 46 + (padsPerBank * 5);
        } else {
          debug('parse Unexpected value for MKii bankSwitch:', bankSwitch);
          sampleNumber = 160;
        }
      }

      // Build the pad label from the sample number.
      const padNumber = sampleNumber - 1;
      const bankNumber = Math.floor(padNumber / padsPerBank);
      const bankLetter = String.fromCharCode('A'.charCodeAt(0) + bankNumber);
      const bankPadNumber = (padNumber % padsPerBank) + 1;
      const padLabel = `${bankLetter}${bankPadNumber}`;
      // debug('parse padLabel:', padLabel);

      /** @type {Note} */
      const note = {
        ticks,
        midiNote,
        bankSwitch,
        pitchMode,
        velocity,
        unknown3,
        length,
        sampleNumber,
        padLabel,
      };

      if (pitchMode !== 0 && (pitchMode > 153 || pitchMode < 129)) {
        debug('pitchMode:', pitchMode, '/', pitchMode.toString(16).toUpperCase(), '/', pitchMode.toString(2));
      }
      if (![0, 64].includes(unknown3)) {
        debug('unknown3:', unknown3, '/', unknown3.toString(16).toUpperCase(), '/', unknown3.toString(2));
      }
      // Only debugging non-empty notes
      if (note.midiNote !== 128) {
        realNote++
        debug('note:', i, realNote, note);
      }
      this.notes.push(note);
      i++;
    }

    const footer = this.read(16);
    if (this.remainingBytes() > 0) {
      debug('parse Read footer but bytes remaining:', this.remainingBytes())
    }
    // debug('footer:', footer);
    if (footer[0] !== 0) {
      debug('parse Unique Footer Byte 0:', footer[0])
    }
    if (footer[1] !== 140) {
      debug('parse Unique Footer Byte 1:', footer[1])
    }
    if (footer[2] !== 0) {
      debug('parse Unique Footer Byte 2:', footer[2])
    }
    if (footer[3] !== 0) {
      debug('parse Unique Footer Byte 3:', footer[3])
    }
    if (footer[4] !== 0) {
      debug('parse Unique Footer Byte 4:', footer[4])
    }
    if (footer[5] !== 0) {
      debug('parse Unique Footer Byte 5:', footer[5])
    }
    if (footer[6] !== 0) {
      debug('parse Unique Footer Byte 6:', footer[6])
    }
    if (footer[7] !== 0) {
      debug('parse Unique Footer Byte 7:', footer[7])
    }
    // Bars (MKii: 1-64; OG: 0)
    if (og) {
      if (footer[8] !== 0) {
        debug('parse Unique Footer Byte 8 (OG):', footer[8])
      }
    } else {
      if (footer[8] < 1 || footer[8] > 64) {
        debug('parse Unique Footer Byte 8 (MKii):', footer[8])
      }
    }
    // OG: 2; MKii: 0
    if (og) {
      if (footer[9] !== 2) {
        debug('parse Unique Footer Byte 9 (OG):', footer[9])
      }
    } else {
      if (footer[9] !== 0) {
        debug('parse Unique Footer Byte 9 (MKii):', footer[9])
      }
    }
    if (footer[10] !== 0) {
      debug('parse Unique Footer Byte 10:', footer[10])
    }
    if (footer[11] !== 0) {
      debug('parse Unique Footer Byte 11:', footer[11])
    }
    // Time Signature
    if (![0, 1, 2, 3, 4, 5, 6, 7].includes(footer[12])) {
      debug('parse Unique Footer Byte 12:', footer[12])
    }
    // OG: 0; MKii: 128
    if (og) {
      if (footer[13] !== 0) {
        debug('parse Unique Footer Byte 13 (OG):', footer[13])
      }
    } else {
      if (footer[13] !== 128) {
        debug('parse Unique Footer Byte 13 (MKii):', footer[13])
      }
    }
    // Bars (OG: 0; MKii: 1-64)
    if (og) {
      if (footer[14] !== 0) {
        debug('parse Unique Footer Byte 13 (OG):', footer[14])
      }
    } else {
      if (footer[14] < 1 || footer[14] > 64) {
        debug('parse Unique Footer Byte 14 (MKii):', footer[14])
      }
    }
    // OG: 0; MKii: 1
    if (og) {
      if (footer[15] !== 0) {
        debug('parse Unique Footer Byte 15 (OG):', footer[15])
      }
    } else {
      if (footer[15] !== 1) {
        debug('parse Unique Footer Byte 15 (MKii):', footer[15])
      }
    }

    if (footer[8] !== footer[14]) {
      debug('parse Bars bytes 8 and 14 mismatch:', footer[8], footer[14])
    }

    // Bytes 8 and 14 are the total number of bars in the pattern.
    this.bars = footer[8];
    debug('bars:', this.bars);
    this.timeSignature = footer[12];
  };

  /**
   * Convert the parsed notes to a AudioMidi instance ready to be saved as MIDI file or manipulated further.
   * @param {object} options The options
   * @param {number} [options.bpm] The BPM of the track, when undefined no tempo event will be added.
   * @param {number} options.ppq The pulses per quarter note; OG is 96, MKii is 480.
   * @param {string} options.fileName The name of the pattern file being converted,
   * @param {Record<string, number>} options.noteMap A map of Pads `A1` to `J16` that correspond to which MIDI note.
   * @returns {AudioMIDI} A new AudioMIDI instance populated from the pattern.
   */
  toMidi = ({ bpm, ppq, fileName, noteMap }) => {
    debug('toMidi:', { bpm, fileName });
    // We will build a single track.
    /** @type {(import('@uttori/audio-midi').MidiTrackEvent & { absoluteTime: number })[]} */
    const allEvents = [];

    // Running absolute time in "pattern ticks" for each note.
    let absoluteTime = 0;

    for (const note of this.notes) {
      // Accumulate absolute time; note.ticks is the gap from the previous note.
      absoluteTime += note.ticks;

      // Map the Pad Label to MIDI Note
      const midiNote = noteMap[note.padLabel];
      if (!midiNote) {
        // Possibly skip unknown pads or throw
        debug('toMidi Unknown pad:', note.padLabel);
        continue;
      }

      // Create a Note On event
      allEvents.push({
        absoluteTime: absoluteTime,
        deltaTime: 0,
        type: 0x90,
        channel: 0,
        data: {
          note: String(midiNote),
          velocity: note.velocity,
          length: note.length,
        },
        label: 'Note On',
      });

      // If the note has a nonzero length, also create a Note Off event
      if (note.length > 0) {
        allEvents.push({
          absoluteTime: absoluteTime + note.length,
          deltaTime: 0,
          type: 0x80,
          channel: 0,
          data: {
            note: String(midiNote),
            velocity: 0,
            length: note.length, // Uneccessary, but included for completeness
          },
          label: 'Note Off',
        });
      }
    }

    // Sort all the events by absoluteTime
    allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);

    // Convert the absolute times to delta times
    let lastAbs = 0;
    for (const event of allEvents) {
      const delta = event.absoluteTime - lastAbs;
      // This is what the MIDI parser wants
      event.deltaTime = delta;
      lastAbs = event.absoluteTime;
    }

    // Build one MIDI track
    /** @type {import('@uttori/audio-midi').Track} */
    const track = {
      type: 'MTrk',
      chunkLength: 0,
      events: [],
    };

    // Optionally add tempo or other meta events at time 0
    if (bpm) {
      track.events.push(AudioMIDI.generateTempoEvent(bpm));
    }
    track.events.push(AudioMIDI.generateMetaStringEvent(0x03, `SP404 Pattern ${fileName}`));

    // Add all note events
    track.events.push(...allEvents);
    // End-of-track meta
    track.events.push(AudioMIDI.generateEndOfTrackEvent());

    // Create a AudioMIDI with that single track
    const midi = new AudioMIDI();
    midi.format = 1;
    midi.trackCount = 1;
    midi.timeDivision = ppq;
    midi.chunks = [track];

    return midi;
  };

  /**
   * Gathers all pads used in this pattern along with their MIDI notes.
   * @returns {{ padLabel: string, midiNotes: number[] }[]} An array of pad usage objects.
   */
  getUsedPads() {
    /** @type {Set<string>} */
    const padMap = new Set();

    for (const note of this.notes) {
      // Skip "empty" notes, which often use 128 as a placeholder
      // if (note.midiNote === 128) continue;
      padMap.add(note.padLabel);
    }

    return [...padMap];
  }

  /**
   * Converts a AudioMIDI structure back into a pad file format.
   * Pads that play all the way through will have 2 on notes, one to start the sound and one to end it.
   * @param {import('@uttori/audio-midi').default} audioMIDI The AudioMIDI instance to convert back to a pad file.
   * @param {Record<string, string>} noteMap A map of Pads `A1` to `J16` that correspond to which MIDI note
   * @param {number} patternPPQN The pulses per quarter note of the pattern; OG is 96, MKii is 480.
   * @param {boolean} [og] When true, process for the original SP404s, when false for the MKii; default is false.
   * @returns {DataBuffer} A new DataBuffer representing the pad file.
   */
  static fromMidi(audioMIDI, noteMap, patternPPQN, og = false) {
    debug('fromMidi');
    if (!audioMIDI || typeof audioMIDI !== 'object' || !('timeDivision' in audioMIDI) || !('chunks' in audioMIDI)) {
      throw new Error('No audioMIDI provided, please provide an AudioMIDI instance.');
    }
    if (!noteMap) {
      throw new Error('No noteMap provided, please provide a mapping of MIDI notes to pads.');
    }
    if (!patternPPQN) {
      throw new Error('No patternPPQN provided, please provide a PPQN for the pattern: OG is 96, MKii is 480.');
    }
    const dataBuffer = new DataBuffer();

    // Ensure we handle different PPQNs
    const midiPPQN = audioMIDI.timeDivision;
    // Assuming the target is always 480 ticks per quarter note
    const conversionRatio = patternPPQN / midiPPQN;

    debug('fromMidi:', { midiPPQN, patternPPQN, conversionRatio });

    // 1920 ticks per bar (4/4 time signature)
    const ticksPerBar = patternPPQN * 4; // 1920;
    // Maximum length is 64 bars (122880 ticks)
    const maxBars = 64;
    // Max ticks between events before inserting an empty note
    const maxTicksInGap = 255;

    // Track the current time in ticks
    let currentTime = 0;

    // Helper function to insert an empty note if there's a gap larger than 255 ticks
    const insertEmptyNotes = (gap = 0) => {
      debug('fromMidi: insertEmptyNotes', { gap });
      while (gap > 0) {
        // Insert no more than 255 ticks at a time
        const ticksToInsert = Math.min(gap, maxTicksInGap);
        // Write the gap
        dataBuffer.writeUInt8(ticksToInsert);
        // Empty note (pad: 128)
        dataBuffer.writeUInt8(128);
        // Bank switch (assuming 0)
        dataBuffer.writeUInt8(0);
        // unknown2
        dataBuffer.writeUInt8(0);
        // Velocity
        dataBuffer.writeUInt8(0);
        // Unknown 3
        dataBuffer.writeUInt8(0);
        // Length is 0 for empty notes
        dataBuffer.writeUInt16(0, dataBuffer.offset, true, true);

        gap -= ticksToInsert;
      }
    };

    // Track the total length of the track
    let totalTrackLength = 0;

    // Flatten all events into a single list with absoluteTime
    /** @type {(import('@uttori/audio-midi').NoteData & { absoluteTime: number })[]} */
    const allEvents = [];
    for (const track of audioMIDI.chunks) {
      if (!track || !('events' in track)) {
        continue;
      }
      let absoluteTime = 0;
      for (const event of track.events) {
        absoluteTime += event.deltaTime; // accumulate absolute time
        if (event && typeof event.data === 'object' && 'type' in event && 'velocity' in event.data && event.type === 0x90 && event.data.velocity > 0) {
          allEvents.push({
            absoluteTime,
            note: event.data.note,       // MIDI note number
            velocity: event.data.velocity,
            length: event.data.length,   // or 0 if not set
          });
        }
      }
    }

    // Sort by absoluteTime so events are truly chronological
    allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);
    let lastAbsoluteTime = 0;

    // Loop through tracks and events to convert back to pad file format
    for (const event of allEvents) {
      debug('fromMidi: 📧 event', event);
      const { note, velocity, length, absoluteTime } = event;
      debug('fromMidi: Note On', { note, velocity, length });

      // Convert deltaTime (ticks) from MIDI to pattern format
      const ticks = Math.round((absoluteTime - lastAbsoluteTime) * conversionRatio);
      debug('fromMidi: ticks', ticks);

      // Check for a gap larger than 255 ticks, and insert empty notes if necessary
      const gap = ticks - currentTime;
      debug('fromMidi: gap', gap);
      if (gap > 255) {
        insertEmptyNotes(gap);
      }

      // We pass in noteMap, mapping the MIDI values to Pads, then look the pads up in the appropriate map.
      // If we are in a different bank we will need to set bank switch.
      // MIDI Note (47-106)
      debug(`fromMidi: note`, note);
      const pad = noteMap[note];
      debug(`fromMidi: pad`, pad);
      const { bankSwitch, midiNote } = og ? AudioPattern.defaultMapOG[pad] : AudioPattern.defaultMap[pad];
      debug(`fromMidi:`, { bankSwitch, midiNote })
      // const bankSwitch = 0;
      const pitchMode = 0; // Placeholder

      // Update the length based on the PPQN conversion ratio
      const correctedLength = Math.round(length * conversionRatio);
      debug(`fromMidi: correctedLength = ${length} * ${conversionRatio} = `, correctedLength);

      // Write the values back into the DataBuffer
      // Time in ticks
      dataBuffer.writeUInt8(ticks);
      // MIDI note number (pad)
      dataBuffer.writeUInt8(midiNote);
      // Bank switch (assuming 0)
      dataBuffer.writeUInt8(bankSwitch);
      // Pitch Mode: 0 for pad control or 141 for +0 Pitch in step sequencer
      dataBuffer.writeUInt8(pitchMode);
      // Velocity
      dataBuffer.writeUInt8(velocity);
      // Unknown 3: Always 64 (unknown cases of 0 outside of blank notes)
      dataBuffer.writeUInt8(64);
      // Length in ticks
      dataBuffer.writeUInt16(correctedLength, dataBuffer.offset, true, true);

      // Update current time
      currentTime += ticks;
      totalTrackLength += correctedLength;
      lastAbsoluteTime = absoluteTime;
    }

    // Round the total track length to the nearest bar
    if (currentTime === 0 && totalTrackLength > 0) {
      // Edge case: Only one note at tick 0, insert 1920 ticks to ensure 1 bar
      insertEmptyNotes(ticksPerBar);
    } else {
      const remainder = currentTime % ticksPerBar;
      if (remainder !== 0) {
        const ticksToNextBar = ticksPerBar - remainder;
        // Ensure that adding ticks won't exceed the 64-bar limit
        if (currentTime + ticksToNextBar <= maxBars * ticksPerBar) {
          // Insert empty notes to round up the track to the nearest bar
          insertEmptyNotes(ticksToNextBar);
          currentTime += ticksToNextBar;
        } else {
          // If rounding would exceed the maximum, just cap the length
          currentTime = maxBars * ticksPerBar;
        }
      }
    }

    // Add footer and other necessary data to the buffer
    const footer = new Uint8Array(16);
    const bars = Math.round(currentTime / ticksPerBar);
    debug('fromMidi: bars', bars);
    footer[1] = 140;
    footer[8] = og ? 0 : bars;
    footer[9] = og ? 2 : 0;
    // footer[12] = AudioMIDI.timeSignature;
    footer[13] = og ? 0 : 128
    footer[14] = og ? 0 : bars;
    footer[15] = og ? 0 : 1
    dataBuffer.writeBytes(footer);

    return dataBuffer;
  }
}

export default AudioPattern;
