const Service = require('hap-nodejs').Service
const Characteristic = require('hap-nodejs').Characteristic
const colorsys = require('colorsys')
var utils = require('./_utils')

function genericrgb(accessory, log, config) {
  this.log = log
  this.accessory = accessory
  this.config = config

  this.stateUrl = config.state + '/' + accessory.context.universe
  this.offsets = utils.calculateOffsets(this.accessory)

  this.power = 0
  this.brightness = 0
  this.hue = 0
  this.saturation = 0
}

genericrgb.prototype.setupCharacteristics = function () {
  if (!this.accessory.getService(Service.Lightbulb)) {
    this.accessory.addService(Service.Lightbulb, this.accessory.displayName)
  }

  const service = this.accessory.getService(Service.Lightbulb)
  if (!service.testCharacteristic(Characteristic.Brightness)) {
    service.addCharacteristic(Characteristic.Brightness)
  }
  if (!service.testCharacteristic(Characteristic.Hue)) {
    service.addCharacteristic(Characteristic.Hue)
  }
  if (!service.testCharacteristic(Characteristic.Saturation)) {
    service.addCharacteristic(Characteristic.Saturation)
  }
}

genericrgb.prototype.configure = function () {
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
}

genericrgb.prototype.identify = function (paired, callback) {
  this.log("%s please identify yourself!", this.accessory.displayName)
  callback(null)
}

genericrgb.prototype.getState = function (who, callback) {
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

genericrgb.prototype.setState = function (who, value, callback) {
  this[who] = value

  this.setDmxState()
    .then(() => {
      this.log("Set %s state on the '%s' to %s", who, this.accessory.displayName, this[who])
      callback(null)
    })
    .catch((err) => function () {
      this.log('error setting state', err)
      callback(err)
    })
}

genericrgb.prototype.getDmxState = function () {
  return utils.httpGet(this.stateUrl)
    .then((body) => {
      const rgb = {
        r: body.state[this.offsets.red],
        g: body.state[this.offsets.green],
        b: body.state[this.offsets.blue]
      }
      const hsv = colorsys.rgb_to_hsv(rgb)
      this.log('rgb', rgb, 'to hsv', hsv)

      this.power = body.state[this.offsets.red] > 0 || body.state[this.offsets.green] > 0 || body.state[this.offsets.blue] > 0
      this.hue = hsv.h
      this.saturation = hsv.s
      this.brightness = hsv.v

      return Promise.resolve()
    })
}


genericrgb.prototype.setDmxState = function () {
  if (this.power) {
    var hsv = {
      h: this.hue,
      s: this.saturation,
      v: this.brightness
    }
    var rgb = colorsys.hsv_to_rgb(hsv)
    this.log('hsv', hsv, 'to rgb', rgb)

    var data = {
      [this.offsets.red]: rgb.r,
      [this.offsets.green]: rgb.g,
      [this.offsets.blue]: rgb.b
    }
  }
  else {
    var data = {
      [this.offsets.red]: 0,
      [this.offsets.green]: 0,
      [this.offsets.blue]: 0
    }
  }

  return utils.httpPost(this.stateUrl, data)
}

module.exports = genericrgb
