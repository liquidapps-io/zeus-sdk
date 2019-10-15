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

#include <type_traits>

#if !defined(MAKE_ENUM_OPERATOR)
#define MAKE_ENUM_OPERATOR(T, U, OP)                                                               \
  inline T operator OP(T a, T b) { return static_cast<T>(static_cast<U>(a) OP static_cast<U>(b)); }

#endif

#if !defined(CPPGEN_ENUMOPS)
#define CPPGEN_ENUMOPS(E)                                                                          \
  MAKE_ENUM_OPERATOR(E, std::underlying_type_t<E>, |)                                              \
  MAKE_ENUM_OPERATOR(E, std::underlying_type_t<E>, ^)                                              \
  MAKE_ENUM_OPERATOR(E, std::underlying_type_t<E>, &)                                              \
  inline E operator~(E a) { return static_cast<E>(~static_cast<std::underlying_type_t<E>>(a)); }
#endif
