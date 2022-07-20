#pragma once

#include <vector>
#include <tuple>
#include <array>
#include <eosio/eosio.hpp>
#include "blake2s.h"

using namespace std;

namespace zeos
{
    namespace groth16
    {

        // helper from zeos-bellman/inc/groth16/bls12_381/util.hpp needed by Scalar
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

        // from: https://stackoverflow.com/a/47526992/2340535
        // adjusted to C types
        string BytesArrayToHexString(uint8_t* src)
        {
            const uint8_t n = 8;
            static const char table[] = "0123456789ABCDEF";
            char dst[2 * n + 1];
            const uint8_t* srcPtr = src;
            char* dstPtr = dst;
            for (auto count = n; count > 0; --count)
            {
                unsigned char c = *srcPtr++;
                *dstPtr++ = table[c >> 4];
                *dstPtr++ = table[c & 0x0f];
            }
            *dstPtr = 0;
            return &dst[0];
        }

        string inputs_hexstr(const vector<Scalar>& inputs)
        {
            static const char table[] = "0123456789ABCDEF";
            char dst[3];
            char* dstPtr = dst;
            unsigned char c = inputs.size();
            *dstPtr++ = table[c >> 4];
            *dstPtr++ = table[c & 0x0f];
            *dstPtr = 0;

            string res = dst;

            for(int i = 0; i < inputs.size(); i++)
            {
                // cast from: https://stackoverflow.com/a/53807122/2340535
                uint64_t proper_endian_uint64 = inputs[i].data[0];
                uint8_t (&array_of_bytes0)[sizeof(uint64_t)] = *reinterpret_cast<uint8_t(*)[sizeof(uint64_t)]>(&proper_endian_uint64);
                res.append(BytesArrayToHexString(array_of_bytes0));

                proper_endian_uint64 = inputs[i].data[1];
                uint8_t (&array_of_bytes1)[sizeof(uint64_t)] = *reinterpret_cast<uint8_t(*)[sizeof(uint64_t)]>(&proper_endian_uint64);
                res.append(BytesArrayToHexString(array_of_bytes1));

                proper_endian_uint64 = inputs[i].data[2];
                uint8_t (&array_of_bytes2)[sizeof(uint64_t)] = *reinterpret_cast<uint8_t(*)[sizeof(uint64_t)]>(&proper_endian_uint64);
                res.append(BytesArrayToHexString(array_of_bytes2));

                proper_endian_uint64 = inputs[i].data[3];
                uint8_t (&array_of_bytes3)[sizeof(uint64_t)] = *reinterpret_cast<uint8_t(*)[sizeof(uint64_t)]>(&proper_endian_uint64);
                res.append(BytesArrayToHexString(array_of_bytes3));
            }

            return res;
        }
    } // namespace groth16
} // namespace zeos