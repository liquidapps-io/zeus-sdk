import { ActionTypes } from 'const';

const initialState = {
  game: null
};

export default function(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.SET_USER:
      {
        return Object.assign({}, state, {
          // If the name is not specified, do not change it
          // The places that will change the name is login
          // In that cases, the `win_count`, `lost_count`, `game` will be reset
          game: action.game || initialState.game
        });
      }
    default:
      return state;
  }
}
