const delay = ms => new Promise(res => setTimeout(res, ms));

const getTable = async(handler,code,table,scope,limit = 1) => {
    return await handler.getTableRows({
      'json': true,
      'scope': scope,
      'code': code,
      'table': table,
      'limit': limit
    });
  }
  
const awaitTable = async(handler,code,table,scope,search_field,desired_state,timeout = 240000,limit = 1) => {
  let finished = false;
  let elapsed = 0;
  while(!finished) {
    await delay(1000);
    elapsed += 1000;
    let res = await getTable(handler,code,table,scope,limit);
    if(res.rows.length > 0) {
      for(let i = 0; i < res.rows.length; i++) {
        try{
          if(res.rows[i][search_field] == desired_state) return res;
        } catch(e) {}
      }
    }
    finished = elapsed >= timeout;
  }
}

const getTestAccountName = (num) => {
  let fivenum = num.toString(5).split('');
  for (let i = 0; i < fivenum.length; i++) {
      fivenum[i] = String.fromCharCode(fivenum[i].charCodeAt(0) + 1);
  }
  fivenum = fivenum.join('');
  let s = '111111111111' + fivenum;
  let prefix = 'test';
  s = prefix + s.substr(s.length - (12 - prefix.length));
  // console.log(s);
  return s;
};

module.exports = { awaitTable, getTable, delay, getTestAccountName }