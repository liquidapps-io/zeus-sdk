import React from 'react';
import classes from './AccountData.module.scss';

const accountData = (props) => {
  return (
    <div className={classes.container}>
      <div className={classes.title}>Account Data</div>
      <div className={classes.dataBox}>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total BTC Value</div>
          <div className={classes.dataTotal}>${props.btcTotalBalance.toLocaleString('en')}</div>
        </div>
        <div className={classes.verticalSpacingMobileTablet}></div>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total ETH Value</div>
          <div className={classes.dataTotal}>${props.ethTotalBalance.toLocaleString('en')}</div>
        </div>
        <div className={classes.verticalSpacingMobileTablet}></div>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total EOS Value</div>
          <div className={classes.dataTotal}>${props.eosTotalBalance.toLocaleString('en')}</div>
        </div>
        <div className={classes.verticalSpacingMobileTablet}></div>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total Value</div>
          <div className={classes.dataTotal}>${(props.btcTotalBalance + props.ethTotalBalance + props.ethTotalTokenBalance + props.eosTotalBalance + props.eosTotalTokenBalance).toLocaleString('en')}</div>
        </div>
      </div>
      <div className={classes.verticalSpacingMobileTablet}></div>
      <div className={classes.verticalSpacing}></div>
      <div className={classes.dataBox}>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total ETH Tokens Value</div>
          <div className={classes.dataTotal}>${props.ethTotalTokenBalance.toLocaleString('en')}</div>
        </div>
        <div className={classes.verticalSpacingMobileTablet}></div>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total EOS Tokens Value</div>
          <div className={classes.dataTotal}>${props.eosTotalTokenBalance.toLocaleString('en')}</div>
        </div>
        <div className={classes.verticalSpacingMobileTablet}></div>
        <div className={classes.subDataBox}>
          <div className={classes.dataTitle}>Total Tokens Value</div>
          <div className={classes.dataTotal}>${(props.ethTotalTokenBalance + props.eosTotalTokenBalance).toLocaleString('en')}</div>
        </div>
      </div>
    </div>
  );
};

export default accountData;
