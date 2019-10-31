//===------------------------ exception.cpp -------------------------------===//
//
//                     The LLVM Compiler Infrastructure
//
// This file is dual licensed under the MIT and the University of Illinois Open
// Source Licenses. See LICENSE.TXT for details.
//
//===----------------------------------------------------------------------===//
#include <stdlib.h>

#include "exception"

#ifndef __has_include
#define __has_include(inc) 0
#endif

namespace std
{

bool uncaught_exception() _NOEXCEPT
{
    return false;
}


}