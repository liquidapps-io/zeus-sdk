#!/usr/bin/env node
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const { dfuseClient, Engine } = require("../../../client/dfuse-client");

async function main() {
  const engineService = new Engine(dfuseClient);
  await Promise.all([engineService.runServices(true), engineService.runStaking()]).then((values) => {
    logger.info(`ran services`)
  });

  dfuseClient.release();
}
main().catch(error => logger.error('Unexpected error', error));