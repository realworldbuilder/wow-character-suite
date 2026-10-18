// A reader for the Lua that WoW writes into SavedVariables files. It never executes anything: a tokenizer and a
// recursive-descent parser for the data subset (assignments of tables, strings, numbers, booleans, nil).
// A port of Rambleon's companion/src/rambleon/luaparse.py, with the same rules and guards.

export class LuaParseError extends Error {}
export class TornFile extends LuaParseError {}   // the file ends mid-value: WoW was still writing it

const MAX_BYTES = 64 * 1024 * 1024;
const MAX_DEPTH = 500;
const SPECIAL_NUMBERS = {
  "inf": Infinity, "-inf": -Infinity, "nan": NaN, "-nan": NaN, "-nan(ind)": NaN, "nan(ind)": NaN,
  "1.#INF": Infinity, "-1.#INF": -Infinity, "1.#IND": NaN, "-1.#IND": NaN, "1.#QNAN": NaN, "-1.#QNAN": NaN,
};
const ESCAPES = { n: "\n", r: "\r", t: "\t", a: "\x07", b: "\b", f: "\f", v: "\v", "\\": "\\", '"': '"', "'": "'", "\n": "\n" };

const LONG_OPEN = /\[(=*)\[/y;
const NUMBER = /-?(?:1\.#(?:INF|IND|QNAN)|nan(?:\(ind\))?(?![A-Za-z0-9_])|inf(?![A-Za-z0-9_])|0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;
const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;
const DECIMAL = /\d{1,3}/y;
// Sticky regexes read at an offset without copying the rest of the file.
function at(re, src, i) { re.lastIndex = i; return re.exec(src); }

function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const err = (msg, Kind = LuaParseError) => { throw new Kind(`${msg} at offset ${i}`); };
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "﻿") { i++; continue; }
    if (c === "-" && src[i + 1] === "-") {
      i += 2;
      const long = at(LONG_OPEN, src, i);
      if (long) {
        const close = "]" + long[1] + "]";
        const end = src.indexOf(close, i);
        if (end < 0) err("unfinished comment", TornFile);
        i = end + close.length;
      } else {
        while (i < n && src[i] !== "\n") i++;
      }
      continue;
    }
    if ("{}[]=,;".includes(c)) {
      // "[[" or "[=[" opens a long string
      const long = c === "[" ? at(LONG_OPEN, src, i) : null;
      if (long) {
        const close = "]" + long[1] + "]";
        let start = i + long[0].length;
        if (src[start] === "\r") start++;
        if (src[start] === "\n") start++;
        const end = src.indexOf(close, start);
        if (end < 0) err("unfinished long string", TornFile);
        toks.push({ t: "str", v: src.slice(start, end) });
        i = end + close.length;
        continue;
      }
      toks.push({ t: c });
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      let out = "";
      i++;
      for (;;) {
        if (i >= n) err("unfinished string", TornFile);
        const d = src[i];
        if (d === c) { i++; break; }
        if (d === "\n") err("newline in string");
        if (d !== "\\") { out += d; i++; continue; }
        const e = src[i + 1];
        if (e === undefined) err("unfinished string", TornFile);
        if (e in ESCAPES) { out += ESCAPES[e]; i += 2; continue; }
        if (e === "\r") { out += "\n"; i += src[i + 2] === "\n" ? 3 : 2; continue; }
        if (e === "x") {
          const hex = src.slice(i + 2, i + 4);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) err("bad \\x escape");
          out += String.fromCharCode(parseInt(hex, 16)); i += 4; continue;
        }
        const dec = at(DECIMAL, src, i + 1);
        if (dec) {
          const code = Number(dec[0]);
          if (code > 255) err("bad \\ddd escape");
          out += String.fromCharCode(code); i += 1 + dec[0].length; continue;
        }
        err("bad escape \\" + e);
      }
      toks.push({ t: "str", v: decodeBytes(out) });
      continue;
    }
    const num = at(NUMBER, src, i);
    if (num && (c !== "-" || num[0].length > 1)) {
      const s = num[0];
      let v;
      if (s in SPECIAL_NUMBERS) v = SPECIAL_NUMBERS[s];
      else if (/^-?0[xX]/.test(s)) v = (s[0] === "-" ? -1 : 1) * parseInt(s.replace(/^-?0[xX]/, ""), 16);
      else v = Number(s);
      toks.push({ t: "num", v });
      i += s.length;
      continue;
    }
    const name = at(NAME, src, i);
    if (name) {
      const w = name[0];
      if (w === "true" || w === "false") toks.push({ t: "bool", v: w === "true" });
      else if (w === "nil") toks.push({ t: "nil" });
      else toks.push({ t: "name", v: w });
      i += w.length;
      continue;
    }
    err(`unexpected character ${JSON.stringify(c)}`);
  }
  return toks;
}

// WoW writes UTF-8 bytes; a string read from a JS string of the file is already decoded, but \ddd escapes give
// single bytes. Re-decode only when the string holds byte-range characters that form valid UTF-8.
function decodeBytes(s) {
  if (!/[\x80-\xff]/.test(s) || /[^\x00-\xff]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, ch => ch.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return s; }
}

class Parser {
  constructor(toks) { this.toks = toks; this.i = 0; this.depth = 0; }
  peek(k = 0) { return this.toks[this.i + k]; }
  next() {
    const t = this.toks[this.i++];
    if (!t) throw new TornFile("file ends in the middle of a value");
    return t;
  }
  expect(type) {
    const t = this.next();
    if (t.t !== type) throw new LuaParseError(`expected ${type}, got ${t.t}`);
    return t;
  }
  value() {
    const t = this.next();
    switch (t.t) {
      case "str": case "num": case "bool": return t.v;
      case "nil": return null;
      case "{": return this.table();
      default: throw new LuaParseError(`unexpected ${t.t}`);
    }
  }
  table() {
    if (++this.depth > MAX_DEPTH) throw new LuaParseError("tables nested too deeply");
    const map = new Map();
    let pos = 1;
    for (;;) {
      const t = this.peek();
      if (!t) throw new TornFile("file ends inside a table");
      if (t.t === "}") { this.i++; break; }
      if (t.t === "[" ) {
        this.i++;
        const key = this.value();
        this.expect("]");
        this.expect("=");
        const v = this.value();
        if (key !== null && v !== null) map.set(key, v);
      } else if (t.t === "name" && this.peek(1)?.t === "=") {
        this.i += 2;
        const v = this.value();
        if (v !== null) map.set(t.v, v);
      } else {
        const v = this.value();
        if (v !== null) map.set(pos, v);
        pos++;
      }
      const sep = this.peek();
      if (sep && (sep.t === "," || sep.t === ";")) this.i++;
      else if (!sep || sep.t !== "}") {
        if (!sep) throw new TornFile("file ends inside a table");
        throw new LuaParseError(`expected , or } in table, got ${sep.t}`);
      }
    }
    this.depth--;
    return toJS(map);
  }
}

// Tables keyed exactly 1..n become arrays; everything else a plain object with string keys.
function toJS(map) {
  const n = map.size;
  let isList = n > 0;
  for (let k = 1; k <= n && isList; k++) if (!map.has(k)) isList = false;
  if (isList) return Array.from({ length: n }, (_, k) => map.get(k + 1));
  const obj = {};
  for (const [k, v] of map) obj[String(k)] = v;
  return obj;
}

// Returns { Name: value, ... } for every top-level assignment.
export function parseSavedVariables(src) {
  if (typeof src !== "string") throw new LuaParseError("not text");
  if (src.length > MAX_BYTES) throw new LuaParseError("file too large");
  const p = new Parser(tokenize(src));
  const out = {};
  while (p.peek()) {
    const name = p.expect("name").v;
    p.expect("=");
    const v = p.value();
    if (v !== null) out[name] = v;
    if (p.peek()?.t === ";") p.i++;
  }
  return out;
}
