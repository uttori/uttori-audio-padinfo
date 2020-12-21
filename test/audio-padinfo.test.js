const fs = require('fs');
const test = require('ava');
const { DataBuffer, DataBufferList } = require('@uttori/data-tools');
const { AudioPadInfo } = require('../src');

test('constructor(list, options): can initialize', (t) => {
  const data = fs.readFileSync('./test/assets/PAD_INFO.BIN');
  const buffer = new DataBuffer(data);
  const list = new DataBufferList();
  list.append(buffer);

  let audio;
  t.notThrows(() => {
    audio = new AudioPadInfo(list, { size: data.length });
  });
  t.is(audio.pads.length, 120);
});

test('AudioWAV.fromFile(data): can read a valid file', (t) => {
  const data = fs.readFileSync('./test/assets/PAD_INFO.BIN');
  t.notThrows(() => {
    AudioPadInfo.fromFile(data);
  });
});

test('AudioWAV.fromBuffer(buffer): can read a valid file buffer', (t) => {
  const data = fs.readFileSync('./test/assets/PAD_INFO.BIN');
  const buffer = new DataBuffer(data);
  t.notThrows(() => {
    AudioPadInfo.fromBuffer(buffer);
  });
});

test('.parse(): can decode all entires in a PAD_INFO.BIN file', (t) => {
  const data = fs.readFileSync('./test/assets/PAD_INFO.BIN');
  const { pads } = AudioPadInfo.fromFile(data);
  t.is(pads.length, 120);
  t.deepEqual(pads[0], {
    avaliable: false,
    channels: 'Stereo',
    format: 'WAVE',
    gate: false,
    label: 'A1',
    lofi: false,
    loop: false,
    originalSampleEnd: 385388,
    originalSampleStart: 512,
    originalTempo: 109.9,
    reverse: true,
    tempoMode: 'Off',
    userSampleEnd: 385388,
    userSampleStart: 512,
    userTempo: 109.9,
    volume: 87,
  });
  t.deepEqual(pads[119], {
    avaliable: false,
    channels: 'Stereo',
    format: 'WAVE',
    gate: true,
    label: 'J12',
    lofi: false,
    loop: false,
    originalSampleEnd: 53424,
    originalSampleStart: 512,
    originalTempo: 100,
    reverse: false,
    tempoMode: 'Off',
    userSampleEnd: 53424,
    userSampleStart: 512,
    userTempo: 100,
    volume: 127,
  });
});

test('.parse(): can decode an invalid entry (all 0xFF)', (t) => {
  const data = fs.readFileSync('./test/assets/BAD_PAD.BIN');
  const { pads } = AudioPadInfo.fromFile(data);
  t.is(pads.length, 1);
  t.deepEqual(pads[0], {
    avaliable: false,
    channels: 'Invalid (255)',
    format: 'Invalid (255)',
    gate: 255,
    label: 'A1',
    lofi: 255,
    loop: 255,
    originalSampleEnd: 4294967295,
    originalSampleStart: 4294967295,
    originalTempo: 429496729.5,
    reverse: 255,
    tempoMode: 'Invalid',
    userSampleEnd: 4294967295,
    userSampleStart: 4294967295,
    userTempo: 429496729.5,
    volume: 255,
  });
});

test('.parse(): can decode edge cases, incompatible flags', (t) => {
  const data = fs.readFileSync('./test/assets/OPTIONS_A.BIN');
  const { pads } = AudioPadInfo.fromFile(data);
  t.is(pads.length, 1);
  t.deepEqual(pads[0], {
    avaliable: false,
    channels: 'Mono',
    format: 'AIFF',
    gate: true,
    label: 'A1',
    lofi: true,
    loop: true,
    originalSampleEnd: 385388,
    originalSampleStart: 512,
    originalTempo: 109.9,
    reverse: true,
    tempoMode: 'Pattern',
    userSampleEnd: 385388,
    userSampleStart: 512,
    userTempo: 109.9,
    volume: 87,
  });
});

test('.parse(): can decode edge cases, ivalid volume flags', (t) => {
  const data = fs.readFileSync('./test/assets/OPTIONS_B.BIN');
  const { pads } = AudioPadInfo.fromFile(data);
  t.is(pads.length, 1);
  t.deepEqual(pads[0], {
    avaliable: false,
    channels: 'Mono',
    format: 'AIFF',
    gate: true,
    label: 'A1',
    lofi: true,
    loop: true,
    originalSampleEnd: 385388,
    originalSampleStart: 512,
    originalTempo: 109.9,
    reverse: true,
    tempoMode: 'User',
    userSampleEnd: 385388,
    userSampleStart: 512,
    userTempo: 109.9,
    volume: 255,
  });
});

test('AudioWAV.encodePad(data): can encode a default PAD_INFO.BIN pad', (t) => {
  const valid = fs.readFileSync('./test/assets/PAD_DEFAULTS.BIN');
  const data = {
    originalSampleStart: 512,
    originalSampleEnd: 512,
    userSampleStart: 512,
    userSampleEnd: 512,
    volume: 127,
    lofi: false,
    loop: false,
    gate: true,
    reverse: false,
    format: 'WAVE',
    channels: 2,
    tempoMode: 'Off',
    originalTempo: 120,
    userTempo: 120,
  };
  let pad = AudioPadInfo.encodePad(data);
  t.deepEqual(pad, valid);
  pad = AudioPadInfo.encodePad();
  t.deepEqual(pad, valid);

  // Lo-Fi
  pad = AudioPadInfo.encodePad({ lofi: true });
  t.true(AudioPadInfo.fromFile(pad).pads[0].lofi);
  pad = AudioPadInfo.encodePad({ lofi: false });
  t.false(AudioPadInfo.fromFile(pad).pads[0].lofi);

  // Loop
  pad = AudioPadInfo.encodePad({ loop: true });
  t.true(AudioPadInfo.fromFile(pad).pads[0].loop);
  pad = AudioPadInfo.encodePad({ loop: false });
  t.false(AudioPadInfo.fromFile(pad).pads[0].loop);

  // Gate
  pad = AudioPadInfo.encodePad({ gate: true });
  t.true(AudioPadInfo.fromFile(pad).pads[0].gate);
  pad = AudioPadInfo.encodePad({ gate: false });
  t.false(AudioPadInfo.fromFile(pad).pads[0].gate);

  // Reverse
  pad = AudioPadInfo.encodePad({ reverse: true });
  t.true(AudioPadInfo.fromFile(pad).pads[0].reverse);
  pad = AudioPadInfo.encodePad({ reverse: false });
  t.false(AudioPadInfo.fromFile(pad).pads[0].reverse);

  // Format
  pad = AudioPadInfo.encodePad({ format: 'AIFF' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].format, 'AIFF');
  pad = AudioPadInfo.encodePad({ format: 'WAVE' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].format, 'WAVE');

  // Channels
  pad = AudioPadInfo.encodePad({ channels: 'Stereo' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].channels, 'Stereo');
  pad = AudioPadInfo.encodePad({ channels: 2 });
  t.is(AudioPadInfo.fromFile(pad).pads[0].channels, 'Stereo');
  pad = AudioPadInfo.encodePad({ channels: 'Mono' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].channels, 'Mono');
  pad = AudioPadInfo.encodePad({ channels: 1 });
  t.is(AudioPadInfo.fromFile(pad).pads[0].channels, 'Mono');

  // Tempo Mode
  pad = AudioPadInfo.encodePad({ tempoMode: 'User' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'User');
  pad = AudioPadInfo.encodePad({ tempoMode: 2 });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'User');
  pad = AudioPadInfo.encodePad({ tempoMode: 'Pattern' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'Pattern');
  pad = AudioPadInfo.encodePad({ tempoMode: 1 });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'Pattern');
  pad = AudioPadInfo.encodePad({ tempoMode: 'Off' });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'Off');
  pad = AudioPadInfo.encodePad({ tempoMode: 0 });
  t.is(AudioPadInfo.fromFile(pad).pads[0].tempoMode, 'Off');
});

test('AudioWAV.encodePad(data): throws an error with invalid volumes', (t) => {
  t.throws(() => {
    AudioPadInfo.encodePad({ volume: -1 });
  }, { message: 'Volume is invalid, -1 should be an integer between 0 and 127.' });
  t.throws(() => {
    AudioPadInfo.encodePad({ volume: 255 });
  }, { message: 'Volume is invalid, 255 should be an integer between 0 and 127.' });
  t.throws(() => {
    AudioPadInfo.encodePad({ volume: '127' });
  }, { message: 'Volume is invalid, 127 should be an integer between 0 and 127.' });
});

test('AudioWAV.encodePad(data): throws an error with invalid channels', (t) => {
  t.throws(() => {
    AudioPadInfo.encodePad({ channels: -1 });
  }, { message: 'Channels is invalid, -1 should be an integer between 1 and 2.' });
  t.throws(() => {
    AudioPadInfo.encodePad({ channels: 5.1 });
  }, { message: 'Channels is invalid, 5.1 should be an integer between 1 and 2.' });
  t.throws(() => {
    AudioPadInfo.encodePad({ channels: 'mono' });
  }, { message: 'Channels is invalid, mono should be an integer between 1 and 2.' });
});

test('AudioWAV.encodePad(data): throws an error with invalid tempoMode', (t) => {
  t.throws(() => {
    AudioPadInfo.encodePad({ tempoMode: -1 });
  }, { message: 'Tempo Mode is invalid, -1 should be one of \'Off\', \'Pattern\', or \'User\'.' });
});

test('AudioWAV.encodePad(data): can encode the same way as the OEM software', (t) => {
  let valid = fs.readFileSync('./test/assets/PAD_A1.BIN');
  let data = {
    originalSampleStart: 512,
    originalSampleEnd: 385388,
    userSampleStart: 512,
    userSampleEnd: 385388,
    volume: 87,
    lofi: false,
    loop: false,
    gate: false,
    reverse: true,
    format: 'WAVE',
    channels: 'Stereo',
    tempoMode: 'Off',
    originalTempo: 109.9,
    userTempo: 109.9,
  };
  let pad = AudioPadInfo.encodePad(data);
  t.deepEqual(pad, valid);

  valid = fs.readFileSync('./test/assets/PAD_J12.BIN');
  data = {
    originalSampleStart: 512,
    originalSampleEnd: 53424,
    userSampleStart: 512,
    userSampleEnd: 53424,
    volume: 127,
    lofi: false,
    loop: false,
    gate: true,
    reverse: false,
    format: 'WAVE',
    channels: 'Stereo',
    tempoMode: 'Off',
    originalTempo: 100,
    userTempo: 100,
  };
  pad = AudioPadInfo.encodePad(data);
  t.deepEqual(pad, valid);
});

test('AudioPadInfo.getPadLabel(index): returns a pad label or empty string', (t) => {
  t.is(AudioPadInfo.getPadLabel(0), 'A1');
  t.is(AudioPadInfo.getPadLabel(119), 'J12');
  t.is(AudioPadInfo.getPadLabel(), '');

  for (let i = 0; i < 120; i++) {
    t.true(AudioPadInfo.getPadLabel(i).length >= 2);
  }
});

test('AudioPadInfo.getPadIndex(label): returns a pad index or -1', (t) => {
  t.is(AudioPadInfo.getPadIndex('A1'), 0);
  t.is(AudioPadInfo.getPadIndex('j12'), 119);
  t.is(AudioPadInfo.getPadIndex(), -1);

  for (let i = 0; i < 120; i++) {
    t.true(AudioPadInfo.getPadIndex(AudioPadInfo.getPadLabel(i)) < 120);
    t.true(AudioPadInfo.getPadIndex(AudioPadInfo.getPadLabel(i)) > -1);
  }
});

test('AudioPadInfo.checkDefault(pad): returns the booelan value of the default status', (t) => {
  const data = {
    originalSampleStart: 512,
    originalSampleEnd: 512,
    userSampleStart: 512,
    userSampleEnd: 512,
    volume: 127,
    lofi: false,
    loop: false,
    gate: true,
    reverse: false,
    format: 'WAVE',
    channels: 2,
    tempoMode: 'Off',
    originalTempo: 120,
    userTempo: 120,
  };
  t.true(AudioPadInfo.checkDefault(data));
  t.true(AudioPadInfo.checkDefault(data, true));

  // Not matching defaults
  t.false(AudioPadInfo.checkDefault());
  t.false(AudioPadInfo.checkDefault({ ...data, originalSampleStart: 0 }));

  // Not Strict vs Strict
  t.true(AudioPadInfo.checkDefault({ ...data, format: 'AIFF' }));
  t.false(AudioPadInfo.checkDefault({ ...data, format: 'AIFF' }, true));
});
