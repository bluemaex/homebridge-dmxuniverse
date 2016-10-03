const request = require('request')
const DeviceDriver = require('./devices')
const pluginName = 'homebridge-dmxuniverse'
const platformName = 'DmxPlatform'
let Accessory, Characteristic, Service, UUIDGen

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory
  Characteristic = homebridge.hap.Characteristic
  Service = homebridge.hap.Service
  UUIDGen = homebridge.hap.uuid

  // last parameter denotes a dynamic platform
  homebridge.registerPlatform(pluginName, platformName, DmxPlatform, true)
}

function DmxPlatform(log, config, api) {
  this.accessories = []
  this.devices = {}

  this.api = api
  this.config = config
  this.log = log

  this.api.on('didFinishLaunching', () => {
    this.getDmxUniverses()
  })
}

DmxPlatform.prototype.getDmxUniverses = function() {
  request({uri: this.config.dmx.list, json: true}, (error, response, body) => {
    if(error || response.statusCode !== 200) {
      return this.log('error in getting universes', error, response)
    }

    Object.keys(body.universes).forEach((universe) => {
      body.universes[universe].forEach((device) => {
        device.config = body.devices[device.type]
        this.createDevice(universe, device)
      })
    })
  })
}

DmxPlatform.prototype.createDevice = function(universe, device) {
  const name = device.name || [universe, device.type, device.address].join('-')
  const exists = this.accessories.find((a) => a.displayName === name)
  if(exists) {
    return this.log(`${name} already exists`)
  }

  this.log(`Creating Accessory ${name}`)
  const accessory = new Accessory(name, UUIDGen.generate(name))
  accessory.context.universe = universe
  accessory.context.device = device

  this.configureAccessory(accessory)
  this.api.registerPlatformAccessories(pluginName, platformName, [accessory])
}

DmxPlatform.prototype.configureAccessory = function(accessory) {
  this.log(`Configuring Accessory ${accessory.displayName}`)

  const driver = this.getDeviceDriver(accessory)
  driver.configure()
  this.devices[accessory.displayName] = driver

  this.accessories.push(accessory)
}

DmxPlatform.prototype.getDeviceDriver = function(accessory) {
  const device = accessory.context.device
  const universe = accessory.context.universe

  accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, `Blmx${platformName}`)
    .setCharacteristic(Characteristic.SerialNumber, `${universe}:${device.address}`)
    .setCharacteristic(Characteristic.Model, device.type)

  let driver
  switch(device.type) {
    default:
      driver = new DeviceDriver.RGB(accessory, this.log, this.config.dmx)
  }

  return driver
}
