let stockfish;
module.exports = async({ proto, address }) => {
  // stockfish://fen
  if (!stockfish)
    stockfish = require("stockfish")();
  return new Promise((resolve, reject) => {
    const fen = address;
    // console.log("address", address);
    stockfish.onmessage = function onmessage(event) {
      if (!event)
        return;
      console.log(event);
      const parts = event.split(' ');
      let idx = 0;
      const cmd = parts[idx++];
      if (cmd == 'bestmove') {
        const move = parts[idx++];
        console.log('moveObj', move);
        resolve(Buffer.from(move));
      }



    };
    stockfish.postMessage(`uci`);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth 10`);
  });
};
