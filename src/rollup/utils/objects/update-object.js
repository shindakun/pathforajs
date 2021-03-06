/** @module pathfora/utils/objects/update-object */

/**
 * Merge two objects while preserving original fields
 *
 * @exports updateObject
 * @params {object} object
 * @params {object} config
 */
export default function updateObject (object, config) {
  for (var prop in config) {
    if (config.hasOwnProperty(prop) && typeof config[prop] === 'object' && config[prop] !== null && !Array.isArray(config[prop])) {
      if (config.hasOwnProperty(prop)) {
        if (typeof object[prop] === 'undefined') {
          object[prop] = {};
        }
        updateObject(object[prop], config[prop]);
      }
    } else if (config.hasOwnProperty(prop)) {
      object[prop] = config[prop];
    }
  }
}
