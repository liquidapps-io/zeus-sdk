import Long from 'long';

export function encodeName(name: string, littleEndian = true) {
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz'
    const charidx = (ch: string) => {
        const idx = charmap.indexOf(ch)
        if (idx === -1)
            throw new TypeError(`Invalid character: '${ch}'`)
        return idx
    }
    if (typeof name !== 'string')
        throw new TypeError('name parameter is a required string')
    if (name.length > 12)
        throw new TypeError('A name can be up to 12 characters long')
    let bitstr = ''
    for (let i = 0; i <= 12; i++) { // process all 64 bits (even if name is short)
        const c = i < name.length ? charidx(name[i]) : 0
        const bitlen = i < 12 ? 5 : 4
        let bits = Number(c).toString(2)
        if (bits.length > bitlen) {
            throw new TypeError('Invalid name ' + name)
        }
        bits = '0'.repeat(bitlen - bits.length) + bits
        bitstr += bits
    }
    const value = Long.fromString(bitstr, true, 2)
    // convert to LITTLE_ENDIAN
    let leHex = ''
    const bytes = littleEndian ? value.toBytesLE() : value.toBytesBE()
    for (const b of bytes) {
        const n = Number(b).toString(16)
        leHex += (n.length === 1 ? '0' : '') + n
    }
    const ulName = Long.fromString(leHex, true, 16).toString()
    return ulName.toString()
}

export function toBound(numStr: string, bytes: number){
    return `${( new Array( bytes * 2 + 1 ).join( "0" ) + numStr ).substring( numStr.length ).toUpperCase()}`
};

export function bytesToHex(bytes: string) {
    let leHex = '';
    for (const b of bytes) {
        const n = Number(b).toString(16);
        leHex += (n.length === 1 ? '0' : '') + n;
    }
    return leHex;
}

export function nameToValue(name: string) {
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz';
    const charidx = (ch: string) => {
        const idx = charmap.indexOf(ch);
        if (idx === -1) throw new TypeError(`Invalid character: '${ch}'`);
        return idx;
    };
    if (typeof name !== 'string') throw new TypeError('name parameter is a required string');
    if (name.length > 12) throw new TypeError('A name can be up to 12 characters long');
    let bitstr = '';
    for (let i = 0; i <= 12; i++) {
        // process all 64 bits (even if name is short)
        const c = i < name.length ? charidx(name[i]) : 0;
        const bitlen = i < 12 ? 5 : 4;
        let bits = Number(c).toString(2);
        if (bits.length > bitlen) {
            throw new TypeError('Invalid name ' + name);
        }
        bits = '0'.repeat(bitlen - bits.length) + bits;
        bitstr += bits;
    }
    return Long.fromString(bitstr, true, 2);
}

export function getTableBoundsForName(name: string, asLittleEndianHex = true) {
    const nameValue = this.nameToValue(name);
    const nameValueP1 = nameValue.add(1);
    if (!asLittleEndianHex) {
        return {
            lower_bound: nameValue.toString(),
            upper_bound: nameValueP1.toString()
        };
    }
    const lowerBound = this.bytesToHex(nameValue.toBytesLE());
    const upperBound = this.bytesToHex(nameValueP1.toBytesLE());
    return {
        lower_bound: lowerBound,
        upper_bound: upperBound,
    };
}
