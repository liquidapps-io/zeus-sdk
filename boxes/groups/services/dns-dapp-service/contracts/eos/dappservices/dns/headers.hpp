
const checksum256 hashDnsData(std::string subdomain, std::string type){ 
    auto finalStr = type + "-" + subdomain;
    auto buffer = finalStr; 
    char* c = (char*) malloc(buffer.size()+1); 
    memcpy(c, buffer.data(), buffer.size()); 
    c[buffer.size()] = 0; 
    capi_checksum256 *hash_val = (capi_checksum256 *) malloc(32); 
    sha256(c, buffer.size(), hash_val); 
    char * placeholder = (char*) malloc(32);
    memcpy(placeholder , hash_val, 32 );
    std::vector<char> hash_ret = std::vector<char>(placeholder,placeholder + 32); 
    uint64_t * p64 = (uint64_t*) malloc(32);
    memcpy(p64 , hash_ret.data(), 32 );
    return checksum256::make_from_word_sequence<uint64_t>(p64[0], p64[1], p64[2], p64[3]);
} 

#define DNS_DAPPSERVICE_ACTIONS_MORE() \
TABLE dnsentry {  \
   uint64_t                      id; \
   std::string             subdomain; \
   std::string             type; \
   std::string             payload; \
   uint64_t primary_key()const { return id; }  \
   checksum256 hash_key()const { return hashDnsData(subdomain,type); }  \
};  \
typedef eosio::multi_index<"dnsentry"_n, dnsentry, \
      indexed_by<"byhash"_n, \
                 const_mem_fun<dnsentry, checksum256, \
                               &dnsentry::hash_key> \
                >> dnsentries_t; \
static void update_dns_entry(name owner, std::string subdomain, std::string type, std::string payload, name payer){  \
    auto _self = name(current_receiver()); \
    dnsentries_t entries(_self, owner.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashDnsData(subdomain,type)); \
    if(existing != cidx.end())\
        cidx.modify(existing, payer, [&]( auto& a ) {  \
            a.payload = payload;\
        }); \
    else entries.emplace(payer, [&]( auto& a ) {  \
        a.id = entries.available_primary_key();  \
        a.subdomain = subdomain;  \
        a.type = type;  \
        a.payload = payload;\
    }); \
}