#pragma once
#include "plist.hpp"
#include "log.hpp"


class plisttreeNode {
  private:
    std::vector<plisttreeNode> _childnodes= std::vector<plisttreeNode>();
  public:
    plistentry _valueEntry = plistentry();
    plistentry innerEntry = plistentry();
    bool inited = false;
    plisttreeNode(bool ipfsPointers = true){
        if(ipfsPointers){
            innerEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
        }
        _valueEntry.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
        innerEntry.data_is_array = plistentry::IA_ARRAY;
        innerEntry.chunkSize = 65536;
        inited = true;
    }
    plisttreeNode(plistentry &entry){
        innerEntry = entry;
    }
    void init(){
        if(inited)
            return;
        inited = true;
        if(innerEntry.data_is_array != plistentry::IA_ARRAY)
            return;
        std::vector<plistentry> entries = innerEntry.getPLVec();
        for (auto listentry : entries) {
            if(listentry.pred.type == plistentry::PT_BASIC){
                switch(listentry.pred.basic.code){
                    case PRED_CHILD:
                        _childnodes.push_back(plisttreeNode(listentry));
                        break;
                    case PRED_VALUE:
                        _valueEntry = listentry;
                        break;
                    default:
                        break;
                }
            }
        }
    }
    void commit(){
        std::vector<plistentry> newList;
        _valueEntry.pred.basic.code = PRED_VALUE;
        _valueEntry.pred.type = plistentry::PT_BASIC;
        newList.push_back(_valueEntry);
        for (auto plisttreeNode : _childnodes) {
            plisttreeNode.innerEntry.pred.type = plistentry::PT_BASIC;
            plisttreeNode.innerEntry.pred.basic.code = PRED_CHILD;
            newList.push_back(plisttreeNode.innerEntry);
        }
        innerEntry << newList;
    }
    
    plisttreeNode& setChildNodes(std::vector<plisttreeNode> nodes){
        _childnodes = nodes;
        commit();
        return (*this);
    }
    
    std::vector<plisttreeNode> getChildNodes(){
        init();
        return _childnodes;
    }
    
    template<typename T> 
    plisttreeNode& setValue(std::vector<T>& value){
        _valueEntry << value;
        commit();
        return (*this);
    }
    template<typename T> 
    plisttreeNode& setValue(T& value){
        _valueEntry << value;
        commit();
        return (*this);
    }
    
    template<typename T> 
    T& getValue(){
        init();
        return _valueEntry.getObject<T>();
    }
    
    
    static plisttreeNode unpack(std::vector<char> data){
        plistentry newEntry= plistentry::unpack(data);
        return plisttreeNode(newEntry);
    }
    
    std::vector<char> pack(){
        return innerEntry.pack();
    }

};