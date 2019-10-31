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

#include <algorithm>
#include <string>
#include <string_view>
#include <vector>

namespace cppgen
{
namespace detail
{
template <class T>
struct type_identity {
  using type = T;
};
template <class T>
using type_identity_t = typename type_identity<T>::type;
}  // namespace detail

template <typename CharT>
std::vector<std::basic_string<CharT>> stringSplit(
    detail::type_identity_t<std::basic_string_view<CharT>> source,
    CharT                                                  delimiter,
    bool                                                   discardEmpty = true)
{
  auto result = std::vector<std::basic_string<CharT>>{};

  auto start = 0u;
  auto end   = source.find(delimiter);
  while (end != std::basic_string_view<CharT>::npos) {
    if (discardEmpty && end - start == 0) {
      continue;
    }
    result.emplace_back(source.substr(start, end - start));
    start = end + 1;
    end   = source.find(delimiter, start);
  }
  auto last = source.substr(start);
  if (!discardEmpty || last.size() != 0) {
    result.emplace_back(std::move(last));
  }
  return result;
}
// -----------------------------------------------------------------------------
template <typename CharT>
constexpr bool stringContains(detail::type_identity_t<std::basic_string_view<CharT>> source,
                              CharT                                                  character)
{
  return source.find(character) != std::basic_string_view<CharT>::npos;
}
// -----------------------------------------------------------------------------
template <typename CharT>
constexpr bool stringContains(std::basic_string_view<CharT> source,
                              std::basic_string_view<CharT> substring)
{
  return source.find(substring) != source.end();
}
// -----------------------------------------------------------------------------
template <typename SView>
constexpr bool stringEndsWith(SView view, SView str)
{
  if (str.size() > view.size()) return false;
  return view.find(str) == view.size() - str.size();
}
// -----------------------------------------------------------------------------
template <typename SView>
constexpr void stringPop(SView& view, int count)
{
  view = view.substr(0, view.size() - count);
}
// -----------------------------------------------------------------------------
template <typename SView>
constexpr char stringPopBack(SView& view)
{
  auto const c = view.back();
  view         = view.substr(0, view.size() - 1);
  return c;
}
// -----------------------------------------------------------------------------
template <typename E>
constexpr auto enumHasFlag(E value, E flag)
{
  static_assert(std::is_enum_v<E>, "\"enumHasFlag\" only accepts enumeration types");
  return (value & flag) != E(std::underlying_type_t<E>(0));
}
// -----------------------------------------------------------------------------
}  // namespace cppgen
