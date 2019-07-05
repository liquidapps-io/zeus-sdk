import React, { Component } from 'react';
import { connect } from 'react-redux';
// Components
import { Button } from 'components';
// Services and redux action
import { UserAction } from 'actions';
import { ApiService } from 'services';
let { PrivateKey, PublicKey, Signature, Aes, key_utils, config, seedPrivate } = require('eosjs-ecc')

class Login extends Component {

  constructor(props) {
    // Inherit constructor
    super(props);
    // State for form data and error message
    this.state = {
      form: {
        username: '',
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
    const { name, value } = event.target;
    const { form } = this.state;
    if (name == 'pass') {
      form['key'] = seedPrivate(value + form.username + "elementalbattlesdemo134")
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
  handleSubmit(event) {
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
    return ApiService.register(form).then(() => ApiService.login(form))
      .then(() => {
        setUser({ name: form.username });
      })
      .catch(err => {
        this.setState({ error: err.toString() });
      })
      .finally(() => {
        if (this.isComponentMounted) {
          this.setState({ isSigningIn: false });
        }
      });
  }

  render() {
    // Extract data from state
    const { form, error, isSigningIn } = this.state;

    return (
      <div className="Login">
        <div className="title">Elemental Battles - powered by EOSIO</div>
        <div className="description">
        <br/>
        <br/>
        Welcome,<br/>
        Although you won’t notice it unless you examine the <a href="https://github.com/liquidapps-io/zeus-sdk/tree/master/boxes/groups/sample/cardgame">code</a>, this game is running on the EOS blockchain.<br/>
<br/><br/>
        It does so without wasting RAM.<br/>
        <ul style={{ "list-style-type": "circle"}}>
        <li>The <b>vRAM</b> Service (using a Session-based RAM caching)</li>
        <li>Free user on-boarding using <b>LiquidAccounts</b></li>
        <li><b>LiquidDNS</b></li>
        <li>Frontend Hosted on <b>IPFS</b></li>
        </ul>
        We have created the first <b>LiquidApp</b>. Immortal dApps are at your fingertips.<br/>
<br/>
        No more excuses.<br/>
        Enjoy.<br/><div style={{"text-align": 'center'}}><img height="40" src="https://liquidapps.io/static/media/liquidapps_logo_white.3b1d829c.svg"/></div>
        </div>
        <form name="form" onSubmit={ this.handleSubmit }>
          <div className="field">
            <label>Account name</label>
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
            <label>Password</label>
            <input
              type="password"
              name="pass"
              value={ form.pass }
              onChange={ this.handleChange }
              required
            />
          </div>
          <div className="field form-error">
            { error && <span className="error">{ error }</span> }
          </div>
          <div className="bottom">
            <Button type="submit" className="green" loading={ isSigningIn }>
              { "Register/Login" }
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
