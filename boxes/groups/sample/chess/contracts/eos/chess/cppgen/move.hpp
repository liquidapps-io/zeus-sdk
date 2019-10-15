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

#include <string_view>

#include "types.hpp"

namespace cppgen
{
class Move
{
public:
  enum Type : short {
    Normal,
    Promotion,
    Castling,
    EnPassant,
  };

private:
  Move(CastleSide side);
  Move(Square from, Square to, Type type);
  Move(Square from, Square to, Piece promotedTo);

public:
  Move();

  static Move makeMove(Square from, Square to);
  static Move makePromotion(Square from, Square to, Piece promotedTo);
  static Move makeEnPassant(Square from, Square to);
  static Move makeCastling(CastleSide side);

  Type       getType() const;
  Square     fromSquare() const;
  Square     toSquare() const;
  bool       isPromotion() const;
  bool       isCastling() const;
  CastleSide getCastleSide() const;
  bool       isEnPassant() const;
  Piece      promotedTo() const;

  static int notationToIndex(std::string_view notation)
  {
    return static_cast<int>(makeSquare(File(notation[0] - 'a'), Rank(notation[1] - '1')));
  }
  static std::string indexToNotation(int index)
  {
    using std::to_string;

    return to_string(Square(index));
  }

private:
  Type       mType{Type::Normal};
  Square     mFromSquare{Square::None};
  Square     mToSquare{Square::None};
  Piece      mPromotedTo{Piece::None};
  CastleSide mCastleSide{CastleSide::None};
};
}  // namespace cppgen
