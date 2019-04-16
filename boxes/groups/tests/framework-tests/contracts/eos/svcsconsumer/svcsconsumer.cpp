#include "../dappservices/log.hpp"
#include "../dappservices/plist.hpp"
#include "../dappservices/plisttree.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  LOG_DAPPSERVICE_ACTIONS \
  IPFS_DAPPSERVICE_ACTIONS

#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()LOG_SVC_COMMANDS() 

#define CONTRACT_NAME() svcsconsumer



                
CONTRACT_START()
  TABLE testentry {  
     uint64_t                      field1;
     std::string                   field2;
     uint64_t                      field3;
     uint64_t primary_key(){return field1;}
    EOSLIB_SERIALIZE( testentry, (field1)(field2)(field3) )
  };  
  
  typedef dapp::multi_index<"testentry"_n, testentry
  // ,indexed_by<"byhash"_n, 
  //     const_mem_fun<testentry, key256, 
  //                             &testentry::hash_key> 
  //             >
            > testentries_t; 
  
 [[eosio::action]] void test(testentry data) {
    LOG_INFO("starting test log+ipfs");
    auto uri = setData(data);
    data.field1 += 10;
    auto uri2 = setData(data);

    LOG_DEBUG("uri: " + uri + ",uri2: " + uri2);
    auto dataRes = getData<testentry>(uri);
    auto dataRes2 = getData<testentry>(uri2);
    eosio::check(dataRes.field1 + 10 == data.field1, "wrong field1");
    eosio::check(dataRes2.field1 == data.field1 , "wrong field1");
  }
 [[eosio::action]] void testpl1(testentry data) {
    LOG_INFO("starting for plist");
    plistentry rootEntry;
    rootEntry.setObject(data);
    auto testBytes = rootEntry.pack();
    testentry objdeser = rootEntry.getObject<testentry>();
    eosio::check(objdeser.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser.field3 == data.field3, "ser/deser failed for field3");
    
    auto rootEntry2 = plistentry::unpack(testBytes);
    // LOG_DEBUG("ser:"+ toBase64(rootEntry2.pack()));
    
    testentry objdeser2 = rootEntry2.getObject<testentry>();
    eosio::check(objdeser2.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser2.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser2.field3 == data.field3, "ser/deser failed for field3");
    
    
    plistentry rootEntryEmb;
    rootEntryEmb.setPL(rootEntry2);
    plistentry&  rootEntryEmb2 = plistentry::unpack(rootEntryEmb.pack());

    plistentry&  rootEntryEmbRes = rootEntryEmb2.getPL();
    testentry objdeser3 = rootEntryEmbRes.getObject<testentry>();
    eosio::check(objdeser3.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser3.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser3.field3 == data.field3, "ser/deser failed for field3");
  }
 [[eosio::action]] void testpl2(testentry data) {
    LOG_INFO("starting test for plist ipfs");
    plistentry rootEntry;
    rootEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    rootEntry.setObject(data);
    auto testBytes = rootEntry.pack();
    // LOG_INFO("b64 ser:"+ fc::base64_encode(string(testBytes.begin(),testBytes.end())));
    testentry objdeser = rootEntry.getObject<testentry>();
    eosio::check(objdeser.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser.field3 == data.field3, "ser/deser failed for field3");
    
    auto rootEntry2 = plistentry::unpack(testBytes);
    
    plistentry rootEntryEmb;
    rootEntryEmb.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    rootEntryEmb.setPL(rootEntry2);
    
    
    auto rootEntryEmbRes = rootEntryEmb.getPL();
    testentry objdeser3 = rootEntryEmbRes.getObject<testentry>();
    eosio::check(objdeser3.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser3.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser3.field3 == data.field3, "ser/deser failed for field3");
  }

 [[eosio::action]] void testpl3(testentry data) {
    LOG_INFO("starting test for vectors");
    plistentry rootEntry;
    // rootEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    std::vector<testentry> datavec;
    datavec.push_back(data);
    testentry data2;
    data2.field1 = 0xbeefbeef;
    data2.field2 = "secobj";
    data2.field3 = 0xdeaddead;
    
    datavec.push_back(data2);
    rootEntry << datavec;
    auto rootEntry2 = plistentry::unpack(rootEntry.pack());
    
    

    std::vector<plistentry> objdeser3vec;
    objdeser3vec.push_back(rootEntry2);
    objdeser3vec.push_back(rootEntry2);
    plistentry rootEntryEmb;
    rootEntryEmb << objdeser3vec;
    auto vec = rootEntryEmb.pack();
    plistentry& rootEntryEmb2 = plistentry::unpack(vec);
    

    std::vector<plistentry> objdeser3vecplist = rootEntryEmb2.getPLVec();
    // LOG_DEBUG("ser[0]:"+ toBase64(rootEntryEmb2.raw_value) + " list_size:" + fc::to_string(objdeser3vecplist.size()));

    
    auto objdeser3vec2 = objdeser3vecplist[0].getVec<testentry>();
    auto objdeser3 = objdeser3vec2[0];
    auto objdeser32 = objdeser3vec2[1];
    eosio::check(objdeser3.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser3.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser3.field3 == data.field3, "ser/deser failed for field3");
    eosio::check(objdeser32.field3 == 0xdeaddead, "ser/deser failed for field3");
  }
 [[eosio::action]] void testpl4(testentry data) {
    LOG_INFO("starting test for vectors+ipfs");
    plistentry rootEntry;
    rootEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    std::vector<testentry> datavec;
    datavec.push_back(data);
    testentry data2;
    data2.field1 = 0xbeefbeef;
    data2.field2 = "secobj";
    data2.field3 = 0xdeaddead;
    
    datavec.push_back(data2);
    datavec.push_back(data2);
    rootEntry << datavec;
    plistentry&  rootEntry2 = plistentry::unpack(rootEntry.pack());
    
    

    std::vector<plistentry> objdeser3vec;
    objdeser3vec.push_back(rootEntry2);
    plistentry rootEntryEmb;
    rootEntryEmb.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    rootEntryEmb << objdeser3vec;
    
    plistentry& rootEntryEmb2 = plistentry::unpack(rootEntryEmb.pack());
    

    std::vector<plistentry> objdeser3vecplist = rootEntryEmb2.getPLVec();
    auto item = objdeser3vecplist[0];

    
    auto objdeser3vec2 = item.getVec<testentry>();
    auto objdeser3a = objdeser3vec2[0];
    auto objdeser3b = objdeser3vec2[1];
    eosio::check(objdeser3a.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser3a.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser3a.field3 == data.field3, "ser/deser failed for field3");
    eosio::check(objdeser3b.field3 == 0xdeaddead, "ser/deser failed for field3");
  }
 [[eosio::action]] void testpl4b(testentry data) {
    LOG_INFO("starting test for vectors+ipfs chunks");
    plistentry rootEntry;
    rootEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    std::vector<testentry> datavec;
    datavec.push_back(data);
    testentry data2;
    data2.field1 = 0xbeefbeef;
    data2.field2 = "secobj";
    data2.field3 = 0xdeaddead;
    
    datavec.push_back(data2);
    rootEntry << datavec;
    plistentry&  rootEntry2 = plistentry::unpack(rootEntry.pack());
    
    

    std::vector<plistentry> objdeser3vec;
    auto num = 40;
    for (int i = 0; i < num; i++) {
      objdeser3vec.push_back(rootEntry2);
    }
    plistentry rootEntryEmb;
    rootEntryEmb.chunkSize = 2000;
    rootEntryEmb << objdeser3vec;
    

    

    std::vector<plistentry> objdeser3vecplist = rootEntryEmb.getPLVec();
    eosio::check(num == objdeser3vecplist.size(), ("array deser failed. items: "+ fc::to_string(objdeser3vecplist.size())).c_str());
    plistentry rootEntryEmb2 = plistentry::unpack(rootEntryEmb.pack());
    // LOG_DEBUG("rawvalue n:" + toBase64(rootEntryEmb2.pack()));
    // LOG_DEBUG("rawvalue o:" + toBase64(vec));
    

    objdeser3vecplist = rootEntryEmb2.getPLVec();
    eosio::check(num == objdeser3vecplist.size(), ("array deser failed after unpack. items: "+ fc::to_string(objdeser3vecplist.size())).c_str());
    auto item = objdeser3vecplist[num-1];

    
    auto objdeser3vec2 = item.getVec<testentry>();
    auto objdeser3a = objdeser3vec2[0];
    auto objdeser3b = objdeser3vec2[1];
    eosio::check(objdeser3a.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(objdeser3a.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(objdeser3a.field3 == data.field3, "ser/deser failed for field3");
    eosio::check(objdeser3b.field3 == 0xdeaddead, "ser/deser failed for field3");
  }
 [[eosio::action]] void testpl5(testentry data) {
    LOG_INFO("starting test for serde ipfs");
    plistentry rootEntry;
    rootEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    rootEntry.setObject(data);
    auto testBytes = rootEntry.pack();
    auto rootEntry2 = plistentry::unpack(testBytes);
    testentry objdeser2 = rootEntry2.getObject<testentry>();
    plistentry rootEntryEmb;
    rootEntryEmb.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
    rootEntryEmb.setPL(rootEntry2);
    auto vec = rootEntryEmb.pack();
    auto rootEntryEmb2 = plistentry::unpack(vec);
    auto rootEntryEmbRes = rootEntryEmb2.getPL();
    
  }
  
 [[eosio::action]] void testpltree1(testentry data) {
    LOG_INFO("starting test for trees - simple value");
    plisttreeNode node;
    node.setValue(data);
    auto packed = node.pack();
    auto unpacked = plisttreeNode::unpack(packed);
    auto dataRes = unpacked.getValue<testentry>();
    eosio::check(dataRes.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(dataRes.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(dataRes.field3 == data.field3, "ser/deser failed for field3");
  }
  
 [[eosio::action]] void testpltree2(testentry data) {
    LOG_INFO("starting test for trees - simple tree");
    plisttreeNode rootnode = plisttreeNode(); 
    plisttreeNode node = plisttreeNode(); 
    node.setValue(data);
    
    
    std::vector<plisttreeNode> childnodes;
    childnodes.push_back(node);
    childnodes.push_back(node);
    childnodes.push_back(node);
    rootnode.setChildNodes(childnodes);
    auto packed = rootnode.pack();
    // LOG_DEBUG("packed:" + toBase64(packed));


    auto unpacked = plisttreeNode::unpack(packed);
    auto packed2 = unpacked.pack();
    // LOG_DEBUG("packed2:" + toBase64(packed2));

    eosio::check(packed == packed2, "ser/deser failed");
    
    auto children = unpacked.getChildNodes();
    
    
    // auto item = children[2].valueEntry;
    // LOG_DEBUG("packed:" + toBase64(item.raw_value));
    auto dataRes = children[2].getValue<testentry>();
    eosio::check(dataRes.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(dataRes.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(dataRes.field3 == data.field3, "ser/deser failed for field3");
  }

 [[eosio::action]] void testpltree3(testentry data) {
    LOG_INFO("starting test for trees - complex tree");
    plisttreeNode rootnode = plisttreeNode(); 
    plisttreeNode leafnode = plisttreeNode(); 
    leafnode.setValue(data);
    auto num = 2;
    plisttreeNode& currentnode = leafnode;
    for (int i = 0; i < num; i++) {
      plisttreeNode newNode = plisttreeNode(); 

      std::vector<plisttreeNode> childnodes;
      for (int j = 0; j < 5; j++) {
        childnodes.push_back(currentnode);
      }
      newNode.setChildNodes(childnodes);
      
      currentnode = newNode;
    }
    std::vector<plisttreeNode> childnodesR;
    childnodesR.push_back(currentnode);
    rootnode.setChildNodes(childnodesR);
    
    auto packed = rootnode.pack();
    // LOG_DEBUG("packed:" + toBase64(packed));


    auto unpacked = plisttreeNode::unpack(packed);
    auto packed2 = unpacked.pack();
    // LOG_DEBUG("packed2:" + toBase64(packed2));

    eosio::check(packed == packed2, "ser/deser failed");
    
    
    auto currReadNode = unpacked;
    for (int i = 0; i < num+5; i++) {
      auto children = currReadNode.getChildNodes();
      if(children.size() == 0)
        break;
      currReadNode = children[children.size()-1];
    }
    // auto item = currReadNode.valueEntry;
    // // LOG_DEBUG("packed:" + toBase64(item.raw_value));
    auto dataRes = currReadNode.getValue<testentry>();
    eosio::check(dataRes.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(dataRes.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(dataRes.field3 == data.field3, "ser/deser failed for field3");
  }

 [[eosio::action]] void testpltree4(testentry data) {
    LOG_INFO("starting test for trees - complex tree - partial embed");
     plisttreeNode rootnode = plisttreeNode(false); 
    plisttreeNode leafnode = plisttreeNode(false); 
    leafnode.setValue(data);
    auto num = 3;
    plisttreeNode& currentnode = leafnode;
    for (int i = 0; i < num; i++) {
      plisttreeNode newNode = plisttreeNode(false); 

      std::vector<plisttreeNode> childnodes;
      for (int j = 0; j < 4; j++) {
        childnodes.push_back(currentnode);
      }
      newNode.setChildNodes(childnodes);
      
      currentnode = newNode;
    }
    std::vector<plisttreeNode> childnodesR;
    childnodesR.push_back(currentnode);
    rootnode.setChildNodes(childnodesR);
    
    auto packed = rootnode.pack();
    // LOG_DEBUG("packed:" + toBase64(packed));


    auto unpacked = plisttreeNode::unpack(packed);
    auto packed2 = unpacked.pack();
    // LOG_DEBUG("packed2:" + toBase64(packed2));

    eosio::check(packed == packed2, "ser/deser failed");
    
    
    auto currReadNode = unpacked;
    for (int i = 0; i < num+1; i++) {
      auto children = currReadNode.getChildNodes();
      if(children.size() == 0)
        break;
      currReadNode = children[children.size()-1];
    }
    // auto item = currReadNode.valueEntry;
    // // LOG_DEBUG("packed:" + toBase64(item.raw_value));
    auto dataRes = currReadNode.getValue<testentry>();
    eosio::check(dataRes.field1 == data.field1, "ser/deser failed for field1");
    eosio::check(dataRes.field2 == data.field2, "ser/deser failed for field2");
    eosio::check(dataRes.field3 == data.field3, "ser/deser failed for field3");
  }
  
 [[eosio::action]] void testmidx1(testentry data) {
    LOG_INFO("starting test multi_index - emplace");
    testentries_t entries(_self, _self.value);
    entries.emplace(_self, [&](auto &e) {
      e.field1 = data.field1;
      e.field2 = data.field2;
      e.field3 = data.field3;
    });
    auto existing = entries.find(data.field1);
    eosio::check(existing != entries.end(), "item missing");
    eosio::check(existing->field2 == data.field2,"failed for field2");
    
    
  }
 [[eosio::action]] void testmidx2(testentry data) {
    LOG_INFO("starting test multi_index - emplace - no cache");
    testentries_t entries(_self, _self.value);
    entries.emplace(_self, [&](auto &e) {
      e.field1 = data.field1;
      e.field2 = data.field2;
      e.field3 = data.field3;
    });
    
    testentries_t entries2(_self, _self.value);
    auto existing = entries2.find(data.field1);
    eosio::check(existing != entries2.end(), "item missing");
    eosio::check(existing->field2 == data.field2,"failed for field2");
  }  
  
CONTRACT_END((test)(testpl1)(testpl2)(testpl3)(testpl4)(testpl4b)(testpltree1)(testpltree2)(testpltree3)(testpltree4)(testmidx1)(testmidx2))