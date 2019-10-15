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

#include "cppgen/move.hpp"
#include "cppgen/helpers.hpp"

namespace cppgen
{
// -------------------------------------------------------------------------------------------------
Move::Move()
{
}
// -------------------------------------------------------------------------------------------------
Move::Move(CastleSide side) : mType(Castling), mCastleSide(side)
{
}
// -------------------------------------------------------------------------------------------------
Move::Move(Square from, Square to, Type type) : mType(type), mFromSquare(from), mToSquare(to)
{
}
// -------------------------------------------------------------------------------------------------
Move::Move(Square from, Square to, Piece promoted)
    : mType(Promotion), mFromSquare(from), mToSquare(to), mPromotedTo(promoted)
{
}
// -------------------------------------------------------------------------------------------------
Move Move::makeMove(Square from, Square to)
{
  return Move{from, to, Normal};
}
// -------------------------------------------------------------------------------------------------
Move Move::makePromotion(Square from, Square to, Piece promotedTo)
{
  return Move{from, to, promotedTo};
}
// -------------------------------------------------------------------------------------------------
Move Move::makeEnPassant(Square from, Square to)
{
  return Move{from, to, EnPassant};
}
// -------------------------------------------------------------------------------------------------
Move Move::makeCastling(CastleSide side)
{
  return Move{side};
}
// -------------------------------------------------------------------------------------------------
Move::Type Move::getType() const
{
  return mType;
}
// -------------------------------------------------------------------------------------------------
Square Move::fromSquare() const
{
  return mFromSquare;
}
// -------------------------------------------------------------------------------------------------
Square Move::toSquare() const
{
  return mToSquare;
}
// -------------------------------------------------------------------------------------------------
bool Move::isPromotion() const
{
  return mType == Type::Promotion;
}
// -------------------------------------------------------------------------------------------------
bool Move::isCastling() const
{
  return mType == Type::Castling;
}
// -------------------------------------------------------------------------------------------------
CastleSide Move::getCastleSide() const
{
  return mCastleSide;
}
// -------------------------------------------------------------------------------------------------
bool Move::isEnPassant() const
{
  return mType == Type::EnPassant;
}
// -------------------------------------------------------------------------------------------------
Piece Move::promotedTo() const
{
  return mPromotedTo;
}
// -------------------------------------------------------------------------------------------------
}  // namespace cppgen
