export default MidiParser;
export type Note = {
    /**
     * The delta time of the MIDI event.
     */
    deltaTime: number;
};
export type Event = {
    /**
     * The delta time of the MIDI event.
     */
    deltaTime: number;
    /**
     * The type of the event (e.g., meta event, regular event).
     */
    type: number;
    /**
     * The subtype of the meta event.
     */
    metaType?: number;
    /**
     * The length of the meta event data.
     */
    metaEventLength?: number;
    /**
     * The event data, unique to the event type.
     */
    data?: string | number | number[] | Record<string, number | number[] | string | Uint8Array> | Uint8Array;
    /**
     * A human-readable label describing the event.
     */
    label: string;
    /**
     * The MIDI channel the event is for.
     */
    channel?: number;
    /**
     * The tag for the M-Live Tag event.
     */
    tag?: number;
};
export type Header = {
    /**
     * The type of the chunk (e.g., MThd, MTrk).
     */
    type: string;
    /**
     * The format of the MIDI file (header only).
     */
    format: number;
    /**
     * The number of tracks in the MIDI file (header only).
     */
    trackCount: number;
    /**
     * The time division of the MIDI file (header only).
     */
    timeDivision: number;
    /**
     * The length of the chunk data.
     */
    chunkLength: number;
};
export type Track = {
    /**
     * The type of the chunk (e.g., MThd, MTrk).
     */
    type: string;
    /**
     * The length of the chunk data.
     */
    chunkLength: number;
    /**
     * The collection of events in the track.
     */
    events: Event[];
};
/**
 * @typedef {object} Note
 * @property {number} deltaTime The delta time of the MIDI event.
 */
/**
 * @typedef {object} Event
 * @property {number} deltaTime The delta time of the MIDI event.
 * @property {number} type The type of the event (e.g., meta event, regular event).
 * @property {number} [metaType] The subtype of the meta event.
 * @property {number} [metaEventLength] The length of the meta event data.
 * @property {string | number | number[] | Record<string, number | number[] | string | Uint8Array> | Uint8Array} [data] The event data, unique to the event type.
 * @property {string} label A human-readable label describing the event.
 * @property {number} [channel] The MIDI channel the event is for.
 * @property {number} [tag] The tag for the M-Live Tag event.
 */
/**
 * @typedef {object} Header
 * @property {string} type The type of the chunk (e.g., MThd, MTrk).
 * @property {number} format The format of the MIDI file (header only).
 * @property {number} trackCount The number of tracks in the MIDI file (header only).
 * @property {number} timeDivision The time division of the MIDI file (header only).
 * @property {number} chunkLength The length of the chunk data.
 */
/**
 * @typedef {object} Track
 * @property {string} type The type of the chunk (e.g., MThd, MTrk).
 * @property {number} chunkLength The length of the chunk data.
 * @property {Event[]} events The collection of events in the track.
 */
/**
 * MidiParser - MIDI Utility
 *
 * MIDI File Format Parser & Generator
 * @example <caption>MidiParser</caption>
 * const data = fs.readFileSync('./song.mid');
 * const file = new MidiParser(data);
 * file.parse();
 * console.log('Chunks:', file.chunks);
 * @class
 * @augments DataBuffer
 */
declare class MidiParser extends DataBuffer {
    /**
     * Decodes and validates MIDI Header.
     * Checks for `MThd` header, reads the chunk length, format, track count, and PPQN (pulses per quarter note) / PPQ (pulses per quarter) / PQN (per quarter note) / TPQN (ticks per quarter note) / TPB (ticks per beat).
     *
     * Signature (Decimal): [77, 84, 104, 100, ...]
     * Signature (Hexadecimal): [4D, 54, 68, 64, ...]
     * Signature (ASCII): [M, T, h, d, ...]
     * @static
     * @param {Buffer|string|Uint8Array} chunk  Data Blob
     * @returns {Header} The decoded values.
     * @throws {Error} Invalid WAV header
     */
    static decodeHeader(chunk: Buffer | string | Uint8Array): Header;
    /**
     * Return the human readable controller name from the ID.
     * @param {number} controller The controller ID.
     * @returns {string} The human-readable controller name.
     * @see {@link https://www.mixagesoftware.com/en/midikit/help/ | MidiKit Help Controllers}
     * @see {@link https://midi.org/midi-1-0-control-change-messages | MIDI 1.0 Control Change Messages (Data Bytes)}
     * @static
     */
    static getControllerLabel(controller: number): string;
    /**
     * Return the human readable manufacturer name from the ID.
     * @param {number} manufacturerId The manufacturer ID.
     * @returns {string} The human-readable manufacturer name.
     * @see {@link https://www.mixagesoftware.com/en/midikit/help/HTML/manufacturers.html | MidiKit Help MIDI Manufacturers List}
     */
    static getManufacturerLabel(manufacturerId: number): string;
    /**
     * Write a status byte and delta time.
     * @param {DataBuffer} dataBuffer The data buffer to write to.
     * @param {number} statusByte The status byte to write.
     * @param {number} deltaTime The delta time for the event.
     * @static
     */
    static writeStatusByteAndDeltaTime(dataBuffer: DataBuffer, statusByte: number, deltaTime: number): void;
    /**
     * Read a variable-length value.
     * @param {DataBuffer} dataBuffer The data buffer to write to.
     * @returns {number} The value to write as a variable-length quantity.
     * @static
     */
    static readVariableLengthValues: (dataBuffer: DataBuffer) => number;
    /**
     * Write a variable-length value.
     * @param {DataBuffer} dataBuffer The data buffer to write to.
     * @param {number} value The value to write as a variable-length quantity.
     * @static
     */
    static writeVariableLengthValue(dataBuffer: DataBuffer, value: number): void;
    /**
     * Write event data.
     * @param {DataBuffer} dataBuffer The data buffer to write to.
     * @param {Uint8Array | number[]} data The event data to write.
     * @static
     */
    static writeEventData(dataBuffer: DataBuffer, data: Uint8Array | number[]): void;
    /**
     * Generate a Set Tempo event with a provided BPM.
     * @param {number} bpm The desired tempo in Beats Per Minute.
     * @returns {object} The tempo event with the correct byte values.
     */
    static generateTempoEvent(bpm: number): object;
    /**
     * Generate a Meta String event:
     * - 0x01: 'Text Event'
     * - 0x02: 'Copyright Notice'
     * - 0x03: 'Sequence / Track Name'
     * - 0x04: 'Instrument Name'
     * - 0x05: 'Lyrics'
     * - 0x06: 'Marker'
     * - 0x07: 'Cue Point'
     * - 0x08: 'Program Name'
     * - 0x09: 'Device (Port) Name'
     * @param {number} metaType The meta event type. (e.g., 0x03 for Track Name).
     * @param {string} data The string value for the event (e.g., the name of the track).
     * @returns {Event} The meta string event with the encoded string data.
     */
    static generateMetaStringEvent(metaType: number, data: string): Event;
    /**
     * Generate an end of track event.
     * @returns {Event} The end of track event.
     */
    static generateEndOfTrackEvent(): Event;
    /**
     * Creates a new MidiParser.
     * @param {number[]|ArrayBuffer|Buffer|DataBuffer|Int8Array|Int16Array|Int32Array|number|string|Uint8Array|Uint16Array|Uint32Array|undefined} [input] The data to process.
     * @param {Record<string, boolean | number | string>} [options] Options for this MidiParser instance.
     * @class
     */
    constructor(input?: number[] | ArrayBuffer | Buffer | DataBuffer | Int8Array | Int16Array | Int32Array | number | string | Uint8Array | Uint16Array | Uint32Array | undefined, options?: Record<string, boolean | number | string>);
    /** @type {number} The MIDI format: 0, 1, or 2 */
    format: number;
    /** @type {number} The internal track count. */
    trackCount: number;
    /** @type {(Header|Track)[]} */
    chunks: (Header | Track)[];
    options: {
        [x: string]: string | number | boolean;
    };
    /**
     * Parse a MIDI file from a Uint8Array.
     */
    parse(): void;
    /**
     * Initializes a new MIDI file with a header.
     * @param {number} format The MIDI file format (0, 1, or 2).
     * @param {number} trackCount The number of tracks.
     * @param {number} division The division value (e.g., ticks per quarter note).
     */
    initMidiFile(format?: number, trackCount?: number, division?: number): void;
    division: number;
    /**
     * Adds a new track to the MIDI file.
     * @returns {Track} The new track.
     */
    addTrack(): Track;
    /**
     * Adds an event to a track.
     * @param {Track} track - The track to add the event to.
     * @param {Event | Event[]} event - The event to add.
     */
    addEvent(track: Track, event: Event | Event[]): void;
    /**
     * Writes the MIDI data to a binary file.
     * @returns {DataBuffer} The binary data buffer.
     */
    saveToDataBuffer(): DataBuffer;
    /**
     * Write a chunk to the data buffer.
     * @param {DataBuffer} dataBuffer The data buffer to write to.
     * @param {Track} chunk The chunk to write.
     */
    writeChunk(dataBuffer: DataBuffer, chunk: Track): void;
    /**
     * Convert the custom format to MIDI events.
     * @param {Track} track The track to write the events to.
     * @param {Record<string, any>[]} noteData - The array of note objects.
     * @param {number} ppq The pulses per quarter note (default is 480).
     */
    convertToMidi(track: Track, noteData: Record<string, any>[], ppq?: number): void;
    /**
     * Helper function to write an event to the data buffer.
     * @param {DataBuffer} dataBuffer - The data buffer to write to.
     * @param {Event} event - The event to write.
     */
    writeEvent(dataBuffer: DataBuffer, event: Event): void;
    /**
     * Several different values in events are expressed as variable length quantities (e.g. delta time values).
     * A variable length value uses a minimum number of bytes to hold the value, and in most circumstances this leads to some degree of data compresssion.
     *
     * A variable length value uses the low order 7 bits of a byte to represent the value or part of the value.
     * The high order bit is an "escape" or "continuation" bit.
     * All but the last byte of a variable length value have the high order bit set.
     * The last byte has the high order bit cleared.
     * The bytes always appear most significant byte first.
     * @returns {number} The length of the next chunk.
     */
    readVariableLengthValues: () => number;
}
import { DataBuffer } from '@uttori/data-tools';
//# sourceMappingURL=audio-midi.d.ts.map