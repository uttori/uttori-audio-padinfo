[![view on npm](https://img.shields.io/npm/v/@uttori/audio-padinfo.svg)](https://www.npmjs.com/package/@uttori/audio-padinfo)
[![npm module downloads](https://img.shields.io/npm/dt/@uttori/audio-padinfo.svg)](https://www.npmjs.com/package/@uttori/audio-padinfo)
[![Tree-Shaking Support](https://badgen.net/bundlephobia/tree-shaking/@uttori/audio-padinfo)](https://bundlephobia.com/result?p=@uttori/audio-padinfo)
[![Dependency Count](https://badgen.net/bundlephobia/dependency-count/@uttori/audio-padinfo)](https://bundlephobia.com/result?p=@uttori/audio-padinfo)
[![Minified + GZip](https://badgen.net/bundlephobia/minzip/@uttori/audio-padinfo)](https://bundlephobia.com/result?p=@uttori/audio-padinfo)
[![Minified](https://badgen.net/bundlephobia/min/@uttori/audio-padinfo)](https://bundlephobia.com/result?p=@uttori/audio-padinfo)

# Uttori Pad Info & SP-404 Pattern Utility

Utilities to manipulate the PAD_INFO.BIN file for SP-404 / SP-404SX / SP-404A series of samplers, and to manipulate pattern files and convert between MIDI and pattern files.

## Install

```bash
npm install --save @uttori/audio-padinfo
```

* * *

# Example

```js
import fs from 'fs';
import { AudioPadInfo } from '@uttori/audio-padinfo';
const data = fs.readFileSync('./PAD_INFO.bin');
const { pads } = new AudioPadInfo(data);
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

```
import fs from 'fs';
import { AudioPattern } from '@uttori/audio-padinfo';
const bpm = 128; // Optional, does not impact MIDI structure.
const fileName = 'PTN00067.BIN';
const data = fs.readFileSync(fileName);
const audioPattern = new AudioPattern(data);
const midi = audioPattern.convertToMidi({
  bpm,
  fileName,
});
fs.writeFileSync(`${fileName}.mid`, Buffer.from(midi.saveToDataBuffer().buffer));
```

# API Reference

- [AudioPadInfo](https://github.com/uttori/uttori-audio-padinfo/blob/master/docs/audio-padinfo.md)
- [AudioPattern](https://github.com/uttori/uttori-audio-padinfo/blob/master/docs/audio-pattern.md)

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```bash
npm install
npm test
DEBUG=Uttori* npm test
```

## Contributors

- [Matthew Callis](https://github.com/MatthewCallis)

## References

Useful links for SP-404 series of samplers:

- <https://support.roland.com/hc/en-us/articles/4408578437787-SP-404MK2-Comparison-between-SP-404MK2-and-SP-404A-SX>

## Thanks

- [Paul Battley](https://github.com/threedaymonk) - His [Roland SP-404SX sample file format](https://gist.github.com/threedaymonk/701ca30e5d363caa288986ad972ab3e0) was a huge help.

## License

- [MIT](LICENSE)
