const debug = require('debug')('Uttori.Utility.AudioPadInfo');
const { DataBuffer, DataBufferList, DataStream } = require('@uttori/data-tools');

/**
 * A Pad object.
 *
 * @typedef {object} Pad
 * @property {boolean} avaliable - If the pad is actively used in the pad file or not.
 * @property {string} label - The human readable pad text, `A1` - `J12`.
 * @property {string} filename - The filename for the corresponding Wave File, `A0000001.WAV` - `J0000012.WAV`.
 * @property {number} originalSampleStart - Sample start and end offsets are relative to the original file
 * @property {number} originalSampleEnd - SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data
 * @property {number} userSampleStart - The length of the RIFF headers before the data chunk is always exactly 512 bytes
 * @property {number} userSampleEnd - The sample end value is the length of the file, and when converted correctly this is the length of the whole file
 * @property {number} volume - Volume is between 0 and 127
 * @property {boolean} lofi - LoFi: false off, true on
 * @property {boolean} loop - Loop: false off, true on
 * @property {boolean} gate - Gate: false off, true on
 * @property {boolean} reverse - Reverse: false off, true on
 * @property {string} format - Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample
 * @property {number} channels - Mono or Stereo
 * @property {string} tempoMode - Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
 * @property {number} originalTempo - BPM determined by the software. Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm
 * @property {number} userTempo - User set BPM on the device
 */

/**
 * Uttori Pad Info - Utility to manipulate the PAD_INFO.BIN file for SP-404 series of samplers.
 *
 * @property {Pad[]} pads - Parsed Pads
 * @example <caption>AudioPadInfo</caption>
 * const fs = require('fs');
 * const data = fs.readFileSync('./PAD_INFO.bin');
 * const { pads } = AudioPadInfo.fromFile(data);
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
class AudioPadInfo extends DataStream {
/**
 * Creates an instance of AudioPadInfo.
 *
 * @param {DataBufferList} list - The DataBufferList of the audio file to process.
 * @param {object} [overrides] - Options for this instance.
 * @param {number} [overrides.size=16] - ArrayBuffer byteLength for the underlying binary parsing.
 * @class
 */
  constructor(list, overrides) {
    const options = {
      size: 16,
      ...overrides,
    };
    super(list, options);

    this.pads = [];

    this.parse();
  }

  /**
   * Creates a new AudioPadInfo from file data.
   *
   * @param {Buffer} data - The data of the image to process.
   * @returns {AudioPadInfo} the new AudioPadInfo instance for the provided file data
   * @static
   */
  static fromFile(data) {
    debug('fromFile:', data.length);
    const buffer = new DataBuffer(data);
    const list = new DataBufferList();
    list.append(buffer);
    return new AudioPadInfo(list, { size: data.length });
  }

  /**
   * Creates a new AudioPadInfo from a DataBuffer.
   *
   * @param {DataBuffer} buffer - The DataBuffer of the image to process.
   * @returns {AudioPadInfo} the new AudioPadInfo instance for the provided DataBuffer
   * @static
   */
  static fromBuffer(buffer) {
    debug('fromBuffer:', buffer.length);
    const list = new DataBufferList();
    list.append(buffer);
    return new AudioPadInfo(list, { size: buffer.length });
  }

  /**
   * Parse the PAD_INFO.BIN file, decoding the supported pad info.
   *
   * This is stored alongside the samples in PAD_INFO.BIN and contains 120 × 32-byte records, one for each pad from A1 to J12.
   * In this file, values are stored in big-endian order
   */
  parse() {
    debug('parse');
    let index = 0;
    while (this.remainingBytes()) {
      const label = AudioPadInfo.getPadLabel(index);

      // SP404-SX: A0000009.WAV - J0000012.WAV
      const filename = `${label.slice(0, 1)}${label.slice(1).padStart(7, 0)}.WAV`;

      // Sample start and end offsets are relative to the original file.
      // SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data.
      // The length of the RIFF headers before the data chunk is always exactly 512 bytes.
      // The sample end value is the length of the file, and when converted correctly this is the length of the whole file.
      const originalSampleStart = this.readUInt32();
      const originalSampleEnd = this.readUInt32();
      const userSampleStart = this.readUInt32();
      const userSampleEnd = this.readUInt32();

      // Volume is between 0 and 127.
      const volume = this.readUInt8();
      if (volume < 0 || volume > 127) {
        debug('Invalid Volume:', volume);
      }

      // LoFi: 0 off, 1 on
      let lofi = this.readUInt8();
      if (lofi === 1) {
        lofi = true;
      } else if (lofi === 0) {
        lofi = false;
      } else {
        debug('Invalid LoFi:', lofi);
      }

      // Loop: 0 off, 1 on
      let loop = this.readUInt8();
      if (loop === 1) {
        loop = true;
      } else if (loop === 0) {
        loop = false;
      } else {
        debug('Invalid Loop:', loop);
      }

      // Gate: 0 off, 1 on
      let gate = this.readUInt8();
      if (gate === 1) {
        gate = true;
      } else if (gate === 0) {
        gate = false;
      } else {
        debug('Invalid Gate:', gate);
      }

      // Reverse: 0 off, 1 on
      let reverse = this.readUInt8();
      if (reverse === 1) {
        reverse = true;
      } else if (reverse === 0) {
        reverse = false;
      } else {
        debug('Invalid Reverse:', reverse);
      }

      // Format is 0 for an AIFF sample, and 1 for a WAVE sample.
      // This may simply correspond to the endianness of the data (0 = big endian, 1 = little endian).
      let format = this.readUInt8();
      if (format === 1) {
        format = 'WAVE';
      } else if (format === 0) {
        format = 'AIFF';
      } else {
        debug('Invalid Format:', format);
        format = `Invalid (${format})`;
      }

      // Mono or Stereo
      let channels = this.readUInt8();
      if (channels === 1) {
        channels = 'Mono';
      } else if (channels === 2) {
        channels = 'Stereo';
      } else {
        debug('Invalid Channels:', channels);
        channels = `Invalid (${channels})`;
      }

      // Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
      let tempoMode = this.readUInt8();
      if (tempoMode === 0) {
        tempoMode = 'Off';
      } else if (tempoMode === 1) {
        tempoMode = 'Pattern';
      } else if (tempoMode === 2) {
        tempoMode = 'User';
      } else {
        debug('Invalid Tempo Mode:', tempoMode);
        tempoMode = 'Invalid';
      }

      // Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm.
      // SP-404SX Wave Converter v1.01 on macOS computes the original tempo as 120 / sample length.
      const originalTempo = this.readUInt32() / 10;
      const userTempo = this.readUInt32() / 10;

      const data = {
        filename,
        label,
        originalSampleStart,
        originalSampleEnd,
        userSampleStart,
        userSampleEnd,
        volume,
        lofi,
        loop,
        gate,
        reverse,
        format,
        channels,
        tempoMode,
        originalTempo,
        userTempo,
      };

      // Check to see if this is the default values, meaning the pad is not taken.
      data.avaliable = AudioPadInfo.checkDefault(data);

      debug('Pad:', data);
      this.pads.push(data);
      index++;
    }
  }

  /**
   * Encode JSON values to a valid pad structure.
   *
   * @param {Pad} data - The JSON values to encode.
   * @param {number} [data.originalSampleStart=512] - Sample start and end offsets are relative to the original file.
   * @param {number} [data.originalSampleEnd=512] - SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data.
   * @param {number} [data.userSampleStart=512] - The length of the RIFF headers before the data chunk is always exactly 512 bytes.
   * @param {number} [data.userSampleEnd=512] - The sample end value is the length of the file, and when converted correctly this is the length of the whole file.
   * @param {number} [data.volume=127] - Volume is between 0 and 127.
   * @param {boolean} [data.lofi=false] - LoFi: false off, true on
   * @param {boolean} [data.loop=false] - Loop: false off, true on
   * @param {boolean} [data.gate=true] - Gate: false off, true on
   * @param {boolean} [data.reverse=false] - Reverse: false off, true on
   * @param {string} [data.format='WAVE'] - Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample.
   * @param {number} [data.channels=2] - Mono or Stereo
   * @param {string} [data.tempoMode='Off'] - Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
   * @param {number} [data.originalTempo=1200] - Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm.
   * @param {number} [data.userTempo=1200] - SP-404SX Wave Converter v1.01 on macOS computes the original tempo as 120 / sample length.
   * @returns {Buffer} - The new pad Buffer.
   * @memberof AudioPadInfo
   * @static
   */
  static encodePad(data = {}) {
    const {
      originalSampleStart = 512,
      originalSampleEnd = 512,
      userSampleStart = 512,
      userSampleEnd = 512,
      volume = 127,
      lofi = false,
      loop = false,
      gate = true,
      reverse = false,
      format = 'WAVE',
      channels = 2,
      tempoMode = 'Off',
      originalTempo = 120,
      userTempo = 120,
    } = data;

    const pad = Buffer.alloc(32, 0);

    pad.writeUInt32BE(originalSampleStart, 0);
    pad.writeUInt32BE(originalSampleEnd, 4);
    pad.writeUInt32BE(userSampleStart, 8);
    pad.writeUInt32BE(userSampleEnd, 12);

    if (!Number.isInteger(volume) || volume < 0 || volume > 127) {
      const error = `Volume is invalid, ${volume} should be an integer between 0 and 127.`;
      debug(error);
      throw new Error(error);
    }
    pad.writeUInt8(volume, 16);
    pad.writeUInt8(lofi ? 1 : 0, 17);
    pad.writeUInt8(loop ? 1 : 0, 18);
    pad.writeUInt8(gate ? 1 : 0, 19);
    pad.writeUInt8(reverse ? 1 : 0, 20);
    pad.writeUInt8(format === 'WAVE' ? 1 : 0, 21);

    // Mono or Stereo
    if (!['Mono', 'Stereo', 1, 2].includes(channels)) {
      const error = `Channels is invalid, ${channels} should be an integer between 1 and 2.`;
      debug(error);
      throw new Error(error);
    }
    if (channels === 1 || channels === 'Mono') {
      pad.writeUInt8(1, 22);
    }
    if (channels === 2 || channels === 'Stereo') {
      pad.writeUInt8(2, 22);
    }

    // Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User'
    if (tempoMode === 0 || tempoMode === 'Off') {
      pad.writeUInt8(0, 23);
    } else if (tempoMode === 1 || tempoMode === 'Pattern') {
      pad.writeUInt8(1, 23);
    } else if (tempoMode === 2 || tempoMode === 'User') {
      pad.writeUInt8(2, 23);
    } else {
      const error = `Tempo Mode is invalid, ${tempoMode} should be one of 'Off', 'Pattern', or 'User'.`;
      debug(error);
      throw new Error(error);
    }

    // Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm.
    // SP-404SX Wave Converter v1.01 on macOS computes the original tempo as 120 / sample length.
    let tempo = Math.round(originalTempo * 10);
    pad.writeUInt32BE(tempo, 24);

    tempo = Math.round(userTempo * 10);
    pad.writeUInt32BE(tempo, 28);

    return pad;
  }

  /**
   * Checks to see if a Pad is set to the default values, if so it is likely.
   *
   * @param {Pad} pad - The JSON values to check.
   * @param {boolean} [strict=false] - When strict all values are checked for defaults, otherwise just the offsets are checked.
   * @returns {boolean} - Returns true if the Pad is set the the default values, false otherwise.
   * @memberof AudioPadInfo
   * @static
   */
  static checkDefault(pad, strict = false) {
    if (pad) {
      if (
        strict === false
        && pad.originalSampleStart === 512
        && pad.originalSampleEnd === 512
        && pad.userSampleStart === 512
        && pad.userSampleEnd === 512
      ) {
        return true;
      }
      if (
        strict === true
        && pad.originalSampleStart === 512
        && pad.originalSampleEnd === 512
        && pad.userSampleStart === 512
        && pad.userSampleEnd === 512
        && pad.volume === 127
        && pad.lofi === false
        && pad.loop === false
        && pad.gate === true
        && pad.reverse === false
        && pad.format === 'WAVE'
        && pad.channels === 2
        && pad.tempoMode === 'Off'
        && pad.originalTempo === 120
        && pad.userTempo === 120
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Convert a numberic value used in the PAD_INFO.bin file for that pad to the pad label like `A1` or `J12`.
   *
   * @param {number} index - The numberic value used in the PAD_INFO.bin file.
   * @returns {string} - The pad label like `A1` or `J12`.
   * @memberof AudioPadInfo
   * @static
   */
  static getPadLabel(index) {
    let label = '';
    switch (index) {
      case 0: label = 'A1'; break;
      case 1: label = 'A2'; break;
      case 2: label = 'A3'; break;
      case 3: label = 'A4'; break;
      case 4: label = 'A5'; break;
      case 5: label = 'A6'; break;
      case 6: label = 'A7'; break;
      case 7: label = 'A8'; break;
      case 8: label = 'A9'; break;
      case 9: label = 'A10'; break;
      case 10: label = 'A11'; break;
      case 11: label = 'A12'; break;
      case 12: label = 'B1'; break;
      case 13: label = 'B2'; break;
      case 14: label = 'B3'; break;
      case 15: label = 'B4'; break;
      case 16: label = 'B5'; break;
      case 17: label = 'B6'; break;
      case 18: label = 'B7'; break;
      case 19: label = 'B8'; break;
      case 20: label = 'B9'; break;
      case 21: label = 'B10'; break;
      case 22: label = 'B11'; break;
      case 23: label = 'B12'; break;
      case 24: label = 'C1'; break;
      case 25: label = 'C2'; break;
      case 26: label = 'C3'; break;
      case 27: label = 'C4'; break;
      case 28: label = 'C5'; break;
      case 29: label = 'C6'; break;
      case 30: label = 'C7'; break;
      case 31: label = 'C8'; break;
      case 32: label = 'C9'; break;
      case 33: label = 'C10'; break;
      case 34: label = 'C11'; break;
      case 35: label = 'C12'; break;
      case 36: label = 'D1'; break;
      case 37: label = 'D2'; break;
      case 38: label = 'D3'; break;
      case 39: label = 'D4'; break;
      case 40: label = 'D5'; break;
      case 41: label = 'D6'; break;
      case 42: label = 'D7'; break;
      case 43: label = 'D8'; break;
      case 44: label = 'D9'; break;
      case 45: label = 'D10'; break;
      case 46: label = 'D11'; break;
      case 47: label = 'D12'; break;
      case 48: label = 'E1'; break;
      case 49: label = 'E2'; break;
      case 50: label = 'E3'; break;
      case 51: label = 'E4'; break;
      case 52: label = 'E5'; break;
      case 53: label = 'E6'; break;
      case 54: label = 'E7'; break;
      case 55: label = 'E8'; break;
      case 56: label = 'E9'; break;
      case 57: label = 'E10'; break;
      case 58: label = 'E11'; break;
      case 59: label = 'E12'; break;
      case 60: label = 'F1'; break;
      case 61: label = 'F2'; break;
      case 62: label = 'F3'; break;
      case 63: label = 'F4'; break;
      case 64: label = 'F5'; break;
      case 65: label = 'F6'; break;
      case 66: label = 'F7'; break;
      case 67: label = 'F8'; break;
      case 68: label = 'F9'; break;
      case 69: label = 'F10'; break;
      case 70: label = 'F11'; break;
      case 71: label = 'F12'; break;
      case 72: label = 'G1'; break;
      case 73: label = 'G2'; break;
      case 74: label = 'G3'; break;
      case 75: label = 'G4'; break;
      case 76: label = 'G5'; break;
      case 77: label = 'G6'; break;
      case 78: label = 'G7'; break;
      case 79: label = 'G8'; break;
      case 80: label = 'G9'; break;
      case 81: label = 'G10'; break;
      case 82: label = 'G11'; break;
      case 83: label = 'G12'; break;
      case 84: label = 'H1'; break;
      case 85: label = 'H2'; break;
      case 86: label = 'H3'; break;
      case 87: label = 'H4'; break;
      case 88: label = 'H5'; break;
      case 89: label = 'H6'; break;
      case 90: label = 'H7'; break;
      case 91: label = 'H8'; break;
      case 92: label = 'H9'; break;
      case 93: label = 'H10'; break;
      case 94: label = 'H11'; break;
      case 95: label = 'H12'; break;
      case 96: label = 'I1'; break;
      case 97: label = 'I2'; break;
      case 98: label = 'I3'; break;
      case 99: label = 'I4'; break;
      case 100: label = 'I5'; break;
      case 101: label = 'I6'; break;
      case 102: label = 'I7'; break;
      case 103: label = 'I8'; break;
      case 104: label = 'I9'; break;
      case 105: label = 'I10'; break;
      case 106: label = 'I11'; break;
      case 107: label = 'I12'; break;
      case 108: label = 'J1'; break;
      case 109: label = 'J2'; break;
      case 110: label = 'J3'; break;
      case 111: label = 'J4'; break;
      case 112: label = 'J5'; break;
      case 113: label = 'J6'; break;
      case 114: label = 'J7'; break;
      case 115: label = 'J8'; break;
      case 116: label = 'J9'; break;
      case 117: label = 'J10'; break;
      case 118: label = 'J11'; break;
      case 119: label = 'J12'; break;
      default: {
        debug('Unknown Pad:', index);
      }
    }
    return label;
  }

  /**
   * Convert a pad label like `A1` or `J12` to the numberic value used in the PAD_INFO.bin file for that pad.
   *
   * @param {string} label - The pad label like `A1` or `J12`.
   * @returns {number} - The numberic value used in the PAD_INFO.bin file.
   * @memberof AudioPadInfo
   * @static
   */
  static getPadIndex(label = '') {
    let index = -1;
    switch (label.toUpperCase()) {
      case 'A1': index = 0; break;
      case 'A2': index = 1; break;
      case 'A3': index = 2; break;
      case 'A4': index = 3; break;
      case 'A5': index = 4; break;
      case 'A6': index = 5; break;
      case 'A7': index = 6; break;
      case 'A8': index = 7; break;
      case 'A9': index = 8; break;
      case 'A10': index = 9; break;
      case 'A11': index = 10; break;
      case 'A12': index = 11; break;
      case 'B1': index = 12; break;
      case 'B2': index = 13; break;
      case 'B3': index = 14; break;
      case 'B4': index = 15; break;
      case 'B5': index = 16; break;
      case 'B6': index = 17; break;
      case 'B7': index = 18; break;
      case 'B8': index = 19; break;
      case 'B9': index = 20; break;
      case 'B10': index = 21; break;
      case 'B11': index = 22; break;
      case 'B12': index = 23; break;
      case 'C1': index = 24; break;
      case 'C2': index = 25; break;
      case 'C3': index = 26; break;
      case 'C4': index = 27; break;
      case 'C5': index = 28; break;
      case 'C6': index = 29; break;
      case 'C7': index = 30; break;
      case 'C8': index = 31; break;
      case 'C9': index = 32; break;
      case 'C10': index = 33; break;
      case 'C11': index = 34; break;
      case 'C12': index = 35; break;
      case 'D1': index = 36; break;
      case 'D2': index = 37; break;
      case 'D3': index = 38; break;
      case 'D4': index = 39; break;
      case 'D5': index = 40; break;
      case 'D6': index = 41; break;
      case 'D7': index = 42; break;
      case 'D8': index = 43; break;
      case 'D9': index = 44; break;
      case 'D10': index = 45; break;
      case 'D11': index = 46; break;
      case 'D12': index = 47; break;
      case 'E1': index = 48; break;
      case 'E2': index = 49; break;
      case 'E3': index = 50; break;
      case 'E4': index = 51; break;
      case 'E5': index = 52; break;
      case 'E6': index = 53; break;
      case 'E7': index = 54; break;
      case 'E8': index = 55; break;
      case 'E9': index = 56; break;
      case 'E10': index = 57; break;
      case 'E11': index = 58; break;
      case 'E12': index = 59; break;
      case 'F1': index = 60; break;
      case 'F2': index = 61; break;
      case 'F3': index = 62; break;
      case 'F4': index = 63; break;
      case 'F5': index = 64; break;
      case 'F6': index = 65; break;
      case 'F7': index = 66; break;
      case 'F8': index = 67; break;
      case 'F9': index = 68; break;
      case 'F10': index = 69; break;
      case 'F11': index = 70; break;
      case 'F12': index = 71; break;
      case 'G1': index = 72; break;
      case 'G2': index = 73; break;
      case 'G3': index = 74; break;
      case 'G4': index = 75; break;
      case 'G5': index = 76; break;
      case 'G6': index = 77; break;
      case 'G7': index = 78; break;
      case 'G8': index = 79; break;
      case 'G9': index = 80; break;
      case 'G10': index = 81; break;
      case 'G11': index = 82; break;
      case 'G12': index = 83; break;
      case 'H1': index = 84; break;
      case 'H2': index = 85; break;
      case 'H3': index = 86; break;
      case 'H4': index = 87; break;
      case 'H5': index = 88; break;
      case 'H6': index = 89; break;
      case 'H7': index = 90; break;
      case 'H8': index = 91; break;
      case 'H9': index = 92; break;
      case 'H10': index = 93; break;
      case 'H11': index = 94; break;
      case 'H12': index = 95; break;
      case 'I1': index = 96; break;
      case 'I2': index = 97; break;
      case 'I3': index = 98; break;
      case 'I4': index = 99; break;
      case 'I5': index = 100; break;
      case 'I6': index = 101; break;
      case 'I7': index = 102; break;
      case 'I8': index = 103; break;
      case 'I9': index = 104; break;
      case 'I10': index = 105; break;
      case 'I11': index = 106; break;
      case 'I12': index = 107; break;
      case 'J1': index = 108; break;
      case 'J2': index = 109; break;
      case 'J3': index = 110; break;
      case 'J4': index = 111; break;
      case 'J5': index = 112; break;
      case 'J6': index = 113; break;
      case 'J7': index = 114; break;
      case 'J8': index = 115; break;
      case 'J9': index = 116; break;
      case 'J10': index = 117; break;
      case 'J11': index = 118; break;
      case 'J12': index = 119; break;
      default: {
        debug('Unknown Pad Label:', label);
      }
    }
    return index;
  }
}

module.exports = AudioPadInfo;
