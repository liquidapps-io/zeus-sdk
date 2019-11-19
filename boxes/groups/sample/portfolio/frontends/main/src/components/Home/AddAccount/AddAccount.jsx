import React from 'react';
import classes from './AddAccount.module.scss';
import Input from 'components/UI/Input/Input';
import Button from 'components/UI/Button/Button';

const addAccount = (props) => {
  let error, input, loader;
  const button = props.account ? 'secondary' : 'disabled';
  if (props.isAddingAccount) loader = <div className={classes.loader}></div>;
  if (props.error) {
    error = (
      <div className={classes.error}>
        {props.error}
      </div>
    );
    input = 'enterAccountError';
  }
  else {
    error = (
      <div className={classes.noError}>
        no error
      </div>
    );
    input = 'enterAccount';
  }
  return (
    <div className={classes.container}>
      <div className={classes.title}>Add BTC, ETH, EOS Account(s)</div>
      {error}
      <div className={classes.input}>
        <Input
          required={true}
          skin={input}
          onChange={props.handleChangeAccount}
          type="text"
          placeholder="account / address"
          value={props.inputAccount}
        />
      </div>
      <div className={classes.addAccountButton}>
        <Button
          text="Add Account"
          skin={button}
          onClick={props.addAccount}
        />
      </div>
      {loader}
    </div>
  );
};

export default addAccount;
