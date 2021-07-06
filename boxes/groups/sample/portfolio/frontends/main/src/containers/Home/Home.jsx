import React, { Component } from 'react';
import classes from './Home.module.scss';
import Header from 'components/Header/Header';
import AddAccount from 'components/Home/AddAccount/AddAccount';
import AccountData from 'components/Home/AccountData/AccountData';
import Disclaimer from 'components/Home/Disclaimer/Disclaimer';
import Footer from 'components/Footer/Footer';
import fetchAllData from 'lib/FetchBlockchainData/fetchAllData';
import validateBtc from 'lib/ValidateAddress/validateBtc';
import validateEth from 'lib/ValidateAddress/validateEth';
import validateEos from 'lib/ValidateAddress/validateEos';
import validateEosLiquidAccount from 'lib/ValidateAddress/validateEosLiquidAccount';
import ApiService from 'lib/services/ApiService';
const { seedPrivate } = require('eosjs-ecc');
const initialState = {
  // login
  displayLogin: false,
  loginError: 'none',
  form: {
    username: '',
    pass: '',
    key: '',
    error: ''
  },
  isSigningIn: false,
  isLoggedIn: false,
  // add account
  inputAccount: '',
  inputAccountArr: [],
  addAccountErr: '',
  isAddingAccount: false,
  // bitcoin
  // btcAddressArr: ['1N75aWck3TFPorTvSgdzLUttY8uddqTAFZ'],
  btcAddressArr: [],
  btcPrice: '',
  btcBalanceArr: [],
  // btcBalanceApiUrl: 'https://chain.api.btc.com/v3/address/',
  btcBalanceApiUrl: 'https://blockchain.info/balance?active=',
  // btcBalanceApiUrl: 'https://blockchain.info/q/addressbalance/',
  btcTotalBalance: 0,
  // ethereum
  // ethAddressArr: ['0xc098b2a3aa256d2140208c3de6543aaef5cd3a94'],
  ethAddressArr: [],
  ethPrice: '',
  ethBalanceArr: [],
  ethBalancePrefixApiUrl: 'https://api.etherscan.io/api?module=account&action=balance&address=',
  ethBalanceSuffixApiUrl: '&tag=latest&apikey=',
  ethMultiBalancePrefixApiUrl: 'https://api.etherscan.io/api?module=account&action=balancemulti&address=',
  ethTokenPrefixApiUrl: 'http://api.ethplorer.io/getAddressInfo/',
  ethTokenSuffixApiUrl: '?apiKey=freekey',
  ethTotalBalance: 0,
  ethTotalTokenBalance: 0,
  // eos
  // eosAddressArr: ['dappairhodl1', 'dappservices'],
  eosAddressArr: [],
  eosPrice: '',
  eosBalanceArr: [],
  eosBalanceApiUrl: 'https://mainnet.eosn.io/v1/chain/get_account',
  eosTokenPrefixApiUrl: 'https://www.api.bloks.io/account/',
  eosTokenSuffixApiUrl: '?type=getAccountTokens&coreSymbol=EOS',
  eosTotalBalance: 0,
  eosTotalTokenBalance: 0
};

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  componentDidMount() {
    this.isComponentMounted = true;
    this.attemptCookieLogin();
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  showHideLogin = () => {
    this.setState({ displayLogin: !this.state.displayLogin, addAccountErr: `` });
  }

  login = async(event) => {
    if(this.state.loginError !== 'none') {
      this.setState({ loginError: `none` });
    }
    if(!this.state.form.username || !this.state.form.pass) {
      this.setState({ loginError: `Please provide a username / password` }); 
      return;
    }
    const namingIssue = await validateEosLiquidAccount(this.state.form.username);
    if(namingIssue !== 'none'){
      this.setState({ loginError: namingIssue });
      return;
    }
    event.preventDefault();
    const { form } = this.state;
    this.setState({ isSigningIn: true });
    try {
      await ApiService.register(form);
    }
    catch (e) {
      console.log(e)
    }
    try {
      await ApiService.login(form);
    } catch(e) {
      if (e.toString().indexOf("wrong public key") !== -1) {
        this.setState({ loginError: `Wrong password`, isSigningIn: false });
      } else if (e.toString().indexOf("vaccount not found") !== -1) {
        this.setState({ loginError: `Wrong password`, isSigningIn: false });
      } else if (e.toString().indexOf("invalid nonce") !== -1) {
        this.setState({ loginError: `Please try again`, isSigningIn: false });
      } else if (e.toString().indexOf("vaccount already exists") !== -1) {
        this.setState({ loginError: `Account must be a-z 1-5`, isSigningIn: false });
      } else if (e.toString().indexOf(`required service`) !== -1) {
        this.setState({ loginError: `DSP Error, please try again`, isSigningIn: false });
      } else {
        this.setState({ loginError: `Error logging in, try again: ${e.toString()}`, isSigningIn: false });
      }
      return
    }
    await ApiService.fetchAccounts(form.username, this);
    await this.fetchData(this.state.btcAddressArr, this.state.ethAddressArr, this.state.eosAddressArr);
    this.setState({ isSigningIn: false, isLoggedIn: true, displayLogin: false });
  }

  logout = () => {
    localStorage.removeItem('user_account');
    localStorage.removeItem('user_key');
    window.location.reload();
  }

  attemptCookieLogin = async () => {
    this.setState({ isAddingAccount: true });
    let account = localStorage.getItem('user_account');
    let key = localStorage.getItem('user_key');
    if(account != null && key != null) {
      this.setState({ isLoggedIn: true, form: { username: account } })
      await ApiService.fetchAccounts(account, this);
      await this.fetchData(this.state.btcAddressArr, this.state.ethAddressArr, this.state.eosAddressArr);
    }
    this.setState({ isAddingAccount: false });
    return
  }

  removeAccount = async () => {
    if(this.state.btcAddressArr.includes(this.state.inputAccount)) {
      await this.setState({ btcAddressArr: this.state.btcAddressArr.filter(e => e !== this.state.inputAccount)});
    } else if (this.state.ethAddressArr.includes(this.state.inputAccount)){ 
      await this.setState({ ethAddressArr: this.state.ethAddressArr.filter(e => e !== this.state.inputAccount)});
    } else if(this.state.eosAddressArr.includes(this.state.inputAccount)) {
      await this.setState({ eosAddressArr: this.state.eosAddressArr.filter(e => e !== this.state.inputAccount)});
    }
  }

  addAccount = async() => {
    this.setState({ isAddingAccount: true });
    if(!this.state.isLoggedIn){
      this.setState({ addAccountErr: 'Please login before entering an address', isAddingAccount: false });
      return;
    } else if(!this.state.inputAccount){
      this.setState({ addAccountErr: `Please add an account`, isAddingAccount: false });
      return;
    }
    let valid, btc, eth, eos;
    // check if account has already been added
    if(this.state.btcAddressArr.includes(this.state.inputAccount) || this.state.ethAddressArr.includes(this.state.inputAccount) || this.state.eosAddressArr.includes(this.state.inputAccount) ) {
      await this.setState({ addAccountErr: `Account ${this.state.inputAccount} has already been added`, isAddingAccount: false });
      return
    }
    if (this.state.inputAccount.length <= 12 && this.state.inputAccount.length > 0) {
      valid = await validateEos(this.state.inputAccount, this);
      if (valid === 'valid') {
        eos = this.state.inputAccount
        await this.setState({ eosAddressArr: [...this.state.eosAddressArr, this.state.inputAccount], addAccountErr: '' });
      }
      else { 
        this.setState({ addAccountErr: valid, isAddingAccount: false });
        return;
      }
    }
    else if (this.state.inputAccount.charAt(0) === '0') {
      valid = validateEth(this.state.inputAccount);
      if (valid) {
        eth = this.state.inputAccount
        await this.setState({ ethAddressArr: [...this.state.ethAddressArr, this.state.inputAccount], addAccountErr: '' });
      } 
      else {
        this.setState({ addAccountErr: 'Please enter a valid ETH address', isAddingAccount: false });
        return;
      }
    }
    else if (this.state.inputAccount.length > 1) {
      valid = validateBtc(this.state.inputAccount);
      if (valid) {
        btc = this.state.inputAccount
        await this.setState({ btcAddressArr: [...this.state.btcAddressArr, this.state.inputAccount], addAccountErr: '' });
      } 
      else {
        this.setState({ addAccountErr: 'Please enter a valid BTC address', isAddingAccount: false });
        return;
      }

    } else {
      this.setState({ addAccountErr: 'Please enter a valid address' });
    }
    if(!this.state.addAccountErr){
      try {
        await ApiService.addaccount(btc, eth, eos);
      }
      catch (e) {
        if(e.toString().indexOf("invalid nonce") !== -1){
          this.setState({ addAccountErr: "Please try again, invalid nonce detected", isAddingAccount: false, inputAccount: '' });
        } else {
          this.removeAccount();
          this.setState({ addAccountErr: `There was an issue adding the account, please try adding again: ${e.message}`, isAddingAccount: false, inputAccount: '' });
        }
        return;
      }
    }
    await this.fetchData(this.state.btcAddressArr, this.state.ethAddressArr, this.state.eosAddressArr);
    this.setState({ isAddingAccount: false, inputAccount: '' });
  }

  fetchData = async (btcAddressArr, ethAddressArr, eosAddressArr) => {
    if (this.state.btcAddressArr || this.state.ethAddressArr || this.state.eosAddressArr)
      await fetchAllData(btcAddressArr, ethAddressArr, eosAddressArr, this, this.removeAccount);
  }

  handleChangeLogin(event) {
    const { name, value } = event.target;
    const { form } = this.state;
    if (name === 'pass')
      form.key = seedPrivate(value + form.username + 'liquidportfoliosdemo134');

    this.setState({
      form: {
        ...form,
        [name]: value,
        error: ''
      },
      loginError: 'none'
    });
  }

  handleChangeAccount(event) {
    // if not lower case, make lower case, only if eos account
    if (event.target.value.toString().match(/[A-Z]/) && event.target.value.length <= 12) this.setState({ inputAccount: event.target.value.toString().toLowerCase(), addAccountErr: '' });
    else this.setState({ inputAccount: event.target.value.toString(), addAccountErr: '' });
  }

  render() {
    return (
      <div className={classes.rootContainer}>
        <Header
          displayLogin={this.state.displayLogin}
          show={this.state.displayLogin}
          showHideLogin={this.showHideLogin}
          login={this.login.bind(this)}
          logout={this.logout.bind(this)}
          handleChangeLogin={this.handleChangeLogin.bind(this)}
          error={this.state.loginError}
          username={this.state.form.username}
          password={this.state.form.pass}
          isSigningIn={this.state.isSigningIn}
          isLoggedIn={this.state.isLoggedIn}
          loginNameForm={this.state.form}
        />
        <AddAccount
          handleChangeAccount={this.handleChangeAccount.bind(this)}
          addAccount={this.addAccount}
          error={this.state.addAccountErr}
          account={this.state.inputAccount}
          inputAccount={this.state.inputAccount}
          isAddingAccount={this.state.isAddingAccount}
        />
        <AccountData
          btcTotalBalance={this.state.btcTotalBalance}
          ethTotalBalance={this.state.ethTotalBalance}
          ethTotalTokenBalance={this.state.ethTotalTokenBalance}
          eosTotalBalance={this.state.eosTotalBalance}
          eosTotalTokenBalance={this.state.eosTotalTokenBalance}
        />
        <Disclaimer/>
        <Footer/>
      </div>
    );
  }
}

export default Home;
