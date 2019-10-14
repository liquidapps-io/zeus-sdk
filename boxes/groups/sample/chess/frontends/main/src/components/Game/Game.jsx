// React core
import React, { Component } from 'react';
import { connect } from 'react-redux';
// Game subcomponents
// Services and redux action
import { UserAction } from 'actions';
import { ApiService } from 'services';
import { Button } from 'components';
import Popup from "reactjs-popup";

const Chess = require('react-chess')
var Chessjs = require('chess.js');

class Game extends Component {

  constructor(props) {
    // Inherit constructor
    super(props);
    // State for showing/hiding components when the API (blockchain) request is loading
    this.state = {
      loading: true,
    };
    // Bind functions
    this.loadUser = this.loadUser.bind(this);
    this.handleEndGame = this.handleEndGame.bind(this);
    this.handleMovePiece = this.handleMovePiece.bind(this);
    this.handleLeave = this.handleLeave.bind(this);
    this.closeModalN = this.closeModalN.bind(this);
    this.closeModalQ = this.closeModalQ.bind(this);
    this.closeModalR = this.closeModalR.bind(this);
    this.closeModalB = this.closeModalB.bind(this);
    this.closeModal = this.closeModal.bind(this);

    // Call `loadUser` before mounting the app
    this.loadUser();
    this.i = 0;
  }

  // Get latest user object from blockchain
  loadUser(loader = true) {
    if (loader)
      this.setState({ loading: true });

    // Extract `setUser` of `UserAction` and `user.name` of UserReducer from redux
    const { setUser, user: { name } } = this.props;
    // Send request the blockchain by calling the ApiService,
    // Get the user object and store the `win_count`, `lost_count` and `game_data` object

    return ApiService.getCurrentUser().then(user => {
      if (user) {
        var chessjs = new Chessjs(user.fen || 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');
        var pieces = [];
        for (var i = 0; i < chessjs.SQUARES.length; i++) {
          var square = chessjs.SQUARES[i];
          var piece = chessjs.get(square);
          if (piece) {
            var pieceFmt = `${piece.color === 'w' ? piece.type.toUpperCase() : piece.type}@${square}`;
            pieces.push(pieceFmt);
          }
        }
        this.setState({ pieces: pieces })
        var isHost = (localStorage.getItem('chess_ishost') == 'true');

        var myTurn = isHost == user.whiteTurn;
        setUser({
          game: { opponent: name, name, fen: user.fen, whiteTurn: user.whiteTurn, myTurn, game_data: user }
        });
        if (!user.opponent_joined || !myTurn) {
          var this2 = this;
          this.timer = setTimeout(() => this2.loadUser(false), 1000);
        }
      }
      // Set the loading state to false for displaying the app
      if (loader)
        this.setState({ loading: false });

    });
  }




  handleEndGame() {
    const { setUser, user: { name } } = this.props;

    // Send a request to API (blockchain) to end the game
    // And call `loadUser` again for react to render latest game status to UI
    return ApiService.quitgame().then(() => {
      setUser({

      });
    });
  }
  handleLeave() {
    const { setUser, user: { name } } = this.props;

    localStorage.removeItem('chess_ishost');
    localStorage.removeItem('chess_opponent');
    setUser({

    });
  }
  openModal(piece, fromSquare, toSquare) {
    this.setState({ open: true, pendingMove: { piece, fromSquare, toSquare } });
  }
  closeModal(promotion) {
    var { piece, fromSquare, toSquare } = this.state.pendingMove;
    this.setState({ open: false, promotion: undefined, pendingMove: undefined });
    this.handleMovePiece(piece, fromSquare, toSquare, promotion)
  }
  closeModalB() {
    this.closeModal('b');
  }

  closeModalQ() {
    this.closeModal('q');
  }

  closeModalR() {
    this.closeModal('r');
  }

  closeModalN() {
    this.closeModal('N');
  }

  handleMovePiece(piece, fromSquare, toSquare, promotion) {
    let { user: { game } } = this.props;
    var oldPieces = this.state.pieces;
    const newPieces = this.state.pieces
      .map((curr, index) => {
        if (piece.index === index) {
          return `${piece.name}@${toSquare}`
        }
        else if (curr.indexOf(toSquare) === 2) {
          return false // To be removed from the board
        }
        return curr
      })
      .filter(Boolean)


    console.log("handleMovePiece", piece, fromSquare, toSquare, promotion)
    var chessjs = new Chessjs(game.fen || 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');
    var fromPiece = chessjs.get(fromSquare);
    var isPromotion = false;
    if (((toSquare[1] == '1' && chessjs.turn() == 'b') || (toSquare[1] == '8' && chessjs.turn() == 'w')) && fromPiece.type == 'p') {
      if (fromPiece.color == chessjs.turn()) {
        // prompt for
        isPromotion = true;
        if (!promotion) {
          // this.setState({ pieces: oldPieces });
          this.openModal(piece, fromSquare, toSquare);
          return false;
        }
      }
    }
    this.setState({ pieces: newPieces });
    this.setState({ loading: true });

    var move = chessjs.move({ from: fromSquare, to: toSquare, promotion });
    if (!move) {
      this.loadUser();


      return false;
    }
    move = move.san;
    console.log('san-move', move);
    ApiService.movepiece(move).then(() => {
      return this.loadUser();
    }).catch(e => {
      return this.loadUser();
    });
    return true;
  }

  render() {
    // Extract data from state and user data of `UserReducer` from redux
    const { loading, pieces } = this.state;
    let { user: { game } } = this.props;
    if (!game || !game.game_data)
      return (<div/>);

    console.log("pieces", pieces);
    var account = localStorage.getItem('chess_account');
    var opponent = localStorage.getItem('chess_opponent');
    var isHost = localStorage.getItem('chess_ishost') == 'true';
    // Flag to indicate if the game has started or not
    // By checking if the deckCard of AI is still 17 (max card)
    // If game hasn't started, display `PlayerProfile`
    // If game has started, display `GameMat`, `Resolution`, `Info` screen
    var mate = (game.game_data.isCheck && game.game_data.status == 1);
    var won = (mate && !game.myTurn);
    var allowMoves = game.myTurn && game.game_data.opponent_joined && !mate;
    var statuses = ["OnGoing", "Mate", "Threefold", "Stalemate", "InsuffMaterial"];
    var status = statuses[game.game_data.status];
    var gameOver = game.game_data.status !== 0;
    return (
      <section className={`Game${ (loading ? " loading" : "") }`}>

            <div className="container">
              <img alt="" src="./Game_logo.png" style={{maxHeight:"150px"}}/>

                <br/>
              <Chess style={{height:"550px"}}  allowMoves={ allowMoves } pieces={ pieces } onMovePiece={this.handleMovePiece } />
        {
          loading &&
          <div className="spinner">
            <div className="image"></div>
          </div>
        }
            </div>
        <div className="bottom">
            <div style={{color:'#eee'}}>
              {game.game_data.isCheck ? <b>CHECK</b> : "" }
              {mate ? <b> MATE! you {won ? "won" : "lost"}</b> : "" }
              <br/>
              Game Status: {status}
            </div>
            <div style={{color:'#eee'}}>
                {isHost ? <span><b>{account} (You)</b> - {opponent}</span> : <span>{opponent} - <b>{account} (You)</b></span>}
            </div>
            <br/>
            {!gameOver ?
            <div style={{color:'gray', fontSize:18}}>
               <b> {game.game_data.opponent_joined ? (allowMoves ? "Your Turn" : "Opponent's Turn") : "Waiting for opponent"}</b>
            </div> : ""}
            <br/>
            <Button onClick={this.handleEndGame } className="red">
              { "Quit" }
            </Button>
            <Button onClick={this.handleLeave } className="green">
              { "Menu" }
            </Button>
        </div>
      <Popup
          open={this.state.open}
          modal
        >
          <div className="modal">
            <a className="close" onClick={this.closeModalQ}>
             Queen
            </a><br/>
            <a className="close" onClick={this.closeModalB}>
             Bishop
            </a><br/>
            <a className="close" onClick={this.closeModalR}>
             Rook
            </a><br/>
            <a className="close" onClick={this.closeModalN}>
             Knight
            </a>
          </div>
        </Popup>
      </section>
    )
  }

}

// Map all state to component props (for redux to connect)
const mapStateToProps = state => state;

// Map the following action to props
const mapDispatchToProps = {
  setUser: UserAction.setUser,
};

// Export a redux connected component
export default connect(mapStateToProps, mapDispatchToProps)(Game);
