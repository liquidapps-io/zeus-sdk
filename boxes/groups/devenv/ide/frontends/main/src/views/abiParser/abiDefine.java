
// account
class account extends db {
    type accountType;
    index_type i64;
    key_names owner;
    key_types name;
}

class accountType {
    name owner;
    int64 balanceScaled;
    int64 maskScaled;
    string referrer;
  	int64 buyKeys;
}


//
class guardType {
    uint64 id;
    int64 quota;
    int64 maskScaled;
}

class guard extends db {
    type guardType;
    index_type i64;
    key_names id;
    key_types uint64;
}



// round table
class roundType {
    int64 id;
    uint32 lastActivedAt;
    uint32 duration;
    name lastActiver;
  	name[] teams;
}

class rounds extends db {
    type roundType;
    index_type i64;
    key_names id;
    key_types uint64;
}





// all teams sattes
class roundstates extends db {
    type roundRow;
    index_type i64;
    key_names id;
    key_types uint64;
}

// team state
class roundRow {
    int64 id;
    string name;
    int64 totalKeys;
  	int64 totalScaled;
  	name lastPurchaser;
}



interface fomo {
    void init(name account);
    void refresh(name account);
    void createacct(name account, string referrer);
}
