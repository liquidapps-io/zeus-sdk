#define VACCOUNTS_DELAYED_CLEANUP 120

#include "../dappservices/multi_index.hpp"
#include "movegen.cpp"

#include "attacks.cpp"
#include "bitboard.cpp"
#include "board.cpp"
#include "move.cpp"
#include "exception.cpp"
#include "../dappservices/log.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/vaccounts.hpp"
#include "../dappservices/readfn.hpp"
#include "../dappservices/vcpu.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS \
  VACCOUNTS_DAPPSERVICE_ACTIONS \
  LOG_DAPPSERVICE_ACTIONS \
  CRON_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS \
  READFN_DAPPSERVICE_ACTIONS \
  VCPU_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()VACCOUNTS_SVC_COMMANDS()LOG_SVC_COMMANDS()READFN_SVC_COMMANDS()VCPU_SVC_COMMANDS()
#define CONTRACT_NAME() chess
using std::string;


struct input_t {
  std::string game;
  std::string move;
  bool white;
};

struct result_t {
  input_t input;
  bool isCheck;
  int status;
  int activePlayer;
  bool isValid;
  std::string fen;
};

CONTRACT_START()
      bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
        return false;
      }
     [[eosio::action]] void gamecleanup() {
        std::vector<char> payload;
        schedule_timer(_self, payload, 2);
      }


      struct chess_action_payload {
          name vaccount;
          name gamehost;
          name opponent;
          std::string move;
          EOSLIB_SERIALIZE( chess_action_payload, (vaccount)(gamehost)(opponent)(move) )
      };
      struct chess_lobby_action_payload {
          name vaccount;
          name opponent;
          EOSLIB_SERIALIZE( chess_lobby_action_payload, (vaccount)(opponent) )
      };

      [[eosio::action]] void joingame(chess_lobby_action_payload payload) {
        require_vaccount(payload.vaccount);
        game_t games(_self, _self.value, 1024, 64, true, false, VACCOUNTS_DELAYED_CLEANUP);
        bool isHost = false;
        eosio::check(payload.vaccount != name("ai"),"can't play as AI");

        auto existing = games.find(payload.vaccount.value);
        if(existing == games.end()){
            existing = games.find(payload.opponent.value);
            eosio::check(existing == games.end() || existing->opponent == payload.vaccount,"not your game");
        }
        else
          isHost = true;
        if(existing == games.end())
        {
            isHost = true;
            // todo: notify opponent
            games.emplace(_self, [&]( auto& a ) {
                  a.host = payload.vaccount;
                  a.opponent = payload.opponent;
                  a.opponent_joined = (a.opponent == name("ai"));
            });
        }
        else {
            // todo: notify host
            if(!isHost && !existing->opponent_joined){
              games.modify(existing,_self, [&]( auto& a ) {
                a.opponent_joined = true;
              });
            }
        }

      }
      [[eosio::action]] void quitgame(chess_lobby_action_payload payload) {
        require_vaccount(payload.vaccount);
        game_t games(_self, _self.value, 1024, 64, true, false, VACCOUNTS_DELAYED_CLEANUP);
        auto existing = games.find(payload.vaccount.value);
        if(existing == games.end()){
            existing = games.find(payload.opponent.value);
            eosio::check(existing == games.end() || existing->opponent == payload.vaccount,"not your game");
        }
        if(existing != games.end())
          games.erase(existing);
      }
      string getBestMove(string fen){
            string uriStr = "stockfish://" + fen;
            std::vector<char> uri = std::vector<char>(uriStr.begin(), uriStr.end());
            std::vector<char> move = getURI(uri, [&]( auto& results ) {
              return results[0].result;
            });
            string result(move.begin(), move.end());
            return result;
      }
      [[eosio::action]] void movepiece(chess_action_payload payload) {
        require_vaccount(payload.vaccount);
        input_t input;
        game_t games(_self, _self.value, 1024, 64, true, false, VACCOUNTS_DELAYED_CLEANUP);
        auto existing = games.find(payload.gamehost.value);
        input.white = true;
        eosio::check(existing != games.end(), "game doesn't exist");

        input.game = existing->fen;
        if(payload.gamehost != payload.vaccount){
          // opponent
          eosio::check(payload.vaccount == existing->opponent, "not your game");
          input.white = false;
        }
        else{
          // host
          eosio::check(payload.opponent == existing->opponent, "wrong opponent");
        }
        eosio::check(existing->opponent_joined, "opponent didn't join");
        eosio::check(input.white == existing->whiteTurn, "not your turn");


        input.move = payload.move;
        result_t res = call_vcpu_fn<result_t>(name("vmovepiece"), pack(input),[&]( auto& results ) {
          eosio::check(results.size() > 1, "not enough results");
          eosio::check(results[0].result.size() > 0, "not enough results1");
          eosio::check(results[1].result.size() > 0, "not enough results2");
          // todo: compare results
          return results[0].result;
        });
        eosio::check(res.isValid, "invalid move");
        auto ai = (payload.opponent == name("ai")) && input.white;
        if(ai && res.status == 0){
           auto newMove = getBestMove(res.fen);
           input_t newInput;
           newInput.game = res.fen;
           newInput.move = newMove;
           newInput.white = false;
           res = call_vcpu_fn<result_t>(name("vmovepiece"), pack(newInput),[&]( auto& results ) {
            eosio::check(results.size() > 1, "not enough results");
            eosio::check(results[0].result.size() > 0, "not enough results1");
            eosio::check(results[1].result.size() > 0, "not enough results2");
            // todo: compare results
            return results[0].result;
          });
          eosio::check(res.isValid, "invalid AI move");
          input.white = false;
        }
        if(res.status != 0){
          if(res.status == 1){
            // mate
            if(input.white)
              updateScores(1,  payload.vaccount, payload.opponent);
            else
              updateScores(0,  payload.vaccount, payload.opponent);
          }
          else{
            updateScores(0.5,  payload.vaccount, payload.opponent);
          }

        }
        games.modify(existing,_self, [&]( auto& a ) {
            a.fen = res.fen;
            a.whiteTurn = !input.white;
            a.isCheck = res.isCheck;
            a.status = res.status;
        });
    }

      int32_t get_rating_delta(uint32_t my_rating, uint32_t opponent_rating, double my_game_result) {
        auto my_chance_to_win = 1 / ( 1 + pow(10, (opponent_rating - my_rating) / 400));

        return round(32 * (my_game_result - my_chance_to_win));
      }

      uint32_t get_new_rating(uint32_t my_rating, uint32_t opponent_rating, double my_game_result) {
        return my_rating + get_rating_delta(my_rating, opponent_rating, my_game_result);
      }

      uint32_t getScore(name account){
        score_t scores(_self, _self.value, 1024, 64);
        auto existing = scores.find(account.value);
        if(existing == scores.end())
          return 800;
        else return existing->score;
      }
      void setScore(name account, uint32_t score){
        score_t scores(_self, _self.value, 1024, 64);
        auto existing = scores.find(account.value);
        if(existing == scores.end()){
            scores.emplace(_self, [&]( auto& a ) {
                  a.account = account;
                  a.score = score;
            });

        }
        else
        {
            scores.modify(existing,_self, [&]( auto& a ) {
                  a.score = score;
            });
        }
      }
      void updateScores(double game_result, name account_a, name account_b){

        // get score a
        // get score b
        // get_new_rating(a,b,game_result);
        // get_new_rating(b,a,1-game_result);
        // store a
        // store b
      }

      TABLE game {
         string fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
         name host;
         name opponent;
         bool whiteTurn = true;
         bool opponent_joined = false;
         bool isCheck;
         int status;
         uint64_t primary_key()const { return host.value; }
      };

      typedef dapp::multi_index<"games"_n, game> game_t;
      typedef eosio::multi_index<".games"_n, game> game_t_v_abi;
      TABLE shardbucket {
          std::vector<char> shard_uri;
          uint64_t shard;
          uint64_t primary_key() const { return shard; }
      };
      typedef eosio::multi_index<"games"_n, shardbucket> game_t_table_abi;


      TABLE score {
         name account;
         uint32_t score;
         uint64_t primary_key()const { return account.value; }
      };
      typedef dapp::multi_index<"scores"_n, score> score_t;
      typedef eosio::multi_index<".scores"_n, score> score_t_v_abi;

      typedef eosio::multi_index<"scores"_n, shardbucket> score_t_table_abi;

   private:
    VACCOUNTS_APPLY(((chess_action_payload)(movepiece))((chess_lobby_action_payload)(quitgame))((chess_lobby_action_payload)(joingame)))

};
EOSIO_DISPATCH_SVC(CONTRACT_NAME(), (movepiece)(joingame)(quitgame)(regaccount)(xdcommit)(xvinit)(gamecleanup))
// -------------------------------------------------------------------------------------------------
result_t vmovepiece(input_t input)
{
  using cppgen::Board;
  using cppgen::GameOverReason;

  Board board;
  board.loadFen(input.game);
  result_t result;
  result.input = input;
  result.isValid = board.makeMove(input.move);
  if(!result.isValid)
    return result;
  auto isCheck = board.isInCheck();
  auto status = board.getGameOverReason();
  auto activePlayer = board.getActivePlayer();
  result.isCheck = board.isInCheck();
  result.status = (int)board.getGameOverReason();
  result.activePlayer = board.getActivePlayer();
  result.fen = board.getFen();
  return result;
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
    std::vector<char> res;
    auto method = "vmovepiece";
    if(method == "vmovepiece"){
        res =  pack(vmovepiece(unpack<input_t>(payload)));
    }
    the_result = res.data();
    return res.size();
  }
}