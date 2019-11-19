import React from 'react';
import classes from './Header.module.scss';
import Button from 'components/UI/Button/Button';
import Logo from 'assets/Logo/liquidapps_logo_dark.png';
import Login from 'components/UI/Login/Login';

const header = (props) => {
  let loginModal, loginButton;
  if (props.displayLogin) {
    loginModal = <Login
      show={props.displayLogin}
      closeLogin={props.showHideLogin}
      login={props.login}
      logout={props.logout}
      handleChangeLogin={props.handleChangeLogin}
      error={props.error}
      username={props.username}
      isSigningIn={props.isSigningIn}
    />;
  }
  if(!props.isLoggedIn) {
    loginButton = 
      <div>
        <Button
          text="Login"
          skin="primary"
          onClick={props.showHideLogin}
        />
      </div>
  } else {
    loginButton = 
      <div>
        <Button
          text={`Logged in as ${props.loginNameForm.username}`}
          skin="primary"
          onClick={props.logout}
        />
      </div>
  }
  return (
    <div>
      <div className={classes.container}>
        <div><img className={classes.logo} src={Logo} alt="LiquidApps Logo"/></div>
        <div className={classes.middle}>
          <div className={classes.headerTitle}>LiquidPortfolio</div>
        </div>
        {loginButton}
      </div>
      {loginModal}
    </div>
  );
};

export default header;
