const Service = require('hap-nodejs').Service
const Characteristic = require('hap-nodejs').Characteristic
const colorsys = require('colorsys')
var utils = require('./_utils')

function RgbAccessory(accessory, log, config) {
  this.log = log
  this.accessory = accessory
  this.url = config.state + '/' + this.accessory.context.universe
  this.offsets = this.getOffsets()

  this.power = 0
  this.brightness = 0
  this.hue = 0
  this.saturation = 0
}

RgbAccessory.prototype.getOffsets = function() {
  const device = this.accessory.context.device
  let offsets = {}

  device.config.channels.forEach((v, k) => { offsets[v] = device.address + k } )
  this.log('offsets', offsets)

  return offsets
}

RgbAccessory.prototype.setupCharacteristics = function() {
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
  this.getDmxState()
    .then(() => {
      this.log("%s state for the '%s' is %s", who, this.accessory.displayName, this[who])
      callback(null, this[who])
    })
    .catch((err) => {
      this.log('error retrieving state', err)
      callback(err)
    })
}

RgbAccessory.prototype.setState = function(who, value, callback) {
  this[who] = value

  this.setDmxState(callback)
    .then(() => {
      this.log("Set %s state on the '%s' to %s", who, this.accessory.displayName, this[who])
      callback(null)
    })
    .catch((err) => function() {
      this.log('error setting state', err)
      callback(err)
    })
}

RgbAccessory.prototype.getDmxState = function() {
  return utils.httpGet(this.url)
    .then((body) => {
      const rgb = {
        r: body.state[this.offsets.red0],
        g: body.state[this.offsets.green0],
        b: body.state[this.offsets.blue0]
      }
      const hsv = colorsys.rgb_to_hsv(rgb)
      this.log('rgb', rgb, 'to hsv', hsv)

      this.power = body.state[this.offsets.ctrl] > 0
      this.hue = hsv[0].h
      this.saturation = hsv[0].s
      this.brightness = hsv[0].v

      return Promise.resolve()
    })
}


RgbAccessory.prototype.setDmxState = function(callback) {
  var hsv = {
    h: this.hue,
    s: this.saturation,
    v: this.brightness
  }
  var rgb = colorsys.hsv_to_rgb(hsv)
  this.log('hsv', hsv, 'to rgb', rgb)

  var data = {
    [this.offsets.ctrl]: this.power,
    [this.offsets.red0]: rgb.r,
    [this.offsets.green0]: rgb.g,
    [this.offsets.blue0]: rgb.b
  }
  if(this.offsets.red1) {
    data[this.offsets.red1] = rgb.r,
    data[this.offsets.green1] = rgb.g,
    data[this.offsets.blue1] =  rgb.b
  }
  if(this.offsets.red2) {
    data[this.offsets.red2] = rgb.r,
    data[this.offsets.green2] = rgb.g,
    data[this.offsets.blue2] = rgb.b
  }

  this.log('sending', data, this.url)
  return utils.httpPost(this.url, data)
}

module.exports = RgbAccessory
