import React from 'react';
import classes from './Footer.module.scss';
import Github from 'assets/Footer/github.svg';
import Twitter from 'assets/Footer/twitter.svg';
import LinkedIn from 'assets/Footer/linkedIn.svg';
import Medium from 'assets/Footer/medium.svg';
import Telegram from 'assets/Footer/telegram.svg';
import Reddit from 'assets/Footer/reddit.svg';

const footer = () => {
  return (
    <div className={classes.container}>
      <div className={classes.flexColumn}>
        <div className={classes.flexSubColumn}>
          <div className={classes.columnTitleText}>DAPP NETWORK SERVICES</div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://liquidapps.io/vRam" rel="noopener noreferrer" target="_blank">vRAM</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://liquidapps.io/liquid-accounts" rel="noopener noreferrer" target="_blank">LiquidAccounts</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://liquidapps.io/liquid-oracles" rel="noopener noreferrer" target="_blank">LiquidOracles</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://liquidapps.io/liquid-scheduler" rel="noopener noreferrer" target="_blank">LiquidScheduler</a></div>
        </div>
        <div className={classes.flexSubColumnCenter}>
          <div className={classes.columnTitleText}>DOCUMENTATION</div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://docs.liquidapps.io/en/stable/dsps.html" rel="noopener noreferrer" target="_blank">Become a DAPP Service Provider</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://docs.liquidapps.io/en/stable/developers.html" rel="noopener noreferrer" target="_blank">DAPP Network Tools & Services</a></div>
        </div>
        <div className={classes.flexSubColumn}>
          <div className={classes.columnTitleText}>FOLLOW US</div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://github.com/liquidapps-io" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={Github} alt="" />Github</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://twitter.com/LiquidAppsIO" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={Twitter} alt="" />Twitter</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://www.linkedin.com/company/liquidapps/?viewAsMember=true" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={LinkedIn} alt="" />LinkedIn</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://medium.com/the-liquidapps-blog" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={Medium} alt="" />Medium</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://t.me/joinchat/IDQ7mRHawQ3a0H9pDt46fg" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={Telegram} alt="" />Telegram</a></div>
          <div className={classes.columnTextDiv}><a className={classes.columnText} href="https://www.reddit.com/r/LiquidApps/" rel="noopener noreferrer" target="_blank"><img className={classes.footerImage} src={Reddit} alt="" />Reddit</a></div>
        </div>
      </div>
      <hr className={classes.footerHr}></hr>
      <div className={classes.copyright}>© LiquidApps 2019</div>
    </div>
  );
};

export default footer;
