const Service = require('hap-nodejs').Service
const Characteristic = require('hap-nodejs').Characteristic
const colorsys = require('colorsys')

function RgbAccessory(accessory, log, config) {
  this.accessory = accessory
  this.log = log
  this.config = config

  this.power = 0
  this.brightness = 0
  this.hue = 0
  this.saturation = 0

  if(!this.accessory.getService(Service.Lightbulb)) {
    this.accessory.addService(Service.Lightbulb, this.accessory.displayName)
  }

  const service = this.accessory.getService(Service.Lightbulb)
  if(!service.testCharacteristic(Characteristic.Brightness)) {
    service.addCharacteristic(Characteristic.Brightness)
  }
  if(!service.testCharacteristic(Characteristic.Hue)) {
    service.addCharacteristic(Characteristic.Hue)
  }
  if(!service.testCharacteristic(Characteristic.Saturation)) {
    service.addCharacteristic(Characteristic.Saturation)
  }
}

RgbAccessory.prototype.configure = function() {
  const service = this.accessory.getService(Service.Lightbulb)

  service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getState.bind(this, 'power'))
      .on('set', this.setState.bind(this, 'power'))

  service
      .getCharacteristic(Characteristic.Brightness)
      .on('get', this.getState.bind(this, 'brightness'))
      .on('set', this.setState.bind(this, 'brightness'))

  service
      .getCharacteristic(Characteristic.Hue)
      .on('get', this.getState.bind(this, 'hue'))
      .on('set', this.setState.bind(this, 'hue'))

  service
      .getCharacteristic(Characteristic.Saturation)
      .on('get', this.getState.bind(this, 'saturation'))
      .on('set', this.setState.bind(this, 'saturation'))

  this.accessory.on('identify', this.identify.bind(this))
}

RgbAccessory.prototype.identify = function(paired, callback) {
  this.log("%s please identify yourself!", this.accessory.displayName)
  callback(null)
}

RgbAccessory.prototype.getState = function(who, callback) {
  const state = this[who]
  this.log("%s state for the '%s' is %s", who, this.accessory.displayName, this[who])
  callback(null, state);
}

RgbAccessory.prototype.setState = function(who, value, callback) {
  this[who] = value
  this.log("Set %s state on the '%s' to %s", who, this.accessory.displayName, this[who]);
  callback(null);
}

module.exports = RgbAccessory
