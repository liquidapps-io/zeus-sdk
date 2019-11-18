const fetch = require('node-fetch');
module.exports = async({ proto, address }) => {
    // mock for tests:
    if (address == 'What is the average air speed velocity of a laden swallow?') { return Buffer.from('What do you mean, an African or European Swallow?'); }
    const r = await fetch(`http://api.wolframalpha.com/v1/result?i=${escape(address)}&appid=${process.env.WOLFRAM_APP_ID || 'DEMO'}`, { method: 'GET' });
    return Buffer.from(await r.text());
};
