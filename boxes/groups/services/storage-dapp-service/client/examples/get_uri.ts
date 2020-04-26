(async () => {
  let res:any = await fetch('http://kylin-dsp-2.liquidapps.io/v1/dsp/liquidstorag/get_uri', {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify({ uri: "ipfs://zb2rhX28fttoDTUhpmHBgQa2PzjL1N3XUDaL9rZvx8dLZseji" })
  });
  res = await res.json();
  res = Buffer.from(res.data, 'base64').toString(),
  console.log(`result: ${res}`);
})().catch((e) => { console.log(e); });