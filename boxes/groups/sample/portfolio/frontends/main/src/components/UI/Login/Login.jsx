import React from 'react';
import classes from './Login.module.scss';
import Button from 'components/UI/Button/Button';
import Input from 'components/UI/Input/Input';
import xOut from 'assets/Login/xOut.png';

const login = (props) => {
  let error, errorCss, loader;
  const showHideClassName = props.show ? classes.displayBlock : classes.displayNone;
  const button = props.username ? 'secondary' : 'disabled';
  if (props.error !== 'none') { error = 'primaryError'; errorCss = classes.loginBoxError; }
  else { error = 'primary'; errorCss = classes.loginBoxErrorHide; }
  if (props.isSigningIn) loader = <div className={classes.loader}></div>;
  return (
    <div>
      <div onClick={props.closeLogin} className={showHideClassName}></div>
      <section className={classes.modalMain}>
        <div className={classes.loginBoxTitle}>LOGIN / SIGN UP</div>
        <div className={errorCss}>{props.error}</div>
        <div className={classes.loginBox}>
          <div className={classes.loginBoxUsernameText}>Username</div>
          <div className={classes.inputWidth}>
            <Input
              required={true}
              skin={error}
              onChange={props.handleChangeLogin}
              type="text"
              placeholder="hodlsohard"
              name="username"
            />
          </div>
        </div>
        <div className={classes.loginBox}>
          <div className={classes.loginBoxPasswordText}>Password</div>
          <div className={classes.inputWidth}>
            <Input
              required={true}
              skin={error}
              onChange={props.handleChangeLogin}
              type="password"
              placeholder="̿̿ ̿̿ ̿̿ ̿'̿'\̵͇̿̿\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿"
              name="pass"
            />
          </div>
        </div>
        <div className={classes.loginButton}>
          <Button
            text="ENTER"
            skin={button}
            onClick={props.login}
          />
        </div>
        <div className={classes.xOutButton}>
          <img onClick={(e) => props.closeLogin(e)} src={xOut} alt="X out Button"/>
        </div>
      </section>
      {loader}
    </div>
  );
};

export default login;
