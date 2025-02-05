## Classes

<dl>
<dt><a href="#AudioPattern">AudioPattern</a> ⇐ <code>DataBuffer</code></dt>
<dd><p>AudioPattern - Roland SP-404SX / SP-404 MKii Pattern Utility
A utility to read, modify and write pattern files from a Roland SP-404SX / SP-404 MKii <code>PTN</code> files.
Can also convert patterns to MIDI or convert from MIDI to pattern.
Several values are not saved into the pattern but are configured when recording a pattern:</p>
<ul>
<li>BPM</li>
<li>Quantization Strength / Shuffle Rate</li>
<li>Quantization Grid Size</li>
<li>Metronome Volume</li>
</ul>
<p>Substep on Sequencer Mode actually generates multiple notes depending on the substep type offset by a set number of ticks, no other designation is set on the note.</p>
<p>Notes in the pattern grid will typically line up, but if the last note or a note near the end plays a sample beyond the length of the bar, there needs to be place holder notes for however long that is.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Note">Note</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PadMapping">PadMapping</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="AudioPattern"></a>

## AudioPattern ⇐ <code>DataBuffer</code>
AudioPattern - Roland SP-404SX / SP-404 MKii Pattern Utility
A utility to read, modify and write pattern files from a Roland SP-404SX / SP-404 MKii `PTN` files.
Can also convert patterns to MIDI or convert from MIDI to pattern.
Several values are not saved into the pattern but are configured when recording a pattern:
- BPM
- Quantization Strength / Shuffle Rate
- Quantization Grid Size
- Metronome Volume

Substep on Sequencer Mode actually generates multiple notes depending on the substep type offset by a set number of ticks, no other designation is set on the note.

Notes in the pattern grid will typically line up, but if the last note or a note near the end plays a sample beyond the length of the bar, there needs to be place holder notes for however long that is.

**Kind**: global class  
**Extends**: <code>DataBuffer</code>  

* [AudioPattern](#AudioPattern) ⇐ <code>DataBuffer</code>
    * [new AudioPattern([input], options)](#new_AudioPattern_new)
    * _instance_
        * [.bars](#AudioPattern+bars) : <code>number</code>
        * [.timeSignature](#AudioPattern+timeSignature) : <code>number</code>
        * [.notes](#AudioPattern+notes) : [<code>Array.&lt;Note&gt;</code>](#Note)
        * [.defaultMap](#AudioPattern+defaultMap) : <code>Record.&lt;string, PadMapping&gt;</code>
        * [.parse](#AudioPattern+parse)
        * [.toMidi](#AudioPattern+toMidi) ⇒ <code>AudioMIDI</code>
    * _static_
        * [.defaultMap](#AudioPattern.defaultMap) ⇒ <code>Record.&lt;string, PadMapping&gt;</code>
        * [.defaultMapOG](#AudioPattern.defaultMapOG) ⇒ <code>Record.&lt;string, PadMapping&gt;</code>
        * [.fromMidi(AudioMIDI, noteMap, patternPPQN, [og])](#AudioPattern.fromMidi) ⇒ <code>DataBuffer</code>

<a name="new_AudioPattern_new"></a>

### new AudioPattern([input], options)
Creates a new AudioPattern.


| Param | Type | Description |
| --- | --- | --- |
| [input] | <code>Array.&lt;number&gt;</code> \| <code>ArrayBuffer</code> \| <code>Buffer</code> \| <code>DataBuffer</code> \| <code>Int8Array</code> \| <code>Int16Array</code> \| <code>Int32Array</code> \| <code>number</code> \| <code>string</code> \| <code>Uint8Array</code> \| <code>Uint16Array</code> \| <code>Uint32Array</code> \| <code>undefined</code> | The data to process. |
| options | <code>object</code> | The options for parsing the pattern. |
| [options.bytesPerNote] | <code>number</code> | The number of bytes for each note; default is 8. |
| [options.padsPerBank] | <code>number</code> | The number of pads per bank, 12 or 16 for the MKii; default is 16. |
| [options.og] | <code>boolean</code> | When true, process for the original SP404s, when false for the MKii; default is false. |

**Example** *(AudioPattern)*  
```js
const data = fs.readFileSync('./PTN00025.BIN');
const file = new AudioPattern(data);
console.log('Notes:', file.notes);
```
<a name="AudioPattern+bars"></a>

### audioPattern.bars : <code>number</code>
The number of bars in the pattern, so 1 bar is 1.

**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  
<a name="AudioPattern+timeSignature"></a>

### audioPattern.timeSignature : <code>number</code>
The time signature of the pattern, `0` = 4/4, `1` is 3/4, `2` is 2/4, `3` = 1/4, `4` is 5/4, `5` is 6/4, `7` is 7/4.

**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  
<a name="AudioPattern+notes"></a>

### audioPattern.notes : [<code>Array.&lt;Note&gt;</code>](#Note)
**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  
<a name="AudioPattern+defaultMap"></a>

### audioPattern.defaultMap : <code>Record.&lt;string, PadMapping&gt;</code>
The default mapping of pads `A1` to `J16` to MIDI notes.

**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  
<a name="AudioPattern+parse"></a>

### audioPattern.parse
Parse the pattern into notes and extract the bar count from the footer.

**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | The options for parsing the pattern. |
| [options.bytesPerNote] | <code>number</code> | The number of bytes for each note; default is 8. |
| [options.padsPerBank] | <code>number</code> | The number of pads per bank, 12 or 16 for the MKii; default is 16. |
| [options.og] | <code>boolean</code> | When true, process for the original SP404s, when false for the MKii; default is false. |

<a name="AudioPattern+toMidi"></a>

### audioPattern.toMidi ⇒ <code>AudioMIDI</code>
Convert the parsed notes to a AudioMidi instance ready to be saved as MIDI file or manipulated further.

**Kind**: instance property of [<code>AudioPattern</code>](#AudioPattern)  
**Returns**: <code>AudioMIDI</code> - A new AudioMIDI instance populated from the pattern.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | The options |
| [options.bpm] | <code>number</code> | The BPM of the track, when undefined no tempo event will be added. |
| options.ppq | <code>number</code> | The pulses per quarter note; OG is 96, MKii is 480. |
| options.fileName | <code>string</code> | The name of the pattern file being converted, |
| options.noteMap | <code>Record.&lt;string, number&gt;</code> | A map of Pads `A1` to `J16` that correspond to which MIDI note. |

<a name="AudioPattern.defaultMap"></a>

### AudioPattern.defaultMap ⇒ <code>Record.&lt;string, PadMapping&gt;</code>
The default mapping of pads `A1` to `J16` to MIDI notes.

**Kind**: static property of [<code>AudioPattern</code>](#AudioPattern)  
**Returns**: <code>Record.&lt;string, PadMapping&gt;</code> - The default mapping of pads `A1` to `J16` to MIDI notes.  
<a name="AudioPattern.defaultMapOG"></a>

### AudioPattern.defaultMapOG ⇒ <code>Record.&lt;string, PadMapping&gt;</code>
The default mapping of pads `A1` to `J12` to MIDI notes for the OG SP404.
https://support.roland.com/hc/en-us/articles/201932129-SP-404-Playing-the-SP-404-via-MIDI

**Kind**: static property of [<code>AudioPattern</code>](#AudioPattern)  
**Returns**: <code>Record.&lt;string, PadMapping&gt;</code> - The default mapping of pads `A1` to `J16` to MIDI notes.  
<a name="AudioPattern.fromMidi"></a>

### AudioPattern.fromMidi(AudioMIDI, noteMap, patternPPQN, [og]) ⇒ <code>DataBuffer</code>
Converts a AudioMIDI structure back into a pad file format.
Pads that play all the way through will have 2 on notes, one to start the sound and one to end it.

**Kind**: static method of [<code>AudioPattern</code>](#AudioPattern)  
**Returns**: <code>DataBuffer</code> - A new DataBuffer representing the pad file.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| AudioMIDI | <code>AudioMIDI</code> |  | The AudioMIDI instance to convert back to a pad file. |
| noteMap | <code>Record.&lt;string, string&gt;</code> |  | A map of Pads `A1` to `J16` that correspond to which MIDI note |
| patternPPQN | <code>number</code> |  | The pulses per quarter note of the pattern; OG is 96, MKii is 480. |
| [og] | <code>boolean</code> | <code>false</code> | When true, process for the original SP404s, when false for the MKii; default is false. |

<a name="Note"></a>

## Note : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ticks | <code>number</code> | The delay in ticks until the next track. |
| midiNote | <code>number</code> | The MIDI note value (47-106). |
| bankSwitch | <code>number</code> | The channel offset (00=ABCDE, 01=FGHIJ). |
| pitchMode | <code>number</code> | The pitch mode of Step Sequencer notes. |
| velocity | <code>number</code> | The velocity of the note (0-127). |
| unknown3 | <code>number</code> | An unknown value, commonly 64 / 0x40. |
| length | <code>number</code> | The length of the note in ticks (2 Bytes). |
| sampleNumber | <code>number</code> | The calculated sample number based on MIDI note and bank switch. |
| padLabel | <code>string</code> | The label of the pad, constructed from the sample number and bank. |

<a name="PadMapping"></a>

## PadMapping : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| midiNote | <code>number</code> | The MIDI note numeric value. |
| pad | <code>string</code> | The human friendly pad label. |
| bankSwitch | <code>number</code> | The value for the bank switch byte. |

