
const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
var BancorConverter = artifacts.require("./BancorConverter/");
var Token = artifacts.require("./Token/");
const {loadModels} = require("../extensions/tools/models");


async function regConverter(deployer, token_contract, token_symbol, smart_token_contract, smart_symbol, converter_contract, fee, maxfee, networkContract, networkToken, networkTokenSymbol){
    // determine precision
    
    const converter = await deployer.deploy(BancorConverter, converter_contract);
    const tknrlyContract = await deployer.deploy(Token, smart_token_contract);
    await tknrlyContract.contractInstance.create({
      issuer: converter.contract.address,
      maximum_supply: `250000000.0000000000 ${smart_symbol}`},
      {authorization: `${tknrlyContract.contract.address}@active`,broadcast: true,sign: true});

    // converter create
    await converter.contractInstance.init({
                        smart_contract: tknrlyContract.contract.address,
                        smart_currency: `0.0000000000 ${smart_symbol}`,
                        smart_enabled: 0,
                        enabled: 0,
                        fee,
                        max_fee:maxfee,
                        network: networkContract,
                        require_balance: 1
    },{authorization: `${converter.contract.address}@active`,broadcast: true,sign: true});        

    // converter setreserve
    
    await converter.contractInstance.setreserve({
            contract:networkToken,
            currency: `0.0000000000 ${networkTokenSymbol}`,
            ratio: 500,
            p_enabled: 1,
    },
        {authorization: `${converter.contract.address}@active`,broadcast: true,sign: true});
        
    var precision = 5;
    try{
       var stat = await converter.eos.getCurrencyStats({
        code: token_contract,
        symbol: token_symbol,
      });
      precision = stat[token_symbol].max_supply.split(' ',2)[0].split('.',2)[1].length;  
    }
    catch(e){
      throw new Error(`could not find ${token_contract} - ${token_symbol}`);
    }
    var zeros = '0'.repeat(precision);
    await converter.contractInstance.setreserve({
            contract:token_contract,
            currency: `0.${zeros} ${token_symbol}`,
            ratio: 500,
            p_enabled: 1,
        },{authorization: `${converter.contract.address}@active`,broadcast: true,sign: true});
}

module.exports = async function(args) {
  const networkContract = "thisisbancor";
  const tknbntContract = "bntbntbntbnt";
  var networkTokenSymbol = "BNT";
  var maxfee = 30;
  var tkns = await loadModels("bancor-relays");
  for (var i = 0; i < tkns.length; i++) {
    const {token, symbol, smart_token_contract, smart_symbol, converter_contract, fee} = tkns[i];
    await regConverter(deployer, token, symbol, smart_token_contract, smart_symbol, converter_contract, fee, maxfee , networkContract, tknbntContract, networkTokenSymbol);    
    
  }
};
