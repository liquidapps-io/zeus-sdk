import { ActionTypes } from 'const';

class UserAction {
  static setUser({ game }) {
    return {
      type: ActionTypes.SET_USER,
      game // Users current Gamestate
    };
  }
}

export default UserAction;
