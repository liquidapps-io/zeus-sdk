import React, { Component } from 'react';
import { connect } from 'react-redux';
// Components
import { Button } from 'components';
// Services and redux action
import { UserAction } from 'actions';
import { ApiService } from 'services';
let { seedPrivate } = require('eosjs-ecc')
const Checkbox = props => (
  <input type="checkbox" style={{ '-webkit-appearance': 'checkbox' }} {...props} />
)
class Login extends Component {

  constructor(props) {
    // Inherit constructor
    super(props);
    // State for form data and error message
    this.state = {
      form: {
        username: '',
        opponent: '',
        pass: '',
        key: '',
        error: '',
      },
      isSigningIn: false,
    }
    // Bind functions
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  // Runs on every keystroke to update the React state
  handleChange(event) {
    let { name, value } = event.target;
    const { form } = this.state;
    if (name === 'ai') {
      value = event.target.checked;

      if (value)
        form['opponent'] = 'ai';
      else
        form['opponent'] = '';
    }
    if (name === 'pass') {
      form['key'] = seedPrivate(value + form.username + "chessdemo134")
    }
    this.setState({
      form: {
        ...form,
        [name]: value,
        error: '',
      },
    });
  }

  componentDidMount() {
    this.isComponentMounted = true;
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  // Handle form submission to call api
  async handleSubmit(event) {
    // Stop the default form submit browser behaviour
    event.preventDefault();
    // Extract `form` state
    const { form } = this.state;
    // Extract `setUser` of `UserAction` and `user.name` of UserReducer from redux
    const { setUser } = this.props;
    // Set loading spinner to the button
    this.setState({ isSigningIn: true });
    // Send a login transaction to the blockchain by calling the ApiService,
    // If it successes, save the username to redux store
    // Otherwise, save the error state for displaying the message
    try {
      await ApiService.register(form);
    }
    catch (e) {}

    try {
      await ApiService.joingame(form.opponent);
      setUser({ game: {}, name: form.username });

    }
    catch (err) {
      if (err.toString().indexOf("wrong public key") !== -1) {
        this.setState({ error: "wrong password" });
      }
      else
        this.setState({ error: err.toString() });
    }
    if (this.isComponentMounted)
      this.setState({ isSigningIn: false });
  }

  render() {
    // Extract data from state
    const { form, error, isSigningIn } = this.state;

    return (
      <div className="Login">
        <div className="title">LiquidChess - Immortal Chess Platform powered by LiquidApps</div>

        <form name="form" onSubmit={ this.handleSubmit }>
          <div className="field">
            <label>Account name (if you don't have one, it will be created for you)</label>
            <input
              type="text"
              name="username"
              value={ form.username }
              placeholder="All small letters, a-z, 1-5 or dot, max 12 characters"
              onChange={ this.handleChange }
              pattern="[\.a-z1-5]{2,12}"
              required
            />
          </div>
          <div className="field">
            <label>Enter your Password</label>
            <input
              type="password"
              name="pass"
              value={ form.pass }
              onChange={ this.handleChange }
              required
            />
          </div>
          <br/>
          <div className="field">
            <label>Play against the computer (AI)</label>
          <Checkbox
            name="ai"
            checked={ form.ai }
            onChange={this.handleChange} />

          </div>

          {!form.ai ?<span><div className="field">Or</div> <div className="field">
            <label>Play 1 on 1 and enter your opponent's account name:</label>
            <input
              name="opponent" disabled={form.ai ? 'disabled' : ''}
              value={ form.opponent }
              onChange={ this.handleChange }
              required
            />

          </div></span>
          : ""}
          <div className="field form-error">
            { error && <span className="error">{ error }</span> }
          </div>
          <div className="bottom">
            <Button type="submit" className="blue" loading={ isSigningIn }>
              { "Play" }
            </Button>

          </div>
        </form>
      </div>
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
export default connect(mapStateToProps, mapDispatchToProps)(Login);
