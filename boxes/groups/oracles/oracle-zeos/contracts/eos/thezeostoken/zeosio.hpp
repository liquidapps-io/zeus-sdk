#pragma once

#include <vector>
#include <tuple>
#include <array>
#include <eosio/eosio.hpp>
#include "blake2s.h"

using namespace std;
using namespace eosio;

namespace zeosio
{
    // helper from zeos-bellman/inc/groth16/bls12_381/util.hpp needed by Scalar
    // also used for halo2 fp operations
    /// Compute a + b + carry, returning the result and the new carry over.
    tuple<uint64_t, uint64_t> adc(uint64_t a, uint64_t b, uint64_t carry)
    {
        uint128_t ret = (uint128_t)a + (uint128_t)b + (uint128_t)carry;
        return tuple<uint64_t, uint64_t>{(uint64_t)ret, (uint64_t)(ret >> 64)};
    }
    /// Compute a - (b + borrow), returning the result and the new borrow.
    tuple<uint64_t, uint64_t> sbb(uint64_t a, uint64_t b, uint64_t borrow)
    {
        uint128_t ret = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow >> 63));
        return tuple<uint64_t, uint64_t>{(uint64_t)ret, (uint64_t)(ret >> 64)};
    }
    /// Compute a + (b * c) + carry, returning the result and the new carry over.
    tuple<uint64_t, uint64_t> mac(uint64_t a, uint64_t b, uint64_t c, uint64_t carry)
    {
        uint128_t ret = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry;
        return tuple<uint64_t, uint64_t>{(uint64_t)ret, (uint64_t)(ret >> 64)};
    }
    
    // from: https://stackoverflow.com/a/47526992/2340535
    template<size_t n> string byte2str(const uint8_t* src)
    {
        static const char table[] = "0123456789ABCDEF";
        char dst[2 * n + 1];
        const uint8_t* srcPtr = src;
        char* dstPtr = dst;
        for(auto count = n; count > 0; --count)
        {
            unsigned char c = *srcPtr++;
            *dstPtr++ = table[c >> 4];
            *dstPtr++ = table[c & 0x0f];
        }
        *dstPtr = 0;
        return &dst[0];
    }

    namespace groth16
    {
        // copied from zeos-bellman/inc/groth16/bls12_381/scalar.hpp and cpp file to make a header
        // only implementation to be used by smart contracts to compute_multipacking of inputs on chain
        class Scalar
        {
            public:

                // constantslet cap = Scalar::CAPACITY;
                /// INV = -(q^{-1} mod 2^64) mod 2^64
                static const uint64_t INV;

                /// Constant representing the modulus
                /// q = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001
                static const Scalar MODULUS;
                // The number of bits needed to represent the modulus.
                static const uint32_t MODULUS_BITS;
                static const uint32_t NUM_BITS;
                static const uint32_t CAPACITY;

                static const Scalar R;
                static const Scalar ZERO;

                // members
                vector<uint64_t> data;

                Scalar() : data(vector<uint64_t>())
                {
                }

                Scalar(const vector<uint64_t>& data) : data(data)
                {
                }

                vector<uint8_t> to_bytes() const
                {
                    // Turn into canonical form by computing
                    // (a.R) / R = a
                    Scalar tmp = montgomery_reduce(this->data[0], this->data[1], this->data[2], this->data[3], 0, 0, 0, 0);

                    vector<uint8_t> res = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
                    uint8_t* p = (uint8_t*)tmp.data.data();
                    // mschoenebeck: the following code probably assumes little endian on the target machine. if target is big endian flip byte order here (UNTESTED)
                    //res[0..8].copy_from_slice(&tmp.0[0].to_le_bytes());
                    res[0] = p[0]; res[1] = p[1]; res[2] = p[2]; res[3] = p[3]; res[4] = p[4]; res[5] = p[5]; res[6] = p[6]; res[7] = p[7];
                    //res[8..16].copy_from_slice(&tmp.0[1].to_le_bytes());
                    res[8] = p[8]; res[9] = p[9]; res[10] = p[10]; res[11] = p[11]; res[12] = p[12]; res[13] = p[13]; res[14] = p[14]; res[15] = p[15];
                    //res[16..24].copy_from_slice(&tmp.0[2].to_le_bytes());
                    res[16] = p[16]; res[17] = p[17]; res[18] = p[18]; res[19] = p[19]; res[20] = p[20]; res[21] = p[21]; res[22] = p[22]; res[23] = p[23];
                    //res[24..32].copy_from_slice(&tmp.0[3].to_le_bytes());
                    res[24] = p[24]; res[25] = p[25]; res[26] = p[26]; res[27] = p[27]; res[28] = p[28]; res[29] = p[29]; res[30] = p[30]; res[31] = p[31];

                    return res;
                }

                Scalar montgomery_reduce(const uint64_t& r0,
                                         const uint64_t& r1,
                                         const uint64_t& r2,
                                         const uint64_t& r3,
                                         const uint64_t& r4,
                                         const uint64_t& r5,
                                         const uint64_t& r6,
                                         const uint64_t& r7) const
                {
                    // The Montgomery reduction here is based on Algorithm 14.32 in
                    // Handbook of Applied Cryptography
                    // <http://cacr.uwaterloo.ca/hac/about/chap14.pdf>.

                    uint64_t _, rr0 = r0, rr1 = r1, rr2 = r2, rr3 = r3, rr4 = r4, rr5 = r5, rr6 = r6, rr7 = r7, carry, carry2;
                    uint64_t k = rr0 * INV;
                    tie(_,   carry) = mac(rr0, k, MODULUS.data[0], 0);
                    tie(rr1, carry) = mac(rr1, k, MODULUS.data[1], carry);
                    tie(rr2, carry) = mac(rr2, k, MODULUS.data[2], carry);
                    tie(rr3, carry) = mac(rr3, k, MODULUS.data[3], carry);
                    tie(rr4, carry2) = adc(rr4, 0, carry);

                    k = rr1 * INV;
                    tie(_,   carry) = mac(rr1, k, MODULUS.data[0], 0);
                    tie(rr2, carry) = mac(rr2, k, MODULUS.data[1], carry);
                    tie(rr3, carry) = mac(rr3, k, MODULUS.data[2], carry);
                    tie(rr4, carry) = mac(rr4, k, MODULUS.data[3], carry);
                    tie(rr5, carry2) = adc(rr5, carry2, carry);

                    k = rr2 * INV;
                    tie(_,   carry) = mac(rr2, k, MODULUS.data[0], 0);
                    tie(rr3, carry) = mac(rr3, k, MODULUS.data[1], carry);
                    tie(rr4, carry) = mac(rr4, k, MODULUS.data[2], carry);
                    tie(rr5, carry) = mac(rr5, k, MODULUS.data[3], carry);
                    tie(rr6, carry2) = adc(rr6, carry2, carry);

                    k = rr3 * INV;
                    tie(_,   carry) = mac(rr3, k, MODULUS.data[0], 0);
                    tie(rr4, carry) = mac(rr4, k, MODULUS.data[1], carry);
                    tie(rr5, carry) = mac(rr5, k, MODULUS.data[2], carry);
                    tie(rr6, carry) = mac(rr6, k, MODULUS.data[3], carry);
                    tie(rr7, _) = adc(rr7, carry2, carry);

                    // Result may be within MODULUS of the correct value
                    return (Scalar(vector<uint64_t>{rr4, rr5, rr6, rr7})).sub(MODULUS);
                }

                static Scalar zero()
                {
                    return ZERO;
                }

                static Scalar one()
                {
                    return R;
                }

                Scalar sub(const Scalar& rhs) const
                {
                    uint64_t _, d0, d1, d2, d3, borrow, carry;
                    tie(d0, borrow) = sbb(this->data[0], rhs.data[0], 0);
                    tie(d1, borrow) = sbb(this->data[1], rhs.data[1], borrow);
                    tie(d2, borrow) = sbb(this->data[2], rhs.data[2], borrow);
                    tie(d3, borrow) = sbb(this->data[3], rhs.data[3], borrow);

                    // If underflow occurred on the final limb, borrow = 0xfff...fff, otherwise
                    // borrow = 0x000...000. Thus, we use it as a mask to conditionally add the modulus.
                    tie(d0, carry) = adc(d0, MODULUS.data[0] & borrow, 0);
                    tie(d1, carry) = adc(d1, MODULUS.data[1] & borrow, carry);
                    tie(d2, carry) = adc(d2, MODULUS.data[2] & borrow, carry);
                    tie(d3, _)     = adc(d3, MODULUS.data[3] & borrow, carry);

                    return Scalar(vector<uint64_t>{d0, d1, d2, d3});
                }

                Scalar operator - (const Scalar& rhs) const
                {
                    return this->sub(rhs);
                }

                Scalar add(const Scalar& rhs) const
                {
                    uint64_t _, d0, d1, d2, d3, carry;
                    tie(d0, carry) = adc(this->data[0], rhs.data[0], 0);
                    tie(d1, carry) = adc(this->data[1], rhs.data[1], carry);
                    tie(d2, carry) = adc(this->data[2], rhs.data[2], carry);
                    tie(d3, _)     = adc(this->data[3], rhs.data[3], carry);

                    // Attempt to subtract the modulus, to ensure the value
                    // is smaller than the modulus.
                    return Scalar(vector<uint64_t>{d0, d1, d2, d3}).sub(MODULUS);
                }

                Scalar operator + (const Scalar& rhs) const
                {
                    return this->add(rhs);
                }

                Scalar dbl() const
                {
                    return this->add(*this);
                }
        };
        // constants
        /// INV = -(q^{-1} mod 2^64) mod 2^64
        const uint64_t Scalar::INV = 0xffff'fffe'ffff'ffff;
        /// Constant representing the modulus
        /// q = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001
        const Scalar Scalar::MODULUS = Scalar(vector<uint64_t>{
            0xffff'ffff'0000'0001,
            0x53bd'a402'fffe'5bfe,
            0x3339'd808'09a1'd805,
            0x73ed'a753'299d'7d48
        });
        const uint32_t Scalar::MODULUS_BITS = 255;
        const uint32_t Scalar::NUM_BITS = Scalar::MODULUS_BITS;
        const uint32_t Scalar::CAPACITY = Scalar::NUM_BITS -1;
        /// R = 2^256 mod q
        const Scalar Scalar::R = Scalar(vector<uint64_t>{
            0x0000'0001'ffff'fffe,
            0x5884'b7fa'0003'4802,
            0x998c'4fef'ecbc'4ff5,
            0x1824'b159'acc5'056f,
        });
        const Scalar Scalar::ZERO = Scalar({0, 0, 0, 0});

        void append_bits(vector<bool>& bits, const uint64_t& val)
        {
            for(int i = 0; i < 64; i++)
            {
                bits.push_back((val>>i & 1) == 1);
            }
        }

        void append_bits(vector<bool>& bits, const checksum256& val)
        {
            array<uint8_t, 32> arr = val.extract_as_byte_array();
            for(int i = 0; i < 32; i++)
            {
                for(int j = 0; j < 8; j++)
                {
                    bits.push_back((arr[i]>>j & 1) == 1);
                }
            }
        }

        vector<Scalar> compute_multipacking(const vector<bool>& bits)
        {
            vector<Scalar> result;

            int chunks = bits.size() / Scalar::CAPACITY + (bits.size() % Scalar::CAPACITY == 0 ? 0 : 1);
            for(int i = 0; i < chunks; i++)
            {
                Scalar cur = Scalar::zero();
                Scalar coeff = Scalar::one();

                int chunk_end = (i+1)*Scalar::CAPACITY >= bits.size() ? bits.size() : (i+1)*Scalar::CAPACITY;
                for(int j = i*Scalar::CAPACITY; j < chunk_end; j++)
                {
                    if(bits[j])
                    {
                        cur = cur + coeff;
                    }

                    coeff = coeff.dbl();
                }

                result.push_back(cur);
            }

            return result;
        }

        string inputs_json(const vector<Scalar>& inputs)
        {
            string res = "[";

            for(int i = 0; i < inputs.size(); i++)
            {
                res.append("{\"data\":[");
                res.append(to_string(inputs[i].data[0]));
                res.push_back(',');
                res.append(to_string(inputs[i].data[1]));
                res.push_back(',');
                res.append(to_string(inputs[i].data[2]));
                res.push_back(',');
                res.append(to_string(inputs[i].data[3]));
                res.append("]}");
                if(i < inputs.size() - 1)
                {
                    res.push_back(',');
                }
            }

            res.push_back(']');

            return res;
        }

        string inputs_hexstr(const vector<Scalar>& inputs)
        {
            uint8_t s = inputs.size();
            string res = byte2str<1>(&s);

            for(int i = 0; i < inputs.size(); i++)
            {
                vector<unsigned char> s = inputs[i].to_bytes();
                for(auto c = s.begin(); c != s.end(); c++)
                {
                    uint8_t b = *c;
                    res += byte2str<1>(&b);
                }
            }

            return res;
        }
    } // namespace groth16

    namespace halo2
    {
        class Fp
        {
            public:

            /// INV = -(p^{-1} mod 2^64) mod 2^64
            static const uint64_t INV;
            /// p = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001
            static const Fp MODULUS;
            /// R = 2^256 mod p
            static const Fp R;
            /// R^2 = 2^512 mod p
            static const Fp R2;

            // members
            array<uint64_t, 4UL> data;

            Fp() : data({0, 0, 0, 0})
            {
            }
            Fp(const array<uint64_t, 4UL>& data) : data(data)
            {
            }
            Fp(const checksum256& cs) : data()
            {
                // convert big-endian checksum type to little-endian Fp type
                // which is used for merkle path calculation
                array<uint8_t, 32UL> ba = cs.extract_as_byte_array();
                mempcpy(this->data.data(), ba.data(), 32);
            }

            static Fp zero()
            {
                return Fp({0, 0, 0, 0});
            }
            static Fp one()
            {
                return R;
            }

            static Fp from_raw(const array<uint64_t, 4UL>& v)
            {
                return Fp(v).mul(R2);
            }
            static Fp from_raw(const uint64_t& d0, const uint64_t& d1, const uint64_t& d2, const uint64_t& d3)
            {
                return Fp({d0, d1, d2, d3}).mul(R2);
            }
            static Fp from_bool(const bool& bit)
            {
                return bit ? Fp::one() : Fp::zero();
            }
            static Fp from_u64(const uint64_t& val)
            {
                return Fp({val, 0, 0, 0}) * R2;
            }

            Fp square() const
            {
                uint64_t _, r0, r1, r2, r3, r4, r5, r6, r7, carry;
                tie(r1, carry) = mac(0, this->data[0], this->data[1], 0);
                tie(r2, carry) = mac(0, this->data[0], this->data[2], carry);
                tie(r3, r4)    = mac(0, this->data[0], this->data[3], carry);

                tie(r3, carry) = mac(r3, this->data[1], this->data[2], 0);
                tie(r4, r5)    = mac(r4, this->data[1], this->data[3], carry);

                tie(r5, r6)    = mac(r5, this->data[2], this->data[3], 0);

                r7 = r6 >> 63;
                r6 = (r6 << 1) | (r5 >> 63);
                r5 = (r5 << 1) | (r4 >> 63);
                r4 = (r4 << 1) | (r3 >> 63);
                r3 = (r3 << 1) | (r2 >> 63);
                r2 = (r2 << 1) | (r1 >> 63);
                r1 = r1 << 1;

                tie(r0, carry) = mac(0, this->data[0], this->data[0], 0);
                tie(r1, carry) = adc(0, r1, carry);
                tie(r2, carry) = mac(r2, this->data[1], this->data[1], carry);
                tie(r3, carry) = adc(0, r3, carry);
                tie(r4, carry) = mac(r4, this->data[2], this->data[2], carry);
                tie(r5, carry) = adc(0, r5, carry);
                tie(r6, carry) = mac(r6, this->data[3], this->data[3], carry);
                tie(r7, _)     = adc(0, r7, carry);

                return montgomery_reduce(r0, r1, r2, r3, r4, r5, r6, r7);
            }
            Fp add(const Fp& rhs) const
            {
                uint64_t _, d0, d1, d2, d3, borrow, carry;
                tie(d0, carry) = adc(this->data[0], rhs.data[0], 0);
                tie(d1, carry) = adc(this->data[1], rhs.data[1], carry);
                tie(d2, carry) = adc(this->data[2], rhs.data[2], carry);
                tie(d3, _)     = adc(this->data[3], rhs.data[3], carry);

                // Attempt to subtract the modulus, to ensure the value
                // is smaller than the modulus.
                return Fp({d0, d1, d2, d3}).sub(MODULUS);
            }
            Fp sub(const Fp& rhs) const
            {
                uint64_t _, d0, d1, d2, d3, borrow, carry;
                tie(d0, borrow) = sbb(this->data[0], rhs.data[0], 0);
                tie(d1, borrow) = sbb(this->data[1], rhs.data[1], borrow);
                tie(d2, borrow) = sbb(this->data[2], rhs.data[2], borrow);
                tie(d3, borrow) = sbb(this->data[3], rhs.data[3], borrow);

                // If underflow occurred on the final limb, borrow = 0xfff...fff, otherwise
                // borrow = 0x000...000. Thus, we use it as a mask to conditionally add the modulus.
                tie(d0, carry) = adc(d0, MODULUS.data[0] & borrow, 0);
                tie(d1, carry) = adc(d1, MODULUS.data[1] & borrow, carry);
                tie(d2, carry) = adc(d2, MODULUS.data[2] & borrow, carry);
                tie(d3, _)     = adc(d3, MODULUS.data[3] & borrow, carry);

                return Fp({d0, d1, d2, d3});
            }
            Fp mul(const Fp& rhs) const
            {
                // Schoolbook multiplication
                uint64_t r0, r1, r2, r3, r4, r5, r6, r7, carry;
                tie(r0, carry) = mac(0, this->data[0], rhs.data[0], 0);
                tie(r1, carry) = mac(0, this->data[0], rhs.data[1], carry);
                tie(r2, carry) = mac(0, this->data[0], rhs.data[2], carry);
                tie(r3, r4)    = mac(0, this->data[0], rhs.data[3], carry);

                tie(r1, carry) = mac(r1, this->data[1], rhs.data[0], 0);
                tie(r2, carry) = mac(r2, this->data[1], rhs.data[1], carry);
                tie(r3, carry) = mac(r3, this->data[1], rhs.data[2], carry);
                tie(r4, r5)    = mac(r4, this->data[1], rhs.data[3], carry);

                tie(r2, carry) = mac(r2, this->data[2], rhs.data[0], 0);
                tie(r3, carry) = mac(r3, this->data[2], rhs.data[1], carry);
                tie(r4, carry) = mac(r4, this->data[2], rhs.data[2], carry);
                tie(r5, r6)    = mac(r5, this->data[2], rhs.data[3], carry);

                tie(r3, carry) = mac(r3, this->data[3], rhs.data[0], 0);
                tie(r4, carry) = mac(r4, this->data[3], rhs.data[1], carry);
                tie(r5, carry) = mac(r5, this->data[3], rhs.data[2], carry);
                tie(r6, r7)    = mac(r6, this->data[3], rhs.data[3], carry);

                return Fp::montgomery_reduce(r0, r1, r2, r3, r4, r5, r6, r7);
            }
            Fp montgomery_reduce(const uint64_t& r0,
                                 const uint64_t& r1,
                                 const uint64_t& r2,
                                 const uint64_t& r3,
                                 const uint64_t& r4,
                                 const uint64_t& r5,
                                 const uint64_t& r6,
                                 const uint64_t& r7) const
            {
                // The Montgomery reduction here is based on Algorithm 14.32 in
                // Handbook of Applied Cryptography
                // <http://cacr.uwaterloo.ca/hac/about/chap14.pdf>.

                uint64_t _, rr0 = r0, rr1 = r1, rr2 = r2, rr3 = r3, rr4 = r4, rr5 = r5, rr6 = r6, rr7 = r7, carry, carry2;
                uint64_t k = rr0 * INV;
                tie(_,   carry) = mac(rr0, k, MODULUS.data[0], 0);
                tie(rr1, carry) = mac(rr1, k, MODULUS.data[1], carry);
                tie(rr2, carry) = mac(rr2, k, MODULUS.data[2], carry);
                tie(rr3, carry) = mac(rr3, k, MODULUS.data[3], carry);
                tie(rr4, carry2) = adc(rr4, 0, carry);

                k = rr1 * INV;
                tie(_,   carry) = mac(rr1, k, MODULUS.data[0], 0);
                tie(rr2, carry) = mac(rr2, k, MODULUS.data[1], carry);
                tie(rr3, carry) = mac(rr3, k, MODULUS.data[2], carry);
                tie(rr4, carry) = mac(rr4, k, MODULUS.data[3], carry);
                tie(rr5, carry2) = adc(rr5, carry2, carry);

                k = rr2 * INV;
                tie(_,   carry) = mac(rr2, k, MODULUS.data[0], 0);
                tie(rr3, carry) = mac(rr3, k, MODULUS.data[1], carry);
                tie(rr4, carry) = mac(rr4, k, MODULUS.data[2], carry);
                tie(rr5, carry) = mac(rr5, k, MODULUS.data[3], carry);
                tie(rr6, carry2) = adc(rr6, carry2, carry);

                k = rr3 * INV;
                tie(_,   carry) = mac(rr3, k, MODULUS.data[0], 0);
                tie(rr4, carry) = mac(rr4, k, MODULUS.data[1], carry);
                tie(rr5, carry) = mac(rr5, k, MODULUS.data[2], carry);
                tie(rr6, carry) = mac(rr6, k, MODULUS.data[3], carry);
                tie(rr7, _) = adc(rr7, carry2, carry);

                // Result may be within MODULUS of the correct value
                return (Fp({rr4, rr5, rr6, rr7})).sub(MODULUS);
            };

            Fp operator + (const Fp& rhs) const
            {
                return this->add(rhs);
            }
            Fp operator - (const Fp& rhs) const
            {
                return this->sub(rhs);
            }
            Fp operator * (const Fp& rhs) const
            {
                return this->mul(rhs);
            }
            bool operator== (const Fp &rhs) const
            {
                return this->data[0] == rhs.data[0] &&
                       this->data[1] == rhs.data[1] &&
                       this->data[2] == rhs.data[2] &&
                       this->data[3] == rhs.data[3];
            }
            bool is_zero() const
            {
                return *this == Fp::zero();
            }

            /// Computes the multiplicative inverse of this element,
            /// failing if the element is zero.
            Fp invert() const
            {
                return this->pow_vartime<4>({
                    0x992d30ecffffffff,
                    0x224698fc094cf91b,
                    0x0,
                    0x4000000000000000,
                });
            }

            template<size_t n> Fp pow_vartime(const array<uint64_t, n> exp) const
            {
                Fp res = Fp::one();
                bool found_one = false;
                for(int e = n-1; e >= 0; e--)
                {
                    for(int i = 63; i >= 0; i--)
                    {
                        if(found_one)
                        {
                            res = res.square();
                        }

                        if(((exp[e] >> i) & 1) == 1)
                        {
                            found_one = true;
                            res = res * *this;
                        }
                    }
                }
                return res;
            }
        };

        /// INV = -(p^{-1} mod 2^64) mod 2^64
        const uint64_t Fp::INV = 0x992d30ecffffffff;
        // R = 2^256 mod p
        const Fp Fp::R = Fp({
            0x34786d38fffffffd,
            0x992c350be41914ad,
            0xffffffffffffffff,
            0x3fffffffffffffff,
        });
        // R2 = R^2 = 2^512 mod p
        const Fp Fp::R2 = Fp({
            0x8c78ecb30000000f,
            0xd7d30dbd8b0de0e7,
            0x7797a99bc3c95d18,
            0x096d41af7b9cb714,
        });
        // p = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001
        const Fp Fp::MODULUS = Fp({
            0x992d30ed00000001,
            0x224698fc094cf91b,
            0x0000000000000000,
            0x4000000000000000,
        });

        class Ep;

        class EpAffine
        {
            public:

            Fp x;
            Fp y;

            EpAffine() : x(Fp::zero()), y(Fp::zero())
            {
            }

            EpAffine(const Fp& x, const Fp& y) : x(x), y(y)
            {
            }

            static EpAffine identity()
            {
                return EpAffine();
            }

            bool is_identity() const
            {
                return this->x.is_zero() && this->y.is_zero();
            }

            Ep to_curve() const;
        };

        class Ep
        {
            public:

            /// HashDomain Q for Sinsemilla hash function. This constant is created from the
            /// initializer string halo2_gadgets::sinsemilla::primitives::Q_PERSONALIZATION = "z.cash:SinsemillaQ"
            /// see primitives.rs: line 129
            static const Ep Q;

            Fp x;
            Fp y;
            Fp z;

            Ep() : x(Fp::zero()), y(Fp::zero()), z(Fp::zero())
            {
            }

            Ep(const Fp& x, const Fp& y, const Fp& z) : x(x), y(y), z(z)
            {
            }

            static Ep identity()
            {
                return Ep();
            }

            bool is_identity() const
            {
                return this->z.is_zero();
            }

            // rename 'double()' to 'dbl()' to avoid name conflict with primitive c++ type
            Ep dbl() const
            {
                // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#doubling-dbl-2009-l
                //
                // There are no points of order 2.

                if(this->is_identity())
                {
                    return Ep::identity();
                }

                Fp a = this->x.square();
                Fp b = this->y.square();
                Fp c = b.square();
                Fp d = this->x + b;
                   d = d.square();
                   d = d - a - c;
                   d = d + d;
                Fp e = a + a + a;
                Fp f = e.square();
                Fp z3 = this->z * this->y;
                   z3 = z3 + z3;
                Fp x3 = f - (d + d);
                   c = c + c;
                   c = c + c;
                   c = c + c;
                Fp y3 = e * (d - x3) - c;

                return Ep(x3, y3, z3);
            }
            Ep add(const Ep& rhs) const
            {
                if(this->is_identity())
                {
                    return rhs;
                }
                else if(rhs.is_identity())
                {
                    return *this;
                }
                else
                {
                    Fp z1z1 = this->z.square();
                    Fp z2z2 = rhs.z.square();
                    Fp u1 = this->x * z2z2;
                    Fp u2 = rhs.x * z1z1;
                    Fp s1 = this->y * z2z2 * rhs.z;
                    Fp s2 = rhs.y * z1z1 * this->z;

                    if(u1 == u2)
                    {
                        if(s1 == s2)
                        {
                            return this->dbl();
                        }
                        else
                        {
                            return Ep::identity();
                        }
                    }
                    else
                    {
                        Fp h = u2 - u1;
                        Fp i = (h + h).square();
                        Fp j = h * i;
                        Fp r = s2 - s1;
                           r = r + r;
                        Fp v = u1 * i;
                        Fp x3 = r.square() - j - v - v;
                           s1 = s1 * j;
                           s1 = s1 + s1;
                        Fp y3 = r * (v - x3) - s1;
                        Fp z3 = (this->z + rhs.z).square() - z1z1 - z2z2;
                           z3 = z3 * h;

                        return Ep(x3, y3, z3);
                    }
                }
            }
            Ep add(const EpAffine& rhs) const
            {
                if(this->is_identity())
                {
                    return rhs.to_curve();
                }
                else if(rhs.is_identity())
                {
                    return *this;
                }
                else
                {
                    Fp z1z1 = this->z.square();
                    Fp u2 = rhs.x * z1z1;
                    Fp s2 = rhs.y * z1z1 * this->z;

                    if(this->x == u2)
                    {
                        if(this->y == s2)
                        {
                            return this->dbl();
                        }
                        else
                        {
                            return Ep::identity();
                        }
                    }
                    else
                    {
                        Fp h = u2 - this->x;
                        Fp hh = h.square();
                        Fp i = hh + hh;
                           i = i + i;
                        Fp j = h * i;
                        Fp r = s2 - this->y;
                           r = r + r;
                        Fp v = this->x * i;
                        Fp x3 = r.square() - j - v - v;
                           j = this->y * j;
                           j = j + j;
                        Fp y3 = r * (v - x3) - j;
                        Fp z3 = (this->z + h).square() - z1z1 - hh;

                        return Ep(x3, y3, z3);
                    }
                }
            }
    
            Ep operator + (const Ep& rhs) const
            {
                return this->add(rhs);
            }
            Ep operator + (const EpAffine& rhs) const
            {
                return this->add(rhs);
            }

            EpAffine to_affine() const
            {
                Fp zinv = this->z.invert();
                Fp zinv2 = zinv.square();
                Fp x = this->x * zinv2;
                Fp zinv3 = zinv2 * zinv;
                Fp y = this->y * zinv3;

                if(zinv.is_zero())
                {
                    return EpAffine::identity();
                }
                else
                {
                    return EpAffine(x, y);
                }
            }
        };

        Ep EpAffine::to_curve() const
        {
            return Ep(
                this->x,
                this->y,
                this->is_identity() ? Fp::zero() : Fp::one()
            );
        }

        /// HashDomain Q for Sinsemilla hash function. This constant is created from the
        /// initializer string halo2_gadgets::sinsemilla::primitives::Q_PERSONALIZATION = "z.cash:SinsemillaQ"
        /// see primitives.rs: line 129
        const Ep Ep::Q = Ep(
            Fp({0x67B76299266CB8D4, 0xD0D128C329E581C0, 0x6244657A3F4F6094, 0x0D43CFCDAE22562B}),
            Fp({0xBE93D15A29027311, 0xBDC9E25C08B4AB5B, 0xC0FBDB629781BA9A, 0x284D126C4C96B56C}),
            Fp({0xF24E7313E8A108F1, 0x3A1046C9E8EF2B9A, 0x49956F05DFCA8041, 0x0B57E97EF8C4E060})
        );

        struct instance
        {
            virtual vector<Fp> to_halo2_instance() const = 0;
        };

        string serialize_instances(vector<const instance*> instances)
        {
            string inputs = "";
            if(instances.size() == 0)
                return inputs;
            vector<Fp> ins = instances[0]->to_halo2_instance();
            uint8_t n = ins.size(); // the length of the very inner vector is the number of input field elements
            inputs.append(byte2str<1>(&n));

            for(int i = 0; i < n; i++)
            {
                inputs.append(byte2str<32>(reinterpret_cast<uint8_t*>(ins[i].data.data())));
            }

            for(int j = 1; j < instances.size(); j++)
            {
                ins = instances[j]->to_halo2_instance();
                for(int i = 0; i < n; i++)
                {
                    inputs.append(byte2str<32>(reinterpret_cast<uint8_t*>(ins[i].data.data())));
                }
            }

            return inputs;
        }

    } // namespace halo2
} // namespace zeos

using namespace zeosio;

struct zinstance : halo2::instance
{
    checksum256 anchor;
    checksum256 nf;
    checksum256 rk_x;
    checksum256 rk_y;
    bool nft;
    uint64_t b_d1;
    uint64_t b_d2;
    uint64_t b_sc;
    uint64_t c_d1;
    checksum256 cmb;
    checksum256 cmc;
    uint64_t accb;
    uint64_t accc;

    vector<halo2::Fp> to_halo2_instance() const
    {
        vector<halo2::Fp> vec;
        //const uint64_t* d = reinterpret_cast<const uint64_t*>(anchor.data());
        //vec.push_back(halo2::Fp({d[0], d[1], d[2], d[3]}));
        array<uint8_t, 32UL> ba = anchor.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        ba = nf.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        ba = rk_x.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        ba = rk_y.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        vec.push_back(halo2::Fp::from_bool(nft));
        vec.push_back(halo2::Fp::from_u64(b_d1));
        vec.push_back(halo2::Fp::from_u64(b_d2));
        vec.push_back(halo2::Fp::from_u64(b_sc));
        vec.push_back(halo2::Fp::from_u64(c_d1));
        ba = cmb.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        ba = cmc.extract_as_byte_array();
        vec.push_back(halo2::Fp({*(uint64_t*)&ba[0], *(uint64_t*)&ba[8], *(uint64_t*)&ba[16], *(uint64_t*)&ba[24]}));
        vec.push_back(halo2::Fp::from_u64(accb));
        vec.push_back(halo2::Fp::from_u64(accc));
        return vec;
    }

    EOSLIB_SERIALIZE(zinstance, (anchor)(nf)(rk_x)(rk_y)(nft)(b_d1)(b_d2)(b_sc)(c_d1)(cmb)(cmc)(accb)(accc))
};

// ZEOS action types
#define ZA_DUMMY        0xDEADBEEFDEADBEEF  // dummy action that indicates zactions to be validated/executed
#define ZA_NULL         0x0                 // NULL OP - do nothing (verify proof only)
#define ZA_MINTFT       0x1
#define ZA_MINTNFT      0x2
#define ZA_MINTAUTH     0x3
#define ZA_TRANSFERFT   0x4
#define ZA_TRANSFERNFT  0x5
#define ZA_BURNFT       0x6
#define ZA_BURNFT2      0x7
#define ZA_BURNNFT      0x8
#define ZA_BURNAUTH     0x9

// size of zinstances in num of bytes
#define ZI_SIZE (32 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 32 + 32 + 8 + 8)

struct zaction
{
    uint64_t type;
    zinstance ins;
    string memo;

    EOSLIB_SERIALIZE(zaction, (type)(ins)(memo))
};

#ifndef THEZEOSTOKEN_HEADER_FILE
CONTRACT thezeostoken : public contract
{
    public:

    thezeostoken(name self,
                 name code,
                 datastream<const char *> ds);

    ACTION verifyproof(const string& type,
                       const name& code,
                       const name& id,
                       const string& proof,
                       const string& inputs);
    using verifyproof_action = action_wrapper<"verifyproof"_n, &thezeostoken::verifyproof>;
};
#endif