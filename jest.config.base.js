const { defaults: tsjPreset } = require('ts-jest/presets');

const config = {
  ...tsjPreset,
  verbose: true,
  testRegex: ".+\.spec\.ts$",
  collectCoverage: true,
  coverageProvider: 'v8',
};

module.exports = config;
