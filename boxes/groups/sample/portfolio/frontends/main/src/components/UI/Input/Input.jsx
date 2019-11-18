import React, { Component } from 'react';
import classes from './Input.module.scss';

class Input extends Component {
  render() {
    const { placeholder, id, onChange, skin, required, type, value, name } = this.props;
    const props = {
      id,
      className: classes[skin],
      onChange,
      required,
      placeholder,
      type,
      value,
      name
    };
    return (
      <input {...props }/>
    );
  }
}

export default Input;
