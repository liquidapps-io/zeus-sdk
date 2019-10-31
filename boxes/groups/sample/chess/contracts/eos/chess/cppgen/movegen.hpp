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

#include <vector>
#include "move.hpp"

namespace cppgen
{
class Board;

enum class GenType {
  Quiets,       // Generates all pseudo-legal non-captures and underpromotions
  QuietChecks,  // Generates all pseudo-legal non-captures and underpromotions that give check
  Captures,     // Generates all pseudo-legal captures and queen promotions
  NonEvasions,  // Generates all pseudo-legal captures and non-captures
  Evasions,     // Generates all pseudo-legal moves that get out of check
  Legal,        // Generates all legal moves
};
/**
 * @brief Generate a set of moves based on the given board position
 *
 * @param   board The board to generate moves for
 *
 * @returns The move list
 */
template <GenType Type>
auto generateMoves(Board const& board) -> std::vector<Move>;

}  // namespace cppgen
