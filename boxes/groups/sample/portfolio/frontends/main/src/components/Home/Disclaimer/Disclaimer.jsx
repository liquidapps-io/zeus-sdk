import React from 'react';
import classes from './Disclaimer.module.scss';

const disclaimer = () => {
  let text = "* LiquidPortfolio's purpose is to demonstrate the services that can be offered on the DAPP Network. The information is gathered from third parties and provided AS-IS. LiquisApps holds no warranty or guarantees to the accuracy of the presented values. A list of the public APIs used by LiquidPortfolio can be found in the disclaimer."
  return (
    <div className={classes.container}>
        <div className={classes.disclaimer}>
        <div><a className={classes.disclaimerText} rel="noopener noreferrer" target="_blank" href="https://github.com/liquidapps-io/zeus-sdk/blob/master/boxes/groups/sample/portfolio/DISCLAIMER.md">{text}</a></div>
        </div>
    </div>
  );
};

export default disclaimer;
