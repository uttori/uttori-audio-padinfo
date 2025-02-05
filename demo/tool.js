class UnderflowError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnderflowError';
    this.stack = (new Error(message)).stack;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const float48 = (uint8) => {
  let mantissa = 0;
  let exponent = uint8[0];
  if (exponent === 0) {
    return 0;
  }
  exponent = uint8[0] - 0x81;
  for (let i = 1; i <= 4; i++) {
    mantissa += uint8[i];
    mantissa /= 256;
  }
  mantissa += (uint8[5] & 0x7F);
  mantissa /= 128;
  mantissa += 1;
  if (uint8[5] & 0x80) {
    mantissa = -mantissa;
  }
  const output = mantissa * (2 ** exponent);
  return Number.parseFloat(output.toFixed(4));
};
const float80 = (uint8) => {
  const uint32 = new Uint32Array(uint8.buffer, uint8.byteOffset, uint8.byteLength / 4);
  const [high, low] = [...uint32];
  const a0 = uint8[9];
  const a1 = uint8[8];
  const sign = 1 - ((a0 >>> 7) * 2);
  let exponent = ((a0 & 0x7F) << 8) | a1;
  if ((exponent === 0) && (low === 0) && (high === 0)) {
    return 0;
  }
  if (exponent === 0x7FFF) {
    if ((low === 0) && (high === 0)) {
      return sign * Number.POSITIVE_INFINITY;
    }
    return Number.NaN;
  }
  exponent -= 0x3FFF;
  let out = low * 2 ** (exponent - 31);
  out += high * 2 ** (exponent - 63);
  return sign * out;
};

let debug$4 = (..._) => {};
class DataBuffer {
  constructor(input) {
    this.writing = false;
    this.data = [];
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      this.data = Buffer.from(input);
    } else if (typeof input === 'string') {
      this.data = Buffer.from(input);
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (Array.isArray(input)) {
      this.data = new Uint8Array(input);
    } else if (typeof input === 'number') {
      this.data = new Uint8Array(input);
    } else if (input instanceof DataBuffer) {
      this.data = input.data;
    } else if (input && input.buffer && input.buffer instanceof ArrayBuffer) {
      this.data = new Uint8Array(input.buffer, input.byteOffset, input.length * input.BYTES_PER_ELEMENT);
    } else if (typeof input === 'undefined') {
      this.writing = true;
      this.data = new Uint8Array();
    } else {
      const error = `Unknown type of input for DataBuffer: ${typeof input}`;
      throw new TypeError(error);
    }
    this.lengthInBytes = this.data.length;
    this.next = null;
    this.prev = null;
    this.nativeEndian = new Uint16Array(new Uint8Array([0x12, 0x34]).buffer)[0] === 0x3412;
    this.offset = 0;
    this.buffer = [...this.data];
  }
  static allocate(size) {
    return new DataBuffer(size);
  }
  get length() {
    return this.data.length;
  }
  compare(input, offset = 0) {
    const buffer = new DataBuffer(input);
    const { length } = buffer;
    if (!length) {
      return false;
    }
    const local = this.slice(offset, length);
    const { data } = buffer;
    for (let i = 0; i < length; i++) {
      if (local.data[i] !== data[i]) {
        return false;
      }
    }
    return true;
  }
  copy() {
    return new DataBuffer(new Uint8Array(this.data.slice(0)));
  }
  slice(position, length = this.length) {
    if ((position === 0) && (length >= this.length)) {
      return new DataBuffer(this.data);
    }
    return new DataBuffer(this.data.slice(position, position + length));
  }
  remainingBytes() {
    return this.length - this.offset;
  }
  available(bytes) {
    return this.writing || bytes <= this.remainingBytes();
  }
  availableAt(bytes, offset) {
    return this.writing || bytes <= this.length - offset;
  }
  advance(bytes) {
    if (!this.available(bytes)) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} <= ${this.remainingBytes()}`);
    }
    this.offset += bytes;
    debug$4('advance: offset', this.offset);
  }
  rewind(bytes) {
    if (bytes > this.offset) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} > ${this.offset}`);
    }
    this.offset -= bytes;
    debug$4('rewind: offset', this.offset);
  }
  seek(position) {
    debug$4(`seek: from ${this.offset} to ${position}`);
    if (position > this.offset) {
      this.advance(position - this.offset);
    }
    if (position < this.offset) {
      this.rewind(this.offset - position);
    }
    debug$4(`seek: offset is ${this.offset}`);
  }
  readUInt8() {
    if (!this.available(1)) {
      throw new UnderflowError('Insufficient Bytes: 1');
    }
    const output = this.data[this.offset];
    this.offset += 1;
    return output;
  }
  peekUInt8(offset = 0) {
    if (!this.availableAt(1, offset)) {
      throw new UnderflowError(`Insufficient Bytes: ${offset} + 1`);
    }
    return this.data[offset];
  }
  read(bytes, littleEndian = false) {
    const uint8 = new Uint8Array(bytes);
    if (littleEndian) {
      for (let i = bytes - 1; i >= 0; i--) {
        uint8[i] = this.readUInt8();
      }
    } else {
      for (let i = 0; i < bytes; i++) {
        uint8[i] = this.readUInt8();
      }
    }
    return uint8;
  }
  peek(bytes, offset = 0, littleEndian = false) {
    const uint8 = new Uint8Array(bytes);
    if (littleEndian) {
      for (let i = 0; i < bytes; i++) {
        uint8[bytes - i - 1] = this.peekUInt8(offset + i);
      }
    } else {
      for (let i = 0; i < bytes; i++) {
        uint8[i] = this.peekUInt8(offset + i);
      }
    }
    return uint8;
  }
  peekBit(position, length = 1, offset = 0) {
    if (Number.isNaN(position) || !Number.isInteger(position) || position < 0 || position > 7) {
      throw new Error(`peekBit position is invalid: ${position}, must be an Integer between 0 and 7`);
    }
    if (Number.isNaN(length) || !Number.isInteger(length) || length < 1 || length > 8) {
      throw new Error(`peekBit length is invalid: ${length}, must be an Integer between 1 and 8`);
    }
    const value = this.peekUInt8(offset);
    return ((value << position) & 0xFF) >>> (8 - length);
  }
  readInt8() {
    const uint8 = this.read(1);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt8(0);
  }
  peekInt8(offset = 0) {
    const uint8 = this.peek(1, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt8(0);
  }
  readUInt16(littleEndian) {
    const uint8 = this.read(2);
    const view = new DataView(uint8.buffer, 0);
    return view.getUint16(0, littleEndian);
  }
  peekUInt16(offset = 0, littleEndian = false) {
    const uint8 = this.peek(2, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getUint16(0, littleEndian);
  }
  readInt16(littleEndian = false) {
    const uint8 = this.read(2);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt16(0, littleEndian);
  }
  peekInt16(offset = 0, littleEndian = false) {
    const uint8 = this.peek(2, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt16(0, littleEndian);
  }
  readUInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readUInt8() << 16);
    }
    return (this.readUInt16() << 8) + this.readUInt8();
  }
  peekUInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekUInt8(offset + 2) << 16);
    }
    return (this.peekUInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readInt8() << 16);
    }
    return (this.readInt16() << 8) + this.readUInt8();
  }
  peekInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekInt8(offset + 2) << 16);
    }
    return (this.peekInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readUInt32(littleEndian = false) {
    const uint8 = this.read(4);
    const view = new DataView(uint8.buffer, 0);
    return view.getUint32(0, littleEndian);
  }
  peekUInt32(offset = 0, littleEndian = false) {
    const uint8 = this.peek(4, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getUint32(0, littleEndian);
  }
  readInt32(littleEndian = false) {
    const uint8 = this.read(4);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt32(0, littleEndian);
  }
  peekInt32(offset = 0, littleEndian = false) {
    const uint8 = this.peek(4, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getInt32(0, littleEndian);
  }
  readFloat32(littleEndian = false) {
    const uint8 = this.read(4);
    const view = new DataView(uint8.buffer, 0);
    return view.getFloat32(0, littleEndian);
  }
  peekFloat32(offset = 0, littleEndian = false) {
    const uint8 = this.peek(4, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getFloat32(0, littleEndian);
  }
  readFloat48(littleEndian = false) {
    const uint8 = this.read(6, littleEndian || this.nativeEndian);
    return float48(uint8);
  }
  peekFloat48(offset = 0, littleEndian = false) {
    const uint8 = this.peek(6, offset, littleEndian || this.nativeEndian);
    return float48(uint8);
  }
  readFloat64(littleEndian = false) {
    const uint8 = this.read(8);
    const view = new DataView(uint8.buffer, 0);
    return view.getFloat64(0, littleEndian);
  }
  peekFloat64(offset = 0, littleEndian = false) {
    const uint8 = this.peek(8, offset);
    const view = new DataView(uint8.buffer, 0);
    return view.getFloat64(0, littleEndian);
  }
  readFloat80(littleEndian = this.nativeEndian) {
    const uint8 = this.read(10, littleEndian);
    return float80(uint8);
  }
  peekFloat80(offset = 0, littleEndian = this.nativeEndian) {
    const uint8 = this.peek(10, offset, littleEndian);
    return float80(uint8);
  }
  readBuffer(length) {
    const to = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      to[i] = this.readUInt8();
    }
    return new DataBuffer(to);
  }
  peekBuffer(offset, length) {
    const to = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      to[i] = this.peekUInt8(offset + i);
    }
    return new DataBuffer(to);
  }
  readString(length, encoding = 'ascii') {
    return this.decodeString(this.offset, length, encoding, true);
  }
  peekString(offset, length, encoding = 'ascii') {
    return this.decodeString(offset, length, encoding, false);
  }
  decodeString(offset, length, encoding, advance) {
    encoding = encoding.toLowerCase();
    const nullEnd = length === null ? 0 : -1;
    if (!length) {
      length = this.remainingBytes();
    }
    const end = offset + length;
    let result = '';
    switch (encoding) {
      case 'ascii':
      case 'latin1': {
        while (offset < end) {
          const character = this.peekUInt8(offset++);
          if (character === nullEnd) {
            break;
          }
          result += String.fromCharCode(character);
        }
        break;
      }
      case 'utf8':
      case 'utf-8': {
        while (offset < end) {
          const b1 = this.peekUInt8(offset++);
          if (b1 === nullEnd) {
            break;
          }
          let b2;
          let b3;
          if ((b1 & 0x80) === 0) {
            result += String.fromCharCode(b1);
          } else if ((b1 & 0xE0) === 0xC0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            result += String.fromCharCode(((b1 & 0x1F) << 6) | b2);
          } else if ((b1 & 0xF0) === 0xE0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            b3 = this.peekUInt8(offset++) & 0x3F;
            result += String.fromCharCode(((b1 & 0x0F) << 12) | (b2 << 6) | b3);
          } else if ((b1 & 0xF8) === 0xF0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            b3 = this.peekUInt8(offset++) & 0x3F;
            const b4 = this.peekUInt8(offset++) & 0x3F;
            const pt = (((b1 & 0x0F) << 18) | (b2 << 12) | (b3 << 6) | b4) - 0x10000;
            result += String.fromCharCode(0xD800 + (pt >> 10), 0xDC00 + (pt & 0x3FF));
          }
        }
        break;
      }
      case 'utf16-be':
      case 'utf16be':
      case 'utf16le':
      case 'utf16-le':
      case 'utf16bom':
      case 'utf16-bom': {
        let littleEndian;
        switch (encoding) {
          case 'utf16be':
          case 'utf16-be': {
            littleEndian = false;
            break;
          }
          case 'utf16le':
          case 'utf16-le': {
            littleEndian = true;
            break;
          }
          case 'utf16bom':
          case 'utf16-bom':
          default: {
            const bom = this.peekUInt16(offset);
            if ((length < 2) || (bom === nullEnd)) {
              if (advance) {
                this.advance(offset += 2);
              }
              return result;
            }
            littleEndian = bom === 0xFFFE;
            offset += 2;
            break;
          }
        }
        let w1;
        while ((offset < end) && ((w1 = this.peekUInt16(offset, littleEndian)) !== nullEnd)) {
          offset += 2;
          if ((w1 < 0xD800) || (w1 > 0xDFFF)) {
            result += String.fromCharCode(w1);
          } else {
            const w2 = this.peekUInt16(offset, littleEndian);
            if ((w2 < 0xDC00) || (w2 > 0xDFFF)) {
              throw new Error('Invalid utf16 sequence.');
            }
            result += String.fromCharCode(w1, w2);
            offset += 2;
          }
        }
        if (w1 === nullEnd) {
          offset += 2;
        }
        break;
      }
      default: {
        throw new Error(`Unknown Encoding: ${encoding}`);
      }
    }
    if (advance) {
      this.advance(length);
    }
    return result;
  }
  reset() {
    this.offset = 0;
  }
  writeUInt8(data, offset = this.offset, advance = true) {
    this.buffer[offset] = data;
    if (advance) {
      this.offset++;
    }
  }
  writeUInt16(data, offset = this.offset, advance = true, littleEndian = false) {
    if (littleEndian) {
      this.buffer[offset]     =  data & 0xFF;
      this.buffer[offset + 1] = (data & 0xFF00) >> 8;
    } else {
      this.buffer[offset]     = (data & 0xFF00) >> 8;
      this.buffer[offset + 1] =  data & 0xFF;
    }
    if (advance) {
      this.offset += 2;
    }
  }
  writeUInt24(data, offset = this.offset, advance = true, littleEndian = false) {
    if (littleEndian) {
      this.buffer[offset]     =  data & 0x0000FF;
      this.buffer[offset + 1] = (data & 0x00FF00) >> 8;
      this.buffer[offset + 2] = (data & 0xFF0000) >> 16;
    } else {
      this.buffer[offset]     = (data & 0xFF0000) >> 16;
      this.buffer[offset + 1] = (data & 0x00FF00) >> 8;
      this.buffer[offset + 2] =  data & 0x0000FF;
    }
    if (advance) {
      this.offset += 3;
    }
  }
  writeUInt32(data, offset = this.offset, advance = true, littleEndian = false) {
    if (littleEndian) {
      this.buffer[offset]     =  data & 0x000000FF;
      this.buffer[offset + 1] = (data & 0x0000FF00) >> 8;
      this.buffer[offset + 2] = (data & 0x00FF0000) >> 16;
      this.buffer[offset + 3] = (data & 0xFF000000) >> 24;
    } else {
      this.buffer[offset]     = (data & 0xFF000000) >> 24;
      this.buffer[offset + 1] = (data & 0x00FF0000) >> 16;
      this.buffer[offset + 2] = (data & 0x0000FF00) >> 8;
      this.buffer[offset + 3] =  data & 0x000000FF;
    }
    if (advance) {
      this.offset += 4;
    }
  }
  writeBytes(data, offset = this.offset, advance = true) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[offset + i] = data[i];
    }
    if (advance) {
      this.offset += data.length;
    }
  }
  writeString(string, offset = this.offset, encoding = 'ascii', advance = true) {
    const data = [];
    switch (encoding) {
      case 'ascii':
      case 'latin1': {
        for (let i = 0; i < string.length; i++) {
          data.push(string.charCodeAt(i) & 0xFF);
        }
        break;
      }
      case 'utf8':
      case 'utf-8': {
        for (let i = 0; i < string.length; i++) {
          let charcode = string.charCodeAt(i);
          if (charcode < 0x80) {
            data.push(charcode);
          } else if (charcode < 0x800) {
            data.push(
              0xC0 | (charcode >> 6),
              0x80 | (charcode & 0x3F),
            );
          } else if (charcode < 0xD800 || charcode >= 0xE000) {
            data.push(
              0xE0 | (charcode >> 12),
              0x80 | ((charcode >> 6) & 0x3F),
              0x80 | (charcode & 0x3F),
            );
          } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
            data.push(
              0xF0 | (charcode >> 18),
              0x80 | ((charcode >> 12) & 0x3F),
              0x80 | ((charcode >> 6) & 0x3F),
              0x80 | (charcode & 0x3F),
            );
          }
        }
        break;
      }
      case 'utf16be':
      case 'utf16le':
      case 'utf16bom': {
        const littleEndian = encoding === 'utf16le';
        for (let i = 0; i < string.length; i++) {
          const charcode = string.charCodeAt(i);
          if (littleEndian) {
            data.push(charcode & 0xFF, charcode / 256 >>> 0);
          } else {
            data.push(charcode / 256 >>> 0, charcode & 0xFF);
          }
        }
        break;
      }
      default: {
        throw new Error(`Unknown Encoding: ${encoding}`);
      }
    }
    this.writeBytes(data, offset, advance);
  }
  commit() {
    this.data = new Uint8Array(this.buffer);
    this.writing = false;
  }
}

let debug$3 = (..._) => {};
class DataBufferList {
  constructor(buffers) {
    this.first = null;
    this.last = null;
    this.totalBuffers = 0;
    this.availableBytes = 0;
    this.availableBuffers = 0;
    if (buffers && Array.isArray(buffers)) {
      for (const buffer of buffers) {
        this.append(buffer);
      }
    }
  }
  copy() {
    const result = new DataBufferList();
    result.first = this.first;
    result.last = this.last;
    result.totalBuffers = this.totalBuffers;
    result.availableBytes = this.availableBytes;
    result.availableBuffers = this.availableBuffers;
    return result;
  }
  append(buffer) {
    buffer.prev = this.last;
    if (this.last) {
      this.last.next = buffer;
    }
    this.last = buffer;
    if (this.first == null) {
      this.first = buffer;
    }
    this.availableBytes += buffer.length;
    this.availableBuffers++;
    this.totalBuffers++;
    debug$3('append:', this.totalBuffers);
    return this.totalBuffers;
  }
  moreAvailable() {
    if (this.first && this.first.next != null) {
      return true;
    }
    return false;
  }
  advance() {
    if (this.first) {
      this.availableBytes -= this.first.length;
      this.availableBuffers--;
    }
    if (this.first && this.first.next) {
      this.first = this.first.next;
      return true;
    }
    this.first = null;
    return false;
  }
  rewind() {
    if (this.first && !this.first.prev) {
      return false;
    }
    this.first = this.first ? this.first.prev : this.last;
    if (this.first) {
      this.availableBytes += this.first.length;
      this.availableBuffers++;
    }
    return (this.first != null);
  }
  reset() {
    while (this.rewind()) {
      continue;
    }
  }
}

let debug$2 = (..._) => {};
class DataStream {
  constructor(list, options = {}) {
    options.size = options.size || 16;
    if (options && options.size % 8 !== 0) {
      options.size += (8 - (options.size % 8));
    }
    this.size = options.size;
    this.buf = new ArrayBuffer(this.size);
    this.uint8 = new Uint8Array(this.buf);
    this.int8 = new Int8Array(this.buf);
    this.uint16 = new Uint16Array(this.buf);
    this.int16 = new Int16Array(this.buf);
    this.uint32 = new Uint32Array(this.buf);
    this.int32 = new Int32Array(this.buf);
    this.float32 = new Float32Array(this.buf);
    this.float64 = new Float64Array(this.buf);
    this.int64 = new BigInt64Array(this.buf);
    this.uint64 = new BigUint64Array(this.buf);
    this.nativeEndian = new Uint16Array(new Uint8Array([0x12, 0x34]).buffer)[0] === 0x3412;
    this.list = list;
    this.localOffset = 0;
    this.offset = 0;
  }
  static fromData(data) {
    const buffer = new DataBuffer(data);
    const list = new DataBufferList();
    list.append(buffer);
    return new DataStream(list, { size: buffer.length });
  }
  static fromBuffer(buffer) {
    const list = new DataBufferList();
    list.append(buffer);
    return new DataStream(list, { size: buffer.length });
  }
  compare(input, offset = 0) {
    if (!input || !input.list || !input.list.availableBytes) {
      return false;
    }
    let { availableBytes } = input.list;
    if (offset) {
      availableBytes -= offset;
      this.seek(offset);
      input.seek(offset);
    }
    let local;
    let external;
    for (let i = 0; i < availableBytes; i++) {
      local = this.readUInt8();
      external = input.readUInt8();
      if (local !== external) {
        return false;
      }
    }
    return true;
  }
  next(input) {
    if (!input || typeof input.length !== 'number' || input.length === 0) {
      return false;
    }
    if (!this.available(input.length)) {
      debug$2(`Insufficient Bytes: ${input.length} <= ${this.remainingBytes()}`);
      return false;
    }
    debug$2('next: this.offset =', this.offset);
    for (let i = 0; i < input.length; i++) {
      const data = this.peekUInt8(this.offset + i);
      if (input[i] !== data) {
        debug$2('next: first failed match at', i, ', where:', input[i], '!==', data);
        return false;
      }
    }
    return true;
  }
  copy() {
    const result = new DataStream(this.list.copy(), { size: this.size });
    result.localOffset = this.localOffset;
    result.offset = this.offset;
    return result;
  }
  available(bytes) {
    return bytes <= this.remainingBytes();
  }
  availableAt(bytes, offset) {
    return bytes <= this.list.availableBytes - offset;
  }
  remainingBytes() {
    return this.list.availableBytes - this.localOffset;
  }
  advance(bytes) {
    if (!this.available(bytes)) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} <= ${this.remainingBytes()}`);
    }
    this.localOffset += bytes;
    this.offset += bytes;
    while (this.list.first && (this.localOffset >= this.list.first.length) && this.list.moreAvailable()) {
      this.localOffset -= this.list.first.length;
      this.list.advance();
    }
    return this;
  }
  rewind(bytes) {
    if (bytes > this.offset) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} > ${this.offset}`);
    }
    this.localOffset -= bytes;
    this.offset -= bytes;
    while (this.list.first.prev && (this.localOffset < 0)) {
      this.list.rewind();
      this.localOffset += this.list.first.length;
    }
    return this;
  }
  seek(position) {
    if (position > this.offset) {
      return this.advance(position - this.offset);
    }
    if (position < this.offset) {
      return this.rewind(this.offset - position);
    }
    return this;
  }
  readUInt8() {
    if (!this.available(1)) {
      throw new UnderflowError('Insufficient Bytes: 1');
    }
    const output = this.list.first.data[this.localOffset];
    this.localOffset += 1;
    this.offset += 1;
    if (this.localOffset === this.list.first.length) {
      this.localOffset = 0;
      this.list.advance();
    }
    return output;
  }
  peekUInt8(offset = 0) {
    if (!this.availableAt(1, offset)) {
      throw new UnderflowError(`Insufficient Bytes: ${offset} + 1`);
    }
    let buffer = this.list.first;
    while (buffer) {
      if (buffer.length > offset) {
        return buffer.data[offset];
      }
      offset -= buffer.length;
      buffer = buffer.next;
    }
    return 0;
  }
  read(bytes, littleEndian = false) {
    if (littleEndian === this.nativeEndian) {
      for (let i = 0; i < bytes; i++) {
        this.uint8[i] = this.readUInt8();
      }
    } else {
      for (let i = bytes - 1; i >= 0; i--) {
        this.uint8[i] = this.readUInt8();
      }
    }
    return this.uint8.slice(0, bytes);
  }
  peek(bytes, offset = 0, littleEndian = false) {
    if (littleEndian === this.nativeEndian) {
      for (let i = 0; i < bytes; i++) {
        this.uint8[i] = this.peekUInt8(offset + i);
      }
    } else {
      for (let i = 0; i < bytes; i++) {
        this.uint8[bytes - i - 1] = this.peekUInt8(offset + i);
      }
    }
    return this.uint8.slice(0, bytes);
  }
  peekBit(position, length = 1, offset = 0) {
    if (Number.isNaN(position) || !Number.isInteger(position) || position < 0 || position > 7) {
      throw new Error(`peekBit position is invalid: ${position}, must be an Integer between 0 and 7`);
    }
    if (Number.isNaN(length) || !Number.isInteger(length) || length < 1 || length > 8) {
      throw new Error(`peekBit length is invalid: ${length}, must be an Integer between 1 and 8`);
    }
    const value = this.peekUInt8(offset);
    return ((value << position) & 0xFF) >>> (8 - length);
  }
  readInt8() {
    this.read(1);
    return this.int8[0];
  }
  peekInt8(offset = 0) {
    this.peek(1, offset);
    return this.int8[0];
  }
  readUInt16(littleEndian) {
    this.read(2, littleEndian);
    return this.uint16[0];
  }
  peekUInt16(offset = 0, littleEndian = false) {
    this.peek(2, offset, littleEndian);
    return this.uint16[0];
  }
  readInt16(littleEndian = false) {
    this.read(2, littleEndian);
    return this.int16[0];
  }
  peekInt16(offset = 0, littleEndian = false) {
    this.peek(2, offset, littleEndian);
    return this.int16[0];
  }
  readUInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readUInt8() << 16);
    }
    return (this.readUInt16() << 8) + this.readUInt8();
  }
  peekUInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekUInt8(offset + 2) << 16);
    }
    return (this.peekUInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readInt8() << 16);
    }
    return (this.readInt16() << 8) + this.readUInt8();
  }
  peekInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekInt8(offset + 2) << 16);
    }
    return (this.peekInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readUInt32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.uint32[0];
  }
  peekUInt32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.uint32[0];
  }
  readInt32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.int32[0];
  }
  peekInt32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.int32[0];
  }
  readFloat32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.float32[0];
  }
  peekFloat32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.float32[0];
  }
  readFloat48(littleEndian = false) {
    this.read(6, littleEndian);
    return float48(this.uint8);
  }
  peekFloat48(offset = 0, littleEndian = false) {
    this.peek(6, offset, littleEndian);
    return float48(this.uint8);
  }
  readFloat64(littleEndian = false) {
    this.read(8, littleEndian);
    return this.float64[0];
  }
  peekFloat64(offset = 0, littleEndian = false) {
    this.peek(8, offset, littleEndian);
    return this.float64[0];
  }
  readFloat80(littleEndian = false) {
    this.read(10, littleEndian);
    return float80(this.uint8);
  }
  peekFloat80(offset = 0, littleEndian = false) {
    this.peek(10, offset, littleEndian);
    return float80(this.uint8);
  }
  readBuffer(length) {
    const to = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      to[i] = this.readUInt8();
    }
    return new DataBuffer(to);
  }
  peekBuffer(offset, length) {
    const to = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      to[i] = this.peekUInt8(offset + i);
    }
    return new DataBuffer(to);
  }
  readSingleBuffer(length) {
    const result = this.list.first.slice(this.localOffset, length);
    this.advance(result.length);
    return result;
  }
  peekSingleBuffer(offset, length) {
    return this.list.first.slice(this.localOffset + offset, length);
  }
  readString(length, encoding = 'ascii') {
    return this.decodeString(this.offset, length, encoding, true);
  }
  peekString(offset, length, encoding = 'ascii') {
    return this.decodeString(offset, length, encoding, false);
  }
  decodeString(offset, length, encoding, advance) {
    encoding = encoding.toLowerCase();
    const nullEnd = length === null ? 0 : -1;
    if (!length) {
      length = this.remainingBytes();
    }
    const end = offset + length;
    let result = '';
    switch (encoding) {
      case 'ascii':
      case 'latin1': {
        while (offset < end) {
          const char = this.peekUInt8(offset++);
          if (char === nullEnd) {
            break;
          }
          result += String.fromCharCode(char);
        }
        break;
      }
      case 'utf8':
      case 'utf-8': {
        while (offset < end) {
          const b1 = this.peekUInt8(offset++);
          if (b1 === nullEnd) {
            break;
          }
          let b2;
          let b3;
          if ((b1 & 0x80) === 0) {
            result += String.fromCharCode(b1);
          } else if ((b1 & 0xE0) === 0xC0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            result += String.fromCharCode(((b1 & 0x1F) << 6) | b2);
          } else if ((b1 & 0xF0) === 0xE0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            b3 = this.peekUInt8(offset++) & 0x3F;
            result += String.fromCharCode(((b1 & 0x0F) << 12) | (b2 << 6) | b3);
          } else if ((b1 & 0xF8) === 0xF0) {
            b2 = this.peekUInt8(offset++) & 0x3F;
            b3 = this.peekUInt8(offset++) & 0x3F;
            const b4 = this.peekUInt8(offset++) & 0x3F;
            const pt = (((b1 & 0x0F) << 18) | (b2 << 12) | (b3 << 6) | b4) - 0x10000;
            result += String.fromCharCode(0xD800 + (pt >> 10), 0xDC00 + (pt & 0x3FF));
          }
        }
        break;
      }
      case 'utf16-be':
      case 'utf16be':
      case 'utf16le':
      case 'utf16-le':
      case 'utf16bom':
      case 'utf16-bom': {
        let littleEndian;
        switch (encoding) {
          case 'utf16be':
          case 'utf16-be': {
            littleEndian = false;
            break;
          }
          case 'utf16le':
          case 'utf16-le': {
            littleEndian = true;
            break;
          }
          case 'utf16bom':
          case 'utf16-bom':
          default: {
            const bom = this.peekUInt16(offset);
            if ((length < 2) || (bom === nullEnd)) {
              if (advance) {
                this.advance(offset += 2);
              }
              return result;
            }
            littleEndian = bom === 0xFFFE;
            offset += 2;
            break;
          }
        }
        let w1;
        while ((offset < end) && ((w1 = this.peekUInt16(offset, littleEndian)) !== nullEnd)) {
          offset += 2;
          if ((w1 < 0xD800) || (w1 > 0xDFFF)) {
            result += String.fromCharCode(w1);
          } else {
            const w2 = this.peekUInt16(offset, littleEndian);
            if ((w2 < 0xDC00) || (w2 > 0xDFFF)) {
              throw new Error('Invalid utf16 sequence.');
            }
            result += String.fromCharCode(w1, w2);
            offset += 2;
          }
        }
        if (w1 === nullEnd) {
          offset += 2;
        }
        break;
      }
      default: {
        throw new Error(`Unknown encoding: ${encoding}`);
      }
    }
    if (advance) {
      this.advance(length);
    }
    return result;
  }
  reset() {
    this.localOffset = 0;
    this.offset = 0;
  }
}

let debug$1 = (..._) => {console.log(_);};
class AudioMIDI extends DataBuffer {
  constructor(input, options = {}) {
    super(input);
    this.format = options.format ?? 0;
    this.trackCount = 0;
    this.timeDivision = options.timeDivision ?? 480;
    this.chunks = [];
    this.options = {
      ...options,
    };
  }
  readVariableLengthValues = () => {
    let value = 0;
    let byte;
    do {
      byte = this.readUInt8();
      value = (value << 7) + (byte & 0x7F);
    } while (byte & 0x80 && this.remainingBytes() > 0);
    return value;
  };
  parse() {
    debug$1('parse');
    const chunk = this.read(14);
    const header = AudioMIDI.decodeHeader(chunk);
    this.format = header.format;
    this.trackCount = header.trackCount;
    this.timeDivision = header.timeDivision;
    const activeNotes = new Map();
    let currentTime = 0;
    debug$1(`parse: Reading ${header.trackCount} Tracks`);
    for (let t = 0; t < header.trackCount; t++) {
      debug$1('parse: Reading Track:', t);
      if (this.remainingBytes() === 0) {
        debug$1(`parse: No more data to read, but ony read ${t} of ${header.trackCount} expected tracks.`);
        break;
      }
      const track = {
        type: this.readString(4),
        chunkLength: this.readUInt32(),
        events: [],
      };
      if (track.type !== 'MTrk') {
        debug$1('parse: Invalid Track Header:', track.type);
        break;
      }
      let laststatusByte;
      while (this.remainingBytes() > 0) {
        const event = {};
        event.deltaTime = this.readVariableLengthValues();
        currentTime += event.deltaTime;
        let eventType = this.readUInt8();
        if (eventType >= 0x80) {
          laststatusByte = eventType;
        } else {
          eventType = laststatusByte;
          this.rewind(1);
        }
        switch (eventType) {
          case 0xF0: {
            const manufacturerId = this.readUInt8();
            const manufacturerLabel = AudioMIDI.getManufacturerLabel(manufacturerId);
            const data = [];
            let byte = this.readUInt8();
            while (byte !== 0xF7) {
              data.push(byte);
              byte = this.readUInt8();
            }
            event.data = {
              manufacturerId,
              manufacturerLabel,
              data,
            };
            break;
          }
          case 0xF2: {
            const msb = this.readUInt8();
            const lsb = this.readUInt8();
            event.data = { msb, lsb };
            event.label = 'Song Position Pointer';
            break;
          }
          case 0xF3: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Common Messages - Song Select';
            break;
          }
          case 0xF4: {
            debug$1('⚠️ System Real Time Messages - Undefined 0xF4 (Reserved)');
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Undefined 0xF4 (Reserved)';
            break;
          }
          case 0xF5: {
            debug$1('⚠️ System Real Time Messages - Undefined 0xF5 (Reserved)');
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Undefined 0xF5 (Reserved)';
            break;
          }
          case 0xF6: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Common Messages - Tune Request';
            break;
          }
          case 0xF7: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Common Messages - EOX';
            break;
          }
          case 0xF8: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - MIDI Clock';
            break;
          }
          case 0xF9: {
            debug$1('⚠️ System Real Time Messages - Undefined 0xF9 (Reserved)');
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Undefined 0xF9 (Reserved)';
            break;
          }
          case 0xFA: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Start';
            break;
          }
          case 0xFB: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Continue';
            break;
          }
          case 0xFC: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Stop';
            break;
          }
          case 0xFD: {
            debug$1('⚠️ System Real Time Messages - Undefined 0xFD (Reserved)');
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Undefined 0xFD (Reserved)';
            break;
          }
          case 0xFE: {
            const length = this.readVariableLengthValues();
            event.data = this.read(length);
            event.label = 'System Real Time Messages - Active Sensing';
            break;
          }
          case 0xFF: {
            event.type = 0xFF;
            event.metaType = this.readUInt8();
            event.metaEventLength = this.readVariableLengthValues();
            switch (event.metaType) {
              case 0x00: {
                let sequenceNumber;
                let type;
                if (event.metaEventLength === 2) {
                  const byte1 = this.readUInt8();
                  const byte2 = this.readUInt8();
                  sequenceNumber = (byte1 << 8) + byte2;
                  type = 'Provided';
                } else {
                  debug$1('parse: Sequence Number has an invalid length:', event.metaEventLength, this.offset.toString(16));
                  this.advance(1);
                  sequenceNumber = this.trackCount || 0;
                  type = 'Next Track Index';
                }
                event.data = {
                  sequenceNumber,
                  type,
                };
                event.label = 'Sequence Number';
                break;
              }
              case 0x01: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Text Event';
                break;
              }
              case 0x02: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Copyright Notice';
                break;
              }
              case 0x03: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Sequence / Track Name';
                break;
              }
              case 0x04: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Instrument Name';
                break;
              }
              case 0x05: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Lyrics';
                break;
              }
              case 0x06: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Marker';
                break;
              }
              case 0x07: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Cue Point';
                break;
              }
              case 0x08: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Program Name';
                break;
              }
              case 0x09: {
                event.data = this.readString(event.metaEventLength);
                event.label = 'Device (Port) Name';
                break;
              }
              case 0x20: {
                event.data = this.readUInt8();
                event.label = 'Channel Prefix';
                break;
              }
              case 0x21: {
                event.data = this.readUInt8();
                event.label = 'MIDI Port';
                break;
              }
              case 0x2F: {
                if (event.metaEventLength !== 0) {
                  debug$1('parse: End of Track has an invalid length:', event.metaEventLength, this.offset.toString(16));
                }
                event.data = '';
                event.label = 'End of Track';
                break;
              }
              case 0x4B: {
                const tag = this.readUInt8();
                let tagLabel = '';
                switch (tag) {
                  case 0x01: tagLabel = 'Genre'; break;
                  case 0x02: tagLabel = 'Artist'; break;
                  case 0x03: tagLabel = 'Composer'; break;
                  case 0x04: tagLabel = 'Duration (seconds)'; break;
                  case 0x05: tagLabel = 'BPM (Tempo)'; break;
                  default: tagLabel = `Unknown Tag: ${event.tag}`;
                }
                const tagValue = event.data = this.read(event.metaEventLength);
                event.data = {
                  tag,
                  tagLabel,
                  tagValue,
                };
                event.label = 'M-Live Tag';
                break;
              }
              case 0x51: {
                if (event.metaEventLength !== 3) {
                  debug$1('parse: Tempo has an invalid length:', event.metaEventLength);
                  event.data = this.read(event.metaEventLength);
                  break;
                }
                const byte1 = this.readUInt8();
                const byte2 = this.readUInt8();
                const byte3 = this.readUInt8();
                const tempo = (byte1 << 16) + (byte2 << 8) + byte3;
                const bpm = Math.round(60000000 / tempo);
                event.data = {
                  byte1,
                  byte2,
                  byte3,
                  tempo,
                  bpm,
                };
                event.label = 'Set Tempo';
                break;
              }
              case 0x54: {
                const hourByte = this.readUInt8();
                const minute = this.readUInt8();
                const second = this.readUInt8();
                const frame = this.readUInt8();
                const subFrame = this.readUInt8();
                const frameRateBits = (hourByte >> 5) & 0x03;
                const frameRates = {
                  0: 24,
                  1: 25,
                  2: 29.97,
                  3: 30,
                };
                const frameRate = frameRates[frameRateBits] || `Unknown Frame Rate: ${frameRateBits}`;
                const hour = hourByte & 0x1F;
                event.data = {
                  hourByte,
                  hour,
                  minute,
                  second,
                  frame,
                  subFrame,
                  frameRate,
                };
                event.label = 'SMPTE Offset';
                break;
              }
              case 0x58: {
                event.data = {
                  numerator: this.readUInt8(),
                  denominator: this.readUInt8(),
                  metronome: this.readUInt8(),
                  thirtySecondNotes: this.readUInt8(),
                };
                event.label = 'Time Signature';
                break;
              }
              case 0x59: {
                if (event.metaEventLength !== 2) {
                  debug$1('parse: Key Signature has an invalid length:', event.metaEventLength);
                  event.data = this.read(event.metaEventLength);
                  break;
                }
                const keySignature = this.readUInt8();
                const majorOrMinor = this.readUInt8();
                const keys = {
                  '-7': 'C♭',
                  '-6': 'G♭',
                  '-5': 'D♭',
                  '-4': 'A♭',
                  '-3': 'E♭',
                  '-2': 'B♭',
                  '-1': 'F',
                  0: 'C',
                  1: 'G',
                  2: 'D',
                  3: 'A',
                  4: 'E',
                  5: 'B',
                  6: 'F♯',
                  7: 'C♯',
                };
                event.data = {
                  keySignature,
                  majorOrMinor,
                  keyName: keys[`${keySignature}`] || 'Unknown Key',
                  mode: majorOrMinor === 0 ? 'Major' : 'Minor',
                };
                event.label = 'Key Signature';
                break;
              }
              case 0x7F: {
                debug$1('Sequencer Specific is unimplemented');
                event.data = this.read(event.metaEventLength);
                event.label = 'Sequencer Specific';
                break;
              }
              default: {
                debug$1('Unimplemented 0xFF Meta Event', event.metaType.toString(16).toUpperCase(), this.offset.toString(16).toUpperCase());
                event.data = this.read(event.metaEventLength);
              }
            }
            break;
          }
          default: {
            event.type = eventType;
            event.channel = eventType & 0x0F;
            const type = (eventType >> 4) & 0x0F;
            switch (type) {
              case 0x8: {
                const note = this.readUInt8();
                const velocity = this.readUInt8();
                if (activeNotes.has(note)) {
                  const noteOnData = activeNotes.get(note);
                  const noteLength = currentTime - noteOnData.startTime;
                  noteOnData.noteOnEvent.data.length = noteLength;
                  event.data = {
                    note: `${note}`,
                    velocity,
                    length: noteLength,
                  };
                  activeNotes.delete(note);
                } else {
                  event.data = {
                    note: `${note}`,
                    velocity,
                    length: 0,
                  };
                  debug$1('Missing Note On Event for:', note);
                }
                event.label = 'Note Off';
                break;
              }
              case 0x9: {
                const note = this.readUInt8();
                const velocity = this.readUInt8();
                event.data = {
                  note,
                  velocity,
                };
                event.label = 'Note On';
                activeNotes.set(note, { startTime: currentTime, velocity, noteOnEvent: event });
                break;
              }
              case 0xA: {
                event.data = {
                  note: this.readUInt8(),
                  velocity: this.readUInt8(),
                };
                event.label = 'Note Aftertouch';
                break;
              }
              case 0xB: {
                const controller = this.readUInt8();
                const value = this.readUInt8();
                event.data = {
                  controller,
                  value,
                  label: AudioMIDI.getControllerLabel(controller),
                };
                event.label = 'Controller';
                break;
              }
              case 0xC: {
                event.data = this.readUInt8();
                event.label = 'Program Change';
                break;
              }
              case 0xD: {
                event.data = this.readUInt8();
                event.label = 'Channel Aftertouch';
                break;
              }
              case 0xE: {
                const firstByte = this.readUInt8();
                const secondByte = this.readUInt8();
                const pitchValue = (secondByte << 7) + firstByte;
                event.data = {
                  pitchValue,
                  firstByte,
                  secondByte,
                };
                event.label = 'Pitch Bend Event';
                break;
              }
              case 0xF: {
                debug$1('Unimplemented 0xFx Exclusive Events:', event.type.toString(16));
                const length = this.readVariableLengthValues();
                event.data = this.read(length);
                break;
              }
              default: {
                debug$1('Unknown Exclusive Events:', event.type);
                break;
              }
            }
          }
        }
        track.events.push(event);
      }
      debug$1('Track Events:', track.events.length);
      this.chunks.push(track);
    }
    debug$1('Chunks:', this.chunks);
  }
  addTrack() {
    const track = {
      type: 'MTrk',
      chunkLength: 0,
      events: [],
    };
    this.chunks.push(track);
    return track;
  }
  addEvent(track, event) {
    if (Array.isArray(event)) {
      track.events = [...track.events, ...event];
    } else {
      track.events.push(event);
    }
  }
  saveToDataBuffer() {
    debug$1('saveToDataBuffer: chunks', this.chunks.length);
    const dataBuffer = new DataBuffer();
    dataBuffer.writeString('MThd');
    dataBuffer.writeUInt32(6);
    dataBuffer.writeUInt16(this.format);
    dataBuffer.writeUInt16(this.trackCount);
    dataBuffer.writeUInt16(this.timeDivision);
    for (const chunk of this.chunks) {
      this.writeChunk(dataBuffer, chunk);
    }
    dataBuffer.commit();
    return dataBuffer;
  }
  writeChunk(dataBuffer, chunk) {
    if (chunk.type === 'MTrk') {
      dataBuffer.writeString('MTrk');
      const chunkLengthPosition = dataBuffer.offset;
      dataBuffer.writeUInt32(0);
      const startPosition = dataBuffer.offset;
      chunk.events.forEach((event) => {
        this.writeEvent(dataBuffer, event);
      });
      const endPosition = dataBuffer.offset;
      const chunkLength = endPosition - startPosition;
      debug$1('writeChunk: track size', chunkLength);
      dataBuffer.seek(chunkLengthPosition);
      dataBuffer.writeUInt32(chunkLength);
      chunk.chunkLength = chunkLength;
      dataBuffer.seek(endPosition);
    } else {
      debug$1('skipping unknown chunk type:', chunk.type);
    }
  }
  writeEvent(dataBuffer, event) {
    const { type, deltaTime, metaType, metaEventLength, data, channel } = event;
    const statusByte = channel !== undefined ? (type | (channel & 0x0F)) : type;
    if (!statusByte) {
      throw new Error(`Invalid status byte ${statusByte} for event: ${JSON.stringify(event)}`);
    }
    if (deltaTime === undefined) {
      throw new Error(`Invalid delta time ${deltaTime} for event: ${JSON.stringify(event)}`);
    }
    AudioMIDI.writeVariableLengthValue(dataBuffer, deltaTime);
    dataBuffer.writeUInt8(statusByte);
    switch (type) {
      case 0x80:
      case 0x90:
      case 0xA0: {
        if (typeof data !== 'object' || !('note' in data) || data.note === undefined) {
          throw new Error(`Invalid note value`);
        }
        if (typeof data !== 'object' || !('velocity' in data) || data.velocity === undefined) {
          throw new Error(`Invalid velocity / pressure value`);
        }
        AudioMIDI.writeEventData(dataBuffer, [data.note, data.velocity]);
        break;
      }
      case 0xB0: {
        if (!data.controllerNumber || !data.value) {
          throw new Error(`Invalid controller number or value: ${JSON.stringify(data)}`);
        }
        AudioMIDI.writeEventData(dataBuffer, [data.controllerNumber, data.value]);
        break;
      }
      case 0xC0: {
        if (!data.programNumber) {
          throw new Error(`Invalid programNumber ${data.programNumber} for event ${JSON.stringify(data)}`);
        }
        AudioMIDI.writeEventData(dataBuffer, [data.programNumber]);
        break;
      }
      case 0xD0: {
        if (!data.pressureAmount) {
          throw new Error(`Invalid pressureAmount ${data.pressureAmount} for event ${JSON.stringify(data)}`);
        }
        AudioMIDI.writeEventData(dataBuffer, [data.pressureAmount]);
        break;
      }
      case 0xE0: {
        const { lsb, msb } = data;
        if (!data.lsb || !data.msb) {
          throw new Error(`Invalid lsb ${lsb} or msb ${msb} for event ${JSON.stringify(data)}`);
        }
        AudioMIDI.writeEventData(dataBuffer, [lsb, msb]);
        break;
      }
      case 0xF0: {
        if (typeof data !== 'object' || !('manufacturerId' in data) || !data.manufacturerId || !('data' in data) || !data.data) {
          throw new Error(`Invalid manufacturerId ${data.manufacturerId} or data ${data.data} for event ${JSON.stringify(data)}`);
        }
        dataBuffer.writeUInt8(data.manufacturerId);
        AudioMIDI.writeEventData(dataBuffer, data.data);
        dataBuffer.writeUInt8(0xF7);
        break;
      }
      case 0xF3: {
        if (!data.songNumber) {
          throw new Error(`Invalid songNumber ${data.songNumber} for event ${JSON.stringify(data)}`);
        }
        AudioMIDI.writeEventData(dataBuffer, [data.songNumber]);
        break;
      }
      case 0xF6: {
        break;
      }
      case 0xF7: {
        break;
      }
      case 0xF8:
      case 0xFA:
      case 0xFB:
      case 0xFC:
      case 0xFE: {
        break;
      }
      case 0xFF: {
        dataBuffer.writeUInt8(metaType);
        AudioMIDI.writeVariableLengthValue(dataBuffer, metaEventLength);
        switch (metaType) {
          case 0x00: {
            if (!data.sequenceNumber) {
              throw new Error(`Invalid sequenceNumber ${data.sequenceNumber} for event ${JSON.stringify(data)}`);
            }
            AudioMIDI.writeEventData(dataBuffer, [data.sequenceNumber >> 8, data.sequenceNumber & 0xFF]);
            break;
          }
          case 0x01:
          case 0x02:
          case 0x03:
          case 0x04:
          case 0x05:
          case 0x06:
          case 0x07:
          case 0x08:
          case 0x09: {
            if (!data) {
              throw new Error(`Invalid text data ${data} for event ${JSON.stringify(data)}`);
            }
            AudioMIDI.writeEventData(dataBuffer, data);
            break;
          }
          case 0x20:
          case 0x21: {
            if (!data) {
              throw new Error(`Invalid data ${data} for event ${JSON.stringify(data)}`);
            }
            dataBuffer.writeUInt8(data);
            break;
          }
          case 0x2F: {
            break;
          }
          case 0x51: {
            if (!data) {
              throw new Error(`Invalid data ${data} for event ${JSON.stringify(data)}`);
            }
            const { byte1, byte2, byte3 } = data;
            AudioMIDI.writeEventData(dataBuffer, [byte1, byte2, byte3]);
            break;
          }
          case 0x54: {
            if (!data) {
              throw new Error(`Invalid data ${data} for event ${JSON.stringify(data)}`);
            }
            const { hourByte, minute, second, frame, subFrame } = data;
            AudioMIDI.writeEventData(dataBuffer, [hourByte, minute, second, frame, subFrame]);
            break;
          }
          case 0x58: {
            const { numerator, denominator, metronome, thirtySecondNotes } = data;
            if (!numerator || !denominator || !metronome || !thirtySecondNotes) {
              throw new Error(`Invalid numerator ${numerator} or denominator ${denominator} or metronome ${metronome} or thirtySecondNotes ${thirtySecondNotes} for event ${JSON.stringify(data)}`);
            }
            AudioMIDI.writeEventData(dataBuffer, [numerator, denominator, metronome, thirtySecondNotes]);
            break;
          }
          case 0x59: {
            const { keySignature, majorOrMinor } = data;
            if (!keySignature || !majorOrMinor) {
              throw new Error(`Invalid data ${keySignature} or majorOrMino ${majorOrMinor} for event ${JSON.stringify(data)}`);
            }
            AudioMIDI.writeEventData(dataBuffer, [keySignature, majorOrMinor]);
            break;
          }
          case 0x7F: {
            if (!data) {
              throw new Error(`Invalid data ${data} for event ${JSON.stringify(data)}`);
            }
            AudioMIDI.writeEventData(dataBuffer, data);
            break;
          }
          default: {
            console.error(`Unhandled Meta Event Type: ${metaType.toString(16).toUpperCase()}`);
            break;
          }
        }
        break;
      }
      default: {
        console.error(`Unhandled Event Type: ${type.toString(16).toUpperCase()}`);
        break;
      }
    }
  }
  getUsedNotes() {
    debug$1('getUsedNotes');
    const noteNumbers = new Set();
    for (const track of this.chunks) {
      const noteEvents = track.events.filter((event) => event?.type === 0x90);
      for (const event of noteEvents) {
        if (event?.data?.velocity > 0) {
          const noteNumber = typeof event.data.note === 'string'
            ? parseInt(event.data.note, 10)
            : event.data.note;
          if (!Number.isNaN(noteNumber)) {
            noteNumbers.add(noteNumber);
          }
        }
      }
    }
    debug$1('getUsedNotes: noteNumbers', noteNumbers);
    const sortedNoteNumbers = [...noteNumbers].sort((a, b) => a - b);
    debug$1('getUsedNotes: sortedNoteNumbers', sortedNoteNumbers);
    return sortedNoteNumbers.map((noteNumber) => ({
      noteNumber,
      noteString: AudioMIDI.midiToNote(noteNumber),
    }));
  }
  validate() {
    const issues = [];
    if (this.format < 0 || this.format > 2) {
      issues.push(`Unsupported MIDI format: ${this.format}.`);
    }
    if (this.trackCount !== this.chunks.length) {
      issues.push(`Header trackCount=${this.trackCount}, but parsed chunk count=${this.chunks.length}.`);
    }
    this.chunks.forEach((track, trackIndex) => {
      if (track.type !== 'MThd' && track.type !== 'MTrk') {
        issues.push(`Track ${trackIndex} has unknown chunk type: "${track.type}".`);
      }
      if (track.type === 'MTrk') {
        if (track.chunkLength === 0 && track.events.length > 0) {
          issues.push(`Track ${trackIndex} chunkLength=0 but has ${track.events.length} events.`);
        } else if (track.chunkLength > 0 && track.events.length === 0) {
          issues.push(`Track ${trackIndex} chunkLength=${track.chunkLength} but has 0 events.`);
        }
      }
      if (track.type !== 'MTrk') {
        return;
      }
      const activeNotes = new Map();
      let gotEndOfTrack = false;
      track.events.forEach((event, eventIndex) => {
        if (event.deltaTime < 0) {
          issues.push(`Track ${trackIndex} event ${eventIndex} has negative deltaTime ${event.deltaTime}.`);
        }
        switch (event.type) {
          case 0x90:
            if (!event.data || typeof event.data.note === 'undefined' || typeof event.data.velocity === 'undefined') {
              issues.push(`Track ${trackIndex} event ${eventIndex} missing note/velocity data: ${JSON.stringify(event.data)}`);
            } else {
              const noteOnNumber = parseInt(event.data.note, 10);
              if (event.data.velocity > 0) {
                const count = activeNotes.get(noteOnNumber) || 0;
                activeNotes.set(noteOnNumber, count + 1);
              }
              else {
                const count = activeNotes.get(noteOnNumber) || 0;
                if (count <= 0) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} tries to Note Off note ${noteOnNumber} which was not active.`);
                } else {
                  activeNotes.set(noteOnNumber, count - 1);
                }
              }
            }
            break;
          case 0x80:
            if (!event.data || typeof event.data.note === 'undefined') {
              issues.push(`Track ${trackIndex} event ${eventIndex} missing note for Note Off: ${JSON.stringify(event.data)}`);
            } else {
              const noteOffNumber = parseInt(event.data.note, 10);
              const count = activeNotes.get(noteOffNumber) || 0;
              if (count <= 0) {
                issues.push(`Track ${trackIndex} event ${eventIndex} tries to Note Off note ${noteOffNumber} which was not active.`);
              } else {
                activeNotes.set(noteOffNumber, count - 1);
              }
            }
            break;
          case 0xFF:
            if (typeof event.metaType === 'undefined') {
              issues.push(`Track ${trackIndex} event ${eventIndex} has missing metaType: ${JSON.stringify(event)}`);
              break;
            }
            switch (event.metaType) {
              case 0x2F:
                gotEndOfTrack = true;
                if (event.metaEventLength !== 0) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} End-of-Track has metaEventLength=${event.metaEventLength}, expected=0`);
                }
                break;
              case 0x51:
                if (event.metaEventLength !== 3) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} Tempo event has metaEventLength=${event.metaEventLength}, expected=3`);
                }
                break;
              case 0x58:
                if (event.metaEventLength !== 4) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} Time Signature has metaEventLength=${event.metaEventLength}, expected=4`);
                }
                break;
              case 0x59:
                if (event.metaEventLength !== 2) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} Key Signature has metaEventLength=${event.metaEventLength}, expected=2`);
                }
                break;
              case 0x54:
                if (event.metaEventLength !== 5) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} SMPTE Offset has metaEventLength=${event.metaEventLength}, expected=5`);
                }
                break;
              case 0x00:
                if (event.metaEventLength !== 2 && event.metaEventLength !== 0) {
                  issues.push(`Track ${trackIndex} event ${eventIndex} Sequence Number has metaEventLength=${event.metaEventLength}, expected=2 or 0`);
                }
                break;
            }
            break;
        }
      });
      if (!gotEndOfTrack) {
        issues.push(`Track ${trackIndex} missing End-of-Track (0xFF 2F) event.`);
      }
      for (const [noteNum, count] of activeNotes.entries()) {
        if (count > 0) {
          issues.push(`Track ${trackIndex} has ${count} unmatched Note On for note ${noteNum}.`);
        }
      }
    });
    return issues;
  }
  static decodeHeader(chunk) {
    debug$1('decodeHeader: length =', chunk.length);
    const header = DataStream.fromData(chunk);
    const type = header.readString(4);
    const chunkLength = header.readUInt32();
    const format = header.readUInt16();
    const trackCount = header.readUInt16();
    const timeDivisionByte1 = header.readUInt8();
    const timeDivisionByte2 = header.readUInt8();
    let timeDivision;
    let framesPerSecond;
    let ticksPerFrame;
    if (timeDivisionByte1 >= 128) {
      framesPerSecond = timeDivisionByte1 - 128;
      ticksPerFrame = timeDivisionByte2;
    } else {
      timeDivision = (timeDivisionByte1 * 256) + timeDivisionByte2;
    }
    const output = {
      type,
      chunkLength,
      format,
      trackCount,
      framesPerSecond,
      ticksPerFrame,
      timeDivision,
    };
    debug$1('decodeHeader:', output);
    return output;
  }
  static getControllerLabel(controller) {
    switch (controller) {
      case 0x00: return 'Bank Select (MSB)';
      case 0x01: return 'Modulation Wheel (MSB)';
      case 0x02: return 'Breath Controller (MSB)';
      case 0x04: return 'Foot Controller (MSB)';
      case 0x05: return 'Portamento Time (MSB)';
      case 0x06: return 'Data Entry (MSB)';
      case 0x07: return 'Volume (MSB)';
      case 0x08: return 'Balance (MSB)';
      case 0x0A: return 'Pan (MSB)';
      case 0x0B: return 'Expression Controller (MSB)';
      case 0x0C: return 'Effect Control 1 (MSB)';
      case 0x0D: return 'Effect Control 2 (MSB)';
      case 0x10: return 'General Purpose Controller 1 (MSB)';
      case 0x11: return 'General Purpose Controller 2 (MSB)';
      case 0x12: return 'General Purpose Controller 3 (MSB)';
      case 0x13: return 'General Purpose Controller 4 (MSB)';
      case 0x20: return 'Bank Select (LSB)';
      case 0x21: return 'Modulation Wheel (LSB)';
      case 0x22: return 'Breath Controller (LSB)';
      case 0x24: return 'Foot Controller (LSB)';
      case 0x25: return 'Portamento Time (LSB)';
      case 0x26: return 'Data Entry (LSB)';
      case 0x27: return 'Volume (LSB)';
      case 0x28: return 'Balance (LSB)';
      case 0x2A: return 'Pan (LSB)';
      case 0x2B: return 'Expression Controller (LSB)';
      case 0x2C: return 'Effect Control 1 (LSB)';
      case 0x2D: return 'Effect Control 2 (LSB)';
      case 0x30: return 'General Purpose Controller 1 (LSB)';
      case 0x31: return 'General Purpose Controller 2 (LSB)';
      case 0x32: return 'General Purpose #3 LSB';
      case 0x33: return 'General Purpose #4 LSB';
      case 0x40: return 'Hold Pedal #1';
      case 0x41: return 'Portamento (GS)';
      case 0x42: return 'Sostenuto (GS)';
      case 0x43: return 'Soft Pedal (GS)';
      case 0x44: return 'Legato Pedal';
      case 0x45: return 'Hold Pedal #2';
      case 0x46: return 'Sound Variation';
      case 0x47: return 'Sound Timbre';
      case 0x48: return 'Sound Release Time';
      case 0x49: return 'Sound Attack Time';
      case 0x4A: return 'Sound Brightness';
      case 0x4B: return 'Sound Control #6';
      case 0x4C: return 'Sound Control #7';
      case 0x4D: return 'Sound Control #8';
      case 0x4E: return 'Sound Control #9';
      case 0x4F: return 'Sound Control #10';
      case 0x50: return 'GP Control #5';
      case 0x51: return 'GP Control #6';
      case 0x52: return 'GP Control #7';
      case 0x53: return 'GP Control #8';
      case 0x54: return 'Portamento Control (GS)';
      case 0x5B: return 'Reverb Level (GS)';
      case 0x5C: return 'Tremolo Depth';
      case 0x5D: return 'Chorus Level (GS)';
      case 0x5E: return 'Celeste Depth';
      case 0x5F: return 'Phaser Depth';
      case 0x60: return 'Data Increment';
      case 0x61: return 'Data Decrement';
      case 0x62: return 'NRPN Parameter LSB (GS)';
      case 0x63: return 'NRPN Parameter MSB (GS)';
      case 0x64: return 'RPN Parameter LSB';
      case 0x65: return 'RPN Parameter MSB';
      case 0x78: return 'All Sound Off (GS)';
      case 0x79: return 'Reset All Controllers';
      case 0x7A: return 'Local On/Off';
      case 0x7B: return 'All Notes Off';
      case 0x7C: return 'Omni Mode Off';
      case 0x7D: return 'Omni Mode On';
      case 0x7E: return 'Mono Mode On';
      case 0x7F: return 'Poly Mode On';
      default: return `Unknown Controller: ${controller}`;
    }
  }
  static getManufacturerLabel(manufacturerId) {
    const manufacturers = {
      0x01: 'Sequential Circuits',
      0x02: 'Big Briar',
      0x03: 'Octave/Plateau',
      0x04: 'Moog',
      0x05: 'Passport Designs',
      0x06: 'Lexicon',
      0x07: 'Kurzweil',
      0x08: 'Fender',
      0x09: 'Gulbransen',
      0x0A: 'Delta Labs',
      0x0B: 'Sound Comp',
      0x0C: 'General Electro',
      0x0D: 'Matthews Research',
      0x0E: 'Effect control 2',
      0x10: 'Oberheim',
      0x11: 'PAIA',
      0x12: 'Simmons',
      0x13: 'DigiDesign',
      0x14: 'Fairlight',
      0x15: 'JL Cooper',
      0x16: 'Lowery',
      0x17: 'Lin',
      0x18: 'Emu',
      0x1B: 'Peavey',
      0x20: 'BonTempi',
      0x21: 'S.I.E.L.',
      0x23: 'SyntheAxe',
      0x24: 'Hohner',
      0x25: 'Crumar',
      0x26: 'Solton',
      0x27: 'Jellinghaus Ms',
      0x28: 'CTS',
      0x29: 'PPG',
      0x2F: 'Elka',
      0x36: 'Cheetah',
      0x3E: 'Waldorf',
      0x40: 'Kawai',
      0x41: 'Roland',
      0x42: 'Korg',
      0x43: 'Yamaha',
      0x44: 'Casio',
      0x46: 'Kamiya Studio',
      0x47: 'Akai',
      0x48: 'Victor',
      0x4B: 'Fujitsu',
      0x4C: 'Sony',
      0x4E: 'Teac',
      0x50: 'Matsushita',
      0x51: 'Fostex',
      0x52: 'Zoom',
      0x54: 'Matsushita',
      0x55: 'Suzuki',
      0x56: 'Fuji Sound',
      0x57: 'Acoustic Technical Laboratory',
      0x7E: 'Universal Non Realtime Message (UNRT)',
      0x7F: 'Universal Realtime Message (URT)',
    };
    return manufacturers[manufacturerId] || `Unknown Manufacturer: ${manufacturerId.toString(16).toUpperCase()}`;
  }
  static writeVariableLengthValue(dataBuffer, value) {
    value = Math.round(value);
    const buffer = [];
    do {
      buffer.push(value & 0x7F);
      value >>= 7;
    } while (value > 0);
    while (buffer.length > 1) {
      dataBuffer.writeUInt8(buffer.pop() | 0x80);
    }
    dataBuffer.writeUInt8(buffer.pop());
  }
  static writeEventData(dataBuffer, data) {
    if (data instanceof Uint8Array) {
      dataBuffer.writeBytes(data);
    } else if (Array.isArray(data)) {
      if (data.some((byte) => byte === undefined)) {
        throw new Error(`Invalid data: ${JSON.stringify(data)}`);
      }
      data.forEach((byte) => dataBuffer.writeUInt8(byte));
    } else if (typeof data === 'string') {
      dataBuffer.writeBytes(new TextEncoder().encode(data));
    } else {
      debug$1(`Invalid writeEventData:`, data);
      throw new Error(`Invalid writeEventData: ${JSON.stringify(data)}`);
    }
  }
  static generateTempoEvent(bpm) {
    const tempo = Math.round(60000000 / bpm);
    const byte1 = (tempo >> 16) & 0xFF;
    const byte2 = (tempo >> 8) & 0xFF;
    const byte3 = tempo & 0xFF;
    return {
      deltaTime: 0,
      type: 0xFF,
      metaType: 0x51,
      metaEventLength: 3,
      data: {
        byte1,
        byte2,
        byte3,
        tempo,
        bpm,
      },
      label: 'Set Tempo',
    };
  }
  static generateMetaStringEvent(metaType, data) {
    const metaEventLength = new TextEncoder().encode(data).length;
    const labels = {
      0x01: 'Text Event',
      0x02: 'Copyright Notice',
      0x03: 'Sequence / Track Name',
      0x04: 'Instrument Name',
      0x05: 'Lyrics',
      0x06: 'Marker',
      0x07: 'Cue Point',
      0x08: 'Program Name',
      0x09: 'Device (Port) Name',
    };
    const label = labels[metaType] ? labels[metaType] : `Meta Event 0x${metaType.toString(16).toUpperCase()}: ${data}`;
    return {
      deltaTime: 0,
      type: 0xFF,
      metaType,
      metaEventLength,
      data,
      label,
    };
  }
  static generateEndOfTrackEvent() {
    return {
      data: '',
      deltaTime: 0,
      type: 0xFF,
      metaType: 0x2F,
      metaEventLength: 0,
      label: 'End of Track',
    };
  }
  static convertToMidi({ ppq = 480, bpm, tracks, skipNotes = [] }) {
    if (!tracks || !Array.isArray(tracks)) {
      throw new Error('Invalid tracks provided');
    }
    const midi = new AudioMIDI('', { timeDivision: ppq });
    for (const track of tracks) {
      const { notes, metaStringEvents } = track;
      const currentTrack = midi.addTrack();
      let currentTime = 0;
      if (bpm) {
        currentTrack.events.push(AudioMIDI.generateTempoEvent(bpm));
      }
      if (Object.keys(metaStringEvents).length > 0) {
        for (const [type, data] of Object.entries(metaStringEvents)) {
          currentTrack.events.push(AudioMIDI.generateMetaStringEvent(Number.parseInt(type, 10), data));
        }
      }
      for (const note of notes) {
        debug$1('note:', note);
        if (!skipNotes.includes(note.midiNote)) {
          currentTrack.events.push({
            deltaTime: currentTime * ppq,
            type: 0x90,
            channel: 0,
            data: {
              note: `${note.midiNote}`,
              velocity: note.velocity,
              length: note.length,
            },
            label: 'Note On',
          });
          currentTrack.events.push({
            deltaTime: (currentTime * ppq) + Math.ceil(note.length),
            type: 0x80,
            channel: 0,
            data: {
              note: `${note.midiNote}`,
              velocity: 0,
              length: note.length,
            },
            label: 'Note Off',
          });
        } else {
          debug$1('skipping note:', note);
        }
        const ticks = note.ticks / ppq;
        if (ticks > 0) {
          debug$1('incrementing time by', ticks);
        }
        currentTime += ticks;
      }
      currentTrack.events.sort((a, b) => a.deltaTime - b.deltaTime);
      let lastTime = 0;
      currentTrack.events.forEach((event) => {
        const deltaTime = event.deltaTime - lastTime;
        event.deltaTime = deltaTime;
        lastTime += deltaTime;
      });
    }
    return midi;
  }
  static noteToMidi(noteString, octaveOffset = 2, noteMap = {
    C: 0,
    'C#': 1,
    D: 2,
    'D#': 3,
    E: 4,
    'E#': 5,
    F: 5,
    'F#': 6,
    G: 7,
    'G#': 8,
    A: 9,
    'A#': 10,
    B: 11,
    'B#': 0,
  }) {
    const match = noteString.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) {
      throw new Error(`Invalid note format: ${noteString}`);
    }
    const [, note, octave] = match;
    const midiNumber = (parseInt(octave, 10) + octaveOffset) * 12 + Number(noteMap[note]);
    if (midiNumber < 0 || midiNumber > 127) {
      throw new Error(`Note out of valid MIDI range: ${noteString}`);
    }
    return midiNumber;
  }
  static midiToNote(midiValue, octaveOffset = 2, noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
    if (midiValue < 0 || midiValue > 127) {
      throw new Error(`Invalid MIDI value: ${midiValue}. Must be between 0 and 127.`);
    }
    const noteIndex = midiValue % 12;
    const octave = Math.floor(midiValue / 12) - octaveOffset;
    return `${noteNames[noteIndex]}${octave}`;
  }
}

let debug = (..._) => { console.log(_); }; try { const { default: d } = await Promise.resolve().then(function () { return index; }); debug = d('Uttori.AudioPattern'); } catch {}
class AudioPattern extends DataBuffer {
  constructor(input, options = { bytesPerNote: 8, padsPerBank: 16, og: false }) {
    super(input);
    this.bars = 0;
    this.timeSignature = 0;
    this.notes = [];
    this.defaultMap = AudioPattern.defaultMap;
    this.parse(options);
  }
  static get defaultPPQOG() { return 96; }
  static get defaultPPQ() { return 480; }
  static get defaultMap() {
    return {
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
  static get defaultMapOG() {
    return {
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
  parse = ({ bytesPerNote = 8, padsPerBank = 16, og = false }) => {
    this.notes = [];
    const totalNotes = (this.remainingBytes() / bytesPerNote) - 2;
    debug('parse totalNotes:', totalNotes);
    let i = 0;
    let realNote = 0;
    while (i < totalNotes) {
      const ticks = this.readUInt8();
      const midiNote = this.readUInt8();
      const bankSwitch = this.readUInt8();
      const pitchMode = this.readUInt8();
      const velocity = this.readUInt8();
      const unknown3 = this.readUInt8();
      const length = this.readUInt16(true);
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
        if (bankSwitch === 0 || bankSwitch === 64) {
          sampleNumber = midiNote - 46;
        } else if (bankSwitch === 1 || bankSwitch === 65) {
          sampleNumber = midiNote - 46 + (padsPerBank * 5);
        } else {
          debug('parse Unexpected value for MKii bankSwitch:', bankSwitch);
          sampleNumber = 160;
        }
      }
      const padNumber = sampleNumber - 1;
      const bankNumber = Math.floor(padNumber / padsPerBank);
      const bankLetter = String.fromCharCode('A'.charCodeAt(0) + bankNumber);
      const bankPadNumber = (padNumber % padsPerBank) + 1;
      const padLabel = `${bankLetter}${bankPadNumber}`;
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
      if (note.midiNote !== 128) {
        realNote++;
        debug('note:', i, realNote, note);
      }
      this.notes.push(note);
      i++;
    }
    const footer = this.read(16);
    if (this.remainingBytes() > 0) {
      debug('parse Read footer but bytes remaining:', this.remainingBytes());
    }
    if (footer[0] !== 0) {
      debug('parse Unique Footer Byte 0:', footer[0]);
    }
    if (footer[1] !== 140) {
      debug('parse Unique Footer Byte 1:', footer[1]);
    }
    if (footer[2] !== 0) {
      debug('parse Unique Footer Byte 2:', footer[2]);
    }
    if (footer[3] !== 0) {
      debug('parse Unique Footer Byte 3:', footer[3]);
    }
    if (footer[4] !== 0) {
      debug('parse Unique Footer Byte 4:', footer[4]);
    }
    if (footer[5] !== 0) {
      debug('parse Unique Footer Byte 5:', footer[5]);
    }
    if (footer[6] !== 0) {
      debug('parse Unique Footer Byte 6:', footer[6]);
    }
    if (footer[7] !== 0) {
      debug('parse Unique Footer Byte 7:', footer[7]);
    }
    if (og) {
      if (footer[8] !== 0) {
        debug('parse Unique Footer Byte 8 (OG):', footer[8]);
      }
    } else {
      if (footer[8] < 1 || footer[8] > 64) {
        debug('parse Unique Footer Byte 8 (MKii):', footer[8]);
      }
    }
    if (og) {
      if (footer[9] !== 2) {
        debug('parse Unique Footer Byte 9 (OG):', footer[9]);
      }
    } else {
      if (footer[9] !== 0) {
        debug('parse Unique Footer Byte 9 (MKii):', footer[9]);
      }
    }
    if (footer[10] !== 0) {
      debug('parse Unique Footer Byte 10:', footer[10]);
    }
    if (footer[11] !== 0) {
      debug('parse Unique Footer Byte 11:', footer[11]);
    }
    if (![0, 1, 2, 3, 4, 5, 6, 7].includes(footer[12])) {
      debug('parse Unique Footer Byte 12:', footer[12]);
    }
    if (og) {
      if (footer[13] !== 0) {
        debug('parse Unique Footer Byte 13 (OG):', footer[13]);
      }
    } else {
      if (footer[13] !== 128) {
        debug('parse Unique Footer Byte 13 (MKii):', footer[13]);
      }
    }
    if (og) {
      if (footer[14] !== 0) {
        debug('parse Unique Footer Byte 13 (OG):', footer[14]);
      }
    } else {
      if (footer[14] < 1 || footer[14] > 64) {
        debug('parse Unique Footer Byte 14 (MKii):', footer[14]);
      }
    }
    if (og) {
      if (footer[15] !== 0) {
        debug('parse Unique Footer Byte 15 (OG):', footer[15]);
      }
    } else {
      if (footer[15] !== 1) {
        debug('parse Unique Footer Byte 15 (MKii):', footer[15]);
      }
    }
    if (footer[8] !== footer[14]) {
      debug('parse Bars bytes 8 and 14 mismatch:', footer[8], footer[14]);
    }
    this.bars = footer[8];
    debug('bars:', this.bars);
    this.timeSignature = footer[12];
  };
  toMidi = ({ bpm, ppq, fileName, noteMap }) => {
    debug('toMidi:', { bpm, fileName });
    const allEvents = [];
    let absoluteTime = 0;
    for (const note of this.notes) {
      absoluteTime += note.ticks;
      const midiNote = noteMap[note.padLabel];
      if (!midiNote) {
        debug('toMidi Unknown pad:', note.padLabel);
        continue;
      }
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
      if (note.length > 0) {
        allEvents.push({
          absoluteTime: absoluteTime + note.length,
          deltaTime: 0,
          type: 0x80,
          channel: 0,
          data: {
            note: String(midiNote),
            velocity: 0,
            length: note.length,
          },
          label: 'Note Off',
        });
      }
    }
    allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);
    let lastAbs = 0;
    for (const event of allEvents) {
      const delta = event.absoluteTime - lastAbs;
      event.deltaTime = delta;
      lastAbs = event.absoluteTime;
    }
    const track = {
      type: 'MTrk',
      chunkLength: 0,
      events: [],
    };
    if (bpm) {
      track.events.push(AudioMIDI.generateTempoEvent(bpm));
    }
    track.events.push(AudioMIDI.generateMetaStringEvent(0x03, `SP404 Pattern ${fileName}`));
    track.events.push(...allEvents);
    track.events.push(AudioMIDI.generateEndOfTrackEvent());
    const midi = new AudioMIDI();
    midi.format = 1;
    midi.trackCount = 1;
    midi.timeDivision = ppq;
    midi.chunks = [track];
    return midi;
  };
  getUsedPads() {
    const padMap = new Set();
    for (const note of this.notes) {
      padMap.add(note.padLabel);
    }
    return [...padMap];
  }
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
    const midiPPQN = audioMIDI.timeDivision;
    const conversionRatio = patternPPQN / midiPPQN;
    debug('fromMidi:', { midiPPQN, patternPPQN, conversionRatio });
    const ticksPerBar = patternPPQN * 4;
    const maxBars = 64;
    const maxTicksInGap = 255;
    let currentTime = 0;
    const insertEmptyNotes = (gap = 0) => {
      debug('fromMidi: insertEmptyNotes', { gap });
      while (gap > 0) {
        const ticksToInsert = Math.min(gap, maxTicksInGap);
        dataBuffer.writeUInt8(ticksToInsert);
        dataBuffer.writeUInt8(128);
        dataBuffer.writeUInt8(0);
        dataBuffer.writeUInt8(0);
        dataBuffer.writeUInt8(0);
        dataBuffer.writeUInt8(0);
        dataBuffer.writeUInt16(0, dataBuffer.offset, true, true);
        gap -= ticksToInsert;
      }
    };
    let totalTrackLength = 0;
    const allEvents = [];
    for (const track of audioMIDI.chunks) {
      if (!track || !('events' in track)) {
        continue;
      }
      let absoluteTime = 0;
      for (const event of track.events) {
        absoluteTime += event.deltaTime;
        if (event && typeof event.data === 'object' && 'type' in event && 'velocity' in event.data && event.type === 0x90 && event.data.velocity > 0) {
          allEvents.push({
            absoluteTime,
            note: event.data.note,
            velocity: event.data.velocity,
            length: event.data.length,
          });
        }
      }
    }
    allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);
    let lastAbsoluteTime = 0;
    for (const event of allEvents) {
      debug('fromMidi: 📧 event', event);
      const { note, velocity, length, absoluteTime } = event;
      debug('fromMidi: Note On', { note, velocity, length });
      const ticks = Math.round((absoluteTime - lastAbsoluteTime) * conversionRatio);
      debug('fromMidi: ticks', ticks);
      const gap = ticks - currentTime;
      debug('fromMidi: gap', gap);
      if (gap > 255) {
        insertEmptyNotes(gap);
      }
      debug(`fromMidi: note`, note);
      const pad = noteMap[note];
      debug(`fromMidi: pad`, pad);
      const { bankSwitch, midiNote } = og ? AudioPattern.defaultMapOG[pad] : AudioPattern.defaultMap[pad];
      debug(`fromMidi:`, { bankSwitch, midiNote });
      const pitchMode = 0;
      const correctedLength = Math.round(length * conversionRatio);
      debug(`fromMidi: correctedLength = ${length} * ${conversionRatio} = `, correctedLength);
      dataBuffer.writeUInt8(ticks);
      dataBuffer.writeUInt8(midiNote);
      dataBuffer.writeUInt8(bankSwitch);
      dataBuffer.writeUInt8(pitchMode);
      dataBuffer.writeUInt8(velocity);
      dataBuffer.writeUInt8(64);
      dataBuffer.writeUInt16(correctedLength, dataBuffer.offset, true, true);
      currentTime += ticks;
      totalTrackLength += correctedLength;
      lastAbsoluteTime = absoluteTime;
    }
    if (currentTime === 0 && totalTrackLength > 0) {
      insertEmptyNotes(ticksPerBar);
    } else {
      const remainder = currentTime % ticksPerBar;
      if (remainder !== 0) {
        const ticksToNextBar = ticksPerBar - remainder;
        if (currentTime + ticksToNextBar <= maxBars * ticksPerBar) {
          insertEmptyNotes(ticksToNextBar);
          currentTime += ticksToNextBar;
        } else {
          currentTime = maxBars * ticksPerBar;
        }
      }
    }
    const footer = new Uint8Array(16);
    const bars = Math.round(currentTime / ticksPerBar);
    debug('fromMidi: bars', bars);
    footer[1] = 140;
    footer[8] = og ? 0 : bars;
    footer[9] = og ? 2 : 0;
    footer[13] = og ? 0 : 128;
    footer[14] = og ? 0 : bars;
    footer[15] = og ? 0 : 1;
    dataBuffer.writeBytes(footer);
    return dataBuffer;
  }
}

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
  input.type = 'text';
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
  chunkNode.append(makeDetail('Conver MIDI to Pattern', ''));
  chunkNode.append(makeInputText('File', file.name));
  chunkNode.append(makeInputSelect('PPQN', '480', [{ label: '480 (MKii)', value: '480' }, { label: '96 (OG)', value: '96' }]));
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
    const select = document.createElement('select');
    select.name = noteNumber;
    select.className = `form-field`;
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = 'Choose Pad';
    select.appendChild(blankOption);
    defaultMapKeys.forEach((padKey) => {
      const option = document.createElement('option');
      option.value = padKey;
      option.textContent = padKey;
      select.appendChild(option);
    });
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
    const select = document.createElement('select');
    select.name = pad;
    select.className = `form-field`;
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = 'Choose Pad';
    select.appendChild(blankOption);
    for (let i = 0; i < 128; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      const noteLabel = AudioMIDI.midiToNote(i);
      option.textContent = `${noteLabel} (${i})`;
      select.appendChild(option);
    }
    select.value = `${AudioPattern.defaultMap[pad].midiNote}`;
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

if (typeof process === 'undefined' || process.type === 'renderer' || process.browser === true || process.__nwjs) {
	module.exports = require('./browser.js');
} else {
	module.exports = require('./node.js');
}

var index = /*#__PURE__*/Object.freeze({
  __proto__: null
});
