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

#include <array>
#include <optional>
#include <string>
#include <type_traits>
#include <vector>

#include "bitboard.hpp"
#include "config.hpp"
#include "move.hpp"

namespace cppgen
{
enum class GameOverReason {
  OnGoing,
  Mate,
  Threefold,
  Stalemate,
  InsuffMaterial,
};
class Board
{
public:
  Board(Board const&);
  Board(Board&&);
  Board& operator=(Board const&);
  Board& operator=(Board&&);

public:
  /**
   * @brief Constructs a board in the default initial position
   */
  Board();

  /**
   * @brief Constructs a board in the given position
   */
  Board(std::string_view initialFen);

  /**
   * @brief Sets the board to the given X-FEN position
   *
   * @param fen A position using the X-FEN notation
   */
  void loadFen(std::string_view fen);

  /**
   * @brief Gets the X-FEN notation for the current board position
   */
  std::string getFen() const;

  /**
   * @brief Builds a string representation of the current board position
   *
   * @param useUnicodeChars Whether to use the unicode chess pieces instead
   *                        of letters for the pieces in the board
   *
   * @returns The current boars position in a string representation
   */
  std::string prettyPrint(bool useUnicodeChars = true) const;

  /**
   * @brief Gets the list of all legal moves for the current board position
   */
  std::vector<Move> const& getLegalMoves() const;

  /**
   * @brief Gets the list of all legal moves for the current board position in their Algebraic
   * representation
   */
  std::vector<std::string> getLegalMovesAsSAN() const;

  /**
   * @brief Gets the list of all legal moves from the given square
   */
  std::vector<Move> getLegalMovesForSquare(Square square) const;

  /**
   * @brief Checks whether the given move is legal
   */
  bool isValid(std::string_view move) const;
  bool isValid(Square from, Square to) const;
  bool isValid(CastleSide castle) const;
  bool isValid(Move const& move) const;

  /**
   * @brief Plays a move, changing the current board position
   *
   * @param move The move to play
   *
   * @returns @c true if the move was played, @c false otherwise
   */
  bool makeMove(Move const& move);

  /**
   * @brief Plays a move in the Standard Algebraic Notation form
   *
   * @param move The move to play
   *
   * @returns @c true if the move was played, @c false otherwise
   */
  bool makeMove(std::string_view move);

  /**
   * @brief Gets the Standard Algebraic Notation string for a valid move.
   *
   * @param move The move to get the SAN representation for
   */
  std::string toSAN(Move const& move) const;

  /**
   * @brief Gets the number of halfmoves since the last capture or pawn move
   *
   * The number of halfmoves is used to determine if a draw can be claimed
   * by the Fifty-move rule (https://en.wikipedia.org/wiki/Fifty-move_rule)
   *
   * @returns The current number of halfmoves since the last capture or pawn move
   */
  int getHalfMoves() const;

  /**
   * @brief Gets the fullmove number
   *
   * The fullmove number starts at 1 and is incremented after every black move
   *
   * @returns The current fullmove number
   */
  int getFullMove() const;

  /**
   * @brief Checks whether the board is in the initial chess position
   */
  bool isInitialPosition() const;

  /**
   * @brief Gets the current active player
   */
  Color getActivePlayer() const;

  /**
   * @brief Checks whether the board is in a checkmate position
   */
  bool isOver() const;

  /**
   * @brief Determines how the game ended
   */
  GameOverReason getGameOverReason() const;

  /**
   * @brief Checks whether the active player is in check
   */
  bool isInCheck() const;

  /**
   * @brief Checks whether the given color can castle king-side
   */
  bool canShortCastle(Color color) const;

  /**
   * @brief Checks whether the given color can castle queen-side
   */
  bool canLongCastle(Color color) const;

  /**
   * @brief Gets a bitflag enumeration with the castle rights for the given color
   */
  CastleSide getCastlingRights(Color color) const;

  /**
   * @brief Retrieves a bitboard with the position of the given piece regardless of color
   */
  Bitboard getPieces(Piece type) const;

  /**
   * @brief Retrieves a bitboard with the position of the pieces of the given type
   *        belonging to the player of the given color
   */
  Bitboard getPieces(Color color, Piece type) const;

  /**
   * @brief Retrieves a bitboard with the position of all the pieces of the given color
   */
  Bitboard getAllPieces(Color color) const;

  /**
   * @brief Retrieves a bitboard with all the occupied squares in the board
   */
  Bitboard getOccupied() const;

  /**
   * @brief Retrieves a bitboard with all the empty squares in the board
   */
  Bitboard getUnoccupied() const;

  /**
   * @brief Retrieves a bitboard with the enpassant square position.
   *        If there is no enpassant pawn, the value is 0
   */
  Bitboard getEnPassant() const;

  /**
   * @brief Retrives a bitboard with all the pseudo-legal moves for the given piece in the current board
   *
   * Determines all the squares the given piece type can move to from the source square
   * in the current board configuration. No consideration is done whether the moves are
   * illegal (would leave the king in check)
   *
   * @param type       The piece type
   * @param color      The piece color
   * @param fromSquare The source square
   *
   * @returns A bitboard of all the attacked squares
   */
  Bitboard getPossibleMoves(Piece type, Color color, Square fromSquare) const;

  /**
   * @brief Retrieves a bitboard with all the pieces blocking attacks to the king (possible
   * discovered checks or pins)
   *
   * @param color Color of the king
   *
   * @returns A bitboard with the positions of all the pieces blocking possible attacks to the king
   */
  Bitboard getKingBlockers(Color color) const;

  /**
   * @brief Gets the type of the piece on the given suqare
   *
   * @param sq The square
   *
   * @returns The piece on that square
   */
  Piece getPieceOn(Square sq) const;

  /**
   * @brief Gets the color of the piece on the given suqare
   *
   * @param sq The square
   *
   * @returns The piece color
   */
  Color getColorOfPieceOn(Square sq) const;

  /**
   * @brief Check if the given square is unoccupied
   *
   * @param sq The square to check
   *
   * @returns @c true if the square has no piece on it
   */
  bool isSquareEmpty(Square sq) const;

  /**
   * @brief Retrives a bitboard with all the squares where the given piece can check the enemy king
   *        from considering the current board position
   *
   * @param color The piece color
   * @param piece The piece type
   *
   * @returns A bitboard with all the checking squares
   */
  Bitboard getCheckSquares(Color color, Piece piece) const;

  /**
   * @brief Gets a bitboard with all the pieces giving check to the active player's king
   *
   * @returns A bitboard with all the checking pieces
   */
  Bitboard getCheckers() const;

  /**
   * @brief Gets the square of the king for the given color
   *
   * @param color The king color
   *
   * @returns The king square, or @c Square::None if there is no king
   */
  Square getKingSquare(Color color) const;

  /**
   * @brief Gets the square for the rook to be used in caslting.
   *
   * This function performs no check to see if there is actually a rook on the returned square
   *
   * @param color The castling color
   * @param side  The castling side
   *
   * @returns The square where the rook should be for a castling move
   */
  Square getCastlingRookSquare(Color color, CastleSide side) const;

  /**
   * @brief Gets the En Passant square, if there is one. This is the square behind the en passant pawn
   *
   * @returns The EP square or @c Square::None if there is no En Passant pawn
   */
  Square getEnPassantSquare() const;

  /**
   * @brief Determines if the given square is under attack by the given color.
   *
   * @param enemy   The attacking side
   * @param square  The square index
   */
  bool isSquareUnderAttack(Color enemy, Square square) const;

private:
  Move fromSAN(std::string_view move) const;
  bool isInsufficientMaterial() const;
  bool isThreefold() const;
  bool isStalemate() const;
  bool isCheckmate() const;
  void gameOverCheck();

  bool isMoveCheck(Move const& move) const;
  bool isMoveMate(Move const& move) const;

  void addPiece(Piece type, Color color, Square square);
  void removePiece(Piece type, Color color, Square square);
  void movePiece(Piece type, Color color, Square from, Square to);
  void clearBitboards();
  void updateBitboards();

  template <typename Fn>
  auto findMoveIf(Fn f) const -> std::optional<Move>
  {
    for (auto&& move : getLegalMoves()) {
      if (f(move)) {
        return move;
      }
    }
    return std::nullopt;
  }
  Bitboard getAttackers(Color color, Square square) const;
  Bitboard getWhitePawnAttacksForSquare(Square square) const;
  Bitboard getBlackPawnAttacksForSquare(Square square) const;
  Bitboard getKingAttacksForSquare(Square square, Color color) const;
  Bitboard getKnightAttacksForSquare(Square square, Color color) const;
  Bitboard getBishopAttacksForSquare(Square square, Color color) const;
  Bitboard getRookAttacksForSquare(Square square, Color color) const;
  Bitboard getQueenAttacksForSquare(Square square, Color color) const;

  std::array<std::array<Bitboard, 6>, 2> mPieces{};
  std::array<Bitboard, 2>                mAllPieces{};
  Bitboard                               mOccupied{};
  Bitboard                               mEnPassant{};
  Color                                  mTurn{Color::White};
  int                                    mHalfMoves{0};
  int                                    mFullMove{1};
  std::array<CastleSide, 2>              mCastleRights{};
  GameOverReason                         mReason{GameOverReason::OnGoing};
  mutable std::vector<Move>              mLegalMoves;
  mutable bool               mBoardChanged = true;
};
}  // namespace cppgen
