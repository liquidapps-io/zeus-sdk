import React, { Component } from 'react';
import classes from './Button.module.scss';

class Button extends Component {
  render() {
    const { style, text, id, onClick, isDisabled, skin } = this.props;
    const props = {
      style: style,
      id: id,
      className: classes[skin],
      onClick: onClick,
      disabled: isDisabled
    };
    return (
      <button {...props}>
        {text}
      </button>
    );
  }
}

export default Button;
