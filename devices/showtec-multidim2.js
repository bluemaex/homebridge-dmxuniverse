const Service = require('hap-nodejs').Service
const Characteristic = require('hap-nodejs').Characteristic
var utils = require('./_utils')

function ShowtecMultidim(accessory, log, config) {
  this.log = log
  this.accessory = accessory
  this.config = config

  this.stateUrl = config.state + '/' + accessory.context.universe
  this.offset = accessory.context.device.address + accessory.context.device.subNum

  this.power = 0
  this.value = 0
}

ShowtecMultidim.prototype.setupCharacteristics = function() {
  if(!this.accessory.getService(Service.Lightbulb)) {
    this.accessory.addService(Service.Lightbulb, this.accessory.displayName)
  }

  const service = this.accessory.getService(Service.Lightbulb)
  if(!service.testCharacteristic(Characteristic.Brightness)) {
    service.addCharacteristic(Characteristic.Brightness)
  }
}

ShowtecMultidim.prototype.configure = function() {
  const service = this.accessory.getService(Service.Lightbulb)

  service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getState.bind(this, 'power'))
      .on('set', this.setState.bind(this, 'power'))

  service
      .getCharacteristic(Characteristic.Brightness)
      .on('get', this.getState.bind(this, 'value'))
      .on('set', this.setState.bind(this, 'value'))
}

ShowtecMultidim.prototype.identify = function(paired, callback) {
  this.log("%s please identify yourself!", this.accessory.displayName)
  callback(null)
}

ShowtecMultidim.prototype.getState = function(who, callback) {
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

ShowtecMultidim.prototype.setState = function(who, value, callback) {
  this[who] = (who === 'power') ? value : value / 100 * 255

  this.setDmxState()
    .then(() => {
      this.log("Set %s state on the '%s' to %s", who, this.accessory.displayName, this[who])
      callback(null)
    })
    .catch((err) => function() {
      this.log('error setting state', err)
      callback(err)
    })
}

ShowtecMultidim.prototype.getDmxState = function() {
  return utils.httpGet(this.stateUrl)
    .then((body) => {

      this.log('got', this.offset)
      this.power = body.state[this.offset] > 0 ? 1 : 0
      this.value = body.state[this.offset] / 255 * 100

      return Promise.resolve()
    })
}

ShowtecMultidim.prototype.setDmxState = function() {
  var data = {
    [this.offset]: this.power === 1 ? this.value : 0
  }

  return utils.httpPost(this.stateUrl, data)
}

module.exports = ShowtecMultidim
