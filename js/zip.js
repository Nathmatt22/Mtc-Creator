/* MTC creator — lecture / écriture ZIP sans dépendance externe.
   Écriture : DEFLATE natif si disponible, sinon STORE. Lecture : STORE + DEFLATE. */
(function () {
  const MTC = (window.MTC = window.MTC || {});
  const t = (text, vars) => (MTC.i18n ? MTC.i18n.t(text, vars) : text);
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8');

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xff];
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(d) {
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
    };
  }

  async function deflateRaw(bytes) {
    if (typeof CompressionStream !== 'function') return null;
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) {
      return null;
    }
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error(t('Ce navigateur ne peut pas décompresser les fichiers ZIP.'));
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /**
   * Écrit une archive ZIP.
   * @param {{name:string,data:Uint8Array}[]} files
   * @returns {Promise<Blob>}
   */
  async function write(files) {
    const now = new Date();
    const stamp = dosDateTime(now);
    const prepared = [];

    for (const file of files) {
      const nameBytes = enc.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : enc.encode(String(file.data));
      const crc = crc32(data);
      let method = 0;
      let compressed = data;
      if (data.length > 0) {
        const deflated = await deflateRaw(data);
        if (deflated && deflated.length < data.length) {
          method = 8;
          compressed = deflated;
        }
      }
      prepared.push({ nameBytes, data, compressed, crc, method });
    }

    let size = 22;
    for (const p of prepared) size += 30 + p.nameBytes.length + p.compressed.length + 46 + p.nameBytes.length;

    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const out = new Uint8Array(buffer);
    let offset = 0;
    const central = [];

    for (const p of prepared) {
      const localOffset = offset;
      view.setUint32(offset, 0x04034b50, true);
      view.setUint16(offset + 4, 20, true); // version
      view.setUint16(offset + 6, 0x0800, true); // UTF-8
      view.setUint16(offset + 8, p.method, true);
      view.setUint16(offset + 10, stamp.time, true);
      view.setUint16(offset + 12, stamp.date, true);
      view.setUint32(offset + 14, p.crc, true);
      view.setUint32(offset + 18, p.compressed.length, true);
      view.setUint32(offset + 22, p.data.length, true);
      view.setUint16(offset + 26, p.nameBytes.length, true);
      view.setUint16(offset + 28, 0, true);
      offset += 30;
      out.set(p.nameBytes, offset);
      offset += p.nameBytes.length;
      out.set(p.compressed, offset);
      offset += p.compressed.length;
      central.push({ p, localOffset });
    }

    const centralStart = offset;
    for (const { p, localOffset } of central) {
      view.setUint32(offset, 0x02014b50, true);
      view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, 20, true);
      view.setUint16(offset + 8, 0x0800, true);
      view.setUint16(offset + 10, p.method, true);
      view.setUint16(offset + 12, stamp.time, true);
      view.setUint16(offset + 14, stamp.date, true);
      view.setUint32(offset + 16, p.crc, true);
      view.setUint32(offset + 20, p.compressed.length, true);
      view.setUint32(offset + 24, p.data.length, true);
      view.setUint16(offset + 28, p.nameBytes.length, true);
      view.setUint16(offset + 30, 0, true);
      view.setUint16(offset + 32, 0, true);
      view.setUint16(offset + 34, 0, true);
      view.setUint16(offset + 36, 0, true);
      view.setUint32(offset + 38, 0, true);
      view.setUint32(offset + 42, localOffset, true);
      offset += 46;
      out.set(p.nameBytes, offset);
      offset += p.nameBytes.length;
    }
    const centralSize = offset - centralStart;

    view.setUint32(offset, 0x06054b50, true);
    view.setUint16(offset + 4, 0, true);
    view.setUint16(offset + 6, 0, true);
    view.setUint16(offset + 8, prepared.length, true);
    view.setUint16(offset + 10, prepared.length, true);
    view.setUint32(offset + 12, centralSize, true);
    view.setUint32(offset + 16, centralStart, true);
    view.setUint16(offset + 20, 0, true);

    return new Blob([buffer], { type: 'application/zip' });
  }

  /**
   * Lit une archive ZIP.
   * @param {ArrayBuffer} buffer
   * @returns {Promise<{name:string,data:Uint8Array}[]>}
   */
  async function read(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let eocd = -1;
    const stop = Math.max(0, bytes.length - 22 - 65535);
    for (let i = bytes.length - 22; i >= stop; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error(t('Archive ZIP invalide (fin de répertoire introuvable).'));

    const count = view.getUint16(eocd + 10, true);
    let ptr = view.getUint32(eocd + 16, true);
    const entries = [];

    for (let i = 0; i < count; i++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;
      const method = view.getUint16(ptr + 10, true);
      const compSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localOffset = view.getUint32(ptr + 42, true);
      const name = dec.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;

      if (name.endsWith('/')) continue;

      if (view.getUint32(localOffset, true) !== 0x04034b50) continue;
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(start, start + compSize);

      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = await inflateRaw(raw);
      else throw new Error(t('Compression ZIP non prise en charge (méthode {method}) pour {name}.', { method, name }));

      entries.push({ name, data });
    }
    return entries;
  }

  async function dataUrlToBytes(dataUrl) {
    const res = await fetch(dataUrl);
    return new Uint8Array(await res.arrayBuffer());
  }

  function bytesToText(bytes) {
    return dec.decode(bytes);
  }

  function textToBytes(text) {
    return enc.encode(text);
  }

  MTC.zip = { write, read, crc32, dataUrlToBytes, bytesToText, textToBytes };
})();
