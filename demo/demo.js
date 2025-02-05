import AudioMIDI from '@uttori/audio-midi';
import AudioPattern from '../src/audio-pattern.js';

const makeDetail = (key, value, keyClass = '', valueClass = '') => {
  const detail = document.createElement('div');
  detail.className ='detail';
  const keyNode = document.createElement('div');
  keyNode.className = `key ${keyClass}`;
  keyNode.textContent = key;
  const valueNode = document.createElement('div');
  valueNode.className = `value ${valueClass}`;
  valueNode.textContent = value;
  detail.append(keyNode);
  detail.append(valueNode);
  return detail;
};

const makeInputText = (key, defaultValue = '', dataKey, data) => {
  const detail = document.createElement('div');
  detail.className ='detail form-group';

  const label = document.createElement('span');
  label.className = `key`;
  label.textContent = key;

  const value = document.createElement('div');
  value.className ='value';

  const input = document.createElement('input');
  input.className = `form-field`;
  input.type = 'text'
  input.name = key;
  input.value = defaultValue;

  if (dataKey && data) {
    input.addEventListener('change', (event) => {
      data[dataKey] = event.target.value;
      console.log('data', data);
    });
  }

  value.append(input);

  detail.append(label);
  detail.append(value);

  return detail;
};

const makeInputSelect = (key, defaultValue = '', options = [], dataKey, data) => {
  const detail = document.createElement('div');
  detail.className ='detail form-group';

  const label = document.createElement('span');
  label.className = `key`;
  label.textContent = key;

  const value = document.createElement('div');
  value.className ='value';

  const select = document.createElement('select');
  select.className = `form-field`;
  select.name = key;
  select.value = defaultValue;

  for (const option of options) {
    const input = document.createElement('option');
    input.label = option.label;
    input.value = option.value;
    select.append(input);
  }

  if (dataKey && data) {
    select.addEventListener('change', (event) => {
      data[dataKey] = event.target.value;
      console.log('data', data);
    });
  }

  value.append(select);

  detail.append(label);
  detail.append(value);

  return detail;
};

const renderToMidiForm = (file, buffer) => {
  const chunkNode = document.createElement('div');
  chunkNode.className ='chunk';

  //  Basic Info
  const options = {
    bpm: 120,
    ppq: 480,
  };
  chunkNode.append(makeDetail('Conver Pattern to MIDI', ''));
  chunkNode.append(makeInputText('File', file.name));
  chunkNode.append(makeInputText('BPM', '120', 'bpm', options));
  chunkNode.append(makeInputSelect('PPQN', '480', [{ label: '480 (MKii)', value: '480' }, { label: '96 (OG)', value: '96' }], 'ppq', options));

  const audioPattern = new AudioPattern(event.target.result, { bytesPerNote: 8, padsPerBank: 16, og: false });
  const usedPads = audioPattern.getUsedPads();

  const userMapping = {};
  renderToMidiFormNotePadMapping(usedPads, chunkNode, userMapping);

  const button = document.createElement('button');
  button.textContent = 'Convert';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('userMapping', userMapping);
    console.log('options', options);

    const midiOut = audioPattern.toMidi({
      bpm: 108,
      ppq: 480,
      fileName: file.name,
      noteMap: userMapping,
    });
    console.log('patternDataBuffer', midiOut);

    const blob = new Blob([new Uint8Array(midiOut.saveToDataBuffer().buffer)], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.textContent = 'Download MIDI';
    a.href = URL.createObjectURL(blob);
    a.setAttribute("download", `${file.name}.mid`);
    chunkNode.appendChild(a);
  });

  chunkNode.append(button);

  document.querySelector('.chunk-list')?.append(chunkNode);
};

const renderToPatternForm = (file, buffer) => {
  const chunkNode = document.createElement('div');
  chunkNode.className ='chunk';

  // {
  //   '36': 'C1',
  //   '37': 'C2',
  //   '38': 'C3',
  //   '39': 'C4',
  //   '40': 'C5',
  //   '41': 'C6',
  //   '42': 'C7',
  //   '43': 'C8',
  // }, 480

  //  Basic Info
  chunkNode.append(makeDetail('Conver MIDI to Pattern', ''));
  chunkNode.append(makeInputText('File', file.name));
  chunkNode.append(makeInputSelect('PPQN', '480', [{ label: '480 (MKii)', value: '480' }, { label: '96 (OG)', value: '96' }]));

  // Parse the MIDI
  const midi = new AudioMIDI(event.target.result);
  midi.parse();

  console.log('Validate:', midi.validate());
  const usedNotes = midi.getUsedNotes();
  console.log('Used Notes:', usedNotes);

  const userMapping = {};
  renderToPatternFormNotePadMapping(usedNotes, chunkNode, userMapping);

  const button = document.createElement('button');
  button.textContent = 'Convert';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('userMapping', userMapping);
    const patternDataBuffer = AudioPattern.fromMidi(midi, userMapping, 480);
    console.log('patternDataBuffer', patternDataBuffer);

    const blob = new Blob([new Uint8Array(patternDataBuffer.buffer)], {type: "application/octet-stream" });
    const a = document.createElement("a");
    a.textContent = 'Download';
    a.href = URL.createObjectURL(blob);
    a.setAttribute("download", `${file.name}.BIN`);
    chunkNode.appendChild(a);
  });

  chunkNode.append(button);

  document.querySelector('.chunk-list')?.append(chunkNode);
};

const renderToPatternFormNotePadMapping = (usedNotes, chunkNode, userMapping) => {
  const defaultMapKeys = Object.keys(AudioPattern.defaultMap);

  usedNotes.forEach(({ noteNumber, noteString }) => {
    const row = document.createElement('div');
    row.className = 'detail form-group';

    const label = document.createElement('span');
    label.className = 'key';
    label.textContent = `Map ${noteString} (${noteNumber}) to:`;
    row.appendChild(label);

    // The <select> for picking which pad this note maps to
    const select = document.createElement('select');
    select.name = noteNumber;
    select.className = `form-field`;

    // Add an initial blank "choose a pad" option if desired
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = 'Choose Pad';
    select.appendChild(blankOption);

    // Populate all possible pad keys
    defaultMapKeys.forEach((padKey) => {
      const option = document.createElement('option');
      option.value = padKey;
      option.textContent = padKey;
      select.appendChild(option);
    });

    // Whenever the user picks a pad, store it in `userMapping`
    select.addEventListener('change', (event) => {
      userMapping[noteNumber] = event.target.value;
    });

    row.appendChild(select);
    chunkNode.appendChild(row);
  });
};

const renderToMidiFormNotePadMapping = (usedPads, chunkNode, userMapping) => {
  usedPads.forEach((pad) => {
    const row = document.createElement('div');
    row.className = 'detail form-group';

    const label = document.createElement('span');
    label.className = 'key';
    label.textContent = `Map ${pad} to:`;
    row.appendChild(label);

    // The <select> for picking which pad this note maps to
    const select = document.createElement('select');
    select.name = pad;
    select.className = `form-field`;

    // Add an initial blank "choose a pad" option if desired
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = 'Choose Pad';
    select.appendChild(blankOption);

    // Populate all possible pad keys
    for (let i = 0; i < 128; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      const noteLabel = AudioMIDI.midiToNote(i); // e.g. "C4"
      option.textContent = `${noteLabel} (${i})`;
      select.appendChild(option);
    }
    select.value = `${AudioPattern.defaultMap[pad].midiNote}`;

    // Whenever the user picks a pad, store it in `userMapping`
    select.addEventListener('change', (event) => {
      if (event?.target?.value) {
        userMapping[pad] = Number.parseInt(event.target.value, 10);
      }
    });

    row.appendChild(select);
    chunkNode.appendChild(row);
    select.dispatchEvent(new Event('change'));
  });
};

document.querySelector('#midi-file')?.addEventListener('change', (e) => {
  const { files } = e.target;
  if (!files || files.length < 1) {
      return;
  }
  const [file] = files;
  console.log('File:', file);
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    if (event?.target?.result) {
      renderToPatternForm(file, event.target.result);
    }
  });
  reader.readAsArrayBuffer(file);
});


document.querySelector('#pattern-file')?.addEventListener('change', (e) => {
  const { files } = e.target;
  if (!files || files.length < 1) {
      return;
  }
  const [file] = files;
  console.log('File:', file);
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    if (event?.target?.result) {
      renderToMidiForm(file, event.target.result);
    }
  });
  reader.readAsArrayBuffer(file);
});
