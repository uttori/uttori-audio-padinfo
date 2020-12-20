[![view on npm](https://img.shields.io/npm/v/uttori-audio-padinfo.svg)](https://www.npmjs.org/package/uttori-audio-padinfo)
[![npm module downloads](https://img.shields.io/npm/dt/uttori-audio-padinfo.svg)](https://www.npmjs.org/package/uttori-audio-padinfo)
[![Build Status](https://travis-ci.org/uttori/uttori-audio-padinfo.svg?branch=master)](https://travis-ci.org/uttori/uttori-audio-padinfo)
[![Dependency Status](https://david-dm.org/uttori/uttori-audio-padinfo.svg)](https://david-dm.org/uttori/uttori-audio-padinfo)
[![Coverage Status](https://coveralls.io/repos/github/uttori/uttori-audio-padinfo/badge.svg?branch=master)](https://coveralls.io/github/uttori/uttori-audio-padinfo?branch=master)

# Uttori Pad Info

Utility to manipulate the PAD_INFO.BIN file for SP-404 / SP-404SX / SP-404A series of samplers.

## Install

```bash
npm install --save uttori-audio-padinfo
```

* * *

# Example

```js
const AudioPadInfo = require('uttori-audio-padinfo');
const fs = require('fs');
const data = fs.readFileSync('./PAD_INFO.bin');
const { pads } = AudioPadInfo.fromFile(data);
fs.writeFileSync('./output.json', JSON.stringify(pads, null, 2));
console.log('Pads:', pads);
➜ [
    {
      "label": "A1",
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
      "label": "J12",
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

# API Reference

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
    * [new AudioPadInfo(list, [overrides])](#new_AudioPadInfo_new)
    * _instance_
        * [.parse()](#AudioPadInfo+parse)
    * _static_
        * [.fromFile(data)](#AudioPadInfo.fromFile) ⇒ [<code>AudioPadInfo</code>](#AudioPadInfo)
        * [.fromBuffer(buffer)](#AudioPadInfo.fromBuffer) ⇒ [<code>AudioPadInfo</code>](#AudioPadInfo)
        * [.encodePad(data)](#AudioPadInfo.encodePad) ⇒ <code>Buffer</code>
        * [.getPadLabel(index)](#AudioPadInfo.getPadLabel) ⇒ <code>string</code>
        * [.getPadIndex(label)](#AudioPadInfo.getPadIndex) ⇒ <code>number</code>

<a name="new_AudioPadInfo_new"></a>

### new AudioPadInfo(list, [overrides])
Creates an instance of AudioPadInfo.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| list | <code>DataBufferList</code> |  | The DataBufferList of the audio file to process. |
| [overrides] | <code>object</code> |  | Options for this instance. |
| [overrides.size] | <code>number</code> | <code>16</code> | ArrayBuffer byteLength for the underlying binary parsing. |

**Example** *(AudioPadInfo)*  
```js
const fs = require('fs');
const data = fs.readFileSync('./PAD_INFO.bin');
const { pads } = AudioPadInfo.fromFile(data);
fs.writeFileSync('./output.json', JSON.stringify(pads, null, 2));
console.log('Pads:', pads);
➜ [
    {
      "label": "A1",
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
      "label": "J12",
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
<a name="AudioPadInfo.fromFile"></a>

### AudioPadInfo.fromFile(data) ⇒ [<code>AudioPadInfo</code>](#AudioPadInfo)
Creates a new AudioPadInfo from file data.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: [<code>AudioPadInfo</code>](#AudioPadInfo) - the new AudioPadInfo instance for the provided file data  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Buffer</code> | The data of the image to process. |

<a name="AudioPadInfo.fromBuffer"></a>

### AudioPadInfo.fromBuffer(buffer) ⇒ [<code>AudioPadInfo</code>](#AudioPadInfo)
Creates a new AudioPadInfo from a DataBuffer.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: [<code>AudioPadInfo</code>](#AudioPadInfo) - the new AudioPadInfo instance for the provided DataBuffer  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>DataBuffer</code> | The DataBuffer of the image to process. |

<a name="AudioPadInfo.encodePad"></a>

### AudioPadInfo.encodePad(data) ⇒ <code>Buffer</code>
Encode JSON values to a valid pad structure.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>Buffer</code> - - The new pad Buffer.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| data | [<code>Pad</code>](#Pad) |  | The JSON values to encode. |
| [data.originalSampleStart] | <code>number</code> | <code>512</code> | Sample start and end offsets are relative to the original file. |
| [data.originalSampleEnd] | <code>number</code> | <code>512</code> | SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data. |
| [data.userSampleStart] | <code>number</code> | <code>512</code> | The length of the RIFF headers before the data chunk is always exactly 512 bytes. |
| [data.userSampleEnd] | <code>number</code> | <code>512</code> | The sample end value is the length of the file, and when converted correctly this is the length of the whole file. |
| [data.volume] | <code>number</code> | <code>127</code> | Volume is between 0 and 127. |
| [data.lofi] | <code>boolean</code> | <code>false</code> | LoFi: false off, true on |
| [data.loop] | <code>boolean</code> | <code>false</code> | Loop: false off, true on |
| [data.gate] | <code>boolean</code> | <code>true</code> | Gate: false off, true on |
| [data.reverse] | <code>boolean</code> | <code>false</code> | Reverse: false off, true on |
| [data.format] | <code>string</code> | <code>&quot;&#x27;WAVE&#x27;&quot;</code> | Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample. |
| [data.channels] | <code>number</code> | <code>2</code> | Mono or Stereo |
| [data.tempoMode] | <code>string</code> | <code>&quot;&#x27;Off&#x27;&quot;</code> | Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User' |
| [data.originalTempo] | <code>number</code> | <code>1200</code> | Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm. |
| [data.userTempo] | <code>number</code> | <code>1200</code> | SP-404SX Wave Converter v1.01 on macOS computes the original tempo as 120 / sample length. |

<a name="AudioPadInfo.getPadLabel"></a>

### AudioPadInfo.getPadLabel(index) ⇒ <code>string</code>
Convert a numberic value used in the PAD_INFO.bin file for that pad to the pad label like `A1` or `J12`.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>string</code> - - The pad label like `A1` or `J12`.  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | The numberic value used in the PAD_INFO.bin file. |

<a name="AudioPadInfo.getPadIndex"></a>

### AudioPadInfo.getPadIndex(label) ⇒ <code>number</code>
Convert a pad label like `A1` or `J12` to the numberic value used in the PAD_INFO.bin file for that pad.

**Kind**: static method of [<code>AudioPadInfo</code>](#AudioPadInfo)  
**Returns**: <code>number</code> - - The numberic value used in the PAD_INFO.bin file.  

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
| label | <code>string</code> | The human readable pad text, `A1` - `J12` |
| originalSampleStart | <code>number</code> | Sample start and end offsets are relative to the original file |
| originalSampleEnd | <code>number</code> | SP-404SX Wave Converter v1.01 on macOS sets the start values to 512, the start of data |
| userSampleStart | <code>number</code> | The length of the RIFF headers before the data chunk is always exactly 512 bytes |
| userSampleEnd | <code>number</code> | The sample end value is the length of the file, and when converted correctly this is the length of the whole file |
| volume | <code>number</code> | Volume is between 0 and 127 |
| lofi | <code>boolean</code> | LoFi: false off, true on |
| loop | <code>boolean</code> | Loop: false off, true on |
| gate | <code>boolean</code> | Gate: false off, true on |
| reverse | <code>boolean</code> | Reverse: false off, true on |
| format | <code>string</code> | Format is 0 for an 'AIFF' sample, and 1 for a 'WAVE' sample |
| channels | <code>number</code> | Mono or Stereo |
| tempoMode | <code>string</code> | Tempo Mode: 0 = 'Off', 1 = 'Pattern', 2 = 'User' |
| originalTempo | <code>number</code> | BPM determined by the software. Tempo is BPM (beats per minute) mutiplied by 10, 0x4B0 = 1200 = 120 bpm |
| userTempo | <code>number</code> | User set BPM on the device |


* * *

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```bash
npm install
npm test
DEBUG=Uttori* npm test
```

## Contributors

* [Matthew Callis](https://github.com/MatthewCallis)
* [You](https://github.com/YOU)

## License

* [MIT](LICENSE)
