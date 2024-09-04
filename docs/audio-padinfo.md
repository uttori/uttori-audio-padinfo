## Classes

<dl>
<dt><a href="#AudioPadInfo">AudioPadInfo</a></dt>
<dd><p>Uttori Pad Info - Utility to manipulate the PAD_INFO.BIN file for SP-404 series of samplers.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Pad">Pad</a> : <code>object</code></dt>
<dd><p>A Pad object.</p>
</dd>
</dl>

<a name="AudioPadInfo"></a>

## AudioPadInfo
Uttori Pad Info - Utility to manipulate the PAD_INFO.BIN file for SP-404 series of samplers.

**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| pads | [<code>Array.&lt;Pad&gt;</code>](#Pad) | Parsed Pads |


* [AudioPadInfo](#AudioPadInfo)
    * [new AudioPadInfo([input])](#new_AudioPadInfo_new)
    * _instance_
        * [.parse()](#AudioPadInfo+parse)
    * _static_
        * [.encodePad(data)](#AudioPadInfo.encodePad) ⇒ <code>Buffer</code>
        * [.checkDefault(pad, [strict])](#AudioPadInfo.checkDefault) ⇒ <code>boolean</code>
        * [.getPadLabel(index)](#AudioPadInfo.getPadLabel) ⇒ <code>string</code>
        * [.getPadIndex(label)](#AudioPadInfo.getPadIndex) ⇒ <code>number</code>

<a name="new_AudioPadInfo_new"></a>

### new AudioPadInfo([input])
Creates an instance of AudioPadInfo.


| Param | Type | Description |
| --- | --- | --- |
| [input] | <code>Array.&lt;number&gt;</code> \| <code>ArrayBuffer</code> \| <code>Buffer</code> \| <code>DataBuffer</code> \| <code>Int8Array</code> \| <code>Int16Array</code> \| <code>Int32Array</code> \| <code>number</code> \| <code>string</code> \| <code>Uint8Array</code> \| <code>Uint16Array</code> \| <code>Uint32Array</code> \| <code>undefined</code> | The data to process. |

**Example** *(AudioPadInfo)*  
```js
import fs from 'fs';
const data = fs.readFileSync('./PAD_INFO.bin');
const { pads } = new AudioPadInfo(data);
fs.writeFileSync('./output.json', JSON.stringify(pads, null, 2));
console.log('Pads:', pads);
➜ [
    {
      "avaliable": false,
      "label": "A1",
      "filename": "A0000001.WAV",
      "originalSampleStart": 512,
      "originalSampleEnd": 385388,
      "userSampleStart": 512,
      "userSampleEnd": 385388,
      "volume": 87,
      "lofi": false,
      "loop": false,
      "gate": false,
      "reverse": true,
      "format": "WAVE",
      "channels": "Stereo",
      "tempoMode": "Off",
      "originalTempo": 109.9,
      "userTempo": 109.9
    },
    ...,
  {
      "avaliable": false,
      "label": "J12",
      "filename": "J0000012.WAV",
      "originalSampleStart": 512,
      "originalSampleEnd": 53424,
      "userSampleStart": 512,
      "userSampleEnd": 53424,
      "volume": 127,
      "lofi": false,
      "loop": false,
      "gate": true,
      "reverse": false,
      "format": "WAVE",
      "channels": "Stereo",
      "tempoMode": "Off",
      "originalTempo": 100,
      "userTempo": 100
    }
  ]
```
<a name="AudioPadInfo+parse"></a>

### audioPadInfo.parse()
Parse the PAD_INFO.BIN file, decoding the supported pad info.

This is stored alongside the samples in PAD_INFO.BIN and contains 120 × 32-byte records, one for each pad from A1 to J12.
In this file, values are stored in big-endian order

**Kind**: instance method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
<a name="AudioPadInfo.encodePad"></a>

### AudioPadInfo.encodePad(data) ⇒ <code>Buffer</code>
Encode JSON values to a valid pad structure.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>Buffer</code> - - The new pad Buffer.  

| Param | Type | Description |
| --- | --- | --- |
| data | [<code>Pad</code>](#Pad) | The JSON values to encode. |

<a name="AudioPadInfo.checkDefault"></a>

### AudioPadInfo.checkDefault(pad, [strict]) ⇒ <code>boolean</code>
Checks to see if a Pad is set to the default values, if so it is likely.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>boolean</code> - - Returns true if the Pad is set the the default values, false otherwise.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| pad | [<code>Partial.&lt;Pad&gt;</code>](#Pad) |  | The JSON values to check. |
| [strict] | <code>boolean</code> | <code>false</code> | When strict all values are checked for defaults, otherwise just the offsets are checked. |

<a name="AudioPadInfo.getPadLabel"></a>

### AudioPadInfo.getPadLabel(index) ⇒ <code>string</code>
Convert a numberic value used in the PAD_INFO.bin file for that pad to the pad label like `A1` or `J12`.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>string</code> - The pad label like `A1` or `J12`.  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | The numberic value used in the PAD_INFO.bin file. |

<a name="AudioPadInfo.getPadIndex"></a>

### AudioPadInfo.getPadIndex(label) ⇒ <code>number</code>
Convert a pad label like `A1` or `J12` to the numberic value used in the PAD_INFO.bin file for that pad.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>number</code> - The numberic value used in the PAD_INFO.bin file.  

| Param | Type | Description |
| --- | --- | --- |
| label | <code>string</code> | The pad label like `A1` or `J12`. |

<a name="Pad"></a>

## Pad : <code>object</code>
A Pad object.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| avaliable | <code>boolean</code> | If the pad is actively used in the pad file or not. |
| label | <code>string</code> | The human readable pad text, `A1` - `J12`. |
| filename | <code>string</code> | The filename for the corresponding Wave File, `A0000001.WAV` - `J0000012.WAV`. |
| originalSampleStart | <code>number</code> | Sample start and end offsets are relative to the original file |
| originalSampleEnd | <code>number</code> | SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data |
| userSampleStart | <code>number</code> | The length of the RIFF headers before the data chunk is always exactly 512 bytes |
| userSampleEnd | <code>number</code> | The sample end value is the length of the file, and when converted correctly this is the length of the whole file |
| volume | <code>number</code> | Volume is between 0 and 127 |
| lofi | <code>boolean</code> \| <code>number</code> | LoFi: false off, true on |
| loop | <code>boolean</code> \| <code>number</code> | Loop: false off, true on |
| gate | <code>boolean</code> \| <code>number</code> | Gate: false off, true on |
| reverse | <code>boolean</code> \| <code>number</code> | Reverse: false off, true on |
| format | <code>string</code> | Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample |
| channels | <code>number</code> \| <code>string</code> | Mono or Stereo |
| tempoMode | <code>number</code> \| <code>string</code> | Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User' |
| originalTempo | <code>number</code> | BPM determined by the software. Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm |
| userTempo | <code>number</code> | User set BPM on the device |

