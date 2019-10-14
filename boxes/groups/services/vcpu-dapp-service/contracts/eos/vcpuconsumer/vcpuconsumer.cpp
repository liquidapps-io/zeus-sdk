#include "../dappservices/vcpu.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  VCPU_DAPPSERVICE_ACTIONS

#define DAPPSERVICE_ACTIONS_COMMANDS() \
  VCPU_SVC_COMMANDS()


#define CONTRACT_NAME() vcpuconsumer

struct input_t {
  uint32_t a;
  uint32_t b;
};
struct result_t {
  input_t input;
  uint32_t output;
  uint32_t output_a_denom;
  uint32_t output_b_denom;
};

CONTRACT_START()




  [[eosio::action]] void testfn(uint32_t a, uint32_t b) {
    input_t input;
    input.a = a;
    input.b = b;
    result_t res = call_vcpu_fn<result_t>(name("vvcomdenom"), pack(input),[&]( auto& results ) {
      eosio::check(results.size() > 1, "not enough results");
      eosio::check(results[0].result.size() > 0, "not enough results1");
      eosio::check(results[1].result.size() > 0, "not enough results2");
      // compare results
      return results[0].result;
    });
    eosio::check(input.a == res.input.a, "wrong a");
    eosio::check(input.b == res.input.b, "wrong b");
    eosio::check(res.output_a_denom * res.output == input.a, "wrong denom for a");
    eosio::check(res.output_b_denom * res.output == input.b, "wrong denom for b");
  }
CONTRACT_END((testfn))

std::vector<char> vvcomdenom(std::vector<char> payload){
    input_t input = unpack<input_t>(payload);
    result_t result;
    result.input = input;
    uint32_t x = input.a;
    uint32_t y = input.b;
    bool swap = false;
    if(x < y){
      swap = true;
      x = input.b;
      y = input.a;
    }
    result.output = 0;
    for (int i = x; i > 1; i--) {
      if(x % i == 0 && y % i == 0 ){
        result.output = i;
        result.output_b_denom = input.b / i;
        result.output_a_denom = input.a / i;
        break;
      }
    }
    auto packed = pack(result);
    return packed;
}

char * the_buffer;
uint32_t the_buffer_size;
char * the_result;
bool inited = false;
extern "C"{
  char * initialize(uint32_t sze){
    if(!inited){
      inited = true;
      the_buffer = (char*)malloc(sze);
      the_buffer_size = sze;
      return the_buffer;
    }
    else{
      return the_result;
    }
  }
  uint32_t run_query() {
    std::vector<char> payload(the_buffer, the_buffer+the_buffer_size);
    auto res = vvcomdenom(payload);
    the_result = res.data();
    return res.size();
    // vvcomdenom(std::vector<char>(str.data(),str.data()+str.size()));
  }
}
