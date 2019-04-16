#pragma once
#include "ipfs.hpp"
#include "log.hpp"
#include "../Common/base/base64.hpp"
// #include "../Common/base/base32.hpp"
#include "../Common/base/base58.hpp"

// todo: bases64
// todo: string5/6 (name)
// todo: signed int, floating points, fixed point, key256, 
// todo: optimize by avoiding copies everywhere
std::string toBase64(std::vector<char> data){
    return fc::base64_encode(std::string(data.begin(),data.end()));
}

#define ADVANCE(bits) \
{ \
    bitposition += bits;    \
    bitsLeftTotal -= bits;  \
    if(bitposition > 7){ \
        position = position + (bitposition / 8);\
        bitposition = bitposition % 8; \
    } \
} while(0);

#define READ_BITS(bits, into){ \
    int32_t bitsLeftTotal = 0+bits; \
    unsigned char b; \
    into.reserve((bits / 8)+1); \
    while(bitsLeftTotal > 0){ \
        b = (unsigned char)data[position];\
        b = (b << (bitposition)) >> (bitposition); \
        auto bitsLeftCurrentByte = (8-bitposition); \
        auto currentByteBits = bitsLeftTotal > bitsLeftCurrentByte ? bitsLeftCurrentByte : bitsLeftTotal;\
        auto currentByteMask = (0xff >> (8-currentByteBits)); \
        into.push_back((b >> (bitsLeftCurrentByte-currentByteBits)) & currentByteMask); \
        ADVANCE(currentByteBits);   \
    } \
} while(0);

#define CONVERT_TO_UINT(buffer, into){ \
    into = 0; \
    for (uint8_t i = 0; i < buffer.size(); i++) { \
        into = into << 8;\
        into = into + static_cast<uint8_t>(buffer[buffer.size()-1-i]); \
    } \
} while(0);

// #define CONVERT_TO_INT(buffer, into)\
// { \
//     for (int8_t i = buffer.size()-1; i >= 0; i--) { \
//         into <<= 8;\
//         into += buffer[i]; \
//     } \
// } while(0);

#define READ_UINT(bits,type,assign_to)\
{\
    uint128_t tmpVal =0; \
    auto buffer = std::vector<char>();\
    READ_BITS(bits, buffer);\
    CONVERT_TO_UINT(buffer, tmpVal); \
    assign_to = static_cast<type>(tmpVal); \
} while(0); 


#define WRITE_BITS(bits, from_buffer){  \
    bitsLeftTotal = 0+bits; \
    uint32_t bufferPos=0;\
    while(bitsLeftTotal>0){ \
        b = static_cast<unsigned char>(from_buffer[bufferPos++]);\
        auto bitsLeftCurrentByte = (8-bitposition); \
        auto currentByteBits = bitsLeftTotal > bitsLeftCurrentByte ? bitsLeftCurrentByte : bitsLeftTotal;\
        if(position >= into.size()){ \
            into.push_back(0); \
        } \
        into[position] = into[position] | (b << (bitsLeftCurrentByte-currentByteBits)); \
        ADVANCE(currentByteBits);   \
    } \
} while(0);

#define CONVERT_FROM_UINT(buffer, from_uint){ \
    uint128_t left = from_uint; \
    while(left){\
        buffer.push_back((left & 0xff));\
        left = left >> 8;\
    } \
} while(0);

// #define CONVERT_FROM_INT(buffer, from_uint){ \
//     auto left = from_uint; \
//     while(left){\
//         buffer.push_back(static_cast<char>(left & 0xff));\
//         left >>= 8;\
//     } \
// } while(0);

#define WRITE_UINT(bits, from_uint)\
buffer = std::vector<char>();\
CONVERT_FROM_UINT(buffer, from_uint); \
WRITE_BITS(bits, buffer);


typedef uint8_t pred_code_t;
typedef uint16_t pred_namespace_t;
// template<typedef T> 
// struct typeWrapper{
//     T value;
// }

// typedef typeWrapper<std::vector<char>> string5;
// typedef typeWrapper<std::vector<char>> string6;
// typedef typeWrapper<string> base64str_t;
// typedef typeWrapper<string> base32str_t;
// typedef typeWrapper<std::vector<char>> base58str_t;
// typedef typeWrapper<std::vector<char>> varint_t;


// struct helpers{
//     // base32
//     // static string decode(const base32str_t &value){
//     //     string res;
//     //     return res;
        
//     // }
//     // static base32str_t encode(const string &value){
//     //     base32str_t res;
//     //     return res;
//     // }

//     // base58
//     static string decode(const base58str_t &value){
//         return base58_decode(value.value);
        
//     }
//     static base58str_t encode(const string &value){
//         base58str_t res;
//         res.value = base58_encode(value);
//         return res;
        
//     }

//     // base64
//     static string decode(const base64str_t &value){
//         return fc::base64_decode(value.value);
//     }
//     static base64str_t encode(const string &value){
//         base58str_t res;
//         res.value = fc::base64_encode(value);
//         return res;
//     }
    
//     // string 5;
//     // static name convert(const string5 &value){
//     //     name res;
//     //     return res;
//     // }
//     // static string5 convert(const name &value){
//     //     string5 res;
//     //     return res;
//     // }
//     static string convert(const string5 &value){
//         string res;
//         return res;
//     }
//     static string5 convert(const string &value){
//         string5 res;
//         return res;
//     }
//     // string6
//     static string convert(const string6 &value){
//         string res;
//         return res;
//     }
//     static string6 convert(const string &value){
//         string6 res;
//         return res;
//     }
// };

// template <typename TVAL,TPOS>
// struct fixedpoint_t{
//     TVAL value;
//     TPOS point_pos;
// }
enum EPredicateNamespace{
    PRED_NS_BASIC,
    PRED_NS_VERSION,
    PRED_NS_ACL,
    PRED_NS_CRYPT,
    PRED_NS_ONTOLOGY,
    PRED_NS_CONTENT,
    PRED_NS_MSG,
    PRED_NS_MEDIA,
    PRED_NS_SOCIAL,
    PRED_NS_EOS,
    PRED_NS_CODE,
    PRED_NS_GAME,
    PRED_NS_UNIT,
    PRED_NS_TIMEGEO,
    PRED_NS_POINTER,
    PRED_NS_ABI
};

enum EPredicateNSABI{
    PRED_ABI__RICARDIAN_CLAUSE,
    PRED_ABI__RICARDIAN_CONTRACT,
    PRED_ABI__INDEX_TYPE,
    PRED_ABI__KEY_NAME,
    PRED_ABI__KEY_TYPE,
};

enum EPredicateNSVersion{
    PRED_VERSION__CURRENT,
    PRED_VERSION__PREVIOUS,
    PRED_VERSION__CURRENT_REVISION,
    PRED_VERSION__PREVIOUS_REVISION
};

enum EPredicateNSACL{
    PRED_ACL__CUSTOMACL,
    PRED_ACL__CANNEDACL
};

enum EPredicateNSCrypto{
    PRED_CRYPT__ENCRYPTED_VALUE,
    PRED_CRYPT__PUBLIC_KEY,
    PRED_CRYPT__PRIVATE_KEY,
    PRED_CRYPT__NONCE
};

enum EPredicateNSTimeGeo{
    PRED_TIMEGEO__AT,
    PRED_TIMEGEO__IN,
    // TIME
    PRED_TIMEGEO__BEGIN,
    PRED_TIMEGEO__END,
    PRED_TIMEGEO__TIME,
    PRED_TIMEGEO__TIMEZONE,
    PRED_TIMEGEO__COORDINATES,
    PRED_TIMEGEO__LONG,
    PRED_TIMEGEO__LAT,
    PRED_TIMEGEO__CITY,
    PRED_TIMEGEO__COUNTRY,
    PRED_TIMEGEO__STATE,
    PRED_TIMEGEO__ZIPCODE,
    PRED_TIMEGEO__ADDRESS1,
    PRED_TIMEGEO__ADDRESS2,
    PRED_TIMEGEO__LOCATION,
    PRED_TIMEGEO__EVENT,
    PRED_TIMEGEO__POSITION
};

enum EPredicateNSOntology{
    PRED_ONTO__SAMEAS,
    PRED_ONTO__SUBTYPEOF,
    PRED_ONTO__ISA, // type
};

enum EPredicateNSContent{
    PRED_CONTENT__AUTHOR,
    PRED_CONTENT__SUBJECT,
    PRED_CONTENT__TAG,
    PRED_CONTENT__RATING,
    PRED_CONTENT__REPLYTO,
    PRED_CONTENT__COMMENT,
    PRED_CONTENT__CONTENT,
    PRED_CONTENT__MEDIA,
};
enum EPredicateNSMessage{
    PRED_MSG__FROM,
    PRED_MSG__TO,
    PRED_MSG__AT,
    PRED_MSG__CC,
    PRED_MSG__BCC
};


    
enum EPredicateNSMedia{
    PRED_MEDIA__FORMAT,
    PRED_MEDIA__THUMBNAIL,
    PRED_MEDIA__VIDEO,
    PRED_MEDIA__IMAGE
};
enum EPredicateNSSocial{
    PRED_SOCIAL__NICKNAME,
    PRED_SOCIAL__PROFILE_IMAGE,
    PRED_SOCIAL__FRIENDOF,
    PRED_SOCIAL__HANDLE,
    PRED_SOCIAL__NETWORK // facebook/telegram/etc
    
};
enum EPredicateNSEOS{
    PRED_EOS__BLOCK_PRODUCER,
    PRED_EOS__PROXY,
    PRED_EOS__VOTES,
    PRED_EOS__REWARD,
    PRED_EOS__NETWORK,
    PRED_EOS__CPU,
    PRED_EOS__RAM
};

enum EPredicateNSCode{
    PRED_CODE__FUNCTION,
    PRED_CODE__TYPE,
    PRED_CODE__MODULE,
    PRED_CODE__FIELD,
    PRED_CODE__BLOCK,
    PRED_CODE__BEGIN,
    PRED_CODE__END,
    PRED_CODE__IF,
    PRED_CODE__WHILE,
    PRED_CODE__FOR,
    PRED_CODE__CALL,
    PRED_CODE__ASSIGN,
    PRED_CODE__VARIABLE,
    PRED_CODE__CONSTANT,
    PRED_CODE__RETURN,
    PRED_CODE__ACTION,
    PRED_CODE__ARGUMENT,
    PRED_CODE__TABLE,
    PRED_CODE__PARAMETER,
    PRED_CODE__CLASS,
    PRED_CODE__BASE,
    PRED_CODE__STRUCT,
    PRED_CODE__SWITCH,
    PRED_CODE__CASE,
    PRED_CODE__GOTO,
    PRED_CODE__LABEL,
    PRED_CODE__TAIL,
    PRED_CODE__HEAD,
    PRED_CODE__BY,
    PRED_CODE__IN,
    PRED_CODE__FOREACH,
    PRED_CODE__ITERATOR,
    PRED_CODE__NEXT,
    PRED_CODE__RESET,
    PRED_CODE__MAIN,
    PRED_CODE__VOID,
    PRED_CODE__TYPEDEF,
    PRED_CODE__DEFINITION,
    PRED_CODE__DECLERATION,
    PRED_CODE__PUBLIC,
    PRED_CODE__PRIVATE,
    PRED_CODE__PROTECTED,
    PRED_CODE__THIS,
    PRED_CODE__MEMBER,
    PRED_CODE__TEMPLATE,
    PRED_CODE__OPERATOR,
    PRED_CODE__OVERRIDE,
    PRED_CODE__OVERLOAD,
    PRED_CODE__VIRTUAL,
    PRED_CODE__REFERENCE,
    PRED_CODE__POINTER,
    PRED_CODE__CALLEE,
    PRED_CODE__CALLER,
    PRED_CODE__BREAK,
    PRED_CODE__CONTINUE,
    PRED_CODE__THROW,
    PRED_CODE__NEW,
    PRED_CODE__EXPRESSION,
    PRED_CODE__FUNCTION_SIGNATURE,
    PRED_CODE__STATEMENT,
    PRED_CODE__STATIC,
    PRED_CODE__CAST,
    PRED_CODE__INDEXER,
    PRED_CODE__YIELD,
    PRED_CODE__ASYNC,
    PRED_CODE__AWAIT,
    PRED_CODE__CLOSURE,
    PRED_CODE__PROTOTYPE,
    PRED_CODE__DEFAULT,
    PRED_CODE__LANGUAGE,
    PRED_CODE__EXTENSION,
    PRED_CODE__PLUGIN,
    PRED_CODE__PACKAGE,
    PRED_CODE__LIBRARY
    //...
};


enum EPredicateNSGame{
    PRED_GAME__PLAYER,
    PRED_GAME__NPC,
    PRED_GAME__CHARACTER,
    PRED_GAME__UNIT,
    PRED_GAME__ATTRIBUTE,
    PRED_GAME__INVENTORY, // or item
    // ...
};
enum EPredicateNSUnit{
    PRED_UNIT__BYTES,
    PRED_UNIT__CELSIUS,
    PRED_UNIT__FAHRENHEIT,
    PRED_UNIT__GRAM, 
    PRED_UNIT__METER,
    PRED_UNIT__SQUARE_METER,
    PRED_UNIT__CUBIC_METER,
    PRED_UNIT__FEET,
    PRED_UNIT__SQUARE_FEET,
    PRED_UNIT__CUBIC_FEET,
    PRED_UNIT__TOKENS,
    PRED_UNIT__SECONDS,
    PRED_UNIT__PRECISION
};


enum EBasicPredicate{
    PRED_HYPER_GRAPH_NODE, // value is a predicate node
    PRED_ID,
    PRED_URI,
    PRED_NAME,
    PRED_DESCRIPTION,
    PRED_FIRST_NAME,
    PRED_LAST_NAME,
    PRED_CHAIN,
    PRED_EMAIL,
    PRED_ADDRESS,
    PRED_OWNER,
    PRED_PLISTLINK,
    PRED_IPFSLINK,
    PRED_VALUE,
    PRED_CONTRACT,
    PRED_CREATED_AT,
    PRED_MODIFIED_AT,
    PRED_EXPIRES_AT,
    PRED_NEXT, // or PREV 
    PRED_CHILD, // or parent
    PRED_SIZE,
    PRED_PRICE,
    PRED_ACCOUNT, 
    PRED_PLIST,
    PRED_MULTICODEC, 
    PRED_MULTIBASE,
    PRED_MULTIBITSTRING, // 2bit [5 to 8] - 
    PRED_CHECKSUM, 
    PRED_PRIMARY_INDEX_KEY,
    PRED_INDEX_KEY,
    
    // value type descriptors
    PRED_VALUE_BINARY,
    PRED_VALUE_FCTYPED, // pack/unpack
    PRED_VALUE_PLISTENTRY, // embedded
    PRED_VALUE_IPFSHASH, // link
    PRED_VALUE_FCTYPED_CHUNKED, // pack/unpack
    PRED_VALUE_UINT_8,
    PRED_VALUE_UINT_16,
    PRED_VALUE_UINT_32,
    PRED_VALUE_UINT_64,
    PRED_VALUE_UINT_128,
    PRED_VALUE_INT_8,
    PRED_VALUE_INT_16,
    PRED_VALUE_INT_32,
    PRED_VALUE_INT_64,
    PRED_VALUE_INT_128,
    PRED_VALUE_INT_VAR,
    PRED_VALUE_KEY256,

    PRED_VALUE_STRING_8,    // ascii
    
    // TBD more string:
    PRED_VALUE_STRING_U8,   // UTF8
    PRED_VALUE_STRING_16,   // unicode
    PRED_VALUE_STRING_5,    // name
    PRED_VALUE_STRING_6,    // extended
    PRED_VALUE_BASE64_STRING,   // unicode
    PRED_VALUE_BASE58_STRING,   // unicode
    PRED_VALUE_BASE32_STRING,   // unicode
    
    // TBD more types:
    PRED_VALUE_FLOATING_POINT_16, 
    PRED_VALUE_FLOATING_POINT_32,
    PRED_VALUE_FLOATING_POINT_64, 
    PRED_VALUE_FLOATING_POINT_128, 
    PRED_VALUE_FLOATING_POINT_256, 
    PRED_VALUE_FLOATING_POINT_VAR, 
    PRED_VALUE_FIXED_POINT_16,
    PRED_VALUE_FIXED_POINT_32,
    PRED_VALUE_FIXED_POINT_64,
    PRED_VALUE_FIXED_POINT_128,
    PRED_VALUE_FIXED_POINT_256,
    PRED_VALUE_FIXED_POINT_VAR,
    
    // POINTER
    PRED_VALUE_MULTIDX_POINTER,  
    PRED_VALUE_MULTIDX_SEC_POINTER, 
    PRED_VALUE_MULTIDX_RANGE_POINTER, 
    PRED_VALUE_MULTIDX_RANGE_SEC_POINTER, 
    
    // XPOINTER
    PRED_VALUE_XCHAIN_MULTIDX_POINTER,  
    PRED_VALUE_XCHAIN_MULTIDX_SEC_POINTER, 
    PRED_VALUE_XCHAIN_MULTIDX_RANGE_POINTER, 
    PRED_VALUE_XCHAIN_MULTIDX_RANGE_SEC_POINTER, 
    // X POINTER - foreign
    PRED_VALUE_FOREIGN_XCHAIN_POINTER,
    PRED_VALUE_FOREIGN_XCHAIN_RANGE_POINTER
};


class plistentry {
    public:
    // 4 bits
    enum EDataSize{ 
        DS_1,   //8b
        DS_1V,  //8b  variable
        DS_2,   //16b
        DS_2V,  //16b variable
        DS_3V,  //24b variable
        DS_4,   //32b
        DS_8,   //64b
        DS_16,  //128b
        DS_32,  //256b
        DS_64,  //512b
        DS_128, //1Kbit
        DS_256, //2Kbit45
        DS_1K,  //8Kbit
        DS_4K,  //32Kbit
        DS_16K, //128Kbit
        DS_128K //1Mbit (MAX)
    };
    
    enum EIsArray{ // 1bits
        IA_SINGLE,
        IA_ARRAY
    };
    
    enum EDataType{ // 1bits
        DT_DATA, // string/binary/primitives/none
        DT_PLIST_ENTRY_POINTER // read pointed value as plist entry
    };

    enum EPredicateType{ // 2bits
        PT_NONE,
        PT_BASIC,
        PT_NAMESPACED,
        PT_REFIED
    };
    
    enum EPredicateDirection{ //1bit
        PD_BASIC,
        PD_BACKLINK
    };

    
    struct predicate_t{
        EPredicateType      type;
        struct basic_predicate_t{        
            EPredicateDirection backlink;
            pred_code_t         code;
        };
        pred_namespace_t    pnamespace;
        basic_predicate_t   basic;
        ipfsmultihash_t     node;
    };
    
    // EDataSize           data_size;
    EIsArray            data_is_array;
    EDataType           data_type;
    predicate_t         pred;
    std::vector<char>   raw_value;

    std::vector<char> get_raw() const{
        std::vector<char> res = std::vector<char>();
        switch(data_type){
            case DT_PLIST_ENTRY_POINTER:
                // raw_value is a link 
                
                // entry = plistentry::unpackFromIPFS(raw_value);
                // return entry.get_raw();
                
                return ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(raw_value));
            case DT_DATA:
                return raw_value;
        };
        return res;
    };
    
    std::vector<char> set_raw(std::vector<char> value){
        switch(data_type){
            case DT_PLIST_ENTRY_POINTER:
                // value must be an entry
                // write it to ipfs
                // return ipfs hash
                // plistentry entry;
                // entry.data_type = DT_PLIST_ENTRY_POINTER;
                // entry
                
                return uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(value));
            case DT_DATA:
                return value;
        };
    };

    // varint           as_varint(){
    // };
    // template <typename TVAL,TPOS>
    // fixedpoint_t<TVAL,TPOS>   as_fixedpoint(){
    //     fixedpoint_t<TVAL,TPOS> res;
    //     res.value = as_int128(); // todo mask
    //     res.point_pos = as_uint128(); // todo mask
    //     return res;
    // };
    plistentry& operator<<(const std::vector<char> &value){
        pred.basic.code = PRED_VALUE_BINARY;
        pred.type = PT_BASIC;
        raw_value = set_raw(value);
        return *this;
    }
    std::vector<char> get_vectorc() const { 
        return get_raw();
    }

    
    // plistentry& operator= (const varint_t &value){
    //     pred.code = PRED_VALUE_INT_VAR;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    // operator varint_t() const {
    //     return get_raw();
    // }
    
    
    
    
    
    template <typename T>
    plistentry& _setuint(const T &num){
        auto _raw_value = std::vector<char>();
        CONVERT_FROM_UINT(_raw_value, num);
        auto size =_raw_value.size();
        pred.type = PT_BASIC;
        if(size <= 1){
            pred.basic.code = (pred_code_t)PRED_VALUE_UINT_8;
        }else if(size <= 2){
            pred.basic.code = (pred_code_t)PRED_VALUE_UINT_16;
        }else if(size <= 4){
            pred.basic.code = (pred_code_t)PRED_VALUE_UINT_32;
        }else if(size <= 8){
            pred.basic.code = (pred_code_t)PRED_VALUE_UINT_64;
        }else if(size <= 16){
            pred.basic.code = (pred_code_t)PRED_VALUE_UINT_128;
        }else{
            eosio::check(false,"num too big"); // should never happen
        }
        raw_value = set_raw(_raw_value);
        return *this;
    }
    // template <typename T>
    // plistentry& _setint(const T &num){
    //     raw_value = std::vector<char>();
    //     CONVERT_FROM_INT(raw_value, num);
    //     auto size =raw_value.size();
    //     if(size <= 1){
    //         pred.basic.code = (pred_code_t)PRED_VALUE_INT_8;
    //     }else if(size <= 2){
    //         pred.basic.code = (pred_code_t)PRED_VALUE_INT_16;
    //     }else if(size <= 4){
    //         pred.basic.code = (pred_code_t)PRED_VALUE_INT_32;
    //     }else if(size <= 8){
    //         pred.basic.code = (pred_code_t)PRED_VALUE_INT_64;
    //     }else if(size <= 16){
    //         pred.basic.code = (pred_code_t)PRED_VALUE_INT_128;
    //     }else{
    //         eosio::check(false,"num too big"); // should never happen
    //     }
    //     return *this;
    // }
    
    uint8_t get_uint8() const {
        auto raw = get_raw();
        uint8_t res;
        CONVERT_TO_UINT(raw, res);
        return res;
    }
    plistentry& operator<<(const uint8_t &num){
        return _setuint(num);
    }
    // plistentry& operator= (const int8_t &num){
    //     pred.basic.code = static_cast<pred_code_t>(PRED_VALUE_INT_8);
    //     raw_value = std::vector<char>();
    //     CONVERT_FROM_INT(raw_value, num);
    //     return *this;
    // }
    // operator int8_t() const { 
    //     auto raw = get_raw();
    //     int8_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return res;
    // }
    
    
    plistentry& operator<<(const uint16_t &num){
        return _setuint(num);
    }
    uint16_t get_uint16() const { 
        auto raw = get_raw();
        uint16_t res;
        CONVERT_TO_UINT(raw, res);
        return res;
    }
    // plistentry& operator= (const int16_t &num){
    //     return _setint(num);
    // }
    // operator int16_t() const { 
    //     auto raw = get_raw();
    //     int16_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return res;
    // }
    plistentry& operator<<(const uint32_t &num){
        return _setuint(num);
    }
    uint32_t get_uint32() const { 
        auto raw = get_raw();
        uint32_t res;
        CONVERT_TO_UINT(raw, res);
        return res;
    }
    // plistentry& operator= (const int32_t &num){
    //     return _setint(num);
    // }
    // operator int32_t() const { 
    //     auto raw = get_raw();
    //     int32_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return res;
    // }
    
    plistentry& operator<<(const uint64_t &num){
        return _setuint(num);
    }
    uint64_t get_uint64() const { 
        auto raw = get_raw();
        uint64_t res;
        CONVERT_TO_UINT(raw, res);
        return res;
    }
    // plistentry& operator= (const int64_t &num){
    //     return _setint(num);
    // }
    // operator int64_t() const { 
    //     auto raw = get_raw();
    //     int64_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return res;
    // }
    plistentry& operator <<(const uint128_t &num){
        return _setuint(num);
    }
    
    uint128_t get_uint128() const { 
        auto raw = get_raw();
        uint128_t res;
        CONVERT_TO_UINT(raw, res);
        return res;
    }
    // plistentry& operator= (const int128_t &num){
    //     return _setint(num);
    // }
    // operator int128_t() const { 
    //     auto raw = get_raw();
    //     int128_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return res;
    // }
    
    // plistentry& operator= (const double &num){
    //     return _setint((uint64_t)num);
    // }
    // plistentry& operator= (const float &num){
    //     return _setint((uint32_t)num);
    // }
    
    // operator float() const {
    //     auto raw = get_raw();
    //     int32_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return (float)res;
    // }
    
    // operator double() const {
    //     auto raw = get_raw();
    //     int64_t res;
    //     CONVERT_TO_INT(raw, res);
    //     return (double)res;
    // }
    
    // plistentry& operator= (const eosio::checksum256 &value){
    //     pred.basic.code = PRED_VALUE_KEY256;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    
    // operator eosio::checksum256() const { 
    //     auto raw = get_raw();
    //     return eosio::checksum256(raw.begin(),raw.end());
    // }

    // plistentry& operator= (const ipfsmultihash_t &value){
    //     pred.code = PRED_VALUE_IPFSHASH;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    
    // operator ipfsmultihash_t() const { 
    //     auto raw = get_raw();
    //     return ipfsmultihash_t(raw.begin(),raw.end());
    // }

    
    plistentry& operator<<(std::string &value){
        pred.basic.code = PRED_VALUE_STRING_8;
        pred.type = PT_BASIC;
        raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
        return *this;
    }
    std::string get_string() const { 
        auto raw = get_raw();
        return std::string(raw.begin(),raw.end());;
    }

    // plistentry& operator= (const string5 &value){
    //     pred.code = PRED_VALUE_STRING_5;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }

    // operator string5() const { 
    //     auto raw = get_raw();
    //     return string5(raw.begin(),raw.end());
    // }
    
    // plistentry& operator= (const string6 &value){
    //     pred.code = PRED_VALUE_STRING_6;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }

    // operator string6() const { 
    //     auto raw = get_raw();
    //     return string6(raw.begin(),raw.end());
    // }
    
    // plistentry& operator= (const base32str_t &value){
    //     pred.code = PRED_VALUE_BASE32_STRING;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    // operator base32str_t() const { 
    //     auto raw = get_raw();
    //     return base32str_t(raw.begin(),raw.end());
    // }
    

    // plistentry& operator= (const base64str_t &value){
    //     pred.code = PRED_VALUE_BASE64_STRING;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    // operator base64str_t() const { 
    //     auto raw = get_raw();
    //     return base32str_t(raw.begin(),raw.end());
    // }

    // plistentry& operator= (const base58str_t &value){
    //     pred.code = PRED_VALUE_BASE58_STRING;
    //     raw_value = set_raw(std::vector<char>(value.begin(), value.end()));
    //     return *this;
    // }
    // operator base58str_t() const { 
    //     auto raw = get_raw();
    //     return base58str_t(raw.begin(),raw.end());
    // }
    uint32_t chunkSize = 261144;
    // uint32_t chunkSize = 256;
    plistentry& operator<<(std::vector<plistentry> &value){
        data_is_array = IA_ARRAY;
        // serialize
        pred.type = PT_BASIC;
        pred.basic.code = PRED_VALUE_FCTYPED;
        
        std::vector<char> raw;
        uint64_t passedItems =0;
        for (auto element : value) {
            std::vector<char> res;
            res = set_raw(element.pack());
            if(raw.size() + res.size() >= chunkSize){
                // need to chunk
                pred.basic.code = PRED_VALUE_FCTYPED_CHUNKED;
                
                plistentry nextList;
                std::vector<plistentry> theRest = std::vector<plistentry>(value.begin()+passedItems, value.end());
                nextList.chunkSize = (*this).chunkSize;
                nextList << theRest;
                plistentry nextListPointer;
                nextListPointer.data_type = DT_PLIST_ENTRY_POINTER;
                nextListPointer.setPL(nextList);
                auto nextRes = nextListPointer.pack();
                // LOG_DEBUG("next chunk :" + toBase64(nextRes));
                raw.insert(raw.end(), nextRes.begin(), nextRes.end());
                break;
            }
            passedItems++;
            raw.insert(raw.end(), res.begin(), res.end());
        }
        raw_value = raw;
        return *this;
    }
    

    
    template<typename T> 
    plistentry& operator<<(std::vector<T> &value){
        data_is_array = IA_ARRAY;
        // serialize
        pred.type = PT_BASIC;
        pred.basic.code = PRED_VALUE_FCTYPED;
        
        std::vector<char> raw;
        for (auto element : value) {
            std::vector<char> res;
            res = set_raw(eosio::pack(element));
            raw.insert(raw.end(), res.begin(), res.end());
        }
        raw_value = raw;
        return *this;
    }
    

    std::vector<plistentry> getPLVec() { 
        eosio::check(data_is_array, "not an array type  - for vector<plistentry>");
        uint32_t position = 0;
        std::vector<plistentry> res;
        
        while(position < raw_value.size()){
            std::vector<char> currentBuffer;
            std::vector<char> currentSourceBuffer;
            plistentry currentObj;
            switch(data_type){
                case DT_PLIST_ENTRY_POINTER:
                    // raw_value is a link 
                    currentSourceBuffer = std::vector<char>(raw_value.begin() + position, raw_value.begin()+position +36);
                    currentBuffer = ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(currentSourceBuffer));
                    
                    currentObj = plistentry::unpack2(currentBuffer);
                    position += 36;
                    


                    break;
                case DT_DATA:
                    currentBuffer = std::vector<char>(raw_value.begin() + position, raw_value.end());
                    currentObj = plistentry::unpack2(currentBuffer);
                    position += currentObj.pack().size();
                    break;
            };
            if(position == raw_value.size() && pred.basic.code == PRED_VALUE_FCTYPED_CHUNKED){
                // this one is not an item, but the next list.
                auto nextListPointer = currentObj.getPL();
                auto nextList = nextListPointer.getPLVec();
                // append next list
                // LOG_DEBUG("concat next chunks:" + fc::to_string(nextList.size()) + " " + toBase64(currentBuffer));
                res.insert(res.end(),nextList.begin(),nextList.end());
                return res;
            }            
            res.push_back(*(new plistentry(currentObj)));
        }
        return res;
    }    
    template<typename T> 
    std::vector<T> getVec() { 
        eosio::check(data_is_array, "not an array type - for vector<T>");
        uint32_t position = 0;
        std::vector<T> res = std::vector<T>();
        std::vector<char> currentBuffer;
        std::vector<char> currentSourceBuffer;
        
        while(position < raw_value.size()){
            T currentObj;
            switch(data_type){
                case DT_PLIST_ENTRY_POINTER:
                    // raw_value is a link 
                    currentSourceBuffer = std::vector<char>(raw_value.begin() + position, raw_value.begin()+position +36);
                    currentBuffer = ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(currentSourceBuffer));
                    currentObj = eosio::unpack<T>(currentBuffer);
                    position += 36;
                    break;
                case DT_DATA:
                    currentBuffer = std::vector<char>(raw_value.begin() + position, raw_value.end());
                    currentObj = eosio::unpack<T>(currentBuffer);
                    position += eosio::pack_size( currentObj );
                    break;
            };
            
            
            res.push_back(*(new T(currentObj)));
        }
        return res;
    }

    
     plistentry& getPL() const { 
        auto raw = get_raw();
        return plistentry::unpack(raw);
    }

    
    void setPL(plistentry &raw_valuevalue){
        pred.type = PT_BASIC;
        pred.basic.code = PRED_VALUE_FCTYPED;
        raw_value = set_raw(raw_valuevalue.pack());
    }
    
    
    template<typename T> 
     T& getObject() const { 
        auto raw = get_raw();
        const T object = eosio::unpack<T>(raw);
        auto res = new T(object);
        return *res;
    }

    template<typename T>
    plistentry& setObject(T &raw_valuevalue){
        pred.type = PT_BASIC;
        pred.basic.code = PRED_VALUE_FCTYPED;
        raw_value = set_raw(eosio::pack(raw_valuevalue));
        return *this;
    }
    
    template<typename T>
    plistentry& operator <<(plistentry &raw_valuevalue){
        setPL(raw_valuevalue);
        return *this;
    }
    
    template<typename T>
    plistentry& operator <<(T &raw_valuevalue){
        setObject(raw_valuevalue);
        return *this;
    }
    
    
    

    static plistentry& unpack(std::vector<char> data){
        plistentry *pres = new plistentry();
        plistentry &res = *pres;
        uint32_t position = 0;
        uint32_t  bitposition = 0;
        EDataSize data_size;
        READ_UINT(4,EDataSize,data_size);
        READ_UINT(1,EDataType,res.data_type);
        READ_UINT(1,EIsArray,res.data_is_array);
        READ_UINT(2,EPredicateType,res.pred.type);
        switch(res.pred.type){
            case PT_NONE:
                break;                
            case PT_BASIC: // 1 byte
                READ_UINT(1,EPredicateDirection,res.pred.basic.backlink);
                READ_UINT(7,pred_code_t,res.pred.basic.code);
                res.pred.pnamespace = (pred_namespace_t)PRED_NS_BASIC;
                break;
            case PT_NAMESPACED: // 3 bytes
                READ_UINT(8,pred_code_t,res.pred.basic.code);
                READ_UINT(1,EPredicateDirection,res.pred.basic.backlink);
                READ_UINT(15,pred_namespace_t,res.pred.pnamespace);
                break;
            case PT_REFIED: // 32 bytes
                std::vector<char> buffer;
                READ_BITS(256, res.pred.node);
                break;                
        }
        uint32_t basicSize = 0;
        auto varsize = false;
        switch(data_size){
            case DS_1:
                basicSize = 1;
                break;
            case DS_1V:
                varsize = true;
                basicSize = 1;
                break;
            case DS_2:
                basicSize = 2;
                break;
            case DS_2V:
                varsize = true;
                basicSize = 2;
                break;
            case DS_3V:
                varsize = true;
                basicSize = 3;
                break;
            case DS_4:
                basicSize = 4;
                break;
            case DS_8:
                basicSize = 8;
                break;
            case DS_16:
                basicSize = 16;
                break;
            case DS_32:
                basicSize = 32;
                break;
            case DS_64:
                basicSize = 64;
                break;
            case DS_128:
                basicSize = 128;
                break;                
            case DS_256:
                basicSize = 256;
                break;                
            case DS_1K:
                basicSize = 1024;
                break;                
            case DS_4K:
                basicSize = 4096;
                break;                
            case DS_16K:
                basicSize = 16384;
                break;
            case DS_128K:
                basicSize = 131072;
                break;                
        }
        READ_BITS(basicSize*8, res.raw_value);
        auto resp = new plistentry(res);
        if(varsize){
            uint32_t raw_size =0;
            CONVERT_TO_UINT(res.raw_value, raw_size);
            // LOG_DEBUG("unpacked:" + fc::to_string(raw_size) + " bytes for size:" + toBase64(res.raw_value));
            resp->raw_value = std::vector<char>();
            READ_BITS(raw_size*8, resp->raw_value);
        }
        return *resp;
    }



    static plistentry unpack2(std::vector<char> data){
        plistentry res;
        uint32_t position = 0;
        uint32_t  bitposition = 0;
        EDataSize data_size;
        READ_UINT(4,EDataSize,data_size);
        READ_UINT(1,EDataType,res.data_type);
        READ_UINT(1,EIsArray,res.data_is_array);
        // LOG_DEBUG("res.data_is_array:" + fc::to_string(res.data_is_array));
        READ_UINT(2,EPredicateType,res.pred.type);
        switch(res.pred.type){
            case PT_NONE:
                break;                
            case PT_BASIC: // 1 byte
                READ_UINT(1,EPredicateDirection,res.pred.basic.backlink);
                READ_UINT(7,pred_code_t,res.pred.basic.code);
                res.pred.pnamespace = (pred_namespace_t)PRED_NS_BASIC;
                break;
            case PT_NAMESPACED: // 3 bytes
                READ_UINT(8,pred_code_t,res.pred.basic.code);
                READ_UINT(1,EPredicateDirection,res.pred.basic.backlink);
                READ_UINT(15,pred_namespace_t,res.pred.pnamespace);
                break;
            case PT_REFIED: // 32 bytes
                std::vector<char> buffer;
                READ_BITS(256, res.pred.node);
                break;                
        }
        uint32_t basicSize = 0;
        auto varsize = false;
        switch(data_size){
            case DS_1:
                basicSize = 1;
                break;
            case DS_1V:
                varsize = true;
                basicSize = 1;
                break;
            case DS_2:
                basicSize = 2;
                break;
            case DS_2V:
                varsize = true;
                basicSize = 2;
                break;
            case DS_3V:
                varsize = true;
                basicSize = 3;
                break;
            case DS_4:
                basicSize = 4;
                break;
            case DS_8:
                basicSize = 8;
                break;
            case DS_16:
                basicSize = 16;
                break;
            case DS_32:
                basicSize = 32;
                break;
            case DS_64:
                basicSize = 64;
                break;
            case DS_128:
                basicSize = 128;
                break;                
            case DS_256:
                basicSize = 256;
                break;                
            case DS_1K:
                basicSize = 1024;
                break;                
            case DS_4K:
                basicSize = 4096;
                break;                
            case DS_16K:
                basicSize = 16384;
                break;
            case DS_128K:
                basicSize = 131072;
                break;                
        }
        READ_BITS(basicSize*8, res.raw_value);
        if(varsize){
            uint32_t raw_size =0;
            CONVERT_TO_UINT(res.raw_value, raw_size);
            res.raw_value = std::vector<char>();
            READ_BITS(raw_size*8, res.raw_value);
        }
        return res;
    }
    
    
    std::vector<char> pack(){
        std::vector<char> into;
        into.reserve(32);
        auto buffer = std::vector<char>();
        uint32_t position = 0;
        uint32_t  bitposition = 0;
        uint8_t basicSize;
        int32_t bitsLeftTotal;
        unsigned char b;
        uint32_t raw_size = raw_value.size();
        auto varsize = false;
        switch(raw_size){
            case 1:
                basicSize = DS_1;
                break;
            case 2:
                basicSize = DS_2;
                break;
            case 4:
                basicSize = DS_4;
                break;
            case 8:
                basicSize = DS_8;
                break;
            case 16:
                basicSize = DS_16;
                break;
            case 32:
                basicSize = DS_32;
                break;
            case 64:
                basicSize = DS_64;
                break;
            case 128:
                basicSize = DS_128;
                break;                
            case 256:
                basicSize = DS_256;
                break;                
            case 1024:
                basicSize = DS_1K;
                break;                
            case 4096:
                basicSize = DS_4K;
                break;                
            case 16384:
                basicSize = DS_16K;
                break;
            case 131072:
                basicSize = DS_128K;
                break;                
                
            default:
                varsize = true;
                // bigger. need varsize. determine size
                if(raw_size >= 262144){
                    eosio::check(false,std::string("too big " + fc::to_string(raw_size)).c_str());
                }
                else if(raw_size > 65535){
                    basicSize = DS_3V;
                    raw_size = 3;
                }
                else if(raw_size > 255){
                    basicSize = DS_2V;
                    raw_size = 2;
                }
                else{
                    basicSize = DS_1V;
                    raw_size = 1;
                }
                break;
        }
        WRITE_UINT(4,(uint8_t)basicSize);
        WRITE_UINT(1,(uint8_t)data_type);
        buffer = std::vector<char>();
        uint8_t isArray = data_is_array == IA_ARRAY ? 1 : 0;
        WRITE_UINT(1,isArray);

        uint8_t predType = 0;
        switch(pred.type){
            case PT_NONE:
                predType =0;
                WRITE_UINT(2,predType);
                break;                
            case PT_BASIC: // 1 byte
                predType = 1;
                WRITE_UINT(2,predType);
                WRITE_UINT(1,(uint8_t)pred.basic.backlink);
                WRITE_UINT(7,(uint8_t)pred.basic.code);
                // ADVANCE(7);
                break;
            case PT_NAMESPACED: // 3 bytes
                predType = 2;
                WRITE_UINT(2,predType);
                WRITE_UINT(8,(uint8_t)pred.basic.code);
                WRITE_UINT(1,(uint8_t)pred.basic.backlink);
                WRITE_UINT(15,(uint16_t)pred.pnamespace);
                break;
            case PT_REFIED: // 32 bytes
                predType = 3;
                WRITE_UINT(2,predType);
                WRITE_BITS(256, pred.node);
                break;                
        }
        if(varsize){
            auto bitsSizeForSize = raw_size*8;
            WRITE_UINT(bitsSizeForSize, raw_value.size());
        }
        auto bitsSize = raw_value.size()*8;
        WRITE_BITS(bitsSize, raw_value);
        return into;
    }
    
    ipfsmultihash_t pack_to_ipfs(){
        auto data = pack();
        std::string uri;
        uri = ipfs_svc_helper::setRawData(data);
        return uri_to_ipfsmultihash(uri);
    }
    
    static plistentry& unpackFromIPFS(ipfsmultihash_t hash){
        auto ipfsData = ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(hash));
        return plistentry::unpack(ipfsData);
    }
    
    template<typename DataStream> 
    friend DataStream& operator << ( DataStream& ds, plistentry& t ){ \
        return ds << t.pack();
    }
    template<typename DataStream> 
    friend DataStream& operator >> ( DataStream& ds, plistentry& t ){ 
        std::vector<char> buffer;
        ds >> buffer;
        t = plistentry::unpack2(buffer);
        return ds;
    } 
};


