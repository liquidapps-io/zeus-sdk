//
// Copyright (C) 2019-2019 markhc
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

#pragma once

#include <cstdint>
#include "platform.hpp"
#include "types.hpp"

namespace cppgen
{
class Bitboard
{
  friend constexpr Bitboard operator<<(Bitboard bb, std::uint32_t n);
  friend constexpr Bitboard operator>>(Bitboard bb, std::uint32_t n);
  friend constexpr Bitboard operator&(Bitboard a, Bitboard b);
  friend constexpr Bitboard operator|(Bitboard a, Bitboard b);
  friend constexpr Bitboard operator^(Bitboard a, Bitboard b);
  friend constexpr Bitboard operator~(Bitboard a);
  friend constexpr Bitboard operator&(Bitboard b, Square s);
  friend constexpr Bitboard operator|(Bitboard b, Square s);
  friend constexpr Bitboard operator^(Bitboard b, Square s);
  friend constexpr Bitboard operator*(Bitboard b, std::uint64_t m);

public:
  constexpr Bitboard();
  constexpr explicit Bitboard(std::uint64_t bb);

  static Bitboard getLineBetween(Square a, Square b);

  constexpr explicit  operator bool() const;
  constexpr Bitboard& operator<<=(std::uint32_t n);
  constexpr Bitboard& operator>>=(std::uint32_t n);
  constexpr Bitboard& operator&=(Bitboard b);
  constexpr Bitboard& operator|=(Bitboard b);
  constexpr Bitboard& operator^=(Bitboard b);
  constexpr Bitboard& operator&=(Square s);
  constexpr Bitboard& operator|=(Square s);
  constexpr Bitboard& operator^=(Square s);

  constexpr Bitboard shiftTowards(Direction d) const;

  constexpr std::uint64_t getBits() const
  {
    return bits;
  }
  constexpr bool isZero() const
  {
    return bits == 0;
  }
  constexpr void clear()
  {
    bits = 0;
  }
  constexpr void setBit(int index)
  {
    bits |= 1ULL << index;
  }
  constexpr void clearBit(int index)
  {
    bits &= ~(1ULL << index);
  }
  constexpr void setBit(Square s)
  {
    bits |= 1ULL << makeIndex(s);
  }
  constexpr void clearBit(Square s)
  {
    bits &= ~(1ULL << makeIndex(s));
  }
  constexpr bool moreThanOne() const
  {
    return bits & (bits - 1);
  }

  int popCount() const
  {
    return static_cast<int>(intrin_popcount(bits));
  }
  int bsf() const
  {
    if (isZero()) {
      return -1;
    }
    return intrin_forward_scan(bits) - 1;
  }
  int bsr() const
  {
    if (isZero()) {
      return -1;
    }
    return 63 - intrin_reverse_scan(bits);
  }
  int popLsb()
  {
    int lsbIndex = intrin_forward_scan(bits) - 1;
    bits &= bits - 1;
    return lsbIndex;
  }

private:
  std::uint64_t bits;
};

constexpr Bitboard::Bitboard() : bits(0)
{
}
constexpr Bitboard::Bitboard(std::uint64_t bb) : bits(bb)
{
}
constexpr Bitboard::operator bool() const
{
  return bits != 0;
}
constexpr Bitboard& Bitboard::operator<<=(std::uint32_t n)
{
  return (*this = *this << n);
}
constexpr Bitboard& Bitboard::operator>>=(std::uint32_t n)
{
  return (*this = *this >> n);
}
constexpr Bitboard& Bitboard::operator&=(Bitboard b)
{
  return (*this = *this & b);
}
constexpr Bitboard& Bitboard::operator|=(Bitboard b)
{
  return (*this = *this | b);
}
constexpr Bitboard& Bitboard::operator^=(Bitboard b)
{
  return (*this = *this ^ b);
}
constexpr Bitboard& Bitboard::operator&=(Square s)
{
  return (*this = *this & s);
}
constexpr Bitboard& Bitboard::operator|=(Square s)
{
  return (*this = *this | s);
}
constexpr Bitboard& Bitboard::operator^=(Square s)
{
  return (*this = *this ^ s);
}
constexpr Bitboard operator<<(Bitboard bb, std::uint32_t n)
{
  return Bitboard{bb.bits << n};
}
constexpr Bitboard operator>>(Bitboard bb, std::uint32_t n)
{
  return Bitboard{bb.bits >> n};
}
constexpr Bitboard operator&(Bitboard a, Bitboard b)
{
  return Bitboard{a.bits & b.bits};
}
constexpr Bitboard operator|(Bitboard a, Bitboard b)
{
  return Bitboard{a.bits | b.bits};
}
constexpr Bitboard operator^(Bitboard a, Bitboard b)
{
  return Bitboard{a.bits ^ b.bits};
}
constexpr Bitboard operator~(Bitboard a)
{
  return Bitboard{~a.bits};
}
constexpr Bitboard operator*(Bitboard b, std::uint64_t m)
{
  return Bitboard{b.bits * m};
}

constexpr Bitboard SquareBB[64] = {
    Bitboard{1ULL << 0},  Bitboard{1ULL << 1},  Bitboard{1ULL << 2},  Bitboard{1ULL << 3},
    Bitboard{1ULL << 4},  Bitboard{1ULL << 5},  Bitboard{1ULL << 6},  Bitboard{1ULL << 7},
    Bitboard{1ULL << 8},  Bitboard{1ULL << 9},  Bitboard{1ULL << 10}, Bitboard{1ULL << 11},
    Bitboard{1ULL << 12}, Bitboard{1ULL << 13}, Bitboard{1ULL << 14}, Bitboard{1ULL << 15},
    Bitboard{1ULL << 16}, Bitboard{1ULL << 17}, Bitboard{1ULL << 18}, Bitboard{1ULL << 19},
    Bitboard{1ULL << 20}, Bitboard{1ULL << 21}, Bitboard{1ULL << 22}, Bitboard{1ULL << 23},
    Bitboard{1ULL << 24}, Bitboard{1ULL << 25}, Bitboard{1ULL << 26}, Bitboard{1ULL << 27},
    Bitboard{1ULL << 28}, Bitboard{1ULL << 29}, Bitboard{1ULL << 30}, Bitboard{1ULL << 31},
    Bitboard{1ULL << 32}, Bitboard{1ULL << 33}, Bitboard{1ULL << 34}, Bitboard{1ULL << 35},
    Bitboard{1ULL << 36}, Bitboard{1ULL << 37}, Bitboard{1ULL << 38}, Bitboard{1ULL << 39},
    Bitboard{1ULL << 40}, Bitboard{1ULL << 41}, Bitboard{1ULL << 42}, Bitboard{1ULL << 43},
    Bitboard{1ULL << 44}, Bitboard{1ULL << 45}, Bitboard{1ULL << 46}, Bitboard{1ULL << 47},
    Bitboard{1ULL << 48}, Bitboard{1ULL << 49}, Bitboard{1ULL << 50}, Bitboard{1ULL << 51},
    Bitboard{1ULL << 52}, Bitboard{1ULL << 53}, Bitboard{1ULL << 54}, Bitboard{1ULL << 55},
    Bitboard{1ULL << 56}, Bitboard{1ULL << 57}, Bitboard{1ULL << 58}, Bitboard{1ULL << 59},
    Bitboard{1ULL << 60}, Bitboard{1ULL << 61}, Bitboard{1ULL << 62}, Bitboard{1ULL << 63},
};

constexpr Bitboard operator&(Bitboard b, Square s)
{
  return b & SquareBB[makeIndex(s)];
}
constexpr Bitboard operator|(Bitboard b, Square s)
{
  return b | SquareBB[makeIndex(s)];
}
constexpr Bitboard operator^(Bitboard b, Square s)
{
  return b ^ SquareBB[makeIndex(s)];
}

namespace Bitboards
{
constexpr Bitboard AllSquares  = ~Bitboard(0);
constexpr Bitboard DarkSquares = Bitboard{0xAA55AA55AA55AA55ULL};
constexpr Bitboard FileA       = Bitboard{0x0101010101010101ULL};
constexpr Bitboard FileB       = FileA << 1;
constexpr Bitboard FileC       = FileA << 2;
constexpr Bitboard FileD       = FileA << 3;
constexpr Bitboard FileE       = FileA << 4;
constexpr Bitboard FileF       = FileA << 5;
constexpr Bitboard FileG       = FileA << 6;
constexpr Bitboard FileH       = FileA << 7;
constexpr Bitboard Rank1       = Bitboard{0xFF};
constexpr Bitboard Rank2       = Rank1 << (8 * 1);
constexpr Bitboard Rank3       = Rank1 << (8 * 2);
constexpr Bitboard Rank4       = Rank1 << (8 * 3);
constexpr Bitboard Rank5       = Rank1 << (8 * 4);
constexpr Bitboard Rank6       = Rank1 << (8 * 5);
constexpr Bitboard Rank7       = Rank1 << (8 * 6);
constexpr Bitboard Rank8       = Rank1 << (8 * 7);
}  // namespace Bitboards

constexpr Bitboard Bitboard::shiftTowards(Direction d) const
{
  switch (d) {
    case Direction::North:
      return Bitboard{bits << 8};
    case Direction::South:
      return Bitboard{bits >> 8};
    case Direction::East:
      return Bitboard{(bits & ~Bitboards::FileH.bits) << 1};
    case Direction::West:
      return Bitboard{(bits & ~Bitboards::FileA.bits) >> 1};
    case Direction::NorthEast:
      return Bitboard{(bits & ~Bitboards::FileH.bits) << 9};
    case Direction::NorthWest:
      return Bitboard{(bits & ~Bitboards::FileA.bits) << 7};
    case Direction::SouthEast:
      return Bitboard{(bits & ~Bitboards::FileH.bits) >> 7};
    case Direction::SouthWest:
      return Bitboard{(bits & ~Bitboards::FileA.bits) >> 9};
    case Direction::Count:
    default:
      return Bitboard{};
  }
}
}  // namespace cppgen
