var path = require('path')
var fs = require('fs')
var yargs = require('yargs')
var logger = require('./logger')
var Sync = require('./Sync')
var Config = require('./Config')

var cli = yargs
  .usage('npm <command>')
  .demand(1, 'must provide a valid command')
  .option('level', {
    alias: 'l',
    default: 'info',
    describe: `logging level to use, valid levels are ${logger.levels.join(', ')}`,
    type: 'string'
  })
  .command('sync', 'download the latest files from the API', (yargs) => {
    yargs.option('config', {
      alias: 'c',
      demand: true,
      describe: 'the configuration file to use',
      type: 'string'
    })
    .help('help')
  })
  .command('sampleConfig', 'display a sample config file')
  .help('help')

var runnerMap = {
  sync: {requireConfig: true, class: Sync},
  sampleConfig: {class: Config}
}
module.exports = {
  cli: cli,
  run(argv) {
    var command = argv._[0]
    var runner = runnerMap[command]
    var logLevel = argv.l || argv.level
    if (logLevel) {
      logger.setLevel(logLevel)
    }
    if (!runner) {
      logger.error('invalid command')
      cli.showHelp()
      process.exit(1)
    }
    var RunnerClass = runner.class
    var config = {}
    if (runner.requireConfig) {
      var configFile = argv.config
      var configPath = path.resolve(process.cwd(), configFile)
      try {
        fs.statSync(configPath)
      } catch (e) {
        logger.error(`config file at ${configPath} does not exist`)
        process.exit(1)
      }

      config = require(configPath)
      var isInvalidConfig = Config.validate(config)
      if (isInvalidConfig) {
        logger.error(`config at ${configPath} is invalid`)
        logger.error(isInvalidConfig)
        process.exit(1)
      }
    }

    var runner = new RunnerClass(argv, config, logger)
    runner.run((err) => {
      if (err) {
        logger.error('an error occured')
        logger.error(err)
        process.exit(1)
      }
      logger.info(`${command} command completed successfully`)
    })
  }
}
