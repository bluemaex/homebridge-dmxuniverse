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
        device.name = device.name || [universe, device.type, device.address].join('-')
        device.config = body.devices[device.type]

        this.handleDmxDevice(universe, device)
      })
    })
  })
}

DmxPlatform.prototype.handleDmxDevice = function(universe, device) {
  switch(device.type) {
    case 'eurolite-led-bar': {
      this.log('eurolite-led-bar', device.name)
      return this.findAccessory(device.name)
        ? null
        : this.createAccessory(universe, device)
    }
    case 'showtec-multidim2': {
      this.log('showtec-multidim2', device.name)
      device.config.channels.forEach((channel, num) => {
        const subDevice = Object.assign({}, device, {
          name: device.name + ':' + channel,
          channels: [channel],
          subNum: num
        })
        return this.findAccessory(subDevice.name)
          ? null
          : this.createAccessory(universe, subDevice)
      })
    }
  }
}

DmxPlatform.prototype.findAccessory = function(name) {
  return this.accessories.find((a) => a.displayName === name)
}

DmxPlatform.prototype.createAccessory = function(universe, device) {
  if(!DeviceDriver.hasOwnProperty(device.type)) {
    this.log(`Ignoring Accessory ${device.name}: No driver found for type ${device.type}`)
    return
  }

  this.log(`Creating Accessory ${device.name}`)
  const accessory = new Accessory(device.name, UUIDGen.generate(device.name))
  accessory.context.universe = universe
  accessory.context.device = device

  this.setManufacturer(accessory)
  this.configureAccessory(accessory)

  this.api.registerPlatformAccessories(pluginName, platformName, [accessory])
}

DmxPlatform.prototype.configureAccessory = function(accessory) {
  this.log(`Configuring Accessory ${accessory.displayName}`)

  const driver = this.getDeviceDriver(accessory)
  driver.setupCharacteristics()
  driver.configure()
  this.devices[accessory.displayName] = driver

  this.accessories.push(accessory)
}

DmxPlatform.prototype.getDeviceDriver = function(accessory) {
  const type = accessory.context.device.type
  return new DeviceDriver[type](accessory, this.log, this.config.dmx)
}

DmxPlatform.prototype.setManufacturer = function(accessory) {
  const device = accessory.context.device
  const universe = accessory.context.universe

  accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, `Blmx${platformName}`)
    .setCharacteristic(Characteristic.SerialNumber, `${universe}:${device.address}`)
    .setCharacteristic(Characteristic.Model, device.type)
}
