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

#include "cppgen/attacks.hpp"

namespace cppgen
{
namespace attacks
{
namespace magics
{
constexpr std::uint64_t rook[64] = {
    0xa8002c000108020ULL,  0x6c00049b0002001ULL,  0x100200010090040ULL,  0x2480041000800801ULL,
    0x280028004000800ULL,  0x900410008040022ULL,  0x280020001001080ULL,  0x2880002041000080ULL,
    0xa000800080400034ULL, 0x4808020004000ULL,    0x2290802004801000ULL, 0x411000d00100020ULL,
    0x402800800040080ULL,  0xb000401004208ULL,    0x2409000100040200ULL, 0x1002100004082ULL,
    0x22878001e24000ULL,   0x1090810021004010ULL, 0x801030040200012ULL,  0x500808008001000ULL,
    0xa08018014000880ULL,  0x8000808004000200ULL, 0x201008080010200ULL,  0x801020000441091ULL,
    0x800080204005ULL,     0x1040200040100048ULL, 0x120200402082ULL,     0xd14880480100080ULL,
    0x12040280080080ULL,   0x100040080020080ULL,  0x9020010080800200ULL, 0x813241200148449ULL,
    0x491604001800080ULL,  0x100401000402001ULL,  0x4820010021001040ULL, 0x400402202000812ULL,
    0x209009005000802ULL,  0x810800601800400ULL,  0x4301083214000150ULL, 0x204026458e001401ULL,
    0x40204000808000ULL,   0x8001008040010020ULL, 0x8410820820420010ULL, 0x1003001000090020ULL,
    0x804040008008080ULL,  0x12000810020004ULL,   0x1000100200040208ULL, 0x430000a044020001ULL,
    0x280009023410300ULL,  0xe0100040002240ULL,   0x200100401700ULL,     0x2244100408008080ULL,
    0x8000400801980ULL,    0x2000810040200ULL,    0x8010100228810400ULL, 0x2000009044210200ULL,
    0x4080008040102101ULL, 0x40002080411d01ULL,   0x2005524060000901ULL, 0x502001008400422ULL,
    0x489a000810200402ULL, 0x1004400080a13ULL,    0x4000011008020084ULL, 0x26002114058042ULL};

constexpr std::uint64_t bishop[64] = {
    0x89a1121896040240ULL, 0x2004844802002010ULL, 0x2068080051921000ULL, 0x62880a0220200808ULL,
    0x4042004000000ULL,    0x100822020200011ULL,  0xc00444222012000aULL, 0x28808801216001ULL,
    0x400492088408100ULL,  0x201c401040c0084ULL,  0x840800910a0010ULL,   0x82080240060ULL,
    0x2000840504006000ULL, 0x30010c4108405004ULL, 0x1008005410080802ULL, 0x8144042209100900ULL,
    0x208081020014400ULL,  0x4800201208ca00ULL,   0xf18140408012008ULL,  0x1004002802102001ULL,
    0x841000820080811ULL,  0x40200200a42008ULL,   0x800054042000ULL,     0x88010400410c9000ULL,
    0x520040470104290ULL,  0x1004040051500081ULL, 0x2002081833080021ULL, 0x400c00c010142ULL,
    0x941408200c002000ULL, 0x658810000806011ULL,  0x188071040440a00ULL,  0x4800404002011c00ULL,
    0x104442040404200ULL,  0x511080202091021ULL,  0x4022401120400ULL,    0x80c0040400080120ULL,
    0x8040010040820802ULL, 0x480810700020090ULL,  0x102008e00040242ULL,  0x809005202050100ULL,
    0x8002024220104080ULL, 0x431008804142000ULL,  0x19001802081400ULL,   0x200014208040080ULL,
    0x3308082008200100ULL, 0x41010500040c020ULL,  0x4012020c04210308ULL, 0x208220a202004080ULL,
    0x111040120082000ULL,  0x6803040141280a00ULL, 0x2101004202410000ULL, 0x8200000041108022ULL,
    0x21082088000ULL,      0x2410204010040ULL,    0x40100400809000ULL,   0x822088220820214ULL,
    0x40808090012004ULL,   0x910224040218c9ULL,   0x402814422015008ULL,  0x90014004842410ULL,
    0x1000042304105ULL,    0x10008830412a00ULL,   0x2520081090008908ULL, 0x40102000a0a60140ULL,
};

constexpr int rookBits[64] = {12, 11, 11, 11, 11, 11, 11, 12, 11, 10, 10, 10, 10, 10, 10, 11,
                              11, 10, 10, 10, 10, 10, 10, 11, 11, 10, 10, 10, 10, 10, 10, 11,
                              11, 10, 10, 10, 10, 10, 10, 11, 11, 10, 10, 10, 10, 10, 10, 11,
                              11, 10, 10, 10, 10, 10, 10, 11, 12, 11, 11, 11, 11, 11, 11, 12};

constexpr int bishopBits[64] = {6, 5, 5, 5, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7,
                                5, 5, 5, 5, 7, 9, 9, 7, 5, 5, 5, 5, 7, 9, 9, 7, 5, 5, 5, 5, 7, 7,
                                7, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 6};
}  // namespace magics

static constexpr Bitboard moveWest(Bitboard bb, int n)
{
  for (int i = 0; i < n; i++) {
    bb = ((bb >> 1) & (~Bitboards::FileH));
  }
  return bb;
}
static constexpr Bitboard moveEast(Bitboard bb, int n)
{
  for (int i = 0; i < n; i++) {
    bb = ((bb << 1) & (~Bitboards::FileA));
  }
  return bb;
}

class Rays
{
public:
  auto& operator[](Direction d)
  {
    return mRays[makeIndex(d)];
  }
  auto const& operator[](Direction d) const
  {
    return mRays[makeIndex(d)];
  }

private:
  Bitboard mRays[makeIndex(Direction::Count)][64];
};

static Rays     _rays;
static Bitboard _nonSlidingAttacks[2][6][64] = {};
static Bitboard _rookTable[64][4096]         = {};
static Bitboard _bishopTable[64][1024]       = {};
static Bitboard _rookMasks[64]               = {};
static Bitboard _bishopMasks[64]             = {};
static Bitboard _libeBBs[64][64]             = {};

static void precomputeRays();
static void initPawnAttacks();
static void initKnightAttacks();
static void initKingAttacks();
static void initRookMagicTable();
static void initBishopMagicTable();
static void initRookMasks();
static void initBishopMasks();

static Bitboard getRookAttacksSlow(int square, Bitboard blockers);
static Bitboard getBishopAttacksSlow(int square, Bitboard blockers);
static Bitboard getRookAttacks(int square, Bitboard blockers);
static Bitboard getBishopAttacks(int square, Bitboard blockers);
static Bitboard getBlockersFromIndex(int index, Bitboard blockerMask);
static Bitboard getRayForSquare(Direction d, int square)
{
  return _rays[d][square];
}

// -------------------------------------------------------------------------------------------------
void precomputeTables()
{
  precomputeRays();

  initPawnAttacks();
  initKnightAttacks();
  initKingAttacks();

  initRookMasks();
  initBishopMasks();

  initRookMagicTable();
  initBishopMagicTable();

  for (Square s1 = Square::A1; s1 <= Square::H8; ++s1) {
    for (auto&& pt : {Piece::Bishop, Piece::Rook}) {
      for (Square s2 = Square::A1; s2 <= Square::H8; ++s2) {
        if (getSlidingAttacks(pt, s1, Bitboard{}) & s2) {
          _libeBBs[makeIndex(s1)][makeIndex(s2)] =
              ((getSlidingAttacks(pt, s1, Bitboard{}) & getSlidingAttacks(pt, s2, Bitboard{})) | s1) |
              s2;
        }
      }
    }
  }
}
// -------------------------------------------------------------------------------------------------
void precomputeRays()
{
  for (auto sq = 0; sq < 64; ++sq) {
    auto const file = static_cast<int>(getFile(makeSquare(sq)));
    auto const rank = static_cast<int>(getRank(makeSquare(sq)));
    // clang-format off
    _rays[Direction::North][sq]     = Bitboard{0x0101010101010100ULL} << sq;
    _rays[Direction::South][sq]     = Bitboard{0x0080808080808080ULL} >> (63 - sq);
    _rays[Direction::East][sq]      = Bitboard{2 * ((1ULL << (sq | 7)) - (1ULL << sq))};
    _rays[Direction::West][sq]      = Bitboard{(1ULL << sq) - (1ULL << (sq & 56))};
    _rays[Direction::NorthEast][sq] = moveEast(Bitboard{0x8040201008040200ULL},     file) << (     rank  * 8);
    _rays[Direction::SouthEast][sq] = moveEast(Bitboard{0x0002040810204080ULL},     file) >> ((7 - rank) * 8);
    _rays[Direction::NorthWest][sq] = moveWest(Bitboard{0x0102040810204000ULL}, 7 - file) << (     rank  * 8);
    _rays[Direction::SouthWest][sq] = moveWest(Bitboard{0x0040201008040201ULL}, 7 - file) >> ((7 - rank) * 8);
    // clang-format on
  }
}

// -------------------------------------------------------------------------------------------------
Bitboard getLineBetween(Square s1, Square s2)
{
  return _libeBBs[makeIndex(s1)][makeIndex(s2)];
}
// -------------------------------------------------------------------------------------------------
Bitboard getNonSlidingAttacks(Piece piece, Square from, Color color)
{
  return _nonSlidingAttacks[color][piece][makeIndex(from)];
}
// -------------------------------------------------------------------------------------------------
Bitboard getSlidingAttacks(Piece piece, Square from, Bitboard blockers)
{
  switch (piece) {
    case Piece::Bishop:
      return getBishopAttacks(makeIndex(from), blockers);
    case Piece::Rook:
      return getRookAttacks(makeIndex(from), blockers);
    case Piece::Queen:
      return getBishopAttacks(makeIndex(from), blockers) | getRookAttacks(makeIndex(from), blockers);
    case Piece::King:
    case Piece::Pawn:
    case Piece::Knight:
    case Piece::Count:
    default:
      eosio::check(false,  "Not a sliding piece");
  }
}
// -------------------------------------------------------------------------------------------------
void initPawnAttacks()
{
  for (int i = 0; i < 64; i++) {
    auto const start = Bitboard{1ULL << i};

    auto const whiteAttackBb = ((start << 9) & ~Bitboards::FileA) | ((start << 7) & ~Bitboards::FileH);
    auto const blackAttackBb = ((start >> 9) & ~Bitboards::FileH) | ((start >> 7) & ~Bitboards::FileA);

    _nonSlidingAttacks[Color::White][Piece::Pawn][i] = Bitboard{whiteAttackBb};
    _nonSlidingAttacks[Color::Black][Piece::Pawn][i] = Bitboard{blackAttackBb};
  }
}
// -------------------------------------------------------------------------------------------------
void initKnightAttacks()
{
  for (int i = 0; i < 64; i++) {
    auto const start = Bitboard{1ULL << i};

    auto const attackBb =
        (((start << 15) | (start >> 17)) & ~Bitboards::FileH) |                      // Left 1
        (((start >> 15) | (start << 17)) & ~Bitboards::FileA) |                      // Right 1
        (((start << 6) | (start >> 10)) & ~(Bitboards::FileG | Bitboards::FileH)) |  // Left 2
        (((start >> 6) | (start << 10)) & ~(Bitboards::FileA | Bitboards::FileB));   // Right 2

    _nonSlidingAttacks[Color::White][Piece::Knight][i] =
        _nonSlidingAttacks[Color::Black][Piece::Knight][i] = Bitboard{attackBb};
  }
}
// -------------------------------------------------------------------------------------------------
void initKingAttacks()
{
  for (int i = 0; i < 64; i++) {
    auto const start = Bitboard{1ULL << i};

    auto const attackBb = (((start << 7) | (start >> 9) | (start >> 1)) & (~Bitboards::FileH)) |
                          (((start << 9) | (start >> 7) | (start << 1)) & (~Bitboards::FileA)) |
                          ((start >> 8) | (start << 8));

    _nonSlidingAttacks[Color::White][Piece::King][i] =
        _nonSlidingAttacks[Color::Black][Piece::King][i] = Bitboard{attackBb};
  }
}
// -------------------------------------------------------------------------------------------------
void initRookMagicTable()
{
  // For all squares
  for (auto square = 0; square < 64; ++square) {
    // For all possible blockers for this square
    for (int blockerIndex = 0; blockerIndex < (1 << magics::rookBits[square]); blockerIndex++) {
      auto const blockers = getBlockersFromIndex(blockerIndex, _rookMasks[square]);
      auto const hash = (blockers.getBits() * magics::rook[square]) >> (64 - magics::rookBits[square]);
      _rookTable[square][hash] = getRookAttacksSlow(square, blockers);
    }
  }
}
// -------------------------------------------------------------------------------------------------
void initBishopMagicTable()
{
  // For all squares
  for (auto square = 0; square < 64; ++square) {
    // For all possible blockers for this square
    for (int blockerIndex = 0; blockerIndex < (1 << magics::bishopBits[square]); blockerIndex++) {
      auto const blockers = getBlockersFromIndex(blockerIndex, _bishopMasks[square]);
      auto const hash =
          (blockers.getBits() * magics::bishop[square]) >> (64 - magics::bishopBits[square]);
      _bishopTable[square][hash] = getBishopAttacksSlow(square, blockers);
    }
  }
}
// -------------------------------------------------------------------------------------------------
void initRookMasks()
{
  for (auto square = 0; square < 64; ++square) {
    _rookMasks[square] = (getRayForSquare(Direction::North, square) & ~Bitboards::Rank8) |
                         (getRayForSquare(Direction::South, square) & ~Bitboards::Rank1) |
                         (getRayForSquare(Direction::East, square) & ~Bitboards::FileH) |
                         (getRayForSquare(Direction::West, square) & ~Bitboards::FileA);
  }
}
// -------------------------------------------------------------------------------------------------
void initBishopMasks()
{
  auto const edges = Bitboards::FileA | Bitboards::FileH | Bitboards::Rank1 | Bitboards::Rank8;
  for (auto square = 0; square < 64; ++square) {
    _bishopMasks[square] = getRayForSquare(Direction::NorthEast, square) |
                           getRayForSquare(Direction::NorthWest, square) |
                           getRayForSquare(Direction::SouthEast, square) |
                           getRayForSquare(Direction::SouthWest, square);

    _bishopMasks[square] = _bishopMasks[square] & ~edges;
  }
}
// -------------------------------------------------------------------------------------------------
Bitboard getRookAttacksSlow(int square, Bitboard blockers)
{
  auto getAttacks = [square, blockers](Direction d, auto f) {
    auto       attacks        = getRayForSquare(d, square);
    auto const maskedBlockers = attacks & blockers;
    if (maskedBlockers) {
      attacks &= ~getRayForSquare(d, (maskedBlockers.*f)());
    }
    return attacks;
  };

  Bitboard attacks{};

  attacks |= getAttacks(Direction::North, &Bitboard::bsf);
  attacks |= getAttacks(Direction::South, &Bitboard::bsr);
  attacks |= getAttacks(Direction::East, &Bitboard::bsf);
  attacks |= getAttacks(Direction::West, &Bitboard::bsr);

  return attacks;
}
// -------------------------------------------------------------------------------------------------
Bitboard getBishopAttacksSlow(int square, Bitboard blockers)
{
  auto getAttacks = [square, blockers](Direction d, auto f) {
    auto       attacks        = getRayForSquare(d, square);
    auto const maskedBlockers = attacks & blockers;
    if (maskedBlockers) {
      attacks &= ~getRayForSquare(d, (maskedBlockers.*f)());
    }
    return attacks;
  };

  Bitboard attacks{};

  attacks |= getAttacks(Direction::NorthWest, &Bitboard::bsf);
  attacks |= getAttacks(Direction::NorthEast, &Bitboard::bsf);
  attacks |= getAttacks(Direction::SouthWest, &Bitboard::bsr);
  attacks |= getAttacks(Direction::SouthEast, &Bitboard::bsr);

  return attacks;
}
// -------------------------------------------------------------------------------------------------
Bitboard getRookAttacks(int square, Bitboard blockers)
{
  blockers &= _rookMasks[square];
  auto const key = (blockers.getBits() * magics::rook[square]) >> (64 - magics::rookBits[square]);
  return _rookTable[square][key];
}
// -------------------------------------------------------------------------------------------------
Bitboard getBishopAttacks(int square, Bitboard blockers)
{
  blockers &= _bishopMasks[square];
  auto const key = (blockers.getBits() * magics::bishop[square]) >> (64 - magics::bishopBits[square]);
  return _bishopTable[square][key];
}
// -------------------------------------------------------------------------------------------------
Bitboard getBlockersFromIndex(int index, Bitboard blockerMask)
{
  auto blockers = Bitboard{};
  auto bits     = blockerMask.popCount();
  for (auto i = 0; i < bits; i++) {
    int bitPos = blockerMask.popLsb();
    if (index & (1 << i)) {
      blockers.setBit(bitPos);
    }
  }
  return blockers;
}
}  // namespace attacks
}  // namespace cppgen
