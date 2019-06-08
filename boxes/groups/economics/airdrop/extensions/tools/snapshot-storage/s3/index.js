const AWS = require('aws-sdk');
const format = require('../format').default;
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const fetch = require('node-fetch');
const csv = require('async-csv');

async function arrayToCSV(arrayObj) {
    // console.log("arrayObj", arrayObj[0]);
    let result = await csv.stringify(arrayObj);
    return result;
}

async function CSVtoArrayOrig(csvText) {
    let result = await csv.parse(csvText, { columns: ['creation_time', 'account', 'balance'] });
    return result;
}
async function CSVtoArray(csvText) {
    let result = await csv.parse(csvText, { columns: ['account', 'balance'] });
    return result;
}

export default class A {
    constructor(args, model) {
        this.args = args;
        this.model = model;
    }
    async saveText(text, suffix) {
        return s3.putObject({
            ACL: "public-read",
            Body: text,
            Bucket: this.model.storage.bucket,
            Key: `${this.model.storage.prefix}/${this.model.name}/${suffix}`
        }).promise()
    }
    async getText(suffix) {
        var csvResp = await s3.getObject({
            Bucket: this.model.storage.bucket,
            Key: `${this.model.storage.prefix}/${this.model.name}/${suffix}`
        }).promise();
        return csvResp.Body.toString();
    }
    async saveModel() {
        return this.saveText(JSON.stringify(this.model), 'model.json');
    }
    async cacheSnapshot() {
        // download snapshot
        var date = new Date(Date.parse(this.model.date));
        var dateObj = {
            YYYY: "2019",
            DD: "04",
            MM: "06",
        }
        /*
        {
            YYYY: date.getYear(),
            DD: date.getDate(),
            MM: date.getMonth() + 1,
        }*/
        var url = format(this.model.snapshot_url_format, dateObj);
        var resp = await fetch(url);
        var csv = await resp.text();
        return this.saveText(csv, 'original_snapshot.csv');
    }
    async saveTransformed(objlist) {
        var csv = await arrayToCSV(objlist);
        return this.saveText(csv, 'transformed.csv');
    }
    async getOriginalAccounts() {
        var csv = await this.getText('original_snapshot.csv');
        return await CSVtoArrayOrig(csv);
    }
    async getTransformedAccounts() {
        var csv = await this.getText('transformed.csv');
        return await CSVtoArray(csv);
    }
    async saveTransformedAsLatest() {
        var csv = await this.getText('transformed.csv');
        return this.saveText(csv, 'latest.csv');
    }
    async saveLatest(objlist) {
        var csv = await arrayToCSV(objlist);
        return this.saveText(csv, 'latest.csv');
    }
    async populateLatest() {
        var csv = await this.getText('latest.csv');
        var arrayObj = await CSVtoArray(csv);
        var batch = [];
        for (var i = 0; i < arrayObj.length; i++) {
            //await this.populateSingle(arrayObj[i]);
            if (arrayObj[i].balance == 0)
                continue;
            batch.push(this.populateSingle(arrayObj[i]));
            if (batch.length >= 500) {

                await Promise.all(batch);
                batch = [];
            }
        }
        await Promise.all(batch);
    }
    async populateSingle(accountobj) {
        console.log(accountobj.account)
        return this.saveText(accountobj.balance.toString().trim(), `entries/${accountobj.account}`);
    }
    getLatestURLPrefix() {
        var prefix = `${this.model.storage.prefix}/${this.model.storage.name}/entries/`;
        var url_prefix = `https://s3.amazonaws.com/${this.model.storage.bucket}/${prefix}`;
        return url_prefix;
    }
};
