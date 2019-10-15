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

#include "cppgen/board.hpp"

#include <cctype>
#include <sstream>
#include <stdexcept>
#include <string_view>

#include "cppgen/attacks.hpp"
#include "cppgen/helpers.hpp"
#include "cppgen/movegen.hpp"

namespace cppgen
{
static std::string_view _initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
static std::once_flag   _flag;

// -------------------------------------------------------------------------------------------------
Board::Board()
{
  std::call_once(_flag, [] { attacks::precomputeTables(); });
  loadFen(_initialFen);
}
// -------------------------------------------------------------------------------------------------
Board::Board(std::string_view initialFen)
{
  std::call_once(_flag, [] { attacks::precomputeTables(); });
  loadFen(initialFen);
}
// -------------------------------------------------------------------------------------------------
Board::Board(Board const& rhs)
    : mPieces{rhs.mPieces},
      mAllPieces{rhs.mAllPieces},
      mOccupied{rhs.mOccupied},
      mEnPassant{rhs.mEnPassant},
      mTurn{rhs.mTurn},
      mHalfMoves{rhs.mHalfMoves},
      mFullMove{rhs.mFullMove},
      mCastleRights{rhs.mCastleRights},
      mReason{rhs.mReason},
      mLegalMoves{},
      mBoardChanged{true}
{
}
// -------------------------------------------------------------------------------------------------
Board::Board(Board&& rhs)
    : mPieces{std::move(rhs.mPieces)},
      mAllPieces{std::move(rhs.mAllPieces)},
      mOccupied{std::move(rhs.mOccupied)},
      mEnPassant{std::move(rhs.mEnPassant)},
      mTurn{std::move(rhs.mTurn)},
      mHalfMoves{std::move(rhs.mHalfMoves)},
      mFullMove{std::move(rhs.mFullMove)},
      mCastleRights{std::move(rhs.mCastleRights)},
      mReason{std::move(rhs.mReason)},
      mLegalMoves{std::move(rhs.mLegalMoves)},
      mBoardChanged{rhs.mBoardChanged}
{
}
// -------------------------------------------------------------------------------------------------
Board& Board::operator=(Board const& rhs)
{
  mPieces       = rhs.mPieces;
  mAllPieces    = rhs.mAllPieces;
  mOccupied     = rhs.mOccupied;
  mEnPassant    = rhs.mEnPassant;
  mTurn         = rhs.mTurn;
  mHalfMoves    = rhs.mHalfMoves;
  mFullMove     = rhs.mFullMove;
  mCastleRights = rhs.mCastleRights;
  mReason       = rhs.mReason;
  mLegalMoves   = rhs.mLegalMoves;
  mBoardChanged = rhs.mBoardChanged;

  return *this;
}
// -------------------------------------------------------------------------------------------------
Board& Board::operator=(Board&& rhs)
{
  mPieces       = std::move(rhs.mPieces);
  mAllPieces    = std::move(rhs.mAllPieces);
  mOccupied     = std::move(rhs.mOccupied);
  mEnPassant    = std::move(rhs.mEnPassant);
  mTurn         = std::move(rhs.mTurn);
  mHalfMoves    = std::move(rhs.mHalfMoves);
  mFullMove     = std::move(rhs.mFullMove);
  mCastleRights = std::move(rhs.mCastleRights);
  mReason       = std::move(rhs.mReason);
  mLegalMoves   = std::move(rhs.mLegalMoves);
  mBoardChanged = rhs.mBoardChanged;

  return *this;
}
// -------------------------------------------------------------------------------------------------
void Board::loadFen(std::string_view fen)
{
  clearBitboards();

  auto const fields = stringSplit(fen, ' ');

  if (fields.size() != 6) {
    eosio::check(false,  "Invalid FEN record");
  }

  auto parsePiecePlacement = [this](std::string_view str) {
    auto boardPos = 56ULL;
    for (auto&& currChar : str) {
      switch (currChar) {
        case 'p':
          mPieces[Color::Black][Piece::Pawn].setBit(boardPos++);
          break;
        case 'r':
          mPieces[Color::Black][Piece::Rook].setBit(boardPos++);
          break;
        case 'n':
          mPieces[Color::Black][Piece::Knight].setBit(boardPos++);
          break;
        case 'b':
          mPieces[Color::Black][Piece::Bishop].setBit(boardPos++);
          break;
        case 'q':
          mPieces[Color::Black][Piece::Queen].setBit(boardPos++);
          break;
        case 'k':
          mPieces[Color::Black][Piece::King].setBit(boardPos++);
          break;
        case 'P':
          mPieces[Color::White][Piece::Pawn].setBit(boardPos++);
          break;
        case 'R':
          mPieces[Color::White][Piece::Rook].setBit(boardPos++);
          break;
        case 'N':
          mPieces[Color::White][Piece::Knight].setBit(boardPos++);
          break;
        case 'B':
          mPieces[Color::White][Piece::Bishop].setBit(boardPos++);
          break;
        case 'Q':
          mPieces[Color::White][Piece::Queen].setBit(boardPos++);
          break;
        case 'K':
          mPieces[Color::White][Piece::King].setBit(boardPos++);
          break;
        case '/':
          boardPos -= 16;  // Go down one rank
          break;
        default:  // handle empty squares
          boardPos += static_cast<std::uint64_t>(currChar - '0');
      }
    }
  };

  auto parsePlayerTurn = [this](std::string_view str) {
    mTurn = str == "w" ? Color::White : Color::Black;
  };

  auto parseCastlingAvailability = [this](std::string_view str) {
    mCastleRights[Color::White] = CastleSide::None;
    mCastleRights[Color::Black] = CastleSide::None;

    if (str != "-") {
      for (auto&& c : str) {
        if (c == 'K') {
          mCastleRights[Color::White] = mCastleRights[Color::White] | CastleSide::King;
        } else if (c == 'Q') {
          mCastleRights[Color::White] = mCastleRights[Color::White] | CastleSide::Queen;
        } else if (c == 'k') {
          mCastleRights[Color::Black] = mCastleRights[Color::Black] | CastleSide::King;
        } else if (c == 'q') {
          mCastleRights[Color::Black] = mCastleRights[Color::Black] | CastleSide::Queen;
        } else {
            eosio::check(false,  "Invalid FEN record. Invalid castle rights");
        }
      }
    }
  };
  auto parseEnPassantSquare = [this](std::string_view str) {
    if (str != "-") {
      mEnPassant.setBit(Move::notationToIndex(str));
    }
  };

  auto parseHalfMoveNumber = [this](std::string_view str) {
    mHalfMoves = std::stoi(std::string(str).c_str());
  };
  auto parseFullMoveNumber = [this](std::string_view str) {
    mFullMove = std::stoi(std::string(str).c_str());
  };
  parsePiecePlacement(fields[0]);
  parsePlayerTurn(fields[1]);
  parseCastlingAvailability(fields[2]);
  parseEnPassantSquare(fields[3]);
  parseHalfMoveNumber(fields[4]);
  parseFullMoveNumber(fields[5]);

  updateBitboards();
}
// -------------------------------------------------------------------------------------------------
std::string Board::getFen() const
{
  std::string fen;

  auto getPieceOnSquare = [this](Square square) {
    auto const pieces = {
        Piece::King,
        Piece::Queen,
        Piece::Rook,
        Piece::Bishop,
        Piece::Knight,
        Piece::Pawn,
    };
    for (auto color : {Color::White, Color::Black}) {
      for (auto piece : pieces) {
        if (getPieces(color, piece) & square) {
          return std::make_pair(color, piece);
        }
      }
    }
    return std::make_pair(Color::White, Piece::None);
  };

  int emptyCount = 0;

  for (auto i = 56; i >= 0; i -= 8) {
    for (int boardPos = i; boardPos < i + 8; boardPos++) {
      auto const square         = makeSquare(boardPos);
      auto const squareOccupied = !!(getOccupied() & square);
      if (squareOccupied) {
        auto [color, piece] = getPieceOnSquare(square);
        if (emptyCount > 0) {
          fen += std::to_string(emptyCount);
          emptyCount = 0;
        }
        if (color == Color::White)
          fen += to_string<Color::White>(piece);
        else
          fen += to_string<Color::Black>(piece);
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += std::to_string(emptyCount);
      emptyCount = 0;
    }
    if (i != 0) fen += '/';
  }

  fen += mTurn == Color::White ? " w " : " b ";
  if (mCastleRights[Color::White] == CastleSide::None &&
      mCastleRights[Color::Black] == CastleSide::None) {
    fen += '-';
  } else {
    if (enumHasFlag(mCastleRights[Color::White], CastleSide::King)) fen += 'K';
    if (enumHasFlag(mCastleRights[Color::White], CastleSide::Queen)) fen += 'Q';
    if (enumHasFlag(mCastleRights[Color::Black], CastleSide::King)) fen += 'k';
    if (enumHasFlag(mCastleRights[Color::Black], CastleSide::Queen)) fen += 'q';
  }

  fen += ' ';
  fen += !mEnPassant ? "-" : Move::indexToNotation(mEnPassant.bsf());
  fen += " " + std::to_string(mHalfMoves);
  fen += " " + std::to_string(mFullMove);

  return fen;
}
// -------------------------------------------------------------------------------------------------
std::string Board::prettyPrint(bool useUnicodeChars) const
{
  static std::string_view charPieces[2][6] = {
      {
          useUnicodeChars ? "\u2659" : "P",
          useUnicodeChars ? "\u2657" : "B",
          useUnicodeChars ? "\u2658" : "N",
          useUnicodeChars ? "\u2656" : "R",
          useUnicodeChars ? "\u2655" : "Q",
          useUnicodeChars ? "\u2654" : "K",
      },
      {
          useUnicodeChars ? "\u265F" : "p",
          useUnicodeChars ? "\u265D" : "b",
          useUnicodeChars ? "\u265E" : "n",
          useUnicodeChars ? "\u265C" : "r",
          useUnicodeChars ? "\u265B" : "q",
          useUnicodeChars ? "\u265A" : "k",
      },
  };

  std::stringstream ss;

  auto printIcon = [&](Square square) {
    auto const pieces = {
        Piece::Pawn,
        Piece::Bishop,
        Piece::Knight,
        Piece::Rook,
        Piece::Queen,
        Piece::King,
    };

    for (auto&& color : {Color::White, Color::Black}) {
      for (auto&& piece : pieces) {
        if (mPieces[color][piece] & square) {
          ss << charPieces[color][piece] << ' ';
          return true;
        }
      }
    }
    return false;
  };

  ss << "  +-----------------+\n";

  // For each rank
  for (auto r = Rank::Rank8; r >= Rank::Rank1; --r) {
    // print the rank number
    ss << static_cast<int>(r) + 1 << " | ";
    // and each file
    for (auto f = File::FileA; f <= File::FileH; ++f) {
      if (!printIcon(makeSquare(f, r))) {
        ss << ". ";
      }
    }

    ss << "|\n";
  }

  ss << "  +-----------------+\n";
  ss << "    A B C D E F G H" << std::endl;
  return ss.str();
}
// -------------------------------------------------------------------------------------------------
std::vector<Move> const& Board::getLegalMoves() const
{
  if (mBoardChanged) {
      mLegalMoves   = generateMoves<GenType::Legal>(*this);
      mBoardChanged = false;

  }

  return mLegalMoves;
}
// -------------------------------------------------------------------------------------------------
std::vector<std::string> Board::getLegalMovesAsSAN() const
{
  auto result = std::vector<std::string>{};
  for (auto&& move : getLegalMoves()) {
    result.emplace_back(toSAN(move));
  }
  return result;
}
// -------------------------------------------------------------------------------------------------
std::vector<Move> Board::getLegalMovesForSquare(Square square) const
{
  auto       result = std::vector<Move>{};
  auto const ksq    = getKingSquare(getActivePlayer());

  for (auto&& move : getLegalMoves()) {
    if (move.fromSquare() == square) {
      result.emplace_back(move);
    } else if (square == ksq && move.isCastling()) {
      result.emplace_back(move);
    }
  }
  return result;
}
// -------------------------------------------------------------------------------------------------
bool Board::isValid(std::string_view move) const
{
  return isValid(fromSAN(move));
}
// -------------------------------------------------------------------------------------------------
bool Board::isValid(Square from, Square to) const
{
  if (isSquareEmpty(from)) {
    return false;
  }
  if (getColorOfPieceOn(from) != getActivePlayer()) {
    return false;
  }
  if (getEnPassantSquare() == to) {
    return isValid(Move::makeEnPassant(from, to));
  }
  if (getKingSquare(getActivePlayer()) == from) {
    if (makeIndex(to) == makeIndex(from) + 2) return isValid(CastleSide::King);
    if (makeIndex(to) == makeIndex(from) - 2) return isValid(CastleSide::Queen);
  }
  return isValid(Move::makeMove(from, to));
}
// -------------------------------------------------------------------------------------------------
bool Board::isValid(CastleSide castle) const
{
  return castle == CastleSide::King ? canShortCastle(getActivePlayer())
                                    : canLongCastle(getActivePlayer());
}
// -------------------------------------------------------------------------------------------------
bool Board::isValid(Move const& move) const
{
  for (auto&& m : getLegalMoves()) {
    if (move.isCastling() && m.isCastling() && move.getCastleSide() == m.getCastleSide()) {
      return true;
    }
    if (m.getType() == move.getType() && m.fromSquare() == move.fromSquare() &&
        m.toSquare() == move.toSquare() && (!m.isPromotion() || m.promotedTo() == move.promotedTo()))
      return true;
  }
  return false;
}
// -------------------------------------------------------------------------------------------------
std::string Board::toSAN(Move const& move) const
{
  using namespace std::literals;
  using std::to_string;

  auto const us   = getActivePlayer();
  auto const from = move.fromSquare();
  auto const to   = move.toSquare();

  auto appendSuffixes = [&](std::string san) {
    if (isMoveMate(move))
      san += '#';
    else if (isMoveCheck(move))
      san += '+';
    return san;
  };

  if (move.isCastling()) {
    if (move.getCastleSide() == CastleSide::King) {
      return appendSuffixes("O-O");
    } else {
      return appendSuffixes("O-O-O");
    }
  }

  auto const piece     = getPieceOn(from);
  auto const isCapture = getPieceOn(to) != Piece::None;

  if (piece == Piece::None) return "";

  if (piece == Piece::Pawn) {
    if (!isCapture) {
      return appendSuffixes(to_string(to));
    } else {
      return appendSuffixes(to_string(getFile(from)) + 'x' + to_string(to));
    }
  }
  // If there are 2 pieces in position to make this move, we need to disambiguate it
  auto attackers = getAttackers(us, to) & getPieces(us, piece);

  CG_ASSERT(!attackers.isZero());

  auto san = [piece]() {
    switch (piece) {
      case Piece::Bishop:
        return "B"s;
      case Piece::Knight:
        return "N"s;
      case Piece::Rook:
        return "R"s;
      case Piece::Queen:
        return "Q"s;
      case Piece::King:
        return "K"s;

      // These should not happen
      case Piece::Pawn:
      case Piece::None:
      default:
        return "-"s;
    }
  }();

  if (attackers.popCount() == 1) {
    // Unambiguous
    if (isCapture) {
      san += 'x';
    }

    return appendSuffixes(san + to_string(to));
  } else if (attackers.popCount() == 2) {
    // 2 pieces attacking, disambiguate them by file or rank
    auto attacker1 = makeSquare(attackers.popLsb());
    auto attacker2 = makeSquare(attackers.popLsb());

    if (getFile(attacker1) != getFile(attacker2))
      san += to_string(getFile(from));
    else
      san += to_string(getRank(from));

    if (isCapture) {
      san += 'x';
    }

    return appendSuffixes(san + to_string(to));
  } else {
    san += to_string(from);

    if (isCapture) {
      san += 'x';
    }
    // 3 pieces or more require the full square for disambiguation
    return appendSuffixes(san + to_string(to));
  }
}
// -------------------------------------------------------------------------------------------------
Move Board::fromSAN(std::string_view move) const
{
  using namespace std::literals;

  auto sanGetPieceType = [](char c) {
    c = std::tolower(c);
    switch (c) {
      // clang-format off
      case 'q': return Piece::Queen;
      case 'r': return Piece::Rook;
      case 'n': return Piece::Knight;
      case 'b': return Piece::Bishop;
      case 'k': return Piece::King;
      // clang-format on
      default:
        return Piece::None;
    }
  };

  if (stringEndsWith(move, "e.p."sv)) {
    stringPop(move, 4);
  }

  if (stringEndsWith(move, "#"sv) || stringEndsWith(move, "+"sv)) {
    stringPop(move, 1);
  }

  if (move == "O-O-O"sv || move == "0-0-0"sv) {
    return Move::makeCastling(CastleSide::Queen);
  } else if (move == "O-O"sv || move == "0-0"sv) {
    return Move::makeCastling(CastleSide::King);
  }

  auto promotedTo = Piece::None;

  // If the last letter is not a digit, this is a promotion and it indicates
  // the promoted-to piece
  if (!std::isdigit(move.back())) {
    promotedTo = sanGetPieceType(stringPopBack(move));

    if (promotedTo == Piece::None) {
        eosio::check(false,  "Malformed SAN move: " + std::string(move));
    }
    if (move.back() == '=') {
      stringPop(move, 1);
    }
  }

  auto const toRank = stringPopBack(move);
  auto const toFile = stringPopBack(move);

  if (!std::isalpha(toFile)) {
    eosio::check(false,  "Malformed SAN move: " + std::string(move));
  }

  auto const toSquare = makeSquare(File(toFile - 'a'), Rank(toRank - '1'));

  if (move.size() == 0) {
    // Try to find a source square for this pawn move
    // We know this to not be a capture so there can be at most 1 pawn that can move to
    // the target square
    auto const result = findMoveIf([toSquare](Move const& m) {
      if (m.toSquare() == toSquare && getFile(m.fromSquare()) == getFile(toSquare)) {
        return true;
      }
      return false;
    });

    if (!result.has_value()) {
      eosio::check(false,  "Invalid SAN move");
    }

    if (promotedTo != Piece::None)
      return Move::makePromotion(result->fromSquare(), toSquare, promotedTo);

    return Move::makeMove(result->fromSquare(), toSquare);
  }

  bool isCapture = move.back() == 'x';

  if (isCapture) {
    stringPop(move, 1);
  }

  auto fromFile = File::None;
  auto fromRank = Rank::None;

  // Check if a rank number was provided
  if (std::isdigit(move.back())) {
    fromRank = Rank(stringPopBack(move) - '1');
  }

  // If it's a lower case letter, then it's a file
  if (std::islower(move.back())) {
    fromFile = File(stringPopBack(move) - 'a');

    // If there are no more letters, it's a pawn move
    // find the source square and return it
    if (move.size() == 0) {
      auto const result = findMoveIf([toSquare, fromFile](Move const& m) {
        if (m.toSquare() == toSquare && getFile(m.fromSquare()) == fromFile) {
          return true;
        }
        return false;
      });

      if (!result.has_value()) {
        eosio::check(false,  "Invalid SAN move");
      }

      if (isCapture && toSquare == getEnPassantSquare()) {
        return Move::makeEnPassant(result->fromSquare(), toSquare);
      }

      return Move::makeMove(result->fromSquare(), toSquare);
    }
  }

  CG_ASSERT(std::isupper(move.back()));

  auto const piece = sanGetPieceType(stringPopBack(move));

  CG_ASSERT(move.size() == 0);

  if (fromRank == Rank::None || fromFile == File::None) {
    auto const result = findMoveIf([&](Move const& m) {
      if (m.toSquare() == toSquare) {
        if (getPieceOn(m.fromSquare()) == piece) {
          if ((fromRank == Rank::None && fromFile == File::None) ||
              getRank(m.fromSquare()) == fromRank || getFile(m.fromSquare()) == fromFile) {
            return true;
          }
        }
      }
      return false;
    });

    if (!result.has_value()) {
      eosio::check(false,  "Invalid SAN move");
    }

    return Move::makeMove(result->fromSquare(), toSquare);
  }

  return Move::makeMove(makeSquare(fromFile, fromRank), toSquare);
}
// -------------------------------------------------------------------------------------------------
bool Board::makeMove(Move const& move)
{
  if (!isValid(move)) {
    return false;
  }

  auto const us     = getActivePlayer();
  auto const behind = us == Color::White ? Direction::South : Direction::North;
  auto const them   = ~us;
  auto const from   = move.fromSquare();
  auto const to     = move.toSquare();

  if (!move.isCastling()) {
    CG_ASSERT(from != Square::None);
    CG_ASSERT(to != Square::None);
    CG_ASSERT(getColorOfPieceOn(from) == us);
    CG_ASSERT(isSquareEmpty(to) || getColorOfPieceOn(to) == them);
  }

  mEnPassant.clear();

  if (move.isCastling()) {
    auto const kingside = move.getCastleSide() == CastleSide::King;
    auto const kingFrom = getKingSquare(us);
    auto const rookFrom = getCastlingRookSquare(us, move.getCastleSide());

    auto const rookTo = [&] {
      if (us == Color::White)
        return kingside ? Square::F1 : Square::D1;
      else
        return kingside ? Square::F8 : Square::D8;
    }();

    auto const kingTo = [&] {
      if (us == Color::White)
        return kingside ? Square::G1 : Square::C1;
      else
        return kingside ? Square::G8 : Square::C8;
    }();

    removePiece(Piece::Rook, us, rookFrom);
    removePiece(Piece::King, us, kingFrom);
    addPiece(Piece::Rook, us, rookTo);
    addPiece(Piece::King, us, kingTo);

    mCastleRights[us] = CastleSide::None;
  } else {
    auto captured = move.isEnPassant() ? Piece::Pawn : getPieceOn(to);

    if (captured != Piece::None) {
      mHalfMoves = 0;  // Reset fifty-move counter on captures
      if (move.isEnPassant())
        removePiece(captured, them, to + behind);
      else
        removePiece(captured, them, to);
    }

    movePiece(getPieceOn(from), us, from, to);
  }

  if (move.isPromotion()) {
    removePiece(Piece::Pawn, us, to);
    addPiece(move.promotedTo(), us, to);
  }

  if (us == Color::Black) {
    ++mFullMove;
  }

  mTurn = ~mTurn;

  gameOverCheck();

  return true;
}
// -------------------------------------------------------------------------------------------------
bool Board::makeMove(std::string_view move)
{
  return makeMove(fromSAN(move));
}
// -------------------------------------------------------------------------------------------------
int Board::getHalfMoves() const
{
  return mHalfMoves;
}
// -------------------------------------------------------------------------------------------------
int Board::getFullMove() const
{
  return mFullMove;
}
// -------------------------------------------------------------------------------------------------
bool Board::isInitialPosition() const
{
  return getFen() == _initialFen;
}
// -------------------------------------------------------------------------------------------------
Color Board::getActivePlayer() const
{
  return mTurn;
}
// -------------------------------------------------------------------------------------------------
bool Board::isOver() const
{
  return getGameOverReason() != GameOverReason::OnGoing;
}
// -------------------------------------------------------------------------------------------------
GameOverReason Board::getGameOverReason() const
{
  return mReason;
}
// -------------------------------------------------------------------------------------------------
bool Board::isInCheck() const
{
  auto const kingSquareIndex = getKingSquare(getActivePlayer());

  // no king?
  if (kingSquareIndex == Square::None) {
    return false;
  }

  return isSquareUnderAttack(~getActivePlayer(), kingSquareIndex);
}
// -------------------------------------------------------------------------------------------------
bool Board::canShortCastle(Color color) const
{
  // Cannot castle if:
  // - The player has no castle rights (king or rook already moved)
  if (!enumHasFlag(mCastleRights[color], CastleSide::King)) {
    return false;
  }

  auto       kingIndex  = getPieces(color, Piece::King).bsf();
  auto const enemyColor = ~color;

  auto const squareMask = Bitboard((1ULL << (kingIndex + 1)) | (1ULL << (kingIndex + 2)));
  if (getOccupied() & squareMask) return false;

  auto rookIndex = getPieces(color, Piece::Rook).bsr();

  // If there is no rook or if the only rook is the wrong one
  if (rookIndex == -1 || rookIndex < kingIndex) return false;

  // Or if one of the squares the king will move to is under attack
  return !isSquareUnderAttack(enemyColor, makeSquare(kingIndex++)) &&
         !isSquareUnderAttack(enemyColor, makeSquare(kingIndex++)) &&
         !isSquareUnderAttack(enemyColor, makeSquare(kingIndex++));
}
// -------------------------------------------------------------------------------------------------
bool Board::canLongCastle(Color color) const
{
  // Cannot castle if:
  // - The player has no castle rights (king or rook already moved)
  if (!enumHasFlag(mCastleRights[color], CastleSide::King)) {
    return false;
  }

  auto       kingIndex  = getPieces(color, Piece::King).bsr();
  auto const enemyColor = ~color;

  auto const squareMask = Bitboard((1ULL << (kingIndex - 1)) |  //
                                   (1ULL << (kingIndex - 2)) |  //
                                   (1ULL << (kingIndex - 3)));
  if (getOccupied() & squareMask) return false;

  auto rookIndex = getPieces(color, Piece::Rook).bsf();

  // If there is no rook or if the only rook is the wrong one
  if (rookIndex == -1 || rookIndex > kingIndex) return false;

  // Or if one of the squares the king will move to is under attack
  return !isSquareUnderAttack(enemyColor, makeSquare(kingIndex--)) &&
         !isSquareUnderAttack(enemyColor, makeSquare(kingIndex--)) &&
         !isSquareUnderAttack(enemyColor, makeSquare(kingIndex--));
}
// -------------------------------------------------------------------------------------------------
CastleSide Board::getCastlingRights(Color color) const
{
  return mCastleRights[color];
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getPieces(Piece type) const
{
  return mPieces[Color::White][type] | mPieces[Color::Black][type];
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getPieces(Color color, Piece type) const
{
  return mPieces[color][type];
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getAllPieces(Color color) const
{
  return mAllPieces[color];
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getOccupied() const
{
  return mOccupied;
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getUnoccupied() const
{
  return ~mOccupied;
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getEnPassant() const
{
  return mEnPassant;
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getPossibleMoves(Piece type, Color color, Square fromSquare) const
{
  switch (type) {
    case Piece::Pawn:
      if (color == Color::White)
        return getWhitePawnAttacksForSquare(fromSquare);
      else
        return getBlackPawnAttacksForSquare(fromSquare);
    case Piece::Knight:
      return getKnightAttacksForSquare(fromSquare, color);
    case Piece::King:
      return getKingAttacksForSquare(fromSquare, color);
    case Piece::Rook:
      return getRookAttacksForSquare(fromSquare, color);
    case Piece::Bishop:
      return getBishopAttacksForSquare(fromSquare, color);
    case Piece::Queen:
      return getQueenAttacksForSquare(fromSquare, color);
    case Piece::Count:
    default:
      eosio::check(false, "Invalid piece type");
  }
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getKingBlockers(Color them) const
{
  auto       blockers = Bitboard{};
  auto const us       = ~them;

  auto ksq = getKingSquare(them);

  CG_ASSERT(ksq != Square::None);

  auto const rooksOrQueens   = getPieces(us, Piece::Queen) | getPieces(us, Piece::Rook);
  auto const bishopsOrQueens = getPieces(us, Piece::Queen) | getPieces(us, Piece::Bishop);
  auto const rqAttacks = attacks::getSlidingAttacks(Piece::Rook, ksq, Bitboard{}) & rooksOrQueens;
  auto const bqAttacks = attacks::getSlidingAttacks(Piece::Bishop, ksq, Bitboard{}) & bishopsOrQueens;

  // Find all sliders aiming towards the king position
  auto sliders = getAllPieces(us) & (rqAttacks | bqAttacks);

  // Mask the sliders out of the occupancy bits
  auto const occupancy = getOccupied() ^ sliders;

  while (sliders) {
    auto const sniperSq = sliders.popLsb();
    auto const b        = Bitboard::getLineBetween(ksq, makeSquare(sniperSq)) & occupancy;

    if (b && !b.moreThanOne()) {
      blockers |= b;
    }
  }
  return blockers;
}
// -------------------------------------------------------------------------------------------------
bool Board::isSquareUnderAttack(Color enemy, Square square) const
{
  auto const us = ~enemy;

  auto const pawns = getPossibleMoves(Piece::Pawn, us, square) & getPieces(enemy, Piece::Pawn);
  if (pawns) return true;
  auto const knights = getPossibleMoves(Piece::Knight, us, square) & getPieces(enemy, Piece::Knight);
  if (knights) return true;
  auto const bishops = getPossibleMoves(Piece::Bishop, us, square) & getPieces(enemy, Piece::Bishop);
  if (bishops) return true;
  auto const rooks = getPossibleMoves(Piece::Rook, us, square) & getPieces(enemy, Piece::Rook);
  if (rooks) return true;
  auto const queens = getPossibleMoves(Piece::Queen, us, square) & getPieces(enemy, Piece::Queen);
  if (queens) return true;
  auto const king = getPossibleMoves(Piece::King, us, square) & getPieces(enemy, Piece::King);

  return !king.isZero();
}
// -------------------------------------------------------------------------------------------------
Piece Board::getPieceOn(Square sq) const
{
  for (auto color = 0; color < 2; ++color) {
    for (auto pt = 0; pt < 6; ++pt) {
      if (mPieces[color][pt] & sq) return Piece(pt);
    }
  }
  return Piece::None;
}
// -------------------------------------------------------------------------------------------------
Color Board::getColorOfPieceOn(Square sq) const
{
  if (getAllPieces(Color::White) & sq)
    return Color::White;
  else
    return Color::Black;
}
// -------------------------------------------------------------------------------------------------
bool Board::isSquareEmpty(Square sq) const
{
  return !(getOccupied() & sq);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getCheckSquares(Color color, Piece piece) const
{
  if (piece == Piece::King) return Bitboard{};

  return getPossibleMoves(piece, color, getKingSquare(~color));
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getCheckers() const
{
  if (!isInCheck()) return Bitboard{};

  auto const us  = getActivePlayer();
  auto const ksq = getKingSquare(us);

  auto const pawns   = getPossibleMoves(Piece::Pawn, us, ksq) & getPieces(~us, Piece::Pawn);
  auto const knights = getPossibleMoves(Piece::Knight, us, ksq) & getPieces(~us, Piece::Knight);
  auto const bishops = getPossibleMoves(Piece::Bishop, us, ksq) & getPieces(~us, Piece::Bishop);
  auto const rooks   = getPossibleMoves(Piece::Rook, us, ksq) & getPieces(~us, Piece::Rook);
  auto const queens  = getPossibleMoves(Piece::Queen, us, ksq) & getPieces(~us, Piece::Queen);

  return pawns | knights | bishops | rooks | queens;
}
// -------------------------------------------------------------------------------------------------
Square Board::getKingSquare(Color color) const
{
  return makeSquare(getPieces(color, Piece::King).bsf());
}
// -------------------------------------------------------------------------------------------------
Square Board::getCastlingRookSquare(Color color, CastleSide side) const
{
  // TODO: Support Chess960
  if (side == CastleSide::King)
    return color == Color::White ? Square::H1 : Square::H8;
  else
    return color == Color::White ? Square::A1 : Square::A8;
}
// -------------------------------------------------------------------------------------------------
Square Board::getEnPassantSquare() const
{
  return makeSquare(mEnPassant.bsf());
}
// -------------------------------------------------------------------------------------------------
bool Board::isInsufficientMaterial() const
{
  auto const toMove = getActivePlayer();

  // Check if only kings are left
  if (getOccupied().popCount() == 2) {
    return true;
  }

  // Check King+Knight vs King scenarios
  if (!(getAllPieces(toMove) & ~getPieces(toMove, Piece::Knight))) {
    return true;
  }

  return false;
}
// -------------------------------------------------------------------------------------------------
bool Board::isThreefold() const
{
  // TODO: Support 3-fold repetition
  return false;
}
// -------------------------------------------------------------------------------------------------
bool Board::isStalemate() const
{
  return !isInCheck() && getLegalMoves().size() == 0;
}
// -------------------------------------------------------------------------------------------------
bool Board::isCheckmate() const
{
  return isInCheck() && getLegalMoves().size() == 0;
}
// -------------------------------------------------------------------------------------------------
void Board::gameOverCheck()
{
  if (getLegalMoves().size() == 0) {
    mReason = isInCheck() ? GameOverReason::Mate : GameOverReason::Stalemate;
  } else if (isInsufficientMaterial()) {
    mReason = GameOverReason::InsuffMaterial;
  } else if (isThreefold()) {
    mReason = GameOverReason::Threefold;
  }
}
// -------------------------------------------------------------------------------------------------
bool Board::isMoveCheck(Move const& move) const
{
  // TODO: Make this faster!
  // We dont need to create a new board and generate all legal moves for it!

  auto temp = *this;
  if (!temp.makeMove(move)) return false;
  return temp.isInCheck();
}
// -------------------------------------------------------------------------------------------------
bool Board::isMoveMate(Move const& move) const
{
  // TODO: Make this faster!
  // We dont need to create a new board and generate all legal moves for it!

  auto temp = *this;
  if (!temp.makeMove(move)) return false;
  return temp.isOver() && temp.getGameOverReason() == GameOverReason::Mate;
}
// -------------------------------------------------------------------------------------------------
void Board::addPiece(Piece type, Color color, Square square)
{
  mBoardChanged = true;
  mPieces[color][type].setBit(square);
  mAllPieces[color].setBit(square);
  mOccupied.setBit(square);
}
// -------------------------------------------------------------------------------------------------
void Board::removePiece(Piece type, Color color, Square square)
{
  mBoardChanged = true;
  mPieces[color][type].clearBit(square);
  mAllPieces[color].clearBit(square);
  mOccupied.clearBit(square);
}
// -------------------------------------------------------------------------------------------------
void Board::movePiece(Piece type, Color color, Square from, Square to)
{
  if (type == Piece::King) {
    mCastleRights[color] = CastleSide::None;
  } else if (type == Piece::Rook) {
    if (color == Color::White) {
      if (from == Square::A1)
        mCastleRights[color] = mCastleRights[color] & ~CastleSide::Queen;
      else if (from == Square::H1)
        mCastleRights[color] = mCastleRights[color] & ~CastleSide::King;
    } else {
      if (from == Square::A8)
        mCastleRights[color] = mCastleRights[color] & ~CastleSide::Queen;
      else if (from == Square::H8)
        mCastleRights[color] = mCastleRights[color] & ~CastleSide::King;
    }
  } else if (type == Piece::Pawn) {
    auto const indexFrom = makeIndex(from);
    auto const indexTo   = makeIndex(to);

    // If it's a double move, see if there is a pawn ready to take en passant
    // if so, record this square
    if (std::abs(indexFrom - indexTo) == 16) {
      auto const pawns = getPieces(~color, Piece::Pawn);
      auto const toSq  = makeSquare(indexTo);
      auto const epSq  = (indexTo + (color == Color::White ? -8 : 8));
      if (getFile(toSq) == File::FileA) {
        if (pawns & (toSq + Direction::East)) {
          mEnPassant.setBit(epSq);
        }
      } else if (getFile(toSq) == File::FileH) {
        if (pawns & (toSq + Direction::West)) {
          mEnPassant.setBit(epSq);
        }
      } else {
        if (pawns & (toSq + Direction::West) || pawns & (toSq + Direction::East)) {
          mEnPassant.setBit(epSq);
        }
      }
    }
    // Reset fifty-rule clock on pawn moves
    mHalfMoves = 0;
  }

  removePiece(type, color, from);
  addPiece(type, color, to);

  updateBitboards();
}
// -------------------------------------------------------------------------------------------------
void Board::clearBitboards()
{
  for (Color color : {Color::White, Color::Black}) {
    for (Piece Piece :
         {Piece::Pawn, Piece::Knight, Piece::Bishop, Piece::Rook, Piece::Queen, Piece::King}) {
      mPieces[color][Piece].clear();
    }

    mAllPieces[color].clear();
  }

  mEnPassant.clear();
  mOccupied.clear();
}
// -------------------------------------------------------------------------------------------------
void Board::updateBitboards()
{
  mAllPieces[Color::White] =
      mPieces[Color::White][Piece::Pawn] | mPieces[Color::White][Piece::Rook] |
      mPieces[Color::White][Piece::Knight] | mPieces[Color::White][Piece::Bishop] |
      mPieces[Color::White][Piece::Queen] | mPieces[Color::White][Piece::King];

  mAllPieces[Color::Black] =
      mPieces[Color::Black][Piece::Pawn] | mPieces[Color::Black][Piece::Rook] |
      mPieces[Color::Black][Piece::Knight] | mPieces[Color::Black][Piece::Bishop] |
      mPieces[Color::Black][Piece::Queen] | mPieces[Color::Black][Piece::King];

  mOccupied = mAllPieces[Color::White] | mAllPieces[Color::Black];
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getAttackers(Color color, Square square) const
{
  auto const us   = color;
  auto const them = ~color;

  auto const pawns   = getPossibleMoves(Piece::Pawn, them, square) & getPieces(us, Piece::Pawn);
  auto const knights = getPossibleMoves(Piece::Knight, them, square) & getPieces(us, Piece::Knight);
  auto const bishops = getPossibleMoves(Piece::Bishop, them, square) & getPieces(us, Piece::Bishop);
  auto const rooks   = getPossibleMoves(Piece::Rook, them, square) & getPieces(us, Piece::Rook);
  auto const queens  = getPossibleMoves(Piece::Queen, them, square) & getPieces(us, Piece::Queen);
  auto const king    = getPossibleMoves(Piece::King, them, square) & getPieces(us, Piece::King);

  return pawns | knights | bishops | rooks | queens | king;
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getWhitePawnAttacksForSquare(Square square) const
{
  return attacks::getNonSlidingAttacks(Piece::Pawn, square, Color::White);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getBlackPawnAttacksForSquare(Square square) const
{
  return attacks::getNonSlidingAttacks(Piece::Pawn, square, Color::Black);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getKingAttacksForSquare(Square square, Color color) const
{
  return attacks::getNonSlidingAttacks(Piece::King, square, color) & ~getAllPieces(color);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getKnightAttacksForSquare(Square square, Color color) const
{
  return attacks::getNonSlidingAttacks(Piece::Knight, square, color) & ~getAllPieces(color);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getBishopAttacksForSquare(Square square, Color color) const
{
  return attacks::getSlidingAttacks(Piece::Bishop, square, getOccupied()) & ~getAllPieces(color);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getRookAttacksForSquare(Square square, Color color) const
{
  return attacks::getSlidingAttacks(Piece::Rook, square, getOccupied()) & ~getAllPieces(color);
}
// -------------------------------------------------------------------------------------------------
Bitboard Board::getQueenAttacksForSquare(Square square, Color color) const
{
  return attacks::getSlidingAttacks(Piece::Queen, square, getOccupied()) & ~getAllPieces(color);
}
// -------------------------------------------------------------------------------------------------
}  // namespace cppgen
