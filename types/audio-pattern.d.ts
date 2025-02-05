export default AudioPattern;
export type Note = {
    /**
     * The delay in ticks until the next track.
     */
    ticks: number;
    /**
     * The MIDI note value (47-106).
     */
    midiNote: number;
    /**
     * The channel offset (00=ABCDE, 01=FGHIJ).
     */
    bankSwitch: number;
    /**
     * The pitch mode of Step Sequencer notes.
     */
    pitchMode: number;
    /**
     * The velocity of the note (0-127).
     */
    velocity: number;
    /**
     * An unknown value, commonly 64 / 0x40.
     */
    unknown3: number;
    /**
     * The length of the note in ticks (2 Bytes).
     */
    length: number;
    /**
     * The calculated sample number based on MIDI note and bank switch.
     */
    sampleNumber: number;
    /**
     * The label of the pad, constructed from the sample number and bank.
     */
    padLabel: string;
};
export type PadMapping = {
    /**
     * The MIDI note numeric value.
     */
    midiNote: number;
    /**
     * The human friendly pad label.
     */
    pad: string;
    /**
     * The value for the bank switch byte.
     */
    bankSwitch: number;
};
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
declare class AudioPattern extends DataBuffer {
    static get defaultPPQOG(): number;
    static get defaultPPQ(): number;
    /**
     * The default mapping of pads `A1` to `J16` to MIDI notes.
     * @returns {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes.
     */
    static get defaultMap(): Record<string, PadMapping>;
    /**
     * The default mapping of pads `A1` to `J12` to MIDI notes for the OG SP404.
     * https://support.roland.com/hc/en-us/articles/201932129-SP-404-Playing-the-SP-404-via-MIDI
     * @returns {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes.
     */
    static get defaultMapOG(): Record<string, PadMapping>;
    /**
     * Converts a AudioMIDI structure back into a pad file format.
     * Pads that play all the way through will have 2 on notes, one to start the sound and one to end it.
     * @param {import('@uttori/audio-midi').default} audioMIDI The AudioMIDI instance to convert back to a pad file.
     * @param {Record<string, string>} noteMap A map of Pads `A1` to `J16` that correspond to which MIDI note
     * @param {number} patternPPQN The pulses per quarter note of the pattern; OG is 96, MKii is 480.
     * @param {boolean} [og] When true, process for the original SP404s, when false for the MKii; default is false.
     * @returns {DataBuffer} A new DataBuffer representing the pad file.
     */
    static fromMidi(audioMIDI: import("@uttori/audio-midi").default, noteMap: Record<string, string>, patternPPQN: number, og?: boolean): DataBuffer;
    /**
     * Creates a new AudioPattern.
     * @param {number[]|ArrayBuffer|Buffer|DataBuffer|Int8Array|Int16Array|Int32Array|number|string|Uint8Array|Uint16Array|Uint32Array|undefined} [input] The data to process.
     * @param {object} options The options for parsing the pattern.
     * @param {number} [options.bytesPerNote] The number of bytes for each note; default is 8.
     * @param {number} [options.padsPerBank] The number of pads per bank, 12 or 16 for the MKii; default is 16.
     * @param {boolean} [options.og] When true, process for the original SP404s, when false for the MKii; default is false.
     * @class
     */
    constructor(input?: number[] | ArrayBuffer | Buffer | DataBuffer | Int8Array | Int16Array | Int32Array | number | string | Uint8Array | Uint16Array | Uint32Array | undefined, options?: {
        bytesPerNote?: number;
        padsPerBank?: number;
        og?: boolean;
    });
    /** @type {number} The number of bars in the pattern, so 1 bar is 1. */
    bars: number;
    /** @type {number} The time signature of the pattern, `0` = 4/4, `1` is 3/4, `2` is 2/4, `3` = 1/4, `4` is 5/4, `5` is 6/4, `7` is 7/4. */
    timeSignature: number;
    /** @type {Note[]} */
    notes: Note[];
    /** @type {Record<string, PadMapping>} The default mapping of pads `A1` to `J16` to MIDI notes. */
    defaultMap: Record<string, PadMapping>;
    /**
     * Parse the pattern into notes and extract the bar count from the footer.
     * @param {object} options The options for parsing the pattern.
     * @param {number} [options.bytesPerNote] The number of bytes for each note; default is 8.
     * @param {number} [options.padsPerBank] The number of pads per bank, 12 or 16 for the MKii; default is 16.
     * @param {boolean} [options.og] When true, process for the original SP404s, when false for the MKii; default is false.
     */
    parse: ({ bytesPerNote, padsPerBank, og }: {
        bytesPerNote?: number;
        padsPerBank?: number;
        og?: boolean;
    }) => void;
    /**
     * Convert the parsed notes to a AudioMidi instance ready to be saved as MIDI file or manipulated further.
     * @param {object} options The options
     * @param {number} [options.bpm] The BPM of the track, when undefined no tempo event will be added.
     * @param {number} options.ppq The pulses per quarter note; OG is 96, MKii is 480.
     * @param {string} options.fileName The name of the pattern file being converted,
     * @param {Record<string, number>} options.noteMap A map of Pads `A1` to `J16` that correspond to which MIDI note.
     * @returns {AudioMIDI} A new AudioMIDI instance populated from the pattern.
     */
    toMidi: ({ bpm, ppq, fileName, noteMap }: {
        bpm?: number;
        ppq: number;
        fileName: string;
        noteMap: Record<string, number>;
    }) => AudioMIDI;
    /**
     * Gathers all pads used in this pattern along with their MIDI notes.
     * @returns {{ padLabel: string, midiNotes: number[] }[]} An array of pad usage objects.
     */
    getUsedPads(): {
        padLabel: string;
        midiNotes: number[];
    }[];
}
import { DataBuffer } from '@uttori/data-tools';
import AudioMIDI from '@uttori/audio-midi';
//# sourceMappingURL=audio-pattern.d.ts.map